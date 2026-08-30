"""3-Sum Problem: Sorted array two-pointer / hash dynamic reduction finding all unique triplets summing to 0."""

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
from .dp_utils import get_default_3sum_array


def three_sum(array: list[int] | None = None, target: int = 0):
    """3-Sum generator: sorts array and uses dual-pointer sweep to find unique triplets."""
    if array is None:
        array = get_default_3sum_array()

    arr = sorted([int(x) for x in array])
    n = len(arr)
    triplets = []
    target = int(target)

    yield Step(
        COMPARE,
        indices=tuple(range(n)),
        message=f"Initialize 3-Sum: Sorted array of {n} elements, looking for triplets summing to {target}",
    )

    for i in range(n - 2):
        if i > 0 and arr[i] == arr[i - 1]:
            continue  # Skip duplicate first element

        left = i + 1
        right = n - 1

        while left < right:
            total = arr[i] + arr[left] + arr[right]

            yield Step(
                COMPARE,
                indices=(i, left, right),
                message=f"Evaluate indices ({i}, {left}, {right}): {arr[i]} + {arr[left]} + {arr[right]} = {total} (Target = {target})",
                triplets=list(triplets),
            )

            if total == target:
                triplet = (arr[i], arr[left], arr[right])
                triplets.append(triplet)

                yield Step(
                    MATCH_FIND,
                    indices=(i, left, right),
                    message=f"Found triplet! ({arr[i]}, {arr[left]}, {arr[right]}) sum to {target} ✓ (Total found: {len(triplets)})",
                    triplets=list(triplets),
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

    triplets_str = ", ".join([str(t) for t in triplets])
    yield Step(
        DONE,
        message=f"3-Sum complete! Found {len(triplets)} unique triplets summing to {target}: [{triplets_str}] ✓",
        triplets=list(triplets),
        state={"triplets": triplets, "count": len(triplets)},
    )


register(
    AlgorithmInfo(
        name="three_sum",
        display_name="3-Sum (Two-Pointer / DP Search)",
        description=(
            "Finds all unique triplets in an array that sum to a target (default 0) in O(n²) time "
            "by sorting and sweeping two moving pointers."
        ),
        best="O(n log n)",
        average="O(n²)",
        worst="O(n²)",
        space="O(1)",
        stable=True,
        category=DP,
        fn=three_sum,
    )
)
