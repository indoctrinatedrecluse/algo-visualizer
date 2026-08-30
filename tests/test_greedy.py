"""Tests for Greedy Algorithms: Fractional Knapsack, Activity Selection,
Job Sequencing, Huffman Coding, and Greedy Coin Change.
"""

import engine
from fastapi.testclient import TestClient
import main

client = TestClient(main.app)


def test_fractional_knapsack():
    result = engine.run_sort("fractional_knapsack")
    assert result["category"] == "greedy"
    frames = result["frames"]
    assert len(frames) > 3
    last = frames[-1]
    assert last["type"] == "done"
    assert last["gauge"]["total_value"] > 0
    assert last["gauge"]["current_weight"] <= last["gauge"]["max_capacity"]


def test_activity_selection():
    result = engine.run_sort("activity_selection")
    assert result["category"] == "greedy"
    frames = result["frames"]
    assert len(frames) > 4
    last = frames[-1]
    assert last["type"] == "done"
    assert len(last["state"]["selected"]) >= 3


def test_job_sequencing():
    result = engine.run_sort("job_sequencing")
    assert result["category"] == "greedy"
    frames = result["frames"]
    assert len(frames) > 3
    last = frames[-1]
    assert last["type"] == "done"
    assert last["state"]["total_profit"] > 0


def test_huffman_coding():
    result = engine.run_sort("huffman_coding")
    assert result["category"] == "greedy"
    frames = result["frames"]
    assert len(frames) > 3
    last = frames[-1]
    assert last["type"] == "done"
    assert "codes" in last["state"]
    assert len(last["state"]["codes"]) == 6


def test_coin_change_greedy():
    result = engine.run_sort("coin_change_greedy", array=[25, 10, 5, 1], target=67)
    assert result["category"] == "greedy"
    frames = result["frames"]
    assert len(frames) > 2
    last = frames[-1]
    assert last["type"] == "done"
    assert last["state"]["remaining"] == 0
    assert sum(last["state"]["picked"]) == 67


def test_greedy_line_numbers_map_into_source():
    for algo_name in ("fractional_knapsack", "activity_selection", "job_sequencing", "huffman_coding", "coin_change_greedy"):
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


def test_ws_greedy_roundtrip():
    for algo_name in ("fractional_knapsack", "activity_selection", "job_sequencing", "huffman_coding", "coin_change_greedy"):
        with client.websocket_connect("/ws") as ws:
            ws.send_json({
                "action": "sort",
                "algorithm": algo_name,
                "request_id": 501,
            })
            msg = ws.receive_json()
            assert msg["type"] == "result"
            assert msg["request_id"] == 501
            assert msg["category"] == "greedy"
            assert msg["frames"][-1]["type"] == "done"
