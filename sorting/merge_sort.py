"""Merge sort: divide and conquer -- split into halves and merge sorted runs.

Implemented with an explicit call stack so the whole algorithm remains a single
generator. This keeps the automatic line-number tracking accurate: the engine
reads the generator's frame, which is suspended at the exact ``yield`` that
produced the current step.

The RANGE, PARTITION, and MERGED steps drive the recursion-tree visualization.
"""

from .registry import (
    AlgorithmInfo,
    COMPARE,
    MARK,
    MERGED,
    PARTITION,
    RANGE,
    SORTED,
    Step,
    register,
)


def merge_sort(arr):
    """Top-down divide-and-conquer merge sort with an explicit stack."""
    n = len(arr)
    if n <= 1:
        if n == 1:
            yield Step(SORTED, (0,), f"{arr[0]} is in its final position")
        return

    aux = [0] * n
    # Stack entries: ('SPLIT', lo, hi) or ('MERGE', lo, mid, hi)
    stack = [("SPLIT", 0, n - 1)]

    while stack:
        action = stack.pop()

        if action[0] == "SPLIT":
            _, lo, hi = action
            if lo >= hi:
                if lo == hi:
                    yield Step(
                        RANGE,
                        (lo,),
                        f"Subarray [{lo}..{hi}] has 1 element — already sorted",
                        range=(lo, hi),
                    )
                continue

            mid = (lo + hi) // 2
            yield Step(
                RANGE,
                (),
                f"Divide [{lo}..{hi}] into [{lo}..{mid}] and [{mid + 1}..{hi}]",
                range=(lo, hi),
            )
            yield Step(
                PARTITION,
                (),
                f"Split [{lo}..{hi}] at mid {mid}",
                range=(lo, hi),
                children=((lo, mid), (mid + 1, hi)),
            )

            # Post-order: push MERGE first, then right SPLIT, then left SPLIT
            stack.append(("MERGE", lo, mid, hi))
            stack.append(("SPLIT", mid + 1, hi))
            stack.append(("SPLIT", lo, mid))

        elif action[0] == "MERGE":
            _, lo, mid, hi = action
            yield Step(
                RANGE,
                (),
                f"Merge sorted subarrays [{lo}..{mid}] and [{mid + 1}..{hi}]",
                range=(lo, hi),
            )

            # Merge arr[lo..mid] and arr[mid+1..hi] into aux[lo..hi]
            i, j, k = lo, mid + 1, lo
            while i <= mid and j <= hi:
                yield Step(
                    COMPARE,
                    (i, j),
                    f"Compare {arr[i]} and {arr[j]}",
                    range=(lo, hi),
                )
                if arr[i] <= arr[j]:
                    aux[k] = arr[i]
                    i += 1
                else:
                    aux[k] = arr[j]
                    j += 1
                k += 1

            while i <= mid:
                aux[k] = arr[i]
                i += 1
                k += 1

            while j <= hi:
                aux[k] = arr[j]
                j += 1
                k += 1

            # Copy merged run back into arr[lo..hi]
            for t in range(lo, hi + 1):
                arr[t] = aux[t]
                yield Step(
                    MARK,
                    (t,),
                    f"Copy {arr[t]} back into position {t}",
                    range=(lo, hi),
                )

            yield Step(
                MERGED,
                (),
                f"Merged subarray [{lo}..{hi}]",
                range=(lo, hi),
            )

    for i in range(n):
        yield Step(SORTED, (i,), f"{arr[i]} is in its final position")


register(
    AlgorithmInfo(
        name="merge_sort",
        display_name="Merge Sort",
        description=(
            "Divide and conquer: recursively splits the array into halves, "
            "sorts each half, and merges the sorted subarrays back together. "
            "A dedicated recursion-tree view visualizes the divide and merge steps."
        ),
        best="O(n log n)",
        average="O(n log n)",
        worst="O(n log n)",
        space="O(n)",
        stable=True,
        fn=merge_sort,
    )
)
