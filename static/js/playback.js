// Frame playback engine: speed control, play/pause, step fwd/back, skip.
//
// The server computes the full frame list up-front; the client replays it
// with requestAnimationFrame at a user-chosen speed (steps/second). This
// decouples compute time from animation time and makes scrubbing trivial.
//
// Transitions INTO a "swap" frame get a minimum duration (SWAP_MS) so the
// sliding elements stay visible even at high playback speeds. Each frame is
// rendered as (curr, prev, progress) so renderers can interpolate positions.

// Minimum duration of a swap transition, in milliseconds.
const SWAP_MS = 220;

export class Player {
  constructor(render) {
    this.render = render;
    this.frames = [];
    this.cumSorted = [];     // per-frame snapshot of permanently-sorted flags
    this.cumStats = [];      // per-frame { compares, swaps }
    this.index = -1;
    this.playing = false;
    this.sps = 10;           // steps per second
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
    const curr = this.frames[this.index];
    if (!curr) return;
    const prev = this.index > 0 ? this.frames[this.index - 1] : null;
    const dur = this.frameDuration();
    const progress = this.playing && this.index > 0 && dur > 0
      ? Math.min(1, this.accum / dur)
      : 1;
    this.render(curr, prev, progress, this.cumSorted[this.index] ?? new Set());
  }

  play() {
    if (this.frames.length === 0) return;
    if (this.index >= this.frames.length - 1) {
      this.index = 0;
      this.accum = 0;
    }
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

  // Duration of the current frame's display/transition, in milliseconds.
  // Swap frames are held at least SWAP_MS so the slide is visible; every
  // other frame follows the user-chosen speed (steps per second).
  frameDuration() {
    const curr = this.frames[this.index];
    const base = 1000 / this.sps;
    if (!curr || this.index === 0) return base;
    return curr.type === "swap" ? Math.max(base, SWAP_MS) : base;
  }

  tick(now) {
    if (this.playing) {
      const dt = Math.min(now - this.last, 250); // clamp long background gaps
      this.last = now;
      this.accum += dt; // ms spent inside the current frame

      let guard = 0;
      while (this.accum >= this.frameDuration()
             && this.index < this.frames.length - 1) {
        this.accum -= this.frameDuration();
        this.index += 1;
        // Restart swap animations from 0 so the slide is always fully visible,
        // even after skipping through many fast non-swap frames.
        if (this.frames[this.index]?.type === "swap") this.accum = 0;
        if (++guard > 5000) {
          this.accum = 0; // never loop unboundedly
          break;
        }
      }

      if (this.index >= this.frames.length - 1) {
        this.playing = false;
        this.accum = 0;
        this.onEnd?.();
      }
      this.renderFrame();
    }
    this._raf = requestAnimationFrame(this._tick);
  }

  stepForward() {
    if (this.frames.length && this.index < this.frames.length - 1) {
      this.index += 1;
      this.accum = 0;
      this.playing = false;
      this.renderFrame();
    }
  }

  stepBack() {
    if (this.frames.length && this.index > 0) {
      this.index -= 1;
      this.accum = 0;
      this.playing = false;
      this.renderFrame();
    }
  }

  skipEnd() {
    if (this.frames.length) {
      this.index = this.frames.length - 1;
      this.accum = 0;
      this.playing = false;
      this.renderFrame();
      this.onEnd?.();
    }
  }

  reset() {
    if (this.frames.length) {
      this.index = 0;
      this.accum = 0;
      this.playing = false;
      this.renderFrame();
    }
  }

  setSpeed(sps) {
    this.sps = Math.max(1, sps);
  }
}
