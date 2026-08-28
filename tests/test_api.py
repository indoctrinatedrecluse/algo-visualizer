"""API-layer tests using FastAPI's TestClient (no live server needed)."""

from fastapi.testclient import TestClient

import main

client = TestClient(main.app)


def test_health():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_algorithms_list():
    resp = client.get("/api/algorithms")
    assert resp.status_code == 200
    names = [a["name"] for a in resp.json()["algorithms"]]
    assert "quick_sort" in names


def test_algorithm_detail_and_404():
    resp = client.get("/api/algorithms/bubble_sort")
    assert resp.status_code == 200
    detail = resp.json()
    assert detail["start_line"] >= 1
    assert detail["source"].startswith("def bubble_sort")
    assert "swap" in detail["source"]

    missing = client.get("/api/algorithms/nope")
    assert missing.status_code == 404


def test_index_served():
    resp = client.get("/")
    assert resp.status_code == 200
    assert "Algo Visualizer" in resp.text


def test_static_assets_served():
    for path in (
        "/static/styles.css",
        "/static/js/main.js",
        "/static/vendor/prism/prism.min.js",
        "/static/vendor/prism/prism-python.min.js",
        "/static/vendor/prism/prism-tomorrow.min.css",
    ):
        resp = client.get(path)
        assert resp.status_code == 200, f"{path} not served"
        assert resp.content, f"{path} served empty"


def test_ws_sort_roundtrip():
    with client.websocket_connect("/ws") as ws:
        ws.send_json(
            {
                "action": "sort",
                "algorithm": "insertion_sort",
                "array": [4, 2, 5, 1, 3],
                "request_id": 7,
            }
        )
        msg = ws.receive_json()
        assert msg["type"] == "result"
        assert msg["request_id"] == 7
        assert msg["frames"][-1]["array"] == [1, 2, 3, 4, 5]


def test_ws_error_path():
    with client.websocket_connect("/ws") as ws:
        ws.send_json({"action": "sort", "algorithm": "nope", "array": [1]})
        msg = ws.receive_json()
        assert msg["type"] == "error"
        assert "Unknown algorithm" in msg["message"]


def test_ws_ping():
    with client.websocket_connect("/ws") as ws:
        ws.send_json({"action": "ping"})
        msg = ws.receive_json()
        assert msg["type"] == "pong"
