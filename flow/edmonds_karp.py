"""Edmonds-Karp Maximum Flow Algorithm (BFS on Residual Graph).

Finds the shortest augmenting path (fewest edges) from Source S to Sink T using
Breadth-First Search, pushes the bottleneck capacity, and iteratively maximizes flow.
Computes the (S, T) Minimum Cut upon termination.
"""

from __future__ import annotations

from collections import deque
from typing import Any

from registry import (
    AUGMENT,
    AlgorithmInfo,
    BOTTLENECK,
    CUT,
    DONE,
    FLOW,
    PUSH_FLOW,
    Step,
    VISIT,
    register,
)
from .flow_utils import (
    build_capacities,
    find_reachable_set_min_cut,
    get_default_flow_network,
)


def edmonds_karp(
    network: dict[str, Any] | None = None,
    source: str = "S",
    sink: str = "T",
):
    """Edmonds-Karp max flow generator yielding Step frames for each augmentation."""
    if network is None:
        network = get_default_flow_network()

    nodes = [n["id"] for n in network.get("nodes", [])]
    source = network.get("source", source)
    sink = network.get("sink", sink)

    cap = build_capacities(network)
    flow: dict[str, dict[str, int]] = {u: {v: 0 for v in nodes} for u in nodes}
    total_flow = 0

    def serialize_flow() -> dict[str, int]:
        d = {}
        for u in nodes:
            for v in nodes:
                if cap[u][v] > 0:
                    d[f"{u}-{v}"] = flow[u][v]
        return d

    def serialize_cap() -> dict[str, int]:
        d = {}
        for u in nodes:
            for v in nodes:
                if cap[u][v] > 0:
                    d[f"{u}-{v}"] = cap[u][v]
        return d

    yield Step(
        VISIT,
        message=f"Initialize flow network: Source {source}, Sink {sink} (Initial Flow = 0)",
        flow=serialize_flow(),
        capacity=serialize_cap(),
        total_flow=0,
        state={"source": source, "sink": sink},
    )

    iteration = 0
    while True:
        iteration += 1
        # BFS to find shortest augmenting path in residual graph
        parent: dict[str, str | None] = {source: None}
        queue = deque([source])

        while queue and sink not in parent:
            u = queue.popleft()
            for v in nodes:
                residual = cap[u][v] - flow[u][v]
                if residual > 0 and v not in parent:
                    parent[v] = u
                    queue.append(v)

        if sink not in parent:
            # No augmenting path found -> Max flow reached!
            break

        # Reconstruct augmenting path
        path = []
        curr = sink
        while curr is not None:
            path.append(curr)
            curr = parent[curr]
        path.reverse()

        # Find bottleneck capacity along the path
        bottleneck = float("inf")
        for i in range(len(path) - 1):
            u, v = path[i], path[i + 1]
            residual = cap[u][v] - flow[u][v]
            bottleneck = min(bottleneck, residual)

        bottleneck_int = int(bottleneck)

        yield Step(
            AUGMENT,
            message=f"BFS iteration {iteration}: found augmenting path {' → '.join(path)}",
            augmenting_path=list(path),
            bottleneck=bottleneck_int,
            flow=serialize_flow(),
            capacity=serialize_cap(),
            total_flow=total_flow,
        )

        yield Step(
            BOTTLENECK,
            message=f"Bottleneck capacity along path is Δ = {bottleneck_int}",
            augmenting_path=list(path),
            bottleneck=bottleneck_int,
            flow=serialize_flow(),
            capacity=serialize_cap(),
            total_flow=total_flow,
        )

        # Augment flow along path
        for i in range(len(path) - 1):
            u, v = path[i], path[i + 1]
            flow[u][v] += bottleneck_int
            flow[v][u] -= bottleneck_int

        total_flow += bottleneck_int

        yield Step(
            PUSH_FLOW,
            message=f"Pushed {bottleneck_int} units along path → Total Flow: {total_flow}",
            augmenting_path=list(path),
            bottleneck=bottleneck_int,
            flow=serialize_flow(),
            capacity=serialize_cap(),
            total_flow=total_flow,
        )

    # Compute S-T Min-Cut
    s_cut, t_cut = find_reachable_set_min_cut(nodes, cap, flow, source)

    yield Step(
        CUT,
        message=f"Max-Flow reached! Min-Cut: S={{{', '.join(s_cut)}}}, T={{{', '.join(t_cut)}}} (Capacity = {total_flow})",
        min_cut=(s_cut, t_cut),
        flow=serialize_flow(),
        capacity=serialize_cap(),
        total_flow=total_flow,
    )

    yield Step(
        DONE,
        message=f"Edmonds-Karp complete: Maximum Flow = {total_flow} ✓",
        min_cut=(s_cut, t_cut),
        flow=serialize_flow(),
        capacity=serialize_cap(),
        total_flow=total_flow,
    )


register(
    AlgorithmInfo(
        name="edmonds_karp",
        display_name="Edmonds-Karp (Max Flow / Min-Cut)",
        description=(
            "Finds the maximum network flow by finding shortest augmenting paths in "
            "the residual graph via BFS in O(V E²) time, and identifies the S-T Minimum Cut."
        ),
        best="O(V E)",
        average="O(V E²)",
        worst="O(V E²)",
        space="O(V + E)",
        stable=True,
        category=FLOW,
        fn=edmonds_karp,
    )
)
