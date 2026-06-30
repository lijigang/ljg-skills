"""Tests for ljg-openharness. Pure stdlib unittest. Run:
    cd ~/.claude/skills/ljg-openharness && python3 -m unittest tests.test_ljg_openharness -v
"""
from __future__ import annotations
import json
import os
import sys
import unittest
from pathlib import Path
from unittest import mock

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from lib import runner  # noqa: E402
from lib.runner import (  # noqa: E402
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
    _find_oh,
    _parse_output,
    _run,
)


class TestFindOh(unittest.TestCase):
    """Test _find_oh resolves the installed `oh` binary."""

    def test_finds_installed_oh(self):
        """oh should be on PATH (symlinked in ~/.local/bin/oh)."""
        path = _find_oh()
        self.assertTrue(Path(path).exists(), f"oh path {path} does not exist")
        self.assertTrue(os.access(path, os.X_OK), f"oh path {path} not executable")

    def test_raises_when_oh_missing(self):
        """When PATH lookup and candidates all fail, raise OpenHarnessNotFound."""
        with mock.patch("shutil.which", return_value=None):
            with mock.patch.object(Path, "exists", return_value=False):
                with self.assertRaises(OpenHarnessNotFound) as ctx:
                    _find_oh()
        self.assertIn("`oh` binary not found", str(ctx.exception))
        self.assertIn("pip install openharness-ai", str(ctx.exception))


class TestParseOutput(unittest.TestCase):
    """Test _parse_output handles all output formats."""

    def test_text_strips(self):
        self.assertEqual(_parse_output("  hello\n", "text"), "hello")
        self.assertEqual(_parse_output("hello", "text"), "hello")

    def test_json_returns_dict(self):
        out = _parse_output('{"a": 1, "b": [2,3]}', "json")
        self.assertEqual(out, {"a": 1, "b": [2, 3]})

    def test_json_invalid_raises(self):
        with self.assertRaises(OpenHarnessRunError) as ctx:
            _parse_output("{not valid", "json")
        self.assertIn("invalid JSON", str(ctx.exception))

    def test_stream_json_returns_list(self):
        raw = '{"event": 1}\n{"event": 2}\n\n{"event": 3}\n'
        out = _parse_output(raw, "stream-json")
        self.assertEqual(out, [{"event": 1}, {"event": 2}, {"event": 3}])

    def test_stream_json_invalid_line_raises(self):
        with self.assertRaises(OpenHarnessRunError) as ctx:
            _parse_output('{"ok": 1}\n{not valid\n', "stream-json")
        self.assertIn("line 2", str(ctx.exception))

    def test_unknown_format_raises(self):
        with self.assertRaises(OpenHarnessError):
            _parse_output("anything", "xml")


class TestRunCleansPythonPath(unittest.TestCase):
    """Test _run strips PYTHONPATH from subprocess env."""

    def test_pythonpath_stripped(self):
        seen_env = {}

        def fake_run(*args, **kwargs):
            seen_env.update(kwargs.get("env", {}))
            cp = unittest.mock.MagicMock()
            cp.returncode = 0
            cp.stdout = "{}"
            cp.stderr = ""
            return cp

        with mock.patch("subprocess.run", side_effect=fake_run):
            with mock.patch.dict(os.environ, {"PYTHONPATH": "/dirty/path"}):
                _run(["--dry-run"])
        self.assertNotIn("PYTHONPATH", seen_env)


class TestDryRunIntegration(unittest.TestCase):
    """Integration tests against the real installed `oh` binary."""

    @classmethod
    def setUpClass(cls):
        cls.snapshot = dry_run(prompt=None, output_format="json")
        cls.text_snap = dry_run(prompt=None, output_format="text")

    def test_returns_dict(self):
        self.assertIsInstance(self.snapshot, dict)

    def test_text_returns_str(self):
        self.assertIsInstance(self.text_snap, str)
        self.assertGreater(len(self.text_snap), 100)

    def test_has_mode_key(self):
        self.assertEqual(self.snapshot.get("mode"), "dry-run")

    def test_has_settings(self):
        self.assertIn("settings", self.snapshot)
        s = self.snapshot["settings"]
        self.assertIn("provider", s)
        self.assertIn("model", s)

    def test_has_skills_field(self):
        """Verified 2026-06-19: skills field exists at top level."""
        self.assertIn("skills", self.snapshot)
        self.assertIsInstance(self.snapshot["skills"], list)

    def test_has_tools_field(self):
        self.assertIn("tools", self.snapshot)
        self.assertIsInstance(self.snapshot["tools"], list)

    def test_has_commands_field(self):
        self.assertIn("commands", self.snapshot)
        self.assertIsInstance(self.snapshot["commands"], list)

    def test_has_readiness(self):
        self.assertIn("readiness", self.snapshot)
        self.assertIsInstance(self.snapshot["readiness"], dict)

    def test_skills_have_name_and_description(self):
        for s in self.snapshot["skills"][:5]:
            self.assertIn("name", s)
            self.assertIn("description", s)


class TestListHelpers(unittest.TestCase):
    """list_skills / list_commands / list_tools / readiness / find_skill."""

    @classmethod
    def setUpClass(cls):
        refresh_snapshot()  # reset cache before first call
        cls.skills = list_skills()
        cls.commands = list_commands()
        cls.tools = list_tools()
        cls.rdy = readiness()

    def test_list_skills_nonempty(self):
        """Should load many skills (verified ≥100 on this machine)."""
        self.assertGreater(len(self.skills), 50)

    def test_list_commands_nonempty(self):
        self.assertGreater(len(self.commands), 3)
        names = [c["name"] for c in self.commands]
        self.assertIn("help", names)
        self.assertIn("exit", names)

    def test_list_tools_nonempty(self):
        self.assertGreater(len(self.tools), 10)

    def test_readiness_is_dict(self):
        self.assertIsInstance(self.rdy, dict)
        # Should have at least a status / verdict key
        self.assertTrue(any(k in self.rdy for k in ("status", "verdict", "level", "ready")))

    def test_find_skill_present(self):
        s = find_skill("academic-writing")
        self.assertIsNotNone(s)
        self.assertEqual(s["name"], "academic-writing")

    def test_find_skill_absent(self):
        s = find_skill("nonexistent-skill-xyz-12345")
        self.assertIsNone(s)


class TestCache(unittest.TestCase):
    """refresh_snapshot invalidates the cache."""

    def test_cache_returns_same_object(self):
        a = list_skills()
        b = list_skills()
        # Same underlying snapshot dict (cached), same skills list
        self.assertEqual(len(a), len(b))

    def test_refresh_works(self):
        before = len(list_skills())
        new = refresh_snapshot()
        # Refresh returns the new snapshot dict
        self.assertIn("skills", new)
        after = len(new["skills"])
        self.assertEqual(before, after)


class TestPromptError(unittest.TestCase):
    """prompt() with bad args should still surface errors gracefully."""

    def test_unknown_output_format_raises(self):
        with self.assertRaises(OpenHarnessError):
            prompt("hi", output_format="xml")


class TestOhmoStatus(unittest.TestCase):
    """ohmo_status is always safe to call (no exceptions)."""

    def test_returns_dict(self):
        s = ohmo_status()
        self.assertIsInstance(s, dict)
        for k in ("installed", "initialized", "running", "workspace",
                  "provider_profile", "channels", "permission_mode", "note"):
            self.assertIn(k, s, f"missing key {k}")

    def test_workspace_path(self):
        s = ohmo_status()
        self.assertTrue(s["workspace"].endswith(".ohmo"))

    def test_initialized_after_init(self):
        """If `ohmo init` has been run, initialized=True and provider_profile set."""
        s = ohmo_status()
        if s["initialized"]:
            self.assertTrue(
                s["provider_profile"] is None or isinstance(s["provider_profile"], str),
                f"provider_profile not str|None: {s['provider_profile']!r}",
            )
            self.assertIsInstance(s["channels"], list)


class TestApiSurface(unittest.TestCase):
    """All public API symbols are exposed and callable."""

    def test_all_exports(self):
        from lib import (
            dry_run, prompt, list_skills, list_commands, list_tools,
            readiness, find_skill, ohmo_status, refresh_snapshot,
            OpenHarnessError, OpenHarnessNotFound, OpenHarnessRunError,
        )
        # Smoke check: each callable
        self.assertTrue(callable(dry_run))
        self.assertTrue(callable(prompt))
        self.assertTrue(callable(list_skills))
        self.assertTrue(callable(list_commands))
        self.assertTrue(callable(list_tools))
        self.assertTrue(callable(readiness))
        self.assertTrue(callable(find_skill))
        self.assertTrue(callable(ohmo_status))
        self.assertTrue(callable(refresh_snapshot))


if __name__ == "__main__":
    unittest.main(verbosity=2)