"""Huffman Coding: Greedy prefix tree construction by merging least frequent character nodes."""

from __future__ import annotations

import heapq
from typing import Any

from registry import (
    AlgorithmInfo,
    COMPARE,
    DONE,
    GREEDY,
    INSERT,
    Step,
    TREE,
    register,
)
from .greedy_utils import get_default_huffman_frequencies


class HuffmanNode:
    def __init__(self, char: str | None, freq: int, left: HuffmanNode | None = None, right: HuffmanNode | None = None):
        self.char = char
        self.freq = freq
        self.left = left
        self.right = right

    def __lt__(self, other: HuffmanNode) -> bool:
        return self.freq < other.freq

    def to_dict(self) -> dict[str, Any]:
        return {
            "val": self.freq,
            "label": f"{self.char}:{self.freq}" if self.char else str(self.freq),
            "color": "RED" if self.char else "BLACK",
            "left": self.left.to_dict() if self.left else None,
            "right": self.right.to_dict() if self.right else None,
        }


def huffman_coding(frequencies: dict[str, int] | None = None):
    """Huffman Coding generator: merges lowest frequency subtrees into optimal prefix tree."""
    if frequencies is None:
        frequencies = get_default_huffman_frequencies()

    heap: list[HuffmanNode] = [HuffmanNode(char, freq) for char, freq in frequencies.items()]
    heapq.heapify(heap)

    yield Step(
        COMPARE,
        message=f"Initialize Huffman forest with {len(frequencies)} character frequencies: {', '.join([f'{c}:{f}' for c, f in frequencies.items()])}",
        state={"forest_size": len(heap)},
    )

    merge_step = 0
    while len(heap) > 1:
        left = heapq.heappop(heap)
        right = heapq.heappop(heap)
        merge_step += 1

        merged_freq = left.freq + right.freq
        merged_node = HuffmanNode(None, merged_freq, left, right)
        heapq.heappush(heap, merged_node)

        left_name = left.char if left.char else f"Subtree({left.freq})"
        right_name = right.char if right.char else f"Subtree({right.freq})"

        yield Step(
            INSERT,
            message=f"Merge step {merge_step}: Combine lowest frequencies {left_name} ({left.freq}) + {right_name} ({right.freq}) → New Parent ({merged_freq})",
            tree=merged_node.to_dict(),
            state={"forest_size": len(heap), "active_merged": merged_freq},
        )

    root = heap[0]

    # Generate prefix codes
    codes = {}

    def _traverse(node: HuffmanNode, current_code: str):
        if node.char:
            codes[node.char] = current_code or "0"
            return
        if node.left:
            _traverse(node.left, current_code + "0")
        if node.right:
            _traverse(node.right, current_code + "1")

    _traverse(root, "")

    code_summary = ", ".join([f"{c}: {codes[c]}" for c in sorted(codes.keys())])
    yield Step(
        DONE,
        message=f"Huffman tree complete! Optimal prefix codes: [{code_summary}] ✓",
        tree=root.to_dict(),
        state={"codes": codes},
    )


register(
    AlgorithmInfo(
        name="huffman_coding",
        display_name="Huffman Coding (Greedy Prefix Tree)",
        description=(
            "Constructs an optimal variable-length prefix code by iteratively merging the "
            "two lowest frequency character subtrees in O(n log n) time."
        ),
        best="O(n log n)",
        average="O(n log n)",
        worst="O(n log n)",
        space="O(n)",
        stable=True,
        category=GREEDY,
        fn=huffman_coding,
    )
)
