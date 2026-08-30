"""Job Sequencing with Deadlines: Greedy choice by highest profit and latest available time slot."""

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
from .greedy_utils import get_default_jobs


def job_sequencing(jobs_data: list[dict[str, Any]] | None = None):
    """Job Sequencing generator: sorts jobs by profit descending, assigns to latest free slot <= deadline."""
    if jobs_data is None:
        jobs_data = get_default_jobs()

    jobs = [
        {"id": j["id"], "deadline": int(j["deadline"]), "profit": int(j["profit"]), "status": "pending"}
        for j in jobs_data
    ]

    max_deadline = max(j["deadline"] for j in jobs)
    time_slots = [-1] * max_deadline  # slot i (0-based) represents time [i, i+1]
    assigned_jobs = {}

    yield Step(
        COMPARE,
        message=f"Initialize Job Sequencing with {len(jobs)} jobs (Max Deadline = {max_deadline}). Sort descending by profit.",
        intervals=[{"id": j["id"], "start": 0, "end": j["deadline"], "profit": j["profit"], "status": "pending"} for j in jobs],
    )

    # Sort descending by profit
    jobs.sort(key=lambda j: j["profit"], reverse=True)

    sorted_desc = ", ".join([f"{j['id']} (Profit {j['profit']}, D:{j['deadline']})" for j in jobs])
    yield Step(
        COMPARE,
        message=f"Sorted by profit: {sorted_desc}",
        intervals=[{"id": j["id"], "start": 0, "end": j["deadline"], "profit": j["profit"], "status": "pending"} for j in jobs],
    )

    total_profit = 0
    job_intervals = []

    for j in jobs:
        # Find latest available slot <= deadline (deadline is 1-based, so slots are 0..deadline-1)
        slot_found = -1
        for slot in range(min(max_deadline, j["deadline"]) - 1, -1, -1):
            if time_slots[slot] == -1:
                slot_found = slot
                break

        if slot_found != -1:
            time_slots[slot_found] = j["id"]
            assigned_jobs[j["id"]] = slot_found
            j["status"] = "selected"
            total_profit += j["profit"]
            job_intervals.append({"id": f"{j['id']} (+$ {j['profit']})", "start": slot_found, "end": slot_found + 1, "status": "selected"})

            yield Step(
                INTERVAL_SELECT,
                message=f"Assign job {j['id']} (Profit ${j['profit']}) to time slot [{slot_found}-{slot_found+1}] before deadline {j['deadline']} → Total Profit: ${total_profit}",
                intervals=list(job_intervals),
                state={"total_profit": total_profit, "slots": list(time_slots)},
            )
        else:
            j["status"] = "rejected"
            yield Step(
                INTERVAL_REJECT,
                message=f"Reject job {j['id']}: all time slots <= deadline {j['deadline']} are already filled.",
                intervals=list(job_intervals),
                state={"total_profit": total_profit, "slots": list(time_slots)},
            )

    yield Step(
        DONE,
        message=f"Job Sequencing complete! Maximum Profit = ${total_profit} from {len(job_intervals)} scheduled jobs ✓",
        intervals=list(job_intervals),
        state={"total_profit": total_profit, "scheduled": list(assigned_jobs.keys())},
    )


register(
    AlgorithmInfo(
        name="job_sequencing",
        display_name="Job Sequencing with Deadlines (Greedy)",
        description=(
            "Maximizes total profit by ordering jobs by profit and scheduling each job "
            "into the latest possible available time slot before its deadline."
        ),
        best="O(n log n)",
        average="O(n²)",
        worst="O(n²)",
        space="O(n)",
        stable=True,
        category=GREEDY,
        fn=job_sequencing,
    )
)
