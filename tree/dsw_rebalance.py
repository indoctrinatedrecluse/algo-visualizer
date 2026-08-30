"""Day-Stout-Warren (DSW) Algorithm: in-place tree rebalancing.

Transforms an arbitrary or unbalanced binary search tree into a perfectly
balanced BST in O(n) time and O(1) auxiliary space using rotations:
  1. Flattening Phase: converts the BST into a degenerate right-leaning spine ("vine").
  2. Compression Phase: iteratively performs left rotations to fold the vine into a balanced tree.
"""

from __future__ import annotations

import math
from typing import Any

from registry import (
    AlgorithmInfo,
    DONE,
    ROTATE_LEFT,
    ROTATE_RIGHT,
    Step,
    TREE,
    VISIT,
    register,
)
from .tree_utils import TreeNode, dict_to_tree, get_unbalanced_tree, tree_to_dict


def dsw_rebalance(tree_data: dict[str, Any] | None = None, key: int | None = None):
    """DSW Tree Rebalancing generator."""
    root = dict_to_tree(tree_data) if tree_data else get_unbalanced_tree()

    # Pseudo-root simplifies rotations at the root level
    pseudo_root = TreeNode(0)
    pseudo_root.right = root

    yield Step(
        VISIT,
        message="Starting Day-Stout-Warren (DSW) rebalancing on unbalanced tree",
        tree=tree_to_dict(pseudo_root.right),
    )

    # -----------------------------------------------------------------------
    # Phase 1: Create the Vine (flatten into a right-leaning linked list)
    # -----------------------------------------------------------------------
    tail = pseudo_root
    curr = pseudo_root.right
    n = 0

    while curr is not None:
        if curr.left is not None:
            # Right rotation around curr
            child = curr.left
            curr.left = child.right
            child.right = curr
            tail.right = child
            curr = child
            curr.update_metrics()
            if curr.right:
                curr.right.update_metrics()

            yield Step(
                ROTATE_RIGHT,
                message=f"Flattening phase: right rotate around node {child.right.val} (moving {child.val} to spine)",
                rotation="right",
                active_val=child.val,
                highlight_nodes={str(child.val): "pivot"},
                tree=tree_to_dict(pseudo_root.right),
            )
        else:
            n += 1
            tail = curr
            curr = curr.right

    yield Step(
        VISIT,
        message=f"Flattening complete: created vine with {n} nodes in sorted order",
        tree=tree_to_dict(pseudo_root.right),
    )

    # -----------------------------------------------------------------------
    # Phase 2: Compression passes (fold the vine into a balanced BST)
    # -----------------------------------------------------------------------
    def _compress(root_node: TreeNode, count: int) -> None:
        scanner = root_node
        for _ in range(count):
            if scanner.right and scanner.right.right:
                child = scanner.right
                grandchild = child.right
                scanner.right = grandchild
                child.right = grandchild.left
                grandchild.left = child
                child.update_metrics()
                grandchild.update_metrics()
                scanner = grandchild

    # Calculate initial compression count
    h = int(math.floor(math.log2(n + 1)))
    m = int(2**h - 1)
    leaves = n - m

    if leaves > 0:
        _compress(pseudo_root, leaves)
        yield Step(
            ROTATE_LEFT,
            message=f"Compression Phase 1: rotate {leaves} alternate nodes",
            rotation="left",
            tree=tree_to_dict(pseudo_root.right),
        )

    while m > 1:
        m = m // 2
        _compress(pseudo_root, m)
        yield Step(
            ROTATE_LEFT,
            message=f"Compression pass (m={m}): left rotate alternate nodes on spine",
            rotation="left",
            tree=tree_to_dict(pseudo_root.right),
        )

    # Refresh metrics
    def _refresh(node: TreeNode | None):
        if not node:
            return
        _refresh(node.left)
        _refresh(node.right)
        node.update_metrics()

    _refresh(pseudo_root.right)

    final_root = pseudo_root.right
    final_height = final_root.height if final_root else 0

    yield Step(
        DONE,
        message=f"DSW Rebalancing complete: {n} nodes balanced to height {final_height} ✓",
        tree=tree_to_dict(final_root),
    )


register(
    AlgorithmInfo(
        name="dsw_rebalance",
        display_name="Tree Rebalance (DSW Algorithm)",
        description=(
            "In-place O(n) binary search tree rebalancing: flattens any unbalanced "
            "BST into a right-spine vine, then compresses it into a perfectly balanced tree."
        ),
        best="O(n)",
        average="O(n)",
        worst="O(n)",
        space="O(1)",
        stable=True,
        category=TREE,
        fn=dsw_rebalance,
    )
)
