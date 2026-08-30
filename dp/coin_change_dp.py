"""Coin Change (Min Coins): 1D Dynamic Programming Tabulation and Coin Backtracking."""

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


def coin_change_dp(coins: list[int] | None = None, target: int = 18):
    """Coin Change (Min Coins) generator: fills 1D DP table up to target amount and backtracks."""
    if coins is None:
        coins = [1, 2, 5, 10]

    denominations = sorted([int(c) for c in coins])
    amount = int(target)
    dp = [float("inf")] * (amount + 1)
    coin_used = [-1] * (amount + 1)
    dp[0] = 0

    yield Step(
        INSERT,
        indices=(0,),
        message=f"Initialize Coin Change DP table for Target Amount {amount} with coins {denominations}. dp[0] = 0.",
    )

    for a in range(1, amount + 1):
        for c_idx, c in enumerate(denominations):
            if c <= a:
                if dp[a - c] + 1 < dp[a]:
                    dp[a] = dp[a - c] + 1
                    coin_used[a] = c

                    yield Step(
                        COMPARE,
                        indices=(a - c,),
                        message=f"Amount {a}: Try coin {c} → 1 + dp[{a - c}] ({dp[a - c]}) = {dp[a]} coin(s)",
                    )

        yield Step(
            INSERT,
            indices=(a,),
            message=f"dp[{a}] = {dp[a]} coin(s) (used {coin_used[a]}¢ coin)",
        )

    # Backtrack combination
    result_coins = []
    curr = amount
    while curr > 0 and coin_used[curr] != -1:
        result_coins.append(coin_used[curr])
        curr -= coin_used[curr]

    if dp[amount] != float("inf"):
        yield Step(
            DONE,
            indices=(amount,),
            message=f"Coin Change DP complete! Minimum coins for {amount}¢ = {dp[amount]} using: {result_coins} ✓",
            state={"min_coins": dp[amount], "coins_used": result_coins},
        )
    else:
        yield Step(
            DONE,
            indices=(amount,),
            message=f"Coin Change DP: Impossible to make change for amount {amount}¢ with coins {denominations}",
            state={"min_coins": -1, "coins_used": []},
        )


register(
    AlgorithmInfo(
        name="coin_change_dp",
        display_name="Coin Change (Min Coins DP)",
        description=(
            "Finds the minimum number of coins needed to make a given target amount using "
            "1D DP tabulation in O(amount · n) time and reconstructs the coin subset."
        ),
        best="O(amount · n)",
        average="O(amount · n)",
        worst="O(amount · n)",
        space="O(amount)",
        stable=True,
        category=DP,
        fn=coin_change_dp,
    )
)
