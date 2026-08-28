# Algo Visualizer

A real-time algorithm visualizer built to run live on **Replit**. Sorting
algorithms execute on a Python backend while a browser canvas animates the
array **in sync with the currently executing source line** — the code panel
highlight is driven by the actual running generator, never a stale copy.

## Stack

| Layer       | Choice                                                  |
| ----------- | ------------------------------------------------------- |
| Backend     | Python 3 · FastAPI · uvicorn (single process)           |
| Realtime    | WebSocket (`/ws`)                                       |
| Algorithms  | Generator functions that yield a `Step` per operation   |
| Frontend    | Vanilla JS (ES modules) · HTML5 Canvas · Prism          |
| Hosting     | Replit (`.replit` + `replit.nix`, port 8080 → 80)       |

## How "code highlight tracked by the graphic" works

1. Each sorting algorithm is a **generator** that mutates the array in place
   and `yield`s a `Step` (`compare`, `swap`, `mark`, `sorted`, ...).
2. `engine.run_sort()` drives the generator; after every `yield` it reads the
   generator frame's `f_lineno` — the **exact source line** of that `yield` —
   and snapshots the array.
3. The browser replays the resulting frame list; each frame redraws the canvas
   and highlights the matching line in the code panel. Because the highlight
   comes from the live generator frame, it can never drift from the source.

## Quick start

Run the app with a single command (creates `.venv` if needed, installs the
runtime dependencies, and starts the server on http://localhost:8080):

```bash
./run.sh                     # macOS / Linux / Replit / git-bash on Windows
```

```powershell
.\run.ps1                    # Windows PowerShell
```

Override the port with the `PORT` environment variable if 8080 is taken.

## Local development

```bash
python -m venv .venv
.venv/Scripts/activate            # (Windows)  — on macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn main:app --reload --port 8080
```

Open <http://localhost:8080>. The WebSocket automatically uses
`ws://` vs `wss://` based on the page protocol, so the same code works locally
and on Replit.

### Tests

```bash
pytest tests/ -q
```

End-to-end WebSocket smoke test (run against a live server):

```bash
python scripts/ws_smoke.py                                    # local dev
python scripts/ws_smoke.py wss://your-app.replit.app/ws       # hosted Replit
```

## Running on Replit

1. Import this repo into a Replit project (Python).
2. Replit installs dependencies from `requirements.txt` (uses pip when no
   poetry section exists) and runs the command in `.replit`
   (`uvicorn main:app --host 0.0.0.0 --port 8080`).
3. `[[ports]]` forwards external port 80 → internal 8080, so the webview and
   any Deployment get the app at the root URL with no port suffix.

If Replit generates its own `.replit`/`replit.nix` on import, keep the
`[deployment]` run command and `[[ports]]` block above — they are what make
the server live and reachable.

## Project layout

```
main.py                  FastAPI app (static files, /api, /ws)
engine.py                generator → frames; automatic line-number capture
sorting/                 one file per algorithm + registry.py
static/index.html        UI shell
static/js/               api · canvas · playback · codePanel · main
static/vendor/prism/     vendored Prism (syntax highlighting, offline-safe)
tests/test_engine.py     engine correctness + line-mapping tests
```

## Roadmap

- [x] Bubble, insertion, selection, merge, quick sort
- [x] Play/pause, step fwd/back, speed slider, skip to end, shuffle, size
- [x] Compare/swap highlights with arrows, green "sorted" sweep
- [ ] True `sys.settrace` live-tracing mode
- [ ] More algorithms (heap sort, radix sort, Bogo sort…)
- [ ] Dual/auxiliary-array visualization for merge sort
