"""Back-compat shim: the shared registry now lives at the repo root
(``registry.py``).  Kept so existing ``sorting`` module imports keep working.
"""

from registry import *  # noqa: F401,F403
from registry import ALGORITHMS, AlgorithmInfo, Step, register  # noqa: F401

