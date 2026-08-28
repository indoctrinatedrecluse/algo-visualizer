"""Selection sort: repeatedly move the smallest remaining element in place."""

from .registry import AlgorithmInfo, COMPARE, MARK, SORTED, SWAP, Step, register


def selection_sort(arr):
    """Selection sort. Yields a :class:`Step` for every scan/swap."""
    n = len(arr)
    for i in range(n):
        min_idx = i
        yield Step(MARK, (i,), f"Assume the minimum is {arr[i]} at index {i}")
        for j in range(i + 1, n):
            yield Step(COMPARE, (min_idx, j), f"Compare {arr[min_idx]} and {arr[j]}")
            if arr[j] < arr[min_idx]:
                min_idx = j
                yield Step(MARK, (j,), f"New minimum: {arr[j]} at index {j}")
        if min_idx != i:
            a, b = arr[i], arr[min_idx]
            arr[i], arr[min_idx] = arr[min_idx], arr[i]
            yield Step(SWAP, (i, min_idx), f"Swap {a} and {b}")
        yield Step(SORTED, (i,), f"{arr[i]} is now in its final position")


register(
    AlgorithmInfo(
        name="selection_sort",
        display_name="Selection Sort",
        description=(
            "Scans the unsorted region for the smallest element and swaps it into "
            "the next position. Each pass places exactly one element in its final "
            "position."
        ),
        best="O(n²)",
        average="O(n²)",
        worst="O(n²)",
        space="O(1)",
        stable=False,
        fn=selection_sort,
    )
)
