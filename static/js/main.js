// Bootstrap: wire up the API client, renderer, code panel, playback engine
// and toolbar controls.

import { APIClient } from "./api.js";
import { ArrayRenderer, BarRenderer, TreeRenderer } from "./renderers.js";
import { CodePanel } from "./codePanel.js";
import { Player } from "./playback.js";

const api = new APIClient();
const arrayRenderer = new ArrayRenderer(document.getElementById("array-canvas"));
const barRenderer = new BarRenderer(document.getElementById("bars-canvas"));
const treeRenderer = new TreeRenderer(document.getElementById("tree-canvas"));
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
  treeBox: document.getElementById("tree-box"),
  targetInput: document.getElementById("target-input"),
  targetGroup: document.getElementById("target-group"),
  targetChip: document.getElementById("target-chip"),
};

let currentArray = [];
let requestId = 0;
let sortInFlight = false;
let algoMeta = {};        // name -> metadata from /api/algorithms
let currentAlgo = null;   // metadata of the selected algorithm
let currentTarget = null; // search target value

// ---- Playback engine -----------------------------------------------------
const player = new Player((frame, prev, progress, sortedFlags) => {
  arrayRenderer.setTarget(currentTarget);
  arrayRenderer.render(frame, prev, progress, sortedFlags);
  barRenderer.render(frame, prev, progress, sortedFlags);
  if (treeVisible()) treeRenderer.render(player.frames, player.index, sortedFlags);
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
  const last = player.frames[player.index];
  els.status.textContent = currentAlgo?.category === "searching"
    ? (last?.type === "found" ? "Target found ✓" : "Target not found")
    : "Sorting complete ✓";
  els.play.textContent = "▶ Play";
};

function setPlayLabel() {
  els.play.textContent = player.playing ? "⏸ Pause" : "▶ Play";
}

function treeVisible() {
  return els.treeBox && !els.treeBox.classList.contains("hidden");
}

function renderIdle() {
  const frame = { array: currentArray, indices: [], type: "idle", line: null, message: "" };
  const empty = new Set();
  arrayRenderer.setTarget(currentTarget);
  arrayRenderer.render(frame, null, 1, empty);
  barRenderer.render(frame, null, 1, empty);
  treeRenderer.render([], -1, empty);
}

function resizeViews() {
  arrayRenderer.resize();
  barRenderer.resize();
  treeRenderer.resize();
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
  updateTargetChip();
  els.status.textContent = `${n} elements — press Sort to run the algorithm`;
  els.statSteps.textContent = "0";
  els.statCompares.textContent = "0";
  els.statSwaps.textContent = "0";
}

// ---- Algorithm loading ---------------------------------------------------
function renderDescription(detail) {
  els.algoName.textContent = detail.display_name;
  const c = detail.complexity;
  const stability = detail.category === "searching"
    ? ""
    : ` · ${detail.stable ? "Stable" : "Unstable"}`;
  els.algoComplexity.textContent =
    `Best ${c.best} · Avg ${c.average} · Worst ${c.worst} · Space ${c.space}${stability}`;
  els.algoComplexity.title = "Time / space complexity";
  els.algoDesc.textContent = detail.description;
}

function updateTargetChip() {
  const isSearch = currentAlgo && currentAlgo.category === "searching";
  if (isSearch) {
    const v = Number(els.targetInput.value);
    currentTarget = Number.isNaN(v) ? null : v;
    els.targetChip.textContent = currentTarget == null
      ? "Target: –"
      : `Target: ${currentTarget}`;
    els.targetChip.classList.remove("hidden");
  } else {
    currentTarget = null;
    els.targetChip.classList.add("hidden");
  }
}

async function loadAlgorithm(name) {
  const detail = await api.getAlgorithm(name);
  codePanel.setSource(detail.source, detail.start_line);
  renderDescription(detail);
  currentAlgo = { ...detail, ...(algoMeta[name] || {}) };
  const showTree = detail.name === "quick_sort";
  els.treeBox.classList.toggle("hidden", !showTree);
  const isSearch = detail.category === "searching";
  els.targetGroup.classList.toggle("hidden", !isSearch);
  updateTargetChip();
  resizeViews();
}

// ---- Sort via WebSocket --------------------------------------------------
function startSort() {
  if (sortInFlight) return;
  if (currentArray.length === 0) return;

  const algo = currentAlgo || {};
  let arr = currentArray;
  let target;

  // Searching algorithms that require sorted input sort a copy first.
  if (algo.needs_sorted_input) {
    arr = [...currentArray].sort((a, b) => a - b);
    currentArray = arr;
    renderIdle();
  }

  if (algo.category === "searching") {
    updateTargetChip();
    if (currentTarget == null) {
      els.status.textContent = "Enter a valid target value.";
      return;
    }
    target = currentTarget;
  }

  sortInFlight = true;
  els.sort.disabled = true;
  els.sort.textContent = "Sorting…";
  player.pause();
  setPlayLabel();
  els.status.textContent = algo.needs_sorted_input
    ? "Array sorted — searching…"
    : `Running ${algo.display_name}…`;

  const myId = ++requestId;
  api.requestSort(els.algoSelect.value, arr, myId, target).catch((err) => {
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

  if (msg.category === "searching" && msg.target != null) {
    currentTarget = msg.target;
    els.targetChip.textContent = `Target: ${currentTarget}`;
    els.targetChip.classList.remove("hidden");
  }

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

  els.targetInput.addEventListener("input", () => {
    updateTargetChip();
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
  for (const a of algorithms) algoMeta[a.name] = a;

  for (const cat of ["sorting", "searching"]) {
    const group = algorithms.filter((a) => a.category === cat);
    if (!group.length) continue;
    const optGroup = document.createElement("optgroup");
    optGroup.label = cat === "sorting" ? "Sorting" : "Searching";
    for (const a of group) {
      const opt = document.createElement("option");
      opt.value = a.name;
      opt.textContent = a.display_name;
      optGroup.appendChild(opt);
    }
    els.algoSelect.appendChild(optGroup);
  }

  await loadAlgorithm(algorithms[0].name);
  wireControls();
  player.setSpeed(Number(els.speedSlider.value));
  resizeViews();
  randomize();
}

init().catch((err) => {
  els.status.textContent = `Failed to initialize: ${err.message}`;
});

