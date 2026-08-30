// Hierarchical Binary Search Tree & AVL Tree Canvas Renderer.
//
// Renders well-populated trees (12–20 nodes) with non-overlapping in-order
// coordinates, smooth connecting branches, balance factor badges (bf),
// height tags (h), rotation indicators, and interactive step highlights.

function drawRoundRect(c, x, y, w, h, r = 3) {
  if (typeof c.roundRect === "function") {
    c.roundRect(x, y, w, h, r);
  } else {
    c.rect(x, y, w, h);
  }
}

export class BSTRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.currentTree = null;
    this.currentFrame = null;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const parentRect = this.canvas.parentElement ? this.canvas.parentElement.getBoundingClientRect() : rect;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(300, Math.floor(rect.width || parentRect.width || 700));
    const h = Math.max(260, Math.floor(rect.height || parentRect.height || 340));
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = w;
    this.height = h;
    this.draw();
  }

  setTree(treeData) {
    this.currentTree = treeData;
    this.currentFrame = null;
    this.draw();
  }

  render(frame = null) {
    if (frame) {
      this.currentFrame = frame;
      if (frame.tree) {
        this.currentTree = frame.tree;
      }
    }
    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    if (!ctx || !w || !h) return;

    // Clear background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0d1117";
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

    const tree = this.currentFrame?.tree || this.currentTree;
    if (!tree) {
      ctx.fillStyle = "#64748b";
      ctx.font = "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace";
      ctx.textAlign = "center";
      ctx.fillText("No binary tree loaded — select a tree algorithm to begin", w / 2, h / 2);
      return;
    }

    // 1. Calculate in-order layout coordinates
    const nodesInOrder = [];
    let maxDepth = 0;

    function traverse(node, depth = 0) {
      if (!node) return;
      maxDepth = Math.max(maxDepth, depth);
      traverse(node.left, depth + 1);
      nodesInOrder.push({ node, depth });
      traverse(node.right, depth + 1);
    }
    traverse(tree, 0);

    const totalNodes = nodesInOrder.length;
    if (totalNodes === 0) return;

    // Map each node to its (x, y) coordinate
    const padX = 40;
    const padY = 50;
    const availW = w - padX * 2;
    const availH = h - padY - 60; // leave room for legend at bottom
    const rowHeight = maxDepth > 0 ? Math.min(60, availH / Math.max(1, maxDepth)) : 60;

    const coords = new Map();
    nodesInOrder.forEach((item, index) => {
      const x = padX + ((index + 0.5) / totalNodes) * availW;
      const y = padY + item.depth * rowHeight;
      coords.set(item.node, { x, y, depth: item.depth });
    });

    // 2. Draw connecting branches (edges)
    function drawEdges(node) {
      if (!node) return;
      const p = coords.get(node);
      if (!p) return;

      if (node.left) {
        const c = coords.get(node.left);
        if (c) {
          ctx.strokeStyle = "#334155";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(c.x, c.y);
          ctx.stroke();
        }
        drawEdges(node.left);
      }

      if (node.right) {
        const c = coords.get(node.right);
        if (c) {
          ctx.strokeStyle = "#334155";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(c.x, c.y);
          ctx.stroke();
        }
        drawEdges(node.right);
      }
    }
    drawEdges(tree);

    // 3. Draw Nodes & Badges
    const highlights = this.currentFrame?.highlight_nodes || {};
    const activeVal = this.currentFrame?.active_val;
    const radius = Math.max(14, Math.min(20, Math.floor(availW / (totalNodes * 2.2))));

    function drawNodes(node) {
      if (!node) return;
      const p = coords.get(node);
      if (!p) return;

      const valStr = String(node.val);
      const state = highlights[valStr] || (activeVal === node.val ? "compare" : "default");
      const bf = node.bf ?? 0;
      const isImbalanced = Math.abs(bf) > 1;

      let fillCol = "#090d16";
      let strokeCol = "#64748b";
      let glowCol = null;

      // Base color from Red-Black tree color attribute if present
      const nodeColor = node.color || "BLACK";
      if (nodeColor === "RED") {
        fillCol = "#991b1b";
        strokeCol = "#ef4444";
        glowCol = "rgba(239, 68, 68, 0.4)";
      } else if (node.color === "BLACK") {
        fillCol = "#090d16";
        strokeCol = "#64748b";
      }

      if (state === "compare") {
        fillCol = "#0c4a6e";
        strokeCol = "#38bdf8";
        glowCol = "rgba(56, 189, 248, 0.6)";
      } else if (state === "insert") {
        fillCol = "#064e3b";
        strokeCol = "#34d399";
        glowCol = "rgba(52, 211, 153, 0.7)";
      } else if (state === "delete") {
        fillCol = "#450a0a";
        strokeCol = "#f87171";
        glowCol = "rgba(248, 113, 113, 0.7)";
      } else if (state === "unbalanced" || isImbalanced) {
        fillCol = "#451a03";
        strokeCol = "#fbbf24";
        glowCol = "rgba(251, 191, 36, 0.7)";
      } else if (state === "pivot") {
        fillCol = "#3b0764";
        strokeCol = "#c084fc";
        glowCol = "rgba(192, 132, 252, 0.7)";
      } else if (state === "settled") {
        fillCol = nodeColor === "RED" ? "#991b1b" : "#090d16";
        strokeCol = "#10b981";
      }

      // Outer glow
      if (glowCol) {
        ctx.shadowColor = glowCol;
        ctx.shadowBlur = 12;
      } else {
        ctx.shadowBlur = 0;
      }

      // Node circle
      ctx.fillStyle = fillCol;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI);
      ctx.fill();

      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.shadowBlur = 0; // reset glow

      // Node Value Text
      ctx.fillStyle = "#f8fafc";
      ctx.font = `bold ${Math.max(10, radius * 0.75)}px -apple-system, BlinkMacSystemFont, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const nodeText = node.label ? String(node.label) : String(node.val);
      ctx.fillText(nodeText, p.x, p.y);

      // Balance Factor / Color Badge
      if (node.color) {
        // Red-Black badge (R / B)
        const badgeText = node.color === "RED" ? "R" : "B";
        const badgeW = 16;
        const badgeH = 12;
        const bX = p.x - badgeW / 2;
        const bY = p.y - radius - 10;

        ctx.fillStyle = node.color === "RED" ? "#ef4444" : "#0f172a";
        ctx.strokeStyle = node.color === "RED" ? "#fca5a5" : "#94a3b8";
        ctx.lineWidth = 1;
        ctx.beginPath();
        drawRoundRect(ctx, bX, bY, badgeW, badgeH, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(badgeText, p.x, bY + badgeH / 2);
      } else if (node.heap_idx !== undefined && node.heap_idx !== null) {
        // Heap array index badge
        const badgeText = `[${node.heap_idx}]`;
        const badgeW = 24;
        const badgeH = 12;
        const bX = p.x - badgeW / 2;
        const bY = p.y + radius + 2;

        ctx.fillStyle = "#1e293b";
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1;
        ctx.beginPath();
        drawRoundRect(ctx, bX, bY, badgeW, badgeH, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(badgeText, p.x, bY + badgeH / 2);
      } else {
        // AVL Balance Factor Badge
        const bfText = bf > 0 ? `+${bf}` : `${bf}`;
        const bfBadgeW = 22;
        const bfBadgeH = 12;
        const bfX = p.x - bfBadgeW / 2;
        const bfY = p.y - radius - 10;

        ctx.fillStyle = isImbalanced ? "#ef4444" : "#1e293b";
        ctx.strokeStyle = isImbalanced ? "#f87171" : "#475569";
        ctx.lineWidth = 1;
        ctx.beginPath();
        drawRoundRect(ctx, bfX, bfY, bfBadgeW, bfBadgeH, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isImbalanced ? "#ffffff" : (bf === 0 ? "#94a3b8" : "#38bdf8");
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(bfText, p.x, bfY + bfBadgeH / 2);
      }

      // Recurse children
      drawNodes(node.left);
      drawNodes(node.right);
    }
    drawNodes(tree);

    // 4. Rotation Banner Overlay
    if (this.currentFrame?.rotation) {
      const rot = this.currentFrame.rotation;
      let rotTitle = "";
      if (rot === "left") rotTitle = "⟲ Left Rotation (RR)";
      else if (rot === "right") rotTitle = "⟳ Right Rotation (LL)";
      else if (rot === "left-right") rotTitle = "⟲⟳ Left-Right Rotation (LR)";
      else if (rot === "right-left") rotTitle = "⟳⟲ Right-Left Rotation (RL)";

      const bw = 240, bh = 26;
      ctx.fillStyle = "rgba(192, 132, 252, 0.15)";
      ctx.strokeStyle = "#c084fc";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      drawRoundRect(ctx, w / 2 - bw / 2, 10, bw, bh, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#f3e8ff";
      ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(rotTitle, w / 2, 10 + bh / 2);
    }

    // 5. Bottom Legend
    this.drawLegend(w, h);
  }

  drawLegend(w, h) {
    const ctx = this.ctx;
    const items = [
      { col: "#38bdf8", label: "Compare / Search" },
      { col: "#34d399", label: "Insert" },
      { col: "#f87171", label: "Delete" },
      { col: "#fbbf24", label: "Imbalance (|bf|>1)" },
      { col: "#c084fc", label: "Rotation Pivot" },
    ];

    const itemW = Math.floor(w / items.length);
    const y = h - 18;

    items.forEach((item, i) => {
      const x = i * itemW + 15;
      ctx.fillStyle = item.col;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px -apple-system, BlinkMacSystemFont, monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(item.label, x + 9, y);
    });
  }
}
