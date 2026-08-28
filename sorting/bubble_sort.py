"""Bubble sort: repeatedly swap adjacent elements that are out of order."""

from .registry import AlgorithmInfo, COMPARE, MARK, SORTED, SWAP, Step, register


def bubble_sort(arr):
    """Bubble sort. Yields a :class:`Step` for every comparison/swap."""
    n = len(arr)
    for i in range(n):
        swapped = False
        for j in range(n - i - 1):
            yield Step(COMPARE, (j, j + 1), f"Compare {arr[j]} and {arr[j + 1]}")
            if arr[j] > arr[j + 1]:
                a, b = arr[j], arr[j + 1]
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
                yield Step(SWAP, (j, j + 1), f"Swap {a} and {b}")
        if not swapped:
            yield Step(MARK, (), "No swaps this pass — array is already sorted!")
            break
    for i in range(n):
        yield Step(SORTED, (i,), f"{arr[i]} is in its final position")


register(
    AlgorithmInfo(
        name="bubble_sort",
        display_name="Bubble Sort",
        description=(
            "Repeatedly steps through the list, compares adjacent elements, and "
            "swaps them whenever they are in the wrong order. The pass repeats "
            "until a full pass needs no swaps (early exit)."
        ),
        best="O(n)",
        average="O(n²)",
        worst="O(n²)",
        space="O(1)",
        stable=True,
        fn=bubble_sort,
    )
)
