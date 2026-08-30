"""Greedy Coin Change: Pick largest denomination coin that fits the remaining amount."""

from __future__ import annotations

from registry import (
    AlgorithmInfo,
    COIN_PICK,
    COMPARE,
    DONE,
    GREEDY,
    Step,
    register,
)
from .greedy_utils import get_default_coin_change


def coin_change_greedy(coins: list[int] | None = None, target: int = 67):
    """Greedy Coin Change generator over array of coin denominations."""
    if coins is None:
        coins, target = get_default_coin_change()

    denominations = sorted([int(c) for c in coins], reverse=True)
    target = int(target)
    remaining = target
    picked_coins = []

    yield Step(
        COMPARE,
        indices=tuple(range(len(denominations))),
        message=f"Initialize Greedy Coin Change for target amount {target} with denominations {denominations}",
        state={"remaining": remaining, "picked": list(picked_coins)},
    )

    for idx, coin in enumerate(denominations):
        while remaining >= coin:
            count = remaining // coin
            for _ in range(count):
                picked_coins.append(coin)
            remaining -= count * coin

            yield Step(
                COIN_PICK,
                indices=(idx,),
                message=f"Picked {count} × {coin}¢ coin(s) → Remaining balance: {remaining}¢ (Total coins so far: {len(picked_coins)})",
                state={"remaining": remaining, "picked": list(picked_coins)},
            )

    if remaining == 0:
        yield Step(
            DONE,
            message=f"Greedy Coin Change complete! Reached target {target}¢ using {len(picked_coins)} coins: {picked_coins} ✓",
            state={"remaining": 0, "picked": list(picked_coins)},
        )
    else:
        yield Step(
            DONE,
            message=f"Greedy Coin Change unable to make exact change (Remaining: {remaining}¢)",
            state={"remaining": remaining, "picked": list(picked_coins)},
        )


register(
    AlgorithmInfo(
        name="coin_change_greedy",
        display_name="Coin Change (Greedy)",
        description=(
            "Greedily chooses the largest coin denomination that fits within the remaining amount. "
            "Optimal for canonical coin systems (e.g. US coins [25, 10, 5, 1])."
        ),
        best="O(1)",
        average="O(k)",
        worst="O(k)",
        space="O(1)",
        stable=True,
        category=GREEDY,
        fn=coin_change_greedy,
    )
)
