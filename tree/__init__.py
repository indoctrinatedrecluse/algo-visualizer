"""Tree package initialization: registers AVL Insert, AVL Delete, and DSW Rebalance."""

from .avl_tree import avl_delete, avl_insert
from .dsw_rebalance import dsw_rebalance
from .heap import min_heap_extract, min_heap_insert
from .red_black_tree import rb_insert
from .tree_utils import (
    TreeNode,
    dict_to_tree,
    generate_random_tree,
    get_populated_avl_tree,
    get_populated_min_heap,
    get_populated_red_black_tree,
    get_unbalanced_tree,
    heap_to_tree,
    tree_to_dict,
)

__all__ = [
    "TreeNode",
    "avl_delete",
    "avl_insert",
    "dict_to_tree",
    "dsw_rebalance",
    "generate_random_tree",
    "get_populated_avl_tree",
    "get_populated_min_heap",
    "get_populated_red_black_tree",
    "get_unbalanced_tree",
    "heap_to_tree",
    "min_heap_extract",
    "min_heap_insert",
    "rb_insert",
    "tree_to_dict",
]
