#!/usr/bin/env python3
"""CLI: list skills/commands/tools/mcp from OpenHarness dry-run snapshot.

Examples:
    python3 scripts/oh_inspect.py skills
    python3 scripts/oh_inspect.py commands
    python3 scripts/oh_inspect.py tools
    python3 scripts/oh_inspect.py readiness
    python3 scripts/oh_inspect.py skill academic-writing
    python3 scripts/oh_inspect.py skills --filter paper
"""
from __future__ import annotations
import argparse
import json as jsonlib
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from lib import (  # noqa: E402
    list_skills, list_commands, list_tools, readiness, find_skill, ohmo_status,
)


def main() -> int:
    p = argparse.ArgumentParser(description="Inspect OpenHarness resolved state")
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("skills", help="list all loaded skills")
    sub.add_parser("commands", help="list slash commands")
    sub.add_parser("tools", help="list tools")
    sub.add_parser("readiness", help="dry-run readiness verdict")
    sub.add_parser("ohmo", help="ohmo gateway status")

    p_skill = sub.add_parser("skill", help="find a skill by name")
    p_skill.add_argument("name")

    for name in ("skills", "commands", "tools"):
        sp = sub.choices[name] if hasattr(sub, 'choices') else None

    p_filter = argparse.ArgumentParser(add_help=False)
    p_filter.add_argument("--filter", default=None, help="substring filter (case-insensitive)")
    p_filter.add_argument("--source", default=None, help="filter by source (project|user|builtin)")
    p_filter.add_argument("--limit", type=int, default=50)
    p_filter.add_argument("--pretty", action="store_true")

    # re-parse to apply common filter flags
    args, remaining = p.parse_known_args()
    parsed = p_filter.parse_args(remaining)

    if args.cmd == "skills":
        items = list_skills()
        if parsed.filter:
            f = parsed.filter.lower()
            items = [s for s in items if f in s.get("name", "").lower()
                     or f in s.get("description", "").lower()]
        if parsed.source:
            items = [s for s in items if s.get("source") == parsed.source]
        items = items[: parsed.limit]
        out = [{"name": s.get("name"), "source": s.get("source"),
                "desc": (s.get("description") or "")[:80]} for s in items]
    elif args.cmd == "commands":
        items = list_commands()
        if parsed.filter:
            f = parsed.filter.lower()
            items = [c for c in items if f in c.get("name", "").lower()]
        out = [{"name": c.get("name"), "remote": c.get("remote_invocable")}
               for c in items[: parsed.limit]]
    elif args.cmd == "tools":
        items = list_tools()
        if parsed.filter:
            f = parsed.filter.lower()
            items = [t for t in items if f in t.get("name", "").lower()]
        out = [{"name": t.get("name"),
                "req": t.get("required_args", []),
                "opt": t.get("optional_args", [])} for t in items[: parsed.limit]]
    elif args.cmd == "readiness":
        out = readiness()
    elif args.cmd == "ohmo":
        out = ohmo_status()
    elif args.cmd == "skill":
        out = find_skill(args.name) or {"not_found": args.name}
    else:
        p.print_help()
        return 2

    if parsed.pretty:
        print(jsonlib.dumps(out, indent=2, ensure_ascii=False))
    else:
        print(jsonlib.dumps(out, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())