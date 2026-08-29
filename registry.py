"""Shared registry: step events, algorithm metadata, and the global registry
of visualizable algorithms (sorting + searching).

Both the ``sorting`` and ``searching`` packages import :class:`Step` and
:class:`AlgorithmInfo` from here and register themselves into
:data:`ALGORITHMS` at import time.

Every algorithm is written as a *generator function* that yields a
:class:`Step` for each observable operation.  The engine in ``engine.py``
drives the generator, snapshots the array after every yield, and attaches the
exact source line of the ``yield`` statement automatically -- so the
code-panel highlight can never drift from the real source.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Iterator

# Step types (kept as module constants so the client schema stays stable).
COMPARE = "compare"
SWAP = "swap"
MARK = "mark"
SORTED = "sorted"
DONE = "done"
# Quick-sort-specific steps (drive the recursion-tree view).
PIVOT = "pivot"          # pivot chosen / placed
RANGE = "range"          # entering a subarray [lo, hi]
PARTITION = "partition"  # subarray split; carries the two child ranges
# Search-specific steps.
FOUND = "found"          # target found at indices[0]
NOT_FOUND = "not_found"  # target not present in the array

# Algorithm categories.
SORTING = "sorting"
SEARCHING = "searching"


@dataclass
class Step:
    """One observable event yielded by an algorithm generator.

    Attributes:
        type: One of the step-type constants above.
        indices: Array positions to highlight (0-based).
        message: Human-readable explanation shown in the status bar.
        range: Optional (lo, hi) of the subarray / search range currently
            being processed.
        children: Optional tuple of ((lo1, hi1), (lo2, hi2)) — the two
            subarrays produced by a quick-sort partition.
    """

    type: str
    indices: tuple = ()
    message: str = ""
    range: tuple = ()
    children: tuple = ()


@dataclass
class AlgorithmInfo:
    """Metadata + callable for one registered algorithm.

    ``fn`` is called as ``fn(array)`` for sorting and ``fn(array, target)``
    for searching; both return an iterator of :class:`Step`.
    """

    name: str
    display_name: str
    description: str
    best: str
    average: str
    worst: str
    space: str
    stable: bool
    fn: Callable[..., Iterator[Step]]
    category: str = SORTING
    needs_sorted_input: bool = False


# Registry: algorithm name -> AlgorithmInfo (populated at import time).
ALGORITHMS: dict[str, AlgorithmInfo] = {}


def register(info: AlgorithmInfo) -> None:
    """Register an algorithm so the engine and the API can find it."""
    ALGORITHMS[info.name] = info
