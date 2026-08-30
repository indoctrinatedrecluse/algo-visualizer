"""Tests for Network Flow Algorithms (Edmonds-Karp, Dinic, Min-Cut)."""

import engine
from fastapi.testclient import TestClient
from flow.flow_utils import (
    build_capacities,
    generate_random_flow_network,
    get_default_flow_network,
)
import main

client = TestClient(main.app)


def test_default_flow_network_structure():
    net = get_default_flow_network()
    assert net["source"] == "S"
    assert net["sink"] == "T"
    assert len(net["nodes"]) == 10
    assert len(net["edges"]) >= 15
    cap = build_capacities(net)
    assert cap["S"]["A"] == 12


def test_random_flow_network_generator():
    for n in (8, 10, 12):
        net = generate_random_flow_network(n, seed=42)
        assert len(net["nodes"]) == n
        assert net["source"] == "S"
        assert net["sink"] == "T"
        assert len(net["edges"]) >= n - 1


def test_edmonds_karp_max_flow_and_min_cut():
    net = get_default_flow_network()
    result = engine.run_sort("edmonds_karp", flow_data=net)
    assert result["category"] == "flow"
    assert result["total_flow"] > 0
    frames = result["frames"]
    assert len(frames) > 3

    # Check Max-Flow Min-Cut Theorem
    last_frame = frames[-1]
    assert last_frame["type"] == "done"
    assert last_frame["min_cut"] is not None
    s_set, t_set = last_frame["min_cut"]
    assert "S" in s_set
    assert "T" in t_set

    # Verify cut capacity equals total max flow
    cap = build_capacities(net)
    cut_capacity = sum(cap[u][v] for u in s_set for v in t_set)
    assert cut_capacity == result["total_flow"], (
        f"Min-Cut capacity {cut_capacity} must equal Max Flow {result['total_flow']}"
    )


def test_dinic_max_flow_matches_edmonds_karp():
    net = get_default_flow_network()
    ek_result = engine.run_sort("edmonds_karp", flow_data=net)
    dinic_result = engine.run_sort("dinic", flow_data=net)

    assert dinic_result["category"] == "flow"
    assert dinic_result["total_flow"] == ek_result["total_flow"], (
        f"Dinic's flow ({dinic_result['total_flow']}) must match Edmonds-Karp ({ek_result['total_flow']})"
    )


def test_flow_line_numbers_map_into_source():
    for algo_name in ("edmonds_karp", "dinic"):
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


def test_ws_flow_roundtrip():
    for algo_name in ("edmonds_karp", "dinic"):
        with client.websocket_connect("/ws") as ws:
            ws.send_json({
                "action": "sort",
                "algorithm": algo_name,
                "request_id": 301,
            })
            msg = ws.receive_json()
            assert msg["type"] == "result"
            assert msg["request_id"] == 301
            assert msg["category"] == "flow"
            assert msg["frames"][-1]["type"] == "done"
            assert msg["total_flow"] > 0
