"""Dynamic Programming utilities: default presets and helpers for 0-1 Knapsack, LCS,
Minimum Path Sum grid, 3-Sum, 4-Sum, Fibonacci, LIS, and DP Coin Change.
"""

from __future__ import annotations

from typing import Any


def get_default_01_knapsack() -> dict[str, Any]:
    """Default 0-1 Knapsack preset (5 items, capacity 10)."""
    return {
        "capacity": 10,
        "items": [
            {"id": "I1", "weight": 2, "value": 6},
            {"id": "I2", "weight": 3, "value": 10},
            {"id": "I3", "weight": 4, "value": 12},
            {"id": "I4", "weight": 5, "value": 16},
            {"id": "I5", "weight": 6, "value": 22},
        ],
    }


def get_default_lcs_strings() -> tuple[str, str]:
    """Default string pair for Longest Common Subsequence."""
    return "ABCBDAB", "BDCABA"


def get_default_grid_matrix() -> list[list[int]]:
    """Default 4x5 cost matrix for Minimum Path Sum."""
    return [
        [1, 3, 1, 2, 4],
        [1, 5, 2, 1, 3],
        [4, 2, 1, 4, 1],
        [2, 1, 3, 2, 1],
    ]


def get_default_3sum_array() -> list[int]:
    """Default array for 3-Sum problem."""
    return [-1, 0, 1, 2, -1, -4, -2, 3, 4, -3]


def get_default_4sum_array() -> list[int]:
    """Default array for 4-Sum problem."""
    return [1, 0, -1, 0, -2, 2, 3, -3, 1, -1]


def get_default_lis_array() -> list[int]:
    """Default array for Longest Increasing Subsequence."""
    return [10, 22, 9, 33, 21, 50, 41, 60, 80]
