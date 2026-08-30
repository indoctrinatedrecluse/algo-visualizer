"""4-Sum Problem: K-Sum reduction and two-pointer sweep finding all unique quadruplets summing to target."""

from __future__ import annotations

from registry import (
    AlgorithmInfo,
    COMPARE,
    DONE,
    DP,
    MATCH_FIND,
    Step,
    register,
)
from .dp_utils import get_default_4sum_array


def four_sum(array: list[int] | None = None, target: int = 0):
    """4-Sum generator: sorts array and uses nested loops with dual-pointer sweep to find unique quadruplets."""
    if array is None:
        array = get_default_4sum_array()

    arr = sorted([int(x) for x in array])
    n = len(arr)
    quadruplets = []
    target = int(target)

    yield Step(
        COMPARE,
        indices=tuple(range(n)),
        message=f"Initialize 4-Sum: Sorted array of {n} elements, looking for quadruplets summing to {target}",
    )

    for i in range(n - 3):
        if i > 0 and arr[i] == arr[i - 1]:
            continue

        for j in range(i + 1, n - 2):
            if j > i + 1 and arr[j] == arr[j - 1]:
                continue

            left = j + 1
            right = n - 1

            while left < right:
                total = arr[i] + arr[j] + arr[left] + arr[right]

                yield Step(
                    COMPARE,
                    indices=(i, j, left, right),
                    message=f"Evaluate indices ({i}, {j}, {left}, {right}): {arr[i]} + {arr[j]} + {arr[left]} + {arr[right]} = {total} (Target = {target})",
                    quadruplets=list(quadruplets),
                )

                if total == target:
                    quad = (arr[i], arr[j], arr[left], arr[right])
                    quadruplets.append(quad)

                    yield Step(
                        MATCH_FIND,
                        indices=(i, j, left, right),
                        message=f"Found quadruplet! ({arr[i]}, {arr[j]}, {arr[left]}, {arr[right]}) sum to {target} ✓ (Total found: {len(quadruplets)})",
                        quadruplets=list(quadruplets),
                    )

                    left += 1
                    right -= 1
                    while left < right and arr[left] == arr[left - 1]:
                        left += 1
                    while left < right and arr[right] == arr[right + 1]:
                        right -= 1
                elif total < target:
                    left += 1
                else:
                    right -= 1

    quads_str = ", ".join([str(q) for q in quadruplets])
    yield Step(
        DONE,
        message=f"4-Sum complete! Found {len(quadruplets)} unique quadruplets summing to {target}: [{quads_str}] ✓",
        quadruplets=list(quadruplets),
        state={"quadruplets": quadruplets, "count": len(quadruplets)},
    )


register(
    AlgorithmInfo(
        name="four_sum",
        display_name="4-Sum (K-Sum / DP Reduction)",
        description=(
            "Finds all unique quadruplets in an array that sum to a target in O(n³) time "
            "by sorting and sweeping pairs of pointers."
        ),
        best="O(n log n)",
        average="O(n³)",
        worst="O(n³)",
        space="O(1)",
        stable=True,
        category=DP,
        fn=four_sum,
    )
)
