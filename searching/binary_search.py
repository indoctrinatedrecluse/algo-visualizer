"""Binary search: repeatedly halve the search range to find the target.

Requires a SORTED array.  The client sorts the array before requesting this
algorithm (``needs_sorted_input``), or the user supplies one.
"""

from registry import (
    AlgorithmInfo,
    COMPARE,
    FOUND,
    MARK,
    NOT_FOUND,
    RANGE,
    SEARCHING,
    Step,
    register,
)


def binary_search(arr, target):
    """Binary search on a SORTED array. Yields a Step for each probe."""
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        yield Step(RANGE, (mid,), f"Search range [{lo}..{hi}], mid index {mid}",
                   range=(lo, hi))
        yield Step(COMPARE, (mid,), f"Compare {arr[mid]} with target {target}",
                   range=(lo, hi))
        if arr[mid] == target:
            yield Step(FOUND, (mid,), f"Target {target} found at index {mid} ✓",
                       range=(lo, hi))
            return
        if arr[mid] < target:
            lo = mid + 1
            yield Step(MARK, (),
                       f"{arr[mid]} < {target} → search the right half [{lo}..{hi}]",
                       range=(lo, hi))
        else:
            hi = mid - 1
            yield Step(MARK, (),
                       f"{arr[mid]} > {target} → search the left half [{lo}..{hi}]",
                       range=(lo, hi))
    yield Step(NOT_FOUND, (), f"Target {target} is not in the array")


register(
    AlgorithmInfo(
        name="binary_search",
        display_name="Binary Search",
        description=(
            "On a sorted array, repeatedly compare the target with the middle "
            "element and discard the half that cannot contain it. Each probe "
            "halves the search range, giving O(log n)."
        ),
        best="O(1)",
        average="O(log n)",
        worst="O(log n)",
        space="O(1)",
        stable=True,
        category=SEARCHING,
        needs_sorted_input=True,
        fn=binary_search,
    )
)
