"""Insertion sort: build the sorted list one element at a time."""

from .registry import AlgorithmInfo, COMPARE, MARK, SORTED, SWAP, Step, register


def insertion_sort(arr):
    """Insertion sort. Yields a :class:`Step` for every compare/shift/insert."""
    n = len(arr)
    for i in range(1, n):
        key = arr[i]
        yield Step(MARK, (i,), f"Pick up key {key}")
        j = i - 1
        while j >= 0 and arr[j] > key:
            yield Step(COMPARE, (j, i), f"Compare {arr[j]} with key {key}")
            arr[j + 1] = arr[j]
            yield Step(SWAP, (j, j + 1), f"Shift {arr[j]} right")
            j -= 1
        arr[j + 1] = key
        yield Step(MARK, (j + 1,), f"Insert key {key}")
    for i in range(n):
        yield Step(SORTED, (i,), f"{arr[i]} is in its final position")


register(
    AlgorithmInfo(
        name="insertion_sort",
        display_name="Insertion Sort",
        description=(
            "Builds the final sorted list one element at a time: each element is "
            "picked up and inserted into its correct place within the already-"
            "sorted prefix, shifting larger elements to the right."
        ),
        best="O(n)",
        average="O(n²)",
        worst="O(n²)",
        space="O(1)",
        stable=True,
        fn=insertion_sort,
    )
)
