"""Matching utilities: Default preference profiles, random preference generator,
and stability / blocking-pair verification for the Stable Marriage Problem.
"""

from __future__ import annotations

import random
from typing import Any


def get_default_preferences() -> dict[str, dict[str, list[str]]]:
    """Default 6-pair preference ranking profile (M1..M6 and W1..W6)."""
    return {
        "proposers": {
            "M1": ["W2", "W1", "W4", "W3", "W5", "W6"],
            "M2": ["W3", "W2", "W1", "W6", "W4", "W5"],
            "M3": ["W1", "W4", "W3", "W2", "W5", "W6"],
            "M4": ["W4", "W5", "W2", "W1", "W6", "W3"],
            "M5": ["W5", "W2", "W6", "W3", "W1", "W4"],
            "M6": ["W1", "W3", "W5", "W4", "W2", "W6"],
        },
        "reviewers": {
            "W1": ["M2", "M3", "M1", "M5", "M4", "M6"],
            "W2": ["M4", "M1", "M2", "M3", "M6", "M5"],
            "W3": ["M1", "M2", "M6", "M4", "M5", "M3"],
            "W4": ["M3", "M5", "M4", "M1", "M2", "M6"],
            "W5": ["M6", "M4", "M5", "M2", "M3", "M1"],
            "W6": ["M5", "M6", "M1", "M3", "M2", "M4"],
        },
    }


def generate_random_preferences(n: int = 6, seed: int | None = None) -> dict[str, dict[str, list[str]]]:
    """Generate randomized preference profiles for N proposers and N reviewers."""
    rng = random.Random(seed)
    n = max(4, min(8, n))
    proposers = [f"M{i+1}" for i in range(n)]
    reviewers = [f"W{i+1}" for i in range(n)]

    p_prefs = {}
    for p in proposers:
        shuffled = list(reviewers)
        rng.shuffle(shuffled)
        p_prefs[p] = shuffled

    r_prefs = {}
    for r in reviewers:
        shuffled = list(proposers)
        rng.shuffle(shuffled)
        r_prefs[r] = shuffled

    return {
        "proposers": p_prefs,
        "reviewers": r_prefs,
    }


def verify_stability(
    proposer_prefs: dict[str, list[str]],
    reviewer_prefs: dict[str, list[str]],
    matches: dict[str, str],  # reviewer -> proposer mapping
) -> list[tuple[str, str]]:
    """Check for blocking pairs (p, r) where p prefers r over p's assigned match,

    and r prefers p over r's assigned match. Returns empty list if matching is stable.
    """
    # Create inverse mapping: proposer -> reviewer
    p_to_r = {p: r for r, p in matches.items()}
    blocking_pairs = []

    for p, r_list in proposer_prefs.items():
        curr_r = p_to_r.get(p)
        if not curr_r:
            continue
        p_rank_curr = r_list.index(curr_r)

        # Look at all reviewers p prefers over curr_r
        for better_r in r_list[:p_rank_curr]:
            r_partner = matches.get(better_r)
            if not r_partner:
                blocking_pairs.append((p, better_r))
            else:
                r_ranking = reviewer_prefs[better_r]
                if r_ranking.index(p) < r_ranking.index(r_partner):
                    blocking_pairs.append((p, better_r))

    return blocking_pairs
