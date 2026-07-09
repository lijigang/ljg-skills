#!/usr/bin/env python3
"""CLI: `python3 scripts/dry_run.py [prompt] [--format text|json]`

Examples:
    python3 scripts/dry_run.py
    python3 scripts/dry_run.py "Review this bug"
    python3 scripts/dry_run.py --format text
"""
from __future__ import annotations
import argparse
import json as jsonlib
import sys
from pathlib import Path

# Make sibling lib importable when run as script.
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from lib import dry_run  # noqa: E402


def main() -> int:
    p = argparse.ArgumentParser(description="OpenHarness dry-run (no model call)")
    p.add_argument("prompt", nargs="?", default=None, help="optional prompt to preview")
    p.add_argument("--format", choices=["text", "json"], default="json")
    p.add_argument("--pretty", action="store_true", help="pretty-print json output")
    args = p.parse_args()

    try:
        result = dry_run(prompt=args.prompt, output_format=args.format)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1

    if args.format == "json" and args.pretty and isinstance(result, (dict, list)):
        print(jsonlib.dumps(result, indent=2, ensure_ascii=False))
    else:
        print(result if isinstance(result, str) else jsonlib.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())