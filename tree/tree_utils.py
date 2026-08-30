"""Tree utilities: TreeNode definition, height/balance factor calculation,
serialization, color/heap support, and populated default tree presets.
"""

from __future__ import annotations

import random
from typing import Any


class TreeNode:
    """Binary Search Tree / Red-Black Tree / Heap node."""

    def __init__(
        self,
        val: int,
        left: TreeNode | None = None,
        right: TreeNode | None = None,
        color: str = "BLACK",
        heap_idx: int | None = None,
    ):
        self.val = val
        self.left = left
        self.right = right
        self.height = 1
        self.bf = 0
        self.color = color  # "RED" or "BLACK"
        self.heap_idx = heap_idx
        self.update_metrics()

    def update_metrics(self) -> None:
        """Recalculate height and balance factor from children."""
        lh = self.left.height if self.left else 0
        rh = self.right.height if self.right else 0
        self.height = 1 + max(lh, rh)
        self.bf = lh - rh


def get_height(node: TreeNode | None) -> int:
    return node.height if node else 0


def get_balance(node: TreeNode | None) -> int:
    return (get_height(node.left) - get_height(node.right)) if node else 0


def tree_to_dict(node: TreeNode | None) -> dict[str, Any] | None:
    """Serialize a TreeNode hierarchy to a JSON-compatible nested dict."""
    if node is None:
        return None
    node.update_metrics()
    return {
        "val": node.val,
        "height": node.height,
        "bf": node.bf,
        "color": getattr(node, "color", "BLACK"),
        "heap_idx": getattr(node, "heap_idx", None),
        "left": tree_to_dict(node.left),
        "right": tree_to_dict(node.right),
    }


def dict_to_tree(d: dict[str, Any] | None) -> TreeNode | None:
    """Deserialize a nested dict to a TreeNode hierarchy."""
    if d is None:
        return None
    node = TreeNode(
        int(d["val"]),
        color=d.get("color", "BLACK"),
        heap_idx=d.get("heap_idx"),
    )
    node.left = dict_to_tree(d.get("left"))
    node.right = dict_to_tree(d.get("right"))
    node.update_metrics()
    return node


def clone_tree(node: TreeNode | None) -> TreeNode | None:
    """Deep clone a TreeNode hierarchy."""
    if node is None:
        return None
    copy = TreeNode(
        node.val,
        color=getattr(node, "color", "BLACK"),
        heap_idx=getattr(node, "heap_idx", None),
    )
    copy.left = clone_tree(node.left)
    copy.right = clone_tree(node.right)
    copy.update_metrics()
    return copy


def heap_to_tree(arr: list[int]) -> TreeNode | None:
    """Convert a flat array representing a binary heap into a TreeNode complete tree."""
    if not arr:
        return None

    nodes = [TreeNode(val, color="BLACK", heap_idx=i) for i, val in enumerate(arr)]
    n = len(nodes)
    for i in range(n):
        left_i = 2 * i + 1
        right_i = 2 * i + 2
        if left_i < n:
            nodes[i].left = nodes[left_i]
        if right_i < n:
            nodes[i].right = nodes[right_i]

    def _refresh(node: TreeNode | None):
        if not node:
            return
        _refresh(node.left)
        _refresh(node.right)
        node.update_metrics()

    _refresh(nodes[0])
    return nodes[0]


def get_populated_avl_tree() -> TreeNode:
    """Default well-populated 15-node balanced AVL tree (depth 4)."""
    root = TreeNode(50)
    root.left = TreeNode(25)
    root.right = TreeNode(75)

    root.left.left = TreeNode(12)
    root.left.right = TreeNode(37)
    root.right.left = TreeNode(62)
    root.right.right = TreeNode(87)

    root.left.left.left = TreeNode(6)
    root.left.left.right = TreeNode(18)
    root.left.right.left = TreeNode(31)
    root.left.right.right = TreeNode(43)

    root.right.left.left = TreeNode(56)
    root.right.left.right = TreeNode(68)
    root.right.right.left = TreeNode(81)
    root.right.right.right = TreeNode(93)

    def _refresh(n: TreeNode | None):
        if not n:
            return
        _refresh(n.left)
        _refresh(n.right)
        n.update_metrics()

    _refresh(root)
    return root


def get_populated_red_black_tree() -> TreeNode:
    """Default well-populated 14-node valid Red-Black Tree."""
    # Root is Black
    root = TreeNode(50, color="BLACK")
    root.left = TreeNode(25, color="RED")
    root.right = TreeNode(75, color="RED")

    root.left.left = TreeNode(12, color="BLACK")
    root.left.right = TreeNode(37, color="BLACK")
    root.right.left = TreeNode(62, color="BLACK")
    root.right.right = TreeNode(87, color="BLACK")

    root.left.left.left = TreeNode(6, color="RED")
    root.left.left.right = TreeNode(18, color="RED")
    root.left.right.left = TreeNode(31, color="RED")
    root.left.right.right = TreeNode(43, color="RED")

    root.right.left.left = TreeNode(56, color="RED")
    root.right.left.right = TreeNode(68, color="RED")
    root.right.right.left = TreeNode(81, color="RED")

    def _refresh(n: TreeNode | None):
        if not n:
            return
        _refresh(n.left)
        _refresh(n.right)
        n.update_metrics()

    _refresh(root)
    return root


def get_populated_min_heap() -> list[int]:
    """Default 15-node valid Binary Min-Heap array."""
    return [4, 7, 12, 15, 9, 21, 18, 29, 34, 22, 16, 25, 30, 42, 38]


def get_unbalanced_tree() -> TreeNode:
    """Default 14-node unbalanced tree for Day-Stout-Warren rebalancing."""
    keys = [10, 5, 20, 15, 30, 25, 40, 35, 50, 45, 60, 55, 70, 65]
    root: TreeNode | None = None

    def _insert_raw(r: TreeNode | None, val: int) -> TreeNode:
        if not r:
            return TreeNode(val)
        if val < r.val:
            r.left = _insert_raw(r.left, val)
        else:
            r.right = _insert_raw(r.right, val)
        r.update_metrics()
        return r

    for k in keys:
        root = _insert_raw(root, k)

    assert root is not None
    return root


def generate_random_tree(num_nodes: int = 15, seed: int | None = None) -> TreeNode:
    """Generate a populated balanced AVL tree from random unique integers."""
    rng = random.Random(seed)
    num_nodes = max(8, min(24, num_nodes))
    values = sorted(rng.sample(range(5, 100), num_nodes))

    def _build_balanced(lo: int, hi: int) -> TreeNode | None:
        if lo > hi:
            return None
        mid = (lo + hi) // 2
        node = TreeNode(values[mid])
        node.left = _build_balanced(lo, mid - 1)
        node.right = _build_balanced(mid + 1, hi)
        node.update_metrics()
        return node

    root = _build_balanced(0, len(values) - 1)
    assert root is not None
    return root
