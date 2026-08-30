"""Tests for Gale-Shapley Stable Matching Algorithm and Stability Verification."""

import engine
from fastapi.testclient import TestClient
import main
from matching.matching_utils import (
    generate_random_preferences,
    get_default_preferences,
    verify_stability,
)

client = TestClient(main.app)


def test_default_preferences_structure():
    prefs = get_default_preferences()
    assert "proposers" in prefs
    assert "reviewers" in prefs
    assert len(prefs["proposers"]) == 6
    assert len(prefs["reviewers"]) == 6
    assert set(prefs["proposers"].keys()) == {"M1", "M2", "M3", "M4", "M5", "M6"}
    assert set(prefs["reviewers"].keys()) == {"W1", "W2", "W3", "W4", "W5", "W6"}


def test_random_preferences_generator():
    for n in (4, 6, 8):
        prefs = generate_random_preferences(n, seed=42)
        assert len(prefs["proposers"]) == n
        assert len(prefs["reviewers"]) == n
        for p, r_list in prefs["proposers"].items():
            assert len(r_list) == n
            assert len(set(r_list)) == n


def test_gale_shapley_produces_stable_matching():
    for n in (4, 6, 8):
        prefs = generate_random_preferences(n, seed=n * 10)
        result = engine.run_sort("gale_shapley", matching_data=prefs)
        assert result["category"] == "matching"
        frames = result["frames"]
        assert len(frames) > 3

        last_frame = frames[-1]
        assert last_frame["type"] == "done"
        matches = last_frame["matches"]
        assert len(matches) == n

        # Verify stability (zero blocking pairs)
        blocking = verify_stability(prefs["proposers"], prefs["reviewers"], matches)
        assert len(blocking) == 0, f"Found blocking pairs: {blocking}"


def test_gale_shapley_default_run():
    result = engine.run_sort("gale_shapley")
    assert result["category"] == "matching"
    frames = result["frames"]
    assert len(frames) > 5

    last_frame = frames[-1]
    assert last_frame["type"] == "done"
    assert len(last_frame["matches"]) == 6


def test_matching_line_numbers_map_into_source():
    detail = engine.get_algorithm_detail("gale_shapley")
    start_line = detail["start_line"]
    source_lines = detail["source"].splitlines()
    result = engine.run_sort("gale_shapley")
    assert result["frames"], "gale_shapley produced no frames"
    for frame in result["frames"]:
        rel = frame["line"] - start_line
        assert 0 <= rel < len(source_lines), (
            f"gale_shapley: line {frame['line']} outside source range "
            f"[{start_line}, {start_line + len(source_lines)})"
        )


def test_ws_matching_roundtrip():
    with client.websocket_connect("/ws") as ws:
        ws.send_json({
            "action": "sort",
            "algorithm": "gale_shapley",
            "request_id": 401,
        })
        msg = ws.receive_json()
        assert msg["type"] == "result"
        assert msg["request_id"] == 401
        assert msg["category"] == "matching"
        assert msg["frames"][-1]["type"] == "done"
        assert len(msg["frames"][-1]["matches"]) == 6
