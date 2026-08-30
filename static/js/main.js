// Bootstrap: wire up the API client, renderers, code panel, playback engine
// and toolbar controls.

import { APIClient } from "./api.js";
import { ArrayRenderer, BarRenderer, TreeRenderer } from "./renderers.js";
import { GraphRenderer } from "./graphRenderer.js";
import { BSTRenderer } from "./bstRenderer.js";
import { FlowRenderer } from "./flowRenderer.js";
import { MatchingRenderer } from "./matchingRenderer.js";
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
let requestId = 0;
let sortInFlight = false;
let algoMeta = {};        // name -> metadata from /api/algorithms
let currentAlgo = null;   // metadata of the selected algorithm
let currentTarget = null; // search target value

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
    {"id": "S", "label": "S", "x": 70, "y": 160, "type": "source"},
    {"id": "A", "label": "A", "x": 200, "y": 65},
    {"id": "B", "label": "B", "x": 200, "y": 160},
    {"id": "C", "label": "C", "x": 200, "y": 255},
    {"id": "D", "label": "D", "x": 340, "y": 65},
    {"id": "E", "label": "E", "x": 340, "y": 160},
    {"id": "F", "label": "F", "x": 340, "y": 255},
    {"id": "G", "label": "G", "x": 470, "y": 100},
    {"id": "H", "label": "H", "x": 470, "y": 220},
    {"id": "T", "label": "T", "x": 580, "y": 160, "type": "sink"},
  ],
  edges: [
    {"u": "S", "v": "A", "capacity": 12},
    {"u": "S", "v": "B", "capacity": 8},
    {"u": "S", "v": "C", "capacity": 14},
    {"u": "A", "v": "D", "capacity": 9},
    {"u": "A", "v": "E", "capacity": 4},
    {"u": "A", "v": "B", "capacity": 3},
    {"u": "B", "v": "D", "capacity": 3},
    {"u": "B", "v": "E", "capacity": 7},
    {"u": "B", "v": "F", "capacity": 4},
    {"u": "C", "v": "E", "capacity": 5},
    {"u": "C", "v": "F", "capacity": 11},
    {"u": "D", "v": "G", "capacity": 10},
    {"u": "D", "v": "E", "capacity": 4},
    {"u": "E", "v": "G", "capacity": 6},
    {"u": "E", "v": "H", "capacity": 8},
    {"u": "E", "v": "F", "capacity": 2},
    {"u": "F", "v": "H", "capacity": 10},
    {"u": "G", "v": "T", "capacity": 16},
    {"u": "H", "v": "T", "capacity": 15},
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
      right: { val: 43, color: "RED", height: 1, bf: 0, left: null, right: null },
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

// ---- Playback engine -----------------------------------------------------
const player = new Player((frame, prev, progress, sortedFlags) => {
  if (currentAlgo?.category === "matching") {
    matchingRenderer.render(frame);
  } else if (currentAlgo?.category === "flow") {
    flowRenderer.render(frame);
  } else if (currentAlgo?.category === "tree") {
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
    els.status.textContent = "Sorting complete ✓";
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
  if (currentAlgo?.category === "matching") {
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

  const targetEdges = Math.min((count * (count - 1)) / 2, Math.round(count * 1.8));
  let attempts = 0;
  while (edges.length < targetEdges && attempts < 100) {
    attempts++;
    const i1 = Math.floor(Math.random() * count);
    const i2 = Math.floor(Math.random() * count);
    if (i1 === i2) continue;
    const u = labels[i1], v = labels[i2];
    const k = u < v ? `${u}-${v}` : `${v}-${u}`;
    if (!edgeSet.has(k)) {
      edgeSet.add(k);
      edges.push({ u: u < v ? u : v, v: u < v ? v : u, weight: calcWeight(u, v) });
    }
  }

  return { nodes, edges };
}

function randomFlowNetwork(numNodes = 10) {
  const count = Math.max(8, Math.min(14, numNodes));
  const middleCount = count - 2;
  const numLayers = count >= 10 ? 4 : 3;
  const nodesPerLayer = Math.max(2, Math.floor(middleCount / (numLayers - 1)));

  const nodes = [{ id: "S", label: "S", x: 70, y: 160, type: "source" }];
  const layers = [["S"]];
  const chars = Array.from({ length: middleCount }, (_, i) => String.fromCharCode(65 + i));
  let idx = 0;

  const xStep = 490 / numLayers;
  for (let l = 1; l < numLayers; l++) {
    const layerNodes = [];
    const nInLayer = l < numLayers - 1 ? Math.min(nodesPerLayer, chars.length - idx) : chars.length - idx;
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
  player.frames = [];
  player.index = -1;
  player.playing = false;
  setPlayLabel();

  if (isMatching) {
    currentPreferences = randomPreferences(6);
    matchingRenderer.setPreferences(currentPreferences);
    els.status.textContent = `Randomized preferences (6 pairs) — press ${els.sort.textContent} to run`;
  } else if (isFlow) {
    const n = Math.min(14, Math.max(8, Math.round(Number(els.sizeSlider.value) / 7) || 10));
    currentNetwork = randomFlowNetwork(n);
    flowRenderer.setNetwork(currentNetwork);
    els.status.textContent = `Flow network loaded (${currentNetwork.nodes.length} nodes) — press ${els.sort.textContent} to run`;
  } else if (isTree) {
    const n = Math.min(24, Math.max(8, Math.round(Number(els.sizeSlider.value)) || 15));
    if (currentAlgo.name === "dsw_rebalance") {
      currentTree = JSON.parse(JSON.stringify(DEFAULT_UNBALANCED_TREE));
    } else if (currentAlgo.name === "rb_insert") {
      currentTree = JSON.parse(JSON.stringify(DEFAULT_RB_TREE));
    } else if (currentAlgo.name.startsWith("min_heap")) {
      currentTree = JSON.parse(JSON.stringify(DEFAULT_HEAP_TREE));
    } else {
      currentTree = randomTree(n);
    }
    bstRenderer.setTree(currentTree);
    els.status.textContent = `Tree loaded — press ${els.sort.textContent} to run`;
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
    els.status.textContent = `${n} elements — press Sort to run the algorithm`;
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

  const isMatching = detail.category === "matching";
  const isFlow = detail.category === "flow";
  const isTree = detail.category === "tree";
  const isGraph = detail.category === "graph";
  const showTree = detail.name === "quick_sort" || detail.name === "merge_sort";
  const isSearch = detail.category === "searching";

  els.matchingBox.classList.toggle("hidden", !isMatching);
  els.flowBox.classList.toggle("hidden", !isFlow);
  els.bstBox.classList.toggle("hidden", !isTree);
  els.graphBox.classList.toggle("hidden", !isGraph);
  els.arrayBox.classList.toggle("hidden", isGraph || isTree || isFlow || isMatching);
  els.barsBox.classList.toggle("hidden", isGraph || isTree || isFlow || isMatching);
  els.treeBox.classList.toggle("hidden", isGraph || isTree || isFlow || isMatching || !showTree);

  if (showTree && els.treeHeader) {
    els.treeHeader.textContent = `Recursion · ${detail.display_name}`;
  }
  if (isGraph && els.graphHeader) {
    els.graphHeader.textContent = `Graph View · ${detail.display_name}`;
  }
  if (isTree && els.bstHeader) {
    els.bstHeader.textContent = `Binary Tree · ${detail.display_name}`;
  }
  if (isFlow && els.flowHeader) {
    els.flowHeader.textContent = `Network Flow · ${detail.display_name}`;
  }
  if (isMatching && els.matchingHeader) {
    els.matchingHeader.textContent = `Stable Matching · ${detail.display_name}`;
  }

  els.targetGroup.classList.toggle("hidden", !isSearch);
  els.startNodeGroup.classList.toggle("hidden", !isGraph);
  els.targetNodeGroup.classList.toggle("hidden", !isGraph || detail.name === "tsp");
  els.treeKeyGroup.classList.toggle("hidden", !isTree || detail.name === "dsw_rebalance" || detail.name === "min_heap_extract");

  if (isMatching) {
    els.sort.textContent = "Find Stable Matching";
    if (!currentPreferences) {
      currentPreferences = JSON.parse(JSON.stringify(DEFAULT_MATCHING_PREFS));
    }
    matchingRenderer.setPreferences(currentPreferences);
  } else if (isFlow) {
    els.sort.textContent = "Find Max Flow";
    if (!currentNetwork) {
      currentNetwork = JSON.parse(JSON.stringify(DEFAULT_FLOW_NETWORK));
    }
    flowRenderer.setNetwork(currentNetwork);
  } else if (isTree) {
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
  } else if (isGraph) {
    els.sort.textContent = detail.name === "tsp" ? "Find Tour" : "Find Path";
    if (!currentGraph) {
      currentGraph = JSON.parse(JSON.stringify(DEFAULT_GRAPH));
    }
    updateNodeSelects();
    graphRenderer.setGraph(currentGraph, els.startNodeSelect.value, els.targetNodeSelect.value);
  } else {
    els.sort.textContent = isSearch ? "Search" : "Sort";
  }

  updateTargetChip();
  resizeViews();
  randomize();
}

// ---- Execution via WebSocket ---------------------------------------------
function startSort() {
  if (sortInFlight) return;

  const algo = currentAlgo || {};
  const isMatching = algo.category === "matching";
  const isFlow = algo.category === "flow";
  const isTree = algo.category === "tree";
  const isGraph = algo.category === "graph";

  let arr = currentArray;
  let target;
  let start;
  let treeData = null;
  let keyVal = null;
  let netData = null;
  let matchData = null;

  if (isMatching) {
    matchData = currentPreferences || DEFAULT_MATCHING_PREFS;
  } else if (isFlow) {
    netData = currentNetwork || DEFAULT_FLOW_NETWORK;
  } else if (isTree) {
    treeData = currentTree;
    keyVal = Number(els.treeKeyInput.value) || 53;
  } else if (isGraph) {
    start = els.startNodeSelect.value || "A";
    target = algo.name === "tsp" ? null : (els.targetNodeSelect.value || "J");
    graphRenderer.startNode = start;
    graphRenderer.targetNode = target;
    graphRenderer.render();
  } else {
    if (currentArray.length === 0) return;
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
  }

  sortInFlight = true;
  els.sort.disabled = true;
  els.sort.textContent = "Running…";
  player.pause();
  setPlayLabel();
  els.status.textContent = `Running ${algo.display_name}…`;

  const myId = ++requestId;
  api.requestSort(
    els.algoSelect.value,
    (isGraph || isTree || isFlow || isMatching) ? null : arr,
    myId,
    target,
    isGraph ? currentGraph : null,
    start,
    isTree ? treeData : null,
    isTree ? keyVal : null,
    isFlow ? netData : null,
    isMatching ? matchData : null
  ).catch((err) => {
    sortInFlight = false;
    els.sort.disabled = false;
    els.sort.textContent = isMatching
      ? "Find Stable Matching"
      : (isFlow ? "Find Max Flow" : (isTree ? "Run" : (isGraph ? (algo.name === "tsp" ? "Find Tour" : "Find Path") : "Sort")));
    els.status.textContent = `Connection error: ${err.message}`;
  });
}

api.onResult = (msg) => {
  if (msg.request_id !== requestId) return;
  sortInFlight = false;
  els.sort.disabled = false;
  const isMatching = currentAlgo?.category === "matching";
  const isFlow = currentAlgo?.category === "flow";
  const isTree = currentAlgo?.category === "tree";
  const isGraph = currentAlgo?.category === "graph";

  if (isMatching) {
    els.sort.textContent = "Find Stable Matching";
  } else if (isFlow) {
    els.sort.textContent = "Find Max Flow";
  } else if (isTree) {
    els.sort.textContent = currentAlgo?.name === "avl_insert"
      ? "Insert & Balance"
      : (currentAlgo?.name === "avl_delete" ? "Delete & Balance" : "Run");
  } else if (isGraph) {
    els.sort.textContent = currentAlgo?.name === "tsp" ? "Find Tour" : "Find Path";
  } else {
    els.sort.textContent = currentAlgo?.category === "searching" ? "Search" : "Sort";
  }

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
  const isMatching = currentAlgo?.category === "matching";
  const isFlow = currentAlgo?.category === "flow";
  const isTree = currentAlgo?.category === "tree";
  const isGraph = currentAlgo?.category === "graph";
  els.sort.textContent = isMatching
    ? "Find Stable Matching"
    : (isFlow ? "Find Max Flow" : (isTree ? "Run" : (isGraph ? (currentAlgo?.name === "tsp" ? "Find Tour" : "Find Path") : "Sort")));
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

  for (const cat of ["sorting", "searching", "graph", "tree", "flow", "matching"]) {
    const group = algorithms.filter((a) => a.category === cat);
    if (!group.length) continue;
    const optGroup = document.createElement("optgroup");
    let label = "Sorting";
    if (cat === "searching") label = "Searching";
    else if (cat === "graph") label = "Graph Algorithms";
    else if (cat === "tree") label = "Binary Search Trees & AVL";
    else if (cat === "flow") label = "Network Flow Algorithms";
    else if (cat === "matching") label = "Stable Matching (Gale-Shapley)";
    optGroup.label = label;
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
