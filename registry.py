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

from dataclasses import dataclass, field
from typing import Callable, Iterator

# Step types (kept as module constants so the client schema stays stable).
COMPARE = "compare"
SWAP = "swap"
MARK = "mark"
SORTED = "sorted"
DONE = "done"
# Divide-and-conquer steps (drive the recursion-tree view).
PIVOT = "pivot"          # pivot chosen / placed
RANGE = "range"          # entering a subarray [lo, hi]
PARTITION = "partition"  # subarray split; carries the two child ranges
MERGED = "merged"        # subarray [lo, hi] merge complete
# Search-specific steps.
FOUND = "found"          # target found at indices[0]
NOT_FOUND = "not_found"  # target not present in the array
# Graph-specific steps.
VISIT = "visit"          # visiting / expanding a node
RELAX = "relax"          # relaxing an edge (Dijkstra)
SETTLE = "settle"        # node settled with final shortest distance
PATH = "path"            # shortest path found
TOUR = "tour"            # candidate tour in TSP
PRUNE = "prune"          # branch pruned in TSP
NEW_BEST = "new_best"    # new best tour found in TSP

# Tree-specific steps.
INSERT = "insert"        # node inserted
DELETE = "delete"        # node deleted
ROTATE_LEFT = "rotate_left"   # left rotation performed
ROTATE_RIGHT = "rotate_right" # right rotation performed
BALANCE = "balance"      # checking balance / rebalanced
RECOLOR = "recolor"      # recoloring nodes (Red-Black tree)

# Network Flow steps.
AUGMENT = "augment"      # augmenting path found
BOTTLENECK = "bottleneck"# bottleneck capacity computed
PUSH_FLOW = "push_flow"  # flow pushed along edge/path
LEVEL_GRAPH = "level_graph" # level graph constructed (Dinic)
CUT = "cut"              # minimum cut identified

# Matching steps (Gale-Shapley).
PROPOSE = "propose"      # proposer proposes to reviewer
ACCEPT = "accept"        # reviewer accepts proposal
REJECT = "reject"        # reviewer rejects proposal
BREAK = "break"          # reviewer breaks previous engagement

# Greedy steps.
INTERVAL_SELECT = "interval_select"  # interval selected
INTERVAL_REJECT = "interval_reject"  # interval rejected/conflict
KNAPSACK_PACK = "knapsack_pack"      # item packed in knapsack
FRACTION_PACK = "fraction_pack"      # fractional item slice packed
COIN_PICK = "coin_pick"              # coin denomination picked

# Dynamic Programming steps.
TABLE_CELL = "table_cell"            # DP table cell computed
BACKTRACK = "backtrack"              # optimal solution backtrack step
MATCH_FIND = "match_find"            # n-sum matching tuple found

# Algorithm categories.
SORTING = "sorting"
SEARCHING = "searching"
GRAPH = "graph"
TREE = "tree"
FLOW = "flow"
MATCHING = "matching"
GREEDY = "greedy"
DP = "dp"


@dataclass
class Step:
    """One observable event yielded by an algorithm generator.

    Attributes:
        type: One of the step-type constants above.
        indices: Array positions to highlight (0-based) for array algorithms.
        message: Human-readable explanation shown in the status bar.
        range: Optional (lo, hi) of the subarray / search range currently
            being processed.
        children: Optional tuple of ((lo1, hi1), (lo2, hi2)) — the two
            subarrays produced by a quick-sort partition.
        active_node: Currently active/visited node ID (for graph algorithms).
        active_edge: Active edge (u, v) being evaluated.
        relaxed_edge: Edge (u, v) successfully relaxed.
        node_states: Dict mapping node ID -> state string ('unvisited', 'current', 'visited', 'queued', 'path', 'start', 'target').
        edge_states: Dict mapping edge key '(u, v)' -> state string ('default', 'active', 'relaxed', 'path', 'tour', 'rejected').
        path: List of node IDs representing the final or current path.
        tour: List of node IDs representing the TSP tour.
        dist: Dict mapping node ID -> current shortest distance.
        prev: Dict mapping node ID -> predecessor node ID.
        state: Extra state dictionary for algorithm-specific stats.
        tree: Hierarchical dict snapshot of the binary tree root.
        rotation: Name of active rotation ('left', 'right', 'left-right', 'right-left').
        highlight_nodes: Dict mapping node value str -> state string ('compare', 'insert', 'delete', 'unbalanced', 'pivot', 'settled').
        active_val: Current active node value.
        node_colors: Dict mapping node val/ID -> color string ('RED', 'BLACK', 'default').
        flow: Dict mapping edge '(u, v)' -> current flow integer.
        capacity: Dict mapping edge '(u, v)' -> capacity integer.
        augmenting_path: List of node IDs along active augmenting path.
        bottleneck: Bottleneck capacity integer along current path.
        min_cut: Tuple of ([nodes in S], [nodes in T]).
        total_flow: Current total flow from source to sink.
        levels: Dict mapping node ID -> integer level in level graph.
        proposer: Active proposer ID (for matching algorithms).
        reviewer: Active reviewer ID (for matching algorithms).
        matches: Dict mapping reviewer ID -> proposer ID (or vice versa).
        proposals: Dict mapping proposer ID -> list of proposed reviewer IDs.
        rejected: Dict mapping proposer ID -> list of reviewer IDs who rejected them.
        preferences: Dict with {"proposers": {...}, "reviewers": {...}} preference orderings.
        pair_status: Dict mapping 'p-r' -> status ('proposing', 'engaged', 'rejected', 'broken').
        dp_table: 2D matrix representing the DP state table.
        dp_row: Active DP row index.
        dp_col: Active DP column index.
        dp_active_cells: List of (row, col) coordinates actively highlighted.
        dp_dependencies: List of (row, col) coordinates being referenced.
        dp_row_labels: List of label strings for rows.
        dp_col_labels: List of label strings for columns.
        dp_title: Title/name of the DP table visualization.
        backtrack_path: List of (row, col) coordinates in the optimal solution path.
        items: List of item dicts (e.g. {'id': ..., 'weight': ..., 'value': ..., 'ratio': ..., 'status': ...}).
        intervals: List of interval dicts (e.g. {'id': ..., 'start': ..., 'end': ..., 'status': ...}).
        gauge: Dict representing knapsack bucket fill metrics {'current_weight', 'max_capacity', 'total_value'}.
        triplets: List of 3-sum matching triplets.
        quadruplets: List of 4-sum matching quadruplets.
    """

    type: str
    indices: tuple = ()
    message: str = ""
    range: tuple = ()
    children: tuple = ()
    active_node: str | None = None
    active_edge: tuple | None = None
    relaxed_edge: tuple | None = None
    node_states: dict = field(default_factory=dict)
    edge_states: dict = field(default_factory=dict)
    path: list = field(default_factory=list)
    tour: list = field(default_factory=list)
    dist: dict = field(default_factory=dict)
    prev: dict = field(default_factory=dict)
    state: dict = field(default_factory=dict)
    tree: dict = field(default_factory=dict)
    rotation: str | None = None
    highlight_nodes: dict = field(default_factory=dict)
    active_val: int | None = None
    node_colors: dict = field(default_factory=dict)
    flow: dict = field(default_factory=dict)
    capacity: dict = field(default_factory=dict)
    augmenting_path: list = field(default_factory=list)
    bottleneck: int | None = None
    min_cut: tuple = ()
    total_flow: int = 0
    levels: dict = field(default_factory=dict)
    proposer: str | None = None
    reviewer: str | None = None
    matches: dict = field(default_factory=dict)
    proposals: dict = field(default_factory=dict)
    rejected: dict = field(default_factory=dict)
    preferences: dict = field(default_factory=dict)
    pair_status: dict = field(default_factory=dict)
    dp_table: list | None = None
    dp_row: int | None = None
    dp_col: int | None = None
    dp_active_cells: list = field(default_factory=list)
    dp_dependencies: list = field(default_factory=list)
    dp_row_labels: list = field(default_factory=list)
    dp_col_labels: list = field(default_factory=list)
    dp_title: str | None = None
    backtrack_path: list = field(default_factory=list)
    items: list = field(default_factory=list)
    intervals: list = field(default_factory=list)
    gauge: dict = field(default_factory=dict)
    triplets: list = field(default_factory=list)
    quadruplets: list = field(default_factory=list)


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
