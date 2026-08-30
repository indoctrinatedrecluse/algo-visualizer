"""Tests for Binary Search Tree & AVL Tree Algorithms (Insert, Delete, Rebalance)."""

import engine
from fastapi.testclient import TestClient
import main
from tree.tree_utils import (
    dict_to_tree,
    generate_random_tree,
    get_populated_avl_tree,
    get_unbalanced_tree,
    tree_to_dict,
)

client = TestClient(main.app)


def _check_avl_invariants(node) -> tuple[int, bool]:
    """Helper to verify BST ordering and AVL balance property for every subtree."""
    if node is None:
        return 0, True

    lh, l_ok = _check_avl_invariants(node.left)
    rh, r_ok = _check_avl_invariants(node.right)

    if not l_ok or not r_ok:
        return 0, False

    if node.left and node.left.val >= node.val:
        return 0, False
    if node.right and node.right.val <= node.val:
        return 0, False

    bf = lh - rh
    if abs(bf) > 1:
        return 0, False

    return 1 + max(lh, rh), True


def test_default_avl_tree_structure():
    root = get_populated_avl_tree()
    assert root is not None
    d = tree_to_dict(root)
    assert d["val"] == 50
    h, is_valid = _check_avl_invariants(root)
    assert is_valid
    assert h == 4


def test_random_tree_generator():
    for count in (10, 15, 20):
        root = generate_random_tree(count, seed=42)
        assert root is not None
        h, is_valid = _check_avl_invariants(root)
        assert is_valid


def test_avl_insert_maintains_balance():
    root = get_populated_avl_tree()
    tree_data = tree_to_dict(root)

    # Insert a key that triggers rebalancing
    result = engine.run_sort("avl_insert", tree_data=tree_data, key=53)
    assert result["category"] == "tree"
    assert result["key"] == 53
    frames = result["frames"]
    assert len(frames) > 3

    last_frame = frames[-1]
    assert last_frame["type"] == "done"
    final_tree = dict_to_tree(last_frame["tree"])
    assert final_tree is not None
    _, is_valid = _check_avl_invariants(final_tree)
    assert is_valid, "Tree must be a valid balanced AVL tree after insertion"


def test_avl_delete_maintains_balance():
    root = get_populated_avl_tree()
    tree_data = tree_to_dict(root)

    # Delete internal node with 2 children
    result = engine.run_sort("avl_delete", tree_data=tree_data, key=25)
    assert result["category"] == "tree"
    assert result["key"] == 25
    frames = result["frames"]
    assert len(frames) > 3

    last_frame = frames[-1]
    assert last_frame["type"] == "done"
    final_tree = dict_to_tree(last_frame["tree"])
    assert final_tree is not None
    _, is_valid = _check_avl_invariants(final_tree)
    assert is_valid, "Tree must remain a valid balanced AVL tree after deletion"


def test_dsw_rebalance():
    unbalanced = get_unbalanced_tree()
    tree_data = tree_to_dict(unbalanced)

    result = engine.run_sort("dsw_rebalance", tree_data=tree_data)
    assert result["category"] == "tree"
    frames = result["frames"]
    assert len(frames) > 3

    last_frame = frames[-1]
    assert last_frame["type"] == "done"
    final_tree = dict_to_tree(last_frame["tree"])
    assert final_tree is not None
    h, is_valid = _check_avl_invariants(final_tree)
    assert is_valid, "DSW rebalance must produce a balanced BST"
    assert h <= 5


def test_rb_insert():
    result = engine.run_sort("rb_insert", key=40)
    assert result["category"] == "tree"
    assert result["key"] == 40
    frames = result["frames"]
    assert len(frames) > 3

    last_frame = frames[-1]
    assert last_frame["type"] == "done"
    final_tree = dict_to_tree(last_frame["tree"])
    assert final_tree is not None
    assert final_tree.color == "BLACK", "Root must be BLACK in Red-Black tree"


def test_min_heap_operations():
    # Insert
    ins_result = engine.run_sort("min_heap_insert", key=5)
    assert ins_result["category"] == "tree"
    frames = ins_result["frames"]
    assert len(frames) > 2
    assert frames[-1]["type"] == "done"

    # Extract
    ext_result = engine.run_sort("min_heap_extract")
    assert ext_result["category"] == "tree"
    frames = ext_result["frames"]
    assert len(frames) > 2
    assert frames[-1]["type"] == "done"


def test_tree_line_numbers_map_into_source():
    for algo_name in ("avl_insert", "avl_delete", "dsw_rebalance", "rb_insert", "min_heap_insert", "min_heap_extract"):
        detail = engine.get_algorithm_detail(algo_name)
        start_line = detail["start_line"]
        source_lines = detail["source"].splitlines()
        result = engine.run_sort(algo_name)
        assert result["frames"], f"{algo_name} produced no frames"
        for frame in result["frames"]:
            rel = frame["line"] - start_line
            assert 0 <= rel < len(source_lines), (
                f"{algo_name}: line {frame['line']} outside source range "
                f"[{start_line}, {start_line + len(source_lines)})"
            )


def test_ws_tree_roundtrip():
    # 1. Test AVL Insert
    with client.websocket_connect("/ws") as ws:
        ws.send_json({
            "action": "sort",
            "algorithm": "avl_insert",
            "key": 53,
            "request_id": 201,
        })
        msg = ws.receive_json()
        assert msg["type"] == "result"
        assert msg["request_id"] == 201
        assert msg["category"] == "tree"
        assert msg["frames"][-1]["type"] == "done"

    # 2. Test Red-Black Insert
    with client.websocket_connect("/ws") as ws:
        ws.send_json({
            "action": "sort",
            "algorithm": "rb_insert",
            "key": 40,
            "request_id": 204,
        })
        msg = ws.receive_json()
        assert msg["type"] == "result"
        assert msg["request_id"] == 204
        assert msg["category"] == "tree"
        assert msg["frames"][-1]["type"] == "done"

    # 3. Test Min-Heap Insert
    with client.websocket_connect("/ws") as ws:
        ws.send_json({
            "action": "sort",
            "algorithm": "min_heap_insert",
            "key": 5,
            "request_id": 205,
        })
        msg = ws.receive_json()
        assert msg["type"] == "result"
        assert msg["request_id"] == 205
        assert msg["category"] == "tree"
        assert msg["frames"][-1]["type"] == "done"
