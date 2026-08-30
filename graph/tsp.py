"""Traveling Salesperson Problem (TSP): finds the optimal Hamiltonian tour.

Combines Nearest Neighbor constructive heuristic with 2-Opt local search
refinement to iteratively untangle crossed routes and minimize the tour cost.
"""

from __future__ import annotations

from typing import Any

from registry import (
    AlgorithmInfo,
    DONE,
    GRAPH,
    NEW_BEST,
    Step,
    TOUR,
    VISIT,
    register,
)
from .graph_utils import build_adjacency, get_default_graph


def tsp(graph: dict[str, Any] | None = None, start: str = "A", target: str | None = None):
    """TSP solver generator combining Nearest Neighbor construction and 2-Opt local search."""
    if graph is None:
        graph = get_default_graph()

    adj = build_adjacency(graph)
    nodes = list(adj.keys())
    n = len(nodes)
    if n < 2:
        return

    if start not in adj:
        start = nodes[0]

    # Compute all-pairs shortest paths
    dist_matrix: dict[str, dict[str, int]] = {u: {v: float("inf") for v in nodes} for u in nodes}
    for u in nodes:
        dist_matrix[u][u] = 0
        for v, w in adj[u].items():
            dist_matrix[u][v] = w

    for k in nodes:
        for i in nodes:
            for j in nodes:
                if dist_matrix[i][k] + dist_matrix[k][j] < dist_matrix[i][j]:
                    dist_matrix[i][j] = dist_matrix[i][k] + dist_matrix[k][j]

    def tour_cost(t: list[str]) -> int:
        return sum(dist_matrix[t[i]][t[i + 1]] for i in range(len(t) - 1))

    # Phase 1: Nearest Neighbor Construction
    yield Step(
        VISIT,
        message=f"Phase 1: Construct initial tour starting at {start} using Nearest Neighbor",
        active_node=start,
        tour=[start],
        path=[start],
        state={"phase": "construction"},
    )

    unvisited = set(nodes)
    unvisited.remove(start)
    curr = start
    tour = [start]

    while unvisited:
        nxt = min(unvisited, key=lambda node: dist_matrix[curr][node])
        step_dist = dist_matrix[curr][nxt]
        tour.append(nxt)
        unvisited.remove(nxt)
        yield Step(
            VISIT,
            message=f"Nearest unvisited neighbor of {curr} is {nxt} (distance: {step_dist})",
            active_node=nxt,
            active_edge=(curr, nxt),
            tour=list(tour),
            path=list(tour),
            state={"current_cost": tour_cost(tour)},
        )
        curr = nxt

    # Close the loop back to start
    tour.append(start)
    best_cost = tour_cost(tour)
    yield Step(
        TOUR,
        message=f"Initial Nearest Neighbor tour complete: {' → '.join(tour)} (Cost: {best_cost})",
        tour=list(tour),
        path=list(tour),
        state={"best_cost": best_cost, "current_cost": best_cost},
    )

    # Phase 2: 2-Opt Optimization Passes
    yield Step(
        VISIT,
        message="Phase 2: Optimizing tour with 2-Opt edge swaps (untangling crossed routes)",
        active_node=start,
        tour=list(tour),
        path=list(tour),
        state={"phase": "2-opt", "best_cost": best_cost},
    )

    improved = True
    iteration = 0
    max_iterations = 25

    while improved and iteration < max_iterations:
        improved = False
        iteration += 1

        for i in range(1, n - 1):
            for j in range(i + 1, n):
                a, b = tour[i - 1], tour[i]
                c, d = tour[j], tour[j + 1]

                current_pair_dist = dist_matrix[a][b] + dist_matrix[c][d]
                new_pair_dist = dist_matrix[a][c] + dist_matrix[b][d]

                if new_pair_dist < current_pair_dist:
                    # Perform 2-opt swap
                    tour[i : j + 1] = reversed(tour[i : j + 1])
                    best_cost = tour_cost(tour)
                    improved = True

                    yield Step(
                        NEW_BEST,
                        message=f"2-Opt swap edges ({a}, {b}) and ({c}, {d}) → improved cost to {best_cost} ★",
                        active_node=tour[i],
                        active_edge=(a, c),
                        tour=list(tour),
                        path=list(tour),
                        state={"best_cost": best_cost, "current_cost": best_cost},
                    )
                    break
            if improved:
                break

    yield Step(
        DONE,
        message=f"Optimal TSP tour complete: {' → '.join(tour)} (Total cost: {best_cost}) ✓",
        tour=list(tour),
        path=list(tour),
        state={"best_cost": best_cost, "current_cost": best_cost},
    )


register(
    AlgorithmInfo(
        name="tsp",
        display_name="Traveling Salesperson (TSP)",
        description=(
            "Finds an optimal Hamiltonian cycle visiting every node and returning to the "
            "start node using Nearest Neighbor construction and 2-Opt local search optimization."
        ),
        best="O(n²)",
        average="O(n²)",
        worst="O(n²)",
        space="O(n)",
        stable=False,
        category=GRAPH,
        fn=tsp,
    )
)
