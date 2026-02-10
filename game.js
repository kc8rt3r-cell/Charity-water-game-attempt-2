const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const adButton = document.getElementById("adButton");
const startPanel = document.querySelector(".start-panel");
const gameoverPanel = document.querySelector(".gameover-panel");
const highScoreValue = document.getElementById("highScoreValue");
const finalScore = document.getElementById("finalScore");

const pressedKeys = new Set();
const droplet = {
  x: window.innerWidth * 0.5,
  y: window.innerHeight * 0.5,
  radius: 18,
  speed: 320,
  fallSpeed: 220,
};

const state = {
  width: window.innerWidth,
  height: window.innerHeight,
  dpr: window.devicePixelRatio || 1,
  mode: "start",
  shapes: [],
  goldenCircles: [],
  gameOverTimer: null,
  shapeCount: 0,
  elapsed: 0,
  trail: [],
  maxTrail: 60,
  score: 0,
  highScore: 0,
  goldenCount: 4,
};

const getBaseShapeCount = () => Math.max(10, Math.floor(state.width / 80));

const buildShapes = () => {
  state.shapes = Array.from({ length: state.shapeCount }, () => {
    const baseSize = 10 + Math.random() * 24;
    const size = baseSize * (0.6 + Math.random() * 1.4);
    return {
      x: Math.random() * state.width,
      y: Math.random() * state.height,
      size,
      type: Math.random() > 0.5 ? "circle" : "square",
      alpha: 0.12 + Math.random() * 0.18,
    };
  });
};

const spawnGoldenCircle = () => {
  const radius = 10 + Math.random() * 6;
  const padding = 36 + radius;
  return {
    x: padding + Math.random() * (state.width - padding * 2),
    y: padding + Math.random() * (state.height - padding * 2),
    radius,
  };
};

const buildGoldenCircles = () => {
  state.goldenCircles = Array.from({ length: state.goldenCount }, () => spawnGoldenCircle());
};

const loadHighScore = () => {
  const stored = Number(window.localStorage.getItem("streamyHighScore"));
  if (!Number.isNaN(stored)) {
    state.highScore = stored;
    highScoreValue.textContent = stored.toString();
  }
};

const updateScoreUI = () => {
  if (finalScore) {
    finalScore.textContent = `Score ${state.score}`;
  }
  if (state.score > state.highScore) {
    state.highScore = state.score;
    highScoreValue.textContent = state.highScore.toString();
    window.localStorage.setItem("streamyHighScore", state.highScore.toString());
  }
};

const resize = () => {
  state.width = window.innerWidth;
  state.height = window.innerHeight;
  state.dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(state.width * state.dpr);
  canvas.height = Math.floor(state.height * state.dpr);
  canvas.style.width = `${state.width}px`;
  canvas.style.height = `${state.height}px`;

  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  droplet.y = state.height * 0.5;
  const baseCount = getBaseShapeCount();
  if (state.mode === "start" || state.shapeCount < baseCount) {
    state.shapeCount = baseCount;
  }
  buildShapes();
  buildGoldenCircles();
};

const setMode = (mode) => {
  state.mode = mode;
  if (mode === "start") {
    startPanel?.classList.remove("is-hidden");
    gameoverPanel?.classList.add("is-hidden");
    if (state.gameOverTimer) {
      window.clearTimeout(state.gameOverTimer);
      state.gameOverTimer = null;
    }
  } else if (mode === "playing") {
    startPanel?.classList.add("is-hidden");
    gameoverPanel?.classList.add("is-hidden");
  } else if (mode === "gameover") {
    gameoverPanel?.classList.remove("is-hidden");
  }
};

const triggerGameOver = () => {
  if (state.mode !== "playing") {
    return;
  }

  setMode("gameover");
  state.gameOverTimer = window.setTimeout(() => {
    setMode("start");
  }, 4000);
};

const startGame = () => {
  if (state.mode !== "start") {
    return;
  }
  droplet.x = state.width * 0.5;
  droplet.y = state.height * 0.5;
  state.shapeCount = getBaseShapeCount();
  state.elapsed = 0;
  state.trail = [{ x: droplet.x, y: droplet.y }];
  state.score = 0;
  updateScoreUI();
  buildShapes();
  buildGoldenCircles();
  setMode("playing");
};

const updateDroplet = (deltaSeconds) => {
  if (state.mode !== "playing") {
    return;
  }

  const moveLeft = pressedKeys.has("ArrowLeft") || pressedKeys.has("a");
  const moveRight = pressedKeys.has("ArrowRight") || pressedKeys.has("d");
  const direction = Number(moveRight) - Number(moveLeft);
  state.elapsed += deltaSeconds;
  const speedMultiplier = Math.min(3, 1 + state.elapsed * 0.04);
  const travel = direction * droplet.speed * speedMultiplier * deltaSeconds;
  const minX = droplet.radius + 12;
  const maxX = state.width - droplet.radius - 12;

  droplet.x = Math.min(Math.max(droplet.x + travel, minX), maxX);
  droplet.y += droplet.fallSpeed * speedMultiplier * deltaSeconds;

  if (droplet.y - droplet.radius > state.height) {
    droplet.y = -droplet.radius;
    state.trail = [{ x: droplet.x, y: droplet.y }];
    state.shapeCount += 4;
    buildShapes();
  }

  state.trail.push({ x: droplet.x, y: droplet.y });
  if (state.trail.length > state.maxTrail) {
    state.trail.shift();
  }

  for (const circle of state.goldenCircles) {
    const dx = droplet.x - circle.x;
    const dy = droplet.y - circle.y;
    const minDistance = droplet.radius + circle.radius;
    if (dx * dx + dy * dy <= minDistance * minDistance) {
      state.score += 1;
      updateScoreUI();
      Object.assign(circle, spawnGoldenCircle());
    }
  }

  for (const shape of state.shapes) {
    if (shape.type === "circle") {
      const dx = droplet.x - shape.x;
      const dy = droplet.y - shape.y;
      const minDistance = droplet.radius + shape.size * 0.5;
      if (dx * dx + dy * dy <= minDistance * minDistance) {
        triggerGameOver();
        break;
      }
    } else {
      const half = shape.size * 0.5;
      const closestX = Math.max(shape.x - half, Math.min(droplet.x, shape.x + half));
      const closestY = Math.max(shape.y - half, Math.min(droplet.y, shape.y + half));
      const dx = droplet.x - closestX;
      const dy = droplet.y - closestY;
      if (dx * dx + dy * dy <= droplet.radius * droplet.radius) {
        triggerGameOver();
        break;
      }
    }
  }
};

const drawDroplet = () => {
  if (state.mode !== "playing") {
    return;
  }

  const gradient = ctx.createRadialGradient(
    droplet.x - droplet.radius * 0.3,
    droplet.y - droplet.radius * 0.4,
    droplet.radius * 0.2,
    droplet.x,
    droplet.y,
    droplet.radius
  );
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.45, "#7fd3f4");
  gradient.addColorStop(1, "#1a7db5");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(droplet.x, droplet.y, droplet.radius, 0, Math.PI * 2);
  ctx.fill();
};

const drawTrail = () => {
  if (state.mode !== "playing" || state.trail.length < 2) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = "rgba(43, 155, 214, 0.65)";
  ctx.lineWidth = droplet.radius * 0.9;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(state.trail[0].x, state.trail[0].y);
  for (let i = 1; i < state.trail.length; i += 1) {
    ctx.lineTo(state.trail[i].x, state.trail[i].y);
  }
  ctx.stroke();
  ctx.restore();
};

const drawShapes = () => {
  ctx.save();
  for (const shape of state.shapes) {
    ctx.globalAlpha = shape.alpha;
    ctx.fillStyle = "#050505";
    if (shape.type === "circle") {
      ctx.beginPath();
      ctx.arc(shape.x, shape.y, shape.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const half = shape.size * 0.5;
      ctx.fillRect(shape.x - half, shape.y - half, shape.size, shape.size);
    }
  }
  ctx.restore();
};

const drawGoldenCircles = () => {
  if (state.goldenCircles.length === 0) {
    return;
  }

  ctx.save();
  ctx.fillStyle = "rgba(246, 198, 64, 0.9)";
  for (const circle of state.goldenCircles) {
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

const drawScore = () => {
  if (state.mode !== "playing") {
    return;
  }

  ctx.save();
  ctx.fillStyle = "rgba(11, 30, 43, 0.82)";
  ctx.font = "600 18px Sora, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`Score ${state.score}`, 18, 16);
  ctx.restore();
};

const drawGameOverText = () => {
  if (state.mode !== "gameover") {
    return;
  }

  ctx.save();
  ctx.fillStyle = "rgba(11, 30, 43, 0.75)";
  ctx.font = "700 48px Bungee, Impact, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("GAME OVER", state.width / 2, state.height / 2);
  ctx.restore();
};

let lastFrame = performance.now();
const render = (timestamp) => {
  const deltaSeconds = Math.min(0.05, (timestamp - lastFrame) / 1000);
  lastFrame = timestamp;

  updateDroplet(deltaSeconds);
  ctx.clearRect(0, 0, state.width, state.height);

  const gradient = ctx.createLinearGradient(0, 0, 0, state.height);
  gradient.addColorStop(0, "#bfe3f2");
  gradient.addColorStop(0.6, "#8fc4db");
  gradient.addColorStop(1, "#f3d97b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, state.width, state.height);

  drawShapes();
  drawGoldenCircles();

  drawTrail();
  drawDroplet();
  drawScore();
  drawGameOverText();

  requestAnimationFrame(render);
};

window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowleft", "arrowright", "a", "d"].includes(key)) {
    event.preventDefault();
    pressedKeys.add(key === "arrowleft" ? "ArrowLeft" : key === "arrowright" ? "ArrowRight" : key);
  }
});

window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowleft", "arrowright", "a", "d"].includes(key)) {
    event.preventDefault();
    pressedKeys.delete(key === "arrowleft" ? "ArrowLeft" : key === "arrowright" ? "ArrowRight" : key);
  }
});

window.addEventListener("blur", () => {
  pressedKeys.clear();
});

startButton?.addEventListener("click", startGame);
startButton?.addEventListener("pointerdown", startGame);
startButton?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    startGame();
  }
});

startPanel?.addEventListener("pointerdown", (event) => {
  if (event.target.closest("a") || event.target.closest("button")) {
    return;
  }
  startGame();
});

restartButton?.addEventListener("click", () => {
  window.location.reload();
});

adButton?.addEventListener("click", () => {
  // Placeholder for ad-based revive.
  setMode("playing");
});

loadHighScore();
resize();
setMode("start");
requestAnimationFrame(render);
