"""Fractional Knapsack: Greedy choice by maximum value-to-weight ratio."""

from __future__ import annotations

from typing import Any

from registry import (
    AlgorithmInfo,
    COMPARE,
    DONE,
    FRACTION_PACK,
    GREEDY,
    KNAPSACK_PACK,
    Step,
    register,
)
from .greedy_utils import get_default_knapsack_items


def fractional_knapsack(knapsack_data: dict[str, Any] | None = None):
    """Fractional Knapsack generator yielding Step frames for ratio calculation, sorting, and greedy packing."""
    if knapsack_data is None or "items" not in knapsack_data:
        knapsack_data = get_default_knapsack_items()

    capacity = float(knapsack_data.get("capacity", 50))
    raw_items = knapsack_data["items"]

    # Compute value/weight ratio
    item_list = []
    for item in raw_items:
        w = float(item["weight"])
        v = float(item["value"])
        ratio = round(v / w, 2)
        item_list.append({
            "id": str(item["id"]),
            "weight": w,
            "value": v,
            "ratio": ratio,
            "status": "pending",
            "fraction": 0.0,
        })

    current_weight = 0.0
    total_value = 0.0

    yield Step(
        COMPARE,
        message=f"Compute value/weight ratios for {len(item_list)} items. Knapsack Capacity = {capacity:.0f}",
        items=[dict(it) for it in item_list],
        gauge={"current_weight": 0.0, "max_capacity": capacity, "total_value": 0.0},
    )

    # Sort items descending by ratio
    item_list.sort(key=lambda x: x["ratio"], reverse=True)

    yield Step(
        COMPARE,
        message=f"Sorted items descending by ratio: {' > '.join([f'{it['id']} ({it['ratio']})' for it in item_list])}",
        items=[dict(it) for it in item_list],
        gauge={"current_weight": 0.0, "max_capacity": capacity, "total_value": 0.0},
    )

    for it in item_list:
        if current_weight >= capacity:
            it["status"] = "skipped"
            continue

        remaining_cap = capacity - current_weight
        if it["weight"] <= remaining_cap:
            # Take full item
            it["fraction"] = 1.0
            it["status"] = "packed"
            current_weight += it["weight"]
            total_value += it["value"]

            yield Step(
                KNAPSACK_PACK,
                message=f"Pack entire item {it['id']} (Weight {it['weight']:.0f}, Value {it['value']:.0f}) → Total Weight {current_weight:.0f}/{capacity:.0f}, Total Value {total_value:.1f}",
                items=[dict(x) for x in item_list],
                gauge={"current_weight": current_weight, "max_capacity": capacity, "total_value": total_value},
            )
        else:
            # Take fractional slice
            fraction = remaining_cap / it["weight"]
            it["fraction"] = round(fraction, 2)
            it["status"] = "fractional"
            current_weight += remaining_cap
            added_val = it["value"] * fraction
            total_value += added_val

            yield Step(
                FRACTION_PACK,
                message=f"Pack {fraction*100:.1f}% fraction of item {it['id']} (Weight {remaining_cap:.0f}/{it['weight']:.0f}, Value +{added_val:.1f}) → Knapsack Full! Total Value = {total_value:.2f}",
                items=[dict(x) for x in item_list],
                gauge={"current_weight": current_weight, "max_capacity": capacity, "total_value": total_value},
            )
            break

    yield Step(
        DONE,
        message=f"Fractional Knapsack complete! Optimal Total Value = {total_value:.2f} with Total Weight = {current_weight:.0f}/{capacity:.0f} ✓",
        items=[dict(x) for x in item_list],
        gauge={"current_weight": current_weight, "max_capacity": capacity, "total_value": total_value},
    )


register(
    AlgorithmInfo(
        name="fractional_knapsack",
        display_name="Fractional Knapsack (Greedy)",
        description=(
            "Packs items with maximum value-to-weight ratio first, taking whole or fractional "
            "slices to achieve the optimal knapsack value in O(n log n) time."
        ),
        best="O(n log n)",
        average="O(n log n)",
        worst="O(n log n)",
        space="O(n)",
        stable=True,
        category=GREEDY,
        fn=fractional_knapsack,
    )
)
