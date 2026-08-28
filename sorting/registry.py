"""Core data structures for the sorting-algorithm engine.

Every sorting algorithm is written as a *generator function* that mutates its
input list in place and ``yield``s a :class:`Step` for each observable
operation (comparison, swap, mark, ...).  The engine in ``engine.py`` drives
the generator, snapshots the array after every yield, and attaches the exact
source line of the ``yield`` statement automatically -- so the code-panel
highlight can never drift from the real source.
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


@dataclass
class Step:
    """One observable event yielded by an algorithm generator.

    Attributes:
        type: One of COMPARE / SWAP / MARK / SORTED / DONE.
        indices: Array positions to highlight (0-based).
        message: Human-readable explanation shown in the status bar.
    """

    type: str
    indices: tuple = ()
    message: str = ""


@dataclass
class AlgorithmInfo:
    """Metadata + callable for one registered sorting algorithm."""

    name: str
    display_name: str
    description: str
    best: str
    average: str
    worst: str
    space: str
    stable: bool
    fn: Callable[[list], Iterator[Step]]


# Registry: algorithm name -> AlgorithmInfo (populated at import time).
ALGORITHMS: dict[str, AlgorithmInfo] = {}


def register(info: AlgorithmInfo) -> None:
    """Register an algorithm so the engine and the API can find it."""
    ALGORITHMS[info.name] = info
