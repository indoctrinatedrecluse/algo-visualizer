"""Binary Min-Heap: Priority Queue operations (Insert & Sift-Up, Extract-Min & Sift-Down).

Complete binary tree representation where each parent node satisfies heap order:
  parent <= left_child and parent <= right_child.
"""

from __future__ import annotations

from typing import Any

from registry import (
    AlgorithmInfo,
    COMPARE,
    DELETE,
    DONE,
    INSERT,
    SWAP,
    Step,
    TREE,
    register,
)
from .tree_utils import (
    get_populated_min_heap,
    heap_to_tree,
    tree_to_dict,
)


def min_heap_insert(tree_data: dict[str, Any] | None = None, key: int = 5):
    """Min-Heap Insertion with Sift-Up restoration."""
    heap = list(get_populated_min_heap())
    key = int(key)

    yield Step(
        INSERT,
        message=f"Starting Min-Heap insertion: append key {key} at index {len(heap)}",
        active_val=key,
        indices=(len(heap),),
        highlight_nodes={str(key): "insert"},
        tree=tree_to_dict(heap_to_tree(heap + [key])),
    )

    heap.append(key)
    idx = len(heap) - 1

    # Sift-Up
    while idx > 0:
        parent_idx = (idx - 1) // 2
        yield Step(
            COMPARE,
            message=f"Compare node {heap[idx]} at index {idx} with parent {heap[parent_idx]} at index {parent_idx}",
            active_val=heap[idx],
            indices=(idx, parent_idx),
            highlight_nodes={str(heap[idx]): "compare", str(heap[parent_idx]): "compare"},
            tree=tree_to_dict(heap_to_tree(heap)),
        )

        if heap[idx] < heap[parent_idx]:
            heap[idx], heap[parent_idx] = heap[parent_idx], heap[idx]
            yield Step(
                SWAP,
                message=f"Sift-up swap: {heap[parent_idx]} < {heap[idx]} → swap node with parent",
                active_val=heap[parent_idx],
                indices=(idx, parent_idx),
                highlight_nodes={str(heap[parent_idx]): "insert", str(heap[idx]): "pivot"},
                tree=tree_to_dict(heap_to_tree(heap)),
            )
            idx = parent_idx
        else:
            break

    yield Step(
        DONE,
        message=f"Min-Heap insert complete: key {key} positioned at index {idx} ✓",
        active_val=heap[idx],
        highlight_nodes={str(heap[idx]): "settled"},
        tree=tree_to_dict(heap_to_tree(heap)),
    )


def min_heap_extract(tree_data: dict[str, Any] | None = None, key: int | None = None):
    """Min-Heap Extract-Min with Sift-Down restoration."""
    heap = list(get_populated_min_heap())
    if not heap:
        return

    min_val = heap[0]
    yield Step(
        DELETE,
        message=f"Extract-Min: remove root {min_val} (smallest element)",
        active_val=min_val,
        indices=(0,),
        highlight_nodes={str(min_val): "delete"},
        tree=tree_to_dict(heap_to_tree(heap)),
    )

    last_val = heap.pop()
    if not heap:
        yield Step(
            DONE,
            message="Heap is now empty",
            tree=None,
        )
        return

    heap[0] = last_val
    yield Step(
        SWAP,
        message=f"Move last element {last_val} to root, begin Sift-Down",
        active_val=last_val,
        indices=(0,),
        highlight_nodes={str(last_val): "compare"},
        tree=tree_to_dict(heap_to_tree(heap)),
    )

    # Sift-Down
    idx = 0
    n = len(heap)

    while True:
        left = 2 * idx + 1
        right = 2 * idx + 2
        smallest = idx

        if left < n and heap[left] < heap[smallest]:
            smallest = left
        if right < n and heap[right] < heap[smallest]:
            smallest = right

        if smallest != idx:
            yield Step(
                COMPARE,
                message=f"Compare parent {heap[idx]} with smaller child {heap[smallest]}",
                active_val=heap[idx],
                indices=(idx, smallest),
                highlight_nodes={str(heap[idx]): "compare", str(heap[smallest]): "unbalanced"},
                tree=tree_to_dict(heap_to_tree(heap)),
            )

            heap[idx], heap[smallest] = heap[smallest], heap[idx]
            yield Step(
                SWAP,
                message=f"Sift-down swap: swap {heap[smallest]} with {heap[idx]}",
                active_val=heap[idx],
                indices=(idx, smallest),
                highlight_nodes={str(heap[idx]): "insert", str(heap[smallest]): "pivot"},
                tree=tree_to_dict(heap_to_tree(heap)),
            )
            idx = smallest
        else:
            break

    yield Step(
        DONE,
        message=f"Min-Heap extract complete: minimum {min_val} extracted and heap property restored ✓",
        tree=tree_to_dict(heap_to_tree(heap)),
    )


register(
    AlgorithmInfo(
        name="min_heap_insert",
        display_name="Min-Heap: Insert & Sift-Up",
        description=(
            "Inserts an element at the end of the binary heap and restores the heap "
            "invariant in O(log n) time by bubbling the node up with parent swaps."
        ),
        best="O(1)",
        average="O(log n)",
        worst="O(log n)",
        space="O(1)",
        stable=False,
        category=TREE,
        fn=min_heap_insert,
    )
)

register(
    AlgorithmInfo(
        name="min_heap_extract",
        display_name="Min-Heap: Extract-Min & Sift-Down",
        description=(
            "Extracts the minimum element from the root, moves the last leaf to the root, "
            "and sifts it down to restore the heap property in O(log n) time."
        ),
        best="O(log n)",
        average="O(log n)",
        worst="O(log n)",
        space="O(1)",
        stable=False,
        category=TREE,
        fn=min_heap_extract,
    )
)
