"""Longest Common Subsequence (LCS): 2D Matrix DP and Diagonal Backtracking."""

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
from .dp_utils import get_default_lcs_strings


def lcs(string_data: tuple[str, str] | None = None):
    """Longest Common Subsequence generator over 2D character matrix."""
    if string_data is None:
        s1, s2 = get_default_lcs_strings()
    else:
        s1, s2 = string_data

    m, n = len(s1), len(s2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    row_labels = ["Ø"] + [f"{s1[i]} ({i+1})" for i in range(m)]
    col_labels = ["Ø"] + [f"{s2[j]} ({j+1})" for j in range(n)]

    yield Step(
        TABLE_CELL,
        message=f"Initialize LCS Table for String 1 '{s1}' ({m} chars) and String 2 '{s2}' ({n} chars)",
        dp_table=[row[:] for row in dp],
        dp_row_labels=row_labels,
        dp_col_labels=col_labels,
        dp_title=f"LCS Matrix: '{s1}' vs '{s2}'",
        dp_active_cells=[(0, j) for j in range(n + 1)] + [(i, 0) for i in range(m + 1)],
    )

    for i in range(1, m + 1):
        c1 = s1[i - 1]
        for j in range(1, n + 1):
            c2 = s2[j - 1]
            if c1 == c2:
                dp[i][j] = dp[i - 1][j - 1] + 1
                dependencies = [(i - 1, j - 1)]
                msg = f"Match! '{c1}' == '{c2}' → Diagonal + 1: dp[{i}][{j}] = dp[{i-1}][{j-1}] + 1 = {dp[i][j]}"
            else:
                if dp[i - 1][j] >= dp[i][j - 1]:
                    dp[i][j] = dp[i - 1][j]
                    dependencies = [(i - 1, j)]
                    msg = f"Mismatch ('{c1}' != '{c2}'): Take Top ({dp[i-1][j]}) >= Left ({dp[i][j-1]}) → dp[{i}][{j}] = {dp[i][j]}"
                else:
                    dp[i][j] = dp[i][j - 1]
                    dependencies = [(i, j - 1)]
                    msg = f"Mismatch ('{c1}' != '{c2}'): Take Left ({dp[i][j-1]}) > Top ({dp[i-1][j]}) → dp[{i}][{j}] = {dp[i][j]}"

            yield Step(
                TABLE_CELL,
                message=msg,
                dp_table=[row[:] for row in dp],
                dp_row=i,
                dp_col=j,
                dp_active_cells=[(i, j)],
                dp_dependencies=dependencies,
                dp_row_labels=row_labels,
                dp_col_labels=col_labels,
                dp_title=f"LCS Matrix: '{s1}' vs '{s2}'",
            )

    # Backtracking common subsequence
    backtrack_path = []
    lcs_chars = []
    i, j = m, n

    while i > 0 and j > 0:
        backtrack_path.append((i, j))
        if s1[i - 1] == s2[j - 1]:
            lcs_chars.append(s1[i - 1])
            yield Step(
                BACKTRACK,
                message=f"Backtrack match: '{s1[i-1]}' at ({i}, {j}) is part of LCS! Move diagonally to ({i-1}, {j-1})",
                dp_table=[row[:] for row in dp],
                dp_active_cells=[(i, j)],
                backtrack_path=list(backtrack_path),
                dp_row_labels=row_labels,
                dp_col_labels=col_labels,
                dp_title=f"LCS Matrix: '{s1}' vs '{s2}'",
            )
            i -= 1
            j -= 1
        elif dp[i - 1][j] >= dp[i][j - 1]:
            yield Step(
                BACKTRACK,
                message=f"Backtrack mismatch: Top ({dp[i-1][j]}) >= Left ({dp[i][j-1]}) → Move UP to ({i-1}, {j})",
                dp_table=[row[:] for row in dp],
                dp_active_cells=[(i, j)],
                backtrack_path=list(backtrack_path),
                dp_row_labels=row_labels,
                dp_col_labels=col_labels,
                dp_title=f"LCS Matrix: '{s1}' vs '{s2}'",
            )
            i -= 1
        else:
            yield Step(
                BACKTRACK,
                message=f"Backtrack mismatch: Left ({dp[i][j-1]}) > Top ({dp[i-1][j]}) → Move LEFT to ({i}, {j-1})",
                dp_table=[row[:] for row in dp],
                dp_active_cells=[(i, j)],
                backtrack_path=list(backtrack_path),
                dp_row_labels=row_labels,
                dp_col_labels=col_labels,
                dp_title=f"LCS Matrix: '{s1}' vs '{s2}'",
            )
            j -= 1

    backtrack_path.append((i, j))
    lcs_chars.reverse()
    lcs_string = "".join(lcs_chars)

    yield Step(
        DONE,
        message=f"LCS complete! Longest Common Subsequence: '{lcs_string}' (Length = {len(lcs_string)}) ✓",
        dp_table=[row[:] for row in dp],
        backtrack_path=list(backtrack_path),
        dp_row_labels=row_labels,
        dp_col_labels=col_labels,
        dp_title=f"LCS Matrix: '{s1}' vs '{s2}'",
        state={"lcs": lcs_string, "length": len(lcs_string)},
    )


register(
    AlgorithmInfo(
        name="lcs",
        display_name="Longest Common Subsequence (LCS)",
        description=(
            "Finds the longest subsequence present in both strings in O(m · n) time "
            "using 2D DP matrix tabulation and diagonal match backtracking."
        ),
        best="O(m · n)",
        average="O(m · n)",
        worst="O(m · n)",
        space="O(m · n)",
        stable=True,
        category=DP,
        fn=lcs,
    )
)
