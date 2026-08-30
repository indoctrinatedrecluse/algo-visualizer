"""Dijkstra's Algorithm: single-source shortest path on a weighted graph.

Finds the shortest path from a starting node to all other nodes (or a specific
target node) by greedily expanding the closest unvisited vertex and relaxing
neighboring edges.
"""

from __future__ import annotations

from typing import Any

from registry import (
    AlgorithmInfo,
    COMPARE,
    DONE,
    GRAPH,
    PATH,
    RELAX,
    SETTLE,
    Step,
    VISIT,
    register,
)
from .graph_utils import build_adjacency, get_default_graph


def dijkstra(graph: dict[str, Any] | None = None, start: str = "A", target: str | None = "J"):
    """Dijkstra shortest path generator. Yields a Step for every graph event."""
    if graph is None:
        graph = get_default_graph()

    adj = build_adjacency(graph)
    nodes = list(adj.keys())
    if not nodes:
        return

    if start not in adj:
        start = nodes[0]
    if target and target not in adj:
        target = nodes[-1] if len(nodes) > 1 else None

    # Distances, predecessors, and unvisited set
    dist: dict[str, int | float] = {u: float("inf") for u in nodes}
    dist[start] = 0
    prev: dict[str, str | None] = {u: None for u in nodes}
    unvisited = set(nodes)

    yield Step(
        VISIT,
        message=f"Initialize start node {start} with dist=0, all other nodes with dist=∞",
        active_node=start,
        dist=dict(dist),
        prev=dict(prev),
    )

    while unvisited:
        # Greedily pick unvisited vertex with minimum distance
        u = min(unvisited, key=lambda node: dist[node])
        if dist[u] == float("inf"):
            break

        yield Step(
            VISIT,
            message=f"Select unvisited node {u} with minimum distance ({dist[u]})",
            active_node=u,
            dist=dict(dist),
            prev=dict(prev),
        )

        if target and u == target:
            yield Step(
                SETTLE,
                message=f"Target node {target} reached with shortest distance {dist[u]}",
                active_node=u,
                dist=dict(dist),
                prev=dict(prev),
            )
            break

        for v, weight in sorted(adj[u].items()):
            if v in unvisited:
                alt = dist[u] + weight
                yield Step(
                    COMPARE,
                    message=f"Inspect edge ({u}, {v}) [weight {weight}]: distance via {u} is {dist[u]} + {weight} = {alt} vs current dist[{v}] = {dist[v]}",
                    active_node=u,
                    active_edge=(u, v),
                    dist=dict(dist),
                    prev=dict(prev),
                )
                if alt < dist[v]:
                    dist[v] = alt
                    prev[v] = u
                    yield Step(
                        RELAX,
                        message=f"Relax edge ({u}, {v}): updated shortest distance to {v} = {alt} via {u}",
                        active_node=u,
                        active_edge=(u, v),
                        relaxed_edge=(u, v),
                        dist=dict(dist),
                        prev=dict(prev),
                    )

        unvisited.remove(u)
        yield Step(
            SETTLE,
            message=f"Node {u} settled with final shortest distance {dist[u]}",
            active_node=u,
            dist=dict(dist),
            prev=dict(prev),
        )

    # Reconstruct shortest path
    path: list[str] = []
    end_node = target if target else (nodes[-1] if len(nodes) > 1 else start)
    if end_node in dist and dist[end_node] < float("inf"):
        curr: str | None = end_node
        while curr:
            path.append(curr)
            curr = prev.get(curr)
        path.reverse()

    if path:
        yield Step(
            PATH,
            message=f"Shortest path from {start} to {end_node}: {' → '.join(path)} (Distance: {dist[end_node]})",
            path=path,
            active_node=end_node,
            dist=dict(dist),
            prev=dict(prev),
        )

    yield Step(
        DONE,
        message="Dijkstra shortest path search complete ✓",
        path=path,
        dist=dict(dist),
        prev=dict(prev),
    )


register(
    AlgorithmInfo(
        name="dijkstra",
        display_name="Dijkstra's Algorithm",
        description=(
            "Finds the shortest path between nodes in a weighted graph by greedily "
            "exploring the vertex with minimum tentative distance and relaxing its adjacent edges."
        ),
        best="O((V + E) log V)",
        average="O((V + E) log V)",
        worst="O(V²)",
        space="O(V + E)",
        stable=True,
        category=GRAPH,
        fn=dijkstra,
    )
)
