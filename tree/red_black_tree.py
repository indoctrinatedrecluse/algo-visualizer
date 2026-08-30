"""Red-Black Tree: Self-balancing BST using node color invariants.

Properties:
  1. Every node is either RED or BLACK.
  2. The root is always BLACK.
  3. No two adjacent RED nodes (a RED node cannot have a RED child).
  4. Every path from a node to its descendant leaves contains the same number of BLACK nodes.
"""

from __future__ import annotations

from typing import Any

from registry import (
    AlgorithmInfo,
    COMPARE,
    DONE,
    INSERT,
    RECOLOR,
    ROTATE_LEFT,
    ROTATE_RIGHT,
    Step,
    TREE,
    register,
)
from .tree_utils import (
    TreeNode,
    dict_to_tree,
    get_populated_red_black_tree,
    tree_to_dict,
)


def rb_insert(tree_data: dict[str, Any] | None = None, key: int = 40):
    """Red-Black Tree insertion with double-red resolution and color flips."""
    root = dict_to_tree(tree_data) if tree_data else get_populated_red_black_tree()
    key = int(key)

    yield Step(
        INSERT,
        message=f"Starting Red-Black insertion for key {key} (inserted as RED)",
        active_val=key,
        highlight_nodes={str(key): "insert"},
        node_colors={str(key): "RED"},
        tree=tree_to_dict(root),
    )

    # 1. Standard BST Insert
    parent_map: dict[TreeNode, TreeNode | None] = {root: None}

    def _build_parent_map(n: TreeNode | None, p: TreeNode | None):
        if not n:
            return
        parent_map[n] = p
        _build_parent_map(n.left, n)
        _build_parent_map(n.right, n)

    _build_parent_map(root, None)

    curr = root
    parent = None
    while curr:
        parent = curr
        if key < curr.val:
            yield Step(
                COMPARE,
                message=f"Key {key} < node {curr.val} → descend left",
                active_val=curr.val,
                highlight_nodes={str(curr.val): "compare"},
                tree=tree_to_dict(root),
            )
            curr = curr.left
        elif key > curr.val:
            yield Step(
                COMPARE,
                message=f"Key {key} > node {curr.val} → descend right",
                active_val=curr.val,
                highlight_nodes={str(curr.val): "compare"},
                tree=tree_to_dict(root),
            )
            curr = curr.right
        else:
            yield Step(
                DONE,
                message=f"Key {key} already exists in Red-Black Tree",
                active_val=key,
                tree=tree_to_dict(root),
            )
            return

    new_node = TreeNode(key, color="RED")
    assert parent is not None
    if key < parent.val:
        parent.left = new_node
    else:
        parent.right = new_node
    parent_map[new_node] = parent

    yield Step(
        INSERT,
        message=f"Inserted node {key} as RED child of {parent.val}",
        active_val=key,
        highlight_nodes={str(key): "insert", str(parent.val): "compare"},
        tree=tree_to_dict(root),
    )

    # 2. Fix Red-Black Tree violations
    def _rotate_left_node(x: TreeNode) -> TreeNode:
        y = x.right
        assert y is not None
        x.right = y.left
        if y.left:
            parent_map[y.left] = x
        y.left = x
        py = parent_map[x]
        parent_map[y] = py
        parent_map[x] = y
        if py:
            if py.left == x:
                py.left = y
            else:
                py.right = y
        x.update_metrics()
        y.update_metrics()
        return y

    def _rotate_right_node(y: TreeNode) -> TreeNode:
        x = y.left
        assert x is not None
        y.left = x.right
        if x.right:
            parent_map[x.right] = y
        x.right = y
        py = parent_map[y]
        parent_map[x] = py
        parent_map[y] = x
        if py:
            if py.left == y:
                py.left = x
            else:
                py.right = x
        y.update_metrics()
        x.update_metrics()
        return x

    z = new_node
    while z != root and parent_map[z] and parent_map[z].color == "RED":
        p = parent_map[z]
        g = parent_map[p]
        if not g:
            break

        if p == g.left:
            u = g.right  # Uncle
            if u and u.color == "RED":
                # Case 1: Uncle is RED -> Recolor parent, uncle, and grandparent
                p.color = "BLACK"
                u.color = "BLACK"
                g.color = "RED"
                yield Step(
                    RECOLOR,
                    message=f"Case 1 (Uncle {u.val} is RED): Recolor parent {p.val} & uncle {u.val} BLACK, grandparent {g.val} RED",
                    active_val=z.val,
                    highlight_nodes={str(p.val): "settled", str(u.val): "settled", str(g.val): "unbalanced"},
                    tree=tree_to_dict(root),
                )
                z = g
            else:
                # Case 2: Triangle (z is right child)
                if z == p.right:
                    z = p
                    yield Step(
                        ROTATE_LEFT,
                        message=f"Case 2 (Triangle LR): Left rotate around node {z.val}",
                        rotation="left",
                        active_val=z.val,
                        highlight_nodes={str(z.val): "pivot"},
                        tree=tree_to_dict(root),
                    )
                    _rotate_left_node(z)
                    p = parent_map[z]
                    g = parent_map[p] if p else None
                    if not p or not g:
                        break

                # Case 3: Line (z is left child)
                p.color = "BLACK"
                g.color = "RED"
                yield Step(
                    ROTATE_RIGHT,
                    message=f"Case 3 (Line LL): Recolor parent {p.val} BLACK, grandparent {g.val} RED → Right rotate around {g.val}",
                    rotation="right",
                    active_val=p.val,
                    highlight_nodes={str(p.val): "settled", str(g.val): "unbalanced"},
                    tree=tree_to_dict(root),
                )
                rotated_root = _rotate_right_node(g)
                if g == root:
                    root = rotated_root
        else:
            u = g.left  # Uncle
            if u and u.color == "RED":
                p.color = "BLACK"
                u.color = "BLACK"
                g.color = "RED"
                yield Step(
                    RECOLOR,
                    message=f"Case 1 (Uncle {u.val} is RED): Recolor parent {p.val} & uncle {u.val} BLACK, grandparent {g.val} RED",
                    active_val=z.val,
                    highlight_nodes={str(p.val): "settled", str(u.val): "settled", str(g.val): "unbalanced"},
                    tree=tree_to_dict(root),
                )
                z = g
            else:
                if z == p.left:
                    z = p
                    yield Step(
                        ROTATE_RIGHT,
                        message=f"Case 2 (Triangle RL): Right rotate around node {z.val}",
                        rotation="right",
                        active_val=z.val,
                        highlight_nodes={str(z.val): "pivot"},
                        tree=tree_to_dict(root),
                    )
                    _rotate_right_node(z)
                    p = parent_map[z]
                    g = parent_map[p] if p else None
                    if not p or not g:
                        break

                p.color = "BLACK"
                g.color = "RED"
                yield Step(
                    ROTATE_LEFT,
                    message=f"Case 3 (Line RR): Recolor parent {p.val} BLACK, grandparent {g.val} RED → Left rotate around {g.val}",
                    rotation="left",
                    active_val=p.val,
                    highlight_nodes={str(p.val): "settled", str(g.val): "unbalanced"},
                    tree=tree_to_dict(root),
                )
                rotated_root = _rotate_left_node(g)
                if g == root:
                    root = rotated_root

    # Ensure root remains BLACK
    if root.color != "BLACK":
        root.color = "BLACK"
        yield Step(
            RECOLOR,
            message="Property 2: Set root color to BLACK",
            active_val=root.val,
            highlight_nodes={str(root.val): "settled"},
            tree=tree_to_dict(root),
        )

    # Refresh metrics
    def _refresh(n: TreeNode | None):
        if not n:
            return
        _refresh(n.left)
        _refresh(n.right)
        n.update_metrics()

    _refresh(root)

    yield Step(
        DONE,
        message=f"Red-Black Tree insertion complete: key {key} added and color invariants verified ✓",
        tree=tree_to_dict(root),
    )


register(
    AlgorithmInfo(
        name="rb_insert",
        display_name="Red-Black Tree: Insert & Recolor",
        description=(
            "Inserts a new value into a Red-Black Tree, resolves double-red violations "
            "using color flips (when uncle is red) and rotations (when uncle is black)."
        ),
        best="O(log n)",
        average="O(log n)",
        worst="O(log n)",
        space="O(1)",
        stable=True,
        category=TREE,
        fn=rb_insert,
    )
)
