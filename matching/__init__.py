"""Matching package initialization: exports Gale-Shapley Stable Matching algorithm and utils."""

from .gale_shapley import gale_shapley
from .matching_utils import (
    generate_random_preferences,
    get_default_preferences,
    verify_stability,
)

__all__ = [
    "gale_shapley",
    "generate_random_preferences",
    "get_default_preferences",
    "verify_stability",
]
