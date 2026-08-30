"""Tests for Graph Algorithms (Dijkstra, TSP) and Graph Visualizer integration."""

import engine
from fastapi.testclient import TestClient
from graph.graph_utils import build_adjacency, generate_random_graph, get_default_graph
import main

client = TestClient(main.app)


def test_default_graph_structure():
    g = get_default_graph()
    assert len(g["nodes"]) == 10
    assert len(g["edges"]) >= 10
    adj = build_adjacency(g)
    assert "A" in adj and "J" in adj
    assert adj["A"]["B"] == 3


def test_random_graph_generator():
    for n in (6, 8, 10):
        g = generate_random_graph(n, seed=42)
        assert len(g["nodes"]) == n
        adj = build_adjacency(g)
        assert len(adj) == n
        for u, neighbors in adj.items():
            assert len(neighbors) >= 1
            for v, w in neighbors.items():
                assert w >= 1


def test_dijkstra_finds_shortest_path():
    g = get_default_graph()
    result = engine.run_sort("dijkstra", graph_data=g, start="A", target="J")
    assert result["category"] == "graph"
    assert result["start"] == "A"
    assert result["target"] == "J"
    frames = result["frames"]
    assert len(frames) > 5

    # Check path step
    path_frames = [f for f in frames if f["type"] == "path"]
    assert path_frames, "expected path frame in Dijkstra"
    final_path = path_frames[-1]["path"]
    assert final_path[0] == "A"
    assert final_path[-1] == "J"

    # Verify distances are recorded
    last_frame = frames[-1]
    assert last_frame["dist"]["A"] == 0
    assert last_frame["dist"]["J"] != "∞"


def test_tsp_finds_optimal_tour():
    g = generate_random_graph(5, seed=123)
    result = engine.run_sort("tsp", graph_data=g, start="A")
    assert result["category"] == "graph"
    frames = result["frames"]
    assert len(frames) > 5

    done_frame = [f for f in frames if f["type"] == "done"][-1]
    tour = done_frame["tour"]
    assert len(tour) == 6  # 5 nodes + return to start
    assert tour[0] == "A"
    assert tour[-1] == "A"
    assert set(tour) == set(n["id"] for n in g["nodes"])


def test_graph_line_numbers_map_into_source():
    for algo_name in ("dijkstra", "tsp"):
        detail = engine.get_algorithm_detail(algo_name)
        start_line = detail["start_line"]
        source_lines = detail["source"].splitlines()
        result = engine.run_sort(algo_name)
        assert result["frames"], f"{algo_name} produced no frames"
        for frame in result["frames"]:
            rel = frame["line"] - start_line
            assert 0 <= rel < len(source_lines), (
                f"{algo_name}: line {frame['line']} outside source range "
                f"[{start_line}, {start_line + len(source_lines)})"
            )


def test_ws_dijkstra_roundtrip():
    with client.websocket_connect("/ws") as ws:
        ws.send_json({
            "action": "sort",
            "algorithm": "dijkstra",
            "start": "A",
            "target": "J",
            "request_id": 101,
        })
        msg = ws.receive_json()
        assert msg["type"] == "result"
        assert msg["request_id"] == 101
        assert msg["category"] == "graph"
        assert msg["frames"][-1]["type"] == "done"


def test_ws_tsp_roundtrip():
    with client.websocket_connect("/ws") as ws:
        ws.send_json({
            "action": "sort",
            "algorithm": "tsp",
            "start": "A",
            "request_id": 102,
        })
        msg = ws.receive_json()
        assert msg["type"] == "result"
        assert msg["request_id"] == 102
        assert msg["category"] == "graph"
        assert len(msg["frames"][-1]["tour"]) >= 3
