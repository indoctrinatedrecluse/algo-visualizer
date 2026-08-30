// Bootstrap: wire up the API client, renderers, code panel, playback engine
// and toolbar controls.

import { APIClient } from "./api.js";
import { ArrayRenderer, BarRenderer, TreeRenderer } from "./renderers.js";
import { GraphRenderer } from "./graphRenderer.js";
import { BSTRenderer } from "./bstRenderer.js";
import { FlowRenderer } from "./flowRenderer.js";
import { MatchingRenderer } from "./matchingRenderer.js";
import { DPRenderer } from "./dpRenderer.js";
import { GreedyRenderer } from "./greedyRenderer.js";
import { CodePanel } from "./codePanel.js";
import { Player } from "./playback.js";

const api = new APIClient();
const arrayRenderer = new ArrayRenderer(document.getElementById("array-canvas"));
const barRenderer = new BarRenderer(document.getElementById("bars-canvas"));
const treeRenderer = new TreeRenderer(document.getElementById("tree-canvas"));
const graphRenderer = new GraphRenderer(document.getElementById("graph-canvas"));
const bstRenderer = new BSTRenderer(document.getElementById("bst-canvas"));
const flowRenderer = new FlowRenderer(document.getElementById("flow-canvas"));
const matchingRenderer = new MatchingRenderer(document.getElementById("matching-canvas"));
const dpRenderer = new DPRenderer(document.getElementById("dp-canvas"));
const greedyRenderer = new GreedyRenderer(document.getElementById("greedy-canvas"));
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
  speedInput: document.getElementById("speed-input"),
  status: document.getElementById("status-msg"),
  algoName: document.getElementById("algo-name"),
  algoComplexity: document.getElementById("algo-complexity"),
  algoDesc: document.getElementById("algo-desc"),
  statSteps: document.getElementById("stat-steps"),
  statCompares: document.getElementById("stat-compares"),
  statSwaps: document.getElementById("stat-swaps"),
  treeBox: document.getElementById("tree-box"),
  treeHeader: document.getElementById("tree-header"),
  graphBox: document.getElementById("graph-box"),
  graphHeader: document.getElementById("graph-header"),
  bstBox: document.getElementById("bst-box"),
  bstHeader: document.getElementById("bst-header"),
  flowBox: document.getElementById("flow-box"),
  flowHeader: document.getElementById("flow-header"),
  matchingBox: document.getElementById("matching-box"),
  matchingHeader: document.getElementById("matching-header"),
  dpBox: document.getElementById("dp-box"),
  dpHeader: document.getElementById("dp-header"),
  greedyBox: document.getElementById("greedy-box"),
  greedyHeader: document.getElementById("greedy-header"),
  arrayBox: document.getElementById("array-box"),
  barsBox: document.getElementById("bars-box"),
  targetInput: document.getElementById("target-input"),
  targetGroup: document.getElementById("target-group"),
  targetChip: document.getElementById("target-chip"),
  startNodeSelect: document.getElementById("start-node-select"),
  startNodeGroup: document.getElementById("start-node-group"),
  targetNodeSelect: document.getElementById("target-node-select"),
  targetNodeGroup: document.getElementById("target-node-group"),
  treeKeyGroup: document.getElementById("tree-key-group"),
  treeKeyInput: document.getElementById("tree-key-input"),
  treeKeyLabel: document.getElementById("tree-key-label"),
};

let currentArray = [];
let currentGraph = null;
let currentTree = null;
let currentNetwork = null;
let currentPreferences = null;
let currentCustomData = null;
let requestId = 0;
let sortInFlight = false;
let algoMeta = {};        // name -> metadata from /api/algorithms
let currentAlgo = null;   // metadata of the selected algorithm
let currentTarget = null; // search target value

// ---- Tree & Graph Presets ------------------------------------------------
const DEFAULT_GRAPH = {
  nodes: [
    { id: "A", label: "A", x: 70, y: 70 },
    { id: "B", label: "B", x: 190, y: 60 },
    { id: "C", label: "C", x: 80, y: 230 },
    { id: "D", label: "D", x: 200, y: 230 },
    { id: "E", label: "E", x: 320, y: 70 },
    { id: "F", label: "F", x: 330, y: 220 },
    { id: "G", label: "G", x: 440, y: 70 },
    { id: "H", label: "H", x: 450, y: 230 },
    { id: "I", label: "I", x: 560, y: 80 },
    { id: "J", label: "J", x: 570, y: 220 },
  ],
  edges: [
    { u: "A", v: "B", weight: 3 },
    { u: "A", v: "C", weight: 5 },
    { u: "B", v: "C", weight: 2 },
    { u: "B", v: "D", weight: 4 },
    { u: "B", v: "E", weight: 6 },
    { u: "C", v: "D", weight: 3 },
    { u: "D", v: "E", weight: 2 },
    { u: "D", v: "F", weight: 5 },
    { u: "E", v: "F", weight: 4 },
    { u: "E", v: "G", weight: 3 },
    { u: "F", v: "G", weight: 5 },
    { u: "F", v: "H", weight: 2 },
    { u: "G", v: "H", weight: 3 },
    { u: "G", v: "I", weight: 4 },
    { u: "H", v: "I", weight: 2 },
    { u: "H", v: "J", weight: 5 },
    { u: "I", v: "J", weight: 3 },
    { u: "C", v: "F", weight: 6 },
    { u: "E", v: "H", weight: 4 },
  ],
};

const DEFAULT_FLOW_NETWORK = {
  source: "S",
  sink: "T",
  nodes: [
    { id: "S", label: "S", x: 70, y: 160, type: "source" },
    { id: "A", label: "A", x: 200, y: 65 },
    { id: "B", label: "B", x: 200, y: 160 },
    { id: "C", label: "C", x: 200, y: 255 },
    { id: "D", label: "D", x: 340, y: 65 },
    { id: "E", label: "E", x: 340, y: 160 },
    { id: "F", label: "F", x: 340, y: 255 },
    { id: "G", label: "G", x: 470, y: 100 },
    { id: "H", label: "H", x: 470, y: 220 },
    { id: "T", label: "T", x: 580, y: 160, type: "sink" },
  ],
  edges: [
    { u: "S", v: "A", capacity: 12 },
    { u: "S", v: "B", capacity: 8 },
    { u: "S", v: "C", capacity: 14 },
    { u: "A", v: "D", capacity: 9 },
    { u: "A", v: "E", capacity: 4 },
    { u: "A", v: "B", capacity: 3 },
    { u: "B", v: "D", capacity: 3 },
    { u: "B", v: "E", capacity: 7 },
    { u: "B", v: "F", capacity: 4 },
    { u: "C", v: "E", capacity: 5 },
    { u: "C", v: "F", capacity: 11 },
    { u: "D", v: "G", capacity: 10 },
    { u: "D", v: "E", capacity: 4 },
    { u: "E", v: "G", capacity: 6 },
    { u: "E", v: "H", capacity: 8 },
    { u: "E", v: "F", capacity: 2 },
    { u: "F", v: "H", capacity: 10 },
    { u: "G", v: "T", capacity: 16 },
    { u: "H", v: "T", capacity: 15 },
  ],
};

const DEFAULT_MATCHING_PREFS = {
  proposers: {
    M1: ["W2", "W1", "W4", "W3", "W5", "W6"],
    M2: ["W3", "W2", "W1", "W6", "W4", "W5"],
    M3: ["W1", "W4", "W3", "W2", "W5", "W6"],
    M4: ["W4", "W5", "W2", "W1", "W6", "W3"],
    M5: ["W5", "W2", "W6", "W3", "W1", "W4"],
    M6: ["W1", "W3", "W5", "W4", "W2", "W6"],
  },
  reviewers: {
    W1: ["M2", "M3", "M1", "M5", "M4", "M6"],
    W2: ["M4", "M1", "M2", "M3", "M6", "M5"],
    W3: ["M1", "M2", "M6", "M4", "M5", "M3"],
    W4: ["M3", "M5", "M4", "M1", "M2", "M6"],
    W5: ["M6", "M4", "M5", "M2", "M3", "M1"],
    W6: ["M5", "M6", "M1", "M3", "M2", "M4"],
  },
};

const DEFAULT_AVL_TREE = {
  val: 50,
  height: 4,
  bf: 0,
  left: {
    val: 25,
    height: 3,
    bf: 0,
    left: {
      val: 12,
      height: 2,
      bf: 0,
      left: { val: 6, height: 1, bf: 0, left: null, right: null },
      right: { val: 18, height: 1, bf: 0, left: null, right: null },
    },
    right: {
      val: 37,
      height: 2,
      bf: 0,
      left: { val: 31, height: 1, bf: 0, left: null, right: null },
      right: { val: 43, height: 1, bf: 0, left: null, right: null },
    },
  },
  right: {
    val: 75,
    height: 3,
    bf: 0,
    left: {
      val: 62,
      height: 2,
      bf: 0,
      left: { val: 56, height: 1, bf: 0, left: null, right: null },
      right: { val: 68, height: 1, bf: 0, left: null, right: null },
    },
    right: {
      val: 87,
      height: 2,
      bf: 0,
      left: { val: 81, height: 1, bf: 0, left: null, right: null },
      right: { val: 93, height: 1, bf: 0, left: null, right: null },
    },
  },
};

const DEFAULT_RB_TREE = {
  val: 50,
  color: "BLACK",
  height: 4,
  bf: 0,
  left: {
    val: 25,
    color: "RED",
    height: 3,
    bf: 0,
    left: {
      val: 12,
      color: "BLACK",
      height: 2,
      bf: 0,
      left: { val: 6, color: "RED", height: 1, bf: 0, left: null, right: null },
      right: { val: 18, color: "RED", height: 1, bf: 0, left: null, right: null },
    },
    right: {
      val: 37,
      color: "BLACK",
      height: 2,
      bf: 0,
      left: { val: 31, color: "RED", height: 1, bf: 0, left: null, right: null },
      right: null,
    },
  },
  right: {
    val: 75,
    color: "RED",
    height: 3,
    bf: 0,
    left: {
      val: 62,
      color: "BLACK",
      height: 2,
      bf: 0,
      left: { val: 56, color: "RED", height: 1, bf: 0, left: null, right: null },
      right: { val: 68, color: "RED", height: 1, bf: 0, left: null, right: null },
    },
    right: {
      val: 87,
      color: "BLACK",
      height: 2,
      bf: 0,
      left: { val: 81, color: "RED", height: 1, bf: 0, left: null, right: null },
      right: null,
    },
  },
};

const DEFAULT_HEAP_TREE = {
  val: 4,
  heap_idx: 0,
  height: 4,
  bf: 0,
  left: {
    val: 7,
    heap_idx: 1,
    height: 3,
    bf: 0,
    left: {
      val: 15,
      heap_idx: 3,
      height: 2,
      bf: 0,
      left: { val: 29, heap_idx: 7, height: 1, bf: 0, left: null, right: null },
      right: { val: 34, heap_idx: 8, height: 1, bf: 0, left: null, right: null },
    },
    right: {
      val: 9,
      heap_idx: 4,
      height: 2,
      bf: 0,
      left: { val: 22, heap_idx: 9, height: 1, bf: 0, left: null, right: null },
      right: { val: 16, heap_idx: 10, height: 1, bf: 0, left: null, right: null },
    },
  },
  right: {
    val: 12,
    heap_idx: 2,
    height: 3,
    bf: 0,
    left: {
      val: 21,
      heap_idx: 5,
      height: 2,
      bf: 0,
      left: { val: 25, heap_idx: 11, height: 1, bf: 0, left: null, right: null },
      right: { val: 30, heap_idx: 12, height: 1, bf: 0, left: null, right: null },
    },
    right: {
      val: 18,
      heap_idx: 6,
      height: 2,
      bf: 0,
      left: { val: 42, heap_idx: 13, height: 1, bf: 0, left: null, right: null },
      right: { val: 38, heap_idx: 14, height: 1, bf: 0, left: null, right: null },
    },
  },
};

const DEFAULT_UNBALANCED_TREE = {
  val: 10,
  height: 8,
  bf: -7,
  left: { val: 5, height: 1, bf: 0, left: null, right: null },
  right: {
    val: 20,
    height: 7,
    bf: -6,
    left: { val: 15, height: 1, bf: 0, left: null, right: null },
    right: {
      val: 30,
      height: 6,
      bf: -5,
      left: { val: 25, height: 1, bf: 0, left: null, right: null },
      right: {
        val: 40,
        height: 5,
        bf: -4,
        left: { val: 35, height: 1, bf: 0, left: null, right: null },
        right: {
          val: 50,
          height: 4,
          bf: -3,
          left: { val: 45, height: 1, bf: 0, left: null, right: null },
          right: {
            val: 60,
            height: 3,
            bf: -2,
            left: { val: 55, height: 1, bf: 0, left: null, right: null },
            right: {
              val: 70,
              height: 2,
              bf: 1,
              left: { val: 65, height: 1, bf: 0, left: null, right: null },
              right: null,
            },
          },
        },
      },
    },
  },
};

const DEFAULT_01_KNAPSACK = {
  capacity: 10,
  items: [
    { id: "I1", weight: 2, value: 6 },
    { id: "I2", weight: 3, value: 10 },
    { id: "I3", weight: 4, value: 12 },
    { id: "I4", weight: 5, value: 16 },
    { id: "I5", weight: 6, value: 22 },
  ],
};

const DEFAULT_FRACT_KNAPSACK = {
  capacity: 50,
  items: [
    { id: "A", weight: 8, value: 56 },
    { id: "B", weight: 10, value: 60 },
    { id: "C", weight: 20, value: 100 },
    { id: "D", weight: 30, value: 120 },
    { id: "E", weight: 15, value: 45 },
    { id: "F", weight: 25, value: 50 },
  ],
};

const DEFAULT_ACTIVITIES = [
  { id: "Act 1", start: 1, end: 4 },
  { id: "Act 2", start: 3, end: 5 },
  { id: "Act 3", start: 0, end: 6 },
  { id: "Act 4", start: 5, end: 7 },
  { id: "Act 5", start: 3, end: 9 },
  { id: "Act 6", start: 5, end: 9 },
  { id: "Act 7", start: 6, end: 10 },
  { id: "Act 8", start: 8, end: 11 },
];

const DEFAULT_JOBS = [
  { id: "J1", deadline: 2, profit: 100 },
  { id: "J2", deadline: 1, profit: 19 },
  { id: "J3", deadline: 2, profit: 27 },
  { id: "J4", deadline: 1, profit: 25 },
  { id: "J5", deadline: 3, profit: 15 },
  { id: "J6", deadline: 3, profit: 50 },
];

const DEFAULT_GRID_MATRIX = [
  [1, 3, 1, 2, 4],
  [1, 5, 2, 1, 3],
  [4, 2, 1, 4, 1],
  [2, 1, 3, 2, 1],
];

// ---- Playback engine -----------------------------------------------------
const player = new Player((frame, prev, progress, sortedFlags) => {
  if (frame.dp_table) {
    dpRenderer.render(frame);
  } else if (frame.items || frame.intervals) {
    greedyRenderer.render(frame);
  } else if (currentAlgo?.category === "matching") {
    matchingRenderer.render(frame);
  } else if (currentAlgo?.category === "flow") {
    flowRenderer.render(frame);
  } else if (currentAlgo?.category === "tree" || frame.tree) {
    bstRenderer.render(frame);
  } else if (currentAlgo?.category === "graph") {
    graphRenderer.render(frame);
  } else {
    arrayRenderer.setTarget(currentTarget);
    arrayRenderer.render(frame, prev, progress, sortedFlags);
    barRenderer.render(frame, prev, progress, sortedFlags);
    if (treeVisible()) treeRenderer.render(player.frames, player.index, sortedFlags);
  }
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
  if (currentAlgo?.category === "matching") {
    els.status.textContent = last?.message || "Stable matching complete ✓";
  } else if (currentAlgo?.category === "flow") {
    els.status.textContent = last?.message || "Maximum flow computation complete ✓";
  } else if (currentAlgo?.category === "tree") {
    els.status.textContent = last?.message || "Tree operation complete ✓";
  } else if (currentAlgo?.category === "graph") {
    els.status.textContent = last?.message || "Graph search complete ✓";
  } else if (currentAlgo?.category === "searching") {
    els.status.textContent = last?.type === "found" ? "Target found ✓" : "Target not found";
  } else {
    els.status.textContent = last?.message || "Execution complete ✓";
  }
  els.play.textContent = "▶ Play";
};

function setPlayLabel() {
  els.play.textContent = player.playing ? "⏸ Pause" : "▶ Play";
}

function treeVisible() {
  return els.treeBox && !els.treeBox.classList.contains("hidden");
}

function renderIdle() {
  if (els.dpBox && !els.dpBox.classList.contains("hidden")) {
    dpRenderer.render();
  } else if (els.greedyBox && !els.greedyBox.classList.contains("hidden")) {
    greedyRenderer.render();
  } else if (currentAlgo?.category === "matching") {
    matchingRenderer.render();
  } else if (currentAlgo?.category === "flow") {
    flowRenderer.render();
  } else if (currentAlgo?.category === "tree") {
    bstRenderer.render();
  } else if (currentAlgo?.category === "graph") {
    graphRenderer.render();
  } else {
    const frame = { array: currentArray, indices: [], type: "idle", line: null, message: "" };
    const empty = new Set();
    arrayRenderer.setTarget(currentTarget);
    arrayRenderer.render(frame, null, 1, empty);
    barRenderer.render(frame, null, 1, empty);
    treeRenderer.render([], -1, empty);
  }
}

function resizeViews() {
  arrayRenderer.resize();
  barRenderer.resize();
  treeRenderer.resize();
  graphRenderer.resize();
  bstRenderer.resize();
  flowRenderer.resize();
  matchingRenderer.resize();
  dpRenderer.resize();
  greedyRenderer.resize();
}

function applySpeed(value) {
  const v = Number(value);
  if (!Number.isFinite(v)) return;
  const clamped = Math.min(300, Math.max(1, Math.round(v)));
  player.setSpeed(clamped);
  els.speedLabel.textContent = String(clamped);
  els.speedSlider.value = String(clamped);
  els.speedInput.value = String(clamped);
}

// ---- Data generation -----------------------------------------------------
function randomArray(n) {
  const arr = [];
  for (let i = 0; i < n; i++) arr.push(5 + Math.floor(Math.random() * (n * 2)));
  return arr;
}

function randomGraph(numNodes = 10) {
  const count = Math.max(6, Math.min(14, numNodes));
  const labels = Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i));
  const nodes = [];
  const centerX = 320, centerY = 150;
  const radiusX = 220, radiusY = 100;

  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count + (Math.random() - 0.5) * 0.3;
    const rx = radiusX * (0.8 + Math.random() * 0.25);
    const ry = radiusY * (0.8 + Math.random() * 0.25);
    nodes.push({
      id: labels[i],
      label: labels[i],
      x: Math.round(Math.max(60, Math.min(580, centerX + rx * Math.cos(angle)))),
      y: Math.round(Math.max(50, Math.min(260, centerY + ry * Math.sin(angle)))),
    });
  }

  const coords = new Map(nodes.map((nd) => [nd.id, { x: nd.x, y: nd.y }]));
  const calcWeight = (u, v) => {
    const p1 = coords.get(u), p2 = coords.get(v);
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    return Math.max(1, Math.min(15, Math.round(dist / 32) + Math.floor(Math.random() * 3) - 1));
  };

  const edges = [];
  const edgeSet = new Set();
  const shuffled = [...labels].sort(() => Math.random() - 0.5);
  const connected = [shuffled[0]];
  const unconnected = shuffled.slice(1);

  while (unconnected.length) {
    const u = connected[Math.floor(Math.random() * connected.length)];
    const v = unconnected.pop();
    connected.push(v);
    const k = u < v ? `${u}-${v}` : `${v}-${u}`;
    edgeSet.add(k);
    edges.push({ u: u < v ? u : v, v: u < v ? v : u, weight: calcWeight(u, v) });
  }

  const extraEdges = Math.floor(count * 0.8);
  for (let i = 0; i < extraEdges; i++) {
    const u = labels[Math.floor(Math.random() * count)];
    const v = labels[Math.floor(Math.random() * count)];
    if (u !== v) {
      const k = u < v ? `${u}-${v}` : `${v}-${u}`;
      if (!edgeSet.has(k)) {
        edgeSet.add(k);
        edges.push({ u: u < v ? u : v, v: u < v ? v : u, weight: calcWeight(u, v) });
      }
    }
  }

  return { nodes, edges };
}

function randomFlowNetwork(numNodes = 10) {
  const count = Math.max(8, Math.min(14, numNodes));
  const chars = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
  const nodes = [{ id: "S", label: "S", x: 70, y: 160, type: "source" }];

  const internalCount = count - 2;
  const numLayers = Math.max(2, Math.min(4, Math.ceil(internalCount / 3)));
  const layers = [["S"]];
  let idx = 0;
  const xStep = 440 / (numLayers + 1);

  for (let l = 1; l <= numLayers; l++) {
    const layerNodes = [];
    const remainingLayers = numLayers - l + 1;
    const remainingNodes = internalCount - idx;
    const nInLayer = Math.max(1, Math.min(4, Math.round(remainingNodes / remainingLayers)));
    const yStep = 240 / (nInLayer + 1);
    for (let c = 0; c < nInLayer; c++) {
      const id = chars[idx++];
      const x = Math.round(70 + l * xStep);
      const y = Math.round(40 + (c + 1) * yStep);
      nodes.push({ id, label: id, x, y });
      layerNodes.push(id);
    }
    layers.push(layerNodes);
  }

  nodes.push({ id: "T", label: "T", x: 580, y: 160, type: "sink" });
  layers.push(["T"]);

  const edges = [];
  const edgeSet = new Set();

  for (let l = 0; l < layers.length - 1; l++) {
    const currLayer = layers[l];
    const nextLayer = layers[l + 1];
    for (const u of currLayer) {
      const v = nextLayer[Math.floor(Math.random() * nextLayer.length)];
      const cap = Math.floor(5 + Math.random() * 15);
      edges.push({ u, v, capacity: cap });
      edgeSet.add(`${u}-${v}`);
    }
    for (const v of nextLayer) {
      if (!edges.some((e) => e.v === v && currLayer.includes(e.u))) {
        const u = currLayer[Math.floor(Math.random() * currLayer.length)];
        if (!edgeSet.has(`${u}-${v}`)) {
          const cap = Math.floor(5 + Math.random() * 15);
          edges.push({ u, v, capacity: cap });
          edgeSet.add(`${u}-${v}`);
        }
      }
    }
  }

  return { source: "S", sink: "T", nodes, edges };
}

function randomPreferences(n = 6) {
  const count = Math.max(4, Math.min(8, n));
  const proposers = Array.from({ length: count }, (_, i) => `M${i + 1}`);
  const reviewers = Array.from({ length: count }, (_, i) => `W${i + 1}`);

  const pPrefs = {};
  for (const p of proposers) {
    pPrefs[p] = [...reviewers].sort(() => Math.random() - 0.5);
  }
  const rPrefs = {};
  for (const r of reviewers) {
    rPrefs[r] = [...proposers].sort(() => Math.random() - 0.5);
  }
  return { proposers: pPrefs, reviewers: rPrefs };
}

function randomTree(numNodes = 15) {
  const count = Math.max(8, Math.min(24, numNodes));
  const vals = new Set();
  while (vals.size < count) {
    vals.add(Math.floor(10 + Math.random() * 89));
  }
  const sorted = [...vals].sort((a, b) => a - b);

  function build(lo, hi) {
    if (lo > hi) return null;
    const mid = Math.floor((lo + hi) / 2);
    const left = build(lo, mid - 1);
    const right = build(mid + 1, hi);
    const lh = left ? left.height : 0;
    const rh = right ? right.height : 0;
    return {
      val: sorted[mid],
      height: 1 + Math.max(lh, rh),
      bf: lh - rh,
      left,
      right,
    };
  }

  return build(0, sorted.length - 1);
}

function updateNodeSelects() {
  if (!currentGraph || !currentGraph.nodes) return;
  const nodes = currentGraph.nodes.map((n) => n.id);
  const curStart = els.startNodeSelect.value || nodes[0];
  const curTarget = els.targetNodeSelect.value || nodes[nodes.length - 1];

  els.startNodeSelect.innerHTML = "";
  els.targetNodeSelect.innerHTML = "";

  for (const n of nodes) {
    const opt1 = document.createElement("option");
    opt1.value = n;
    opt1.textContent = n;
    els.startNodeSelect.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = n;
    opt2.textContent = n;
    els.targetNodeSelect.appendChild(opt2);
  }

  els.startNodeSelect.value = nodes.includes(curStart) ? curStart : nodes[0];
  els.targetNodeSelect.value = nodes.includes(curTarget) ? curTarget : nodes[nodes.length - 1];
  graphRenderer.startNode = els.startNodeSelect.value;
  graphRenderer.targetNode = els.targetNodeSelect.value;
}

function randomize() {
  const isMatching = currentAlgo?.category === "matching";
  const isGraph = currentAlgo?.category === "graph";
  const isTree = currentAlgo?.category === "tree";
  const isFlow = currentAlgo?.category === "flow";
  const name = currentAlgo?.name;

  player.frames = [];
  player.index = -1;
  player.playing = false;
  setPlayLabel();

  if (name === "fractional_knapsack") {
    const count = 6;
    const items = [];
    let totW = 0;
    for (let i = 0; i < count; i++) {
      const w = 5 + Math.floor(Math.random() * 25);
      const v = 20 + Math.floor(Math.random() * 120);
      totW += w;
      items.push({ id: String.fromCharCode(65 + i), weight: w, value: v, ratio: +(v / w).toFixed(2), status: "pending" });
    }
    const cap = Math.round(totW * 0.55);
    currentCustomData = { capacity: cap, items };
    greedyRenderer.render({ items, gauge: { current_weight: 0, max_capacity: cap, total_value: 0 } });
    els.status.textContent = `Randomized ${count} knapsack items (Capacity ${cap}) — press ${els.sort.textContent}`;
  } else if (name === "activity_selection") {
    const acts = [];
    for (let i = 0; i < 8; i++) {
      const s = Math.floor(Math.random() * 10);
      const dur = 2 + Math.floor(Math.random() * 5);
      acts.push({ id: `Act ${i + 1}`, start: s, end: s + dur, status: "pending" });
    }
    currentCustomData = acts;
    greedyRenderer.render({ intervals: acts });
    els.status.textContent = `Randomized 8 activity intervals — press ${els.sort.textContent}`;
  } else if (name === "job_sequencing") {
    currentCustomData = JSON.parse(JSON.stringify(DEFAULT_JOBS));
    greedyRenderer.render({ intervals: currentCustomData.map(j => ({ id: j.id, start: 0, end: j.deadline, status: "pending" })) });
    els.status.textContent = `Loaded 6 jobs — press ${els.sort.textContent}`;
  } else if (name === "knapsack_01") {
    currentCustomData = JSON.parse(JSON.stringify(DEFAULT_01_KNAPSACK));
    const items = currentCustomData.items;
    const cap = currentCustomData.capacity;
    const initialTable = Array.from({ length: items.length + 1 }, () => new Array(cap + 1).fill(0));
    dpRenderer.render({
      dp_table: initialTable,
      dp_row_labels: ["∅", ...items.map(it => `${it.id} (W:${it.weight},V:${it.value})`)],
      dp_col_labels: Array.from({ length: cap + 1 }, (_, c) => `C:${c}`),
      dp_title: `0-1 Knapsack DP Table (Capacity ${cap})`,
    });
    els.status.textContent = `0-1 Knapsack loaded (${items.length} items, Capacity ${cap}) — press ${els.sort.textContent}`;
  } else if (name === "lcs") {
    currentCustomData = ["ABCBDAB", "BDCABA"];
    const s1 = currentCustomData[0], s2 = currentCustomData[1];
    const initialTable = Array.from({ length: s1.length + 1 }, () => new Array(s2.length + 1).fill(0));
    dpRenderer.render({
      dp_table: initialTable,
      dp_row_labels: ["∅", ...s1.split("")],
      dp_col_labels: ["∅", ...s2.split("")],
      dp_title: `LCS Table: '${s1}' vs '${s2}'`,
    });
    els.status.textContent = `LCS loaded: '${s1}' vs '${s2}' — press ${els.sort.textContent}`;
  } else if (name === "min_path_sum") {
    currentCustomData = JSON.parse(JSON.stringify(DEFAULT_GRID_MATRIX));
    const m = currentCustomData.length;
    const n = currentCustomData[0].length;
    dpRenderer.render({
      dp_table: currentCustomData,
      dp_row_labels: currentCustomData.map((_, i) => `Row ${i}`),
      dp_col_labels: currentCustomData[0].map((_, j) => `Col ${j}`),
      dp_title: `Matrix Minimum Path Sum (${m} × ${n}) - Cost Grid`,
    });
    els.status.textContent = `Matrix Minimum Path loaded (${m} × ${n}) — press ${els.sort.textContent}`;
  } else if (name === "three_sum") {
    currentArray = [-4, -3, -2, -1, -1, 0, 1, 2, 3, 4];
    els.targetInput.value = "0";
    updateTargetChip();
    renderIdle();
    els.status.textContent = `3-Sum array loaded — press ${els.sort.textContent}`;
  } else if (name === "four_sum") {
    currentArray = [-3, -2, -1, -1, 0, 0, 1, 1, 2, 3];
    els.targetInput.value = "0";
    updateTargetChip();
    renderIdle();
    els.status.textContent = `4-Sum array loaded — press ${els.sort.textContent}`;
  } else if (name === "fibonacci") {
    const n = Number(els.sizeSlider.value) || 15;
    currentArray = new Array(n + 1).fill(0);
    renderIdle();
    els.status.textContent = `Fibonacci DP table size ${n} — press ${els.sort.textContent}`;
  } else if (name === "lis") {
    currentArray = [10, 22, 9, 33, 21, 50, 41, 60, 80];
    renderIdle();
    els.status.textContent = `LIS array loaded — press ${els.sort.textContent}`;
  } else if (name === "coin_change_greedy") {
    currentArray = [25, 10, 5, 1];
    els.targetInput.value = "67";
    updateTargetChip();
    renderIdle();
    els.status.textContent = `Greedy Coin Change for 67¢ — press ${els.sort.textContent}`;
  } else if (name === "coin_change_dp") {
    currentArray = [1, 2, 5, 10];
    els.targetInput.value = "18";
    updateTargetChip();
    renderIdle();
    els.status.textContent = `DP Coin Change for 18¢ — press ${els.sort.textContent}`;
  } else if (isMatching) {
    currentPreferences = randomPreferences(6);
    matchingRenderer.setPreferences(currentPreferences);
    els.status.textContent = `Randomized preferences (6 pairs) — press ${els.sort.textContent} to run`;
  } else if (isFlow) {
    const n = Math.min(14, Math.max(8, Math.round(Number(els.sizeSlider.value) / 7) || 10));
    currentNetwork = randomFlowNetwork(n);
    flowRenderer.setNetwork(currentNetwork);
    els.status.textContent = `Flow network loaded (${currentNetwork.nodes.length} nodes) — press ${els.sort.textContent} to run`;
  } else if (isTree) {
    if (currentAlgo.name === "avl_insert" || currentAlgo.name === "avl_delete") {
      currentTree = JSON.parse(JSON.stringify(DEFAULT_AVL_TREE));
    } else if (currentAlgo.name === "dsw_rebalance") {
      currentTree = JSON.parse(JSON.stringify(DEFAULT_UNBALANCED_TREE));
    } else if (currentAlgo.name === "rb_insert") {
      currentTree = JSON.parse(JSON.stringify(DEFAULT_RB_TREE));
    } else if (currentAlgo.name.startsWith("min_heap")) {
      currentTree = JSON.parse(JSON.stringify(DEFAULT_HEAP_TREE));
    } else {
      const n = Math.min(24, Math.max(8, Math.round(Number(els.sizeSlider.value)) || 15));
      currentTree = randomTree(n);
    }
    bstRenderer.setTree(currentTree);
    els.status.textContent = `Tree loaded (${currentAlgo.display_name}) — press ${els.sort.textContent} to run`;
  } else if (isGraph) {
    const n = Math.min(14, Math.max(8, Math.round(Number(els.sizeSlider.value) / 7) || 10));
    currentGraph = randomGraph(n);
    updateNodeSelects();
    graphRenderer.setGraph(currentGraph, els.startNodeSelect.value, els.targetNodeSelect.value);
    els.status.textContent = `${currentGraph.nodes.length} nodes, ${currentGraph.edges.length} edges — press ${els.sort.textContent} to run`;
  } else {
    const n = Number(els.sizeSlider.value);
    els.sizeLabel.textContent = String(n);
    currentArray = randomArray(n);
    renderIdle();
    updateTargetChip();
    els.status.textContent = `${n} elements — press ${els.sort.textContent} to run the algorithm`;
  }

  codePanel.highlight(null);
  els.statSteps.textContent = "0";
  els.statCompares.textContent = "0";
  els.statSwaps.textContent = "0";
}

// ---- Algorithm loading ---------------------------------------------------
function renderDescription(detail) {
  els.algoName.textContent = detail.display_name;
  const c = detail.complexity;
  const stability = detail.category === "sorting"
    ? ` · ${detail.stable ? "Stable" : "Unstable"}`
    : "";
  els.algoComplexity.textContent =
    `Best ${c.best} · Avg ${c.average} · Worst ${c.worst} · Space ${c.space}${stability}`;
  els.algoComplexity.title = "Time / space complexity";
  els.algoDesc.textContent = detail.description;
}

function updateTargetChip() {
  const isSearchOrTarget = currentAlgo && (
    currentAlgo.category === "searching" ||
    ["three_sum", "four_sum", "coin_change_greedy", "coin_change_dp", "fibonacci"].includes(currentAlgo.name)
  );
  if (isSearchOrTarget) {
    const v = Number(els.targetInput.value);
    currentTarget = Number.isNaN(v) ? (currentAlgo.name === "fibonacci" ? 15 : 0) : v;
    els.targetChip.textContent = currentAlgo.name === "fibonacci" ? `N: ${currentTarget}` : `Target: ${currentTarget}`;
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

  const is2DDP = ["knapsack_01", "lcs", "min_path_sum"].includes(detail.name);
  const isGreedyTimelineOrKnapsack = ["fractional_knapsack", "activity_selection", "job_sequencing"].includes(detail.name);
  const isHuffman = detail.name === "huffman_coding";
  const isMatching = detail.category === "matching";
  const isFlow = detail.category === "flow";
  const isTree = detail.category === "tree" || isHuffman;
  const isGraph = detail.category === "graph";
  const showTree = detail.name === "quick_sort" || detail.name === "merge_sort";
  const isSearchOrTarget = detail.category === "searching" || ["three_sum", "four_sum", "coin_change_greedy", "coin_change_dp", "fibonacci"].includes(detail.name);

  els.dpBox.classList.toggle("hidden", !is2DDP);
  els.greedyBox.classList.toggle("hidden", !isGreedyTimelineOrKnapsack);
  els.matchingBox.classList.toggle("hidden", !isMatching);
  els.flowBox.classList.toggle("hidden", !isFlow);
  els.bstBox.classList.toggle("hidden", !isTree);
  els.graphBox.classList.toggle("hidden", !isGraph);
  els.arrayBox.classList.toggle("hidden", isGraph || isTree || isFlow || isMatching || is2DDP || isGreedyTimelineOrKnapsack);
  els.barsBox.classList.toggle("hidden", isGraph || isTree || isFlow || isMatching || is2DDP || isGreedyTimelineOrKnapsack);
  els.treeBox.classList.toggle("hidden", isGraph || isTree || isFlow || isMatching || is2DDP || isGreedyTimelineOrKnapsack || !showTree);

  if (showTree && els.treeHeader) {
    els.treeHeader.textContent = `Recursion · ${detail.display_name}`;
  }

  els.targetGroup.classList.toggle("hidden", !isSearchOrTarget);
  els.startNodeGroup.classList.toggle("hidden", !isGraph);
  els.targetNodeGroup.classList.toggle("hidden", !isGraph || detail.name === "tsp");
  els.treeKeyGroup.classList.toggle("hidden", !isTree || isHuffman || detail.name === "dsw_rebalance" || detail.name === "min_heap_extract");

  // Specific view & preset initialization
  if (isTree && !isHuffman) {
    if (detail.name === "avl_insert") {
      els.sort.textContent = "Insert & Balance";
      els.treeKeyInput.value = "53";
      currentTree = JSON.parse(JSON.stringify(DEFAULT_AVL_TREE));
    } else if (detail.name === "avl_delete") {
      els.sort.textContent = "Delete & Balance";
      els.treeKeyInput.value = "25";
      currentTree = JSON.parse(JSON.stringify(DEFAULT_AVL_TREE));
    } else if (detail.name === "rb_insert") {
      els.sort.textContent = "Insert & Recolor";
      els.treeKeyInput.value = "40";
      currentTree = JSON.parse(JSON.stringify(DEFAULT_RB_TREE));
    } else if (detail.name === "min_heap_insert") {
      els.sort.textContent = "Insert & Sift-Up";
      els.treeKeyInput.value = "5";
      currentTree = JSON.parse(JSON.stringify(DEFAULT_HEAP_TREE));
    } else if (detail.name === "min_heap_extract") {
      els.sort.textContent = "Extract-Min";
      currentTree = JSON.parse(JSON.stringify(DEFAULT_HEAP_TREE));
    } else {
      els.sort.textContent = "Rebalance Tree";
      currentTree = JSON.parse(JSON.stringify(DEFAULT_UNBALANCED_TREE));
    }
    bstRenderer.setTree(currentTree);
  } else if (isHuffman) {
    els.sort.textContent = "Build Huffman Tree";
  } else if (isMatching) {
    els.sort.textContent = "Find Stable Matching";
    currentPreferences = DEFAULT_MATCHING_PREFS;
    matchingRenderer.setPreferences(currentPreferences);
  } else if (isFlow) {
    els.sort.textContent = "Find Max Flow";
    currentNetwork = DEFAULT_FLOW_NETWORK;
    flowRenderer.setNetwork(currentNetwork);
  } else if (isGraph) {
    els.sort.textContent = detail.name === "tsp" ? "Find Tour" : "Find Path";
    if (!currentGraph) {
      currentGraph = JSON.parse(JSON.stringify(DEFAULT_GRAPH));
    }
    updateNodeSelects();
    graphRenderer.setGraph(currentGraph, els.startNodeSelect.value, els.targetNodeSelect.value);
  } else if (detail.name === "fractional_knapsack") {
    els.sort.textContent = "Pack Knapsack";
  } else if (detail.name === "activity_selection") {
    els.sort.textContent = "Select Activities";
  } else if (detail.name === "job_sequencing") {
    els.sort.textContent = "Schedule Jobs";
  } else if (detail.name === "coin_change_greedy") {
    els.sort.textContent = "Make Change";
    els.targetInput.value = "67";
  } else if (detail.name === "knapsack_01") {
    els.sort.textContent = "Fill 0-1 Table";
  } else if (detail.name === "lcs") {
    els.sort.textContent = "Find LCS";
  } else if (detail.name === "min_path_sum") {
    els.sort.textContent = "Find Min Path";
  } else if (detail.name === "three_sum") {
    els.sort.textContent = "Find 3-Sum";
    els.targetInput.value = "0";
  } else if (detail.name === "four_sum") {
    els.sort.textContent = "Find 4-Sum";
    els.targetInput.value = "0";
  } else if (detail.name === "fibonacci") {
    els.sort.textContent = "Compute Fibonacci";
  } else if (detail.name === "lis") {
    els.sort.textContent = "Find LIS";
  } else if (detail.name === "coin_change_dp") {
    els.sort.textContent = "Min Coins DP";
    els.targetInput.value = "18";
  } else {
    els.sort.textContent = detail.category === "searching" ? "Search" : "Sort";
  }

  updateTargetChip();
  resizeViews();
  randomize();
}

// ---- Execution via WebSocket ---------------------------------------------
function startSort() {
  if (sortInFlight) return;

  const algo = currentAlgo || {};
  let arr = currentArray;
  let target = currentTarget;
  let start;
  let treeData = null;
  let keyVal = null;
  let netData = null;
  let matchData = null;
  let customData = currentCustomData;

  if (algo.name === "fractional_knapsack") customData = currentCustomData || DEFAULT_FRACT_KNAPSACK;
  else if (algo.name === "activity_selection") customData = currentCustomData || DEFAULT_ACTIVITIES;
  else if (algo.name === "job_sequencing") customData = currentCustomData || DEFAULT_JOBS;
  else if (algo.name === "knapsack_01") customData = currentCustomData || DEFAULT_01_KNAPSACK;
  else if (algo.name === "lcs") customData = currentCustomData || ["ABCBDAB", "BDCABA"];
  else if (algo.name === "min_path_sum") customData = currentCustomData || DEFAULT_GRID_MATRIX;
  else if (algo.category === "matching") matchData = currentPreferences || DEFAULT_MATCHING_PREFS;
  else if (algo.category === "flow") netData = currentNetwork || DEFAULT_FLOW_NETWORK;
  else if (algo.category === "tree") {
    treeData = currentTree;
    keyVal = Number(els.treeKeyInput.value) || (algo.name === "avl_insert" ? 53 : 25);
  } else if (algo.category === "graph") {
    start = els.startNodeSelect.value || "A";
    target = algo.name === "tsp" ? null : (els.targetNodeSelect.value || "J");
    graphRenderer.startNode = start;
    graphRenderer.targetNode = target;
    graphRenderer.render();
  } else {
    if (algo.needs_sorted_input) {
      arr = [...currentArray].sort((a, b) => a - b);
      currentArray = arr;
      renderIdle();
    }
  }

  sortInFlight = true;
  els.sort.disabled = true;
  const originalText = els.sort.textContent;
  els.sort.textContent = "Running…";
  player.pause();
  setPlayLabel();
  els.status.textContent = `Running ${algo.display_name}…`;

  const myId = ++requestId;
  api.requestSort(
    els.algoSelect.value,
    (algo.category === "graph" || algo.category === "tree" || algo.category === "flow" || algo.category === "matching" || ["knapsack_01", "lcs", "min_path_sum", "fractional_knapsack", "activity_selection", "job_sequencing", "huffman_coding"].includes(algo.name)) ? null : arr,
    myId,
    target,
    algo.category === "graph" ? currentGraph : null,
    start,
    treeData,
    keyVal,
    netData,
    matchData,
    customData
  ).catch((err) => {
    sortInFlight = false;
    els.sort.disabled = false;
    els.sort.textContent = originalText;
    els.status.textContent = `Connection error: ${err.message}`;
  });
}

function resetSortButton() {
  const algo = currentAlgo || {};
  const isMatching = algo.category === "matching";
  const isFlow = algo.category === "flow";
  const isTree = algo.category === "tree";
  const isGraph = algo.category === "graph";
  const isHuffman = algo.name === "huffman_coding";

  if (algo.name === "fractional_knapsack") els.sort.textContent = "Pack Knapsack";
  else if (algo.name === "activity_selection") els.sort.textContent = "Select Activities";
  else if (algo.name === "job_sequencing") els.sort.textContent = "Schedule Jobs";
  else if (isHuffman) els.sort.textContent = "Build Huffman Tree";
  else if (algo.name === "coin_change_greedy") els.sort.textContent = "Make Change";
  else if (algo.name === "knapsack_01") els.sort.textContent = "Fill 0-1 Table";
  else if (algo.name === "lcs") els.sort.textContent = "Find LCS";
  else if (algo.name === "min_path_sum") els.sort.textContent = "Find Min Path";
  else if (algo.name === "three_sum") els.sort.textContent = "Find 3-Sum";
  else if (algo.name === "four_sum") els.sort.textContent = "Find 4-Sum";
  else if (algo.name === "fibonacci") els.sort.textContent = "Compute Fibonacci";
  else if (algo.name === "lis") els.sort.textContent = "Find LIS";
  else if (algo.name === "coin_change_dp") els.sort.textContent = "Min Coins DP";
  else if (isMatching) els.sort.textContent = "Find Stable Matching";
  else if (isFlow) els.sort.textContent = "Find Max Flow";
  else if (isGraph) els.sort.textContent = algo.name === "tsp" ? "Find Tour" : "Find Path";
  else if (isTree) {
    if (algo.name === "avl_insert") els.sort.textContent = "Insert & Balance";
    else if (algo.name === "avl_delete") els.sort.textContent = "Delete & Balance";
    else if (algo.name === "rb_insert") els.sort.textContent = "Insert & Recolor";
    else if (algo.name === "min_heap_insert") els.sort.textContent = "Insert & Sift-Up";
    else if (algo.name === "min_heap_extract") els.sort.textContent = "Extract-Min";
    else els.sort.textContent = "Rebalance Tree";
  } else {
    els.sort.textContent = algo.category === "searching" ? "Search" : "Sort";
  }
}

api.onResult = (msg) => {
  if (msg.request_id !== requestId) return;
  sortInFlight = false;
  els.sort.disabled = false;
  resetSortButton();

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
  resetSortButton();
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
  });

  els.startNodeSelect.addEventListener("change", () => {
    graphRenderer.startNode = els.startNodeSelect.value;
    graphRenderer.render();
  });

  els.targetNodeSelect.addEventListener("change", () => {
    graphRenderer.targetNode = els.targetNodeSelect.value;
    graphRenderer.render();
  });

  graphRenderer.onGraphChange = (updatedGraph) => {
    currentGraph = updatedGraph;
  };

  flowRenderer.onNetworkChange = (updatedNet) => {
    currentNetwork = updatedNet;
  };

  els.sizeSlider.addEventListener("input", () => {
    els.sizeLabel.textContent = els.sizeSlider.value;
    if (!sortInFlight) randomize();
  });

  els.speedSlider.addEventListener("input", () => {
    applySpeed(els.speedSlider.value);
  });

  els.speedInput.addEventListener("input", () => {
    const raw = els.speedInput.value.trim();
    if (raw === "") return;
    const v = Number(raw);
    if (!Number.isFinite(v)) return;
    player.setSpeed(v);
    els.speedLabel.textContent = String(v);
  });
  els.speedInput.addEventListener("change", () => {
    applySpeed(els.speedInput.value);
  });

  els.randomize.addEventListener("click", () => {
    player.pause();
    randomize();
  });

  els.targetInput.addEventListener("input", () => {
    updateTargetChip();
  });

  els.treeKeyInput?.addEventListener("input", () => {
    if (els.treeKeyLabel) els.treeKeyLabel.textContent = els.treeKeyInput.value;
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

  const categories = [
    { key: "sorting", label: "Sorting" },
    { key: "searching", label: "Searching" },
    { key: "greedy", label: "Greedy Algorithms" },
    { key: "dp", label: "Dynamic Programming" },
    { key: "matching", label: "Stable Matching (Gale-Shapley)" },
    { key: "graph", label: "Graph Algorithms" },
    { key: "tree", label: "Binary Search Trees & AVL" },
    { key: "flow", label: "Network Flow Algorithms" },
  ];

  for (const cat of categories) {
    const group = algorithms.filter((a) => a.category === cat.key);
    if (!group.length) continue;
    const optGroup = document.createElement("optgroup");
    optGroup.label = cat.label;
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
}

init().catch((err) => {
  els.status.textContent = `Failed to initialize: ${err.message}`;
});
