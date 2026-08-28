// Code panel: renders the algorithm source with line numbers and highlights
// the active (currently executing) line. Prism provides syntax colors;
// the active-line tracking uses the exact absolute line numbers the server
// captures from the running generator.

export class CodePanel {
  constructor(preEl) {
    this.preEl = preEl;
    this.lines = [];
    this.startLine = 0;
    this.active = -1;
  }

  setSource(source, startLine) {
    this.startLine = startLine;
    this.preEl.innerHTML = "";

    let html;
    if (window.Prism && Prism.languages && Prism.languages.python) {
      html = Prism.highlight(source, Prism.languages.python, "python");
    } else {
      // Fallback if Prism failed to load: escape and show plain text.
      html = source.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    }

    const htmlLines = html.split("\n");
    this.lines = [];

    htmlLines.forEach((lineHtml, idx) => {
      const row = document.createElement("div");
      row.className = "code-line";

      const num = document.createElement("span");
      num.className = "line-num";
      num.textContent = String(this.startLine + idx);

      const code = document.createElement("span");
      code.className = "line-code";
      code.innerHTML = lineHtml === "" ? " " : lineHtml;

      row.appendChild(num);
      row.appendChild(code);
      this.preEl.appendChild(row);
      this.lines.push(row);
    });

    this.highlight(null);
  }

  highlight(absoluteLine) {
    if (this.active >= 0 && this.lines[this.active]) {
      this.lines[this.active].classList.remove("active");
    }
    this.active = -1;

    if (absoluteLine == null) return;
    const idx = absoluteLine - this.startLine;
    if (idx < 0 || idx >= this.lines.length) return;

    this.active = idx;
    const el = this.lines[idx];
    el.classList.add("active");
    if (typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "nearest" });
    }
  }
}
