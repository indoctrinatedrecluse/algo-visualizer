"""Flow utilities: Flow network presets (10+ nodes), capacity matrix construction,
random flow network generation, and Min-Cut reachability BFS.
"""

from __future__ import annotations

from collections import deque
import random
from typing import Any


def get_default_flow_network() -> dict[str, Any]:
    """Default 10-node layered flow network preset (S -> 3 intermediate layers -> T)."""
    return {
        "source": "S",
        "sink": "T",
        "nodes": [
            {"id": "S", "label": "S", "x": 70, "y": 160, "type": "source"},
            {"id": "A", "label": "A", "x": 200, "y": 65},
            {"id": "B", "label": "B", "x": 200, "y": 160},
            {"id": "C", "label": "C", "x": 200, "y": 255},
            {"id": "D", "label": "D", "x": 340, "y": 65},
            {"id": "E", "label": "E", "x": 340, "y": 160},
            {"id": "F", "label": "F", "x": 340, "y": 255},
            {"id": "G", "label": "G", "x": 470, "y": 100},
            {"id": "H", "label": "H", "x": 470, "y": 220},
            {"id": "T", "label": "T", "x": 580, "y": 160, "type": "sink"},
        ],
        "edges": [
            {"u": "S", "v": "A", "capacity": 12},
            {"u": "S", "v": "B", "capacity": 8},
            {"u": "S", "v": "C", "capacity": 14},
            {"u": "A", "v": "D", "capacity": 9},
            {"u": "A", "v": "E", "capacity": 4},
            {"u": "A", "v": "B", "capacity": 3},
            {"u": "B", "v": "D", "capacity": 3},
            {"u": "B", "v": "E", "capacity": 7},
            {"u": "B", "v": "F", "capacity": 4},
            {"u": "C", "v": "E", "capacity": 5},
            {"u": "C", "v": "F", "capacity": 11},
            {"u": "D", "v": "G", "capacity": 10},
            {"u": "D", "v": "E", "capacity": 4},
            {"u": "E", "v": "G", "capacity": 6},
            {"u": "E", "v": "H", "capacity": 8},
            {"u": "E", "v": "F", "capacity": 2},
            {"u": "F", "v": "H", "capacity": 10},
            {"u": "G", "v": "T", "capacity": 16},
            {"u": "H", "v": "T", "capacity": 15},
        ],
    }


def generate_random_flow_network(num_nodes: int = 10, seed: int | None = None) -> dict[str, Any]:
    """Generate a random layered directed flow network from S to T."""
    rng = random.Random(seed)
    num_nodes = max(8, min(14, num_nodes))

    num_layers = 4 if num_nodes >= 9 else 3
    middle_count = num_nodes - 2
    nodes_per_layer = max(2, middle_count // (num_layers - 1))

    nodes = [{"id": "S", "label": "S", "x": 70, "y": 160, "type": "source"}]
    layers: list[list[str]] = [["S"]]

    chars = [chr(65 + i) for i in range(middle_count)]
    idx = 0

    x_step = 490 / num_layers
    for l_idx in range(1, num_layers):
        layer_nodes = []
        count = min(nodes_per_layer, len(chars) - idx) if l_idx < num_layers - 1 else len(chars) - idx
        y_step = 240 / (count + 1)
        for c_idx in range(count):
            node_id = chars[idx]
            idx += 1
            x = round(70 + l_idx * x_step)
            y = round(40 + (c_idx + 1) * y_step)
            nodes.append({"id": node_id, "label": node_id, "x": x, "y": y})
            layer_nodes.append(node_id)
        layers.append(layer_nodes)

    nodes.append({"id": "T", "label": "T", "x": 580, "y": 160, "type": "sink"})
    layers.append(["T"])

    # Connect forward layers to guarantee S-T connectivity
    edges = []
    edge_set = set()

    for l_idx in range(len(layers) - 1):
        curr_layer = layers[l_idx]
        next_layer = layers[l_idx + 1]
        for u in curr_layer:
            v = rng.choice(next_layer)
            cap = rng.randint(4, 18)
            edges.append({"u": u, "v": v, "capacity": cap})
            edge_set.add((u, v))

        for v in next_layer:
            if not any(e["v"] == v for e in edges if e["u"] in curr_layer):
                u = rng.choice(curr_layer)
                if (u, v) not in edge_set:
                    cap = rng.randint(4, 18)
                    edges.append({"u": u, "v": v, "capacity": cap})
                    edge_set.add((u, v))

    # Add random cross edges
    for l_idx in range(len(layers) - 1):
        for u in layers[l_idx]:
            for v in layers[l_idx + 1]:
                if (u, v) not in edge_set and rng.random() < 0.35:
                    cap = rng.randint(4, 18)
                    edges.append({"u": u, "v": v, "capacity": cap})
                    edge_set.add((u, v))

    return {
        "source": "S",
        "sink": "T",
        "nodes": nodes,
        "edges": edges,
    }


def build_capacities(network: dict[str, Any]) -> dict[str, dict[str, int]]:
    """Build a capacity dictionary `cap[u][v] = capacity`."""
    nodes = [n["id"] for n in network.get("nodes", [])]
    cap: dict[str, dict[str, int]] = {u: {v: 0 for v in nodes} for u in nodes}
    for e in network.get("edges", []):
        u, v, c = e["u"], e["v"], int(e["capacity"])
        cap[u][v] = c
    return cap


def find_reachable_set_min_cut(
    nodes: list[str], cap: dict[str, dict[str, int]], flow: dict[str, dict[str, int]], source: str
) -> tuple[list[str], list[str]]:
    """Find the (S, T) min-cut by BFS reachability in the residual graph."""
    visited = set()
    queue = deque([source])
    visited.add(source)

    while queue:
        u = queue.popleft()
        for v in nodes:
            residual = cap[u][v] - flow[u][v]
            if residual > 0 and v not in visited:
                visited.add(v)
                queue.append(v)

    s_set = sorted(visited)
    t_set = sorted(set(nodes) - visited)
    return s_set, t_set
