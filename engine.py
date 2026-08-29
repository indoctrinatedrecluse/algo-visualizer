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

Quick sort adds two optional fields for the recursion-tree view:
``range`` ([lo, hi] of the active subarray) and ``children`` (the two
subranges produced by a partition).  Binary search uses ``range`` for the
active search range; searching algorithms accept a ``target`` value.
"""

from __future__ import annotations

import inspect
from typing import Any

from registry import ALGORITHMS, SEARCHING

# Import both packages so all algorithms register themselves.
import searching  # noqa: F401
import sorting  # noqa: F401

# Hard safety cap so a single WebSocket message cannot exhaust the server.
MAX_ELEMENTS = 400


def run_sort(algorithm: str, array: list, target: Any = None) -> dict[str, Any]:
    """Execute ``algorithm`` on a copy of ``array``; return frames + stats.

    ``target`` is required for searching algorithms (``category == searching``)
    and ignored otherwise.

    Raises:
        ValueError: unknown algorithm, empty array, oversized array, or a
            searching algorithm called without a target.
    """
    if algorithm not in ALGORITHMS:
        raise ValueError(f"Unknown algorithm: {algorithm!r}")

    arr = [int(x) for x in array]
    if not arr:
        raise ValueError("Array must not be empty")
    if len(arr) > MAX_ELEMENTS:
        raise ValueError(f"Array too large: {len(arr)} elements (max {MAX_ELEMENTS})")

    info = ALGORITHMS[algorithm]
    if info.category == SEARCHING:
        if target is None:
            raise ValueError(f"{info.display_name} requires a target value")
        target = int(target)
        gen = info.fn(arr, target)
    else:
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

        # The generator suspends right at its `yield` statement, so its frame
        # knows the exact source line -- the code highlight can never drift.
        line = gen.gi_frame.f_lineno

        if step.type == "compare":
            comparisons += 1
        elif step.type == "swap":
            swaps += 1

        frames.append(
            {
                "array": list(arr),
                "line": line,
                "indices": list(step.indices),
                "type": step.type,
                "message": step.message,
            }
        )

        # Quick-sort-specific fields for the recursion-tree view.
        if step.range:
            frames[-1]["range"] = list(step.range)
        if step.children:
            frames[-1]["children"] = [list(child) for child in step.children]

    return {
        "frames": frames,
        "stats": {
            "comparisons": comparisons,
            "swaps": swaps,
            "steps": len(frames),
        },
        "category": info.category,
        "target": target,
    }


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
