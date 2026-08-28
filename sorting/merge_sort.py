"""Merge sort: divide and conquer -- repeatedly merge sorted runs.

Implemented iteratively (bottom-up) so the whole algorithm is a single
generator.  This keeps the automatic line-number tracking accurate: the
engine reads the *one* generator's frame, which is suspended at the exact
``yield`` that produced the current step.
"""

from .registry import AlgorithmInfo, COMPARE, MARK, SORTED, Step, register


def merge_sort(arr):
    """Iterative (bottom-up) merge sort using a working aux array."""
    n = len(arr)
    aux = [0] * n
    width = 1
    while width < n:
        for left in range(0, n, width * 2):
            mid = min(left + width, n)
            right = min(left + width * 2, n)

            # Merge arr[left:mid] and arr[mid:right] into aux.
            i, j, k = left, mid, left
            while i < mid and j < right:
                yield Step(COMPARE, (i, j), f"Compare {arr[i]} and {arr[j]}")
                if arr[i] <= arr[j]:
                    aux[k] = arr[i]
                    i += 1
                else:
                    aux[k] = arr[j]
                    j += 1
                k += 1
            while i < mid:
                aux[k] = arr[i]
                i += 1
                k += 1
            while j < right:
                aux[k] = arr[j]
                j += 1
                k += 1

            # Copy the merged run back into the visible array.
            for t in range(left, right):
                arr[t] = aux[t]
                yield Step(MARK, (t,), f"Copy {arr[t]} back into position {t}")
        width *= 2

    for i in range(n):
        yield Step(SORTED, (i,), f"{arr[i]} is in its final position")


register(
    AlgorithmInfo(
        name="merge_sort",
        display_name="Merge Sort",
        description=(
            "Divide and conquer: repeatedly merges sorted runs of the array. "
            "Bottom-up (iterative) version -- each pass doubles the run size, "
            "merging adjacent runs with a working aux array."
        ),
        best="O(n log n)",
        average="O(n log n)",
        worst="O(n log n)",
        space="O(n)",
        stable=True,
        fn=merge_sort,
    )
)
