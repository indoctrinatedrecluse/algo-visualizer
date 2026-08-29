"""Linear search: scan the array left to right for the target."""

from registry import (
    AlgorithmInfo,
    COMPARE,
    FOUND,
    NOT_FOUND,
    SEARCHING,
    Step,
    register,
)


def linear_search(arr, target):
    """Linear search. Yields a :class:`Step` for every probe."""
    n = len(arr)
    for i in range(n):
        yield Step(COMPARE, (i,), f"Check index {i}: is {arr[i]} == {target}?")
        if arr[i] == target:
            yield Step(FOUND, (i,), f"Found {target} at index {i} ✓")
            return
    yield Step(NOT_FOUND, (), f"{target} is not in the array")


register(
    AlgorithmInfo(
        name="linear_search",
        display_name="Linear Search",
        description=(
            "Scans the array from left to right, comparing each element with "
            "the target until it is found (or the array ends). Works on "
            "unsorted data."
        ),
        best="O(1)",
        average="O(n)",
        worst="O(n)",
        space="O(1)",
        stable=True,
        category=SEARCHING,
        fn=linear_search,
    )
)
