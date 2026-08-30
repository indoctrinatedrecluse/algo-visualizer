"""Test audit: verifies that every single algorithm in registry.ALGORITHMS
can be run without errors, produces valid frames, maps to source code,
and passes a WebSocket round-trip.
"""

import sys
import os

from scripts.audit_algorithms import run_audit


def test_all_registered_algorithms_audit():
    exit_code = run_audit()
    assert exit_code == 0, "Audit failed on one or more algorithms"
