"""FastAPI entrypoint: static frontend + algorithm API + WebSocket.

Single process, single port.  Serves the static frontend, exposes a REST API
for algorithm metadata/source, and a WebSocket endpoint that runs a sort and
streams back every frame.

Run locally:   uvicorn main:app --reload --port 8080
On Replit:     configured in .replit (uvicorn on 0.0.0.0:8080)
"""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

import engine

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title="Algo Visualizer", version="0.1.0")


@app.get("/", include_in_schema=False)
async def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/api/algorithms")
async def get_algorithms():
    return {"algorithms": engine.list_algorithms()}


@app.get("/api/algorithms/{name}")
async def get_algorithm(name: str):
    try:
        return engine.get_algorithm_detail(name)
    except ValueError as exc:
        return JSONResponse(status_code=404, content={"error": str(exc)})


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            message = await websocket.receive_json()
            action = message.get("action")
            if action == "ping":
                await websocket.send_json({"type": "pong"})
            elif action == "sort":
                try:
                    result = engine.run_sort(
                        message["algorithm"],
                        array=message.get("array"),
                        target=message.get("target"),
                        graph_data=message.get("graph"),
                        start=message.get("start"),
                        tree_data=message.get("tree"),
                        key=message.get("key"),
                        flow_data=message.get("network"),
                        matching_data=message.get("matching") or message.get("preferences"),
                        custom_data=message.get("data") or message.get("custom"),
                    )
                    result["request_id"] = message.get("request_id")
                    await websocket.send_json({"type": "result", **result})
                except (ValueError, KeyError, TypeError) as exc:
                    await websocket.send_json(
                        {"type": "error", "message": str(exc)}
                    )
            else:
                await websocket.send_json(
                    {"type": "error", "message": f"Unknown action: {action!r}"}
                )
    except WebSocketDisconnect:
        pass


app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


if __name__ == "__main__":
    import os
    import uvicorn

    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
