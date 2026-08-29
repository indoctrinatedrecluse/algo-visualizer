"""End-to-end smoke test for a running Algo Visualizer server.

Usage:
    python scripts/ws_smoke.py [ws://host:port/ws]

Default is ws://127.0.0.1:8080/ws (local dev). Point it at your hosted
Replit URL to validate the deployed WebSocket, e.g.:
    python scripts/ws_smoke.py wss://your-app.replit.app/ws
"""

import asyncio
import json
import sys

import websockets

DEFAULT = "ws://127.0.0.1:8080/ws"

HAPPY = {
    "action": "sort",
    "algorithm": "quick_sort",
    "array": [13, 3, 11, 18, 5, 7, 14, 1, 9, 16, 2, 12, 20, 4, 6, 15, 8, 10, 17, 19],
    "request_id": 42,
}


async def main(url):
    async with websockets.connect(url) as ws:
        # 1. happy path
        await ws.send(json.dumps(HAPPY))
        msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=10))
        frames = msg.get("frames", [])
        print("happy.type:", msg.get("type"))
        print("happy.request_id:", msg.get("request_id"))
        print("happy.frames:", len(frames))
        print("happy.last_array:", frames[-1]["array"] if frames else None)
        print("happy.stats:", msg.get("stats"))
        assert msg["request_id"] == 42
        assert frames and frames[-1]["array"] == sorted(HAPPY["array"])
        types = {f["type"] for f in frames}
        assert "partition" in types, "expected quick-sort partition events"
        assert "pivot" in types, "expected quick-sort pivot events"
        partition = next(f for f in frames if f["type"] == "partition")
        assert len(partition["children"]) == 2
        assert len(partition["range"]) == 2

        # 2. ping
        await ws.send(json.dumps({"action": "ping"}))
        pong = json.loads(await asyncio.wait_for(ws.recv(), timeout=10))
        print("ping.type:", pong.get("type"))
        assert pong["type"] == "pong"

        # 3. error path
        await ws.send(json.dumps({"action": "sort", "algorithm": "nope", "array": [1, 2]}))
        err = json.loads(await asyncio.wait_for(ws.recv(), timeout=10))
        print("err.type:", err.get("type"))
        print("err.message:", err.get("message"))
        assert err["type"] == "error"

    print("WS SMOKE OK")


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else DEFAULT))
