const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const hub = document.querySelector("#hub");
const play = document.querySelector("#play");
const grid = document.querySelector("#gameGrid");
const domStage = document.querySelector("#domStage");
const controls = document.querySelector("#controls");
const hint = document.querySelector("#hint");
const totalStars = document.querySelector("#totalStars");
const statScore = document.querySelector("#statScore");
const statBest = document.querySelector("#statBest");
const statTime = document.querySelector("#statTime");
const statScoreLabel = document.querySelector("#statScoreLabel");
const statBestLabel = document.querySelector("#statBestLabel");
const statTimeLabel = document.querySelector("#statTimeLabel");
const gameTitle = document.querySelector("#gameTitle");
const gameKicker = document.querySelector("#gameKicker");
const restartBtn = document.querySelector("#restartBtn");
const backBtn = document.querySelector("#backBtn");
const surpriseBtn = document.querySelector("#surpriseBtn");

const W = canvas.width;
const H = canvas.height;
const storageKey = "ara-games-v1";
const defaultSave = { best: {}, stars: {}, avatar: {} };
function readSave() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "{}");
    return {
      best: parsed && typeof parsed.best === "object" && !Array.isArray(parsed.best) ? parsed.best : {},
      stars: parsed && typeof parsed.stars === "object" && !Array.isArray(parsed.stars) ? parsed.stars : {},
      avatar: parsed && typeof parsed.avatar === "object" && !Array.isArray(parsed.avatar) ? parsed.avatar : {}
    };
  } catch {
    localStorage.removeItem(storageKey);
    return { ...defaultSave };
  }
}
const save = readSave();
let activeGame = null;
let activeId = null;
let lastTime = 0;
let running = false;
let pointer = { x: 0, y: 0, down: false, justDown: false, justUp: false };
let particles = [];
const art = {};

function loadArt(name, src) {
  const img = new Image();
  img.src = src;
  art[name] = img;
}

[
  ["puppy", "assets/puppy.svg"],
  ["starTreat", "assets/star-treat.svg"],
  ["puddle", "assets/puddle.svg"],
  ["tree", "assets/tree.svg"],
  ["cloud", "assets/cloud.svg"],
  ["gemSheet", "assets/generated/gem-pop-sprites.png"],
  ["petSheet", "assets/generated/pet-rescue-sprites.png"],
  ["spaceSheet", "assets/generated/space-miner-sprites.png"],
  ["golfSheet", "assets/generated/mini-golf-sprites.png"],
  ["rainbowArtSheet", "assets/generated/new-games/rainbow-art-studio.png"]
].forEach(([name, src]) => loadArt(name, src));

const sprites = {
  gems: [
    [110, 88, 220, 198],
    [395, 90, 215, 195],
    [665, 90, 210, 195],
    [935, 90, 215, 195],
    [1210, 90, 210, 195]
  ],
  gemBurst: [125, 420, 220, 140],
  pet: {
    puppy: [185, 90, 380, 285],
    star: [670, 115, 235, 200],
    puddle: [1030, 125, 430, 185],
    tree: [610, 425, 285, 290],
    bush: [160, 515, 275, 195],
    cloud: [1020, 465, 390, 205],
    badge: [1105, 730, 220, 220]
  },
  space: {
    rocket: [125, 115, 365, 200],
    crystals: [[690, 118, 150, 175], [955, 123, 165, 170], [1225, 120, 170, 175]],
    asteroids: [[155, 415, 280, 180], [555, 415, 255, 185], [905, 420, 240, 185]],
    moon: [1215, 420, 195, 180],
    planet: [145, 710, 310, 190],
    trail: [550, 725, 345, 165]
  },
  golf: {
    ball: [205, 135, 180, 175],
    cup: [585, 90, 285, 280],
    bumpers: [[965, 155, 175, 135], [1130, 165, 175, 125], [1280, 155, 190, 140]],
    arrow: [170, 690, 280, 210],
    star: [655, 685, 215, 190],
    tile: [1040, 725, 390, 170]
  },
  rainbowArt: {
    brush: [87, 58, 207, 201],
    bucket: [395, 74, 203, 168],
    sheet: [649, 91, 237, 187],
    undo: [1112, 96, 184, 116],
    palette: [341, 352, 217, 94],
    rainbow: [599, 354, 216, 113],
    heart: [855, 344, 151, 124],
    rocket: [1249, 329, 180, 167],
    dog: [91, 551, 184, 141],
    flower: [340, 549, 140, 154],
    castle: [718, 570, 267, 116],
    garden: [1031, 554, 186, 127],
    frame: [111, 766, 230, 160],
    spark: [490, 777, 197, 112]
  }
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const rand = (min, max) => min + Math.random() * (max - min);
const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function burst(x, y, colors, count = 18, power = 240) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2);
    const v = rand(power * 0.35, power);
    particles.push({
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      r: rand(4, 10),
      life: rand(0.35, 0.75),
      max: 0.75,
      color: choice(colors)
    });
  }
}

function updateParticles(dt) {
  particles.forEach((p) => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 460 * dt;
    p.life -= dt;
  });
  particles = particles.filter((p) => p.life > 0);
}

function drawParticles() {
  particles.forEach((p) => {
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function gradientStage(a, b, c) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, a);
  g.addColorStop(0.58, b);
  g.addColorStop(1, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function saveGame() {
  localStorage.setItem(storageKey, JSON.stringify(save));
  renderStars();
}

function addScore(points) {
  if (!activeGame) return;
  activeGame.score = Math.max(0, Math.floor(activeGame.score + points));
  const best = save.best[activeId] || 0;
  if (activeGame.score > best) {
    save.best[activeId] = activeGame.score;
    save.stars[activeId] = Math.max(save.stars[activeId] || 0, Math.min(5, Math.floor(activeGame.score / games[activeId].starEvery)));
    saveGame();
  }
}

function renderStats() {
  const custom = activeGame?.stats?.();
  statScore.textContent = custom?.score ?? (activeGame ? activeGame.score : 0);
  statBest.textContent = custom?.best ?? (save.best[activeId] || 0);
  statTime.textContent = custom?.third ?? (activeGame ? Math.max(0, Math.ceil(activeGame.time || 0)) : 0);
  statScoreLabel.textContent = custom?.scoreLabel ?? "score";
  statBestLabel.textContent = custom?.bestLabel ?? "best";
  statTimeLabel.textContent = custom?.thirdLabel ?? "time";
}

function renderStars() {
  totalStars.textContent = Object.values(save.stars).reduce((sum, n) => sum + n, 0);
}

function scaleEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches ? e.touches[0] || e.changedTouches[0] : e;
  return {
    x: ((touch.clientX - rect.left) / rect.width) * W,
    y: ((touch.clientY - rect.top) / rect.height) * H
  };
}

function bindCanvas() {
  const down = (e) => {
    e.preventDefault();
    const p = scaleEvent(e);
    pointer = { ...pointer, ...p, down: true, justDown: true };
    activeGame?.pointerDown?.(p.x, p.y);
  };
  const move = (e) => {
    if (!pointer.down && e.type.startsWith("touch")) return;
    e.preventDefault();
    const p = scaleEvent(e);
    pointer = { ...pointer, ...p };
    activeGame?.pointerMove?.(p.x, p.y);
  };
  const up = (e) => {
    e.preventDefault();
    const p = scaleEvent(e);
    pointer = { ...pointer, ...p, down: false, justUp: true };
    activeGame?.pointerUp?.(p.x, p.y);
  };
  if (window.PointerEvent) {
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
  } else {
    canvas.addEventListener("touchstart", down, { passive: false });
    canvas.addEventListener("touchmove", move, { passive: false });
    canvas.addEventListener("touchend", up, { passive: false });
  }
}

function clearStage(bg = "#121827") {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
}

function textCenter(text, x, y, size = 38, color = "#fff") {
  ctx.fillStyle = color;
  ctx.font = "900 " + size + "px ui-rounded, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

function roundRect(x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function glossyRect(x, y, w, h, r, fill, shine = true) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.26)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 9;
  roundRect(x, y, w, h, r, fill);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  if (shine) {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, "rgba(255,255,255,0.36)");
    g.addColorStop(0.45, "rgba(255,255,255,0.08)");
    g.addColorStop(1, "rgba(0,0,0,0.12)");
    roundRect(x + 4, y + 4, w - 8, h - 8, Math.max(8, r - 4), g);
  }
  ctx.restore();
}

function stagePattern(color = "rgba(255,255,255,0.12)", size = 76) {
  ctx.save();
  ctx.fillStyle = color;
  for (let x = -size; x < W + size; x += size) {
    for (let y = -size; y < H + size; y += size) {
      const phase = (x + y + performance.now() / 18) % (size * 2);
      if (phase < size) roundRect(x + 10, y + 10, size * 0.38, 8, 5, color);
    }
  }
  ctx.restore();
}

function drawTopHud(label, accent = "#fff") {
  glossyRect(28, 24, 904, 58, 22, "rgba(255,255,255,0.18)", false);
  textCenter(label, W / 2, 53, 28, "#fff");
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.roundRect(50, 42, 110, 14, 7);
  ctx.fill();
}

function drawAsset(name, x, y, w, h) {
  const img = art[name];
  if (img?.complete && img.naturalWidth) {
    ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
    return true;
  }
  return false;
}

function drawSprite(sheet, rect, x, y, w, h) {
  const img = art[sheet];
  if (img?.complete && img.naturalWidth && rect) {
    ctx.drawImage(img, rect[0], rect[1], rect[2], rect[3], x - w / 2, y - h / 2, w, h);
    return true;
  }
  return false;
}

function drawAsteroid(x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((x + y + performance.now() / 20) * 0.01);
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 14;
  const pts = 11;
  ctx.beginPath();
  for (let i = 0; i < pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const rr = r * (0.76 + ((i * 37) % 29) / 100);
    const px = Math.cos(a) * rr;
    const py = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = "#7f879c";
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.24)";
  ctx.beginPath(); ctx.arc(-r * 0.25, -r * 0.22, r * 0.18, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.2, r * 0.12, r * 0.12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.beginPath(); ctx.arc(r * 0.12, -r * 0.32, r * 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawMonster(x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.shadowColor = "rgba(0,0,0,0.28)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 10;
  glossyRect(-58, -48, 116, 108, 32, "#6df0ff");
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = "#3b1c75";
  ctx.beginPath(); ctx.arc(-26, -14, 16, 0, Math.PI * 2); ctx.arc(26, -14, 16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(-21, -19, 5, 0, Math.PI * 2); ctx.arc(31, -19, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#3b1c75";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(0, 18, 28, 0.1, Math.PI - 0.1);
  ctx.stroke();
  ctx.fillStyle = "#ffd166";
  ctx.beginPath(); ctx.moveTo(-44, -45); ctx.lineTo(-76, -84); ctx.lineTo(-22, -54); ctx.fill();
  ctx.beginPath(); ctx.moveTo(44, -45); ctx.lineTo(76, -84); ctx.lineTo(22, -54); ctx.fill();
  ctx.restore();
}

function drawKidHero(x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = "#ffd7a8";
  ctx.beginPath(); ctx.arc(0, -22, 18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3b2f6f";
  ctx.beginPath(); ctx.arc(-7, -25, 3.5, 0, Math.PI * 2); ctx.arc(7, -25, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#3b2f6f";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, -17, 7, 0.15, Math.PI - 0.15); ctx.stroke();
  ctx.fillStyle = "#54c6eb";
  ctx.beginPath(); ctx.roundRect(-19, -3, 38, 42, 14); ctx.fill();
  ctx.fillStyle = "#ffd166";
  ctx.beginPath(); ctx.moveTo(-23, -36); ctx.lineTo(0, -56); ctx.lineTo(23, -36); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#37d99e";
  ctx.beginPath(); ctx.arc(0, -47, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#26304d";
  ctx.beginPath(); ctx.roundRect(-17, 31, 13, 22, 6); ctx.roundRect(4, 31, 13, 22, 6); ctx.fill();
  ctx.restore();
}

function drawEndOverlay(title, subtitle) {
  ctx.save();
  ctx.fillStyle = "rgba(18, 13, 56, 0.58)";
  ctx.fillRect(0, 0, W, H);
  glossyRect(190, 190, 580, 250, 38, "rgba(255,255,255,0.92)", false);
  textCenter(title, W / 2, 270, 46, "#26304d");
  textCenter(subtitle, W / 2, 335, 26, "#5b6380");
  textCenter("Tap Restart", W / 2, 390, 28, "#ff5c8a");
  ctx.restore();
}

function makeControls(items) {
  controls.innerHTML = "";
  items.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "control-btn";
    btn.textContent = item.label;
    btn.addEventListener("pointerdown", () => activeGame?.control?.(item.id, true));
    btn.addEventListener("pointerup", () => activeGame?.control?.(item.id, false));
    btn.addEventListener("pointercancel", () => activeGame?.control?.(item.id, false));
    btn.addEventListener("click", () => activeGame?.tapControl?.(item.id));
    controls.append(btn);
  });
}

function loop(t) {
  if (!running) return;
  const dt = Math.min(0.033, (t - lastTime) / 1000 || 0.016);
  lastTime = t;
  if (activeGame) {
    updateParticles(dt);
    if (!activeGame.done) {
      activeGame.time = Math.max(0, (activeGame.time || 0) - dt);
      activeGame.update?.(dt);
    }
    activeGame.draw?.();
    renderStats();
  }
  pointer.justDown = false;
  pointer.justUp = false;
  requestAnimationFrame(loop);
}

function startGame(id) {
  activeId = id;
  const def = games[id];
  activeGame?.destroy?.();
  particles = [];
  controls.innerHTML = "";
  domStage.innerHTML = "";
  domStage.classList.add("hidden");
  canvas.classList.remove("hidden");
  gameTitle.textContent = def.title;
  gameKicker.textContent = def.kicker;
  hint.textContent = def.hint;
  restartBtn.textContent = "Restart";
  activeGame = def.create();
  if (location.hostname === "127.0.0.1" || location.hostname === "localhost") window.__araActiveGame = activeGame;
  activeGame.score = 0;
  activeGame.time = activeGame.time ?? 60;
  def.controls && makeControls(def.controls);
  hub.classList.add("hidden");
  play.classList.remove("hidden");
  lastTime = performance.now();
  if (!running) {
    running = true;
    requestAnimationFrame(loop);
  }
}

function backToHub() {
  running = false;
  activeGame?.destroy?.();
  activeGame = null;
  activeId = null;
  play.classList.add("hidden");
  hub.classList.remove("hidden");
  renderCards();
}

function gameOver(label = "Time!") {
  if (!activeGame || activeGame.done) return;
  activeGame.done = true;
  save.best[activeId] = Math.max(save.best[activeId] || 0, activeGame.score);
  save.stars[activeId] = Math.max(save.stars[activeId] || 0, Math.min(5, Math.floor(activeGame.score / games[activeId].starEvery)));
  saveGame();
  hint.textContent = label + " Score: " + activeGame.score + ". Tap Restart or pick another game.";
}

const palettes = {
  candy: ["#ff6b6b", "#ffd166", "#37d99e", "#54c6eb", "#f083ff"]
};

const gameDefs = [
  { id: "gem-pop", title: "Gem Pop Arcade", kicker: "Tap the matching gems", icon: "💎", color: "linear-gradient(145deg, #ff6b6b, #f083ff)", desc: "Pop color groups before time runs out.", hint: "Tap big groups of matching gems. Bigger groups make bigger points.", starEvery: 120, create: createGemPop },
  { id: "pet-rescue", title: "Pet Rescue Run", kicker: "Jump and collect", icon: "🐶", color: "linear-gradient(145deg, #37d99e, #54c6eb)", desc: "Run, jump, grab treats, and rescue pets.", hint: "Use Jump to hop over puddles and collect treats.", starEvery: 80, controls: [{ id: "jump", label: "Jump" }], create: createPetRescue },
  { id: "space-miner", title: "Space Miner", kicker: "Fly and dodge", icon: "🚀", color: "linear-gradient(145deg, #315c9d, #8bd3ff)", desc: "Collect crystals while avoiding asteroids.", hint: "Drag anywhere to steer the ship.", starEvery: 100, create: createSpaceMiner },
  { id: "mini-golf", title: "Mini Golf Madness", kicker: "Aim and putt", icon: "⛳", color: "linear-gradient(145deg, #2cb67d, #ffd166)", desc: "Bounce around bumpers and sink putts.", hint: "Drag back from the ball, then let go to shoot.", starEvery: 55, create: createMiniGolf },
  { id: "rainbow-art", title: "Rainbow Art Studio", kicker: "Paint and sticker", icon: "🖍️", color: "linear-gradient(145deg, #ff5c8a, #37d99e)", desc: "Make bright scenes with brushes and stickers.", hint: "Pick a tool, then draw or stamp on the canvas. Finish the prompt for bonus stars.", starEvery: 70, create: createRainbowArtStudio }
];

const games = Object.fromEntries(gameDefs.map((g) => [g.id, g]));

function renderCards() {
  grid.innerHTML = "";
  gameDefs.forEach((game) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "game-card";
    card.style.setProperty("--card-bg", game.color);
    card.innerHTML = '<span class="icon">' + game.icon + '</span><h3>' + game.title + '</h3><p>' + game.desc + '</p><span class="best">Best ' + (save.best[game.id] || 0) + '</span>';
    card.addEventListener("click", () => startGame(game.id));
    grid.append(card);
  });
  renderStars();
}

function createGemPop() {
  const cols = 8, rows = 7, colors = palettes.candy, cell = 68;
  const ox = (W - cols * cell) / 2, oy = 112;
  const maxLevel = 5;
  let level = 1;
  let moves = 24;
  let levelScore = 0;
  let target = 120;
  let board = newBoard();
  let pops = [];
  let endTitle = "";
  function colorCount() { return Math.min(colors.length, 3 + Math.floor((level - 1) / 2)); }
  function newBoard() {
    return Array.from({ length: rows }, () => Array.from({ length: cols }, () => Math.floor(rand(0, colorCount()))));
  }
  function groupAt(c, r) {
    const target = board[r]?.[c];
    if (target == null) return [];
    const seen = new Set(), stack = [[c, r]], out = [];
    while (stack.length) {
      const [x, y] = stack.pop();
      const key = x + "," + y;
      if (seen.has(key) || board[y]?.[x] !== target) continue;
      seen.add(key); out.push([x, y]);
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    return out;
  }
  function collapse() {
    for (let c = 0; c < cols; c++) {
      const kept = [];
      for (let r = rows - 1; r >= 0; r--) if (board[r][c] != null) kept.push(board[r][c]);
      for (let r = rows - 1; r >= 0; r--) board[r][c] = kept[rows - 1 - r] ?? Math.floor(rand(0, colorCount()));
    }
  }
  function nextLevel() {
    if (level >= maxLevel) {
      addScore(150);
      endTitle = "You cleared every level!";
      gameOver("All levels cleared!");
      return;
    }
    level += 1;
    moves = Math.max(14, 25 - level * 2);
    levelScore = 0;
    target = 120 + level * 70;
    board = newBoard();
    burst(W / 2, H / 2, ["#fff", "#ffd166", "#37d99e", "#f083ff"], 44, 420);
    hint.textContent = "Level " + level + "! Bigger groups score faster.";
    activeGame.time = Math.min(activeGame.time + 18, 90);
  }
  function cellCenter(c, r) {
    return { x: ox + c * cell + cell / 2, y: oy + r * cell + cell / 2 };
  }
  return {
    time: 75,
    stats() {
      return { score: this.score, best: save.best[activeId] || 0, third: moves, thirdLabel: "moves" };
    },
    forceComplete() {
      endTitle = "You cleared every level!";
      addScore(150);
      gameOver("All levels cleared!");
    },
    pointerDown(x, y) {
      if (this.done) return;
      const c = Math.floor((x - ox) / cell), r = Math.floor((y - oy) / cell);
      if (c < 0 || c >= cols || r < 0 || r >= rows) return;
      const group = groupAt(c, r);
      const popped = group.length >= 2 ? group : [[c, r]];
      popped.forEach(([gx, gy]) => {
        const center = cellCenter(gx, gy);
        burst(center.x, center.y, [colors[board[gy][gx]], "#ffffff", "#fff66d"], group.length >= 2 ? 9 : 5, 260);
        pops.push({ x: center.x, y: center.y, t: 0.25, color: colors[board[gy][gx]] });
        board[gy][gx] = null;
      });
      const points = group.length >= 2 ? group.length * group.length * (4 + level) : 3;
      addScore(points);
      levelScore += points;
      moves -= 1;
      collapse();
      if (levelScore >= target) nextLevel();
      else if (moves <= 0) { endTitle = "Out of moves"; gameOver("Out of moves!"); }
    },
    update(dt) {
      pops.forEach((p) => p.t -= dt);
      pops = pops.filter((p) => p.t > 0);
      if (this.time <= 0) { endTitle = "Out of time"; gameOver("Out of time!"); }
    },
    draw() {
      gradientStage("#4019a9", "#db2f8f", "#ffbd48");
      stagePattern("rgba(255,255,255,0.16)", 86);
      drawTopHud("Level " + level + "  •  " + levelScore + "/" + target + "  •  " + moves + " moves", "#fff66d");
      glossyRect(178, 100, 604, 500, 34, "rgba(255,255,255,0.15)", false);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = ox + c * cell + 8, y = oy + r * cell + 8;
        ctx.shadowColor = "rgba(0,0,0,0.25)";
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 6;
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.beginPath(); ctx.roundRect(x - 3, y + 4, cell - 10, cell - 10, 18); ctx.fill();
        if (!drawSprite("gemSheet", sprites.gems[board[r][c]], x + (cell - 16) / 2, y + (cell - 16) / 2, cell - 10, cell - 12)) {
          glossyRect(x, y, cell - 16, cell - 16, 18, colors[board[r][c]]);
        }
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        ctx.fillStyle = "rgba(255,255,255,0.42)";
        if (!art.gemSheet?.complete) {
          ctx.beginPath(); ctx.arc(x + 18, y + 15, 8, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.18)";
          ctx.beginPath(); ctx.arc(x + 36, y + 38, 14, 0, Math.PI * 2); ctx.fill();
        }
      }
      pops.forEach((p) => {
        ctx.globalAlpha = clamp(p.t / 0.25, 0, 1);
        if (!drawSprite("gemSheet", sprites.gemBurst, p.x, p.y, 70, 48)) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, (1 - p.t / 0.25) * 44 + 8, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      });
      drawParticles();
      if (this.done) drawEndOverlay(endTitle || "Game over", "Final score " + this.score);
    }
  };
}

function createPetRescue() {
  const groundY = 472;
  const player = { x: 135, y: groundY, vy: 0, size: 54, grounded: true };
  const treatLanes = [430, 386, 342];
  let speed = 235, obstacles = [], treats = [], spawn = 0, jumpHeld = false, holdTime = 0;
  let health = 3, elapsed = 0, hurtFlash = 0, jumps = 0;
  function startJump() {
    if (!player.grounded) return;
    player.vy = -660;
    player.grounded = false;
    holdTime = 0.18;
    jumps += 1;
  }
  function spawnSet() {
    const hasPuddle = Math.random() < Math.min(0.42 + elapsed / 120, 0.62);
    const lane = treatLanes[Math.floor(rand(0, treatLanes.length))];
    const pattern = Math.random();
    if (hasPuddle) obstacles.push({ x: W + 70, y: 498, w: 58, h: 34, hit: false });
    if (pattern < 0.34) {
      treats.push({ x: W + 42, y: 430, r: 18, got: false });
      treats.push({ x: W + 98, y: 392, r: 18, got: false });
    } else if (pattern < 0.68) {
      treats.push({ x: W + 56, y: lane, r: 18, got: false });
      treats.push({ x: W + 128, y: Math.max(336, lane - 28), r: 18, got: false });
      treats.push({ x: W + 200, y: lane, r: 18, got: false });
    } else {
      treats.push({ x: W + (hasPuddle ? 165 : 55), y: hasPuddle ? 354 : lane, r: 18, got: false });
    }
  }
  return {
    time: 70,
    control(id, down) { if (id !== "jump") return; jumpHeld = down; if (down) startJump(); },
    pointerDown() { this.control("jump", true); },
    pointerUp() { this.control("jump", false); },
    stats() {
      return { score: this.score, best: save.best[activeId] || 0, third: health, thirdLabel: "hearts" };
    },
    debugState() {
      return {
        player: { x: Math.round(player.x), y: Math.round(player.y), grounded: player.grounded },
        health,
        treats: treats.map((t) => ({ x: Math.round(t.x), y: Math.round(t.y) })),
        obstacles: obstacles.map((o) => ({ x: Math.round(o.x), y: Math.round(o.y), hit: o.hit }))
      };
    },
    update(dt) {
      if (this.done) return;
      if (this.time <= 0) gameOver("Run done!");
      elapsed += dt;
      hurtFlash = Math.max(0, hurtFlash - dt);
      speed = Math.min(355, speed + dt * 5.5);
      spawn -= dt;
      if (spawn <= 0) { spawn = rand(1.12, 1.62); spawnSet(); }
      if (jumpHeld && holdTime > 0 && player.vy < 0) {
        player.vy -= 620 * dt;
        holdTime -= dt;
      }
      player.vy += 1420 * dt; player.y += player.vy * dt;
      if (player.y >= groundY) { player.y = groundY; player.vy = 0; player.grounded = true; holdTime = 0; }
      obstacles.forEach((o) => o.x -= speed * dt); treats.forEach((t) => t.x -= speed * dt);
      obstacles = obstacles.filter((o) => o.x > -100); treats = treats.filter((t) => t.x > -80 && !t.got);
      for (const t of treats) if (Math.hypot(player.x - t.x, player.y - t.y) < 50) { t.got = true; addScore(12); burst(t.x, t.y, ["#ffd166", "#fff", "#37d99e"], 10, 220); }
      for (const o of obstacles) if (!o.hit && player.x + 28 > o.x && player.x - 28 < o.x + o.w && player.y + 25 > o.y) {
        o.hit = true;
        health -= 1;
        hurtFlash = 0.55;
        addScore(-12);
        burst(player.x, player.y, ["#4f79b8", "#8bd3ff", "#fff"], 18, 260);
        hint.textContent = health > 0 ? "Splash! " + health + " hearts left." : "Too many splashes!";
        if (health <= 0) gameOver("Rescue run over!");
      }
    },
    draw() {
      gradientStage("#6ee7ff", "#9cf67f", "#ffd166");
      stagePattern("rgba(255,255,255,0.14)", 96);
      drawTopHud("Hearts " + "♥".repeat(Math.max(0, health)) + "  •  jumps " + jumps, "#37d99e");
      ctx.fillStyle = "rgba(255,255,255,0.34)";
      ctx.beginPath(); ctx.arc(820, 112, 54, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(40,150,95,0.22)";
      ctx.beginPath(); ctx.ellipse(230, 500, 310, 105, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(720, 500, 340, 120, 0, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 7; i++) {
        const x = (i * 165 - (performance.now() / 24) % 165) + 10;
        if (!drawSprite("petSheet", sprites.pet.tree, x + 12, 462, 96, 120) && !drawAsset("tree", x + 12, 462, 86, 112)) {
          glossyRect(x, 470, 22, 70, 8, "#a65f3a", false);
          ctx.fillStyle = "#1fbf78";
          ctx.beginPath(); ctx.arc(x + 10, 450, 34, 0, Math.PI * 2); ctx.fill();
        }
      }
      for (let i = 0; i < 6; i++) roundRect(i * 190 - ((performance.now() / 18) % 190), 400 + (i % 2) * 34, 130, 24, 12, "rgba(255,255,255,0.22)");
      glossyRect(0, 516, W, 124, 0, "#28c77b", false);
      roundRect(0, 538, W, 20, 0, "rgba(255,255,255,0.22)");
      for (let i = 0; i < 8; i++) {
        const cx = (i * 170 + (performance.now() / 30) % 170) - 60;
        const cy = 90 + (i % 3) * 38;
        if (!drawSprite("petSheet", sprites.pet.cloud, cx, cy, 126, 70) && !drawAsset("cloud", cx, cy, 112, 62)) {
          ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2); ctx.fill();
        }
      }
      treats.forEach((t) => { if (!drawSprite("petSheet", sprites.pet.star, t.x, t.y, 50, 46) && !drawAsset("starTreat", t.x, t.y, 46, 46)) textCenter("★", t.x, t.y, 34, "#ffd166"); });
      obstacles.forEach((o) => { if (!drawSprite("petSheet", sprites.pet.puddle, o.x + o.w / 2, o.y + o.h / 2, 94, 54) && !drawAsset("puddle", o.x + o.w / 2, o.y + o.h / 2, 86, 54)) { glossyRect(o.x, o.y, o.w, o.h, 18, "#4f79b8"); ctx.fillStyle = "#8bd3ff"; ctx.fillRect(o.x + 10, o.y + 8, o.w - 20, 8); } });
      ctx.globalAlpha = hurtFlash > 0 ? 0.58 + Math.sin(performance.now() / 45) * 0.25 : 1;
      if (!drawSprite("petSheet", sprites.pet.puppy, player.x, player.y - 7, 104, 88) && !drawAsset("puppy", player.x, player.y - 4, 90, 90)) textCenter("🐶", player.x, player.y, 70, "#fff");
      ctx.globalAlpha = 1;
      drawParticles();
      if (this.done) drawEndOverlay("Rescue done", "Final score " + this.score);
    }
  };
}

function createSpaceMiner() {
  const ship = { x: 160, y: 320, r: 34 };
  let target = { x: ship.x, y: ship.y }, crystals = [], rocks = [], spawn = 0;
  let health = 3, elapsed = 0, invulnerable = 0;
  return {
    time: 75,
    stats() {
      return { score: this.score, best: save.best[activeId] || 0, third: health, thirdLabel: "shields" };
    },
    pointerDown(x, y) { target = { x, y }; },
    pointerMove(x, y) { if (pointer.down) target = { x, y }; },
    update(dt) {
      if (this.done) return;
      elapsed += dt;
      invulnerable = Math.max(0, invulnerable - dt);
      if (this.time <= 0) gameOver("Docked!");
      ship.x += (target.x - ship.x) * dt * 7; ship.y += (target.y - ship.y) * dt * 7;
      ship.x = clamp(ship.x, 55, W - 55); ship.y = clamp(ship.y, 70, H - 55);
      spawn -= dt;
      const difficulty = 1 + elapsed / 35 + this.score / 450;
      if (spawn <= 0) {
        spawn = rand(0.28, 0.62) / Math.min(difficulty, 2.2);
        if (Math.random() < 0.56) crystals.push({ x: W + 50, y: rand(94, H - 90), r: 18, v: rand(190, 285) * Math.min(difficulty, 2.1) });
        rocks.push({ x: W + 90, y: rand(96, H - 80), r: rand(25, 42), v: rand(175, 275) * Math.min(difficulty, 2.25) });
        if (difficulty > 1.8 && Math.random() < 0.35) rocks.push({ x: W + 170, y: rand(96, H - 80), r: rand(22, 36), v: rand(190, 300) * Math.min(difficulty, 2.25) });
      }
      crystals.forEach((c) => c.x -= c.v * dt); rocks.forEach((r) => r.x -= r.v * dt);
      for (const c of crystals) if (!c.got && dist(ship, c) < ship.r + c.r) { c.got = true; addScore(15); burst(c.x, c.y, ["#37d99e", "#8bd3ff", "#fff"], 12, 260); }
      for (const r of rocks) if (!r.hit && invulnerable <= 0 && dist(ship, r) < ship.r + r.r - 6) {
        r.hit = true;
        health -= 1;
        invulnerable = 1.2;
        addScore(-18);
        burst(ship.x, ship.y, ["#ff6b6b", "#fff", "#ffd166"], 24, 340);
        hint.textContent = health > 0 ? "Hit! " + health + " shields left." : "Ship broke!";
        if (health <= 0) gameOver("Ship broke!");
      }
      crystals = crystals.filter((c) => c.x > -80 && !c.got); rocks = rocks.filter((r) => r.x > -100 && !r.hit);
    },
    draw() {
      gradientStage("#111642", "#2035a6", "#9b5cff");
      drawTopHud("Shields " + "♥".repeat(Math.max(0, health)) + "  •  difficulty " + Math.floor(1 + elapsed / 20), "#8bd3ff");
      if (!drawSprite("spaceSheet", sprites.space.planet, 755, 145, 210, 130)) {
        ctx.fillStyle = "rgba(255,209,102,0.3)";
        ctx.beginPath(); ctx.arc(755, 145, 72, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.26)";
        ctx.lineWidth = 8;
        ctx.beginPath(); ctx.ellipse(755, 145, 112, 26, -0.28, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = "rgba(55,217,158,0.18)";
      ctx.beginPath(); ctx.arc(130, 535, 88, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 70; i++) { ctx.fillStyle = i % 4 ? "rgba(255,255,255,0.45)" : "#ffd166"; ctx.fillRect((i * 137 + performance.now() / 18) % W, (i * 73) % H, 3, 3); }
      crystals.forEach((c, i) => {
        ctx.shadowColor = "#37d99e"; ctx.shadowBlur = 18;
        if (!drawSprite("spaceSheet", sprites.space.crystals[i % sprites.space.crystals.length], c.x, c.y, 48, 56)) textCenter("◆", c.x, c.y, 46, "#37d99e");
        ctx.shadowBlur = 0;
      });
      rocks.forEach((r, i) => { if (r.x < W - r.r * 1.15 && !drawSprite("spaceSheet", sprites.space.asteroids[i % sprites.space.asteroids.length], r.x, r.y, r.r * 2.15, r.r * 1.45)) drawAsteroid(r.x, r.y, r.r); });
      ctx.globalAlpha = invulnerable > 0 ? 0.55 + Math.sin(performance.now() / 55) * 0.28 : 1;
      if (drawSprite("spaceSheet", sprites.space.trail, ship.x - 56, ship.y + 2, 92, 44)) ctx.globalAlpha = invulnerable > 0 ? 0.72 : 1;
      if (!drawSprite("spaceSheet", sprites.space.rocket, ship.x, ship.y, 104, 58)) textCenter("🚀", ship.x, ship.y, 70);
      ctx.globalAlpha = 1;
      drawParticles();
    }
  };
}

function createMiniGolf() {
  let ball = { x: 170, y: 480, vx: 0, vy: 0, r: 18 };
  let hole = { x: 805, y: 140, r: 28 }, aiming = false, aim = { x: ball.x, y: ball.y };
  const bumpers = [{ x: 365, y: 290, r: 38 }, { x: 575, y: 410, r: 48 }, { x: 650, y: 215, r: 34 }];
  function resetHole() { ball = { x: 160, y: rand(420, 540), vx: 0, vy: 0, r: 18 }; hole = { x: rand(700, 850), y: rand(100, 260), r: 28 }; }
  return {
    time: 100,
    pointerDown(x, y) { if (Math.hypot(x - ball.x, y - ball.y) < 80 && Math.hypot(ball.vx, ball.vy) < 20) { aiming = true; aim = { x, y }; } },
    pointerMove(x, y) { if (aiming) aim = { x, y }; },
    pointerUp(x, y) { if (!aiming) return; aiming = false; ball.vx = clamp((ball.x - x) * 4.5, -720, 720); ball.vy = clamp((ball.y - y) * 4.5, -720, 720); },
    update(dt) {
      if (this.time <= 0) gameOver("Round over!");
      ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.vx *= 0.988; ball.vy *= 0.988;
      if (ball.x < 38 || ball.x > W - 38) ball.vx *= -0.85; if (ball.y < 38 || ball.y > H - 38) ball.vy *= -0.85;
      ball.x = clamp(ball.x, 38, W - 38); ball.y = clamp(ball.y, 38, H - 38);
      bumpers.forEach((b) => { const d = Math.hypot(ball.x - b.x, ball.y - b.y); if (d < ball.r + b.r) { const nx = (ball.x - b.x) / d, ny = (ball.y - b.y) / d; ball.vx = nx * 420; ball.vy = ny * 420; } });
      if (Math.hypot(ball.x - hole.x, ball.y - hole.y) < hole.r && Math.hypot(ball.vx, ball.vy) < 220) { addScore(35); burst(hole.x, hole.y, ["#fff", "#ffd166", "#37d99e"], 24, 300); resetHole(); }
    },
    draw() {
      gradientStage("#87f79d", "#2cb67d", "#2b9fdd");
      stagePattern("rgba(255,255,255,0.13)", 98);
      drawTopHud("Drag back, release to putt", "#ffd166");
      glossyRect(26, 92, W - 52, H - 118, 34, "rgba(255,255,255,0.22)", false);
      for (let i = 0; i < 9; i++) roundRect(80 + i * 95, 70 + (i % 3) * 140, 44, 12, 8, "rgba(255,255,255,0.2)");
      ctx.shadowColor = "rgba(0,0,0,0.4)"; ctx.shadowBlur = 18;
      if (!drawSprite("golfSheet", sprites.golf.cup, hole.x, hole.y - 22, 82, 92)) { ctx.fillStyle = "#132017"; ctx.beginPath(); ctx.arc(hole.x, hole.y, hole.r, 0, Math.PI * 2); ctx.fill(); }
      ctx.shadowBlur = 0;
      bumpers.forEach((b) => { ctx.shadowColor = "rgba(0,0,0,0.25)"; ctx.shadowBlur = 16; ctx.fillStyle = "#ffd166"; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; textCenter("★", b.x, b.y, 28, "#9a5a00"); });
      if (aiming) { if (!drawSprite("golfSheet", sprites.golf.arrow, (ball.x + aim.x) / 2, (ball.y + aim.y) / 2, 92, 68)) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(ball.x, ball.y); ctx.lineTo(aim.x, aim.y); ctx.stroke(); } }
      ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 14; ctx.shadowOffsetY = 8;
      if (!drawSprite("golfSheet", sprites.golf.ball, ball.x, ball.y, 42, 42)) { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill(); }
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      drawParticles();
    }
  };
}

function createRainbowArtStudio() {
  const tools = [
    { id: "brush", label: "Brush", icon: "🖌️", sprite: "brush" },
    { id: "fill", label: "Fill", icon: "🪣", sprite: "bucket" },
    { id: "sticker", label: "Sticker", icon: "⭐", sprite: "rainbow" },
    { id: "sparkle", label: "Sparkle", icon: "✨", sprite: "spark" },
    { id: "done", label: "Done", icon: "✓", sprite: "frame" }
  ];
  const colors = ["#ff6b6b", "#ffd166", "#37d99e", "#54c6eb", "#9277ff", "#ffffff"];
  const stickers = [
    { icon: "⭐", sprite: "spark" },
    { icon: "🌈", sprite: "rainbow" },
    { icon: "🚀", sprite: "rocket" },
    { icon: "🌸", sprite: "flower" },
    { icon: "🐶", sprite: "dog" },
    { icon: "💎", sprite: "heart" }
  ];
  const scenes = ["castle", "garden", "rocket", "ocean", "party"];
  let scene = 0, tool = "brush", color = colors[0], sticker = 0, bg = "#fff8d8";
  let marks = [], stampCount = 0, paintCount = 0, doneCount = 0, drawing = false, bounce = 0;
  const area = { x: 60, y: 150, w: 840, h: 370 };
  function inArea(x, y) { return x > area.x && x < area.x + area.w && y > area.y && y < area.y + area.h; }
  function addMark(x, y) {
    if (!inArea(x, y)) return;
    if (tool === "brush") {
      marks.push({ type: "dot", x, y, color, r: rand(10, 22) });
      paintCount += 1;
      addScore(1);
    } else if (tool === "sticker") {
      marks.push({ type: "sticker", x, y, sticker: stickers[sticker] });
      sticker = (sticker + 1) % stickers.length;
      stampCount += 1;
      addScore(4);
      burst(x, y, ["#fff", "#ffd166", "#f083ff"], 8, 160);
    } else if (tool === "sparkle") {
      marks.push({ type: "sparkle", x, y });
      addScore(3);
      bounce = 0.45;
    } else if (tool === "fill") {
      bg = color;
      addScore(5);
    }
    if (stampCount >= 3 && paintCount >= 8) hint.textContent = "Prompt ready. Tap Done when you like it.";
  }
  return {
    time: 120,
    stats() {
      return { score: this.score, best: save.best[activeId] || 0, third: doneCount, thirdLabel: "gallery" };
    },
    pointerDown(x, y) {
      if (this.done) return;
      const topTool = tools.find((t, i) => x > 64 + i * 118 && x < 166 + i * 118 && y > 84 && y < 134);
      if (topTool) {
        if (topTool.id === "done") {
          const bonus = stampCount >= 3 && paintCount >= 8 ? 35 : 12;
          doneCount += 1;
          addScore(bonus);
          burst(W / 2, 112, ["#ffd166", "#fff", "#37d99e", "#f083ff"], 34, 330);
          hint.textContent = "Saved to the tiny gallery. New scene!";
          marks = [];
          stampCount = 0;
          paintCount = 0;
          scene = (scene + 1) % scenes.length;
          bg = "#fff8d8";
          return;
        }
        tool = topTool.id;
        hint.textContent = topTool.label + " selected.";
        return;
      }
      const swatch = colors.find((c, i) => x > 670 + i * 38 && x < 702 + i * 38 && y > 96 && y < 128);
      if (swatch) {
        color = swatch;
        return;
      }
      drawing = true;
      addMark(x, y);
    },
    pointerMove(x, y) {
      if (drawing && tool === "brush") addMark(x, y);
    },
    pointerUp() { drawing = false; },
    update(dt) {
      bounce = Math.max(0, bounce - dt);
      if (this.time <= 0) gameOver("Studio time!");
    },
    draw() {
      gradientStage("#ff8fcf", "#54c6eb", "#37d99e");
      stagePattern("rgba(255,255,255,0.16)", 82);
      drawTopHud("Prompt: add 3 stickers and some color", "#f083ff");
      tools.forEach((t, i) => {
        const x = 64 + i * 118;
        glossyRect(x, 84, 102, 50, 16, tool === t.id ? "#fff66d" : "rgba(255,255,255,0.24)");
        if (!drawSprite("rainbowArtSheet", sprites.rainbowArt[t.sprite], x + 51, 109, 42, 36)) textCenter(t.icon, x + 51, 109, 25, "#18233f");
      });
      colors.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.roundRect(670 + i * 38, 96, 32, 32, 10); ctx.fill();
        if (c === color) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.stroke(); }
      });
      glossyRect(area.x - 10, area.y - 10, area.w + 20, area.h + 20, 28, "rgba(255,255,255,0.36)", false);
      roundRect(area.x, area.y, area.w, area.h, 22, bg);
      ctx.save();
      ctx.beginPath(); ctx.rect(area.x, area.y, area.w, area.h); ctx.clip();
      const sceneSprite = scenes[scene] === "castle" ? "castle" : scenes[scene] === "garden" ? "garden" : scenes[scene] === "rocket" ? "rocket" : "sheet";
      if (!drawSprite("rainbowArtSheet", sprites.rainbowArt[sceneSprite], area.x + area.w / 2, area.y + area.h / 2, 210, 120)) {
        textCenter(scenes[scene] === "castle" ? "🏰" : scenes[scene] === "garden" ? "🌷" : scenes[scene] === "rocket" ? "🚀" : scenes[scene] === "ocean" ? "🌊" : "🎉", area.x + area.w / 2, area.y + area.h / 2, 112, "rgba(35,48,77,0.2)");
      }
      marks.forEach((m, i) => {
        if (m.type === "dot") {
          ctx.fillStyle = m.color;
          ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
        } else if (m.type === "sticker") {
          const lift = bounce > 0 ? Math.sin(performance.now() / 60 + i) * 8 : 0;
          if (!drawSprite("rainbowArtSheet", sprites.rainbowArt[m.sticker.sprite], m.x, m.y + lift, 54, 42)) textCenter(m.sticker.icon, m.x, m.y + lift, 36);
        } else {
          if (!drawSprite("rainbowArtSheet", sprites.rainbowArt.spark, m.x, m.y, 52, 36)) textCenter("✨", m.x, m.y, 34);
        }
      });
      ctx.restore();
      glossyRect(60, 548, 840, 52, 18, "rgba(255,255,255,0.22)", false);
      textCenter("Paint " + paintCount + "  •  Stickers " + stampCount + "  •  Gallery " + doneCount, W / 2, 574, 24);
      drawParticles();
      if (this.done) drawEndOverlay("Gallery saved", "Final score " + this.score);
    }
  };
}

backBtn.addEventListener("click", backToHub);
restartBtn.addEventListener("click", () => activeId && startGame(activeId));
surpriseBtn.addEventListener("click", () => startGame(choice(gameDefs).id));
bindCanvas();
renderCards();
