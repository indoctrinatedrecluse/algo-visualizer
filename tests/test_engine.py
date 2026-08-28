"""Tests for the algorithm engine.

The engine is the heart of the project: it drives each algorithm generator,
snapshots the array after every step, and attaches the exact source line of
each ``yield``. These tests verify correctness of the sorting itself and that
every reported line number maps into the algorithm's real source.
"""

import random

import pytest

import engine
from sorting import ALGORITHMS

# Deterministic-ish arrays covering edge cases (sorted, reverse, dupes, small).
TEST_ARRAYS = [
    [1, 2, 3, 4, 5],
    [5, 4, 3, 2, 1],
    [3, 3, 1, 1, 2, 2],
    [7],
    [2, 1],
    [random.Random(42).randint(1, 100) for _ in range(30)],
    [random.Random(7).randint(1, 50) for _ in range(9)],
]


@pytest.mark.parametrize("name", sorted(ALGORITHMS))
def test_sorts_correctly(name):
    for arr in TEST_ARRAYS:
        result = engine.run_sort(name, arr)
        assert result["frames"], f"{name} produced no frames for {arr}"
        final_array = result["frames"][-1]["array"]
        assert final_array == sorted(arr), (
            f"{name} did not sort {arr} -> {final_array}"
        )
        assert result["stats"]["steps"] == len(result["frames"])
        assert result["stats"]["comparisons"] >= 0
        assert result["stats"]["swaps"] >= 0


@pytest.mark.parametrize("name", sorted(ALGORITHMS))
def test_frames_never_introduce_new_values(name):
    """Intermediate frames keep the input length and reuse only input values.

    Note: insertion/merge sort legitimately hold values outside the visible
    array (the picked-up key, the aux buffer), so intermediate frames are NOT
    required to be permutations -- only the final frame must be (checked by
    ``test_sorts_correctly``). This test catches actual corruption instead:
    an element vanishing or an out-of-range value appearing.
    """
    for arr in TEST_ARRAYS:
        result = engine.run_sort(name, arr)
        allowed = set(arr)
        for frame in result["frames"]:
            assert len(frame["array"]) == len(arr), (
                f"{name} changed the array length in {frame['array']}"
            )
            assert set(frame["array"]) <= allowed, (
                f"{name} introduced a new value in {frame['array']}"
            )


@pytest.mark.parametrize("name", sorted(ALGORITHMS))
def test_line_numbers_map_into_source(name):
    detail = engine.get_algorithm_detail(name)
    start = detail["start_line"]
    source_lines = detail["source"].splitlines()
    arr = TEST_ARRAYS[6]
    result = engine.run_sort(name, arr)
    assert result["frames"], f"{name} produced no frames"
    for frame in result["frames"]:
        rel = frame["line"] - start
        assert 0 <= rel < len(source_lines), (
            f"{name}: line {frame['line']} outside source range "
            f"[{start}, {start + len(source_lines)})"
        )


def test_unknown_algorithm():
    with pytest.raises(ValueError):
        engine.run_sort("not_a_real_sort", [1, 2, 3])


def test_empty_array():
    with pytest.raises(ValueError):
        engine.run_sort("bubble_sort", [])


def test_oversized_array():
    with pytest.raises(ValueError):
        engine.run_sort("bubble_sort", [1] * (engine.MAX_ELEMENTS + 1))


def test_algorithm_registry():
    names = engine.list_algorithms()
    assert len(names) >= 5
    assert {n["name"] for n in names} == set(ALGORITHMS)
    for n in names:
        assert n["display_name"]
        assert n["best"] and n["average"] and n["worst"] and n["space"]


def test_algorithm_detail_has_source():
    detail = engine.get_algorithm_detail("quick_sort")
    assert "def quick_sort" in detail["source"]
    assert detail["start_line"] >= 1
    assert detail["complexity"]["worst"] == "O(n²)"
