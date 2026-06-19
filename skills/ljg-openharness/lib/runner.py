"""Subprocess runner for `oh` CLI. Pure stdlib.

Design notes:
- We shell out to `oh` instead of importing openharness package directly.
  This keeps ljg-openharness 0-dependency: anyone with `oh` on PATH can use it.
- All public functions raise OpenHarnessError on failure with a readable hint.
- `output_format` mirrors `oh --output-format` flag (text/json/stream-json).
- `dry_run()` is cached per process via `_get_dry_run_snapshot()` so multiple
  `list_*` calls share a single subprocess invocation.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class OpenHarnessError(RuntimeError):
    """Base error for all ljg-openharness failures."""


class OpenHarnessNotFound(OpenHarnessError):
    """Raised when `oh` binary is not on PATH or not executable."""


class OpenHarnessRunError(OpenHarnessError):
    """Raised when `oh` exits non-zero or returns malformed output."""

    def __init__(self, message: str, returncode: int = -1, stderr: str = ""):
        super().__init__(message)
        self.returncode = returncode
        self.stderr = stderr


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _find_oh() -> str:
    """Locate `oh` binary. Raises OpenHarnessNotFound with install hint if absent."""
    path = shutil.which("oh")
    if path:
        return path
    candidates = [
        Path.home() / ".local" / "bin" / "oh",
        Path.home() / ".openharness-venv" / "bin" / "oh",
    ]
    for c in candidates:
        if c.exists() and os.access(c, os.X_OK):
            return str(c)
    raise OpenHarnessNotFound(
        "`oh` binary not found on PATH. Install with:\n"
        "  uv venv ~/.openharness-venv --python 3.12\n"
        "  ~/.openharness-venv/bin/pip install openharness-ai\n"
        "  ln -sf ~/.openharness-venv/bin/oh ~/.local/bin/oh"
    )


def _run(args: list[str], timeout: int = 120) -> subprocess.CompletedProcess:
    """Run `oh <args>`, capture stdout/stderr. Cleans PYTHONPATH so venv works."""
    oh = _find_oh()
    env = os.environ.copy()
    # Owner shell sometimes sets PYTHONPATH to a custom src dir which breaks
    # the venv interpreter's encodings module load. Strip it for subprocess.
    env.pop("PYTHONPATH", None)
    try:
        return subprocess.run(
            [oh, *args],
            capture_output=True,
            text=True,
            timeout=timeout,
            env=env,
        )
    except subprocess.TimeoutExpired as e:
        raise OpenHarnessRunError(
            f"`oh {' '.join(args)}` timed out after {timeout}s", returncode=-1
        ) from e


def _parse_output(raw: str, output_format: str) -> Any:
    """Parse `oh` stdout per `output_format`.

    text    -> str (stripped)
    json    -> dict (parsed once)
    stream-json -> list[dict] (one JSON object per line)
    """
    if output_format == "text":
        return raw.strip()
    if output_format == "json":
        try:
            return json.loads(raw)
        except json.JSONDecodeError as e:
            raise OpenHarnessRunError(
                f"`oh` returned invalid JSON: {e}\nFirst 200 chars: {raw[:200]}"
            ) from e
    if output_format == "stream-json":
        events = []
        for i, line in enumerate(raw.splitlines(), start=1):
            line = line.strip()
            if not line:
                continue
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError as e:
                raise OpenHarnessRunError(
                    f"stream-json line {i} invalid: {e}\nLine: {line[:200]}"
                ) from e
        return events
    raise OpenHarnessError(
        f"Unknown output_format {output_format!r}; use text|json|stream-json"
    )


def _check_rc(cp: subprocess.CompletedProcess, args: list[str]) -> None:
    """Raise OpenHarnessRunError if subprocess failed."""
    if cp.returncode == 0:
        return
    raise OpenHarnessRunError(
        f"`oh {' '.join(args)}` failed (rc={cp.returncode}): {cp.stderr.strip()[:500]}",
        returncode=cp.returncode,
        stderr=cp.stderr,
    )


# ---------------------------------------------------------------------------
# Dry-run snapshot cache (so list_skills/commands/tools share one subprocess)
# ---------------------------------------------------------------------------

_SNAPSHOT_CACHE: dict | None = None


def _get_snapshot() -> dict:
    """Return dry-run report, cached per-process (cleared by `refresh_snapshot`)."""
    global _SNAPSHOT_CACHE
    if _SNAPSHOT_CACHE is None:
        _SNAPSHOT_CACHE = dry_run(prompt=None, output_format="json")
        if not isinstance(_SNAPSHOT_CACHE, dict):
            raise OpenHarnessRunError(
                "Expected dry-run json dict, got " + type(_SNAPSHOT_CACHE).__name__
            )
    return _SNAPSHOT_CACHE


def refresh_snapshot() -> dict:
    """Force-refresh dry-run snapshot (e.g. after installing a new skill)."""
    global _SNAPSHOT_CACHE
    _SNAPSHOT_CACHE = None
    return _get_snapshot()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def dry_run(prompt: str | None = None, output_format: str = "json") -> Any:
    """Run `oh --dry-run` and return resolved runtime preview.

    `oh --dry-run` is intentionally static:
      - does NOT call the model
      - does NOT execute tools or subagents
      - does NOT connect to MCP servers
      - DOES resolve settings, auth status, skills, commands, tools, MCP config,
        readiness verdict

    Returns the resolved preview (dict for json, raw text for text).
    Use this BEFORE a real prompt to sanity-check auth, MCP, skill loading.
    """
    args = ["--dry-run"]
    if prompt is not None:
        args.extend(["-p", prompt])
    args.extend(["--output-format", output_format])
    cp = _run(args)
    _check_rc(cp, args)
    return _parse_output(cp.stdout, output_format)


def prompt(
    p: str,
    output_format: str = "text",
    model: str | None = "MiniMax-M3",
    effort: str | None = None,
    max_turns: int | None = None,
    timeout: int = 300,
) -> Any:
    """Run a single prompt via `oh -p` and return response.

    Args:
        p: prompt text.
        output_format: text | json | stream-json.
        model: sonnet | opus | full model id (passed as --model).
                Default "MiniMax-M3" — explicit override works around
                an OpenHarness bug where the alias is suffixed with [1M]
                in the dry-run report but that suffix is rejected by
                the MiniMax API. Pass None to use whatever settings.json
                has (may hit the same bug for some provider/model combos).
        effort: low | medium | high | xhigh/max (passed as --effort).
        max_turns: cap on agentic turns (default unset).
        timeout: seconds (default 300).
    """
    args = ["-p", p, "--output-format", output_format]
    if model:
        args.extend(["--model", model])
    if effort:
        args.extend(["--effort", effort])
    if max_turns is not None:
        args.extend(["--max-turns", str(max_turns)])
    cp = _run(args, timeout=timeout)
    _check_rc(cp, args)
    return _parse_output(cp.stdout, output_format)


def list_skills() -> list[dict]:
    """Return OpenHarness loaded skills from cached dry-run snapshot.

    Schema (verified 2026-06-19 against openharness 0.1.9):
        skills: list[{name, description, source}]  # source = "project" | "user" | "builtin"
    """
    snap = _get_snapshot()
    return snap.get("skills", [])


def list_commands() -> list[dict]:
    """Return slash commands resolved at session start.

    Schema:
        commands: list[{name, description, remote_invocable, behavior}]
    """
    snap = _get_snapshot()
    return snap.get("commands", [])


def list_tools() -> list[dict]:
    """Return tools available to the agent.

    Schema:
        tools: list[{name, description, required_args, optional_args}]
    """
    snap = _get_snapshot()
    return snap.get("tools", [])


def readiness() -> dict:
    """Return dry-run readiness verdict (ready / warning / blocked)."""
    snap = _get_snapshot()
    return snap.get("readiness", {})


def find_skill(name: str) -> dict | None:
    """Look up a skill by exact name in the snapshot. Returns None if not found."""
    for s in list_skills():
        if s.get("name") == name:
            return s
    return None


def ohmo_status() -> dict:
    """Probe ohmo personal-agent gateway status.

    Reads ~/.ohmo/gateway.json directly (the canonical source) when present,
    falls back to `ohmo gateway status` subprocess otherwise. Returns dict:
      - installed: bool
      - initialized: bool (~/.ohmo workspace exists)
      - running: bool (best effort — process check or config flag)
      - workspace: str (~/.ohmo path)
      - provider_profile: str | None (e.g. "minimax")
      - channels: list[str] (enabled_channels)
      - permission_mode: str | None
      - note: str (human-readable hint)
    """
    env = os.environ.copy()
    env.pop("PYTHONPATH", None)
    ohmo = shutil.which("ohmo") or str(Path.home() / ".local" / "bin" / "ohmo")
    workspace = Path.home() / ".ohmo"
    gw_config_path = workspace / "gateway.json"

    result = {
        "installed": Path(ohmo).exists(),
        "initialized": workspace.is_dir(),
        "running": False,
        "workspace": str(workspace),
        "provider_profile": None,
        "channels": [],
        "permission_mode": None,
        "note": "",
    }

    if not result["installed"]:
        result["note"] = "ohmo not installed (no ~/.local/bin/ohmo)"
        return result

    # 1. Read ~/.ohmo/gateway.json directly (canonical source).
    if gw_config_path.is_file():
        try:
            cfg = json.loads(gw_config_path.read_text(encoding="utf-8"))
            result["provider_profile"] = cfg.get("provider_profile")
            result["channels"] = list(cfg.get("enabled_channels") or [])
            result["permission_mode"] = cfg.get("permission_mode")
        except (json.JSONDecodeError, OSError) as e:
            result["note"] = f"gateway.json unreadable: {e}"
    else:
        result["note"] = "ohmo installed but `ohmo init` not yet run (no ~/.ohmo/gateway.json)"

    # 2. Probe live process via `ohmo gateway status` if available.
    for subcmd in (["gateway", "status"], ["status"], ["info"]):
        try:
            cp = subprocess.run(
                [ohmo, *subcmd, "--output-format", "json"],
                capture_output=True,
                text=True,
                timeout=10,
                env=env,
            )
            if cp.returncode == 0 and cp.stdout.strip():
                try:
                    data = json.loads(cp.stdout)
                    if isinstance(data, dict):
                        result["running"] = bool(data.get("running", True))
                        if not result["note"]:
                            result["note"] = f"via `ohmo {' '.join(subcmd)}`"
                        return result
                except json.JSONDecodeError:
                    pass
        except (subprocess.TimeoutExpired, FileNotFoundError):
            continue

    # 3. Fallback heuristic: empty channels => not running (gateway self-stops).
    if not result["channels"] and result["initialized"]:
        if not result["note"]:
            result["note"] = "workspace ready, channels empty — gateway would self-stop (no channels enabled)"
    elif result["channels"] and result["initialized"] and not result["note"]:
        result["note"] = "workspace + channels configured; run `ohmo gateway start` to launch"

    return result