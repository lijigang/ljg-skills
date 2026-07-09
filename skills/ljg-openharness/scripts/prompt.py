#!/usr/bin/env python3
"""CLI: `python3 scripts/prompt.py "your prompt" [--format text|json|stream-json] [--model sonnet]`

Examples:
    python3 scripts/prompt.py "Explain this codebase"
    python3 scripts/prompt.py "List all functions" --format json
    python3 scripts/prompt.py "Fix bug" --format stream-json --pretty
"""
from __future__ import annotations
import argparse
import json as jsonlib
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from lib import prompt  # noqa: E402


def main() -> int:
    p = argparse.ArgumentParser(description="Run a single prompt via OpenHarness")
    p.add_argument("p", help="prompt text")
    p.add_argument("--format", choices=["text", "json", "stream-json"], default="text")
    p.add_argument("--model", default=None, help="sonnet|opus|full model id")
    p.add_argument("--effort", default=None, help="low|medium|high|xhigh")
    p.add_argument("--max-turns", type=int, default=None)
    p.add_argument("--timeout", type=int, default=300)
    p.add_argument("--pretty", action="store_true")
    args = p.parse_args()

    try:
        result = prompt(
            args.p,
            output_format=args.format,
            model=args.model,
            effort=args.effort,
            max_turns=args.max_turns,
            timeout=args.timeout,
        )
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1

    if args.format == "text":
        print(result)
    elif args.pretty:
        print(jsonlib.dumps(result, indent=2, ensure_ascii=False))
    else:
        print(jsonlib.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())