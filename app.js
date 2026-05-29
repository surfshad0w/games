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
  ["cardSheet", "assets/generated/card-battle-sprites.png"],
  ["dungeonSheet", "assets/generated/dungeon-dash-sprites.png"],
  ["avatarSheet", "assets/generated/avatar-studio-sprites.png"],
  ["tinyTownSheet", "assets/generated/new-games/tiny-town-delivery.png"],
  ["marbleLabSheet", "assets/generated/new-games/marble-machine-lab.png"],
  ["rainbowArtSheet", "assets/generated/new-games/rainbow-art-studio.png"],
  ["forestFixSheet", "assets/generated/new-games/forest-fix-it-crew.png"]
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
  card: {
    monster: [180, 65, 390, 325],
    hero: [1110, 65, 270, 290],
    icons: [[135, 460, 205, 205], [397, 460, 205, 205], [660, 460, 205, 205], [922, 460, 205, 205], [1185, 460, 205, 205]],
    impact: [545, 725, 370, 185]
  },
  dungeon: {
    hero: [190, 60, 200, 220],
    key: [690, 85, 265, 190],
    chest: [145, 415, 310, 220],
    trap: [570, 425, 395, 200],
    wall: [95, 725, 400, 185],
    gem: [670, 725, 195, 180],
    door: [1030, 405, 355, 470]
  },
  tinyTown: {
    scooter: [126, 116, 190, 188],
    bakery: [672, 80, 251, 216],
    flowers: [951, 90, 228, 204],
    pets: [1211, 88, 250, 206],
    park: [73, 352, 214, 167],
    house: [318, 355, 216, 177],
    library: [557, 345, 213, 181],
    cupcake: [796, 355, 186, 158],
    bouquet: [1029, 369, 163, 166],
    bone: [1205, 412, 216, 89],
    books: [78, 608, 206, 135],
    balloons: [318, 578, 167, 219],
    cone: [523, 604, 146, 123],
    puddle: [700, 634, 249, 95],
    cat: [973, 614, 247, 143],
    star: [1286, 612, 158, 133]
  },
  marbleLab: {
    ball: [105, 83, 155, 144],
    launcher: [296, 85, 327, 204],
    cup: [715, 80, 190, 214],
    ramp: [927, 80, 300, 155],
    curved: [671, 349, 276, 197],
    button: [79, 346, 226, 170],
    fan: [1026, 358, 206, 206],
    sticky: [1255, 370, 204, 174],
    magnet: [451, 597, 197, 173],
    gem: [729, 653, 144, 118],
    burst: [1240, 620, 217, 148],
    arrow: [660, 846, 231, 78]
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
  },
  forestFix: {
    kid: [77, 75, 224, 327],
    fox: [385, 78, 183, 203],
    hammer: [637, 96, 147, 173],
    water: [806, 89, 193, 169],
    brush: [1024, 80, 145, 215],
    bridge: [898, 335, 262, 139],
    broom: [1345, 73, 125, 213],
    brokenBridge: [554, 329, 295, 158],
    path: [1232, 346, 261, 115],
    tree: [1205, 518, 220, 256],
    flower: [71, 639, 221, 75],
    wilted: [327, 624, 185, 94],
    pond: [603, 736, 294, 111],
    bush: [980, 698, 211, 122],
    sparkle: [1231, 804, 184, 169]
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
  restartBtn.textContent = id === "avatar-studio" ? "Reset" : "Restart";
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
  { id: "kitchen-chaos", title: "Kitchen Chaos", kicker: "Build silly snacks", icon: "🍕", color: "linear-gradient(145deg, #ffd166, #ff8f70)", desc: "Tap ingredients in the right order.", hint: "Make the snack shown at the top. Tap Clear if it gets messy.", starEvery: 90, create: createKitchenChaos },
  { id: "space-miner", title: "Space Miner", kicker: "Fly and dodge", icon: "🚀", color: "linear-gradient(145deg, #315c9d, #8bd3ff)", desc: "Collect crystals while avoiding asteroids.", hint: "Drag anywhere to steer the ship.", starEvery: 100, create: createSpaceMiner },
  { id: "avatar-studio", title: "Avatar Studio", kicker: "Make a character", icon: "🎨", color: "linear-gradient(145deg, #f083ff, #54c6eb)", desc: "Mix faces, hats, colors, and stickers.", hint: "Tap the chips to design a character. Each new combo earns points.", starEvery: 60, create: createAvatarStudio },
  { id: "mini-golf", title: "Mini Golf Madness", kicker: "Aim and putt", icon: "⛳", color: "linear-gradient(145deg, #2cb67d, #ffd166)", desc: "Bounce around bumpers and sink putts.", hint: "Drag back from the ball, then let go to shoot.", starEvery: 55, create: createMiniGolf },
  { id: "card-battle", title: "Card Battle", kicker: "Pick powers", icon: "⚡", color: "linear-gradient(145deg, #9277ff, #ff6b6b)", desc: "Use funny powers to beat the boss.", hint: "Pick one card each turn. Stars, shields, and snacks help you win.", starEvery: 70, create: createCardBattle },
  { id: "dungeon-dash", title: "Dungeon Dash", kicker: "Keys and treasure", icon: "🗝️", color: "linear-gradient(145deg, #26304d, #37d99e)", desc: "Find keys, dodge traps, grab gems.", hint: "Drag in the maze to move. Get the key, then the treasure.", starEvery: 85, create: createDungeonDash },
  { id: "tiny-town", title: "Tiny Town Delivery", kicker: "Cozy town quests", icon: "🛵", color: "linear-gradient(145deg, #00a676, #ffd166)", desc: "Scoot through town and deliver silly packages.", hint: "Drag to steer. Pick up the glowing item, then deliver it to the matching stop.", starEvery: 95, create: createTinyTownDelivery },
  { id: "marble-lab", title: "Marble Machine Lab", kicker: "Build and test", icon: "🔵", color: "linear-gradient(145deg, #4d96ff, #ffcf56)", desc: "Place toy parts and guide the marble home.", hint: "Tap a piece, tap a glowing slot, then press Play.", starEvery: 75, create: createMarbleMachineLab },
  { id: "rainbow-art", title: "Rainbow Art Studio", kicker: "Paint and sticker", icon: "🖍️", color: "linear-gradient(145deg, #ff5c8a, #37d99e)", desc: "Make bright scenes with brushes and stickers.", hint: "Pick a tool, then draw or stamp on the canvas. Finish the prompt for bonus stars.", starEvery: 70, create: createRainbowArtStudio },
  { id: "forest-fix", title: "Forest Fix-It Crew", kicker: "Repair and rescue", icon: "🧰", color: "linear-gradient(145deg, #2fbf71, #7c5cff)", desc: "Choose tools, fix forest problems, and find badges.", hint: "Tap the right tool, then tap the matching forest problem.", starEvery: 80, create: createForestFixItCrew }
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

function createKitchenChaos() {
  const ingredients = [{ id: "bread", icon: "🍞" }, { id: "cheese", icon: "🧀" }, { id: "tomato", icon: "🍅" }, { id: "egg", icon: "🥚" }, { id: "cake", icon: "🧁" }, { id: "berry", icon: "🍓" }];
  const recipes = [["bread", "cheese", "tomato"], ["egg", "bread", "cheese"], ["cake", "berry", "berry"], ["bread", "tomato", "egg"], ["cheese", "cake", "berry"]];
  let recipe = choice(recipes), plate = [], served = 0;
  let clearFlash = 0;
  const spots = ingredients.map((ing, i) => ({ ...ing, x: 150 + i * 132, y: 450, r: 48 }));
  function newRecipe() { recipe = choice(recipes); plate = []; }
  return {
    time: 90,
    pointerDown(x, y) {
      if (this.done) return;
      if (x >= 715 && x <= 880 && y >= 60 && y <= 165) {
        plate = [];
        clearFlash = 0.45;
        hint.textContent = "Plate cleared.";
        burst(795, 110, ["#fff", "#ff6b6b", "#ffd166"], 12, 180);
        return;
      }
      const hit = spots.find((s) => Math.hypot(x - s.x, y - s.y) < s.r);
      if (!hit) return;
      plate.push(hit.id);
      if (plate[plate.length - 1] !== recipe[plate.length - 1]) { addScore(-5); plate = []; hint.textContent = "Oops, try that snack again."; }
      else if (plate.length === recipe.length) { served += 1; addScore(30); burst(480, 290, ["#fff", "#ffd166", "#ff6b6b", "#37d99e"], 22, 270); hint.textContent = "Snack served!"; newRecipe(); }
    },
    stats() {
      return { score: this.score, best: save.best[activeId] || 0, third: served, thirdLabel: "served" };
    },
    update(dt) { clearFlash = Math.max(0, clearFlash - dt); if (this.time <= 0) gameOver("Kitchen closed!"); },
    draw() {
      gradientStage("#ff8f70", "#ffd166", "#37d99e");
      stagePattern("rgba(255,255,255,0.14)", 92);
      for (let i = 0; i < 12; i++) roundRect(30 + i * 86, 24 + (i % 2) * 22, 42, 12, 8, "rgba(255,255,255,0.25)");
      glossyRect(60, 58, 840, 120, 34, "rgba(255,255,255,0.92)", false); textCenter("Order", 150, 118, 28, "#26304d");
      recipe.forEach((id, i) => textCenter(ingredients.find((x) => x.id === id).icon, 290 + i * 90, 118, 48));
      glossyRect(730, 75, 130, 70, 20, clearFlash > 0 ? "#37d99e" : "#ff6b6b"); textCenter(clearFlash > 0 ? "Cleared" : "Clear", 795, 110, 24, "#fff");
      glossyRect(240, 230, 480, 130, 42, plate.length ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.78)", false);
      textCenter("🍽️", 480, 295, 90);
      if (!plate.length) textCenter("Tap food below", 480, 338, 24, "#6d738a");
      plate.forEach((id, i) => textCenter(ingredients.find((x) => x.id === id).icon, 380 + i * 72, 286, 52));
      spots.forEach((s) => { ctx.shadowColor = "rgba(0,0,0,0.22)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8; ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; textCenter(s.icon, s.x, s.y + 2, 50); });
      drawParticles();
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

function createAvatarStudio() {
  canvas.classList.add("hidden"); domStage.classList.remove("hidden");
  const avatarRects = {
    face: [[130,55,235,230], [405,55,235,230], [675,55,230,230], [945,55,230,230], [1215,55,235,230]],
    hat: [[130,345,230,145], [410,340,230,165], [660,335,205,170], [945,350,205,120], [1190,345,250,140]],
    sticker: [[500,620,145,135], [675,610,225,125], [965,595,120,155], [670,825,170,135], [885,815,200,155]]
  };
  const state = Object.assign({ face: 0, hat: 3, bg: "#ffd166", sticker: 0 }, save.avatar || {});
  if (typeof state.face !== "number") state.face = 0;
  if (typeof state.hat !== "number") state.hat = 3;
  if (typeof state.sticker !== "number") state.sticker = 0;
  const options = { face: [0, 1, 2, 3, 4], hat: [0, 1, 2, 3, 4], bg: ["#ffd166", "#37d99e", "#54c6eb", "#f083ff", "#ff8f70", "#9277ff"], sticker: [0, 1, 2, 3, 4] };
  const emoji = {
    face: ["🙂", "😎", "🤩", "😺", "🤖"],
    hat: ["👑", "🎩", "🧢", "🌸", "⚡"],
    sticker: ["⭐", "🌈", "🔥", "🍕", "🚀"]
  };
  const pieceStyle = (rect, scale = 1) => "background-position:-" + rect[0] * scale + "px -" + rect[1] * scale + "px;background-size:" + 1536 * scale + "px " + 1024 * scale + "px;";
  function render() {
    domStage.innerHTML = '<div class="avatar-grid"><div class="avatar-preview"><div class="avatar-person" style="--avatar-bg:' + state.bg + '"><span>' + emoji.hat[state.hat] + '</span><span>' + emoji.face[state.face] + '</span><span>' + emoji.sticker[state.sticker] + '</span></div></div><div class="avatar-tools"></div></div>';
    const tools = domStage.querySelector(".avatar-tools");
    Object.entries(options).forEach(([key, values]) => {
      const row = document.createElement("div");
      row.className = "tool-row";
      row.innerHTML = "<h3>" + key + '</h3><div class="chip-row"></div>';
      const chipRow = row.querySelector(".chip-row");
      values.forEach((value) => {
        const chip = document.createElement("button");
        chip.type = "button"; chip.className = "chip " + (state[key] === value ? "active" : ""); chip.textContent = "";
        if (key === "bg") chip.style.background = value;
        else chip.textContent = emoji[key][value];
        chip.addEventListener("click", () => { state[key] = value; save.avatar = state; saveGame(); addScore(5); render(); });
        chipRow.append(chip);
      });
      tools.append(row);
    });
  }
  render();
  return { time: 120, update() { if (this.time <= 0) gameOver("Studio saved!"); }, draw() {}, destroy() { canvas.classList.remove("hidden"); domStage.classList.add("hidden"); domStage.innerHTML = ""; } };
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

function createCardBattle() {
  let hp = 80, boss = 95, cards = [];
  const deck = [{ name: "Star Zap", icon: "⭐", sprite: 0, dmg: 18, heal: 0, shield: 0 }, { name: "Snack Heal", icon: "🧁", sprite: 1, dmg: 5, heal: 16, shield: 0 }, { name: "Shield", icon: "🛡️", sprite: 2, dmg: 6, heal: 0, shield: 14 }, { name: "Mega Pop", icon: "💥", sprite: 4, dmg: 26, heal: 0, shield: -4 }, { name: "Rainbow", icon: "🌈", sprite: 3, dmg: 14, heal: 8, shield: 4 }];
  let selected = -1, selectedFlash = 0;
  function deal() {
    const pool = [...deck];
    cards = Array.from({ length: 3 }, () => pool.splice(Math.floor(rand(0, pool.length)), 1)[0]);
  }
  deal();
  return {
    time: 120,
    pointerDown(x, y) {
      if (this.done) return;
      const idx = Math.floor((x - 170) / 220);
      if (y < 410 || y > 585 || idx < 0 || idx > 2) return;
      const card = cards[idx];
      selected = idx;
      selectedFlash = 0.5;
      boss -= card.dmg; hp = clamp(hp + card.heal, 0, 100);
      const bossHit = Math.max(0, rand(9, 20) - card.shield);
      hp -= bossHit; addScore(card.dmg + card.heal);
      if (boss <= 0) { addScore(60); burst(780, 250, ["#ff6b6b", "#ffd166", "#fff", "#9277ff"], 32, 340); boss = 95 + Math.floor(this.score / 90) * 10; hp = clamp(hp + 25, 0, 100); hint.textContent = "Boss bounced away! New challenger."; }
      if (hp <= 0) { hp = 70; addScore(-25); hint.textContent = "You got a second wind."; }
      deal();
    },
    update(dt) { selectedFlash = Math.max(0, selectedFlash - dt); if (this.time <= 0) gameOver("Battle done!"); },
    draw() {
      gradientStage("#37176f", "#6127d8", "#ff5c8a");
      stagePattern("rgba(255,255,255,0.14)", 86);
      glossyRect(50, 44, 860, 150, 34, "rgba(255,255,255,0.14)", false);
      textCenter("You", 180, 92, 28); textCenter("Boss", 780, 92, 28);
      roundRect(75, 130, 220, 24, 12, "rgba(0,0,0,0.35)"); roundRect(665, 130, 220, 24, 12, "rgba(0,0,0,0.35)"); roundRect(75, 130, 220 * hp / 100, 24, 12, "#37d99e"); roundRect(665, 130, 220 * boss / 120, 24, 12, "#ff6b6b");
      if (!drawSprite("cardSheet", sprites.card.hero, 180, 250, 112, 120)) textCenter("🧒", 180, 250, 100);
      if (!drawSprite("cardSheet", sprites.card.monster, 780, 250, 150, 125)) drawMonster(780, 250, 1.08);
      cards.forEach((card, i) => {
        const x = 170 + i * 220;
        if (selectedFlash > 0 && selected === i) glossyRect(x - 8, 402, 196, 191, 28, "rgba(255,209,102,0.72)", false);
        glossyRect(x, 410, 180, 175, 24, "#fff");
        if (!drawSprite("cardSheet", sprites.card.icons[card.sprite], x + 90, 476, 72, 72)) textCenter(card.icon, x + 90, 472, 54);
        textCenter(card.name, x + 90, 540, 23, "#26304d");
      });
      drawParticles();
    }
  };
}

function createDungeonDash() {
  const hero = { x: 90, y: 540, r: 24 };
  let target = { x: hero.x, y: hero.y }, key = { x: 825, y: 135, got: false }, chest = { x: 830, y: 535 }, roomsCleared = 0;
  let traps = [{ x: 280, y: 340, vx: 130, vy: 0 }, { x: 500, y: 520, vx: 0, vy: -115 }, { x: 680, y: 155, vx: -120, vy: 0 }];
  const walls = [
    { x: 145, y: 205, w: 620, h: 30 },
    { x: 195, y: 420, w: 600, h: 30 },
    { x: 250, y: 285, w: 30, h: 135 },
    { x: 455, y: 105, w: 30, h: 210 },
    { x: 620, y: 285, w: 30, h: 135 }
  ];
  function hitsWall(nx, ny) { return walls.some((w) => nx + hero.r > w.x && nx - hero.r < w.x + w.w && ny + hero.r > w.y && ny - hero.r < w.y + w.h); }
  function resetHero() { hero.x = 90; hero.y = 540; target = { x: hero.x, y: hero.y }; }
  function newRoom() {
    roomsCleared += 1;
    resetHero();
    key = { x: roomsCleared % 2 ? 835 : 825, y: roomsCleared % 2 ? 535 : 135, got: false };
    chest = { x: roomsCleared % 2 ? 825 : 830, y: roomsCleared % 2 ? 135 : 535 };
    traps.forEach((tr, i) => { tr.vx *= i === 1 ? 1 : 1.08; tr.vy *= i === 1 ? 1.08 : 1; });
    hint.textContent = "New room! Get the key first.";
  }
  return {
    time: 100,
    pointerDown(x, y) { target = { x, y }; },
    pointerMove(x, y) { if (pointer.down) target = { x, y }; },
    update(dt) {
      if (this.time <= 0) gameOver("Dungeon done!");
      const dx = target.x - hero.x, dy = target.y - hero.y, len = Math.hypot(dx, dy) || 1, step = Math.min(260 * dt, len);
      const nx = hero.x + dx / len * step, ny = hero.y + dy / len * step;
      if (!hitsWall(nx, hero.y)) hero.x = clamp(nx, 40, W - 40); if (!hitsWall(hero.x, ny)) hero.y = clamp(ny, 40, H - 40);
      traps.forEach((tr) => {
        tr.x += tr.vx * dt; tr.y += tr.vy * dt;
        if (tr.x < 190 || tr.x > 795) tr.vx *= -1;
        if (tr.y < 130 || tr.y > 550) tr.vy *= -1;
        if (Math.hypot(hero.x - tr.x, hero.y - tr.y) < 42) {
          addScore(-10);
          burst(hero.x, hero.y, ["#ff6b6b", "#fff", "#ffd166"], 16, 260);
          resetHero();
          hint.textContent = "Trap! Start again from the safe corner.";
        }
      });
      if (!key.got && Math.hypot(hero.x - key.x, hero.y - key.y) < 48) { key.got = true; addScore(20); }
      if (key.got && Math.hypot(hero.x - chest.x, hero.y - chest.y) < 54) { addScore(55); burst(chest.x, chest.y, ["#ffd166", "#fff", "#37d99e"], 26, 320); newRoom(); }
    },
    draw() {
      gradientStage("#20234f", "#323b88", "#1bbf9c");
      for (let x = 0; x < W; x += 80) for (let y = 0; y < H; y += 80) roundRect(x + 6, y + 6, 68, 68, 10, "rgba(255,255,255,0.08)");
      walls.forEach((w) => glossyRect(w.x, w.y, w.w, w.h, 12, "#5c668d"));
      drawTopHud((key.got ? "Now open the treasure" : "Get the key first") + "  •  rooms " + roomsCleared, "#37d99e");
      if (!key.got && !drawSprite("dungeonSheet", sprites.dungeon.key, key.x, key.y, 74, 54)) textCenter("🗝️", key.x, key.y, 52);
      if (!drawSprite("dungeonSheet", sprites.dungeon.chest, chest.x, chest.y, 78, 58)) textCenter("🎁", chest.x, chest.y, 58);
      traps.forEach((tr) => { if (!drawSprite("dungeonSheet", sprites.dungeon.trap, tr.x, tr.y, 72, 42)) textCenter("✹", tr.x, tr.y, 52, "#ff6b6b"); });
      drawKidHero(hero.x, hero.y, 0.92);
      drawParticles();
    }
  };
}

function createTinyTownDelivery() {
  const stops = [
    { id: "bakery", name: "Bakery", icon: "🧁", sprite: "bakery", x: 150, y: 170, color: "#ff8f70" },
    { id: "flowers", name: "Flowers", icon: "💐", sprite: "flowers", x: 460, y: 140, color: "#f083ff" },
    { id: "pets", name: "Pet Shop", icon: "🦴", sprite: "pets", x: 770, y: 180, color: "#37d99e" },
    { id: "library", name: "Library", icon: "📚", sprite: "library", x: 205, y: 480, color: "#4d96ff" },
    { id: "park", name: "Park", icon: "🎈", sprite: "park", x: 520, y: 480, color: "#ffd166" },
    { id: "house", name: "House", icon: "🏠", sprite: "house", x: 805, y: 465, color: "#ff6b6b" }
  ];
  const items = [
    { icon: "🧁", sprite: "cupcake", from: "bakery" },
    { icon: "💐", sprite: "bouquet", from: "flowers" },
    { icon: "🦴", sprite: "bone", from: "pets" },
    { icon: "📚", sprite: "books", from: "library" },
    { icon: "🎈", sprite: "balloons", from: "park" }
  ];
  const hazards = [
    { x: 342, y: 300, r: 28, icon: "💧", sprite: "puddle", w: 78, h: 42 },
    { x: 642, y: 330, r: 26, icon: "🚧", sprite: "cone", w: 54, h: 50 },
    { x: 705, y: 525, r: 25, icon: "🐾", sprite: "cat", w: 82, h: 50 }
  ];
  const player = { x: 110, y: 330, r: 26, speed: 265 };
  let target = { x: player.x, y: player.y };
  let hearts = 3, delivery = null, carrying = false, chain = 0, flash = 0, routeCount = 0;
  function newDelivery() {
    const item = choice(items);
    let dest = choice(stops);
    while (dest.id === item.from) dest = choice(stops);
    delivery = { item, source: stops.find((s) => s.id === item.from), dest };
    carrying = false;
    routeCount += 1;
    hint.textContent = "Pick up " + item.icon + " at " + delivery.source.name + ", then deliver to " + dest.name + ".";
  }
  newDelivery();
  return {
    time: 90,
    pointerDown(x, y) { target = { x, y }; },
    pointerMove(x, y) { if (pointer.down) target = { x, y }; },
    stats() {
      return { score: this.score, best: save.best[activeId] || 0, third: hearts, thirdLabel: "hearts" };
    },
    update(dt) {
      if (this.time <= 0) gameOver("Town route done!");
      flash = Math.max(0, flash - dt);
      const dx = target.x - player.x, dy = target.y - player.y, len = Math.hypot(dx, dy) || 1;
      const step = Math.min(player.speed * dt, len);
      player.x = clamp(player.x + dx / len * step, 62, W - 62);
      player.y = clamp(player.y + dy / len * step, 112, H - 64);
      hazards.forEach((h) => {
        if (flash <= 0 && Math.hypot(player.x - h.x, player.y - h.y) < player.r + h.r) {
          hearts -= 1;
          chain = 0;
          flash = 0.85;
          addScore(-8);
          burst(player.x, player.y, ["#8bd3ff", "#ffffff", "#ff6b6b"], 18, 230);
          hint.textContent = hearts > 0 ? "Careful around town! " + hearts + " hearts left." : "The route got too bumpy.";
          if (hearts <= 0) gameOver("Delivery day done!");
        }
      });
      if (!delivery || this.done) return;
      const goal = carrying ? delivery.dest : delivery.source;
      if (Math.hypot(player.x - goal.x, player.y - goal.y) < 64) {
        if (!carrying) {
          carrying = true;
          addScore(15);
          burst(goal.x, goal.y, ["#ffd166", "#fff", "#37d99e"], 20, 260);
          hint.textContent = "Now deliver " + delivery.item.icon + " to " + delivery.dest.name + ".";
        } else {
          chain += 1;
          addScore(30 + chain * 8);
          burst(goal.x, goal.y, ["#ffd166", "#fff", "#f083ff", "#37d99e"], 28, 320);
          newDelivery();
        }
      }
    },
    draw() {
      gradientStage("#7ee8fa", "#95f985", "#ffd166");
      ctx.fillStyle = "rgba(255,255,255,0.23)";
      for (let i = 0; i < 8; i++) roundRect(38 + i * 125, 92 + (i % 2) * 352, 74, 16, 8, "rgba(255,255,255,0.28)");
      ctx.strokeStyle = "rgba(255,255,255,0.62)";
      ctx.lineWidth = 46;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(118, 330); ctx.lineTo(820, 330); ctx.moveTo(220, 145); ctx.lineTo(220, 500); ctx.moveTo(520, 145); ctx.lineTo(520, 500); ctx.moveTo(780, 170); ctx.lineTo(780, 480);
      ctx.stroke();
      ctx.strokeStyle = "rgba(77,96,130,0.2)";
      ctx.lineWidth = 4;
      ctx.setLineDash([20, 20]);
      ctx.beginPath(); ctx.moveTo(118, 330); ctx.lineTo(820, 330); ctx.stroke();
      ctx.setLineDash([]);
      drawTopHud((carrying ? "Deliver " : "Pick up ") + delivery.item.icon + "  •  trips " + Math.max(0, routeCount - 1), "#00a676");
      stops.forEach((s) => {
        const active = delivery && ((carrying && s.id === delivery.dest.id) || (!carrying && s.id === delivery.source.id));
        ctx.save();
        if (active) {
          ctx.globalAlpha = 0.36 + Math.sin(performance.now() / 150) * 0.12;
          ctx.fillStyle = "#fff66d";
          ctx.beginPath(); ctx.arc(s.x, s.y, 70, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        }
        if (!drawSprite("tinyTownSheet", sprites.tinyTown[s.sprite], s.x, s.y, 112, 86)) {
          glossyRect(s.x - 48, s.y - 38, 96, 76, 20, s.color);
          textCenter(s.icon, s.x, s.y - 4, 38);
        }
        ctx.restore();
      });
      hazards.forEach((h) => {
        ctx.fillStyle = "rgba(0,0,0,0.14)";
        ctx.beginPath(); ctx.ellipse(h.x, h.y + 12, h.r * 1.15, h.r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
        if (!drawSprite("tinyTownSheet", sprites.tinyTown[h.sprite], h.x, h.y, h.w, h.h)) textCenter(h.icon, h.x, h.y, 34);
      });
      ctx.save();
      if (flash > 0) ctx.globalAlpha = 0.55 + Math.sin(performance.now() / 45) * 0.25;
      if (carrying) {
        if (!drawSprite("tinyTownSheet", sprites.tinyTown[delivery.item.sprite], player.x, player.y - 38, 48, 42)) textCenter(delivery.item.icon, player.x, player.y - 42, 26);
      }
      if (!drawSprite("tinyTownSheet", sprites.tinyTown.scooter, player.x, player.y, 78, 66)) {
        glossyRect(player.x - 33, player.y - 24, 66, 48, 20, "#ff5c8a");
        textCenter("🛵", player.x, player.y - 2, 32);
      }
      ctx.restore();
      drawParticles();
      if (this.done) drawEndOverlay("Route complete", "Final score " + this.score);
    }
  };
}

function createMarbleMachineLab() {
  const levels = [
    { slots: [{ x: 355, y: 300, need: "ramp" }], goal: { x: 780, y: 430 }, start: { x: 150, y: 180 } },
    { slots: [{ x: 330, y: 260, need: "ramp" }, { x: 570, y: 380, need: "bumper" }], goal: { x: 790, y: 480 }, start: { x: 140, y: 160 } },
    { slots: [{ x: 320, y: 390, need: "fan" }, { x: 585, y: 250, need: "magnet" }], goal: { x: 790, y: 215 }, start: { x: 130, y: 455 } },
    { slots: [{ x: 300, y: 270, need: "ramp" }, { x: 490, y: 390, need: "sticky" }, { x: 670, y: 300, need: "bumper" }], goal: { x: 815, y: 440 }, start: { x: 125, y: 180 } }
  ];
  const pieces = [
    { id: "ramp", icon: "▰", sprite: "ramp", color: "#ffcf56" },
    { id: "bumper", icon: "●", sprite: "button", color: "#ff6b6b" },
    { id: "fan", icon: "✽", sprite: "fan", color: "#54c6eb" },
    { id: "magnet", icon: "U", sprite: "magnet", color: "#9277ff" },
    { id: "sticky", icon: "✦", sprite: "sticky", color: "#37d99e" }
  ];
  let level = 0, selected = "ramp", tries = 0, solving = false, marble = null, path = [], pathIndex = 0, hintPulse = 0, cleared = 0;
  function current() { return levels[level]; }
  function resetMarble() {
    const l = current();
    marble = { x: l.start.x, y: l.start.y, r: 18 };
    solving = false;
    path = [];
    pathIndex = 0;
  }
  function pieceOk() {
    return current().slots.every((s) => s.piece === s.need);
  }
  function playMachine(game) {
    tries += 1;
    const l = current();
    path = [l.start, ...l.slots.map((s) => ({ x: s.x, y: s.y })), l.goal];
    pathIndex = 1;
    marble = { x: l.start.x, y: l.start.y, r: 18 };
    solving = true;
    hint.textContent = "Watch the marble roll.";
    if (!pieceOk()) {
      hintPulse = 1.4;
      setTimeout(() => {
        if (activeGame === game && solving && !pieceOk()) {
          solving = false;
          hint.textContent = "Try matching each glowing slot to the right toy part.";
        }
      }, 1200);
    }
  }
  resetMarble();
  return {
    time: 180,
    stats() {
      return { score: this.score, best: save.best[activeId] || 0, third: level + 1, thirdLabel: "level" };
    },
    pointerDown(x, y) {
      if (this.done) return;
      const tray = pieces.find((p, i) => x > 92 + i * 118 && x < 188 + i * 118 && y > 526 && y < 614);
      if (tray) {
        selected = tray.id;
        hint.textContent = "Now tap a glowing slot.";
        return;
      }
      if (x > 748 && x < 900 && y > 92 && y < 158) {
        playMachine(this);
        return;
      }
      if (x > 590 && x < 730 && y > 92 && y < 158) {
        current().slots.forEach((s) => delete s.piece);
        resetMarble();
        hint.textContent = "Slots cleared.";
        return;
      }
      const slot = current().slots.find((s) => Math.hypot(x - s.x, y - s.y) < 54);
      if (slot && !solving) {
        slot.piece = selected;
        addScore(4);
        burst(slot.x, slot.y, ["#fff", "#ffd166", "#54c6eb"], 10, 180);
      }
    },
    update(dt) {
      hintPulse = Math.max(0, hintPulse - dt);
      if (!solving || !marble || !path[pathIndex]) return;
      const dest = path[pathIndex];
      const dx = dest.x - marble.x, dy = dest.y - marble.y, len = Math.hypot(dx, dy) || 1;
      const speed = pieceOk() ? 300 : 235;
      const step = Math.min(speed * dt, len);
      marble.x += dx / len * step;
      marble.y += dy / len * step;
      if (len < 8) {
        pathIndex += 1;
        if (!pieceOk() && pathIndex > 2) {
          solving = false;
          hint.textContent = "That machine missed the cup. Try another piece.";
          return;
        }
        if (pathIndex >= path.length) {
          solving = false;
          cleared += 1;
          addScore(34 + Math.max(0, 12 - tries));
          burst(current().goal.x, current().goal.y, ["#ffd166", "#fff", "#37d99e"], 30, 330);
          level = (level + 1) % levels.length;
          tries = 0;
          resetMarble();
          hint.textContent = cleared >= levels.length ? "Full lab loop cleared. Keep experimenting!" : "Level cleared. Next machine!";
        }
      }
    },
    draw() {
      gradientStage("#5ad7ff", "#8067ff", "#ffcf56");
      stagePattern("rgba(255,255,255,0.12)", 80);
      drawTopHud("Level " + (level + 1) + "  •  tries " + tries, "#ffcf56");
      glossyRect(590, 92, 140, 66, 22, "rgba(255,255,255,0.28)");
      textCenter("Reset", 660, 125, 23);
      glossyRect(748, 92, 152, 66, 22, "#37d99e");
      textCenter("Play", 824, 125, 28, "#102348");
      const l = current();
      if (!drawSprite("marbleLabSheet", sprites.marbleLab.launcher, l.start.x, l.start.y, 110, 78)) {
        glossyRect(l.start.x - 42, l.start.y - 34, 84, 68, 24, "#ff8f70");
        textCenter("↗", l.start.x, l.start.y, 34);
      }
      if (!drawSprite("marbleLabSheet", sprites.marbleLab.cup, l.goal.x, l.goal.y, 76, 80)) {
        glossyRect(l.goal.x - 44, l.goal.y - 30, 88, 60, 24, "#ffffff");
        textCenter("🏆", l.goal.x, l.goal.y, 34);
      }
      ctx.strokeStyle = "rgba(255,255,255,0.24)";
      ctx.lineWidth = 12;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(l.start.x, l.start.y);
      l.slots.forEach((s) => ctx.lineTo(s.x, s.y));
      ctx.lineTo(l.goal.x, l.goal.y);
      ctx.stroke();
      l.slots.forEach((s) => {
        const pulse = hintPulse > 0 && !s.piece ? Math.sin(performance.now() / 90) * 8 : 0;
        const placed = pieces.find((p) => p.id === s.piece);
        glossyRect(s.x - 48 - pulse / 2, s.y - 42 - pulse / 2, 96 + pulse, 84 + pulse, 24, placed ? "rgba(255,255,255,0.34)" : "rgba(255,255,255,0.28)");
        if (placed && !drawSprite("marbleLabSheet", sprites.marbleLab[placed.sprite], s.x, s.y, 86, 64)) textCenter(placed.icon, s.x, s.y, 34, "#18233f");
        if (!placed) textCenter("?", s.x, s.y, 34, "#ffffff");
      });
      pieces.forEach((p, i) => {
        const x = 92 + i * 118, y = 526;
        glossyRect(x, y, 96, 88, 24, p.id === selected ? "#fff66d" : p.color);
        if (!drawSprite("marbleLabSheet", sprites.marbleLab[p.sprite], x + 48, y + 42, 62, 48)) textCenter(p.icon, x + 48, y + 42, 32, "#18233f");
      });
      if (marble) {
        ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 16;
        if (!drawSprite("marbleLabSheet", sprites.marbleLab.ball, marble.x, marble.y, 38, 38)) {
          const g = ctx.createRadialGradient(marble.x - 7, marble.y - 8, 4, marble.x, marble.y, 24);
          g.addColorStop(0, "#ffffff"); g.addColorStop(0.45, "#8bd3ff"); g.addColorStop(1, "#2448c7");
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(marble.x, marble.y, marble.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.shadowBlur = 0;
      }
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

function createForestFixItCrew() {
  const tools = [
    { id: "hammer", icon: "🔨", sprite: "hammer", color: "#ffd166" },
    { id: "water", icon: "💧", sprite: "water", color: "#54c6eb" },
    { id: "snack", icon: "🍎", sprite: "fox", color: "#ff6b6b" },
    { id: "brush", icon: "🧹", sprite: "broom", color: "#37d99e" }
  ];
  const allProblems = [
    { id: "bridge", need: "hammer", icon: "🌉", sprite: "brokenBridge", x: 210, y: 315, label: "Fix bridge" },
    { id: "flower", need: "water", icon: "🌼", sprite: "wilted", x: 430, y: 450, label: "Water flower" },
    { id: "bird", need: "snack", icon: "🐦", sprite: "fox", x: 735, y: 250, label: "Feed bird" },
    { id: "trail", need: "brush", icon: "🍂", sprite: "path", x: 645, y: 475, label: "Clear trail" },
    { id: "sign", need: "hammer", icon: "🪧", sprite: "bridge", x: 330, y: 205, label: "Fix sign" },
    { id: "sprout", need: "water", icon: "🌱", sprite: "flower", x: 805, y: 430, label: "Help sprout" }
  ];
  let selected = "hammer", fixed = 0, misses = 0, wave = 0;
  let problems = allProblems.slice(0, 4).map((p) => ({ ...p, done: false }));
  function nextWave() {
    wave += 1;
    const offset = wave % 3;
    problems = allProblems.slice(offset, offset + 4).concat(allProblems.slice(0, Math.max(0, offset - 2))).slice(0, 4).map((p) => ({ ...p, done: false }));
    hint.textContent = "New forest jobs. Pick the tool that matches the problem.";
  }
  return {
    time: 95,
    stats() {
      return { score: this.score, best: save.best[activeId] || 0, third: fixed, thirdLabel: "fixed" };
    },
    pointerDown(x, y) {
      if (this.done) return;
      const tool = tools.find((t, i) => x > 150 + i * 150 && x < 256 + i * 150 && y > 526 && y < 612);
      if (tool) {
        selected = tool.id;
        hint.textContent = tool.icon + " selected.";
        return;
      }
      const p = problems.find((job) => !job.done && Math.hypot(x - job.x, y - job.y) < 62);
      if (!p) return;
      if (p.need === selected) {
        p.done = true;
        fixed += 1;
        addScore(24 + Math.max(0, 8 - misses));
        burst(p.x, p.y, ["#ffd166", "#fff", "#37d99e"], 24, 280);
        hint.textContent = p.label + " complete.";
        if (problems.every((job) => job.done)) {
          addScore(35);
          nextWave();
        }
      } else {
        misses += 1;
        addScore(-4);
        burst(p.x, p.y, ["#ff6b6b", "#fff"], 8, 160);
        hint.textContent = "Try a different tool for that job.";
      }
    },
    update() {
      if (this.time <= 0) gameOver("Forest shift done!");
    },
    draw() {
      gradientStage("#92f38f", "#28c5a2", "#7c5cff");
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.beginPath(); ctx.arc(800, 110, 58, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 9; i++) {
        const x = 55 + i * 110;
        glossyRect(x, 400 + (i % 3) * 18, 42, 118, 20, "#7a5a37", false);
        ctx.fillStyle = i % 2 ? "#1fae70" : "#37d99e";
        ctx.beginPath(); ctx.arc(x + 20, 380 + (i % 3) * 18, 54, 0, Math.PI * 2); ctx.fill();
      }
      drawTopHud("Choose a tool, fix the forest  •  wave " + (wave + 1), "#37d99e");
      problems.forEach((p) => {
        if (p.done) {
          ctx.globalAlpha = 0.55;
          glossyRect(p.x - 48, p.y - 42, 96, 84, 24, "rgba(255,255,255,0.26)");
          textCenter("✓", p.x, p.y, 48, "#102348");
          ctx.globalAlpha = 1;
          return;
        }
        const tool = tools.find((t) => t.id === p.need);
        glossyRect(p.x - 54, p.y - 46, 108, 92, 26, "rgba(255,255,255,0.82)");
        if (!drawSprite("forestFixSheet", sprites.forestFix[p.sprite], p.x, p.y - 8, 82, 58)) textCenter(p.icon, p.x, p.y - 8, 42, "#102348");
        ctx.fillStyle = tool.color;
        ctx.beginPath(); ctx.arc(p.x + 38, p.y + 30, 18, 0, Math.PI * 2); ctx.fill();
      });
      tools.forEach((t, i) => {
        const x = 150 + i * 150;
        glossyRect(x, 526, 106, 86, 24, selected === t.id ? "#fff66d" : t.color);
        if (!drawSprite("forestFixSheet", sprites.forestFix[t.sprite], x + 53, 568, 58, 54)) textCenter(t.icon, x + 53, 568, 34, "#102348");
      });
      drawParticles();
      if (this.done) drawEndOverlay("Forest fixed", "Final score " + this.score);
    }
  };
}

backBtn.addEventListener("click", backToHub);
restartBtn.addEventListener("click", () => activeId && startGame(activeId));
surpriseBtn.addEventListener("click", () => startGame(choice(gameDefs).id));
bindCanvas();
renderCards();
