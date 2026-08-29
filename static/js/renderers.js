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
  if (fill === COMPARE_COLOR || fill === MARK_COLOR) return "#16181d";
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
  }
}

