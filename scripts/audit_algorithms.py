#!/usr/bin/env python3
"""Audit script: runs every registered algorithm, checks frames, line numbers,
WebSocket roundtrips, and prints a formatted tabular report.
"""

from __future__ import annotations

import os
import sys

# Ensure repository root is on sys.path
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from fastapi.testclient import TestClient
import engine
import main
from registry import ALGORITHMS

client = TestClient(main.app)


def run_audit() -> int:
    print("=" * 80)
    print("ALGO-VISUALIZER COMPREHENSIVE ALGORITHM AUDIT")
    print(f"Total Registered Algorithms: {len(ALGORITHMS)}")
    print("=" * 80)

    categories: dict[str, list[str]] = {}
    audit_results: list[dict] = []
    errors: list[tuple[str, str, str]] = []

    for name, info in sorted(ALGORITHMS.items()):
        cat = info.category
        categories.setdefault(cat, []).append(name)
        status = "OK"
        error_msg = ""
        frame_count = 0

        try:
            detail = engine.get_algorithm_detail(name)
            assert detail["source"], "Source code empty"
            assert detail["start_line"] > 0, "Invalid start line"
            source_lines = detail["source"].splitlines()

            # Execute run_sort with appropriate inputs
            if cat == "sorting":
                res = engine.run_sort(name, array=[5, 2, 8, 1, 9, 3, 7, 4, 6])
            elif cat == "searching":
                res = engine.run_sort(name, array=[1, 2, 3, 4, 5, 6, 7, 8, 9], target=5)
            elif cat == "graph":
                res = engine.run_sort(name)
            elif cat == "tree":
                res = engine.run_sort(name, key=53)
            elif cat == "flow":
                res = engine.run_sort(name)
            elif cat == "matching":
                res = engine.run_sort(name)
            elif cat == "greedy":
                res = engine.run_sort(name)
            elif cat == "dp":
                res = engine.run_sort(name)
            else:
                res = engine.run_sort(name)

            frames = res["frames"]
            frame_count = len(frames)
            assert frame_count > 0, "No frames generated"
            assert frames[-1]["type"] in ("done", "sorted", "found", "not_found"), (
                f"Last frame type is {frames[-1].get('type')}"
            )

            # Verify every frame maps to a valid source line
            for f in frames:
                rel = f["line"] - detail["start_line"]
                assert 0 <= rel < len(source_lines), (
                    f"Line {f['line']} out of source range [{detail['start_line']}, {detail['start_line'] + len(source_lines)})"
                )

            # Verify WebSocket round-trip
            with client.websocket_connect("/ws") as ws:
                payload = {"action": "sort", "algorithm": name, "request_id": 777}
                if cat in ("sorting", "searching"):
                    payload["array"] = [5, 2, 8, 1, 9, 3] if cat == "sorting" else [1, 2, 3, 5, 8, 9]
                    if cat == "searching":
                        payload["target"] = 5
                ws.send_json(payload)
                msg = ws.receive_json()
                assert msg["type"] == "result", f"WS error: {msg}"
                assert msg["request_id"] == 777
                assert len(msg["frames"]) > 0

        except Exception as e:
            status = "FAIL"
            error_msg = str(e)
            errors.append((name, cat, str(e)))

        audit_results.append({
            "name": name,
            "display_name": info.display_name,
            "category": cat,
            "frames": frame_count,
            "status": status,
            "error": error_msg,
        })

    cat_order = ["sorting", "searching", "greedy", "dp", "tree", "graph", "flow", "matching"]
    for cat in cat_order:
        algos = categories.get(cat, [])
        if not algos:
            continue
        print(f"\nCategory: {cat.upper()} ({len(algos)} algorithms)")
        print(f"{'Algorithm Name':<24} | {'Display Name':<42} | {'Frames':<6} | {'Status'}")
        print("-" * 84)
        for a in algos:
            r = next(item for item in audit_results if item["name"] == a)
            symbol = "[PASS]" if r["status"] == "OK" else "[FAIL]"
            print(f"{r['name']:<24} | {r['display_name']:<42} | {r['frames']:<6} | {symbol}")

    print("\n" + "=" * 84)
    if errors:
        print(f"FAILED: {len(errors)} error(s) found:")
        for name, cat, err in errors:
            print(f"  - [{cat}] {name}: {err}")
        print("=" * 84)
        return 1
    else:
        print(f"SUCCESS: All {len(ALGORITHMS)} algorithms and their generators/dependencies verified!")
        print("=" * 84)
        return 0


if __name__ == "__main__":
    sys.exit(run_audit())
