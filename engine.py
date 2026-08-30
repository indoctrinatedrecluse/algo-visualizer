"""Runs an algorithm generator (sorting or searching) and records every step
as a frame.

A *frame* is a full snapshot of the array plus the metadata needed to drive
both the canvas visualization and the synchronized code highlight::

    {
        "array": [...],       # full array state after the step
        "line": 14,           # absolute source line of the yield (1-based)
        "indices": [2, 5],    # positions to highlight
        "type": "swap",       # compare | swap | mark | sorted | done
                             #   | pivot | range | partition
                             #   | found | not_found
        "message": "Swap 8 and 3",
    }

Divide-and-conquer algorithms (Quick Sort, Merge Sort) add optional
fields for the recursion-tree view: ``range`` ([lo, hi] of the active
subarray) and ``children`` (the two subranges produced by a split).
Binary search uses ``range`` for the active search range; searching
algorithms accept a ``target`` value.
"""

from __future__ import annotations

import inspect
from typing import Any

from registry import ALGORITHMS, DP, FLOW, GRAPH, GREEDY, MATCHING, SEARCHING, TREE

# Import packages so all algorithms register themselves.
import dp  # noqa: F401
import flow  # noqa: F401
import graph  # noqa: F401
import greedy  # noqa: F401
import matching  # noqa: F401
import searching  # noqa: F401
import sorting  # noqa: F401
import tree  # noqa: F401

# Hard safety cap so a single WebSocket message cannot exhaust the server.
MAX_ELEMENTS = 400


def run_sort(
    algorithm: str,
    array: list | None = None,
    target: Any = None,
    graph_data: dict[str, Any] | None = None,
    start: str | None = None,
    tree_data: dict[str, Any] | None = None,
    key: Any = None,
    flow_data: dict[str, Any] | None = None,
    matching_data: dict[str, Any] | None = None,
    custom_data: Any = None,
) -> dict[str, Any]:
    """Execute ``algorithm``; return frames + stats.

    Supports sorting, searching, graph, tree, network flow, matching, greedy, and DP algorithms.
    """
    if algorithm not in ALGORITHMS:
        raise ValueError(f"Unknown algorithm: {algorithm!r}")

    info = ALGORITHMS[algorithm]

    if info.category == GREEDY:
        if info.name == "fractional_knapsack":
            gen = info.fn(custom_data)
        elif info.name == "activity_selection":
            gen = info.fn(custom_data)
        elif info.name == "job_sequencing":
            gen = info.fn(custom_data)
        elif info.name == "huffman_coding":
            gen = info.fn(custom_data)
        elif info.name == "coin_change_greedy":
            coins = array if array is not None else [25, 10, 5, 1]
            t = int(target) if target is not None else 67
            gen = info.fn(coins, t)
        else:
            gen = info.fn()
        arr = array or []
    elif info.category == DP:
        if info.name == "knapsack_01":
            gen = info.fn(custom_data)
        elif info.name == "lcs":
            gen = info.fn(custom_data)
        elif info.name == "min_path_sum":
            gen = info.fn(custom_data)
        elif info.name == "three_sum":
            t = int(target) if target is not None else 0
            gen = info.fn(array, t)
        elif info.name == "four_sum":
            t = int(target) if target is not None else 0
            gen = info.fn(array, t)
        elif info.name == "fibonacci":
            n_val = int(target) if target is not None else (int(key) if key is not None else 15)
            gen = info.fn(n_val)
        elif info.name == "lis":
            gen = info.fn(array)
        elif info.name == "coin_change_dp":
            coins = array if array is not None else [1, 2, 5, 10]
            t = int(target) if target is not None else 18
            gen = info.fn(coins, t)
        else:
            gen = info.fn()
        arr = array or []
    elif info.category == MATCHING:
        m_data = matching_data if matching_data is not None else matching.get_default_preferences()
        gen = info.fn(m_data)
        arr = []
    elif info.category == GRAPH:
        g = graph_data if graph_data is not None else graph.get_default_graph()
        s = str(start) if start else "A"
        t = str(target) if target else None
        gen = info.fn(g, s, t)
        arr = []
    elif info.category == FLOW:
        net = flow_data if flow_data is not None else flow.get_default_flow_network()
        s = str(start) if start else net.get("source", "S")
        t = str(target) if target else net.get("sink", "T")
        gen = info.fn(net, s, t)
        arr = []
    elif info.category == TREE:
        t_data = tree_data
        k = key if key is not None else target
        if k is None:
            k = 53 if info.name == "avl_insert" else 25
        try:
            k_int = int(k)
        except (ValueError, TypeError):
            k_int = 53
        params = inspect.signature(info.fn).parameters
        if "key" in params:
            gen = info.fn(t_data, k_int)
        else:
            gen = info.fn(t_data)
        arr = []
        target = k_int
    elif info.category == SEARCHING:
        if array is None:
            raise ValueError("Array must not be empty")
        arr = [int(x) for x in array]
        if not arr:
            raise ValueError("Array must not be empty")
        if len(arr) > MAX_ELEMENTS:
            raise ValueError(f"Array too large: {len(arr)} elements (max {MAX_ELEMENTS})")
        if target is None:
            raise ValueError(f"{info.display_name} requires a target value")
        target = int(target)
        gen = info.fn(arr, target)
    else:
        if array is None:
            raise ValueError("Array must not be empty")
        arr = [int(x) for x in array]
        if not arr:
            raise ValueError("Array must not be empty")
        if len(arr) > MAX_ELEMENTS:
            raise ValueError(f"Array too large: {len(arr)} elements (max {MAX_ELEMENTS})")
        target = None
        gen = info.fn(arr)

    frames: list[dict[str, Any]] = []
    comparisons = 0
    swaps = 0

    while True:
        try:
            step = next(gen)
        except StopIteration:
            break

        line = gen.gi_frame.f_lineno

        if step.type in ("compare", "relax", "augment", "propose", "table_cell"):
            comparisons += 1
        elif step.type in ("swap", "rotate_left", "rotate_right", "push_flow", "accept", "break", "knapsack_pack", "fraction_pack", "interval_select"):
            swaps += 1

        frame: dict[str, Any] = {
            "line": line,
            "type": step.type,
            "message": step.message,
            "array": list(arr),
            "indices": list(step.indices),
        }

        if step.range:
            frame["range"] = list(step.range)
        if step.children:
            frame["children"] = [list(child) for child in step.children]

        if info.category == GREEDY:
            frame["items"] = step.items
            frame["intervals"] = step.intervals
            frame["gauge"] = step.gauge
            frame["tree"] = step.tree
            frame["state"] = step.state
        elif info.category == DP:
            frame["dp_table"] = step.dp_table
            frame["dp_row"] = step.dp_row
            frame["dp_col"] = step.dp_col
            frame["dp_active_cells"] = step.dp_active_cells
            frame["dp_dependencies"] = step.dp_dependencies
            frame["dp_row_labels"] = step.dp_row_labels
            frame["dp_col_labels"] = step.dp_col_labels
            frame["dp_title"] = step.dp_title
            frame["backtrack_path"] = step.backtrack_path
            frame["triplets"] = step.triplets
            frame["quadruplets"] = step.quadruplets
            frame["state"] = step.state
        elif info.category == MATCHING:
            frame["proposer"] = step.proposer
            frame["reviewer"] = step.reviewer
            frame["matches"] = step.matches
            frame["rejected"] = step.rejected
            frame["preferences"] = step.preferences
            frame["pair_status"] = step.pair_status
            frame["state"] = step.state
        elif info.category == GRAPH:
            frame["active_node"] = step.active_node
            frame["active_edge"] = list(step.active_edge) if step.active_edge else None
            frame["relaxed_edge"] = list(step.relaxed_edge) if step.relaxed_edge else None
            frame["path"] = list(step.path)
            frame["tour"] = list(step.tour)
            frame["dist"] = (
                {k: (int(v) if v != float("inf") else "∞") for k, v in step.dist.items()}
                if step.dist
                else {}
            )
            frame["prev"] = step.prev
            frame["state"] = step.state
        elif info.category == FLOW:
            frame["flow"] = step.flow
            frame["capacity"] = step.capacity
            frame["augmenting_path"] = list(step.augmenting_path)
            frame["bottleneck"] = step.bottleneck
            frame["min_cut"] = list(step.min_cut) if step.min_cut else None
            frame["total_flow"] = step.total_flow
            frame["levels"] = step.levels
        elif info.category == TREE:
            frame["tree"] = step.tree
            frame["rotation"] = step.rotation
            frame["highlight_nodes"] = step.highlight_nodes
            frame["active_val"] = step.active_val
            frame["node_colors"] = step.node_colors

        frames.append(frame)

    result: dict[str, Any] = {
        "frames": frames,
        "stats": {
            "comparisons": comparisons,
            "swaps": swaps,
            "steps": len(frames),
        },
        "category": info.category,
        "target": target,
    }

    if info.category == GREEDY:
        result["state"] = step.state if frames else {}
    elif info.category == DP:
        result["state"] = step.state if frames else {}
    elif info.category == MATCHING:
        result["preferences"] = m_data
        result["matches"] = step.matches if frames else {}
    elif info.category == GRAPH:
        result["graph"] = g
        result["start"] = s
        result["target"] = t
    elif info.category == FLOW:
        result["network"] = net
        result["total_flow"] = step.total_flow if frames else 0
        result["min_cut"] = step.min_cut if frames else None
    elif info.category == TREE:
        result["key"] = target

    return result


def list_algorithms() -> list[dict[str, Any]]:
    """Public metadata for every registered algorithm (no source code)."""
    return [
        {
            "name": info.name,
            "display_name": info.display_name,
            "description": info.description,
            "best": info.best,
            "average": info.average,
            "worst": info.worst,
            "space": info.space,
            "stable": info.stable,
            "category": info.category,
            "needs_sorted_input": info.needs_sorted_input,
        }
        for info in ALGORITHMS.values()
    ]


def get_algorithm_detail(algorithm: str) -> dict[str, Any]:
    """Metadata + exact source of an algorithm, for the code panel.

    ``start_line`` is the absolute line number of the ``def`` in its file, so
    the frontend can map frame ``line`` values onto the rendered source.
    """
    if algorithm not in ALGORITHMS:
        raise ValueError(f"Unknown algorithm: {algorithm!r}")
    info = ALGORITHMS[algorithm]
    lines, start_line = inspect.getsourcelines(info.fn)
    return {
        "name": info.name,
        "display_name": info.display_name,
        "description": info.description,
        "complexity": {
            "best": info.best,
            "average": info.average,
            "worst": info.worst,
            "space": info.space,
        },
        "stable": info.stable,
        "category": info.category,
        "needs_sorted_input": info.needs_sorted_input,
        "source": "".join(lines),
        "start_line": start_line,
    }
