"""Quick sort: divide and conquer using a pivot (Lomuto partition).

Implemented iteratively with an explicit stack so the whole algorithm is a
single generator (keeps automatic line-number tracking accurate).
"""

from .registry import AlgorithmInfo, COMPARE, MARK, SORTED, SWAP, Step, register


def quick_sort(arr):
    """Iterative quick sort with Lomuto partition (pivot = last element)."""
    n = len(arr)
    stack = [(0, n - 1)]
    while stack:
        lo, hi = stack.pop()
        if lo > hi:
            continue
        if lo == hi:
            yield Step(SORTED, (lo,), f"Singleton {arr[lo]} is already in place")
            continue

        pivot = arr[hi]
        yield Step(MARK, (hi,), f"Choose pivot {pivot} (last element)")
        i = lo
        for j in range(lo, hi):
            yield Step(COMPARE, (j, hi), f"Compare {arr[j]} with pivot {pivot}")
            if arr[j] < pivot:
                a, b = arr[i], arr[j]
                arr[i], arr[j] = arr[j], arr[i]
                yield Step(SWAP, (i, j), f"Swap {a} and {b}")
                i += 1

        a, b = arr[i], arr[hi]
        arr[i], arr[hi] = arr[hi], arr[i]
        yield Step(SWAP, (i, hi), f"Place pivot {b} at its final index {i}")
        yield Step(SORTED, (i,), f"Pivot {arr[i]} is in its final position")

        stack.append((lo, i - 1))
        stack.append((i + 1, hi))

    for i in range(n):
        yield Step(SORTED, (i,), f"{arr[i]} is in its final position")


register(
    AlgorithmInfo(
        name="quick_sort",
        display_name="Quick Sort",
        description=(
            "Divide and conquer: pick a pivot, partition the range so smaller "
            "elements sit left of the pivot and larger ones right, then recurse "
            "(here via an explicit stack) on both sides."
        ),
        best="O(n log n)",
        average="O(n log n)",
        worst="O(n²)",
        space="O(log n)",
        stable=False,
        fn=quick_sort,
    )
)
