// Bootstrap: wire up the API client, renderer, code panel, playback engine
// and toolbar controls.

import { APIClient } from "./api.js";
import { ArrayRenderer, BarRenderer } from "./renderers.js";
import { CodePanel } from "./codePanel.js";
import { Player } from "./playback.js";

const api = new APIClient();
const arrayRenderer = new ArrayRenderer(document.getElementById("array-canvas"));
const barRenderer = new BarRenderer(document.getElementById("bars-canvas"));
const codePanel = new CodePanel(document.getElementById("code-block"));

const els = {
  algoSelect: document.getElementById("algorithm-select"),
  sizeSlider: document.getElementById("size-slider"),
  sizeLabel: document.getElementById("size-label"),
  randomize: document.getElementById("randomize-btn"),
  sort: document.getElementById("sort-btn"),
  play: document.getElementById("play-btn"),
  stepBack: document.getElementById("step-back-btn"),
  stepFwd: document.getElementById("step-fwd-btn"),
  skipEnd: document.getElementById("skip-end-btn"),
  speedSlider: document.getElementById("speed-slider"),
  speedLabel: document.getElementById("speed-label"),
  status: document.getElementById("status-msg"),
  algoName: document.getElementById("algo-name"),
  algoComplexity: document.getElementById("algo-complexity"),
  algoDesc: document.getElementById("algo-desc"),
  statSteps: document.getElementById("stat-steps"),
  statCompares: document.getElementById("stat-compares"),
  statSwaps: document.getElementById("stat-swaps"),
};

let currentArray = [];
let requestId = 0;
let sortInFlight = false;

// ---- Playback engine -----------------------------------------------------
const player = new Player((frame, prev, progress, sortedFlags) => {
  arrayRenderer.render(frame, prev, progress, sortedFlags);
  barRenderer.render(frame, prev, progress, sortedFlags);
  codePanel.highlight(frame.line);
  if (frame.message) els.status.textContent = frame.message;

  const stats = player.cumStats[player.index];
  if (stats) {
    els.statCompares.textContent = String(stats.compares);
    els.statSwaps.textContent = String(stats.swaps);
  }
  els.statSteps.textContent = player.frames.length
    ? `${player.index + 1}/${player.frames.length}`
    : "0";
});

player.onEnd = () => {
  els.status.textContent = "Sorting complete ✓";
  els.play.textContent = "▶ Play";
};

function setPlayLabel() {
  els.play.textContent = player.playing ? "⏸ Pause" : "▶ Play";
}

function renderIdle() {
  const frame = { array: currentArray, indices: [], type: "idle", line: null, message: "" };
  const empty = new Set();
  arrayRenderer.render(frame, null, 1, empty);
  barRenderer.render(frame, null, 1, empty);
}

// ---- Array generation ----------------------------------------------------
function randomArray(n) {
  const arr = [];
  for (let i = 0; i < n; i++) arr.push(5 + Math.floor(Math.random() * (n * 2)));
  return arr;
}

function randomize() {
  const n = Number(els.sizeSlider.value);
  els.sizeLabel.textContent = String(n);
  currentArray = randomArray(n);
  player.frames = [];
  player.index = -1;
  player.playing = false;
  setPlayLabel();
  renderIdle();
  codePanel.highlight(null);
  els.status.textContent = `${n} elements — press Sort to run the algorithm`;
  els.statSteps.textContent = "0";
  els.statCompares.textContent = "0";
  els.statSwaps.textContent = "0";
}

// ---- Algorithm loading ---------------------------------------------------
function renderDescription(detail) {
  els.algoName.textContent = detail.display_name;
  const c = detail.complexity;
  els.algoComplexity.textContent =
    `Best ${c.best} · Avg ${c.average} · Worst ${c.worst} · Space ${c.space} · ` +
    (detail.stable ? "Stable" : "Unstable");
  els.algoComplexity.title = "Time / space complexity";
  els.algoDesc.textContent = detail.description;
}

async function loadAlgorithm(name) {
  const detail = await api.getAlgorithm(name);
  codePanel.setSource(detail.source, detail.start_line);
  renderDescription(detail);
}

// ---- Sort via WebSocket --------------------------------------------------
function startSort() {
  if (sortInFlight) return;
  if (currentArray.length === 0) return;

  sortInFlight = true;
  els.sort.disabled = true;
  els.sort.textContent = "Sorting…";
  player.pause();
  setPlayLabel();

  const myId = ++requestId;
  api.requestSort(els.algoSelect.value, currentArray, myId).catch((err) => {
    sortInFlight = false;
    els.sort.disabled = false;
    els.sort.textContent = "Sort";
    els.status.textContent = `Connection error: ${err.message}`;
  });
}

api.onResult = (msg) => {
  if (msg.request_id !== requestId) return; // stale response, ignore
  sortInFlight = false;
  els.sort.disabled = false;
  els.sort.textContent = "Sort";

  if (!msg.frames || !msg.frames.length) {
    els.status.textContent = "No steps produced.";
    return;
  }

  player.load(msg.frames);
  els.play.textContent = "⏸ Pause";
  player.play();
};

api.onError = (err) => {
  sortInFlight = false;
  els.sort.disabled = false;
  els.sort.textContent = "Sort";
  els.status.textContent = `Error: ${err}`;
};

// ---- Toolbar wiring ------------------------------------------------------
function togglePlay() {
  player.toggle();
  setPlayLabel();
}

function wireControls() {
  els.algoSelect.addEventListener("change", async () => {
    await loadAlgorithm(els.algoSelect.value);
    randomize();
  });

  els.sizeSlider.addEventListener("input", () => {
    els.sizeLabel.textContent = els.sizeSlider.value;
    if (!sortInFlight) randomize();
  });

  els.speedSlider.addEventListener("input", () => {
    const v = Number(els.speedSlider.value);
    els.speedLabel.textContent = String(v);
    player.setSpeed(v);
  });

  els.randomize.addEventListener("click", () => {
    player.pause();
    randomize();
  });

  els.sort.addEventListener("click", startSort);
  els.play.addEventListener("click", togglePlay);
  els.stepBack.addEventListener("click", () => { player.stepBack(); setPlayLabel(); });
  els.stepFwd.addEventListener("click", () => { player.stepForward(); setPlayLabel(); });
  els.skipEnd.addEventListener("click", () => { player.skipEnd(); setPlayLabel(); });

  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input, select, button, textarea")) return;
    if (e.code === "Space") {
      e.preventDefault();
      togglePlay();
    } else if (e.code === "ArrowRight") {
      player.stepForward();
      setPlayLabel();
    } else if (e.code === "ArrowLeft") {
      player.stepBack();
      setPlayLabel();
    }
  });
}

// ---- Init ----------------------------------------------------------------
async function init() {
  const algorithms = await api.getAlgorithms();
  for (const a of algorithms) {
    const opt = document.createElement("option");
    opt.value = a.name;
    opt.textContent = a.display_name;
    els.algoSelect.appendChild(opt);
  }
  await loadAlgorithm(algorithms[0].name);
  wireControls();
  player.setSpeed(Number(els.speedSlider.value));
  arrayRenderer.resize();
  barRenderer.resize();
  randomize();
}

init().catch((err) => {
  els.status.textContent = `Failed to initialize: ${err.message}`;
});

