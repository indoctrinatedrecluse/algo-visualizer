// Canvas renderer: value bars + highlights + comparison/swap arrows.
//
// render(frame, sortedFlags)
//   frame:      { array, indices, type, message }
//   sortedFlags: Set of indices that are permanently sorted (green).

const ARROW_TOP = 26;   // y-position of the arrow baseline
const PAD_SIDE = 5;

function barColor(value, max) {
  // Teal -> blue gradient by relative value.
  const t = max > 0 ? value / max : 0;
  const r = Math.round(56 + 70 * t);
  const g = Math.round(139 + 46 * t);
  const b = Math.round(253 - 130 * t);
  return `rgb(${r},${g},${b})`;
}

export class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this._resize = this.resize.bind(this);
    window.addEventListener("resize", this._resize);
    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    const width = rect ? Math.max(1, rect.width) : 640;
    const height = rect ? Math.max(1, rect.height) : 400;
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._cssW = width;
    this._cssH = height;
  }

  render(frame, sortedFlags = new Set()) {
    const ctx = this.ctx;
    const w = this._cssW;
    const h = this._cssH;
    ctx.clearRect(0, 0, w, h);

    const { array, indices = [], type = "idle" } = frame;
    const n = array.length;
    if (n === 0) return;

    const max = Math.max(...array);
    const gap = n > 60 ? 1 : n > 20 ? 2 : 3;
    const barW = Math.max(1, (w - PAD_SIDE * 2) / n - gap);
    const usableH = h - ARROW_TOP - 10;
    const baseY = h - 4;

    const highlighted = new Set(indices);
    const isCompare = type === "compare";
    const isSwap = type === "swap";
    const isMark = type === "mark";

    for (let i = 0; i < n; i++) {
      const value = array[i];
      const barH = Math.max(2, (value / max) * usableH);
      const x = PAD_SIDE + i * (barW + gap);
      const y = baseY - barH;

      let color;
      if (sortedFlags.has(i)) color = "#3fb950";          // final position
      else if (isSwap && highlighted.has(i)) color = "#f85149";
      else if (isCompare && highlighted.has(i)) color = "#e3b341";
      else if (isMark && highlighted.has(i)) color = "#bc8cff";
      else color = barColor(value, max);

      ctx.fillStyle = color;
      ctx.fillRect(x, y, barW, barH);

      if (n <= 22) {
        ctx.fillStyle = "#d7dce3";
        ctx.font = "11px Consolas, monospace";
        ctx.textAlign = "center";
        ctx.fillText(String(value), x + barW / 2, y - 4);
      }
    }

    // Curved arrow between the two highlighted bars (compare / swap).
    if ((isCompare || isSwap) && indices.length >= 2 && indices[0] !== indices[1]) {
      const [i, j] = indices;
      this._drawArrow(
        PAD_SIDE + i * (barW + gap) + barW / 2,
        PAD_SIDE + j * (barW + gap) + barW / 2,
        isSwap ? "#f85149" : "#e3b341"
      );
    }
  }

  _drawArrow(x1, x2, color) {
    const ctx = this.ctx;
    const y = ARROW_TOP;
    const cx = (x1 + x2) / 2;
    const dy = 26; // arc height (baseline y -> control point y offset)

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.quadraticCurveTo(cx, y - dy, x2, y);
    ctx.stroke();

    const ang = Math.atan2(dy, x2 - cx);
    const head = 9;
    ctx.beginPath();
    ctx.moveTo(x2, y);
    ctx.lineTo(x2 - head * Math.cos(ang - 0.35), y - head * Math.sin(ang - 0.35));
    ctx.lineTo(x2 - head * Math.cos(ang + 0.35), y - head * Math.sin(ang + 0.35));
    ctx.closePath();
    ctx.fill();
  }
}
