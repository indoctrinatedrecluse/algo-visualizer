// Dedicated Greedy Timeline & Knapsack Gauge Canvas Renderer.
//
// Supports:
//  - Fractional Knapsack (Item ratio cards & Knapsack liquid fill bucket gauge).
//  - Activity Selection / Interval Scheduling (Horizontal timeline interval bars).
//  - Job Sequencing with Deadlines (Time slot allocation blocks).

export class GreedyRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.currentFrame = null;

    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(320, Math.floor(rect.width || 720));
    const h = Math.max(280, Math.floor(rect.height || 360));
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = w;
    this.height = h;
    this.draw();
  }

  render(frame = null) {
    this.currentFrame = frame;
    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    if (!ctx || !w || !h) return;

    // Clear background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, w, h);

    // Subtle background grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const items = this.currentFrame?.items;
    const intervals = this.currentFrame?.intervals;

    if (items && items.length) {
      this.drawKnapsack(items, w, h);
    } else if (intervals && intervals.length) {
      this.drawTimeline(intervals, w, h);
    } else {
      ctx.fillStyle = "#64748b";
      ctx.font = "14px monospace";
      ctx.textAlign = "center";
      ctx.fillText("No greedy items or intervals loaded", w / 2, h / 2);
    }
  }

  // --- Fractional Knapsack Mode ---
  drawKnapsack(items, w, h) {
    const ctx = this.ctx;
    const gauge = this.currentFrame?.gauge || { current_weight: 0, max_capacity: 50, total_value: 0 };
    const curW = gauge.current_weight || 0;
    const maxCap = gauge.max_capacity || 50;
    const totVal = gauge.total_value || 0;

    // Header
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, monospace";
    ctx.textAlign = "left";
    ctx.fillText("📦 Fractional Knapsack: Greedy Choice by Value/Weight Ratio", 20, 24);

    // 1. Draw Item Cards (Left side)
    const leftW = Math.floor(w * 0.58);
    const startY = 44;
    const cardH = Math.min(38, Math.floor((h - startY - 20) / items.length));
    const gapY = cardH + 4;

    items.forEach((it, idx) => {
      const cy = startY + idx * gapY;
      const isPacked = it.status === "packed";
      const isFractional = it.status === "fractional";
      const isSkipped = it.status === "skipped";

      let bgCol = "#0f172a";
      let borderCol = "#334155";
      let glow = null;

      if (isPacked) {
        bgCol = "#064e3b";
        borderCol = "#10b981";
      } else if (isFractional) {
        bgCol = "#451a03";
        borderCol = "#f59e0b";
        glow = "rgba(245, 158, 11, 0.6)";
      } else if (isSkipped) {
        bgCol = "#1e293b";
        borderCol = "#475569";
      }

      if (glow) {
        ctx.shadowColor = glow;
        ctx.shadowBlur = 8;
      }
      ctx.fillStyle = bgCol;
      ctx.strokeStyle = borderCol;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(20, cy, leftW - 30, cardH, 5);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Item ID Badge
      ctx.fillStyle = isPacked ? "#10b981" : (isFractional ? "#f59e0b" : "#38bdf8");
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`Item ${it.id}`, 32, cy + cardH / 2);

      // Weight & Value
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "11px monospace";
      ctx.fillText(`W: ${it.weight} · V: $${it.value}`, 95, cy + cardH / 2);

      // Ratio Pill
      const ratioX = leftW - 130;
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(ratioX, cy + 6, 65, cardH - 12, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`v/w: ${it.ratio}`, ratioX + 32, cy + cardH / 2);

      // Status Pill
      let statusText = "Pending";
      let statusCol = "#94a3b8";
      if (isPacked) { statusText = "100% Full"; statusCol = "#34d399"; }
      else if (isFractional) { statusText = `${Math.round(it.fraction * 100)}% Part`; statusCol = "#fbbf24"; }
      else if (isSkipped) { statusText = "Skipped"; statusCol = "#64748b"; }

      ctx.fillStyle = statusCol;
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "right";
      ctx.fillText(statusText, leftW - 40, cy + cardH / 2);
    });

    // 2. Draw Knapsack Bucket Gauge (Right side)
    const bucketX = leftW + 20;
    const bucketW = w - bucketX - 25;
    const bucketY = 44;
    const bucketH = h - 65;

    // Bucket Outline
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bucketX, bucketY, bucketW, bucketH, 8);
    ctx.fill();
    ctx.stroke();

    // Fill level
    const fillPercent = Math.min(1.0, maxCap > 0 ? curW / maxCap : 0);
    const fillH = Math.round((bucketH - 40) * fillPercent);
    const fillY = bucketY + bucketH - 15 - fillH;

    if (fillH > 0) {
      const grad = ctx.createLinearGradient(0, fillY + fillH, 0, fillY);
      grad.addColorStop(0, "rgba(16, 185, 129, 0.85)");
      grad.addColorStop(1, fillPercent >= 1.0 ? "rgba(245, 158, 11, 0.9)" : "rgba(56, 189, 248, 0.9)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(bucketX + 10, fillY, bucketW - 20, fillH, 4);
      ctx.fill();
    }

    // Gauge Metrics Overlay
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🎒 KNAPSACK", bucketX + bucketW / 2, bucketY + 20);

    ctx.fillStyle = fillPercent >= 1.0 ? "#fbbf24" : "#34d399";
    ctx.font = "bold 14px monospace";
    ctx.fillText(`Weight: ${curW.toFixed(0)} / ${maxCap.toFixed(0)}`, bucketX + bucketW / 2, bucketY + bucketH / 2 - 10);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 15px monospace";
    ctx.fillText(`Total Value: $${totVal.toFixed(2)}`, bucketX + bucketW / 2, bucketY + bucketH / 2 + 16);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px monospace";
    ctx.fillText(`Capacity Fill: ${Math.round(fillPercent * 100)}%`, bucketX + bucketW / 2, bucketY + bucketH - 24);
  }

  // --- Activity Selection / Job Scheduling Timeline Mode ---
  drawTimeline(intervals, w, h) {
    const ctx = this.ctx;
    const maxEnd = Math.max(12, ...intervals.map((a) => a.end));
    const leftMargin = 70;
    const rightMargin = 30;
    const timelineW = w - leftMargin - rightMargin;
    const startY = 50;
    const barH = Math.min(26, Math.floor((h - startY - 45) / intervals.length));
    const gapY = barH + 6;

    // Header
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, monospace";
    ctx.textAlign = "left";
    ctx.fillText("⏱ Activity Selection / Job Timeline (Greedy Scheduling)", 20, 24);

    // Time Axis Marks
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let t = 0; t <= maxEnd; t++) {
      const tx = leftMargin + Math.round((t / maxEnd) * timelineW);
      ctx.beginPath();
      ctx.moveTo(tx, startY - 10);
      ctx.lineTo(tx, h - 25);
      ctx.stroke();

      ctx.fillStyle = "#94a3b8";
      ctx.fillText(String(t), tx, startY - 18);
    }

    // Draw Interval Bars
    intervals.forEach((a, idx) => {
      const cy = startY + idx * gapY;
      const x1 = leftMargin + Math.round((a.start / maxEnd) * timelineW);
      const x2 = leftMargin + Math.round((a.end / maxEnd) * timelineW);
      const barW = Math.max(10, x2 - x1);

      const isSelected = a.status === "selected";
      const isRejected = a.status === "rejected";

      let fillCol = "#1e293b";
      let borderCol = "#475569";
      let glow = null;

      if (isSelected) {
        fillCol = "#064e3b";
        borderCol = "#10b981";
        glow = "rgba(16, 185, 129, 0.7)";
      } else if (isRejected) {
        fillCol = "#450a0a";
        borderCol = "#ef4444";
        glow = "rgba(239, 68, 68, 0.6)";
      }

      // Interval Bar
      if (glow) {
        ctx.shadowColor = glow;
        ctx.shadowBlur = 8;
      }
      ctx.fillStyle = fillCol;
      ctx.strokeStyle = borderCol;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(x1, cy, barW, barH, 4);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Label inside or left of bar
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(a.id, leftMargin - 10, cy + barH / 2);

      // Duration inside bar
      ctx.fillStyle = isSelected ? "#a7f3d0" : (isRejected ? "#fca5a5" : "#cbd5e1");
      ctx.textAlign = "center";
      ctx.fillText(`[${a.start}-${a.end}]`, x1 + barW / 2, cy + barH / 2);
    });

    // Bottom Legend
    const items = [
      { col: "#10b981", label: "Selected (Compatible)" },
      { col: "#ef4444", label: "Rejected (Conflict/Overlap)" },
      { col: "#475569", label: "Pending" },
    ];
    items.forEach((it, i) => {
      const lx = 30 + i * 200;
      const ly = h - 10;
      ctx.fillStyle = it.col;
      ctx.beginPath();
      ctx.arc(lx, ly, 4.5, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px monospace";
      ctx.textAlign = "left";
      ctx.fillText(it.label, lx + 8, ly);
    });
  }
}
