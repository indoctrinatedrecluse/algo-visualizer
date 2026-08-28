"""Sorting algorithm package.

Each algorithm is a generator function that mutates its input list in place
and ``yield``s a :class:`Step` for every observable operation.  Importing this
package registers all algorithms (via the ``register`` call at the bottom of
each module) into :data:`ALGORITHMS`.
"""

from .registry import ALGORITHMS, AlgorithmInfo, Step, register
from . import bubble_sort  # noqa: F401  (registers on import)
from . import insertion_sort  # noqa: F401
from . import selection_sort  # noqa: F401
from . import merge_sort  # noqa: F401
from . import quick_sort  # noqa: F401

__all__ = ["ALGORITHMS", "AlgorithmInfo", "Step", "register"]
