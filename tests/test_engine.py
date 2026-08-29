"""Tests for the algorithm engine.

The engine is the heart of the project: it drives each algorithm generator,
snapshots the array after every step, and attaches the exact source line of
each ``yield``. These tests verify correctness of the sorting itself and that
every reported line number maps into the algorithm's real source.
"""

import random

import pytest

import engine
from registry import ALGORITHMS

SORTING_ALGORITHMS = sorted(i.name for i in ALGORITHMS.values() if i.category == "sorting")
SEARCHING_ALGORITHMS = sorted(i.name for i in ALGORITHMS.values() if i.category == "searching")

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


@pytest.mark.parametrize("name", SORTING_ALGORITHMS)
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


@pytest.mark.parametrize("name", SORTING_ALGORITHMS)
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
    target = arr[0] if detail["category"] == "searching" else None
    result = engine.run_sort(name, arr, target)
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


def test_quick_sort_emits_partition_and_range_events():
    """The optimized quick sort must emit range/pivot/partition frames that
    drive the recursion-tree visualization."""
    arr = [random.Random(3).randint(1, 100) for _ in range(40)]
    result = engine.run_sort("quick_sort", arr)

    partition_frames = [f for f in result["frames"] if f["type"] == "partition"]
    assert partition_frames, "expected at least one partition event"
    for f in partition_frames:
        assert len(f["range"]) == 2
        assert len(f["children"]) == 2
        lo, hi = f["range"]
        assert 0 <= lo <= hi < len(arr)
        for child_lo, child_hi in f["children"]:
            assert -1 <= child_lo and child_hi < len(arr)

    assert any(f["type"] == "range" for f in result["frames"])
    assert any(f["type"] == "pivot" for f in result["frames"])


def test_quick_sort_marks_every_element_sorted():
    """Every index should be permanently marked 'sorted' by the time the
    optimized quick sort finishes (pivots, singletons and insertion-sorted
    ranges are all covered)."""
    arr = [random.Random(11).randint(1, 100) for _ in range(60)]
    result = engine.run_sort("quick_sort", arr)
    marked = set()
    for f in result["frames"]:
        if f["type"] == "sorted":
            marked.update(f["indices"])
    assert marked == set(range(len(arr))), "every index should be marked sorted"


# ---------------------------------------------------------------------------
# Searching algorithms
# ---------------------------------------------------------------------------

def test_linear_search_finds():
    arr = [4, 2, 9, 1, 7]
    result = engine.run_sort("linear_search", arr, 9)
    assert result["frames"][-1]["type"] == "found"
    assert result["frames"][-1]["indices"] == [2]
    assert result["category"] == "searching"
    assert result["target"] == 9


def test_linear_search_missing():
    result = engine.run_sort("linear_search", [4, 2, 9], 99)
    assert result["frames"][-1]["type"] == "not_found"


def test_search_does_not_mutate_array():
    """Searching algorithms never change the array (all frames identical)."""
    arr = [8, 2, 5, 1, 9, 3]
    result = engine.run_sort("linear_search", arr, 5)
    for frame in result["frames"]:
        assert frame["array"] == arr


def test_binary_search_finds():
    arr = [1, 3, 5, 7, 9, 11, 13]
    result = engine.run_sort("binary_search", arr, 9)
    assert result["frames"][-1]["type"] == "found"
    assert result["frames"][-1]["indices"] == [4]
    # Range frames drive the search-range visualization.
    range_frames = [f for f in result["frames"] if f["type"] == "range"]
    assert range_frames, "binary search should emit range frames"
    for f in range_frames:
        assert len(f["range"]) == 2


def test_binary_search_missing():
    result = engine.run_sort("binary_search", [1, 3, 5, 7, 9], 4)
    assert result["frames"][-1]["type"] == "not_found"


def test_search_target_required():
    with pytest.raises(ValueError):
        engine.run_sort("binary_search", [1, 2, 3])


def test_search_metadata_fields():
    meta = {a["name"]: a for a in engine.list_algorithms()}
    assert meta["linear_search"]["category"] == "searching"
    assert meta["linear_search"]["needs_sorted_input"] is False
    assert meta["binary_search"]["needs_sorted_input"] is True
    assert meta["bubble_sort"]["category"] == "sorting"
    detail = engine.get_algorithm_detail("binary_search")
    assert detail["category"] == "searching"
    assert detail["needs_sorted_input"] is True
