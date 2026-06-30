"""ljg-openharness: 0-dependency Python client for HKUDS/OpenHarness oh CLI.

Public API (all functions are zero-dep, pure stdlib):
    dry_run(prompt, output_format) -> dict | str
    prompt(prompt, output_format, model, effort, max_turns, timeout) -> dict | str | list
    list_skills() -> list[dict]
    list_commands() -> list[dict]
    list_tools() -> list[dict]
    readiness() -> dict
    find_skill(name) -> dict | None
    ohmo_status() -> dict
    refresh_snapshot() -> dict
    OpenHarnessError, OpenHarnessNotFound, OpenHarnessRunError
"""
from .runner import (
    dry_run,
    prompt,
    list_skills,
    list_commands,
    list_tools,
    readiness,
    find_skill,
    ohmo_status,
    refresh_snapshot,
    OpenHarnessError,
    OpenHarnessNotFound,
    OpenHarnessRunError,
)

__all__ = [
    "dry_run",
    "prompt",
    "list_skills",
    "list_commands",
    "list_tools",
    "readiness",
    "find_skill",
    "ohmo_status",
    "refresh_snapshot",
    "OpenHarnessError",
    "OpenHarnessNotFound",
    "OpenHarnessRunError",
]
__version__ = "0.1.0"