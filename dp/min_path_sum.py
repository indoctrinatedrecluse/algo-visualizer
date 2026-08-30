"""Minimum Path Sum: Matrix DP shortest path from top-left (0,0) to bottom-right (M-1, N-1)."""

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
from .dp_utils import get_default_grid_matrix


def min_path_sum(grid_data: list[list[int]] | None = None):
    """Minimum Path Sum generator across 2D cost grid."""
    if grid_data is None:
        grid = get_default_grid_matrix()
    else:
        grid = [list(row) for row in grid_data]

    m = len(grid)
    n = len(grid[0])
    dp = [[0] * n for _ in range(m)]

    row_labels = [f"Row {i}" for i in range(m)]
    col_labels = [f"Col {j}" for j in range(n)]

    dp[0][0] = grid[0][0]

    yield Step(
        TABLE_CELL,
        message=f"Initialize Grid Shortest Path: Start at (0, 0) with cost {grid[0][0]}. Grid dimensions: {m} × {n}",
        dp_table=[row[:] for row in dp],
        dp_row=0,
        dp_col=0,
        dp_active_cells=[(0, 0)],
        dp_row_labels=row_labels,
        dp_col_labels=col_labels,
        dp_title=f"Matrix Minimum Path Sum ({m} × {n})",
    )

    # First row
    for j in range(1, n):
        dp[0][j] = dp[0][j - 1] + grid[0][j]
        yield Step(
            TABLE_CELL,
            message=f"First row (0, {j}): From Left dp[0][{j-1}] ({dp[0][j-1]}) + cell cost {grid[0][j]} = {dp[0][j]}",
            dp_table=[row[:] for row in dp],
            dp_row=0,
            dp_col=j,
            dp_active_cells=[(0, j)],
            dp_dependencies=[(0, j - 1)],
            dp_row_labels=row_labels,
            dp_col_labels=col_labels,
            dp_title=f"Matrix Minimum Path Sum ({m} × {n})",
        )

    # First col
    for i in range(1, m):
        dp[i][0] = dp[i - 1][0] + grid[i][0]
        yield Step(
            TABLE_CELL,
            message=f"First col ({i}, 0): From Top dp[{i-1}][0] ({dp[i-1][0]}) + cell cost {grid[i][0]} = {dp[i][0]}",
            dp_table=[row[:] for row in dp],
            dp_row=i,
            dp_col=0,
            dp_active_cells=[(i, 0)],
            dp_dependencies=[(i - 1, 0)],
            dp_row_labels=row_labels,
            dp_col_labels=col_labels,
            dp_title=f"Matrix Minimum Path Sum ({m} × {n})",
        )

    # Rest of grid
    for i in range(1, m):
        for j in range(1, n):
            from_top = dp[i - 1][j]
            from_left = dp[i][j - 1]
            min_prev = min(from_top, from_left)
            dp[i][j] = grid[i][j] + min_prev
            dir_taken = "Top" if from_top < from_left else "Left"

            yield Step(
                TABLE_CELL,
                message=f"Cell ({i}, {j}): min(Top {from_top}, Left {from_left}) = {min_prev} ({dir_taken}) + cost {grid[i][j]} = {dp[i][j]}",
                dp_table=[row[:] for row in dp],
                dp_row=i,
                dp_col=j,
                dp_active_cells=[(i, j)],
                dp_dependencies=[(i - 1, j), (i, j - 1)],
                dp_row_labels=row_labels,
                dp_col_labels=col_labels,
                dp_title=f"Matrix Minimum Path Sum ({m} × {n})",
            )

    # Backtracking shortest path
    backtrack_path = []
    i, j = m - 1, n - 1

    while i > 0 or j > 0:
        backtrack_path.append((i, j))
        if i == 0:
            yield Step(
                BACKTRACK,
                message=f"Backtrack path: at (0, {j}) → move Left to (0, {j-1})",
                dp_table=[row[:] for row in dp],
                dp_active_cells=[(i, j)],
                backtrack_path=list(backtrack_path),
                dp_row_labels=row_labels,
                dp_col_labels=col_labels,
                dp_title=f"Matrix Minimum Path Sum ({m} × {n})",
            )
            j -= 1
        elif j == 0:
            yield Step(
                BACKTRACK,
                message=f"Backtrack path: at ({i}, 0) → move Top to ({i-1}, 0)",
                dp_table=[row[:] for row in dp],
                dp_active_cells=[(i, j)],
                backtrack_path=list(backtrack_path),
                dp_row_labels=row_labels,
                dp_col_labels=col_labels,
                dp_title=f"Matrix Minimum Path Sum ({m} × {n})",
            )
            i -= 1
        else:
            if dp[i - 1][j] <= dp[i][j - 1]:
                yield Step(
                    BACKTRACK,
                    message=f"Backtrack path: Top ({dp[i-1][j]}) <= Left ({dp[i][j-1]}) → move TOP to ({i-1}, {j})",
                    dp_table=[row[:] for row in dp],
                    dp_active_cells=[(i, j)],
                    backtrack_path=list(backtrack_path),
                    dp_row_labels=row_labels,
                    dp_col_labels=col_labels,
                    dp_title=f"Matrix Minimum Path Sum ({m} × {n})",
                )
                i -= 1
            else:
                yield Step(
                    BACKTRACK,
                    message=f"Backtrack path: Left ({dp[i][j-1]}) < Top ({dp[i-1][j]}) → move LEFT to ({i}, {j-1})",
                    dp_table=[row[:] for row in dp],
                    dp_active_cells=[(i, j)],
                    backtrack_path=list(backtrack_path),
                    dp_row_labels=row_labels,
                    dp_col_labels=col_labels,
                    dp_title=f"Matrix Minimum Path Sum ({m} × {n})",
                )
                j -= 1

    backtrack_path.append((0, 0))
    backtrack_path.reverse()
    min_sum = dp[m - 1][n - 1]

    path_str = " → ".join([f"({r},{c})" for r, c in backtrack_path])
    yield Step(
        DONE,
        message=f"Matrix Shortest Path complete! Minimum Path Cost = {min_sum} along path [{path_str}] ✓",
        dp_table=[row[:] for row in dp],
        backtrack_path=list(backtrack_path),
        dp_row_labels=row_labels,
        dp_col_labels=col_labels,
        dp_title=f"Matrix Minimum Path Sum ({m} × {n})",
        state={"min_cost": min_sum, "path": backtrack_path},
    )


register(
    AlgorithmInfo(
        name="min_path_sum",
        display_name="Minimum Path Sum (Grid Matrix DP)",
        description=(
            "Finds the minimum cost path from top-left to bottom-right of a 2D cost matrix, "
            "moving only right or down, in O(m · n) time."
        ),
        best="O(m · n)",
        average="O(m · n)",
        worst="O(m · n)",
        space="O(m · n)",
        stable=True,
        category=DP,
        fn=min_path_sum,
    )
)
