"""Graph utilities: default graph presets, random connected graph generator,
and adjacency conversion for graph algorithms.
"""

from __future__ import annotations

import math
import random
from typing import Any


def get_default_graph() -> dict[str, Any]:
    """Default 10-node connected graph preset with coordinates and weights."""
    return {
        "nodes": [
            {"id": "A", "label": "A", "x": 70, "y": 70},
            {"id": "B", "label": "B", "x": 190, "y": 60},
            {"id": "C", "label": "C", "x": 80, "y": 230},
            {"id": "D", "label": "D", "x": 200, "y": 230},
            {"id": "E", "label": "E", "x": 320, "y": 70},
            {"id": "F", "label": "F", "x": 330, "y": 220},
            {"id": "G", "label": "G", "x": 440, "y": 70},
            {"id": "H", "label": "H", "x": 450, "y": 230},
            {"id": "I", "label": "I", "x": 560, "y": 80},
            {"id": "J", "label": "J", "x": 570, "y": 220},
        ],
        "edges": [
            {"u": "A", "v": "B", "weight": 3},
            {"u": "A", "v": "C", "weight": 5},
            {"u": "B", "v": "C", "weight": 2},
            {"u": "B", "v": "D", "weight": 4},
            {"u": "B", "v": "E", "weight": 6},
            {"u": "C", "v": "D", "weight": 3},
            {"u": "D", "v": "E", "weight": 2},
            {"u": "D", "v": "F", "weight": 5},
            {"u": "E", "v": "F", "weight": 4},
            {"u": "E", "v": "G", "weight": 3},
            {"u": "F", "v": "G", "weight": 5},
            {"u": "F", "v": "H", "weight": 2},
            {"u": "G", "v": "H", "weight": 3},
            {"u": "G", "v": "I", "weight": 4},
            {"u": "H", "v": "I", "weight": 2},
            {"u": "H", "v": "J", "weight": 5},
            {"u": "I", "v": "J", "weight": 3},
            {"u": "C", "v": "F", "weight": 6},
            {"u": "E", "v": "H", "weight": 4},
        ],
    }


def generate_random_graph(num_nodes: int = 10, seed: int | None = None) -> dict[str, Any]:
    """Generate a connected 2D graph with non-overlapping nodes and integer weights."""
    rng = random.Random(seed)
    num_nodes = max(4, min(16, num_nodes))
    labels = [chr(ord("A") + i) for i in range(num_nodes)]

    # Generate node positions in a circular / perturbed layout
    nodes = []
    center_x, center_y = 330, 160
    radius_x, radius_y = 230, 110

    for i, label in enumerate(labels):
        angle = (2 * math.pi * i) / num_nodes + rng.uniform(-0.15, 0.15)
        rx = radius_x * rng.uniform(0.75, 1.05)
        ry = radius_y * rng.uniform(0.75, 1.05)
        x = round(center_x + rx * math.cos(angle))
        y = round(center_y + ry * math.sin(angle))
        x = max(60, min(600, x))
        y = max(45, min(275, y))
        nodes.append({"id": label, "label": label, "x": x, "y": y})

    # Ensure connectivity: build a spanning tree first
    edges_set = set()
    edges = []
    shuffled = list(labels)
    rng.shuffle(shuffled)
    connected = [shuffled[0]]
    unconnected = shuffled[1:]

    coords = {n["id"]: (n["x"], n["y"]) for n in nodes}

    def calc_weight(u: str, v: str) -> int:
        x1, y1 = coords[u]
        x2, y2 = coords[v]
        dist = math.hypot(x2 - x1, y2 - y1)
        w = max(1, min(15, round(dist / 30) + rng.randint(-1, 1)))
        return w

    while unconnected:
        u = rng.choice(connected)
        v = unconnected.pop()
        connected.append(v)
        pair = tuple(sorted((u, v)))
        edges_set.add(pair)
        edges.append({"u": pair[0], "v": pair[1], "weight": calc_weight(pair[0], pair[1])})

    desired_edges = min(num_nodes * (num_nodes - 1) // 2, round(num_nodes * 1.8))
    attempts = 0
    while len(edges) < desired_edges and attempts < 100:
        attempts += 1
        u, v = rng.sample(labels, 2)
        pair = tuple(sorted((u, v)))
        if pair not in edges_set:
            edges_set.add(pair)
            edges.append({"u": pair[0], "v": pair[1], "weight": calc_weight(pair[0], pair[1])})

    return {"nodes": nodes, "edges": edges}


def build_adjacency(graph: dict[str, Any]) -> dict[str, dict[str, int]]:
    """Convert a graph dictionary into an adjacency dictionary `adj[u][v] = weight`."""
    nodes = [n["id"] for n in graph.get("nodes", [])]
    adj: dict[str, dict[str, int]] = {n: {} for n in nodes}
    for e in graph.get("edges", []):
        u, v, w = e["u"], e["v"], int(e["weight"])
        if u in adj and v in adj:
            adj[u][v] = w
            adj[v][u] = w
    return adj
