"""0-1 Knapsack: 2D Dynamic Programming Tabulation and Backtracking."""

from __future__ import annotations

from typing import Any

from registry import (
    AlgorithmInfo,
    BACKTRACK,
    DONE,
    DP,
    TABLE_CELL,
    Step,
    register,
)
from .dp_utils import get_default_01_knapsack


def knapsack_01(knapsack_data: dict[str, Any] | None = None):
    """0-1 Knapsack generator: fills 2D DP matrix table and backtracks optimal item subset."""
    if knapsack_data is None or "items" not in knapsack_data:
        knapsack_data = get_default_01_knapsack()

    capacity = int(knapsack_data.get("capacity", 10))
    items = knapsack_data["items"]
    n = len(items)

    # dp[i][w] stores maximum value with first i items and capacity w
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]

    row_labels = ["Ø (0)"] + [f"{it['id']} (w:{it['weight']}, v:{it['value']})" for it in items]
    col_labels = [f"W={w}" for w in range(capacity + 1)]

    yield Step(
        TABLE_CELL,
        message=f"Initialize 0-1 Knapsack 2D DP Table ({n+1} rows × {capacity+1} cols). Capacity W = {capacity}",
        dp_table=[row[:] for row in dp],
        dp_row_labels=row_labels,
        dp_col_labels=col_labels,
        dp_title="0-1 Knapsack 2D DP Table",
        dp_active_cells=[(0, w) for w in range(capacity + 1)],
    )

    for i in range(1, n + 1):
        it = items[i - 1]
        wt = int(it["weight"])
        val = int(it["value"])

        for w in range(capacity + 1):
            dependencies = []
            if wt > w:
                dp[i][w] = dp[i - 1][w]
                dependencies = [(i - 1, w)]
                msg = f"Item {it['id']} (w={wt}) > Cap {w} → Exclude: dp[{i}][{w}] = dp[{i-1}][{w}] = {dp[i][w]}"
            else:
                exclude_val = dp[i - 1][w]
                include_val = val + dp[i - 1][w - wt]
                dependencies = [(i - 1, w), (i - 1, w - wt)]
                if include_val > exclude_val:
                    dp[i][w] = include_val
                    msg = f"Item {it['id']} (w={wt}, v={val}): Include ({include_val}) > Exclude ({exclude_val}) → dp[{i}][{w}] = {include_val}"
                else:
                    dp[i][w] = exclude_val
                    msg = f"Item {it['id']} (w={wt}, v={val}): Exclude ({exclude_val}) >= Include ({include_val}) → dp[{i}][{w}] = {exclude_val}"

            yield Step(
                TABLE_CELL,
                message=msg,
                dp_table=[row[:] for row in dp],
                dp_row=i,
                dp_col=w,
                dp_active_cells=[(i, w)],
                dp_dependencies=dependencies,
                dp_row_labels=row_labels,
                dp_col_labels=col_labels,
                dp_title="0-1 Knapsack 2D DP Table",
            )

    # Backtracking optimal subset
    backtrack_path = []
    selected_items = []
    curr_w = capacity

    for i in range(n, 0, -1):
        backtrack_path.append((i, curr_w))
        it = items[i - 1]
        wt = int(it["weight"])
        val = int(it["value"])

        if dp[i][curr_w] != dp[i - 1][curr_w]:
            selected_items.append(it["id"])
            curr_w -= wt
            yield Step(
                BACKTRACK,
                message=f"Backtrack: dp[{i}][{curr_w+wt}] != dp[{i-1}][{curr_w+wt}] → Item {it['id']} is INCLUDED ✓ (New remaining cap: {curr_w})",
                dp_table=[row[:] for row in dp],
                dp_active_cells=[(i, curr_w + wt)],
                backtrack_path=list(backtrack_path),
                dp_row_labels=row_labels,
                dp_col_labels=col_labels,
                dp_title="0-1 Knapsack 2D DP Table",
            )
        else:
            yield Step(
                BACKTRACK,
                message=f"Backtrack: dp[{i}][{curr_w}] == dp[{i-1}][{curr_w}] → Item {it['id']} was EXCLUDED",
                dp_table=[row[:] for row in dp],
                dp_active_cells=[(i, curr_w)],
                backtrack_path=list(backtrack_path),
                dp_row_labels=row_labels,
                dp_col_labels=col_labels,
                dp_title="0-1 Knapsack 2D DP Table",
            )

    backtrack_path.append((0, curr_w))
    selected_items.reverse()
    max_val = dp[n][capacity]

    yield Step(
        DONE,
        message=f"0-1 Knapsack complete! Maximum Value = {max_val} with Items: [{', '.join(selected_items)}] ✓",
        dp_table=[row[:] for row in dp],
        backtrack_path=list(backtrack_path),
        dp_row_labels=row_labels,
        dp_col_labels=col_labels,
        dp_title="0-1 Knapsack 2D DP Table",
        state={"max_value": max_val, "selected_items": selected_items},
    )


register(
    AlgorithmInfo(
        name="knapsack_01",
        display_name="0-1 Knapsack (2D DP Table)",
        description=(
            "Solves the 0-1 Knapsack problem using 2D dynamic programming table filling in "
            "O(n · W) time and backtracks the optimal item subset."
        ),
        best="O(n · W)",
        average="O(n · W)",
        worst="O(n · W)",
        space="O(n · W)",
        stable=True,
        category=DP,
        fn=knapsack_01,
    )
)
