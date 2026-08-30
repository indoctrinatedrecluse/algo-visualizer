"""Activity Selection / Interval Scheduling: Greedy choice by earliest finish time."""

from __future__ import annotations

from typing import Any

from registry import (
    AlgorithmInfo,
    COMPARE,
    DONE,
    GREEDY,
    INTERVAL_REJECT,
    INTERVAL_SELECT,
    Step,
    register,
)
from .greedy_utils import get_default_activities


def activity_selection(activities_data: list[dict[str, Any]] | None = None):
    """Activity Selection generator: sorts by finish time and greedily selects non-overlapping intervals."""
    if activities_data is None:
        activities_data = get_default_activities()

    acts = [
        {"id": a["id"], "start": int(a["start"]), "end": int(a["end"]), "status": "pending"}
        for a in activities_data
    ]

    yield Step(
        COMPARE,
        message=f"Initialize Activity Selection with {len(acts)} intervals. Sort by earliest finish time.",
        intervals=[dict(a) for a in acts],
    )

    # Sort intervals by finish time (end)
    acts.sort(key=lambda a: (a["end"], a["start"]))

    sorted_summary = ", ".join([f"{a['id']} [{a['start']}-{a['end']}]" for a in acts])
    yield Step(
        COMPARE,
        message=f"Intervals sorted by finish time: {sorted_summary}",
        intervals=[dict(a) for a in acts],
    )

    selected_count = 0
    last_end = -1

    for a in acts:
        if a["start"] >= last_end:
            # Non-overlapping: greedily select
            a["status"] = "selected"
            last_end = a["end"]
            selected_count += 1

            yield Step(
                INTERVAL_SELECT,
                message=f"Select interval {a['id']} [{a['start']}-{a['end']}]: start {a['start']} >= previous finish {last_end if selected_count > 1 else 'None'}",
                intervals=[dict(x) for x in acts],
                state={"selected_count": selected_count, "last_end": last_end},
            )
        else:
            # Overlapping: reject
            a["status"] = "rejected"

            yield Step(
                INTERVAL_REJECT,
                message=f"Reject interval {a['id']} [{a['start']}-{a['end']}]: start {a['start']} < current finish threshold {last_end} (overlap clash!)",
                intervals=[dict(x) for x in acts],
                state={"selected_count": selected_count, "last_end": last_end},
            )

    selected_names = [a["id"] for a in acts if a["status"] == "selected"]
    yield Step(
        DONE,
        message=f"Activity Selection complete! Maximum non-overlapping set: {len(selected_names)} intervals ({', '.join(selected_names)}) ✓",
        intervals=[dict(x) for x in acts],
        state={"selected_count": selected_count, "selected": selected_names},
    )


register(
    AlgorithmInfo(
        name="activity_selection",
        display_name="Activity Selection / Interval Scheduling",
        description=(
            "Selects the maximum number of mutually compatible intervals by sorting "
            "by finish time and greedily picking the earliest-finishing valid activity."
        ),
        best="O(n log n)",
        average="O(n log n)",
        worst="O(n log n)",
        space="O(n)",
        stable=True,
        category=GREEDY,
        fn=activity_selection,
    )
)
