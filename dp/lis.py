"""Longest Increasing Subsequence (LIS): 1D DP array and optimal chain reconstruction."""

from __future__ import annotations

from registry import (
    AlgorithmInfo,
    COMPARE,
    DONE,
    DP,
    INSERT,
    Step,
    register,
)
from .dp_utils import get_default_lis_array


def lis(array: list[int] | None = None):
    """Longest Increasing Subsequence generator over 1D array with predecessor tracking."""
    if array is None:
        array = get_default_lis_array()

    arr = [int(x) for x in array]
    n = len(arr)
    dp = [1] * n
    parent = [-1] * n

    yield Step(
        COMPARE,
        indices=tuple(range(n)),
        message=f"Initialize LIS DP array for {n} elements: [{', '.join(str(x) for x in arr)}]. Base LIS lengths = 1.",
    )

    for i in range(1, n):
        for j in range(i):
            yield Step(
                COMPARE,
                indices=(j, i),
                message=f"Compare arr[{j}] ({arr[j]}) with arr[{i}] ({arr[i]}): dp[{j}]={dp[j]}, dp[{i}]={dp[i]}",
            )

            if arr[j] < arr[i] and dp[j] + 1 > dp[i]:
                dp[i] = dp[j] + 1
                parent[i] = j

                yield Step(
                    INSERT,
                    indices=(i,),
                    message=f"Update LIS: arr[{j}] < arr[{i}] → Extend subsequence: dp[{i}] = dp[{j}] + 1 = {dp[i]} (predecessor = index {j})",
                )

    # Reconstruct optimal sequence
    max_len = max(dp)
    best_idx = dp.index(max_len)
    seq = []
    curr = best_idx
    while curr != -1:
        seq.append(arr[curr])
        curr = parent[curr]
    seq.reverse()

    seq_str = " < ".join(str(x) for x in seq)
    yield Step(
        DONE,
        indices=tuple(i for i, x in enumerate(arr) if x in seq),
        message=f"LIS complete! Maximum length = {max_len}, Subsequence: [{seq_str}] ✓",
        state={"max_length": max_len, "subsequence": seq},
    )


register(
    AlgorithmInfo(
        name="lis",
        display_name="Longest Increasing Subsequence (LIS)",
        description=(
            "Finds the length of the longest strictly increasing subsequence in an array in "
            "O(n²) time using 1D DP tabulation and predecessor chain tracking."
        ),
        best="O(n log n)",
        average="O(n²)",
        worst="O(n²)",
        space="O(n)",
        stable=True,
        category=DP,
        fn=lis,
    )
)
