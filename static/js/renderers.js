// Renderers for the two visualization panels.
//
// Contract implemented by both renderers:
//   render(curr, prev, progress, sortedFlags)
//     curr         - the frame currently displayed (the transition target)
//     prev         - the previous frame, or null for the very first frame
//     progress     - 0..1 interpolation factor INTO `curr` (1 = fully at curr)
//     sortedFlags  - Set of indices permanently sorted (rendered green)
//
// Only transitions INTO "swap" frames move anything: the swapped elements
// slide between their old and new slots. All other frames render instantly,
// so compare / mark / sorted highlights never lag the code panel.

const PAD = 10;

const SWAP_COLOR = "#f85149";
const COMPARE_COLOR = "#e3b341";
const MARK_COLOR = "#bc8cff";
const SORTED_COLOR = "#3fb950";
const PIVOT_COLOR = "#ff9f43";
const RANGE_MID_COLOR = "#58a6ff";
const BASE_FILL = "#1d2536";
const BASE_STROKE = "#4a5568";
const TEXT_COLOR = "#e6edf3";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;

// Per-slot slide map for the transition INTO `curr` from `prev`.
// entry[d] = { from, to }: destination slot d is filled by the element that
// sat at slot `from` in `prev`, sliding to slot `to` (= d) in `curr`.
function slideMap(prev, curr) {
  const n = curr ? curr.array.length : 0;
  const map = [];
  for (let d = 0; d < n; d++) map.push({ from: d, to: d });
  if (prev && curr && curr.type === "swap" && curr.indices.length === 2) {
    const [p, q] = curr.indices;
    if (p !== q) {
      map[p] = { from: q, to: p };
      map[q] = { from: p, to: q };
    }
  }
  return map;
}

// Event-highlight color for a slot, or null for the base style.
function slotColor(type, highlighted, sorted) {
  if (sorted) return SORTED_COLOR;
  if (!highlighted) return null;
  if (type === "swap") return SWAP_COLOR;
  if (type === "compare") return COMPARE_COLOR;
  if (type === "mark") return MARK_COLOR;
  if (type === "pivot") return PIVOT_COLOR;
  if (type === "range") return RANGE_MID_COLOR;
  if (type === "found") return SORTED_COLOR;
  return null;
}

// Value-scaled teal-blue gradient used for the bars' default fill.
function barColor(value, max) {
  const t = max > 0 ? value / max : 0;
  const r = Math.round(56 + 70 * t);
  const g = Math.round(139 + 46 * t);
  const b = Math.round(253 - 130 * t);
  return `rgb(${r},${g},${b})`;
}

function textColor(fill) {
  if (!fill) return TEXT_COLOR;
  if (fill === COMPARE_COLOR || fill === MARK_COLOR || fill === PIVOT_COLOR) return "#16181d";
  return "#ffffff";
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Curved arrow with an arrowhead, drawn above the active elements.
function drawArrow(ctx, x1, x2, y, color) {
  const cx = (x1 + x2) / 2;
  const dy = 18;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.quadraticCurveTo(cx, y - dy, x2, y);
  ctx.stroke();
  const ang = Math.atan2(dy, x2 - cx);
  const head = 8;
  ctx.beginPath();
  ctx.moveTo(x2, y);
  ctx.lineTo(x2 - head * Math.cos(ang - 0.35), y - head * Math.sin(ang - 0.35));
  ctx.lineTo(x2 - head * Math.cos(ang + 0.35), y - head * Math.sin(ang + 0.35));
  ctx.closePath();
  ctx.fill();
}

// Small upward-pointing triangle used as a lo/hi range marker.
function chevronUp(ctx, x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x - size, y + size);
  ctx.lineTo(x + size, y + size);
  ctx.lineTo(x, y - size * 0.4);
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Bars view: the classic value-bar graph (kept as a secondary overview).
// ---------------------------------------------------------------------------
export class BarRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this._resize = this.resize.bind(this);
    window.addEventListener("resize", this._resize);
    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const parent = this.canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : { width: 640, height: 200 };
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._w = width;
    this._h = height;
  }

  render(curr, prev, progress, sortedFlags) {
    const ctx = this.ctx;
    const w = this._w;
    const h = this._h;
    ctx.clearRect(0, 0, w, h);

    const array = curr.array;
    const n = array.length;
    if (n === 0) return;

    const max = Math.max(...array);
    const gap = n > 60 ? 1 : n > 20 ? 2 : 3;
    const barW = Math.max(1, (w - PAD * 2) / n - gap);
    const slotX = (i) => PAD + i * (barW + gap);
    const usableH = h - 34;
    const baseY = h - 4;

    const map = slideMap(prev, curr);
    const highlighted = new Set(curr.indices);
    const type = curr.type;

    for (let d = 0; d < n; d++) {
      const { from } = map[d];
      const x = lerp(slotX(from), slotX(d), progress);
      const value = array[d];
      const barH = Math.max(2, (value / max) * usableH);
      const y = baseY - barH;

      const color = slotColor(type, highlighted.has(d), sortedFlags.has(d))
        ?? barColor(value, max);

      ctx.fillStyle = color;
      ctx.fillRect(x, y, barW, barH);

      if (n <= 22) {
        ctx.fillStyle = "#d7dce3";
        ctx.font = "11px Consolas, monospace";
        ctx.textAlign = "center";
        ctx.fillText(String(value), x + barW / 2, y - 4);
      }
    }

    if ((type === "compare" || type === "swap") && curr.indices.length >= 2) {
      const [i, j] = curr.indices;
      if (i !== j) {
        const x1 = lerp(slotX(map[i].from), slotX(i), progress) + barW / 2;
        const x2 = lerp(slotX(map[j].from), slotX(j), progress) + barW / 2;
        drawArrow(ctx, x1, x2, 16, type === "swap" ? SWAP_COLOR : COMPARE_COLOR);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Array view: a row of boxes with numbers, highlights and slide animations.
// ---------------------------------------------------------------------------
export class ArrayRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this._resize = this.resize.bind(this);
    window.addEventListener("resize", this._resize);
    this.resize();
    this.target = null;
  }

  setTarget(value) {
    this.target = value;
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const parent = this.canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : { width: 640, height: 240 };
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._w = width;
    this._h = height;
  }

  render(curr, prev, progress, sortedFlags) {
    const ctx = this.ctx;
    const w = this._w;
    const h = this._h;
    ctx.clearRect(0, 0, w, h);

    const array = curr.array;
    const n = array.length;
    if (n === 0) return;

    const gap = n > 40 ? 2 : 8;
    const boxW = Math.min(84, Math.max(8, (w - PAD * 2 - (n - 1) * gap) / n));
    const boxH = clamp(h * 0.52, 34, 84);
    const total = n * boxW + (n - 1) * gap;
    const startX = PAD + Math.max(0, (w - PAD * 2 - total) / 2);
    const top = (h - boxH) / 2;
    const slotX = (i) => startX + i * (boxW + gap);

    const map = slideMap(prev, curr);
    const highlighted = new Set(curr.indices);
    const type = curr.type;
    const showNumbers = boxW >= 30;
    const fontSize = clamp(Math.floor(boxW * 0.4), 11, 22);

    // Active subarray / search-range overlay (quick sort, binary search).
    if (Array.isArray(curr.range) && curr.range.length === 2) {
      const [rlo, rhi] = curr.range;
      const x0 = slotX(rlo) - gap / 2;
      const x1 = slotX(rhi) + boxW + gap / 2;
      ctx.fillStyle = "rgba(88, 166, 255, 0.07)";
      ctx.fillRect(x0, top - 4, x1 - x0, boxH + 8);
      ctx.fillStyle = "rgba(88, 166, 255, 0.55)";
      ctx.fillRect(x0, top - 3, 2, boxH + 6);
      ctx.fillRect(x1 - 2, top - 3, 2, boxH + 6);
      // lo / hi markers below the boxes.
      ctx.fillStyle = "rgba(88, 166, 255, 0.9)";
      chevronUp(ctx, slotX(rlo) + boxW / 2, top + boxH + 4, 6);
      chevronUp(ctx, slotX(rhi) + boxW / 2, top + boxH + 4, 6);
    }

    for (let d = 0; d < n; d++) {
      const { from } = map[d];
      const x = lerp(slotX(from), slotX(d), progress);

      const color = slotColor(type, highlighted.has(d), sortedFlags.has(d));

      ctx.fillStyle = color || BASE_FILL;
      ctx.strokeStyle = color || BASE_STROKE;
      ctx.lineWidth = color ? 2.5 : 1.5;
      roundRect(ctx, x, top, boxW, boxH, 6);
      ctx.fill();
      ctx.stroke();

      if (showNumbers) {
        ctx.fillStyle = textColor(color);
        ctx.font = `${fontSize}px Consolas, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(array[d]), x + boxW / 2, top + boxH / 2 + 1);
      }
    }

    if ((type === "compare" || type === "swap") && curr.indices.length >= 2) {
      const [i, j] = curr.indices;
      if (i !== j) {
        const x1 = lerp(slotX(map[i].from), slotX(i), progress) + boxW / 2;
        const x2 = lerp(slotX(map[j].from), slotX(j), progress) + boxW / 2;
        drawArrow(ctx, x1, x2, Math.max(8, top - 14),
                  type === "swap" ? SWAP_COLOR : COMPARE_COLOR);
      }
    }

    // Target badge (searching algorithms).
    if (this.target != null) {
      const label = `target: ${this.target}`;
      ctx.font = "11px Consolas, monospace";
      const tw = Math.round(ctx.measureText(label).width) + 16;
      const bx = w - tw - 8;
      const by = 6;
      ctx.fillStyle = "rgba(22, 27, 34, 0.9)";
      roundRect(ctx, bx, by, tw, 20, 10);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 159, 67, 0.6)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#ff9f43";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(label, bx + 8, by + 10);
    }
  }
}

// ---------------------------------------------------------------------------
// Recursion tree: the quick-sort divide-and-conquer structure.
//
// Every node is a subarray [lo..hi] drawn as a segment at its recursion
// depth. Partitions split a node into two children; pivot positions are
// marked with an orange tick; the currently-processed range is highlighted;
// ranges whose elements are all permanently sorted turn green.
// ---------------------------------------------------------------------------
export class TreeRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this._resize = this.resize.bind(this);
    window.addEventListener("resize", this._resize);
    this.resize();
    this._frames = null;
    this._builtUpTo = -1;
    this._tree = null;
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const parent = this.canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : { width: 640, height: 180 };
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._w = width;
    this._h = height;
  }

  render(frames, index, sortedFlags) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this._w, this._h);
    if (!frames || frames.length === 0 || index < 0) {
      this._frames = null;
      this._builtUpTo = -1;
      this._tree = null;
      return;
    }

    if (this._frames !== frames) {
      this._frames = frames;
      this._builtUpTo = -1;
      this._tree = null;
    }
    if (index < this._builtUpTo) {
      // Scrubbed backwards: rebuild the tree from scratch.
      this._builtUpTo = -1;
      this._tree = null;
    }
    if (!this._tree) {
      const n = frames[0] ? frames[0].array.length : 0;
      if (!n) return;
      this._tree = { lo: 0, hi: n - 1, children: [], pivot: null };
      this._builtUpTo = -1;
    }

    // Incrementally apply frames up to the current index.
    while (this._builtUpTo < index && this._builtUpTo < frames.length - 1) {
      this._builtUpTo += 1;
      this.applyFrame(frames[this._builtUpTo]);
    }

    const cur = frames[Math.min(index, frames.length - 1)];
    let activeNode = null;
    if (cur && cur.range) {
      activeNode = this.find(this._tree, cur.range[0], cur.range[1]);
    }
    this.drawTree(this._tree, this._w, this._h, sortedFlags, activeNode);
  }

  find(node, lo, hi) {
    if (node.lo === lo && node.hi === hi) return node;
    for (const child of node.children) {
      const hit = this.find(child, lo, hi);
      if (hit) return hit;
    }
    return null;
  }

  applyFrame(f) {
    if (!f.range) return;
    const node = this.find(this._tree, f.range[0], f.range[1]);
    if (!node) return;
    if (f.type === "partition" && Array.isArray(f.children) && f.children.length === 2) {
      node.children = f.children
        .map(([a, b]) => ({ lo: a, hi: b, children: [], pivot: null }))
        .filter((c) => c.lo <= c.hi);
    }
    if (f.type === "pivot") node.pivot = f.indices[0];
  }

  drawTree(tree, w, h, sortedFlags, activeNode) {
    const ctx = this.ctx;
    const n = tree.hi - tree.lo + 1;
    if (!n) return;

    let maxDepth = 0;
    const markDone = (node, depth) => {
      maxDepth = Math.max(maxDepth, depth);
      if (node.children.length) {
        node.done = node.children.every((c) => markDone(c, depth + 1));
      } else {
        node.done = true;
        for (let k = node.lo; k <= node.hi; k++) {
          if (!sortedFlags.has(k)) { node.done = false; break; }
        }
      }
      return node.done;
    };
    markDone(tree, 0);

    const padX = 18;
    const padTop = 12;
    const padBottom = 18;
    const availW = Math.max(50, w - padX * 2);
    const availH = Math.max(30, h - padTop - padBottom);
    const levelH = maxDepth > 0 ? Math.min(30, availH / (maxDepth + 1)) : availH;
    const barH = Math.max(6, levelH * 0.52);
    const yOf = (depth) => padTop + depth * levelH;
    const slotX = (lo, hi) => padX + (lo / n) * availW;
    const slotW = (lo, hi) => ((hi - lo + 1) / n) * availW;

    // Edges (parent -> children).
    const drawEdges = (node, depth) => {
      if (!node.children.length) return;
      const px = slotX(node.lo, node.hi) + slotW(node.lo, node.hi) / 2;
      const py = yOf(depth) + barH;
      ctx.strokeStyle = "rgba(139,148,158,0.35)";
      ctx.lineWidth = 1;
      for (const child of node.children) {
        const cx = slotX(child.lo, child.hi) + slotW(child.lo, child.hi) / 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(cx, yOf(depth + 1));
        ctx.stroke();
        drawEdges(child, depth + 1);
      }
    };
    drawEdges(tree, 0);

    // Nodes.
    const drawNode = (node, depth) => {
      const x = slotX(node.lo, node.hi);
      const sw = Math.max(4, slotW(node.lo, node.hi));
      const y = yOf(depth);
      const active = node === activeNode;

      ctx.fillStyle = node.done
        ? "rgba(63,185,80,0.30)"
        : active
          ? "rgba(88,166,255,0.75)"
          : "#21262d";
      ctx.strokeStyle = node.done ? SORTED_COLOR : active ? "#58a6ff" : "#484f58";
      ctx.lineWidth = active ? 2 : 1;
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, sw, barH, 3);
      else ctx.rect(x, y, sw, barH);
      ctx.fill();
      ctx.stroke();

      if (sw >= 36) {
        ctx.fillStyle = node.done ? SORTED_COLOR : active ? "#ffffff" : "#8b949e";
        ctx.font = "10px Consolas, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`[${node.lo}..${node.hi}]`, x + sw / 2, y + barH / 2);
      }

      if (node.pivot != null) {
        const rel = (node.pivot - node.lo) / Math.max(1, node.hi - node.lo + 1);
        ctx.fillStyle = PIVOT_COLOR;
        ctx.fillRect(x + rel * sw - 1.5, y - 3, 3, barH + 6);
      }

      node.children.forEach((c) => drawNode(c, depth + 1));
    };
    drawNode(tree, 0);

    // Legend.
    ctx.font = "10px Consolas, monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const ly = h - 15;
    ctx.fillStyle = PIVOT_COLOR;
    ctx.fillRect(padX, ly, 9, 9);
    ctx.fillStyle = "#8b949e";
    ctx.fillText("pivot", padX + 13, ly - 1);
    ctx.fillStyle = "#58a6ff";
    ctx.fillRect(padX + 57, ly, 9, 9);
    ctx.fillStyle = "#8b949e";
    ctx.fillText("active", padX + 70, ly - 1);
    ctx.fillStyle = SORTED_COLOR;
    ctx.fillRect(padX + 112, ly, 9, 9);
    ctx.fillStyle = "#8b949e";
    ctx.fillText("done", padX + 125, ly - 1);
  }
}

