// Dedicated 2D Dynamic Programming Table & Matrix Canvas Renderer.
//
// Supports:
//  - 0-1 Knapsack 2D DP Table (Items vs Capacities).
//  - Longest Common Subsequence (LCS) 2D Character Matrix.
//  - Minimum Path Sum Grid Matrix.
//
// Features:
//  - Active computed cell highlight with dependency transition arrows.
//  - Glowing emerald backtracked optimal solution path.
//  - Clear row & column header labels and table title.
//  - Auto-centering and responsive cell scaling.

export class DPRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.currentFrame = null;
    this.table = null;

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

    const dpTable = this.currentFrame?.dp_table;
    if (!dpTable || !dpTable.length) {
      ctx.fillStyle = "#64748b";
      ctx.font = "14px monospace";
      ctx.textAlign = "center";
      ctx.fillText("No 2D DP table loaded", w / 2, h / 2);
      return;
    }

    const numRows = dpTable.length;
    const numCols = dpTable[0].length;
    const rowLabels = this.currentFrame?.dp_row_labels || [];
    const colLabels = this.currentFrame?.dp_col_labels || [];
    const title = this.currentFrame?.dp_title || "Dynamic Programming 2D Table";
    const activeRow = this.currentFrame?.dp_row;
    const activeCol = this.currentFrame?.dp_col;
    const activeCells = new Set((this.currentFrame?.dp_active_cells || []).map(([r, c]) => `${r},${c}`));
    const dependencies = this.currentFrame?.dp_dependencies || [];
    const backtrackPath = new Set((this.currentFrame?.backtrack_path || []).map(([r, c]) => `${r},${c}`));

    // Title
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, monospace";
    ctx.textAlign = "center";
    ctx.fillText(title, w / 2, 20);

    // Compute cell dimensions
    const topMargin = 55;
    const leftMargin = rowLabels.length ? Math.min(130, Math.floor(w * 0.22)) : 50;
    const availW = w - leftMargin - 20;
    const availH = h - topMargin - 20;

    const cellW = Math.min(65, Math.max(30, Math.floor(availW / numCols)));
    const cellH = Math.min(36, Math.max(22, Math.floor(availH / numRows)));

    const startX = leftMargin + Math.max(0, Math.floor((availW - numCols * cellW) / 2));
    const startY = topMargin + Math.max(0, Math.floor((availH - numRows * cellH) / 2));

    // Draw Column Headers
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let c = 0; c < numCols; c++) {
      const cx = startX + c * cellW + cellW / 2;
      ctx.fillStyle = c === activeCol ? "#fbbf24" : "#94a3b8";
      const lbl = colLabels[c] || `C${c}`;
      ctx.fillText(lbl, cx, startY - 14);
    }

    // Draw Row Headers
    ctx.textAlign = "right";
    for (let r = 0; r < numRows; r++) {
      const cy = startY + r * cellH + cellH / 2;
      ctx.fillStyle = r === activeRow ? "#fbbf24" : "#94a3b8";
      const lbl = rowLabels[r] || `R${r}`;
      ctx.fillText(lbl, startX - 10, cy);
    }

    // Draw Table Cells
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const x = startX + c * cellW;
        const y = startY + r * cellH;
        const key = `${r},${c}`;
        const isBacktrack = backtrackPath.has(key);
        const isActive = activeCells.has(key) || (r === activeRow && c === activeCol);
        const isDependency = dependencies.some(([dr, dc]) => dr === r && dc === c);

        let bgCol = "#0f172a";
        let borderCol = "#1e293b";
        let textCol = "#cbd5e1";
        let glow = null;

        if (isBacktrack) {
          bgCol = "#064e3b";
          borderCol = "#10b981";
          textCol = "#ffffff";
          glow = "rgba(16, 185, 129, 0.7)";
        } else if (isActive) {
          bgCol = "#451a03";
          borderCol = "#f59e0b";
          textCol = "#fbbf24";
          glow = "rgba(245, 158, 11, 0.7)";
        } else if (isDependency) {
          bgCol = "#0c4a6e";
          borderCol = "#38bdf8";
          textCol = "#38bdf8";
        }

        function drawRoundRect(c, rx, ry, rw, rh, rad = 3) {
          if (typeof c.roundRect === "function") {
            c.roundRect(rx, ry, rw, rh, rad);
          } else {
            c.rect(rx, ry, rw, rh);
          }
        }

        if (glow) {
          ctx.shadowColor = glow;
          ctx.shadowBlur = 10;
        }
        ctx.fillStyle = bgCol;
        ctx.strokeStyle = borderCol;
        ctx.lineWidth = isActive || isBacktrack ? 2 : 1;
        ctx.beginPath();
        drawRoundRect(ctx, x + 2, y + 2, cellW - 4, cellH - 4, 3);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Cell Value
        const val = dpTable[r][c];
        ctx.fillStyle = textCol;
        ctx.font = `bold ${Math.max(10, Math.min(14, cellH * 0.45))}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(val !== undefined ? val : "–"), x + cellW / 2, y + cellH / 2);
      }
    }

    // Draw Dependency Arrows pointing from dependencies to active cell
    if (activeRow != null && activeCol != null && dependencies.length) {
      const targetX = startX + activeCol * cellW + cellW / 2;
      const targetY = startY + activeRow * cellH + cellH / 2;

      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      ctx.fillStyle = "#f59e0b";

      for (const [dr, dc] of dependencies) {
        const fromX = startX + dc * cellW + cellW / 2;
        const fromY = startY + dr * cellH + cellH / 2;

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();

        // Arrow head
        const angle = Math.atan2(targetY - fromY, targetX - fromX);
        const headLen = 6;
        ctx.beginPath();
        ctx.moveTo(targetX, targetY);
        ctx.lineTo(targetX - headLen * Math.cos(angle - Math.PI / 6), targetY - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(targetX - headLen * Math.cos(angle + Math.PI / 6), targetY - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      }
    }
  }
}
