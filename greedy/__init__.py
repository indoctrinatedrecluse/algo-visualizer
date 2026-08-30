"""Greedy package initialization: registers Fractional Knapsack, Activity Selection,
Job Sequencing, Huffman Coding, and Greedy Coin Change.
"""

from .activity_selection import activity_selection
from .coin_change_greedy import coin_change_greedy
from .fractional_knapsack import fractional_knapsack
from .greedy_utils import (
    generate_random_activities,
    generate_random_knapsack_items,
    get_default_activities,
    get_default_coin_change,
    get_default_huffman_frequencies,
    get_default_jobs,
    get_default_knapsack_items,
)
from .huffman_coding import huffman_coding
from .job_sequencing import job_sequencing

__all__ = [
    "activity_selection",
    "coin_change_greedy",
    "fractional_knapsack",
    "generate_random_activities",
    "generate_random_knapsack_items",
    "get_default_activities",
    "get_default_coin_change",
    "get_default_huffman_frequencies",
    "get_default_jobs",
    "get_default_knapsack_items",
    "huffman_coding",
    "job_sequencing",
]
