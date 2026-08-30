"""Graph algorithms package (Dijkstra, TSP)."""

from registry import ALGORITHMS, AlgorithmInfo, Step, register
from . import dijkstra  # noqa: F401  (registers on import)
from . import tsp  # noqa: F401
from .graph_utils import generate_random_graph, get_default_graph

__all__ = [
    "ALGORITHMS",
    "AlgorithmInfo",
    "Step",
    "register",
    "get_default_graph",
    "generate_random_graph",
]
