// Frame playback engine: speed control, play/pause, step fwd/back, skip.
//
// The server computes the full frame list up-front; the client replays it
// with requestAnimationFrame at a user-chosen speed (steps/second). This
// decouples compute time from animation time and makes scrubbing trivial.

export class Player {
  constructor(render) {
    this.render = render;
    this.frames = [];
    this.cumSorted = [];     // per-frame snapshot of permanently-sorted flags
    this.cumStats = [];      // per-frame { compares, swaps }
    this.index = -1;
    this.playing = false;
    this.sps = 30;           // steps per second
    this.accum = 0;
    this.last = 0;
    this.onEnd = null;
    this._raf = 0;
    this._tick = this.tick.bind(this);
    this._raf = requestAnimationFrame(this._tick);
  }

  get length() {
    return this.frames.length;
  }

  load(frames) {
    this.frames = frames;

    let sorted = new Set();
    this.cumSorted = [];
    let compares = 0;
    let swaps = 0;
    this.cumStats = [];

    for (const f of frames) {
      if (f.type === "sorted") {
        for (const i of f.indices) sorted.add(i);
      } else if (f.type === "compare") {
        compares += 1;
      } else if (f.type === "swap") {
        swaps += 1;
      }
      this.cumSorted.push(new Set(sorted));
      this.cumStats.push({ compares, swaps });
    }

    this.index = 0;
    this.accum = 0;
    this.playing = false;
    this.renderFrame();
  }

  renderFrame() {
    const f = this.frames[this.index];
    if (!f) return;
    this.render(f, this.cumSorted[this.index] ?? new Set());
  }

  play() {
    if (this.frames.length === 0 || this.index >= this.frames.length - 1) return;
    this.playing = true;
    this.last = performance.now();
  }

  pause() {
    this.playing = false;
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  tick(now) {
    if (this.playing) {
      const dt = Math.min(now - this.last, 250); // clamp long background gaps
      this.last = now;
      this.accum += (dt / 1000) * this.sps;

      let guard = 0;
      while (this.accum >= 1 && this.index < this.frames.length - 1) {
        this.index += 1;
        this.accum -= 1;
        if (++guard > 5000) {
          this.accum = 0; // never loop unboundedly
          break;
        }
      }

      if (this.index >= this.frames.length - 1) {
        this.playing = false;
        this.onEnd?.();
      }
      this.renderFrame();
    }
    this._raf = requestAnimationFrame(this._tick);
  }

  stepForward() {
    if (this.frames.length && this.index < this.frames.length - 1) {
      this.index += 1;
      this.playing = false;
      this.renderFrame();
    }
  }

  stepBack() {
    if (this.frames.length && this.index > 0) {
      this.index -= 1;
      this.playing = false;
      this.renderFrame();
    }
  }

  skipEnd() {
    if (this.frames.length) {
      this.index = this.frames.length - 1;
      this.playing = false;
      this.onEnd?.();
      this.renderFrame();
    }
  }

  reset() {
    if (this.frames.length) {
      this.index = 0;
      this.playing = false;
      this.renderFrame();
    }
  }

  setSpeed(sps) {
    this.sps = Math.max(1, sps);
  }
}
