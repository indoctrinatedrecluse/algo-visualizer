"""Gale-Shapley Stable Marriage / Stable Matching Algorithm (Proposer-Optimal).

Guarantees a stable matching between two equally sized sets in O(n²) proposals,
where no two participants would mutually prefer to leave their assigned partners.
"""

from __future__ import annotations

from collections import deque
from typing import Any

from registry import (
    ACCEPT,
    AlgorithmInfo,
    BREAK,
    DONE,
    MATCHING,
    PROPOSE,
    REJECT,
    Step,
    register,
)
from .matching_utils import (
    get_default_preferences,
    verify_stability,
)


def gale_shapley(matching_data: dict[str, Any] | None = None):
    """Gale-Shapley generator yielding Step frames for proposals, engagements, rejections, and break-ups."""
    if matching_data is None or "proposers" not in matching_data:
        matching_data = get_default_preferences()

    proposer_prefs = matching_data["proposers"]
    reviewer_prefs = matching_data["reviewers"]

    proposers = sorted(proposer_prefs.keys())
    reviewers = sorted(reviewer_prefs.keys())

    free_proposers = deque(proposers)
    proposals_made: dict[str, int] = {p: 0 for p in proposers}
    matches: dict[str, str] = {}  # reviewer -> proposer
    rejected: dict[str, list[str]] = {p: [] for p in proposers}
    pair_status: dict[str, str] = {}

    def serialize_status() -> dict[str, str]:
        st = dict(pair_status)
        for r, p in matches.items():
            st[f"{p}-{r}"] = "engaged"
        return st

    yield Step(
        PROPOSE,
        message=f"Initialize Gale-Shapley: {len(proposers)} proposers ({', '.join(proposers)}) and {len(reviewers)} reviewers ({', '.join(reviewers)})",
        matches=dict(matches),
        rejected={k: list(v) for k, v in rejected.items()},
        preferences=matching_data,
        pair_status=serialize_status(),
    )

    step_count = 0
    while free_proposers:
        p = free_proposers.popleft()
        if proposals_made[p] >= len(proposer_prefs[p]):
            continue

        r = proposer_prefs[p][proposals_made[p]]
        proposals_made[p] += 1
        step_count += 1

        pair_status[f"{p}-{r}"] = "proposing"

        yield Step(
            PROPOSE,
            message=f"Step {step_count}: Proposer {p} proposes to {r} (Rank #{proposals_made[p]} choice)",
            proposer=p,
            reviewer=r,
            matches=dict(matches),
            rejected={k: list(v) for k, v in rejected.items()},
            preferences=matching_data,
            pair_status=serialize_status(),
        )

        if r not in matches:
            # Reviewer is free -> Tentatively accepts
            matches[r] = p
            pair_status[f"{p}-{r}"] = "engaged"

            yield Step(
                ACCEPT,
                message=f"Reviewer {r} is currently free → tentatively accepts {p}'s proposal ✓",
                proposer=p,
                reviewer=r,
                matches=dict(matches),
                rejected={k: list(v) for k, v in rejected.items()},
                preferences=matching_data,
                pair_status=serialize_status(),
            )
        else:
            # Reviewer is already engaged -> Compare current match p' with new proposer p
            p_prime = matches[r]
            r_ranking = reviewer_prefs[r]
            p_rank = r_ranking.index(p)
            p_prime_rank = r_ranking.index(p_prime)

            if p_rank < p_prime_rank:
                # Reviewer prefers p over current match p'
                pair_status[f"{p_prime}-{r}"] = "broken"
                rejected[p_prime].append(r)
                free_proposers.append(p_prime)

                yield Step(
                    BREAK,
                    message=f"Reviewer {r} prefers new proposer {p} (Rank #{p_rank+1}) over current match {p_prime} (Rank #{p_prime_rank+1}) → breaks engagement with {p_prime}",
                    proposer=p_prime,
                    reviewer=r,
                    matches=dict(matches),
                    rejected={k: list(v) for k, v in rejected.items()},
                    preferences=matching_data,
                    pair_status=serialize_status(),
                )

                matches[r] = p
                pair_status[f"{p}-{r}"] = "engaged"

                yield Step(
                    ACCEPT,
                    message=f"Reviewer {r} is now tentatively engaged to {p} ✓",
                    proposer=p,
                    reviewer=r,
                    matches=dict(matches),
                    rejected={k: list(v) for k, v in rejected.items()},
                    preferences=matching_data,
                    pair_status=serialize_status(),
                )
            else:
                # Reviewer prefers current match p' -> Rejects p
                rejected[p].append(r)
                free_proposers.append(p)
                pair_status[f"{p}-{r}"] = "rejected"

                yield Step(
                    REJECT,
                    message=f"Reviewer {r} rejects {p}: already engaged to preferred match {p_prime} (Rank #{p_prime_rank+1} vs #{p_rank+1})",
                    proposer=p,
                    reviewer=r,
                    matches=dict(matches),
                    rejected={k: list(v) for k, v in rejected.items()},
                    preferences=matching_data,
                    pair_status=serialize_status(),
                )

    # Verify stability
    blocking = verify_stability(proposer_prefs, reviewer_prefs, matches)
    match_pairs = [f"{p} ~ {r}" for r, p in sorted(matches.items())]

    yield Step(
        DONE,
        message=f"Gale-Shapley complete! Final Stable Matching: [{', '.join(match_pairs)}] · Blocking pairs: {len(blocking)} ✓",
        matches=dict(matches),
        rejected={k: list(v) for k, v in rejected.items()},
        preferences=matching_data,
        pair_status=serialize_status(),
        state={"blocking_pairs": len(blocking)},
    )


register(
    AlgorithmInfo(
        name="gale_shapley",
        display_name="Gale-Shapley (Stable Matching)",
        description=(
            "Finds a stable matching between two equally sized sets with preference "
            "orderings in O(n²) proposals. The resulting matching is proposer-optimal "
            "and guaranteed to have zero blocking pairs."
        ),
        best="O(n)",
        average="O(n log n)",
        worst="O(n²)",
        space="O(n²)",
        stable=True,
        category=MATCHING,
        fn=gale_shapley,
    )
)
