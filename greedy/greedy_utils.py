"""Greedy algorithms utilities: default presets and random generation helpers."""

from __future__ import annotations

import random
from typing import Any


def get_default_knapsack_items() -> dict[str, Any]:
    """Default 6-item preset with knapsack capacity 50."""
    return {
        "capacity": 50,
        "items": [
            {"id": "A", "weight": 8, "value": 56},   # ratio: 7.0
            {"id": "B", "weight": 10, "value": 60},  # ratio: 6.0
            {"id": "C", "weight": 20, "value": 100}, # ratio: 5.0
            {"id": "D", "weight": 30, "value": 120}, # ratio: 4.0
            {"id": "E", "weight": 15, "value": 45},  # ratio: 3.0
            {"id": "F", "weight": 25, "value": 50},  # ratio: 2.0
        ],
    }


def generate_random_knapsack_items(num_items: int = 6, seed: int | None = None) -> dict[str, Any]:
    """Generate random items with varied weights, values, and total capacity."""
    rng = random.Random(seed)
    num_items = max(4, min(10, num_items))
    items = []
    total_w = 0
    for i in range(num_items):
        item_id = chr(65 + i)
        w = rng.randint(5, 30)
        v = rng.randint(20, 150)
        total_w += w
        items.append({"id": item_id, "weight": w, "value": v})
    capacity = round(total_w * 0.55)
    return {"capacity": capacity, "items": items}


def get_default_activities() -> list[dict[str, Any]]:
    """Default 8 intervals for Activity Selection / Interval Scheduling."""
    return [
        {"id": "Act 1", "start": 1, "end": 4},
        {"id": "Act 2", "start": 3, "end": 5},
        {"id": "Act 3", "start": 0, "end": 6},
        {"id": "Act 4", "start": 5, "end": 7},
        {"id": "Act 5", "start": 3, "end": 9},
        {"id": "Act 6", "start": 5, "end": 9},
        {"id": "Act 7", "start": 6, "end": 10},
        {"id": "Act 8", "start": 8, "end": 11},
    ]


def generate_random_activities(count: int = 8, seed: int | None = None) -> list[dict[str, Any]]:
    """Generate random intervals with start < end within a timeline."""
    rng = random.Random(seed)
    count = max(5, min(12, count))
    activities = []
    for i in range(count):
        s = rng.randint(0, 10)
        duration = rng.randint(2, 6)
        activities.append({"id": f"Act {i+1}", "start": s, "end": s + duration})
    return activities


def get_default_jobs() -> list[dict[str, Any]]:
    """Default 6 jobs for Job Sequencing with Deadlines."""
    return [
        {"id": "J1", "deadline": 2, "profit": 100},
        {"id": "J2", "deadline": 1, "profit": 19},
        {"id": "J3", "deadline": 2, "profit": 27},
        {"id": "J4", "deadline": 1, "profit": 25},
        {"id": "J5", "deadline": 3, "profit": 15},
        {"id": "J6", "deadline": 3, "profit": 50},
    ]


def get_default_huffman_frequencies() -> dict[str, int]:
    """Default character frequency distribution for Huffman Coding."""
    return {"A": 45, "B": 13, "C": 12, "D": 16, "E": 9, "F": 5}


def get_default_coin_change() -> tuple[list[int], int]:
    """Default denominations and target amount for Coin Change."""
    return [25, 10, 5, 1], 67
