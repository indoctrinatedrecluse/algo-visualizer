"""Fibonacci: 1D Dynamic Programming Tabulation."""

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


def fibonacci(n: int = 15):
    """Fibonacci Tabulation generator: fills 1D DP table iteratively."""
    n = max(2, min(25, int(n) if n is not None else 15))
    dp = [0] * (n + 1)
    dp[0] = 0
    dp[1] = 1

    yield Step(
        INSERT,
        indices=(0, 1),
        message=f"Initialize Fibonacci Tabulation DP array of size {n+1}. Base cases: F(0) = 0, F(1) = 1",
    )

    for i in range(2, n + 1):
        prev1 = dp[i - 1]
        prev2 = dp[i - 2]
        dp[i] = prev1 + prev2

        yield Step(
            COMPARE,
            indices=(i - 2, i - 1),
            message=f"Computing F({i}): sum previous two terms F({i-1}) = {prev1} and F({i-2}) = {prev2}",
        )

        yield Step(
            INSERT,
            indices=(i,),
            message=f"Table cell filled: F({i}) = {prev1} + {prev2} = {dp[i]} ✓",
        )

    yield Step(
        DONE,
        indices=(n,),
        message=f"Fibonacci Tabulation complete! F({n}) = {dp[n]} ✓",
        state={"n": n, "result": dp[n], "sequence": list(dp)},
    )


register(
    AlgorithmInfo(
        name="fibonacci",
        display_name="Fibonacci (1D DP Tabulation)",
        description=(
            "Computes the nth Fibonacci number in O(n) time and O(n) space by filling "
            "a 1D dynamic programming table from bottom to top."
        ),
        best="O(n)",
        average="O(n)",
        worst="O(n)",
        space="O(n)",
        stable=True,
        category=DP,
        fn=fibonacci,
    )
)
