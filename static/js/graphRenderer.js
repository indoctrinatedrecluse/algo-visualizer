// ---------------------------------------------------------------------------
// GraphRenderer: interactive network / forest canvas visualization for
// graph algorithms (Dijkstra's shortest path, Traveling Salesperson).
//
// Supports:
//  - Interactive node dragging with mouse/touch
//  - Animated active edge inspection and relaxation
//  - Distance / cost badges on vertices
//  - Edge weight pill labels
//  - Glowing shortest path and TSP tour overlays
// ---------------------------------------------------------------------------

const NODE_RADIUS = 20;
const COLOR_START = "#e3b341";
const COLOR_TARGET = "#ff9f43";
const COLOR_CURRENT = "#58a6ff";
const COLOR_VISITED = "#3fb950";
const COLOR_RELAXED = "#bc8cff";
const COLOR_DEFAULT_NODE = "#1d2536";
const COLOR_DEFAULT_BORDER = "#4a5568";
const COLOR_EDGE = "rgba(110, 118, 129, 0.45)";
const COLOR_ACTIVE_EDGE = "#e3b341";
const COLOR_RELAXED_EDGE = "#bc8cff";
const COLOR_PATH_EDGE = "#3fb950";

export class GraphRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.graph = null;
    this.startNode = "A";
    this.targetNode = "G";
    this.currentFrame = null;
    this.draggingNode = null;
    this.dragOffset = { x: 0, y: 0 };
    this.onGraphChange = null;

    this._resize = this.resize.bind(this);
    window.addEventListener("resize", this._resize);
    this.resize();
    this._bindEvents();
  }

  setGraph(graph, start = "A", target = "G") {
    // Clone graph deeply to avoid mutating external references
    this.graph = JSON.parse(JSON.stringify(graph));
    this.startNode = start;
    this.targetNode = target;
    this.currentFrame = null;
    this.render();
  }

  getGraph() {
    return this.graph;
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const parent = this.canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : { width: 640, height: 320 };
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._w = width;
    this._h = height;
    this.render();
  }

  _bindEvents() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    this.canvas.addEventListener("mousedown", (e) => {
      if (!this.graph || !this.graph.nodes) return;
      const pos = getPos(e);
      // Find node under cursor
      for (const node of this.graph.nodes) {
        const dx = pos.x - node.x;
        const dy = pos.y - node.y;
        if (Math.hypot(dx, dy) <= NODE_RADIUS + 4) {
          this.draggingNode = node;
          this.dragOffset = { x: node.x - pos.x, y: node.y - pos.y };
          this.canvas.style.cursor = "grabbing";
          break;
        }
      }
    });

    window.addEventListener("mousemove", (e) => {
      if (!this.draggingNode) {
        if (!this.graph || !this.graph.nodes) return;
        const rect = this.canvas.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
          const pos = getPos(e);
          const hit = this.graph.nodes.some(
            (n) => Math.hypot(pos.x - n.x, pos.y - n.y) <= NODE_RADIUS + 4
          );
          this.canvas.style.cursor = hit ? "grab" : "default";
        }
        return;
      }
      const pos = getPos(e);
      this.draggingNode.x = Math.max(NODE_RADIUS + 10, Math.min(this._w - NODE_RADIUS - 10, pos.x + this.dragOffset.x));
      this.draggingNode.y = Math.max(NODE_RADIUS + 10, Math.min(this._h - NODE_RADIUS - 10, pos.y + this.dragOffset.y));
      this.render();
    });

    window.addEventListener("mouseup", () => {
      if (this.draggingNode) {
        this.draggingNode = null;
        this.canvas.style.cursor = "default";
        this.onGraphChange?.(this.graph);
      }
    });
  }

  render(frame = null) {
    if (frame !== null) {
      this.currentFrame = frame;
    }
    const ctx = this.ctx;
    const w = this._w;
    const h = this._h;
    ctx.clearRect(0, 0, w, h);

    if (!this.graph || !this.graph.nodes || !this.graph.nodes.length) {
      return;
    }

    const nodeMap = new Map();
    for (const n of this.graph.nodes) {
      nodeMap.set(n.id, n);
    }

    const f = this.currentFrame;
    const activeNode = f?.active_node;
    const activeEdge = f?.active_edge ? tupleKey(f.active_edge[0], f.active_edge[1]) : null;
    const relaxedEdge = f?.relaxed_edge ? tupleKey(f.relaxed_edge[0], f.relaxed_edge[1]) : null;
    const pathEdges = new Set();
    const tourEdges = new Set();

    if (f?.path && f.path.length > 1) {
      for (let i = 0; i < f.path.length - 1; i++) {
        pathEdges.add(tupleKey(f.path[i], f.path[i + 1]));
      }
    }
    if (f?.tour && f.tour.length > 1) {
      for (let i = 0; i < f.tour.length - 1; i++) {
        tourEdges.add(tupleKey(f.tour[i], f.tour[i + 1]));
      }
    }

    // 1. Draw base edges
    for (const edge of this.graph.edges) {
      const u = nodeMap.get(edge.u);
      const v = nodeMap.get(edge.v);
      if (!u || !v) continue;

      const k = tupleKey(edge.u, edge.v);
      const isPath = pathEdges.has(k) || tourEdges.has(k);
      const isActive = activeEdge === k;
      const isRelaxed = relaxedEdge === k;

      ctx.beginPath();
      ctx.moveTo(u.x, u.y);
      ctx.lineTo(v.x, v.y);

      if (isPath) {
        ctx.strokeStyle = COLOR_PATH_EDGE;
        ctx.lineWidth = 4.5;
        ctx.shadowColor = "rgba(63, 185, 80, 0.6)";
        ctx.shadowBlur = 8;
      } else if (isActive) {
        ctx.strokeStyle = COLOR_ACTIVE_EDGE;
        ctx.lineWidth = 3.5;
        ctx.shadowColor = "rgba(227, 179, 65, 0.7)";
        ctx.shadowBlur = 6;
      } else if (isRelaxed) {
        ctx.strokeStyle = COLOR_RELAXED_EDGE;
        ctx.lineWidth = 3.5;
        ctx.shadowColor = "rgba(188, 140, 255, 0.7)";
        ctx.shadowBlur = 6;
      } else {
        ctx.strokeStyle = COLOR_EDGE;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
      }
      ctx.stroke();
      ctx.shadowBlur = 0; // reset shadow

      // Edge weight badge
      const mx = (u.x + v.x) / 2;
      const my = (u.y + v.y) / 2;
      this._drawWeightBadge(ctx, mx, my, String(edge.weight), isPath || isActive || isRelaxed);
    }

    // 2. Draw nodes
    const distMap = f?.dist || {};
    const pathSet = new Set(f?.path || []);
    const tourSet = new Set(f?.tour || []);

    for (const node of this.graph.nodes) {
      const isStart = node.id === this.startNode;
      const isTarget = node.id === this.targetNode;
      const isActive = node.id === activeNode;
      const isPath = pathSet.has(node.id) || tourSet.has(node.id);
      const hasDist = distMap[node.id] !== undefined;
      const isSettled = f?.type === "settle" && node.id === activeNode;

      let fill = COLOR_DEFAULT_NODE;
      let stroke = COLOR_DEFAULT_BORDER;
      let strokeWidth = 2;

      if (isActive) {
        fill = "rgba(88, 166, 255, 0.35)";
        stroke = COLOR_CURRENT;
        strokeWidth = 3;
      } else if (isPath && (f?.type === "path" || f?.type === "tour" || f?.type === "new_best" || f?.type === "done")) {
        fill = "rgba(63, 185, 80, 0.35)";
        stroke = COLOR_VISITED;
        strokeWidth = 3;
      } else if (isStart) {
        stroke = COLOR_START;
        strokeWidth = 2.5;
      } else if (isTarget) {
        stroke = COLOR_TARGET;
        strokeWidth = 2.5;
      }

      // Draw node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();

      // Node label
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px Consolas, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.label, node.x, node.y);

      // Distance / badge
      if (hasDist) {
        const dVal = distMap[node.id];
        const badgeText = `d:${dVal}`;
        this._drawNodeBadge(ctx, node.x, node.y - NODE_RADIUS - 9, badgeText, isStart ? COLOR_START : (isTarget ? COLOR_TARGET : (isActive ? COLOR_CURRENT : "#8b949e")));
      }
    }

    // 3. Draw Legend at bottom
    this._drawLegend(ctx, w, h);
  }

  _drawWeightBadge(ctx, x, y, text, highlight) {
    ctx.font = "11px Consolas, monospace";
    const tw = ctx.measureText(text).width;
    const pw = tw + 10;
    const ph = 16;
    const rx = x - pw / 2;
    const ry = y - ph / 2;

    ctx.fillStyle = highlight ? "rgba(22, 27, 34, 0.95)" : "rgba(13, 17, 23, 0.85)";
    ctx.strokeStyle = highlight ? "rgba(227, 179, 65, 0.8)" : "rgba(110, 118, 129, 0.4)";
    ctx.lineWidth = 1;
    roundRect(ctx, rx, ry, pw, ph, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = highlight ? "#ffffff" : "#c9d1d9";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
  }

  _drawNodeBadge(ctx, x, y, text, color) {
    ctx.font = "10px Consolas, monospace";
    const tw = ctx.measureText(text).width;
    const pw = tw + 8;
    const ph = 14;
    const rx = x - pw / 2;
    const ry = y - ph / 2;

    ctx.fillStyle = "rgba(13, 17, 23, 0.92)";
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    roundRect(ctx, rx, ry, pw, ph, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
  }

  _drawLegend(ctx, w, h) {
    ctx.font = "10px Consolas, monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const ly = h - 14;
    let lx = 14;

    const items = [
      { label: "start", color: COLOR_START },
      { label: "target", color: COLOR_TARGET },
      { label: "active", color: COLOR_CURRENT },
      { label: "relaxed", color: COLOR_RELAXED },
      { label: "path/tour", color: COLOR_VISITED },
    ];

    for (const item of items) {
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(lx + 4, ly, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#8b949e";
      ctx.fillText(item.label, lx + 12, ly);
      lx += ctx.measureText(item.label).width + 24;
    }
  }
}

function tupleKey(u, v) {
  return `${u < v ? u : v}-${u < v ? v : u}`;
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
