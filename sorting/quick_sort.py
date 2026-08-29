"""Quick sort: divide and conquer using a pivot (optimized version).

Optimizations (vs. the plain Lomuto quick sort):
  * median-of-three pivot selection -- avoids the worst case on sorted input;
  * insertion sort for small ranges (INSERTION_CUTOFF) -- reduces recursion
    overhead on tiny subarrays;
  * explicit stack instead of recursion -- keeps the whole algorithm a single
    generator, so automatic line-number tracking stays exact.

The extra step types (RANGE / PIVOT / PARTITION) drive the dedicated
recursion-tree visualization: they report the subarray being processed, the
pivot position, and the two child ranges produced by each partition.
"""

from .registry import (
    AlgorithmInfo,
    COMPARE,
    MARK,
    PARTITION,
    PIVOT,
    RANGE,
    SORTED,
    SWAP,
    Step,
    register,
)

INSERTION_CUTOFF = 10


def _insertion_sort(arr, lo, hi):
    """Insertion sort on arr[lo..hi], yielding compare/swap/mark events."""
    for i in range(lo + 1, hi + 1):
        key = arr[i]
        yield Step(MARK, (i,), f"Insertion sort: pick up key {key}", range=(lo, hi))
        j = i - 1
        while j >= lo and arr[j] > key:
            yield Step(COMPARE, (j, i), f"Insertion sort: compare {arr[j]} with key {key}",
                       range=(lo, hi))
            arr[j + 1] = arr[j]
            yield Step(SWAP, (j, j + 1), f"Insertion sort: shift {arr[j]} right",
                       range=(lo, hi))
            j -= 1
        arr[j + 1] = key
        yield Step(MARK, (j + 1,), f"Insertion sort: insert key {key}", range=(lo, hi))


def quick_sort(arr):
    """Optimized quick sort: median-of-three + Lomuto + insertion cutoff."""
    n = len(arr)
    stack = [(0, n - 1)]
    while stack:
        lo, hi = stack.pop()

        if lo > hi:
            continue
        if lo == hi:
            yield Step(SORTED, (lo,), f"Singleton {arr[lo]} is in its final position")
            continue

        if hi - lo + 1 <= INSERTION_CUTOFF:
            yield Step(RANGE, (), f"Range [{lo}..{hi}] is small → insertion sort",
                       range=(lo, hi))
            yield from _insertion_sort(arr, lo, hi)
            for k in range(lo, hi + 1):
                yield Step(SORTED, (k,), f"{arr[k]} is in its final position")
            continue

        # ---- median-of-three: sort arr[lo], arr[mid], arr[hi] ----
        mid = (lo + hi) // 2
        yield Step(RANGE, (), f"Partition range [{lo}..{hi}]", range=(lo, hi))
        if arr[mid] < arr[lo]:
            a, b = arr[lo], arr[mid]
            arr[lo], arr[mid] = arr[mid], arr[lo]
            yield Step(SWAP, (lo, mid), f"Median-of-three: swap {a} and {b}", range=(lo, hi))
        if arr[hi] < arr[lo]:
            a, b = arr[lo], arr[hi]
            arr[lo], arr[hi] = arr[hi], arr[lo]
            yield Step(SWAP, (lo, hi), f"Median-of-three: swap {a} and {b}", range=(lo, hi))
        if arr[hi] < arr[mid]:
            a, b = arr[mid], arr[hi]
            arr[mid], arr[hi] = arr[hi], arr[mid]
            yield Step(SWAP, (mid, hi), f"Median-of-three: swap {a} and {b}", range=(lo, hi))

        # pivot = the median, now at mid; park it at the end for Lomuto.
        a, b = arr[mid], arr[hi]
        arr[mid], arr[hi] = arr[hi], arr[mid]
        yield Step(SWAP, (mid, hi), f"Move pivot {b} to the end", range=(lo, hi))
        pivot = arr[hi]
        yield Step(PIVOT, (hi,), f"Pivot = {pivot} (median-of-three)", range=(lo, hi))

        # ---- Lomuto partition of arr[lo..hi-1] around pivot ----
        i = lo
        for j in range(lo, hi):
            yield Step(COMPARE, (j, hi), f"Compare {arr[j]} with pivot {pivot}",
                       range=(lo, hi))
            if arr[j] < pivot:
                a, b = arr[i], arr[j]
                arr[i], arr[j] = arr[j], arr[i]
                yield Step(SWAP, (i, j), f"Swap {a} and {b}", range=(lo, hi))
                i += 1

        a, b = arr[i], arr[hi]
        arr[i], arr[hi] = arr[hi], arr[i]
        yield Step(PIVOT, (i,), f"Place pivot {b} at index {i}", range=(lo, hi))
        yield Step(SORTED, (i,), f"Pivot {arr[i]} is in its final position")
        yield Step(
            PARTITION,
            (i,),
            f"Range [{lo}..{hi}] splits into [{lo}..{i - 1}] and [{i + 1}..{hi}]",
            range=(lo, hi),
            children=((lo, i - 1), (i + 1, hi)),
        )

        stack.append((i + 1, hi))
        stack.append((lo, i - 1))


register(
    AlgorithmInfo(
        name="quick_sort",
        display_name="Quick Sort",
        description=(
            "Divide and conquer: pick a pivot (median of lo/mid/hi), partition "
            "the range so smaller elements sit left of the pivot and larger "
            "ones right, then recurse on both sides. Optimized with "
            "median-of-three pivot selection and insertion sort for small "
            "ranges."
        ),
        best="O(n log n)",
        average="O(n log n)",
        worst="O(n²)",
        space="O(log n)",
        stable=False,
        fn=quick_sort,
    )
)

