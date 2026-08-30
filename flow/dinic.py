"""Dinic's Maximum Flow Algorithm (Level Graph BFS & Blocking Flow DFS).

Builds level graphs using BFS and pushes blocking flows along admissible level
edges using DFS in O(V² E) time.
"""

from __future__ import annotations

from collections import deque
from typing import Any

from registry import (
    AlgorithmInfo,
    CUT,
    DONE,
    FLOW,
    LEVEL_GRAPH,
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


def dinic(
    network: dict[str, Any] | None = None,
    source: str = "S",
    sink: str = "T",
):
    """Dinic's algorithm generator yielding Step frames for level graphs and blocking flows."""
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
        message=f"Initialize Dinic's algorithm on flow network from {source} to {sink}",
        flow=serialize_flow(),
        capacity=serialize_cap(),
        total_flow=0,
    )

    phase = 0
    while True:
        phase += 1
        # 1. BFS to construct level graph
        levels: dict[str, int] = {u: -1 for u in nodes}
        levels[source] = 0
        queue = deque([source])

        while queue:
            u = queue.popleft()
            for v in nodes:
                if levels[v] < 0 and cap[u][v] - flow[u][v] > 0:
                    levels[v] = levels[u] + 1
                    queue.append(v)

        if levels[sink] < 0:
            # Sink unreachable in level graph -> Max flow reached
            break

        yield Step(
            LEVEL_GRAPH,
            message=f"Phase {phase}: Constructed Level Graph (Sink {sink} is at level {levels[sink]})",
            levels=dict(levels),
            flow=serialize_flow(),
            capacity=serialize_cap(),
            total_flow=total_flow,
        )

        # 2. DFS to push blocking flow
        ptr = {u: 0 for u in nodes}

        def _dfs(u: str, pushed: int, path: list[str]) -> int:
            if pushed == 0 or u == sink:
                return pushed

            for i in range(ptr[u], len(nodes)):
                ptr[u] = i
                v = nodes[i]
                residual = cap[u][v] - flow[u][v]
                if levels[v] == levels[u] + 1 and residual > 0:
                    tr = _dfs(v, min(pushed, residual), path + [v])
                    if tr > 0:
                        flow[u][v] += tr
                        flow[v][u] -= tr
                        return tr

            return 0

        while True:
            pushed = _dfs(source, float("inf"), [source])  # type: ignore
            if pushed <= 0:
                break
            total_flow += pushed
            yield Step(
                PUSH_FLOW,
                message=f"Pushed blocking flow {pushed} units → Total Flow = {total_flow}",
                flow=serialize_flow(),
                capacity=serialize_cap(),
                total_flow=total_flow,
                levels=dict(levels),
            )

    # Compute S-T Min-Cut
    s_cut, t_cut = find_reachable_set_min_cut(nodes, cap, flow, source)

    yield Step(
        CUT,
        message=f"Dinic's complete! S-T Min Cut: S={{{', '.join(s_cut)}}}, T={{{', '.join(t_cut)}}} (Capacity = {total_flow})",
        min_cut=(s_cut, t_cut),
        flow=serialize_flow(),
        capacity=serialize_cap(),
        total_flow=total_flow,
    )

    yield Step(
        DONE,
        message=f"Maximum Flow = {total_flow} ✓",
        min_cut=(s_cut, t_cut),
        flow=serialize_flow(),
        capacity=serialize_cap(),
        total_flow=total_flow,
    )


register(
    AlgorithmInfo(
        name="dinic",
        display_name="Dinic's Algorithm (Level Graph & Blocking Flow)",
        description=(
            "Calculates the maximum flow in O(V² E) time by alternating between BFS "
            "level-graph construction and DFS blocking-flow augmentation."
        ),
        best="O(E √V)",
        average="O(V² E)",
        worst="O(V² E)",
        space="O(V + E)",
        stable=True,
        category=FLOW,
        fn=dinic,
    )
)
