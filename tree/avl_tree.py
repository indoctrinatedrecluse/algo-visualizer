"""AVL Tree: Self-balancing Binary Search Tree operations (Insert & Delete).

Maintains balance by ensuring that for every node, the heights of its left and
right subtrees differ by at most one (|bf| <= 1), performing single (LL, RR) or
double (LR, RL) rotations when an insertion or deletion causes an imbalance.
"""

from __future__ import annotations

from typing import Any

from registry import (
    AlgorithmInfo,
    BALANCE,
    COMPARE,
    DELETE,
    DONE,
    INSERT,
    ROTATE_LEFT,
    ROTATE_RIGHT,
    Step,
    TREE,
    register,
)
from .tree_utils import (
    TreeNode,
    clone_tree,
    dict_to_tree,
    get_balance,
    get_height,
    get_populated_avl_tree,
    tree_to_dict,
)


def _rotate_right(z: TreeNode) -> TreeNode:
    y = z.left
    assert y is not None
    t3 = y.right
    y.right = z
    z.left = t3
    z.update_metrics()
    y.update_metrics()
    return y


def _rotate_left(z: TreeNode) -> TreeNode:
    y = z.right
    assert y is not None
    t2 = y.left
    y.left = z
    z.right = t2
    z.update_metrics()
    y.update_metrics()
    return y


def avl_insert(tree_data: dict[str, Any] | None = None, key: int = 53):
    """AVL Tree Insertion with step-by-step rebalancing rotations."""
    root = dict_to_tree(tree_data) if tree_data else get_populated_avl_tree()
    key = int(key)

    yield Step(
        INSERT,
        message=f"Starting AVL insertion for key {key}",
        active_val=key,
        highlight_nodes={str(key): "insert"},
        tree=tree_to_dict(root),
    )

    def _insert(node: TreeNode | None) -> tuple[TreeNode, list[Step]]:
        steps: list[Step] = []
        if node is None:
            new_node = TreeNode(key)
            return new_node, steps

        # 1. Traverse BST
        if key < node.val:
            steps.append(
                Step(
                    COMPARE,
                    message=f"Key {key} < node {node.val} → descend left",
                    active_val=node.val,
                    highlight_nodes={str(node.val): "compare"},
                )
            )
            node.left, child_steps = _insert(node.left)
            steps.extend(child_steps)
        elif key > node.val:
            steps.append(
                Step(
                    COMPARE,
                    message=f"Key {key} > node {node.val} → descend right",
                    active_val=node.val,
                    highlight_nodes={str(node.val): "compare"},
                )
            )
            node.right, child_steps = _insert(node.right)
            steps.extend(child_steps)
        else:
            steps.append(
                Step(
                    BALANCE,
                    message=f"Key {key} already exists in tree — no duplicates",
                    active_val=node.val,
                    highlight_nodes={str(node.val): "compare"},
                )
            )
            return node, steps

        # 2. Update height and balance factor
        node.update_metrics()
        bf = node.bf

        steps.append(
            Step(
                BALANCE,
                message=f"Retracing node {node.val}: height={node.height}, balance factor={bf}",
                active_val=node.val,
                highlight_nodes={str(node.val): "compare" if abs(bf) <= 1 else "unbalanced"},
            )
        )

        # 3. Check for 4 rotation cases
        # Case 1: Left-Left (Right Rotation)
        if bf > 1 and node.left and key < node.left.val:
            steps.append(
                Step(
                    ROTATE_RIGHT,
                    message=f"Imbalance at node {node.val} (bf=+{bf}) → Right Rotation (LL Case)",
                    active_val=node.val,
                    rotation="right",
                    highlight_nodes={str(node.val): "unbalanced", str(node.left.val): "pivot"},
                )
            )
            return _rotate_right(node), steps

        # Case 2: Right-Right (Left Rotation)
        if bf < -1 and node.right and key > node.right.val:
            steps.append(
                Step(
                    ROTATE_LEFT,
                    message=f"Imbalance at node {node.val} (bf={bf}) → Left Rotation (RR Case)",
                    active_val=node.val,
                    rotation="left",
                    highlight_nodes={str(node.val): "unbalanced", str(node.right.val): "pivot"},
                )
            )
            return _rotate_left(node), steps

        # Case 3: Left-Right Rotation
        if bf > 1 and node.left and key > node.left.val:
            steps.append(
                Step(
                    ROTATE_LEFT,
                    message=f"Imbalance at node {node.val} (bf=+{bf}) → Left-Right: Step 1 (Left rotate child {node.left.val})",
                    active_val=node.left.val,
                    rotation="left-right",
                    highlight_nodes={str(node.left.val): "pivot"},
                )
            )
            node.left = _rotate_left(node.left)
            steps.append(
                Step(
                    ROTATE_RIGHT,
                    message=f"Left-Right: Step 2 (Right rotate node {node.val})",
                    active_val=node.val,
                    rotation="left-right",
                    highlight_nodes={str(node.val): "unbalanced"},
                )
            )
            return _rotate_right(node), steps

        # Case 4: Right-Left Rotation
        if bf < -1 and node.right and key < node.right.val:
            steps.append(
                Step(
                    ROTATE_RIGHT,
                    message=f"Imbalance at node {node.val} (bf={bf}) → Right-Left: Step 1 (Right rotate child {node.right.val})",
                    active_val=node.right.val,
                    rotation="right-left",
                    highlight_nodes={str(node.right.val): "pivot"},
                )
            )
            node.right = _rotate_right(node.right)
            steps.append(
                Step(
                    ROTATE_LEFT,
                    message=f"Right-Left: Step 2 (Left rotate node {node.val})",
                    active_val=node.val,
                    rotation="right-left",
                    highlight_nodes={str(node.val): "unbalanced"},
                )
            )
            return _rotate_left(node), steps

        return node, steps

    root, step_list = _insert(root)

    # Yield all steps while attaching tree snapshots
    for s in step_list:
        s.tree = tree_to_dict(root)  # type: ignore
        yield s

    yield Step(
        DONE,
        message=f"AVL insertion for {key} complete: tree is balanced (height={root.height}) ✓",
        active_val=key,
        highlight_nodes={str(key): "settled"},
        tree=tree_to_dict(root),
    )


def avl_delete(tree_data: dict[str, Any] | None = None, key: int = 25):
    """AVL Tree Deletion with in-order successor handling and rebalancing rotations."""
    root = dict_to_tree(tree_data) if tree_data else get_populated_avl_tree()
    key = int(key)

    yield Step(
        DELETE,
        message=f"Starting AVL deletion for key {key}",
        active_val=key,
        highlight_nodes={str(key): "delete"},
        tree=tree_to_dict(root),
    )

    def _min_value_node(n: TreeNode) -> TreeNode:
        curr = n
        while curr.left is not None:
            curr = curr.left
        return curr

    def _delete(node: TreeNode | None, k: int) -> tuple[TreeNode | None, list[Step]]:
        steps: list[Step] = []
        if node is None:
            steps.append(
                Step(
                    BALANCE,
                    message=f"Key {k} not found in tree",
                    active_val=k,
                )
            )
            return None, steps

        # 1. Search for key
        if k < node.val:
            steps.append(
                Step(
                    COMPARE,
                    message=f"Key {k} < node {node.val} → descend left",
                    active_val=node.val,
                    highlight_nodes={str(node.val): "compare"},
                )
            )
            node.left, child_steps = _delete(node.left, k)
            steps.extend(child_steps)
        elif k > node.val:
            steps.append(
                Step(
                    COMPARE,
                    message=f"Key {k} > node {node.val} → descend right",
                    active_val=node.val,
                    highlight_nodes={str(node.val): "compare"},
                )
            )
            node.right, child_steps = _delete(node.right, k)
            steps.extend(child_steps)
        else:
            # Node found! Handle 0, 1, or 2 children
            if node.left is None:
                steps.append(
                    Step(
                        DELETE,
                        message=f"Delete node {node.val}: replace with right child",
                        active_val=node.val,
                        highlight_nodes={str(node.val): "delete"},
                    )
                )
                return node.right, steps
            elif node.right is None:
                steps.append(
                    Step(
                        DELETE,
                        message=f"Delete node {node.val}: replace with left child",
                        active_val=node.val,
                        highlight_nodes={str(node.val): "delete"},
                    )
                )
                return node.left, steps
            else:
                # 2 children: find in-order successor
                successor = _min_value_node(node.right)
                steps.append(
                    Step(
                        DELETE,
                        message=f"Node {node.val} has 2 children: replace with in-order successor {successor.val}",
                        active_val=successor.val,
                        highlight_nodes={str(node.val): "delete", str(successor.val): "compare"},
                    )
                )
                node.val = successor.val
                node.right, child_steps = _delete(node.right, successor.val)
                steps.extend(child_steps)

        if node is None:
            return None, steps

        # 2. Update height and balance factor
        node.update_metrics()
        bf = node.bf

        steps.append(
            Step(
                BALANCE,
                message=f"Retracing node {node.val}: height={node.height}, balance factor={bf}",
                active_val=node.val,
                highlight_nodes={str(node.val): "compare" if abs(bf) <= 1 else "unbalanced"},
            )
        )

        # 3. Check for rotations
        if bf > 1 and node.left:
            if get_balance(node.left) >= 0:
                steps.append(
                    Step(
                        ROTATE_RIGHT,
                        message=f"Imbalance at {node.val} (bf=+{bf}) → Right Rotation (LL Case)",
                        active_val=node.val,
                        rotation="right",
                        highlight_nodes={str(node.val): "unbalanced", str(node.left.val): "pivot"},
                    )
                )
                return _rotate_right(node), steps
            else:
                steps.append(
                    Step(
                        ROTATE_LEFT,
                        message=f"Imbalance at {node.val} (bf=+{bf}) → Left-Right: Step 1 (Left rotate child {node.left.val})",
                        active_val=node.left.val,
                        rotation="left-right",
                        highlight_nodes={str(node.left.val): "pivot"},
                    )
                )
                node.left = _rotate_left(node.left)
                steps.append(
                    Step(
                        ROTATE_RIGHT,
                        message=f"Left-Right: Step 2 (Right rotate node {node.val})",
                        active_val=node.val,
                        rotation="left-right",
                        highlight_nodes={str(node.val): "unbalanced"},
                    )
                )
                return _rotate_right(node), steps

        if bf < -1 and node.right:
            if get_balance(node.right) <= 0:
                steps.append(
                    Step(
                        ROTATE_LEFT,
                        message=f"Imbalance at {node.val} (bf={bf}) → Left Rotation (RR Case)",
                        active_val=node.val,
                        rotation="left",
                        highlight_nodes={str(node.val): "unbalanced", str(node.right.val): "pivot"},
                    )
                )
                return _rotate_left(node), steps
            else:
                steps.append(
                    Step(
                        ROTATE_RIGHT,
                        message=f"Imbalance at {node.val} (bf={bf}) → Right-Left: Step 1 (Right rotate child {node.right.val})",
                        active_val=node.right.val,
                        rotation="right-left",
                        highlight_nodes={str(node.right.val): "pivot"},
                    )
                )
                node.right = _rotate_right(node.right)
                steps.append(
                    Step(
                        ROTATE_LEFT,
                        message=f"Right-Left: Step 2 (Left rotate node {node.val})",
                        active_val=node.val,
                        rotation="right-left",
                        highlight_nodes={str(node.val): "unbalanced"},
                    )
                )
                return _rotate_left(node), steps

        return node, steps

    root, step_list = _delete(root, key)

    for s in step_list:
        s.tree = tree_to_dict(root)  # type: ignore
        yield s

    yield Step(
        DONE,
        message=f"AVL deletion for key {key} complete ✓",
        tree=tree_to_dict(root),
    )


register(
    AlgorithmInfo(
        name="avl_insert",
        display_name="AVL Tree: Insert & Rebalance",
        description=(
            "Inserts a new value into a populated AVL tree, updates balance factors bottom-up, "
            "and performs LL, RR, LR, or RL rotations to maintain O(log n) tree height."
        ),
        best="O(log n)",
        average="O(log n)",
        worst="O(log n)",
        space="O(1)",
        stable=True,
        category=TREE,
        fn=avl_insert,
    )
)

register(
    AlgorithmInfo(
        name="avl_delete",
        display_name="AVL Tree: Delete & Rebalance",
        description=(
            "Deletes a value from an AVL tree, replaces multi-child nodes with their in-order "
            "successor, and rebalances the tree along the retraced search path using rotations."
        ),
        best="O(log n)",
        average="O(log n)",
        worst="O(log n)",
        space="O(1)",
        stable=True,
        category=TREE,
        fn=avl_delete,
    )
)
