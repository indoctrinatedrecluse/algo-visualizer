"""Tests for Dynamic Programming Algorithms: 0-1 Knapsack, LCS,
Minimum Path Sum, 3-Sum, 4-Sum, Fibonacci, LIS, and DP Coin Change.
"""

import engine
from fastapi.testclient import TestClient
import main

client = TestClient(main.app)


def test_knapsack_01():
    result = engine.run_sort("knapsack_01")
    assert result["category"] == "dp"
    frames = result["frames"]
    assert len(frames) > 5
    last = frames[-1]
    assert last["type"] == "done"
    assert last["state"]["max_value"] > 0
    assert len(last["backtrack_path"]) > 0


def test_lcs():
    result = engine.run_sort("lcs")
    assert result["category"] == "dp"
    frames = result["frames"]
    assert len(frames) > 5
    last = frames[-1]
    assert last["type"] == "done"
    assert last["state"]["length"] == 4
    assert last["state"]["lcs"] in ("BCBA", "BDAB", "BCAB")


def test_min_path_sum():
    result = engine.run_sort("min_path_sum")
    assert result["category"] == "dp"
    frames = result["frames"]
    assert len(frames) > 5
    last = frames[-1]
    assert last["type"] == "done"
    assert last["state"]["min_cost"] > 0
    assert len(last["state"]["path"]) == 8  # 4 rows + 5 cols - 1 steps = 8 cells


def test_three_sum():
    result = engine.run_sort("three_sum", array=[-1, 0, 1, 2, -1, -4], target=0)
    assert result["category"] == "dp"
    frames = result["frames"]
    assert len(frames) > 3
    last = frames[-1]
    assert last["type"] == "done"
    assert len(last["triplets"]) >= 2
    for a, b, c in last["triplets"]:
        assert a + b + c == 0


def test_four_sum():
    result = engine.run_sort("four_sum", array=[1, 0, -1, 0, -2, 2], target=0)
    assert result["category"] == "dp"
    frames = result["frames"]
    assert len(frames) > 3
    last = frames[-1]
    assert last["type"] == "done"
    assert len(last["quadruplets"]) >= 1
    for a, b, c, d in last["quadruplets"]:
        assert a + b + c + d == 0


def test_fibonacci():
    result = engine.run_sort("fibonacci", target=10)
    assert result["category"] == "dp"
    frames = result["frames"]
    assert len(frames) > 5
    last = frames[-1]
    assert last["type"] == "done"
    assert last["state"]["result"] == 55


def test_lis():
    result = engine.run_sort("lis", array=[10, 22, 9, 33, 21, 50, 41, 60, 80])
    assert result["category"] == "dp"
    frames = result["frames"]
    assert len(frames) > 5
    last = frames[-1]
    assert last["type"] == "done"
    assert last["state"]["max_length"] == 6


def test_coin_change_dp():
    result = engine.run_sort("coin_change_dp", array=[1, 2, 5, 10], target=18)
    assert result["category"] == "dp"
    frames = result["frames"]
    assert len(frames) > 5
    last = frames[-1]
    assert last["type"] == "done"
    assert last["state"]["min_coins"] == 4  # 10 + 5 + 2 + 1 = 18
    assert sum(last["state"]["coins_used"]) == 18


def test_dp_line_numbers_map_into_source():
    for algo_name in ("knapsack_01", "lcs", "min_path_sum", "three_sum", "four_sum", "fibonacci", "lis", "coin_change_dp"):
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


def test_ws_dp_roundtrip():
    for algo_name in ("knapsack_01", "lcs", "min_path_sum", "three_sum", "four_sum", "fibonacci", "lis", "coin_change_dp"):
        with client.websocket_connect("/ws") as ws:
            ws.send_json({
                "action": "sort",
                "algorithm": algo_name,
                "request_id": 601,
            })
            msg = ws.receive_json()
            assert msg["type"] == "result"
            assert msg["request_id"] == 601
            assert msg["category"] == "dp"
            assert msg["frames"][-1]["type"] == "done"
