// ============================================================================
// STARFALL SALVAGE — 2D Arcade Canvas Game
// ============================================================================

// ----------------------------------------------------------------------------
// 1. CONSTANTS & CONFIGURATION
// ----------------------------------------------------------------------------

const LOGICAL_WIDTH = 960;
const LOGICAL_HEIGHT = 600;
const STORAGE_KEY = "starfall-salvage-best";

const SHARDS_FOR_GATE = 100;
const SHARDS_PER_WAVE = 25;
const MAX_SHARDS_ON_SCREEN = 6;

const PLAYER_RADIUS = 16;
const PLAYER_MAX_SPEED = 340;
const PLAYER_ACCEL = 780;
const PLAYER_DRAG = 2.6;
const PLAYER_MARGIN = 22;
const PLAYER_MAX_HEARTS = 3;
const INVULN_DURATION = 1.5;

const GATE_TRIGGER_RADIUS = 46;
const ASTEROID_SAFE_SPAWN_DIST = 200;

const COLORS = {
  bgTop: "#060b1a",
  bgBottom: "#020308",
  hudBg: "rgba(6, 10, 24, 0.72)",
  hudBorder: "rgba(120, 170, 255, 0.2)",
  textPrimary: "#f2f6ff",
  textSecondary: "#9fb3d9",
  emberCore: "#fff4cc",
  emberMid: "#ff8c24",
  emberGlow: "#ff5500",
  sailGlow: "#66e0ff",
  hullFill: "#d9e6ff",
  hullStroke: "#6da4ff",
  gateOuter: "#5ce1e6",
  gateInner: "#b983ff",
  heartFull: "#ff4d6d",
  heartEmpty: "rgba(255, 77, 109, 0.22)"
};

// ----------------------------------------------------------------------------
// 2. CANVAS & RESPONSIVE SCALING
// ----------------------------------------------------------------------------

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let dpr = Math.min(window.devicePixelRatio || 1, 2);
let canvasScale = 1;

function setupCanvas() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const aspect = LOGICAL_WIDTH / LOGICAL_HEIGHT;

  let displayW = winW;
  let displayH = winW / aspect;

  if (displayH > winH) {
    displayH = winH;
    displayW = winH * aspect;
  }

  displayW = Math.floor(displayW);
  displayH = Math.floor(displayH);

  canvas.style.width = `${displayW}px`;
  canvas.style.height = `${displayH}px`;
  canvas.style.display = "block";
  canvas.style.margin = "auto";

  canvas.width = Math.floor(LOGICAL_WIDTH * dpr);
  canvas.height = Math.floor(LOGICAL_HEIGHT * dpr);
  canvasScale = displayW / LOGICAL_WIDTH;
}

window.addEventListener("resize", setupCanvas);
setupCanvas();

// ----------------------------------------------------------------------------
// 3. WEBAUDIO SOUND ENGINE
// ----------------------------------------------------------------------------

const audio = {
  ctx: null,
  muted: false
};

function ensureAudioContext() {
  if (!audio.ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      try {
        audio.ctx = new AudioCtx();
      } catch (e) {
        audio.ctx = null;
      }
    }
  }
  if (audio.ctx && audio.ctx.state === "suspended") {
    audio.ctx.resume().catch(() => {});
  }
}

function toggleMute() {
  audio.muted = !audio.muted;
}

function playBlip() {
  if (audio.muted) return;
  ensureAudioContext();
  if (!audio.ctx) return;

  const now = audio.ctx.currentTime;
  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(520, now);
  osc.frequency.exponentialRampToValueAtTime(1080, now + 0.09);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.14, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

  osc.connect(gain);
  gain.connect(audio.ctx.destination);

  osc.start(now);
  osc.stop(now + 0.12);
}

function playThud() {
  if (audio.muted) return;
  ensureAudioContext();
  if (!audio.ctx) return;

  const now = audio.ctx.currentTime;

  // Low sawtooth drop
  const osc = audio.ctx.createOscillator();
  const oscGain = audio.ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(38, now + 0.24);

  oscGain.gain.setValueAtTime(0.22, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

  osc.connect(oscGain);
  oscGain.connect(audio.ctx.destination);
  osc.start(now);
  osc.stop(now + 0.27);

  // Short filtered noise burst
  const bufferSize = Math.floor(audio.ctx.sampleRate * 0.16);
  const buffer = audio.ctx.createBuffer(1, bufferSize, audio.ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const noise = audio.ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = audio.ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(480, now);

  const noiseGain = audio.ctx.createGain();
  noiseGain.gain.setValueAtTime(0.18, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(audio.ctx.destination);
  noise.start(now);
}

function playChime() {
  if (audio.muted) return;
  ensureAudioContext();
  if (!audio.ctx) return;

  const now = audio.ctx.currentTime;
  const notes = [523.25, 783.99]; // C5 -> G5

  notes.forEach((freq, idx) => {
    const start = now + idx * 0.11;
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);

    osc.connect(gain);
    gain.connect(audio.ctx.destination);
    osc.start(start);
    osc.stop(start + 0.3);
  });
}

function playShimmer() {
  if (audio.muted) return;
  ensureAudioContext();
  if (!audio.ctx) return;

  const now = audio.ctx.currentTime;
  const arp = [523.25, 659.25, 783.99, 1046.5, 1318.5];

  arp.forEach((freq, idx) => {
    const start = now + idx * 0.075;
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(0.14, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);

    osc.connect(gain);
    gain.connect(audio.ctx.destination);
    osc.start(start);
    osc.stop(start + 0.48);
  });
}

// ----------------------------------------------------------------------------
// 4. INPUT HANDLING
// ----------------------------------------------------------------------------

const keys = new Set();
const mouse = {
  x: LOGICAL_WIDTH / 2,
  y: LOGICAL_HEIGHT / 2,
  active: false
};

function getLogicalMousePos(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * LOGICAL_WIDTH,
    y: ((clientY - rect.top) / rect.height) * LOGICAL_HEIGHT
  };
}

window.addEventListener("keydown", (e) => {
  ensureAudioContext();
  const code = e.code;

  if (
    code === "ArrowUp" ||
    code === "ArrowDown" ||
    code === "ArrowLeft" ||
    code === "ArrowRight" ||
    code === "Space"
  ) {
    e.preventDefault();
  }

  keys.add(code);

  // Disable mouse auto-steer if player uses movement keys
  if (
    code === "ArrowUp" ||
    code === "ArrowDown" ||
    code === "ArrowLeft" ||
    code === "ArrowRight" ||
    code === "KeyW" ||
    code === "KeyA" ||
    code === "KeyS" ||
    code === "KeyD"
  ) {
    mouse.active = false;
  }

  if (code === "KeyM") {
    toggleMute();
    return;
  }

  if (state.mode === "title") {
    if (code === "Enter" || code === "Space") {
      startNewGame();
    }
  } else if (state.mode === "playing") {
    if (code === "KeyP" || code === "Escape") {
      state.mode = "paused";
    }
  } else if (state.mode === "paused") {
    if (code === "KeyP" || code === "Escape") {
      state.mode = "playing";
    } else if (code === "KeyR") {
      startNewGame();
    }
  } else if (state.mode === "gameover") {
    if (code === "KeyR" || code === "Enter") {
      startNewGame();
    }
  } else if (state.mode === "victory") {
    if (code === "KeyR" || code === "Enter") {
      startNewGame();
    }
  }
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
});

canvas.addEventListener("mousemove", (e) => {
  const pos = getLogicalMousePos(e.clientX, e.clientY);
  mouse.x = pos.x;
  mouse.y = pos.y;
  mouse.active = true;
});

canvas.addEventListener("mousedown", (e) => {
  ensureAudioContext();
  const pos = getLogicalMousePos(e.clientX, e.clientY);
  mouse.x = pos.x;
  mouse.y = pos.y;

  if (state.mode === "title") {
    startNewGame();
  }
});

// ----------------------------------------------------------------------------
// 5. BACKGROUND (NEBULAE & PARALLAX STAR LAYERS)
// ----------------------------------------------------------------------------

const starLayers = [
  // Layer 0: slow, small, dim stars
  Array.from({ length: 75 }, () => ({
    x: Math.random() * LOGICAL_WIDTH,
    y: Math.random() * LOGICAL_HEIGHT,
    r: 0.7 + Math.random() * 0.9,
    alpha: 0.25 + Math.random() * 0.3,
    speed: 8 + Math.random() * 6
  })),
  // Layer 1: faster, brighter stars
  Array.from({ length: 40 }, () => ({
    x: Math.random() * LOGICAL_WIDTH,
    y: Math.random() * LOGICAL_HEIGHT,
    r: 1.2 + Math.random() * 1.4,
    alpha: 0.5 + Math.random() * 0.45,
    speed: 22 + Math.random() * 14
  }))
];

const nebulae = [
  { x: 210, y: 170, r: 220, color: "128, 64, 210", alpha: 0.065 },
  { x: 740, y: 420, r: 260, color: "32, 178, 170", alpha: 0.055 },
  { x: 510, y: 240, r: 190, color: "155, 70, 190", alpha: 0.045 }
];

function updateBackground(dt, shipVx, shipVy) {
  for (let l = 0; l < starLayers.length; l++) {
    const layer = starLayers[l];
    const parallax = l === 0 ? 0.04 : 0.1;
    for (let i = 0; i < layer.length; i++) {
      const s = layer[i];
      s.x -= (s.speed + shipVx * parallax) * dt;
      s.y -= shipVy * parallax * dt;

      if (s.x < -2) s.x += LOGICAL_WIDTH + 4;
      if (s.x > LOGICAL_WIDTH + 2) s.x -= LOGICAL_WIDTH + 4;
      if (s.y < -2) s.y += LOGICAL_HEIGHT + 4;
      if (s.y > LOGICAL_HEIGHT + 2) s.y -= LOGICAL_HEIGHT + 4;
    }
  }
}

// ----------------------------------------------------------------------------
// 6. PARTICLE SYSTEM
// ----------------------------------------------------------------------------

const particles = [];

function spawnParticle(x, y, vx, vy, life, size, color, glow = false) {
  particles.push({
    x,
    y,
    vx,
    vy,
    life,
    maxLife: life,
    size,
    color,
    glow
  });
}

function spawnEngineTrail(player) {
  const backAngle = player.angle + Math.PI;
  const spread = (Math.random() - 0.5) * 0.55;
  const speed = 55 + Math.random() * 65;
  const px = player.x + Math.cos(backAngle) * 14;
  const py = player.y + Math.sin(backAngle) * 14;
  const vx = Math.cos(backAngle + spread) * speed + player.vx * 0.2;
  const vy = Math.sin(backAngle + spread) * speed + player.vy * 0.2;
  const color = Math.random() < 0.5 ? "#66e0ff" : "#ff9e44";
  spawnParticle(px, py, vx, vy, 0.28 + Math.random() * 0.18, 2 + Math.random() * 1.8, color, true);
}

function spawnPickupSparkles(x, y) {
  for (let i = 0; i < 16; i++) {
    const ang = (Math.PI * 2 * i) / 16 + Math.random() * 0.3;
    const spd = 60 + Math.random() * 120;
    const color = Math.random() < 0.6 ? "#ffb347" : "#fff1b8";
    spawnParticle(x, y, Math.cos(ang) * spd, Math.sin(ang) * spd, 0.38 + Math.random() * 0.25, 2.2 + Math.random() * 2, color, true);
  }
}

function spawnHitExplosion(x, y) {
  for (let i = 0; i < 28; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 50 + Math.random() * 190;
    const r = Math.random();
    const color = r < 0.45 ? "#ff6a2b" : r < 0.75 ? "#ffb347" : "#9aa3b2";
    spawnParticle(x, y, Math.cos(ang) * spd, Math.sin(ang) * spd, 0.4 + Math.random() * 0.35, 2.5 + Math.random() * 3.2, color, r < 0.75);
  }
}

function spawnWarpSwirl(x, y) {
  for (let i = 0; i < 36; i++) {
    const ang = (Math.PI * 2 * i) / 36;
    const tang = ang + Math.PI / 2;
    const spd = 90 + Math.random() * 130;
    const color = i % 2 === 0 ? "#5ce1e6" : "#b983ff";
    spawnParticle(
      x + Math.cos(ang) * 18,
      y + Math.sin(ang) * 18,
      Math.cos(tang) * spd + Math.cos(ang) * 40,
      Math.sin(tang) * spd + Math.sin(ang) * 40,
      0.8 + Math.random() * 0.6,
      2.5 + Math.random() * 2.5,
      color,
      true
    );
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.98;
    p.vy *= 0.98;
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

// ----------------------------------------------------------------------------
// 7. ENTITIES & SPAWNERS
// ----------------------------------------------------------------------------

function createPlayer() {
  return {
    x: LOGICAL_WIDTH / 2,
    y: LOGICAL_HEIGHT / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    radius: PLAYER_RADIUS,
    hearts: PLAYER_MAX_HEARTS,
    invulnTimer: 0,
    thrusting: false,
    trailTimer: 0
  };
}

function createAsteroid(player) {
  const radius = 14 + Math.random() * 28; // 14 to 42
  const speed = 40 + 12 * state.wave + (Math.random() - 0.5) * 16;

  // Pick a random screen edge off-screen
  let x = 0;
  let y = 0;
  let attempts = 0;

  do {
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) {
      x = Math.random() * LOGICAL_WIDTH;
      y = -radius - 20;
    } else if (edge === 1) {
      x = LOGICAL_WIDTH + radius + 20;
      y = Math.random() * LOGICAL_HEIGHT;
    } else if (edge === 2) {
      x = Math.random() * LOGICAL_WIDTH;
      y = LOGICAL_HEIGHT + radius + 20;
    } else {
      x = -radius - 20;
      y = Math.random() * LOGICAL_HEIGHT;
    }
    attempts++;
  } while (
    player &&
    Math.hypot(x - player.x, y - player.y) < ASTEROID_SAFE_SPAWN_DIST &&
    attempts < 20
  );

  // Aim generally inward toward a random central region
  const targetX = LOGICAL_WIDTH * (0.2 + Math.random() * 0.6);
  const targetY = LOGICAL_HEIGHT * (0.2 + Math.random() * 0.6);
  const dirAngle = Math.atan2(targetY - y, targetX - x) + (Math.random() - 0.5) * 0.6;

  const vertexCount = 8 + Math.floor(Math.random() * 5);
  const vertices = [];
  for (let i = 0; i < vertexCount; i++) {
    const a = (Math.PI * 2 * i) / vertexCount;
    const r = radius * (0.74 + Math.random() * 0.34);
    vertices.push({ angle: a, r });
  }

  return {
    x,
    y,
    vx: Math.cos(dirAngle) * speed,
    vy: Math.sin(dirAngle) * speed,
    radius,
    angle: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 1.4,
    vertices,
    shade: 115 + Math.floor(Math.random() * 45)
  };
}

function createShard(player) {
  let x = 0;
  let y = 0;
  let attempts = 0;

  do {
    x = 46 + Math.random() * (LOGICAL_WIDTH - 92);
    y = 74 + Math.random() * (LOGICAL_HEIGHT - 118);
    attempts++;
  } while (player && Math.hypot(x - player.x, y - player.y) < 90 && attempts < 12);

  const driftAngle = Math.random() * Math.PI * 2;
  const driftSpeed = 10 + Math.random() * 14;

  return {
    x,
    y,
    vx: Math.cos(driftAngle) * driftSpeed,
    vy: Math.sin(driftAngle) * driftSpeed,
    radius: 10,
    phase: Math.random() * Math.PI * 2
  };
}

function createWarpGate(player) {
  let x = LOGICAL_WIDTH / 2;
  let y = LOGICAL_HEIGHT / 2;
  let attempts = 0;

  do {
    x = 110 + Math.random() * (LOGICAL_WIDTH - 220);
    y = 115 + Math.random() * (LOGICAL_HEIGHT - 210);
    attempts++;
  } while (player && Math.hypot(x - player.x, y - player.y) < 180 && attempts < 25);

  return {
    x,
    y,
    radius: GATE_TRIGGER_RADIUS,
    rotation: 0,
    pulse: 0
  };
}

// ----------------------------------------------------------------------------
// 8. GAME STATE & PERSISTENCE
// ----------------------------------------------------------------------------

function loadBestScore() {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch (e) {
    return 0;
  }
}

function saveBestScore(score) {
  try {
    localStorage.setItem(STORAGE_KEY, String(score));
  } catch (e) {
    // Ignore storage errors
  }
}

const state = {
  mode: "title", // "title", "playing", "paused", "gameover", "victory"
  player: createPlayer(),
  asteroids: [],
  shards: [],
  warpGate: null,
  score: 0,
  bestScore: loadBestScore(),
  shardsCollected: 0,
  wave: 1,
  combo: 0,
  multiplier: 1,
  elapsedTime: 0,
  waveBannerTimer: 0,
  shakeTimer: 0,
  shakeIntensity: 0
};

function startNewGame() {
  state.mode = "playing";
  state.player = createPlayer();
  state.asteroids = [];
  state.shards = [];
  state.warpGate = null;
  state.score = 0;
  state.shardsCollected = 0;
  state.wave = 1;
  state.combo = 0;
  state.multiplier = 1;
  state.elapsedTime = 0;
  state.waveBannerTimer = 2.0;
  state.shakeTimer = 0;
  state.shakeIntensity = 0;
  particles.length = 0;

  const initialAsteroids = 6 + 2 * state.wave;
  for (let i = 0; i < initialAsteroids; i++) {
    state.asteroids.push(createAsteroid(state.player));
  }

  for (let i = 0; i < MAX_SHARDS_ON_SCREEN; i++) {
    state.shards.push(createShard(state.player));
  }
}

// ----------------------------------------------------------------------------
// 9. UPDATE LOGIC
// ----------------------------------------------------------------------------

function update(dt) {
  if (state.mode === "title") {
    updateBackground(dt, 25, 0);
    return;
  }

  if (state.mode === "paused") {
    return;
  }

  if (state.mode === "gameover" || state.mode === "victory") {
    updateBackground(dt, 15, 0);
    updateParticles(dt);
    if (state.mode === "victory" && state.warpGate) {
      state.warpGate.rotation += dt * 1.4;
      state.warpGate.pulse += dt * 3;
      if (Math.random() < 0.35) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 40 + Math.random() * 80;
        spawnParticle(
          state.warpGate.x + Math.cos(ang) * 26,
          state.warpGate.y + Math.sin(ang) * 26,
          Math.cos(ang + Math.PI / 2) * spd,
          Math.sin(ang + Math.PI / 2) * spd,
          0.7,
          2.2,
          Math.random() < 0.5 ? "#5ce1e6" : "#b983ff",
          true
        );
      }
    }
    return;
  }

  // Playing state
  state.elapsedTime += dt;

  if (state.waveBannerTimer > 0) {
    state.waveBannerTimer = Math.max(0, state.waveBannerTimer - dt);
  }

  if (state.shakeTimer > 0) {
    state.shakeTimer = Math.max(0, state.shakeTimer - dt);
  }

  updatePlayer(dt);
  updateBackground(dt, state.player.vx, state.player.vy);
  updateAsteroids(dt);
  updateShards(dt);
  updateWarpGate(dt);
  updateParticles(dt);
}

function updatePlayer(dt) {
  const p = state.player;

  if (p.invulnTimer > 0) {
    p.invulnTimer = Math.max(0, p.invulnTimer - dt);
  }

  let ax = 0;
  let ay = 0;

  const up = keys.has("ArrowUp") || keys.has("KeyW");
  const down = keys.has("ArrowDown") || keys.has("KeyS");
  const left = keys.has("ArrowLeft") || keys.has("KeyA");
  const right = keys.has("ArrowRight") || keys.has("KeyD");

  if (up) ay -= 1;
  if (down) ay += 1;
  if (left) ax -= 1;
  if (right) ax += 1;

  if (ax !== 0 || ay !== 0) {
    const len = Math.hypot(ax, ay);
    ax /= len;
    ay /= len;
    p.vx += ax * PLAYER_ACCEL * dt;
    p.vy += ay * PLAYER_ACCEL * dt;
    p.thrusting = true;
  } else if (mouse.active) {
    const dx = mouse.x - p.x;
    const dy = mouse.y - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 14) {
      const nx = dx / dist;
      const ny = dy / dist;
      const factor = Math.min(1, dist / 90);
      p.vx += nx * PLAYER_ACCEL * factor * dt;
      p.vy += ny * PLAYER_ACCEL * factor * dt;
      p.thrusting = dist > 22;
    } else {
      p.thrusting = false;
    }
  } else {
    p.thrusting = false;
  }

  // Apply drag
  const dragFactor = Math.max(0, 1 - PLAYER_DRAG * dt);
  p.vx *= dragFactor;
  p.vy *= dragFactor;

  // Clamp max speed
  const speed = Math.hypot(p.vx, p.vy);
  if (speed > PLAYER_MAX_SPEED) {
    p.vx = (p.vx / speed) * PLAYER_MAX_SPEED;
    p.vy = (p.vy / speed) * PLAYER_MAX_SPEED;
  }

  p.x += p.vx * dt;
  p.y += p.vy * dt;

  // Clamp inside canvas bounds
  if (p.x < PLAYER_MARGIN) {
    p.x = PLAYER_MARGIN;
    if (p.vx < 0) p.vx = 0;
  } else if (p.x > LOGICAL_WIDTH - PLAYER_MARGIN) {
    p.x = LOGICAL_WIDTH - PLAYER_MARGIN;
    if (p.vx > 0) p.vx = 0;
  }

  if (p.y < PLAYER_MARGIN + 44) {
    p.y = PLAYER_MARGIN + 44;
    if (p.vy < 0) p.vy = 0;
  } else if (p.y > LOGICAL_HEIGHT - PLAYER_MARGIN) {
    p.y = LOGICAL_HEIGHT - PLAYER_MARGIN;
    if (p.vy > 0) p.vy = 0;
  }

  // Smoothly face movement or mouse direction
  if (mouse.active && (ax === 0 && ay === 0)) {
    const targetAngle = Math.atan2(mouse.y - p.y, mouse.x - p.x);
    p.angle = lerpAngle(p.angle, targetAngle, Math.min(1, dt * 12));
  } else if (speed > 12) {
    const targetAngle = Math.atan2(p.vy, p.vx);
    p.angle = lerpAngle(p.angle, targetAngle, Math.min(1, dt * 12));
  }

  // Engine trail particles
  if (p.thrusting || speed > 70) {
    p.trailTimer += dt;
    if (p.trailTimer >= 0.03) {
      p.trailTimer = 0;
      spawnEngineTrail(p);
    }
  }
}

function lerpAngle(current, target, t) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * t;
}

function updateAsteroids(dt) {
  const p = state.player;

  for (let i = 0; i < state.asteroids.length; i++) {
    const a = state.asteroids[i];
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.angle += a.rotSpeed * dt;

    // Wrap around screen edges
    const pad = a.radius + 24;
    if (a.x < -pad) a.x = LOGICAL_WIDTH + pad;
    else if (a.x > LOGICAL_WIDTH + pad) a.x = -pad;

    if (a.y < -pad) a.y = LOGICAL_HEIGHT + pad;
    else if (a.y > LOGICAL_HEIGHT + pad) a.y = -pad;

    // Check collision with player
    if (p.invulnTimer <= 0) {
      const dist = Math.hypot(p.x - a.x, p.y - a.y);
      if (dist < p.radius + a.radius) {
        handlePlayerHit();
        break;
      }
    }
  }
}

function handlePlayerHit() {
  const p = state.player;
  p.hearts -= 1;
  p.invulnTimer = INVULN_DURATION;
  state.combo = 0;
  state.multiplier = 1;
  state.shakeTimer = 0.35;
  state.shakeIntensity = 9;

  spawnHitExplosion(p.x, p.y);
  playThud();

  if (p.hearts <= 0) {
    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      saveBestScore(state.bestScore);
    }
    state.mode = "gameover";
  }
}

function updateShards(dt) {
  const p = state.player;

  for (let i = state.shards.length - 1; i >= 0; i--) {
    const s = state.shards[i];
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.phase += dt * 3.5;

    // Soft bounce inside playable area
    if (s.x < 34) {
      s.x = 34;
      s.vx = Math.abs(s.vx);
    } else if (s.x > LOGICAL_WIDTH - 34) {
      s.x = LOGICAL_WIDTH - 34;
      s.vx = -Math.abs(s.vx);
    }

    if (s.y < 68) {
      s.y = 68;
      s.vy = Math.abs(s.vy);
    } else if (s.y > LOGICAL_HEIGHT - 34) {
      s.y = LOGICAL_HEIGHT - 34;
      s.vy = -Math.abs(s.vy);
    }

    // Check pickup
    const bobY = s.y + Math.sin(s.phase) * 3.5;
    const dist = Math.hypot(p.x - s.x, p.y - bobY);
    if (dist < p.radius + s.radius + 6) {
      collectShard(i, s.x, bobY);
    }
  }
}

function collectShard(index, x, y) {
  state.combo += 1;
  state.multiplier = Math.min(5, 1 + Math.floor(state.combo / 8));
  state.score += 10 * state.multiplier;
  state.shardsCollected += 1;

  spawnPickupSparkles(x, y);
  playBlip();

  state.shards.splice(index, 1);
  while (state.shards.length < MAX_SHARDS_ON_SCREEN) {
    state.shards.push(createShard(state.player));
  }

  // Wave progression every 25 shards
  if (state.shardsCollected % SHARDS_PER_WAVE === 0) {
    state.wave += 1;
    state.score += 50;
    state.waveBannerTimer = 2.0;
    playChime();

    const targetCount = 6 + 2 * state.wave;
    while (state.asteroids.length < targetCount) {
      state.asteroids.push(createAsteroid(state.player));
    }

    // Gently scale existing asteroid speeds toward new wave baseline
    const targetSpeed = 40 + 12 * state.wave;
    for (let i = 0; i < state.asteroids.length; i++) {
      const a = state.asteroids[i];
      const curSpeed = Math.hypot(a.vx, a.vy) || 1;
      const newSpeed = Math.max(curSpeed, targetSpeed + (Math.random() - 0.5) * 12);
      a.vx = (a.vx / curSpeed) * newSpeed;
      a.vy = (a.vy / curSpeed) * newSpeed;
    }
  }

  // Spawn warp gate at 100 shards
  if (state.shardsCollected >= SHARDS_FOR_GATE && !state.warpGate) {
    state.warpGate = createWarpGate(state.player);
  }
}

function updateWarpGate(dt) {
  if (!state.warpGate) return;
  const g = state.warpGate;
  g.rotation += dt * 1.2;
  g.pulse += dt * 3.2;

  const dist = Math.hypot(state.player.x - g.x, state.player.y - g.y);
  if (dist < GATE_TRIGGER_RADIUS) {
    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      saveBestScore(state.bestScore);
    }
    spawnWarpSwirl(g.x, g.y);
    playShimmer();
    state.mode = "victory";
  }
}

// ----------------------------------------------------------------------------
// 10. RENDERING
// ----------------------------------------------------------------------------

function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.save();
  if (state.shakeTimer > 0 && state.mode === "playing") {
    const mag = state.shakeIntensity * (state.shakeTimer / 0.35);
    const sx = (Math.random() - 0.5) * 2 * mag;
    const sy = (Math.random() - 0.5) * 2 * mag;
    ctx.translate(sx, sy);
  }

  drawBackground();

  if (state.mode === "title") {
    drawTitleScreen();
    ctx.restore();
    return;
  }

  drawWarpGate();
  drawShards();
  drawAsteroids();
  drawParticles();

  if (state.mode !== "victory") {
    drawPlayer();
  }

  ctx.restore();

  drawHUD();

  if (state.mode === "playing" && state.waveBannerTimer > 0) {
    drawWaveBanner();
  }

  if (state.mode === "paused") {
    drawPausedOverlay();
  } else if (state.mode === "gameover") {
    drawGameOverOverlay();
  } else if (state.mode === "victory") {
    drawVictoryOverlay();
  }
}

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
  grad.addColorStop(0, COLORS.bgTop);
  grad.addColorStop(1, COLORS.bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  // Soft distant nebula blobs
  for (let i = 0; i < nebulae.length; i++) {
    const n = nebulae[i];
    const nGrad = ctx.createRadialGradient(n.x, n.y, 10, n.x, n.y, n.r);
    nGrad.addColorStop(0, `rgba(${n.color}, ${n.alpha})`);
    nGrad.addColorStop(1, `rgba(${n.color}, 0)`);
    ctx.fillStyle = nGrad;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Two parallax star layers
  for (let l = 0; l < starLayers.length; l++) {
    const layer = starLayers[l];
    for (let i = 0; i < layer.length; i++) {
      const s = layer[i];
      ctx.fillStyle = `rgba(220, 235, 255, ${s.alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPlayer() {
  const p = state.player;

  // Blink during invulnerability
  if (p.invulnTimer > 0 && Math.floor(p.invulnTimer * 14) % 2 === 0) {
    return;
  }

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);

  // Engine flame flicker
  const speed = Math.hypot(p.vx, p.vy);
  if (p.thrusting || speed > 35) {
    const flicker = 10 + Math.random() * 10;
    ctx.save();
    ctx.shadowColor = "#66e0ff";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#ff9e44";
    ctx.beginPath();
    ctx.moveTo(-11, -4.5);
    ctx.lineTo(-11 - flicker, 0);
    ctx.lineTo(-11, 4.5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#e8fbff";
    ctx.beginPath();
    ctx.moveTo(-11, -2.2);
    ctx.lineTo(-11 - flicker * 0.55, 0);
    ctx.lineTo(-11, 2.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Glowing solar sail arc behind hull
  ctx.save();
  ctx.shadowColor = COLORS.sailGlow;
  ctx.shadowBlur = 14;
  ctx.strokeStyle = COLORS.sailGlow;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(-6, 0, 17, -Math.PI * 0.68, Math.PI * 0.68, true);
  ctx.stroke();

  // Translucent sail membrane
  ctx.fillStyle = "rgba(102, 224, 255, 0.16)";
  ctx.beginPath();
  ctx.arc(-6, 0, 17, -Math.PI * 0.68, Math.PI * 0.68, true);
  ctx.lineTo(-5, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Angular hull triangle
  ctx.fillStyle = COLORS.hullFill;
  ctx.strokeStyle = COLORS.hullStroke;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-11, -10);
  ctx.lineTo(-7, 0);
  ctx.lineTo(-11, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cockpit accent
  ctx.fillStyle = "#5ce1e6";
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-1, -3.5);
  ctx.lineTo(-1, 3.5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawAsteroids() {
  for (let i = 0; i < state.asteroids.length; i++) {
    const a = state.asteroids[i];
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.angle);

    ctx.fillStyle = `rgb(${a.shade - 38}, ${a.shade - 34}, ${a.shade - 28})`;
    ctx.strokeStyle = `rgb(${a.shade + 24}, ${a.shade + 28}, ${a.shade + 35})`;
    ctx.lineWidth = 2;

    ctx.beginPath();
    for (let v = 0; v < a.vertices.length; v++) {
      const vert = a.vertices[v];
      const vx = Math.cos(vert.angle) * vert.r;
      const vy = Math.sin(vert.angle) * vert.r;
      if (v === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

function drawShards() {
  for (let i = 0; i < state.shards.length; i++) {
    const s = state.shards[i];
    const bobY = s.y + Math.sin(s.phase) * 3.5;

    ctx.save();
    ctx.shadowColor = COLORS.emberGlow;
    ctx.shadowBlur = 18;

    const grad = ctx.createRadialGradient(s.x, bobY, 1, s.x, bobY, s.radius + 3);
    grad.addColorStop(0, COLORS.emberCore);
    grad.addColorStop(0.5, COLORS.emberMid);
    grad.addColorStop(1, "rgba(255, 85, 0, 0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(s.x, bobY, s.radius + 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.emberCore;
    ctx.beginPath();
    ctx.arc(s.x, bobY, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawWarpGate() {
  if (!state.warpGate) return;
  const g = state.warpGate;
  const pulseScale = 1 + Math.sin(g.pulse) * 0.08;
  const r = 38 * pulseScale;

  ctx.save();
  ctx.translate(g.x, g.y);

  // Outer aura
  const aura = ctx.createRadialGradient(0, 0, 6, 0, 0, r * 1.45);
  aura.addColorStop(0, "rgba(92, 225, 230, 0.45)");
  aura.addColorStop(0.55, "rgba(185, 131, 255, 0.25)");
  aura.addColorStop(1, "rgba(185, 131, 255, 0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.45, 0, Math.PI * 2);
  ctx.fill();

  // Rotating outer segmented ring
  ctx.save();
  ctx.rotate(g.rotation);
  ctx.shadowColor = COLORS.gateOuter;
  ctx.shadowBlur = 20;
  ctx.strokeStyle = COLORS.gateOuter;
  ctx.lineWidth = 4;
  for (let i = 0; i < 4; i++) {
    const start = (Math.PI / 2) * i + 0.14;
    const end = (Math.PI / 2) * (i + 1) - 0.14;
    ctx.beginPath();
    ctx.arc(0, 0, r, start, end);
    ctx.stroke();
  }
  ctx.restore();

  // Counter-rotating inner ring
  ctx.save();
  ctx.rotate(-g.rotation * 1.5);
  ctx.shadowColor = COLORS.gateInner;
  ctx.shadowBlur = 16;
  ctx.strokeStyle = COLORS.gateInner;
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const start = ((Math.PI * 2) / 3) * i + 0.22;
    const end = ((Math.PI * 2) / 3) * (i + 1) - 0.22;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.66, start, end);
    ctx.stroke();
  }
  ctx.restore();

  // Core
  ctx.fillStyle = "#e6ffff";
  ctx.beginPath();
  ctx.arc(0, 0, 8 * pulseScale, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawParticles() {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (p.glow) {
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
    }
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * alpha), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawHeart(cx, cy, size, filled) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(0, size * 0.35);
  ctx.bezierCurveTo(-size * 0.55, -size * 0.2, -size, size * 0.25, 0, size);
  ctx.bezierCurveTo(size, size * 0.25, size * 0.55, -size * 0.2, 0, size * 0.35);
  ctx.closePath();

  ctx.fillStyle = filled ? COLORS.heartFull : COLORS.heartEmpty;
  ctx.fill();
  if (filled) {
    ctx.strokeStyle = "#ff8fa3";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

function drawHUD() {
  ctx.save();
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, 46);

  ctx.strokeStyle = COLORS.hudBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 46);
  ctx.lineTo(LOGICAL_WIDTH, 46);
  ctx.stroke();

  ctx.textBaseline = "middle";
  ctx.font = "bold 16px system-ui, -apple-system, sans-serif";

  // Score
  ctx.fillStyle = COLORS.textPrimary;
  ctx.textAlign = "left";
  ctx.fillText(`SCORE ${state.score}`, 18, 23);

  // Shards
  ctx.fillStyle = state.shardsCollected >= SHARDS_FOR_GATE ? "#5ce1e6" : "#ffb347";
  ctx.fillText(
    `SHARDS ${Math.min(state.shardsCollected, SHARDS_FOR_GATE)}/${SHARDS_FOR_GATE}`,
    165,
    23
  );

  // Hearts
  for (let i = 0; i < PLAYER_MAX_HEARTS; i++) {
    drawHeart(355 + i * 26, 15, 11, i < state.player.hearts);
  }

  // Wave
  ctx.fillStyle = COLORS.textPrimary;
  ctx.fillText(`WAVE ${state.wave}`, 465, 23);

  // Combo multiplier
  ctx.fillStyle = state.multiplier > 1 ? "#ffd166" : COLORS.textSecondary;
  ctx.fillText(`COMBO x${state.multiplier}`, 575, 23);

  // Mute hint
  ctx.textAlign = "right";
  ctx.font = "13px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = audio.muted ? "#ff8fa3" : COLORS.textSecondary;
  ctx.fillText(audio.muted ? "M: mute (MUTED)" : "M: mute", LOGICAL_WIDTH - 18, 23);

  ctx.restore();
}

function drawWaveBanner() {
  const alpha = Math.min(1, state.waveBannerTimer / 0.5);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "bold 42px system-ui, -apple-system, sans-serif";
  ctx.shadowColor = "#5ce1e6";
  ctx.shadowBlur = 18;
  ctx.fillStyle = COLORS.textPrimary;
  ctx.fillText(`WAVE ${state.wave}`, LOGICAL_WIDTH / 2, LOGICAL_HEIGHT * 0.28);

  if (state.shardsCollected >= SHARDS_FOR_GATE) {
    ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "#5ce1e6";
    ctx.fillText("WARP GATE OPEN — FLY INTO THE GATE!", LOGICAL_WIDTH / 2, LOGICAL_HEIGHT * 0.28 + 38);
  }
  ctx.restore();
}

function drawOverlayBox(w, h) {
  const x = (LOGICAL_WIDTH - w) / 2;
  const y = (LOGICAL_HEIGHT - h) / 2;
  ctx.fillStyle = "rgba(5, 9, 22, 0.84)";
  ctx.strokeStyle = "rgba(102, 224, 255, 0.35)";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.stroke();
}

function drawTitleScreen() {
  ctx.save();
  drawOverlayBox(620, 400);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "bold 52px system-ui, -apple-system, sans-serif";
  ctx.shadowColor = "#ff8c24";
  ctx.shadowBlur = 20;
  ctx.fillStyle = "#fff4cc";
  ctx.fillText("STARFALL SALVAGE", LOGICAL_WIDTH / 2, 165);
  ctx.shadowBlur = 0;

  ctx.font = "17px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = COLORS.textSecondary;
  ctx.fillText(
    "Pilot your solar-sail skiff through the drifting asteroid field.",
    LOGICAL_WIDTH / 2,
    225
  );
  ctx.fillText(
    "Collect 100 glowing salvage shards to open the warp gate and escape.",
    LOGICAL_WIDTH / 2,
    252
  );

  ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#66e0ff";
  ctx.fillText(
    "CONTROLS: Arrow Keys / WASD or Mouse to steer  |  P / Esc: Pause  |  M: Mute",
    LOGICAL_WIDTH / 2,
    305
  );

  ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#ffd166";
  ctx.fillText(`BEST SCORE: ${state.bestScore}`, LOGICAL_WIDTH / 2, 355);

  ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = COLORS.textPrimary;
  ctx.fillText("Press Enter or click to start", LOGICAL_WIDTH / 2, 420);

  ctx.restore();
}

function drawPausedOverlay() {
  ctx.save();
  ctx.fillStyle = "rgba(2, 4, 12, 0.55)";
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  drawOverlayBox(400, 210);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "bold 38px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = COLORS.textPrimary;
  ctx.fillText("PAUSED", LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 42);

  ctx.font = "17px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = COLORS.textSecondary;
  ctx.fillText("Press P or Esc to resume", LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 12);
  ctx.fillText("Press R to restart", LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 44);
  ctx.restore();
}

function drawGameOverOverlay() {
  ctx.save();
  ctx.fillStyle = "rgba(2, 4, 12, 0.65)";
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  drawOverlayBox(460, 310);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "bold 40px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#ff6b6b";
  ctx.fillText("HULL BREACHED", LOGICAL_WIDTH / 2, 195);

  ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = COLORS.textPrimary;
  ctx.fillText(`Final Score: ${state.score}`, LOGICAL_WIDTH / 2, 255);
  ctx.fillText(`Shards Collected: ${state.shardsCollected} / ${SHARDS_FOR_GATE}`, LOGICAL_WIDTH / 2, 288);
  ctx.fillText(`Wave Reached: ${state.wave}`, LOGICAL_WIDTH / 2, 321);

  ctx.fillStyle = "#ffd166";
  ctx.fillText(`Best Score: ${state.bestScore}`, LOGICAL_WIDTH / 2, 358);

  ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#66e0ff";
  ctx.fillText("Press R or Enter to restart", LOGICAL_WIDTH / 2, 412);
  ctx.restore();
}

function drawVictoryOverlay() {
  ctx.save();
  ctx.fillStyle = "rgba(2, 4, 12, 0.55)";
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  drawOverlayBox(460, 290);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "bold 40px system-ui, -apple-system, sans-serif";
  ctx.shadowColor = "#5ce1e6";
  ctx.shadowBlur = 16;
  ctx.fillStyle = "#e6ffff";
  ctx.fillText("WARP COMPLETE", LOGICAL_WIDTH / 2, 200);
  ctx.shadowBlur = 0;

  const mins = Math.floor(state.elapsedTime / 60);
  const secs = Math.floor(state.elapsedTime % 60);
  const timeStr = `${mins}:${secs < 10 ? "0" : ""}${secs}`;

  ctx.font = "bold 21px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = COLORS.textPrimary;
  ctx.fillText(`Final Score: ${state.score}`, LOGICAL_WIDTH / 2, 265);
  ctx.fillText(`Time: ${timeStr}`, LOGICAL_WIDTH / 2, 302);

  ctx.fillStyle = "#ffd166";
  ctx.fillText(`Best Score: ${state.bestScore}`, LOGICAL_WIDTH / 2, 339);

  ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#66e0ff";
  ctx.fillText("Press R to play again", LOGICAL_WIDTH / 2, 395);
  ctx.restore();
}

// ----------------------------------------------------------------------------
// 11. MAIN LOOP
// ----------------------------------------------------------------------------

let lastTime = performance.now();

function gameLoop(now) {
  const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;

  update(dt);
  render();

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
