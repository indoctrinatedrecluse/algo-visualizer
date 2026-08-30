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
    _seq_counter = 0

    def __init__(self, char: str | None, freq: int, left: HuffmanNode | None = None, right: HuffmanNode | None = None):
        HuffmanNode._seq_counter += 1
        self.seq = HuffmanNode._seq_counter
        self.char = char
        self.freq = int(freq)
        self.left = left
        self.right = right

    def __lt__(self, other: HuffmanNode) -> bool:
        if self.freq != other.freq:
            return self.freq < other.freq
        return self.seq < other.seq

    def to_dict(self) -> dict[str, Any]:
        return {
            "val": self.freq,
            "label": f"{self.char}:{self.freq}" if self.char else str(self.freq),
            "color": "RED" if self.char else "BLACK",
            "left": self.left.to_dict() if self.left else None,
            "right": self.right.to_dict() if self.right else None,
        }


def normalize_frequencies(frequencies: Any) -> dict[str, int]:
    """Convert any user input format (dict, list of ints, list of dicts, str) into a clean frequency map."""
    if not frequencies:
        return get_default_huffman_frequencies()
    if isinstance(frequencies, dict):
        return {str(k): int(v) for k, v in frequencies.items() if v is not None}
    if isinstance(frequencies, list):
        if not frequencies:
            return get_default_huffman_frequencies()
        if all(isinstance(x, dict) and "freq" in x for x in frequencies):
            return {str(x.get("char", chr(65 + i))): int(x["freq"]) for i, x in enumerate(frequencies)}
        if all(isinstance(x, (int, float)) for x in frequencies):
            return {chr(65 + i): int(x) for i, x in enumerate(frequencies)}
        if all(isinstance(x, str) for x in frequencies):
            counts: dict[str, int] = {}
            for ch in frequencies:
                counts[ch] = counts.get(ch, 0) + 1
            return counts
    return get_default_huffman_frequencies()


def huffman_coding(frequencies: Any = None):
    """Huffman Coding generator: merges lowest frequency subtrees into optimal prefix tree."""
    freq_map = normalize_frequencies(frequencies)
    if not freq_map:
        freq_map = get_default_huffman_frequencies()

    heap: list[HuffmanNode] = [HuffmanNode(char, freq) for char, freq in freq_map.items()]
    heapq.heapify(heap)

    yield Step(
        COMPARE,
        message=f"Initialize Huffman forest with {len(freq_map)} character frequencies: {', '.join([f'{c}:{f}' for c, f in freq_map.items()])}",
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
