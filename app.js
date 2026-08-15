import { createAssetLoader } from "./src/core/assets.js";
import { readSave, writeSave } from "./src/core/storage.js";

const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const hub = document.querySelector("#hub");
const play = document.querySelector("#play");
const grid = document.querySelector("#gameGrid");
const domStage = document.querySelector("#domStage");
const controls = document.querySelector("#controls");
const hint = document.querySelector("#hint");
const status = document.querySelector("#status");
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
const pauseBtn = document.querySelector("#pauseBtn");
const backBtn = document.querySelector("#backBtn");
const surpriseBtn = document.querySelector("#surpriseBtn");

const W = 960;
const H = 640;
let canvasDpr = 1;
const storageKey = "ara-games-v2";
const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
let saveFlushTimer = 0;
let saveDirty = false;
const save = readSave(localStorage, storageKey, "ara-games-v1");
let activeGame = null;
let activeId = null;
let lastCard = null;
let lastTime = 0;
let running = false;
let pagePaused = false;
let gamePaused = false;
let lastStatsText = "";
let pointer = { x: 0, y: 0, down: false, justDown: false, justUp: false };
let particles = [];
const artSources = {
  puppy: "assets/puppy.svg",
  starTreat: "assets/star-treat.svg",
  puddle: "assets/puddle.svg",
  tree: "assets/tree.svg",
  cloud: "assets/cloud.svg",
  gemSheet: "assets/generated/gem-pop-sprites.png",
  petSheet: "assets/generated/pet-rescue-sprites.png",
  spaceSheet: "assets/generated/space-miner-sprites.png",
  golfSheet: "assets/generated/mini-golf-sprites.png",
  rainbowArtSheet: "assets/generated/new-games/rainbow-art-studio.png"
};
const { assets: art, load: loadArt, loadGame: loadGameArt } = createAssetLoader(artSources, {
  "gem-pop": ["gemSheet"],
  "pet-rescue": ["petSheet"],
  "space-miner": ["spaceSheet"],
  "mini-golf": ["golfSheet"],
  "rainbow-art": ["rainbowArtSheet"]
});
["puppy", "starTreat", "puddle", "tree", "cloud"].forEach(loadArt);

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

function configureCanvas() {
  const nextDpr = clamp(window.devicePixelRatio || 1, 1, 2);
  const targetW = Math.round(W * nextDpr);
  const targetH = Math.round(H * nextDpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
    canvas.dataset.dpr = String(nextDpr);
  }
  canvasDpr = nextDpr;
  ctx.setTransform(canvasDpr, 0, 0, canvasDpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.textRendering = "geometricPrecision";
}

function resetCanvasState() {
  ctx.setTransform(canvasDpr, 0, 0, canvasDpr, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

function burst(x, y, colors, count = 18, power = 240) {
  if (reduceMotion) count = Math.ceil(count * 0.35);
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
    ctx.shadowColor = p.color;
    ctx.shadowBlur = p.r * 1.8;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.shadowBlur = 0;
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

function radialGlow(x, y, r, inner, outer = "rgba(255,255,255,0)") {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawAtmosphere(colors, drift = 1) {
  const now = performance.now() * 0.001;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  colors.forEach((color, i) => {
    const x = ((i * 291 + now * 18 * drift) % (W + 260)) - 130;
    const y = 110 + ((i * 137) % 390);
    radialGlow(x, y, 180 + i * 28, color);
  });
  ctx.restore();
}

function drawStarfield(count = 70, speed = 1, warm = "#ffd166") {
  const now = performance.now();
  ctx.save();
  for (let i = 0; i < count; i++) {
    const depth = 0.35 + (i % 7) * 0.12;
    const x = (i * 137 + now * 0.018 * speed * depth) % W;
    const y = (i * 73 + Math.sin(now * 0.0007 + i) * 8) % H;
    const r = i % 9 === 0 ? 2.2 : 1.2 + depth;
    ctx.globalAlpha = 0.35 + depth * 0.35;
    ctx.fillStyle = i % 4 ? "#ffffff" : warm;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSoftHill(x, y, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawSoftPanel(x, y, w, h, r, fill = "rgba(255,255,255,0.18)") {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.28)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 12;
  roundRect(x, y, w, h, r, fill);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, "rgba(255,255,255,0.24)");
  g.addColorStop(0.48, "rgba(255,255,255,0.06)");
  g.addColorStop(1, "rgba(0,0,0,0.1)");
  roundRect(x + 3, y + 3, w - 6, h - 6, Math.max(8, r - 3), g);
  ctx.restore();
}

function drawSpriteWithGlow(sheet, rect, x, y, w, h, glow = "rgba(255,255,255,0.35)", blur = 20) {
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = blur;
  const drew = drawSprite(sheet, rect, x, y, w, h);
  ctx.restore();
  return drew;
}

function flushSave() {
  if (!saveDirty) return;
  try {
    saveDirty = !writeSave(localStorage, storageKey, save);
  } catch { saveDirty = false; }
  renderStars();
}

function saveGame(immediate = false) {
  saveDirty = true;
  renderStars();
  if (immediate) {
    if (saveFlushTimer) window.clearTimeout(saveFlushTimer);
    saveFlushTimer = 0;
    flushSave();
    return;
  }
  if (!saveFlushTimer) {
    saveFlushTimer = window.setTimeout(() => {
      saveFlushTimer = 0;
      flushSave();
    }, 700);
  }
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
  const values = [
    custom?.score ?? (activeGame ? activeGame.score : 0),
    custom?.best ?? (save.best[activeId] || 0),
    custom?.third ?? (activeGame ? Math.max(0, Math.ceil(activeGame.time || 0)) : 0),
    custom?.scoreLabel ?? "score",
    custom?.bestLabel ?? "best",
    custom?.thirdLabel ?? "time"
  ];
  const key = values.join("|");
  if (key === lastStatsText) return;
  lastStatsText = key;
  [statScore, statBest, statTime, statScoreLabel, statBestLabel, statTimeLabel].forEach((node, index) => { node.textContent = values[index]; });
}

function renderStars() {
  totalStars.textContent = Object.values(save.stars).reduce((sum, n) => sum + n, 0);
}

function setHint(message) {
  hint.textContent = message;
  if (status) status.textContent = message;
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
    if (e.pointerId != null && canvas.setPointerCapture) {
      try { canvas.setPointerCapture(e.pointerId); } catch {}
    }
    pointer = { ...pointer, ...p, down: true, justDown: true };
    activeGame?.pointerDown?.(p.x, p.y, e);
  };
  const move = (e) => {
    if (!pointer.down && e.type.startsWith("touch")) return;
    e.preventDefault();
    const p = scaleEvent(e);
    pointer = { ...pointer, ...p };
    activeGame?.pointerMove?.(p.x, p.y, e);
  };
  const up = (e) => {
    e.preventDefault();
    const p = scaleEvent(e);
    pointer = { ...pointer, ...p, down: false, justUp: true };
    activeGame?.pointerUp?.(p.x, p.y, e);
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
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = color;
  for (let x = -size; x < W + size; x += size) {
    for (let y = -size; y < H + size; y += size) {
      const phase = (x + y + performance.now() / 18) % (size * 2);
      if (phase < size) {
        ctx.globalAlpha = 0.32;
        ctx.beginPath();
        ctx.arc(x + size * 0.22, y + size * 0.25, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.2;
        roundRect(x + size * 0.45, y + size * 0.58, size * 0.26, 4, 4, color);
      }
    }
  }
  ctx.restore();
}

function drawTopHud(label, accent = "#fff") {
  drawSoftPanel(28, 24, 904, 58, 22, "rgba(255,255,255,0.18)");
  textCenter(label, W / 2, 53, 28, "#fff");
  ctx.fillStyle = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.roundRect(50, 42, 110, 14, 7);
  ctx.fill();
  ctx.shadowBlur = 0;
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
  if (!running || pagePaused || gamePaused) return;
  const dt = Math.min(0.033, (t - lastTime) / 1000 || 0.016);
  lastTime = t;
  if (activeGame) {
    configureCanvas();
    resetCanvasState();
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
  if (activeGame) saveGame(true);
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
  setHint(def.hint);
  restartBtn.textContent = "Restart";
  loadGameArt(id);
  activeGame = def.create();
  if (location.hostname === "127.0.0.1" || location.hostname === "localhost") window.__araActiveGame = activeGame;
  activeGame.score = 0;
  activeGame.time = activeGame.time ?? 60;
  lastStatsText = "";
  gamePaused = false;
  pauseBtn.textContent = "Pause";
  pauseBtn.setAttribute("aria-pressed", "false");
  def.controls && makeControls(def.controls);
  hub.classList.add("hidden");
  play.classList.remove("hidden");
  play.focus();
  lastTime = performance.now();
  if (!running) {
    running = true;
    requestAnimationFrame(loop);
  }
}

function backToHub() {
  saveGame(true);
  running = false;
  gamePaused = false;
  activeGame?.destroy?.();
  activeGame = null;
  activeId = null;
  play.classList.add("hidden");
  hub.classList.remove("hidden");
  renderCards();
  lastCard?.focus();
}

function togglePause() {
  if (!activeGame || activeGame.done) return;
  gamePaused = !gamePaused;
  pauseBtn.textContent = gamePaused ? "Resume" : "Pause";
  pauseBtn.setAttribute("aria-pressed", String(gamePaused));
  setHint(gamePaused ? "Game paused. Tap Resume when you are ready." : games[activeId].hint);
  if (!gamePaused) {
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }
}

function gameOver(label = "Time!") {
  if (!activeGame || activeGame.done) return;
  activeGame.done = true;
  save.best[activeId] = Math.max(save.best[activeId] || 0, activeGame.score);
  save.stars[activeId] = Math.max(save.stars[activeId] || 0, Math.min(5, Math.floor(activeGame.score / games[activeId].starEvery)));
    saveGame(true);
  const message = label + " Score: " + activeGame.score + ". Tap Restart or pick another game.";
  setHint(message);
}

const palettes = {
  candy: ["#ff6b6b", "#ffd166", "#37d99e", "#54c6eb", "#f083ff"]
};

const gameDefs = [
  { id: "gem-pop", title: "Gem Pop Arcade", kicker: "Tap the matching gems", icon: "💎", thumb: "assets/thumbs/gem-pop.jpg", color: "linear-gradient(145deg, #9b2cff, #ff5f8e 55%, #ffd166)", desc: "Pop color groups before time runs out.", hint: "Tap big groups of matching gems. Bigger groups make bigger points.", starEvery: 120, create: createGemPop },
  { id: "pet-rescue", title: "Pet Rescue Run", kicker: "Jump and collect", icon: "🐶", thumb: "assets/thumbs/pet-rescue.jpg", color: "linear-gradient(145deg, #0f9f7a, #54c6eb 58%, #ffd166)", desc: "Run, jump, grab treats, and rescue pets.", hint: "Use Jump to hop over puddles and collect treats.", starEvery: 80, controls: [{ id: "jump", label: "Jump" }], create: createPetRescue },
  { id: "space-miner", title: "Space Miner", kicker: "Fly and dodge", icon: "🚀", thumb: "assets/thumbs/space-miner.jpg", color: "linear-gradient(145deg, #111642, #3d5cff 52%, #9b5cff)", desc: "Collect crystals while avoiding asteroids.", hint: "Drag anywhere to steer the ship.", starEvery: 100, create: createSpaceMiner },
  { id: "fireline-rescue", title: "Fireline Rescue", kicker: "Spray and survive", icon: "🚒", thumb: "assets/thumbs/fireline-rescue.jpg", color: "linear-gradient(145deg, #24352c, #d9482e 62%, #ffd35e)", desc: "Move, aim, and put out wildfires before they escape.", hint: "Tap the canvas to start. Left side moves, right side aims and sprays. Keyboard: WASD or arrows plus Space.", starEvery: 260, create: createFirelineRescue },
  { id: "mini-golf", title: "Mini Golf Madness", kicker: "Aim and putt", icon: "⛳", thumb: "assets/thumbs/mini-golf.jpg", color: "linear-gradient(145deg, #0f9f6e, #37d99e 52%, #ffd166)", desc: "Bounce around bumpers and sink putts.", hint: "Drag back from the ball, then let go to shoot.", starEvery: 55, create: createMiniGolf },
  { id: "rainbow-art", title: "Rainbow Art Studio", kicker: "Paint and sticker", icon: "🖍️", thumb: "assets/thumbs/rainbow-art.jpg", color: "linear-gradient(145deg, #ff5c8a, #54c6eb 54%, #37d99e)", desc: "Make bright scenes with brushes and stickers.", hint: "Pick a tool, then draw or stamp on the canvas. Finish the prompt for bonus stars.", starEvery: 70, create: createRainbowArtStudio }
];

const games = Object.fromEntries(gameDefs.map((g) => [g.id, g]));

function renderCards() {
  grid.innerHTML = "";
  gameDefs.forEach((game) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "game-card";
    card.style.setProperty("--card-bg", game.color);
    card.setAttribute("aria-label", game.title + ". " + game.desc);
    card.innerHTML = '<span class="preview"><img class="preview-art" src="' + game.thumb + '" alt="" loading="lazy" decoding="async"><span class="icon" aria-hidden="true">' + game.icon + '</span></span><h3>' + game.title + '</h3><p>' + game.desc + '</p><span class="best">Best ' + (save.best[game.id] || 0) + ' · ★ ' + (save.stars[game.id] || 0) + '/5</span>';
    card.addEventListener("click", () => { lastCard = card; startGame(game.id); });
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
  let cursor = { c: 0, r: 0 };
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
    setHint("Level " + level + "! Bigger groups score faster.");
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
    keyDown(key) {
      if (this.done) return;
      if (key === "arrowleft") cursor.c = clamp(cursor.c - 1, 0, cols - 1);
      else if (key === "arrowright") cursor.c = clamp(cursor.c + 1, 0, cols - 1);
      else if (key === "arrowup") cursor.r = clamp(cursor.r - 1, 0, rows - 1);
      else if (key === "arrowdown") cursor.r = clamp(cursor.r + 1, 0, rows - 1);
      else if (key === "enter" || key === " ") this.pointerDown(ox + cursor.c * cell + cell / 2, oy + cursor.r * cell + cell / 2);
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
      drawAtmosphere(["rgba(255,246,109,0.22)", "rgba(84,198,235,0.16)", "rgba(240,131,255,0.18)"], 0.65);
      stagePattern("rgba(255,255,255,0.16)", 86);
      drawTopHud("Level " + level + "  •  " + levelScore + "/" + target + "  •  " + moves + " moves", "#fff66d");
      drawSoftPanel(172, 96, 616, 508, 36, "rgba(255,255,255,0.16)");
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = ox + c * cell + 8, y = oy + r * cell + 8;
        const gemX = x + (cell - 16) / 2;
        const gemY = y + (cell - 16) / 2;
        ctx.shadowColor = "rgba(0,0,0,0.25)";
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 6;
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.beginPath(); ctx.roundRect(x - 3, y + 4, cell - 10, cell - 10, 18); ctx.fill();
        if (!drawSpriteWithGlow("gemSheet", sprites.gems[board[r][c]], gemX, gemY, cell - 10, cell - 12, colors[board[r][c]], 18)) {
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
      ctx.strokeStyle = "#fff66d";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.roundRect(ox + cursor.c * cell + 5, oy + cursor.r * cell + 5, cell - 10, cell - 10, 18);
      ctx.stroke();
      pops.forEach((p) => {
        ctx.globalAlpha = clamp(p.t / 0.25, 0, 1);
        radialGlow(p.x, p.y, 62, "rgba(255,255,255,0.28)");
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
    keyDown(key) { if (key === " " || key === "arrowup" || key === "w") this.control("jump", true); },
    keyUp(key) { if (key === " " || key === "arrowup" || key === "w") this.control("jump", false); },
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
        setHint(health > 0 ? "Splash! " + health + " hearts left." : "Too many splashes!");
        if (health <= 0) gameOver("Rescue run over!");
      }
    },
    draw() {
      gradientStage("#6ee7ff", "#9cf67f", "#ffd166");
      drawAtmosphere(["rgba(255,255,255,0.22)", "rgba(255,209,102,0.18)", "rgba(84,198,235,0.12)"], 0.9);
      stagePattern("rgba(255,255,255,0.12)", 96);
      drawTopHud("Hearts " + "♥".repeat(Math.max(0, health)) + "  •  jumps " + jumps, "#37d99e");
      radialGlow(820, 112, 96, "rgba(255,255,255,0.46)", "rgba(255,255,255,0)");
      drawSoftHill(230, 500, 310, 105, "rgba(40,150,95,0.22)");
      drawSoftHill(720, 500, 340, 120, "rgba(40,150,95,0.24)");
      for (let i = 0; i < 7; i++) {
        const x = (i * 165 - (performance.now() / 24) % 165) + 10;
        if (!drawSpriteWithGlow("petSheet", sprites.pet.tree, x + 12, 462, 96, 120, "rgba(72,190,110,0.2)", 12) && !drawAsset("tree", x + 12, 462, 86, 112)) {
          glossyRect(x, 470, 22, 70, 8, "#a65f3a", false);
          ctx.fillStyle = "#1fbf78";
          ctx.beginPath(); ctx.arc(x + 10, 450, 34, 0, Math.PI * 2); ctx.fill();
        }
      }
      for (let i = 0; i < 6; i++) roundRect(i * 190 - ((performance.now() / 18) % 190), 400 + (i % 2) * 34, 130, 24, 12, "rgba(255,255,255,0.22)");
      const grass = ctx.createLinearGradient(0, 516, 0, H);
      grass.addColorStop(0, "#37d99e");
      grass.addColorStop(0.5, "#22b978");
      grass.addColorStop(1, "#167a51");
      roundRect(0, 516, W, 124, 0, grass);
      roundRect(0, 538, W, 18, 0, "rgba(255,255,255,0.24)");
      for (let i = 0; i < 24; i++) {
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        const gx = (i * 43 - performance.now() / 45) % W;
        ctx.moveTo(gx, 584);
        ctx.lineTo(gx + 15, 548);
        ctx.stroke();
      }
      for (let i = 0; i < 8; i++) {
        const cx = (i * 170 + (performance.now() / 30) % 170) - 60;
        const cy = 90 + (i % 3) * 38;
        if (!drawSpriteWithGlow("petSheet", sprites.pet.cloud, cx, cy, 126, 70, "rgba(255,255,255,0.2)", 14) && !drawAsset("cloud", cx, cy, 112, 62)) {
          ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2); ctx.fill();
        }
      }
      treats.forEach((t) => { if (!drawSpriteWithGlow("petSheet", sprites.pet.star, t.x, t.y, 50, 46, "#ffd166", 18) && !drawAsset("starTreat", t.x, t.y, 46, 46)) textCenter("★", t.x, t.y, 34, "#ffd166"); });
      obstacles.forEach((o) => { if (!drawSpriteWithGlow("petSheet", sprites.pet.puddle, o.x + o.w / 2, o.y + o.h / 2, 94, 54, "rgba(84,198,235,0.35)", 12) && !drawAsset("puddle", o.x + o.w / 2, o.y + o.h / 2, 86, 54)) { glossyRect(o.x, o.y, o.w, o.h, 18, "#4f79b8"); ctx.fillStyle = "#8bd3ff"; ctx.fillRect(o.x + 10, o.y + 8, o.w - 20, 8); } });
      ctx.globalAlpha = hurtFlash > 0 ? 0.58 + Math.sin(performance.now() / 45) * 0.25 : 1;
      const squash = player.grounded ? 1 : 0.96;
      ctx.save();
      ctx.translate(player.x, player.y - 7);
      ctx.scale(1 / squash, squash);
      if (!drawSpriteWithGlow("petSheet", sprites.pet.puppy, 0, 0, 104, 88, "rgba(255,255,255,0.25)", 12) && !drawAsset("puppy", 0, 3, 90, 90)) textCenter("🐶", 0, 7, 70, "#fff");
      ctx.restore();
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
    keyDown(key) {
      const step = 90;
      if (key === "arrowleft" || key === "a") target.x -= step;
      if (key === "arrowright" || key === "d") target.x += step;
      if (key === "arrowup" || key === "w") target.y -= step;
      if (key === "arrowdown" || key === "s") target.y += step;
      target.x = clamp(target.x, 55, W - 55);
      target.y = clamp(target.y, 70, H - 55);
    },
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
        setHint(health > 0 ? "Hit! " + health + " shields left." : "Ship broke!");
        if (health <= 0) gameOver("Ship broke!");
      }
      crystals = crystals.filter((c) => c.x > -80 && !c.got); rocks = rocks.filter((r) => r.x > -100 && !r.hit);
    },
    draw() {
      gradientStage("#111642", "#2035a6", "#9b5cff");
      drawAtmosphere(["rgba(84,198,235,0.14)", "rgba(240,131,255,0.18)", "rgba(55,217,158,0.1)"], 0.45);
      drawStarfield(92, 1.15, "#ffd166");
      drawTopHud("Shields " + "♥".repeat(Math.max(0, health)) + "  •  difficulty " + Math.floor(1 + elapsed / 20), "#8bd3ff");
      if (!drawSpriteWithGlow("spaceSheet", sprites.space.planet, 755, 145, 210, 130, "rgba(255,209,102,0.22)", 24)) {
        ctx.fillStyle = "rgba(255,209,102,0.3)";
        ctx.beginPath(); ctx.arc(755, 145, 72, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.26)";
        ctx.lineWidth = 8;
        ctx.beginPath(); ctx.ellipse(755, 145, 112, 26, -0.28, 0, Math.PI * 2); ctx.stroke();
      }
      radialGlow(130, 535, 140, "rgba(55,217,158,0.2)", "rgba(55,217,158,0)");
      crystals.forEach((c, i) => {
        if (!drawSpriteWithGlow("spaceSheet", sprites.space.crystals[i % sprites.space.crystals.length], c.x, c.y, 48, 56, "#37d99e", 24)) textCenter("◆", c.x, c.y, 46, "#37d99e");
      });
      rocks.forEach((r, i) => { if (r.x < W - r.r * 1.15 && !drawSpriteWithGlow("spaceSheet", sprites.space.asteroids[i % sprites.space.asteroids.length], r.x, r.y, r.r * 2.15, r.r * 1.45, "rgba(255,255,255,0.12)", 10)) drawAsteroid(r.x, r.y, r.r); });
      ctx.globalAlpha = invulnerable > 0 ? 0.55 + Math.sin(performance.now() / 55) * 0.28 : 1;
      radialGlow(ship.x - 36, ship.y, 84, "rgba(255,209,102,0.22)", "rgba(255,209,102,0)");
      if (drawSpriteWithGlow("spaceSheet", sprites.space.trail, ship.x - 56, ship.y + 2, 92, 44, "rgba(84,198,235,0.45)", 20)) ctx.globalAlpha = invulnerable > 0 ? 0.72 : 1;
      if (!drawSpriteWithGlow("spaceSheet", sprites.space.rocket, ship.x, ship.y, 104, 58, "rgba(255,255,255,0.28)", 16)) textCenter("🚀", ship.x, ship.y, 70);
      ctx.globalAlpha = 1;
      drawParticles();
      if (this.done) drawEndOverlay("Flight over", "Final score " + this.score);
    }
  };
}

function createFirelineRescue() {
  const FW = 1366;
  const FH = 1024;
  const fireScale = Math.min(W / FW, H / FH);
  const fireOffsetX = (W - FW * fireScale) / 2;
  const fireOffsetY = (H - FH * fireScale) / 2;
  const input = {
    movePointer: null,
    aimPointer: null,
    moveStart: { x: 0, y: 0 },
    moveNow: { x: 0, y: 0 },
    aim: { x: FW * 0.74, y: FH * 0.5 },
    spraying: false,
    keys: new Set()
  };

  let firefighter;
  let fires;
  let terrain;
  let waterDrops;
  let steamPuffs;
  let water;
  let state;
  let spawnTimer = 0;
  let elapsedTime = 0;
  let firesPutOut = 0;
  let combo = 1;
  let comboTimer = 0;
  let bonusText = "Ready";
  let bonusTimer = 0;
  let waterEmitAccumulator = 0;
  let survivalScoreAccumulator = 0;
  let messageTitle = "Fireline Rescue";
  let messageBody = "Move with your left thumb. Aim and spray with your right thumb. Keep putting out fires for the highest score.";
  let messageButton = "Tap to start";

  const game = {
    stats() {
      return {
        score: this.score,
        best: save.best[activeId] || 0,
        third: Math.max(0, Math.round(water)),
        thirdLabel: "water"
      };
    },
    pointerDown(x, y, event) {
      const point = toFirePoint(x, y);
      const id = pointerId(event);
      if (state !== "playing") {
        resetRound();
        startRound();
        return;
      }

      if (point.x < FW * 0.43 && input.movePointer === null) {
        input.movePointer = id;
        input.moveStart = point;
        input.moveNow = point;
      } else {
        input.aimPointer = id;
        input.aim = point;
        input.spraying = true;
      }
    },
    pointerMove(x, y, event) {
      if (state !== "playing") return;
      const point = toFirePoint(x, y);
      const id = pointerId(event);

      if (id === input.movePointer) input.moveNow = point;
      if (id === input.aimPointer) input.aim = point;
      if (input.aimPointer === null && id !== input.movePointer) input.aim = point;
    },
    pointerUp(_x, _y, event) {
      const id = pointerId(event);
      if (id === input.movePointer) input.movePointer = null;
      if (id === input.aimPointer) {
        input.aimPointer = null;
        input.spraying = false;
      }
    },
    update(dt) {
      updateFireline(dt);
    },
    draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.translate(fireOffsetX, fireOffsetY);
      ctx.scale(fireScale, fireScale);
      drawFireline();
      ctx.restore();
    },
    destroy() {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mouseup", onMouseUp);
    },
    debugState() {
      return {
        state,
        water: Math.round(water),
        fires: fires.filter((fire) => fire.health > 0).length,
        firefighter: { x: Math.round(firefighter.x), y: Math.round(firefighter.y) }
      };
    }
  };

  function resetRound() {
    firefighter = {
      x: 170,
      y: FH * 0.58,
      radius: 34,
      angle: -0.2,
      speed: 350
    };
    terrain = makeTerrain();
    fires = makeStartingFires();
    waterDrops = [];
    steamPuffs = [];
    water = 100;
    state = "ready";
    spawnTimer = 0;
    elapsedTime = 0;
    firesPutOut = 0;
    combo = 1;
    comboTimer = 0;
    bonusText = "Ready";
    bonusTimer = 0;
    waterEmitAccumulator = 0;
    survivalScoreAccumulator = 0;
    input.movePointer = null;
    input.aimPointer = null;
    input.spraying = false;
    input.aim = { x: 720, y: 430 };
    input.keys.clear();
    game.score = 0;
    game.done = false;
    messageTitle = "Fireline Rescue";
    messageBody = "Move with your left thumb. Aim and spray with your right thumb. Keep putting out fires for the highest score.";
    messageButton = "Tap to start";
  }

  function startRound() {
    state = "playing";
    setHint("Left side moves. Right side aims and sprays. Try short sprays to save water.");
  }

  function toFirePoint(x, y) {
    return {
      x: clamp((x - fireOffsetX) / fireScale, 0, FW),
      y: clamp((y - fireOffsetY) / fireScale, 0, FH)
    };
  }

  function pointerId(event) {
    return event?.pointerId ?? 1;
  }

  function makeFire(x, y, size, difficulty, forcedType) {
    const roll = Math.random();
    let type = forcedType || "standard";
    if (!forcedType) {
      if (difficulty > 1.3 && roll < 0.24) type = "runner";
      else if (difficulty > 1.8 && roll < 0.48) type = "inferno";
      else if (difficulty > 2.5 && roll < 0.62) type = "ember";
    }

    const typeStats = {
      standard: { health: 1, speed: 1, score: 1, color: "#ff4f24", inner: "#fff26a", label: "" },
      runner: { health: 0.72, speed: 1.55, score: 1.25, color: "#ff7b2d", inner: "#ffe86a", label: "Fast" },
      inferno: { health: 1.58, speed: 0.74, score: 1.65, color: "#d93725", inner: "#ffcc3d", label: "Heavy" },
      ember: { health: 0.5, speed: 1.1, score: 0.9, color: "#ffb02e", inner: "#fff7a0", label: "Ember" }
    }[type];
    const speedBoost = Math.min(44, difficulty * 4.2);
    const healthBoost = Math.min(60, difficulty * 5.5);
    return {
      x,
      y,
      size,
      type,
      typeStats,
      health: (100 + healthBoost) * size * typeStats.health,
      maxHealth: (100 + healthBoost) * size * typeStats.health,
      speed: (23 + speedBoost + Math.random() * (14 + difficulty * 0.8)) * typeStats.speed,
      bob: Math.random() * Math.PI * 2,
      hot: 0
    };
  }

  function currentDifficulty() {
    return 1 + elapsedTime / 18 + firesPutOut / 5;
  }

  function makeStartingFires() {
    const types = shuffled(["standard", "runner", "inferno"]);
    const firesToPlace = [];
    const lanes = shuffled([260, 410, 570, 720]);
    for (let i = 0; i < 3; i += 1) {
      const size = rand(0.88, 1.14);
      firesToPlace.push(makeFire(rand(540 + i * 120, 660 + i * 145), lanes[i], size, 1, types[i]));
    }
    return firesToPlace;
  }

  function makeTerrain() {
    const blocks = [];
    const targetCount = 5;
    const playerClearance = { x: 86, y: 496, w: 235, h: 250 };
    const exitClearance = { x: FW - 165, y: 80, w: 150, h: FH - 160 };

    for (let attempts = 0; blocks.length < targetCount && attempts < 100; attempts += 1) {
      const type = Math.random() < 0.56 ? "log" : "rubble";
      const block = type === "log"
        ? { x: rand(275, 1090), y: rand(175, FH - 250), w: rand(92, 142), h: 34, type }
        : { x: rand(420, 1010), y: rand(180, FH - 280), w: rand(76, 108), h: rand(62, 88), type };

      if (rectsOverlap(block, playerClearance, 28)) continue;
      if (rectsOverlap(block, exitClearance, 12)) continue;
      if (blocks.some((existing) => rectsOverlap(block, existing, 46))) continue;
      blocks.push(block);
    }
    return blocks;
  }

  function updateFireline(dt) {
    if (state !== "playing") return;

    elapsedTime += dt;
    comboTimer = Math.max(0, comboTimer - dt);
    bonusTimer = Math.max(0, bonusTimer - dt);
    if (comboTimer === 0) combo = 1;
    if (bonusTimer === 0) bonusText = input.spraying ? "Spraying" : "Hold line";
    survivalScoreAccumulator += dt * (4 + currentDifficulty());
    const survivalPoints = Math.floor(survivalScoreAccumulator);
    if (survivalPoints > 0) {
      survivalScoreAccumulator -= survivalPoints;
      award(survivalPoints, "", false);
    }
    moveFirefighter(dt);
    firefighter.angle = Math.atan2(input.aim.y - firefighter.y, input.aim.x - firefighter.x);

    if (input.spraying && water > 0) {
      water = Math.max(0, water - 7.8 * dt);
      emitWater(dt);
    }

    for (const drop of waterDrops) {
      drop.x += drop.vx * dt;
      drop.y += drop.vy * dt;
      drop.life -= dt;
      drop.radius *= 0.997;
      if (terrain.some((block) => circleRectHit(drop.x, drop.y, drop.radius, block))) {
        drop.life = 0;
        steamPuffs.push({ x: drop.x, y: drop.y, radius: 8 + Math.random() * 8, life: 0.22, speed: 25 });
      }
    }

    for (const fire of fires) {
      if (fire.health <= 0) continue;
      fire.x += fire.speed * dt;
      fire.y += Math.sin(performance.now() * 0.002 + fire.bob) * 10 * dt;
      fire.hot = Math.max(0, fire.hot - dt * 2);
      if (circleCircleHit(fire.x, fire.y, 44 * fire.size, firefighter.x, firefighter.y, firefighter.radius)) {
        loseGame("Too close", "A fire reached you. Keep distance and use the terrain to control your angle.");
        return;
      }
      if (fire.x + fire.size * 44 > FW - 88) {
        loseGame("Fire escaped", "A fire reached the red exit. Keep moving and spray sooner next time.");
        return;
      }
    }

    handleWaterHits(dt);
    waterDrops = waterDrops.filter((drop) => drop.life > 0 && drop.x < FW + 40 && drop.x > -40 && drop.y > -40 && drop.y < FH + 40);
    steamPuffs.forEach((puff) => {
      puff.y -= puff.speed * dt;
      puff.life -= dt;
      puff.radius += 20 * dt;
    });
    steamPuffs = steamPuffs.filter((puff) => puff.life > 0);

    fires = fires.filter((fire) => fire.health > 0);
    spawnTimer += dt;
    const difficulty = currentDifficulty();
    const maxFires = Math.min(8, 3 + Math.floor(difficulty / 1.7));
    const spawnDelay = Math.max(0.85, 3.35 - difficulty * 0.24);
    if (fires.length < maxFires && spawnTimer > spawnDelay) {
      spawnTimer = 0;
      fires.push(spawnFire(difficulty));
    }

    if (water <= 0 && waterDrops.length === 0 && fires.length > 0) {
      loseGame("Out of water", "Try short sprays. The tank ran dry before the fires were out.");
    }
  }

  function award(points, label, useCombo = true) {
    if (points <= 0) return;
    const earned = useCombo ? Math.round(points * combo) : points;
    addScore(earned);
    if (label) {
      bonusText = "+" + earned + " " + label;
      bonusTimer = 1.15;
    }
  }

  function bumpCombo(label) {
    combo = Math.min(5, combo + 1);
    comboTimer = 3.2;
    bonusText = label;
    bonusTimer = 1.4;
  }

  function spawnFire(difficulty) {
    const size = 0.82 + Math.random() * Math.min(0.58, 0.25 + difficulty * 0.045);
    const startX = 430 - Math.random() * Math.min(190, difficulty * 18);
    const y = 170 + Math.random() * (FH - 310);
    return makeFire(startX, y, size, difficulty);
  }

  function moveFirefighter(dt) {
    let dx = 0;
    let dy = 0;

    if (input.movePointer !== null) {
      dx = input.moveNow.x - input.moveStart.x;
      dy = input.moveNow.y - input.moveStart.y;
      const length = Math.hypot(dx, dy);
      if (length > 1) {
        const limit = Math.min(1, length / 92);
        dx = (dx / length) * limit;
        dy = (dy / length) * limit;
      }
    }

    if (input.keys.has("arrowleft") || input.keys.has("a")) dx -= 1;
    if (input.keys.has("arrowright") || input.keys.has("d")) dx += 1;
    if (input.keys.has("arrowup") || input.keys.has("w")) dy -= 1;
    if (input.keys.has("arrowdown") || input.keys.has("s")) dy += 1;

    const length = Math.hypot(dx, dy);
    if (length > 1) {
      dx /= length;
      dy /= length;
    }

    const nextX = clamp(firefighter.x + dx * firefighter.speed * dt, 78, FW * 0.58);
    const nextY = clamp(firefighter.y + dy * firefighter.speed * dt, 170, FH - 112);
    moveFirefighterTo(nextX, nextY);
  }

  function moveFirefighterTo(nextX, nextY) {
    const oldX = firefighter.x;
    const oldY = firefighter.y;

    firefighter.x = nextX;
    firefighter.y = nextY;
    if (!terrain.some((block) => circleRectHit(firefighter.x, firefighter.y, firefighter.radius, block))) return;

    firefighter.x = nextX;
    firefighter.y = oldY;
    if (!terrain.some((block) => circleRectHit(firefighter.x, firefighter.y, firefighter.radius, block))) return;

    firefighter.x = oldX;
    firefighter.y = nextY;
    if (!terrain.some((block) => circleRectHit(firefighter.x, firefighter.y, firefighter.radius, block))) return;

    firefighter.x = oldX;
    firefighter.y = oldY;
  }

  function emitWater(dt) {
    const nozzle = hoseNozzle();
    waterEmitAccumulator += 32 * dt;
    const count = Math.floor(waterEmitAccumulator);
    waterEmitAccumulator -= count;
    for (let i = 0; i < count; i += 1) {
      const spread = (Math.random() - 0.5) * 0.24;
      const speed = 760 + Math.random() * 120;
      const angle = firefighter.angle + spread;
      waterDrops.push({
        x: nozzle.x + Math.cos(angle) * 8,
        y: nozzle.y + Math.sin(angle) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 18,
        radius: 7 + Math.random() * 5,
        life: 0.74 + Math.random() * 0.25
      });
    }
  }

  function handleWaterHits() {
    for (const fire of fires) {
      if (fire.health <= 0) continue;
      const hitRadius = 54 * fire.size;
      for (const drop of waterDrops) {
        if (drop.life <= 0) continue;
        const distance = Math.hypot(drop.x - fire.x, drop.y - fire.y);
        if (distance < hitRadius + drop.radius) {
          drop.life = 0;
          fire.health -= 5.6;
          fire.hot = 1;
          award(Math.round(3 * fire.typeStats.score), "hit");
          steamPuffs.push({
            x: fire.x + (Math.random() - 0.5) * 38,
            y: fire.y - 22,
            radius: 14 + Math.random() * 14,
            life: 0.42 + Math.random() * 0.22,
            speed: 50 + Math.random() * 30
          });
          if (fire.health <= 0) {
            firesPutOut += 1;
            const waterBonus = water > 45 ? 70 : water > 25 ? 35 : 0;
            const typeBonus = Math.round((120 * fire.size + water * 0.8) * fire.typeStats.score);
            award(typeBonus, (fire.typeStats.label || "Fire") + " out");
            if (waterBonus > 0) award(waterBonus, "water save");
            bumpCombo("combo");
            water = Math.min(100, water + 7 + Math.max(0, 10 - currentDifficulty()));
            for (let i = 0; i < 12; i += 1) {
              steamPuffs.push({
                x: fire.x + (Math.random() - 0.5) * 70,
                y: fire.y + (Math.random() - 0.5) * 46,
                radius: 20 + Math.random() * 24,
                life: 0.7 + Math.random() * 0.35,
                speed: 70 + Math.random() * 45
              });
            }
          }
        }
      }
    }
  }

  function loseGame(title, body) {
    state = "lost";
    input.spraying = false;
    messageTitle = title;
    messageBody = "Final score: " + game.score + ". " + body;
    messageButton = "Tap Restart";
    gameOver(title);
  }

  function drawFireline() {
    drawFirelineBackground();
    drawFirelineTerrain();
    drawExit();
    drawWater();
    drawFires();
    drawFirefighter();
    drawSteam();
    drawJoystick();
    drawHud();
    if (state !== "playing") drawMessage();
  }

  function drawFirelineBackground() {
    ctx.clearRect(0, 0, FW, FH);
    const gradient = ctx.createLinearGradient(0, 0, FW, FH);
    gradient.addColorStop(0, "#6f8b55");
    gradient.addColorStop(0.5, "#465b3f");
    gradient.addColorStop(1, "#3d302a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FW, FH);

    ctx.globalCompositeOperation = "screen";
    const haze = ctx.createRadialGradient(320, 130, 40, 320, 130, 540);
    haze.addColorStop(0, "rgba(255,220,135,0.24)");
    haze.addColorStop(1, "rgba(255,220,135,0)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, FW, FH);
    ctx.globalCompositeOperation = "source-over";

    ctx.fillStyle = "#243029";
    ctx.fillRect(0, FH - 126, FW, 126);
    ctx.fillStyle = "rgba(255,255,255,0.09)";
    for (let x = -80; x < FW + 100; x += 160) {
      ctx.beginPath();
      ctx.roundRect(x, FH - 74, 88, 8, 4);
      ctx.fill();
    }

    for (let y = 150; y < FH - 160; y += 140) {
      ctx.fillStyle = "rgba(95,85,66,0.72)";
      ctx.beginPath();
      ctx.roundRect(1040, y + 42, 72, 20, 8);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(1052, y + 48, 42, 4);
    }
    for (let i = 0; i < 22; i += 1) {
      const x = (i * 73 + performance.now() * 0.012) % FW;
      const y = 120 + (i * 97) % 720;
      ctx.fillStyle = "rgba(255,185,92,0.08)";
      ctx.beginPath();
      ctx.arc(x, y, 3 + (i % 4), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawFirelineTerrain() {
    for (const block of terrain) {
      ctx.save();
      ctx.translate(block.x, block.y);
      ctx.shadowColor = "rgba(0,0,0,0.26)";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 8;
      if (block.type === "log") {
        const log = ctx.createLinearGradient(0, 0, 0, block.h);
        log.addColorStop(0, "#9c7046");
        log.addColorStop(1, "#4e3526");
        ctx.fillStyle = log;
        ctx.beginPath();
        ctx.roundRect(0, 0, block.w, block.h, 12);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#8a6745";
        ctx.fillRect(10, 7, block.w - 20, 5);
        ctx.fillStyle = "#3d2d23";
        ctx.beginPath();
        ctx.arc(14, block.h * 0.5, 10, 0, Math.PI * 2);
        ctx.arc(block.w - 14, block.h * 0.5, 10, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const rock = ctx.createLinearGradient(0, 0, block.w, block.h);
        rock.addColorStop(0, "#8b9084");
        rock.addColorStop(1, "#4b4f48");
        ctx.fillStyle = rock;
        ctx.beginPath();
        ctx.roundRect(0, 0, block.w, block.h, 10);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#80877d";
        ctx.fillRect(12, 12, block.w * 0.38, 12);
        ctx.fillRect(block.w * 0.52, block.h * 0.48, block.w * 0.32, 12);
        ctx.fillStyle = "rgba(20, 18, 15, 0.28)";
        ctx.fillRect(0, block.h - 10, block.w, 10);
      }
      ctx.restore();
    }
  }

  function drawExit() {
    ctx.fillStyle = "rgba(198, 48, 48, 0.25)";
    ctx.fillRect(FW - 88, 0, 88, FH);
    ctx.fillStyle = "#ff5f52";
    ctx.fillRect(FW - 88, 0, 12, FH);
    ctx.save();
    ctx.translate(FW - 38, FH * 0.5);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = "#ffe1dc";
    ctx.font = "800 34px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("EXIT", 0, 12);
    ctx.restore();
  }

  function drawFirefighter() {
    const { x, y, angle } = firefighter;
    const nozzle = hoseNozzle();

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(x, y + 64, 48, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineCap = "round";
    ctx.lineWidth = 18;
    ctx.strokeStyle = "#303a35";
    ctx.beginPath();
    ctx.moveTo(x, y + 9);
    ctx.lineTo(nozzle.x, nozzle.y);
    ctx.stroke();

    ctx.lineWidth = 9;
    ctx.strokeStyle = "#e7d9a2";
    ctx.beginPath();
    ctx.moveTo(x, y + 9);
    ctx.lineTo(nozzle.x, nozzle.y);
    ctx.stroke();

    ctx.translate(x, y);
    ctx.shadowColor = "rgba(0,0,0,0.28)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = "#24302a";
    ctx.beginPath();
    ctx.roundRect(-30, 20, 60, 45, 12);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = "#f5c84b";
    ctx.beginPath();
    ctx.roundRect(-28, -30, 56, 60, 14);
    ctx.fill();

    ctx.fillStyle = "#2b3431";
    ctx.fillRect(-30, -6, 60, 12);
    ctx.fillStyle = "#fff6c8";
    ctx.fillRect(-6, -29, 12, 58);

    ctx.fillStyle = "#ffd063";
    ctx.beginPath();
    ctx.arc(0, -48, 26, Math.PI, 0);
    ctx.lineTo(30, -45);
    ctx.lineTo(-30, -45);
    ctx.fill();
    ctx.fillStyle = "#b9342e";
    ctx.fillRect(-26, -47, 52, 8);

    ctx.rotate(angle);
    ctx.fillStyle = "#cad9dc";
    ctx.beginPath();
    ctx.roundRect(18, -7, 48, 14, 7);
    ctx.fill();
    ctx.restore();
  }

  function hoseNozzle() {
    return {
      x: firefighter.x + Math.cos(firefighter.angle) * 68,
      y: firefighter.y + Math.sin(firefighter.angle) * 68
    };
  }

  function drawFires() {
    const now = performance.now();
    for (const fire of fires) {
      const pulse = Math.sin(now * 0.011 + fire.bob) * 0.08 + 1;
      const size = fire.size * pulse * (0.48 + fire.health / fire.maxHealth * 0.62);
      ctx.save();
      ctx.translate(fire.x, fire.y);
      ctx.globalCompositeOperation = "screen";
      const heat = ctx.createRadialGradient(0, 0, 0, 0, 12 * fire.size, 92 * fire.size);
      heat.addColorStop(0, "rgba(255,177,45,0.5)");
      heat.addColorStop(1, "rgba(255,79,36,0)");
      ctx.fillStyle = heat;
      ctx.beginPath();
      ctx.arc(0, 8 * fire.size, 92 * fire.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      ctx.fillStyle = "rgba(20, 18, 15, 0.36)";
      ctx.beginPath();
      ctx.ellipse(0, 46 * fire.size, 52 * fire.size, 16 * fire.size, 0, 0, Math.PI * 2);
      ctx.fill();

      drawFlameShape(0, 0, 52 * size, 88 * size, fire.typeStats.color);
      drawFlameShape(-8 * size, 6 * size, 36 * size, 68 * size, fire.type === "inferno" ? "#7b201d" : "#ffaf2c");
      drawFlameShape(7 * size, 17 * size, 22 * size, 43 * size, fire.hot > 0 ? "#c8f8ff" : "#fff26a");

      if (fire.type !== "standard") {
        ctx.fillStyle = fire.typeStats.inner;
        ctx.font = "800 " + Math.round(16 * fire.size) + "px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(fire.typeStats.label, 0, 92 * fire.size);
      }

      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillRect(-38 * fire.size, 66 * fire.size, 76 * fire.size, 8);
      ctx.fillStyle = "#84d0ff";
      ctx.fillRect(-38 * fire.size, 66 * fire.size, 76 * fire.size * clamp(1 - fire.health / fire.maxHealth, 0, 1), 8);
      ctx.restore();
    }
  }

  function drawFlameShape(x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - height * 0.55);
    ctx.bezierCurveTo(x - width * 0.54, y - height * 0.14, x - width * 0.5, y + height * 0.42, x, y + height * 0.5);
    ctx.bezierCurveTo(x + width * 0.54, y + height * 0.23, x + width * 0.42, y - height * 0.18, x, y - height * 0.55);
    ctx.fill();
  }

  function drawWater() {
    ctx.save();
    ctx.lineCap = "round";
    for (const drop of waterDrops) {
      ctx.globalAlpha = clamp(drop.life / 0.8, 0, 1);
      ctx.shadowColor = "#8edaff";
      ctx.shadowBlur = drop.radius * 1.4;
      ctx.strokeStyle = "#8edaff";
      ctx.lineWidth = drop.radius;
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - drop.vx * 0.026, drop.y - drop.vy * 0.026);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function drawSteam() {
    ctx.save();
    for (const puff of steamPuffs) {
      ctx.globalAlpha = clamp(puff.life, 0, 0.45);
      const steam = ctx.createRadialGradient(puff.x, puff.y, 0, puff.x, puff.y, puff.radius);
      steam.addColorStop(0, "#f4ffff");
      steam.addColorStop(1, "rgba(244,255,255,0)");
      ctx.fillStyle = steam;
      ctx.beginPath();
      ctx.arc(puff.x, puff.y, puff.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawJoystick() {
    if (state !== "playing" || input.movePointer === null) return;
    const dx = input.moveNow.x - input.moveStart.x;
    const dy = input.moveNow.y - input.moveStart.y;
    const length = Math.hypot(dx, dy);
    const limit = Math.min(70, length);
    const knobX = input.moveStart.x + (length ? dx / length : 0) * limit;
    const knobY = input.moveStart.y + (length ? dy / length : 0) * limit;

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.32)";
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(input.moveStart.x, input.moveStart.y, 82, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,211,94,0.72)";
    ctx.beginPath();
    ctx.arc(knobX, knobY, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawHud() {
    const activeFires = fires.filter((fire) => fire.health > 0).length;
    ctx.save();
    drawHudBox(18, 18, 190, 126);
    ctx.fillStyle = "#f8fbf2";
    ctx.font = "800 18px system-ui";
    ctx.textAlign = "left";
    ctx.fillText("Fireline Rescue", 32, 46);
    drawHudRow("Score", game.score, 32, 78, 154);
    ctx.fillStyle = combo > 1 ? "#fff4ad" : "#9de8ff";
    ctx.font = "800 13px system-ui";
    ctx.fillText(combo > 1 ? combo + "x " + bonusText : bonusText, 32, 114);

    drawHudBox(FW - 164, 18, 146, 92);
    drawHudRow("Water", Math.max(0, Math.round(water)) + "%", FW - 150, 52, 118);
    drawHudRow("Fires", activeFires, FW - 150, 84, 118);
    ctx.restore();
  }

  function drawHudBox(x, y, w, h) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.28)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.fillStyle = "rgba(18, 25, 22, 0.68)";
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(248, 251, 242, 0.14)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawHudRow(label, value, x, y, valueOffset) {
    ctx.fillStyle = "#d8e6d0";
    ctx.font = "15px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(label, x, y);
    ctx.fillStyle = "#fff4ad";
    ctx.font = "800 20px system-ui";
    ctx.textAlign = "right";
    ctx.fillText(String(value), x + valueOffset, y);
  }

  function drawMessage() {
    ctx.save();
    ctx.fillStyle = "rgba(13, 18, 16, 0.76)";
    ctx.fillRect(0, 0, FW, FH);
    ctx.textAlign = "center";
    ctx.fillStyle = "#f8fbf2";
    ctx.font = "900 66px ui-rounded, system-ui, sans-serif";
    ctx.fillText(messageTitle, FW / 2, 390);
    ctx.fillStyle = "#e7f0df";
    ctx.font = "24px system-ui";
    wrapText(messageBody, FW / 2, 442, 620, 34);
    ctx.beginPath();
    ctx.roundRect(FW / 2 - 86, 540, 172, 54, 8);
    ctx.fillStyle = "#ffd35e";
    ctx.fill();
    ctx.fillStyle = "#1b211d";
    ctx.font = "800 18px system-ui";
    ctx.fillText(messageButton, FW / 2, 574);
    ctx.restore();
  }

  function wrapText(text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    for (const word of words) {
      const testLine = line ? line + " " + word : word;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        ctx.fillText(line, x, y);
        line = word;
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }

  function rectsOverlap(a, b, padding = 0) {
    return a.x - padding < b.x + b.w &&
      a.x + a.w + padding > b.x &&
      a.y - padding < b.y + b.h &&
      a.y + a.h + padding > b.y;
  }

  function circleCircleHit(ax, ay, ar, bx, by, br) {
    return Math.hypot(ax - bx, ay - by) < ar + br;
  }

  function circleRectHit(cx, cy, radius, rect) {
    const nearestX = clamp(cx, rect.x, rect.x + rect.w);
    const nearestY = clamp(cy, rect.y, rect.y + rect.h);
    return Math.hypot(cx - nearestX, cy - nearestY) < radius;
  }

  function shuffled(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function onKeyDown(event) {
    if (event.target instanceof HTMLElement && ["BUTTON", "INPUT", "SELECT"].includes(event.target.tagName)) return;
    const key = event.key.toLowerCase();
    if (!["arrowleft", "arrowright", "arrowup", "arrowdown", "w", "a", "s", "d", " "].includes(key)) return;
    event.preventDefault();
    if (state !== "playing") startRound();
    input.keys.add(key);
    if (event.key === " ") input.spraying = true;
  }

  function onKeyUp(event) {
    if (event.target instanceof HTMLElement && ["BUTTON", "INPUT", "SELECT"].includes(event.target.tagName)) return;
    const key = event.key.toLowerCase();
    input.keys.delete(key);
    if (event.key === " ") input.spraying = false;
  }

  function onMouseUp() {
    if (input.aimPointer === null) input.spraying = false;
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("mouseup", onMouseUp);

  resetRound();
  return game;
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
    keyDown(key) {
      if (key === "enter" || key === " ") {
        const dx = hole.x - ball.x;
        const dy = hole.y - ball.y;
        ball.vx = clamp(dx * 2.5, -720, 720);
        ball.vy = clamp(dy * 2.5, -720, 720);
      }
    },
    update(dt) {
      if (this.time <= 0) gameOver("Round over!");
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      const friction = Math.pow(0.988, dt * 60);
      ball.vx *= friction; ball.vy *= friction;
      if (ball.x < 38 || ball.x > W - 38) ball.vx *= -0.85; if (ball.y < 38 || ball.y > H - 38) ball.vy *= -0.85;
      ball.x = clamp(ball.x, 38, W - 38); ball.y = clamp(ball.y, 38, H - 38);
      bumpers.forEach((b) => { const d = Math.hypot(ball.x - b.x, ball.y - b.y); if (d < ball.r + b.r) { const nx = (ball.x - b.x) / d, ny = (ball.y - b.y) / d; ball.vx = nx * 420; ball.vy = ny * 420; } });
      if (Math.hypot(ball.x - hole.x, ball.y - hole.y) < hole.r && Math.hypot(ball.vx, ball.vy) < 220) { addScore(35); burst(hole.x, hole.y, ["#fff", "#ffd166", "#37d99e"], 24, 300); resetHole(); }
    },
    draw() {
      gradientStage("#87f79d", "#2cb67d", "#2b9fdd");
      drawAtmosphere(["rgba(255,209,102,0.16)", "rgba(255,255,255,0.18)", "rgba(84,198,235,0.12)"], 0.55);
      stagePattern("rgba(255,255,255,0.1)", 98);
      drawTopHud("Drag back, release to putt", "#ffd166");
      drawSoftPanel(26, 92, W - 52, H - 118, 34, "rgba(255,255,255,0.2)");
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(38, 104, W - 76, H - 142, 28);
      ctx.clip();
      for (let i = 0; i < 48; i++) {
        ctx.strokeStyle = i % 2 ? "rgba(255,255,255,0.09)" : "rgba(20,90,60,0.08)";
        ctx.lineWidth = 2;
        const x = i * 28 - 30;
        ctx.beginPath();
        ctx.moveTo(x, 104);
        ctx.bezierCurveTo(x + 50, 230, x - 25, 380, x + 38, 614);
        ctx.stroke();
      }
      ctx.restore();
      for (let i = 0; i < 9; i++) roundRect(80 + i * 95, 70 + (i % 3) * 140, 44, 12, 8, "rgba(255,255,255,0.18)");
      ctx.shadowColor = "rgba(0,0,0,0.4)"; ctx.shadowBlur = 18;
      radialGlow(hole.x, hole.y, 72, "rgba(0,0,0,0.18)", "rgba(0,0,0,0)");
      if (!drawSpriteWithGlow("golfSheet", sprites.golf.cup, hole.x, hole.y - 22, 82, 92, "rgba(255,255,255,0.18)", 14)) { ctx.fillStyle = "#132017"; ctx.beginPath(); ctx.arc(hole.x, hole.y, hole.r, 0, Math.PI * 2); ctx.fill(); }
      ctx.shadowBlur = 0;
      bumpers.forEach((b, i) => {
        if (!drawSpriteWithGlow("golfSheet", sprites.golf.bumpers[i % sprites.golf.bumpers.length], b.x, b.y, b.r * 2.2, b.r * 1.7, "rgba(255,209,102,0.28)", 14)) {
          ctx.shadowColor = "rgba(0,0,0,0.25)"; ctx.shadowBlur = 16; ctx.fillStyle = "#ffd166"; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; textCenter("★", b.x, b.y, 28, "#9a5a00");
        }
      });
      if (aiming) {
        ctx.save();
        ctx.globalAlpha = 0.72;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 5;
        ctx.setLineDash([12, 12]);
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y);
        ctx.lineTo(aim.x, aim.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        if (!drawSpriteWithGlow("golfSheet", sprites.golf.arrow, (ball.x + aim.x) / 2, (ball.y + aim.y) / 2, 92, 68, "rgba(255,255,255,0.28)", 16)) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(ball.x, ball.y); ctx.lineTo(aim.x, aim.y); ctx.stroke(); }
      }
      ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 14; ctx.shadowOffsetY = 8;
      if (!drawSpriteWithGlow("golfSheet", sprites.golf.ball, ball.x, ball.y, 42, 42, "rgba(255,255,255,0.35)", 10)) { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill(); }
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      drawParticles();
      if (this.done) drawEndOverlay("Round over", "Final score " + this.score);
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
  let lastBrushPoint = null;
  const area = { x: 60, y: 150, w: 840, h: 370 };
  function inArea(x, y) { return x > area.x && x < area.x + area.w && y > area.y && y < area.y + area.h; }
  function addMark(x, y) {
    if (!inArea(x, y)) return;
    if (tool === "brush") {
      if (lastBrushPoint && Math.hypot(x - lastBrushPoint.x, y - lastBrushPoint.y) < 10) return;
      marks.push({ type: "dot", x, y, color, r: rand(10, 22) });
      lastBrushPoint = { x, y };
      if (marks.length > 900) marks.splice(0, marks.length - 900);
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
    if (stampCount >= 3 && paintCount >= 8) setHint("Prompt ready. Tap Done when you like it.");
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
          setHint("Saved to the tiny gallery. New scene!");
          marks = [];
          stampCount = 0;
          paintCount = 0;
          scene = (scene + 1) % scenes.length;
          bg = "#fff8d8";
          return;
        }
        tool = topTool.id;
        setHint(topTool.label + " selected.");
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
    pointerUp() { drawing = false; lastBrushPoint = null; },
    keyDown(key) {
      const toolIndex = Number(key) - 1;
      if (toolIndex >= 0 && toolIndex < tools.length) {
        tool = tools[toolIndex].id;
        setHint(tools[toolIndex].label + " selected.");
      } else if (key === "enter") {
        this.pointerDown(64 + 4 * 118 + 51, 109);
      }
    },
    update(dt) {
      bounce = Math.max(0, bounce - dt);
      if (this.time <= 0) gameOver("Studio time!");
    },
    draw() {
      gradientStage("#ff8fcf", "#54c6eb", "#37d99e");
      drawAtmosphere(["rgba(255,246,109,0.2)", "rgba(240,131,255,0.2)", "rgba(55,217,158,0.16)"], 0.7);
      stagePattern("rgba(255,255,255,0.13)", 82);
      drawTopHud("Prompt: add 3 stickers and some color", "#f083ff");
      tools.forEach((t, i) => {
        const x = 64 + i * 118;
        drawSoftPanel(x, 84, 102, 50, 16, tool === t.id ? "rgba(255,246,109,0.88)" : "rgba(255,255,255,0.22)");
        if (!drawSpriteWithGlow("rainbowArtSheet", sprites.rainbowArt[t.sprite], x + 51, 109, 42, 36, "rgba(255,255,255,0.25)", 10)) textCenter(t.icon, x + 51, 109, 25, "#18233f");
      });
      colors.forEach((c, i) => {
        ctx.shadowColor = c;
        ctx.shadowBlur = c === color ? 14 : 0;
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.roundRect(670 + i * 38, 96, 32, 32, 10); ctx.fill();
        if (c === color) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.stroke(); }
        ctx.shadowBlur = 0;
      });
      drawSoftPanel(area.x - 10, area.y - 10, area.w + 20, area.h + 20, 28, "rgba(255,255,255,0.34)");
      roundRect(area.x, area.y, area.w, area.h, 22, bg);
      ctx.save();
      ctx.beginPath(); ctx.rect(area.x, area.y, area.w, area.h); ctx.clip();
      const sceneSprite = scenes[scene] === "castle" ? "castle" : scenes[scene] === "garden" ? "garden" : scenes[scene] === "rocket" ? "rocket" : "sheet";
      if (!drawSprite("rainbowArtSheet", sprites.rainbowArt[sceneSprite], area.x + area.w / 2, area.y + area.h / 2, 210, 120)) {
        textCenter(scenes[scene] === "castle" ? "🏰" : scenes[scene] === "garden" ? "🌷" : scenes[scene] === "rocket" ? "🚀" : scenes[scene] === "ocean" ? "🌊" : "🎉", area.x + area.w / 2, area.y + area.h / 2, 112, "rgba(35,48,77,0.2)");
      }
      marks.forEach((m, i) => {
        if (m.type === "dot") {
          ctx.globalAlpha = 0.92;
          ctx.shadowColor = m.color;
          ctx.shadowBlur = 10;
          ctx.fillStyle = m.color;
          ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        } else if (m.type === "sticker") {
          const lift = bounce > 0 ? Math.sin(performance.now() / 60 + i) * 8 : 0;
          if (!drawSpriteWithGlow("rainbowArtSheet", sprites.rainbowArt[m.sticker.sprite], m.x, m.y + lift, 54, 42, "rgba(255,255,255,0.28)", 12)) textCenter(m.sticker.icon, m.x, m.y + lift, 36);
        } else {
          if (!drawSpriteWithGlow("rainbowArtSheet", sprites.rainbowArt.spark, m.x, m.y, 52, 36, "rgba(255,246,109,0.45)", 18)) textCenter("✨", m.x, m.y, 34);
        }
      });
      ctx.restore();
      drawSoftPanel(60, 548, 840, 52, 18, "rgba(255,255,255,0.22)");
      textCenter("Paint " + paintCount + "  •  Stickers " + stampCount + "  •  Gallery " + doneCount, W / 2, 574, 24);
      drawParticles();
      if (this.done) drawEndOverlay("Gallery saved", "Final score " + this.score);
    }
  };
}

backBtn.addEventListener("click", backToHub);
pauseBtn.addEventListener("click", togglePause);
restartBtn.addEventListener("click", () => activeId && startGame(activeId));
surpriseBtn.addEventListener("click", () => startGame(choice(gameDefs).id));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && activeGame) togglePause();
  if (activeGame && !event.repeat && event.target === canvas) activeGame.keyDown?.(event.key.toLowerCase());
});
document.addEventListener("keyup", (event) => {
  if (event.target === canvas) activeGame?.keyUp?.(event.key.toLowerCase());
});
document.addEventListener("visibilitychange", () => {
  pagePaused = document.hidden;
  if (!pagePaused && running) {
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }
});
window.addEventListener("pagehide", () => saveGame(true));
bindCanvas();
configureCanvas();
renderCards();
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
  navigator.serviceWorker.register("service-worker.js").catch(() => {});
}
