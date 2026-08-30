// Dedicated Network Flow Canvas Renderer.
//
// Features:
//  - Interactive draggable nodes arranged in layered topological layout (Source -> Layers -> Sink).
//  - Directed capacity edges with flow fraction badges ('f / c').
//  - Animated glowing augmenting paths with bottleneck (Δ) indicator.
//  - Saturated edge indicators and Level Graph depth badges (Dinic).
//  - (S, T) Minimum Cut dividing boundary visualization.
//  - Real-time Total Flow HUD gauge.

function drawRoundRect(c, rx, ry, rw, rh, rad = 3) {
  if (typeof c.roundRect === "function") {
    c.roundRect(rx, ry, rw, rh, rad);
  } else {
    c.rect(rx, ry, rw, rh);
  }
}

export class FlowRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.network = null;
    this.currentFrame = null;
    this.draggingNode = null;
    this.dragOffset = { x: 0, y: 0 };
    this.onNetworkChange = null;

    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.wireEvents();
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(300, Math.floor(rect.width || 700));
    const h = Math.max(260, Math.floor(rect.height || 340));
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = w;
    this.height = h;
    this.draw();
  }

  setNetwork(net) {
    this.network = JSON.parse(JSON.stringify(net));
    this.currentFrame = null;
    this.draw();
  }

  getNetwork() {
    return this.network;
  }

  render(frame = null) {
    this.currentFrame = frame;
    this.draw();
  }

  wireEvents() {
    if (!this.canvas) return;

    this.canvas.addEventListener("mousedown", (e) => {
      const { x, y } = this.getCanvasPos(e);
      if (!this.network?.nodes) return;
      for (const node of this.network.nodes) {
        if (Math.hypot(node.x - x, node.y - y) <= 22) {
          this.draggingNode = node;
          this.dragOffset = { x: node.x - x, y: node.y - y };
          break;
        }
      }
    });

    window.addEventListener("mousemove", (e) => {
      if (!this.draggingNode) return;
      const { x, y } = this.getCanvasPos(e);
      this.draggingNode.x = Math.max(30, Math.min(this.width - 30, Math.round(x + this.dragOffset.x)));
      this.draggingNode.y = Math.max(30, Math.min(this.height - 40, Math.round(y + this.dragOffset.y)));
      this.draw();
      this.onNetworkChange?.(this.network);
    });

    window.addEventListener("mouseup", () => {
      this.draggingNode = null;
    });
  }

  getCanvasPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
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
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
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

    if (!this.network?.nodes) {
      ctx.fillStyle = "#64748b";
      ctx.font = "14px monospace";
      ctx.textAlign = "center";
      ctx.fillText("No flow network loaded", w / 2, h / 2);
      return;
    }

    const coords = new Map(this.network.nodes.map((n) => [n.id, { x: n.x, y: n.y, type: n.type }]));
    const flowMap = this.currentFrame?.flow || {};
    const capMap = this.currentFrame?.capacity || {};
    const augPath = this.currentFrame?.augmenting_path || [];
    const minCut = this.currentFrame?.min_cut;
    const levels = this.currentFrame?.levels || {};

    const pathEdges = new Set();
    for (let i = 0; i < augPath.length - 1; i++) {
      pathEdges.add(`${augPath[i]}-${augPath[i + 1]}`);
    }

    // 1. Draw Min-Cut Partition Background Halo
    if (minCut && minCut.length === 2) {
      const [sSet, tSet] = minCut;
      // Draw dividing dashed curve between S-set and T-set
      let maxX_S = 0;
      let minX_T = w;
      sSet.forEach((id) => {
        const p = coords.get(id);
        if (p) maxX_S = Math.max(maxX_S, p.x);
      });
      tSet.forEach((id) => {
        const p = coords.get(id);
        if (p) minX_T = Math.min(minX_T, p.x);
      });

      const cutX = Math.round((maxX_S + minX_T) / 2);
      ctx.strokeStyle = "rgba(244, 63, 94, 0.75)";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(cutX, 15);
      ctx.lineTo(cutX, h - 35);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#f43f5e";
      ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, monospace";
      ctx.textAlign = "center";
      ctx.fillText("✂ Minimum Cut Boundary", cutX, 22);
    }

    // 2. Draw Directed Edges & Capacity Badges
    for (const edge of this.network.edges) {
      const p1 = coords.get(edge.u);
      const p2 = coords.get(edge.v);
      if (!p1 || !p2) continue;

      const edgeKey = `${edge.u}-${edge.v}`;
      const f = flowMap[edgeKey] !== undefined ? flowMap[edgeKey] : 0;
      const c = capMap[edgeKey] !== undefined ? capMap[edgeKey] : edge.capacity;
      const isAugPath = pathEdges.has(edgeKey);
      const isSaturated = c > 0 && f >= c;

      // Color selection
      let strokeColor = "#334155";
      let lineWidth = 2;
      if (isAugPath) {
        strokeColor = "#34d399";
        lineWidth = 4;
      } else if (isSaturated) {
        strokeColor = "#ef4444";
        lineWidth = 2.5;
      } else if (f > 0) {
        strokeColor = "#38bdf8";
        lineWidth = 2.5;
      }

      // Draw edge line
      if (isAugPath) {
        ctx.shadowColor = "rgba(52, 211, 153, 0.8)";
        ctx.shadowBlur = 12;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Directed arrow head near target node
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const arrowDist = 24; // distance from node center
      const ax = p2.x - arrowDist * Math.cos(angle);
      const ay = p2.y - arrowDist * Math.sin(angle);
      const headLen = 9;

      ctx.fillStyle = strokeColor;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - headLen * Math.cos(angle - Math.PI / 6), ay - headLen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(ax - headLen * Math.cos(angle + Math.PI / 6), ay - headLen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();

      // Flow / Capacity Badge at midpoint
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      const badgeText = `${f} / ${c}`;
      const badgeW = Math.max(36, badgeText.length * 7 + 10);
      const badgeH = 16;

      ctx.fillStyle = isSaturated ? "#7f1d1d" : (f > 0 ? "#0c4a6e" : "#1e293b");
      ctx.strokeStyle = isSaturated ? "#ef4444" : (isAugPath ? "#34d399" : (f > 0 ? "#38bdf8" : "#475569"));
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      drawRoundRect(ctx, mx - badgeW / 2, my - badgeH / 2, badgeW, badgeH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isSaturated ? "#fca5a5" : (isAugPath ? "#6ee7b7" : (f > 0 ? "#7dd3fc" : "#cbd5e1"));
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(badgeText, mx, my);
    }

    // 3. Draw Nodes
    const radius = 18;
    for (const node of this.network.nodes) {
      const isSource = node.id === this.network.source || node.type === "source";
      const isSink = node.id === this.network.sink || node.type === "sink";
      const inAugPath = augPath.includes(node.id);

      let fillCol = "#1e293b";
      let strokeCol = "#475569";
      let glowCol = null;

      if (isSource) {
        fillCol = "#78350f";
        strokeCol = "#f59e0b";
        glowCol = "rgba(245, 158, 11, 0.6)";
      } else if (isSink) {
        fillCol = "#581c87";
        strokeCol = "#c084fc";
        glowCol = "rgba(192, 132, 252, 0.6)";
      } else if (inAugPath) {
        fillCol = "#064e3b";
        strokeCol = "#34d399";
        glowCol = "rgba(52, 211, 153, 0.6)";
      }

      // Min-Cut halo
      if (minCut && minCut.length === 2) {
        const isS = minCut[0].includes(node.id);
        ctx.strokeStyle = isS ? "rgba(245, 158, 11, 0.4)" : "rgba(192, 132, 252, 0.4)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 5, 0, 2 * Math.PI);
        ctx.stroke();
      }

      if (glowCol) {
        ctx.shadowColor = glowCol;
        ctx.shadowBlur = 12;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = fillCol;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      ctx.fill();

      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Label Text
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.label || node.id, node.x, node.y);

      // Dinic Level Badge if available
      if (levels[node.id] !== undefined && levels[node.id] >= 0) {
        const lvlText = `L:${levels[node.id]}`;
        const bW = 20, bH = 11;
        ctx.fillStyle = "#0f172a";
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 1;
        ctx.beginPath();
        drawRoundRect(ctx, node.x - bW / 2, node.y - radius - 9, bW, bH, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#94a3b8";
        ctx.font = "bold 8px monospace";
        ctx.fillText(lvlText, node.x, node.y - radius - 3);
      }
    }

    // 4. Total Flow & Bottleneck HUD Meter (Top-Right)
    const totalFlow = this.currentFrame?.total_flow ?? 0;
    const bottleneck = this.currentFrame?.bottleneck;

    const hudW = 160;
    const hudH = bottleneck ? 44 : 26;
    const hudX = w - hudW - 15;
    const hudY = 12;

    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    drawRoundRect(ctx, hudX, hudY, hudW, hudH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`🌊 Total Flow: ${totalFlow}`, hudX + 10, hudY + 16);

    if (bottleneck) {
      ctx.fillStyle = "#34d399";
      ctx.font = "bold 11px monospace";
      ctx.fillText(`Bottleneck: Δ = ${bottleneck}`, hudX + 10, hudY + 34);
    }

    // 5. Bottom Legend
    this.drawLegend(w, h);
  }

  drawLegend(w, h) {
    const ctx = this.ctx;
    const items = [
      { col: "#f59e0b", label: "Source (S)" },
      { col: "#c084fc", label: "Sink (T)" },
      { col: "#34d399", label: "Augmenting Path" },
      { col: "#ef4444", label: "Saturated (f=c)" },
      { col: "#38bdf8", label: "Active Flow" },
    ];

    const itemW = Math.floor(w / items.length);
    const y = h - 14;

    items.forEach((item, i) => {
      const x = i * itemW + 12;
      ctx.fillStyle = item.col;
      ctx.beginPath();
      ctx.arc(x, y, 4.5, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px -apple-system, BlinkMacSystemFont, monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(item.label, x + 8, y);
    });
  }
}
