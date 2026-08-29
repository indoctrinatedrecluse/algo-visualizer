"""Searching algorithm package (see the root ``registry`` module)."""

from registry import ALGORITHMS, AlgorithmInfo, Step, register
from . import binary_search  # noqa: F401  (registers on import)
from . import linear_search  # noqa: F401

__all__ = ["ALGORITHMS", "AlgorithmInfo", "Step", "register"]
