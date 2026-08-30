// Dedicated Bipartite Matching Canvas Renderer (Gale-Shapley Stable Marriage).
//
// Features:
//  - Two-column bipartite layout (Proposers M1..M6 on left, Reviewers W1..W6 on right).
//  - Preference list ranking badges with strikethroughs on rejected candidates.
//  - Dynamic connecting bezier ribbons:
//      * Glowing emerald ribbons for active tentative engagements (M ~ W).
//      * Pulsing gold arrow during active proposal.
//      * Crimson line on rejection or broken engagement.
//  - Real-time Stable Matching HUD gauge (Engaged pairs count & Blocking pairs verifier).
//  - Interactive card positions and responsive canvas auto-scaling.

export class MatchingRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.preferences = null;
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

  setPreferences(prefs) {
    this.preferences = JSON.parse(JSON.stringify(prefs));
    this.currentFrame = null;
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

    const prefs = this.currentFrame?.preferences || this.preferences;
    if (!prefs || !prefs.proposers || !prefs.reviewers) {
      ctx.fillStyle = "#64748b";
      ctx.font = "14px monospace";
      ctx.textAlign = "center";
      ctx.fillText("No matching preferences loaded", w / 2, h / 2);
      return;
    }

    const proposers = Object.keys(prefs.proposers).sort();
    const reviewers = Object.keys(prefs.reviewers).sort();
    const n = proposers.length;

    const matches = this.currentFrame?.matches || {}; // reviewer -> proposer
    const pToR = {};
    for (const [r, p] of Object.entries(matches)) {
      pToR[p] = r;
    }

    const rejected = this.currentFrame?.rejected || {};
    const pairStatus = this.currentFrame?.pair_status || {};
    const activeP = this.currentFrame?.proposer;
    const activeR = this.currentFrame?.reviewer;
    const activeType = this.currentFrame?.type;

    // Calculate layout coordinates
    const leftX = Math.round(w * 0.18);
    const rightX = Math.round(w * 0.82);
    const cardW = Math.min(200, Math.floor(w * 0.32));
    const cardH = Math.min(38, Math.floor((h - 80) / (n + 0.5)));
    const gapY = Math.floor((h - 80) / n);
    const startY = 38;

    const pCoords = new Map();
    const rCoords = new Map();

    for (let i = 0; i < n; i++) {
      const py = startY + i * gapY + cardH / 2;
      pCoords.set(proposers[i], { x: leftX, y: py, i });
    }
    for (let i = 0; i < n; i++) {
      const ry = startY + i * gapY + cardH / 2;
      rCoords.set(reviewers[i], { x: rightX, y: ry, i });
    }

    // 1. Draw Connecting Ribbons / Lines
    // 1.1 Engaged match curves
    for (const [r, p] of Object.entries(matches)) {
      const pPos = pCoords.get(p);
      const rPos = rCoords.get(r);
      if (!pPos || !rPos) continue;

      const pX = pPos.x + cardW / 2;
      const pY = pPos.y;
      const rX = rPos.x - cardW / 2;
      const rY = rPos.y;
      const cpX = (pX + rX) / 2;

      ctx.shadowColor = "rgba(16, 185, 129, 0.7)";
      ctx.shadowBlur = 10;
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(pX, pY);
      ctx.bezierCurveTo(cpX, pY, cpX, rY, rX, rY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Small engagement badge at midpoint
      const midX = (pX + rX) / 2;
      const midY = (pY + rY) / 2;
      ctx.fillStyle = "#064e3b";
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(midX, midY, 9, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#a7f3d0";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("💍", midX, midY);
    }

    // 1.2 Active Proposal / Reject / Break animation line
    if (activeP && activeR) {
      const pPos = pCoords.get(activeP);
      const rPos = rCoords.get(activeR);
      if (pPos && rPos) {
        const pX = pPos.x + cardW / 2;
        const pY = pPos.y;
        const rX = rPos.x - cardW / 2;
        const rY = rPos.y;
        const cpX = (pX + rX) / 2;

        if (activeType === "propose") {
          ctx.shadowColor = "rgba(245, 158, 11, 0.9)";
          ctx.shadowBlur = 14;
          ctx.strokeStyle = "#f59e0b";
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(pX, pY);
          ctx.bezierCurveTo(cpX, pY, cpX, rY, rX, rY);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.shadowBlur = 0;
        } else if (activeType === "reject") {
          ctx.shadowColor = "rgba(239, 68, 68, 0.9)";
          ctx.shadowBlur = 12;
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 2.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(pX, pY);
          ctx.bezierCurveTo(cpX, pY, cpX, rY, rX, rY);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.shadowBlur = 0;
        } else if (activeType === "break") {
          ctx.shadowColor = "rgba(244, 63, 94, 0.9)";
          ctx.shadowBlur = 12;
          ctx.strokeStyle = "#f43f5e";
          ctx.lineWidth = 2.5;
          ctx.setLineDash([3, 5]);
          ctx.beginPath();
          ctx.moveTo(pX, pY);
          ctx.bezierCurveTo(cpX, pY, cpX, rY, rX, rY);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.shadowBlur = 0;
        }
      }
    }

    // 2. Draw Proposer Cards (Left Column)
    proposers.forEach((p) => {
      const pos = pCoords.get(p);
      const isEngaged = Boolean(pToR[p]);
      const currentMatch = pToR[p];
      const isProposing = activeP === p && activeType === "propose";
      const isRejectedNow = activeP === p && activeType === "reject";
      const isBrokenNow = activeP === p && activeType === "break";

      let bgCol = "#1e293b";
      let borderCol = "#334155";
      let glow = null;

      if (isProposing) {
        bgCol = "#451a03";
        borderCol = "#f59e0b";
        glow = "rgba(245, 158, 11, 0.6)";
      } else if (isRejectedNow) {
        bgCol = "#450a0a";
        borderCol = "#ef4444";
        glow = "rgba(239, 68, 68, 0.6)";
      } else if (isBrokenNow) {
        bgCol = "#4c0519";
        borderCol = "#f43f5e";
        glow = "rgba(244, 63, 94, 0.6)";
      } else if (isEngaged) {
        bgCol = "#064e3b";
        borderCol = "#10b981";
      }

      const cX = pos.x - cardW / 2;
      const cY = pos.y - cardH / 2;

      if (glow) {
        ctx.shadowColor = glow;
        ctx.shadowBlur = 10;
      }
      ctx.fillStyle = bgCol;
      ctx.strokeStyle = borderCol;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(cX, cY, cardW, cardH, 6);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Proposer Avatar Circle
      ctx.fillStyle = "#0284c7";
      ctx.beginPath();
      ctx.arc(cX + 18, pos.y, 11, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p, cX + 18, pos.y);

      // Preference pills
      const pList = prefs.proposers[p] || [];
      const rejList = rejected[p] || [];
      const pillStartX = cX + 38;
      const pillGap = (cardW - 45) / pList.length;

      pList.forEach((rChoice, idx) => {
        const px = pillStartX + idx * pillGap + pillGap / 2;
        const isChoiceEngaged = currentMatch === rChoice;
        const isChoiceRejected = rejList.includes(rChoice);
        const isChoiceActive = activeP === p && activeR === rChoice;

        let pillBg = "#0f172a";
        let pillBorder = "#334155";
        let textCol = "#94a3b8";

        if (isChoiceEngaged) {
          pillBg = "#10b981";
          pillBorder = "#34d399";
          textCol = "#ffffff";
        } else if (isChoiceActive && activeType === "propose") {
          pillBg = "#f59e0b";
          pillBorder = "#fbbf24";
          textCol = "#ffffff";
        } else if (isChoiceRejected) {
          pillBg = "rgba(127, 29, 29, 0.4)";
          pillBorder = "#7f1d1d";
          textCol = "#ef4444";
        }

        const pW = Math.max(20, pillGap - 4);
        const pH = cardH - 12;
        ctx.fillStyle = pillBg;
        ctx.strokeStyle = pillBorder;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(px - pW / 2, pos.y - pH / 2, pW, pH, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = textCol;
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(rChoice, px, pos.y);

        // Strikethrough for rejected
        if (isChoiceRejected && !isChoiceEngaged) {
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(px - pW / 2 + 2, pos.y);
          ctx.lineTo(px + pW / 2 - 2, pos.y);
          ctx.stroke();
        }
      });
    });

    // 3. Draw Reviewer Cards (Right Column)
    reviewers.forEach((r) => {
      const pos = rCoords.get(r);
      const isEngaged = Boolean(matches[r]);
      const currentMatch = matches[r];
      const isEvaluatedNow = activeR === r;

      let bgCol = "#1e293b";
      let borderCol = "#334155";
      let glow = null;

      if (isEvaluatedNow && activeType === "accept") {
        bgCol = "#064e3b";
        borderCol = "#10b981";
        glow = "rgba(16, 185, 129, 0.7)";
      } else if (isEvaluatedNow && activeType === "propose") {
        bgCol = "#3b0764";
        borderCol = "#c084fc";
        glow = "rgba(192, 132, 252, 0.6)";
      } else if (isEngaged) {
        bgCol = "#064e3b";
        borderCol = "#10b981";
      }

      const cX = pos.x - cardW / 2;
      const cY = pos.y - cardH / 2;

      if (glow) {
        ctx.shadowColor = glow;
        ctx.shadowBlur = 10;
      }
      ctx.fillStyle = bgCol;
      ctx.strokeStyle = borderCol;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(cX, cY, cardW, cardH, 6);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Reviewer Avatar Circle
      ctx.fillStyle = "#9333ea";
      ctx.beginPath();
      ctx.arc(cX + 18, pos.y, 11, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(r, cX + 18, pos.y);

      // Preference pills
      const rList = prefs.reviewers[r] || [];
      const pillStartX = cX + 38;
      const pillGap = (cardW - 45) / rList.length;

      rList.forEach((pChoice, idx) => {
        const px = pillStartX + idx * pillGap + pillGap / 2;
        const isChoiceEngaged = currentMatch === pChoice;
        const isChoiceActive = activeR === r && activeP === pChoice;

        let pillBg = "#0f172a";
        let pillBorder = "#334155";
        let textCol = "#94a3b8";

        if (isChoiceEngaged) {
          pillBg = "#10b981";
          pillBorder = "#34d399";
          textCol = "#ffffff";
        } else if (isChoiceActive) {
          pillBg = "#c084fc";
          pillBorder = "#e9d5ff";
          textCol = "#1e1b4b";
        }

        const pW = Math.max(20, pillGap - 4);
        const pH = cardH - 12;
        ctx.fillStyle = pillBg;
        ctx.strokeStyle = pillBorder;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(px - pW / 2, pos.y - pH / 2, pW, pH, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = textCol;
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(pChoice, px, pos.y);
      });
    });

    // 4. Header Titles
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, monospace";
    ctx.textAlign = "center";
    ctx.fillText("PROPOSERS (M)", leftX, 20);

    ctx.fillStyle = "#c084fc";
    ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, monospace";
    ctx.textAlign = "center";
    ctx.fillText("REVIEWERS (W)", rightX, 20);

    // 5. Stability Status HUD (Top Center)
    const engagedCount = Object.keys(matches).length;
    const blockingCount = this.currentFrame?.state?.blocking_pairs ?? 0;
    const hudW = 200;
    const hudH = 26;
    const hudX = (w - hudW) / 2;
    const hudY = 8;

    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(hudX, hudY, hudW, hudH, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = engagedCount === n ? "#34d399" : "#38bdf8";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`💍 ${engagedCount}/${n} Engaged · 🛡 ${blockingCount} Blocking`, w / 2, hudY + 17);

    // 6. Bottom Legend
    this.drawLegend(w, h);
  }

  drawLegend(w, h) {
    const ctx = this.ctx;
    const items = [
      { col: "#10b981", label: "Engaged (M ~ W)" },
      { col: "#f59e0b", label: "Active Proposal" },
      { col: "#ef4444", label: "Rejected / Broken" },
      { col: "#64748b", label: "Free / Unengaged" },
    ];

    const itemW = Math.floor(w / items.length);
    const y = h - 12;

    items.forEach((item, i) => {
      const x = i * itemW + 16;
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
