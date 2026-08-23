import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pushPath = fileURLToPath(new URL("./Push.sh", import.meta.url));
const embeddedConverterPath = fileURLToPath(
  new URL("./MdizeEmbeddedOrg.ts", import.meta.url),
);
const temporaryRoots: string[] = [];

function writeFixture(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("ljg-push Markdown branch conversion", () => {
  test("converts ljg-is output contracts all the way to Markdown semantics", () => {
    const root = mkdtempSync(join(tmpdir(), "ljg-push-is-test-"));
    temporaryRoots.push(root);
    const localRoot = join(root, "local");
    const repoRoot = join(root, "repo");
    const isRoot = join(localRoot, "ljg-is");

    writeFixture(
      join(localRoot, "ljg-push", "Tools", "MdizeEmbeddedOrg.ts"),
      readFileSync(embeddedConverterPath, "utf8"),
    );
    writeFixture(
      join(isRoot, "SKILL.md"),
      [
        "---",
        "name: ljg-is",
        "---",
        "把它接成可辨认、可判断、可行动的 Org 解读。",
      ].join("\n"),
    );
    writeFixture(
      join(isRoot, "Workflows", "TraceCreation.md"),
      [
        "`#+basis` 记录事实根据。",
        "## Org 输出合同",
        "schema 固定为 `ljg-is-v5`，标签包含 `:is:act:`。",
        "- `#+definition` 记录定义。",
        "- `#+operation` 记录运作。",
        "- `#+recognition` 记录认知修正。",
        "- `#+guidance` 记录行动判断。",
        "- `#+falsifier` 记录反证。",
        'bun ValidateNote.ts "<Org 文件路径>"',
        "不要把 Org 的后台检查重新复制成聊天列表。",
      ].join("\n"),
    );
    writeFixture(
      join(isRoot, "Template.org"),
      "#+title: 理解：测试\n#+schema: ljg-is-v5\n* 测试标题\n正文。\n",
    );

    const command = [
      'task_push_path="$1"',
      'task_local_root="$2"',
      'task_repo_root="$3"',
      "set --",
      "export LJG_PUSH_LIBRARY_ONLY=1",
      'source "$task_push_path"',
      'SKILLS_LOCAL="$task_local_root"',
      'SKILLS_REPO="$task_repo_root"',
      'mkdir -p "$SKILLS_REPO/skills"',
      'sync_skill "ljg-is" 1',
      'audit_md_skill "$SKILLS_REPO/skills/ljg-is"',
    ].join("\n");
    const result = Bun.spawnSync(
      ["bash", "-c", command, "bash", pushPath, localRoot, repoRoot],
      { stdout: "pipe", stderr: "pipe" },
    );
    const stderr = new TextDecoder().decode(result.stderr);
    expect(result.exitCode, stderr).toBe(0);

    const generatedRoot = join(repoRoot, "skills", "ljg-is");
    const skill = readFileSync(join(generatedRoot, "SKILL.md"), "utf8");
    const workflow = readFileSync(
      join(generatedRoot, "Workflows", "TraceCreation.md"),
      "utf8",
    );
    expect(skill).toContain("Markdown 解读");
    expect(workflow).toContain("## Markdown 输出合同");
    expect(workflow).toContain("tags 同时包含 `is` 与 `act`");
    expect(workflow).toContain('"<Markdown 文件路径>"');
    expect(workflow).toContain("Markdown 的后台检查");
    expect(workflow).not.toMatch(/`#\+(definition|operation|recognition|guidance|basis|falsifier)`/);
  });

  test("converts paper output contracts while retaining explicit Org input fixtures", () => {
    const root = mkdtempSync(join(tmpdir(), "ljg-push-test-"));
    temporaryRoots.push(root);
    const localRoot = join(root, "local");
    const repoRoot = join(root, "repo");
    const paperRoot = join(localRoot, "ljg-paper");

    writeFixture(
      join(localRoot, "ljg-push", "Tools", "MdizeEmbeddedOrg.ts"),
      readFileSync(embeddedConverterPath, "utf8"),
    );
    writeFixture(
      join(paperRoot, "SKILL.md"),
      [
        "---",
        "name: ljg-paper",
        "---",
        "| 输入 | 输出 |",
        "|---|---|",
        "| PDF | 保存一份由论文内容命名的 Org 与后台 paper-map |",
        "| title | 保存 Org 与 paper-map |",
        "Org 默认保存到 `~/Context/`。",
        "交付通过 Denote/consult-notes/Org lint 与确定性 validator。",
        "随后确认目录索引、consult-notes 与 `org-lint`。",
      ].join("\n"),
    );
    writeFixture(
      join(paperRoot, "ReadingGuide.md"),
      "确认 `denote-directory-files`、consult-notes 与 `org-lint`。\n",
    );
    writeFixture(
      join(paperRoot, "references", "template.org"),
      "#+title: Test\n* Main\n加入一个 Org example 图块。\n",
    );
    writeFixture(
      join(paperRoot, "evals", "evals.json"),
      JSON.stringify(
        [
          { prompt: "保存 Org 与 paper-map。" },
          { prompt: "保存同一 Org 与 paper-map。" },
        ],
        null,
        2,
      ),
    );
    writeFixture(
      join(paperRoot, "scripts", "validate_note.ts"),
      [
        'const message = "最多保留一个 Org example 图块";',
        'const usage = "<note.org> --map <paper-map.md>";',
      ].join("\n"),
    );
    writeFixture(
      join(paperRoot, "scripts", "validate_note.test.ts"),
      [
        'const fixture = "20260820T000000--paper-test__paper.org";',
        'const header = "#+title: fixture";',
      ].join("\n"),
    );

    const command = [
      'task_push_path="$1"',
      'task_local_root="$2"',
      'task_repo_root="$3"',
      "set --",
      "export LJG_PUSH_LIBRARY_ONLY=1",
      'source "$task_push_path"',
      'SKILLS_LOCAL="$task_local_root"',
      'SKILLS_REPO="$task_repo_root"',
      'mkdir -p "$SKILLS_REPO/skills"',
      'sync_skill "ljg-paper" 1',
      'audit_md_skill "$SKILLS_REPO/skills/ljg-paper"',
    ].join("\n");
    const result = Bun.spawnSync(
      ["bash", "-c", command, "bash", pushPath, localRoot, repoRoot],
      { stdout: "pipe", stderr: "pipe" },
    );
    const stderr = new TextDecoder().decode(result.stderr);
    expect(result.exitCode, stderr).toBe(0);

    const generatedRoot = join(repoRoot, "skills", "ljg-paper");
    const skill = readFileSync(join(generatedRoot, "SKILL.md"), "utf8");
    const guide = readFileSync(join(generatedRoot, "ReadingGuide.md"), "utf8");
    const template = readFileSync(
      join(generatedRoot, "references", "template.md"),
      "utf8",
    );
    const evals = readFileSync(join(generatedRoot, "evals", "evals.json"), "utf8");
    const validator = readFileSync(
      join(generatedRoot, "scripts", "validate_note.ts"),
      "utf8",
    );
    const compatibilityFixture = readFileSync(
      join(generatedRoot, "scripts", "validate_note.test.ts"),
      "utf8",
    );

    expect(existsSync(join(generatedRoot, "references", "template.org"))).toBe(false);
    expect(skill).toContain("保存一份由论文内容命名的 Markdown 与后台 paper-map");
    expect(skill).toContain("Markdown 默认保存到");
    expect(skill).not.toMatch(/Org lint|org-lint/);
    expect(guide).not.toContain("org-lint");
    expect(template).toContain("Markdown 围栏图块");
    expect(evals).toContain("保存 Markdown 与 paper-map");
    expect(evals).toContain("保存同一 Markdown 与 paper-map");
    expect(evals).not.toContain("保存 Org 与 paper-map");
    expect(validator).toContain("最多保留一个 Markdown 围栏图块");
    expect(validator).toContain("<note.md> --map <paper-map.md>");
    expect(compatibilityFixture).toContain("__paper.org");
    expect(compatibilityFixture).toContain("#+title: fixture");

    writeFixture(
      join(generatedRoot, "evals", "evals.json"),
      JSON.stringify(
        [
          { prompt: "保存 Org 与 paper-map。" },
          { prompt: "保存同一 Org 与 paper-map。" },
        ],
        null,
        2,
      ),
    );
    const auditOnlyCommand = [
      'task_push_path="$1"',
      'task_skill_root="$2"',
      "set --",
      "export LJG_PUSH_LIBRARY_ONLY=1",
      'source "$task_push_path"',
      'audit_md_skill "$task_skill_root"',
    ].join("\n");
    const auditOnlyResult = Bun.spawnSync(
      ["bash", "-c", auditOnlyCommand, "bash", pushPath, generatedRoot],
      { stdout: "pipe", stderr: "pipe" },
    );
    const auditOnlyStderr = new TextDecoder().decode(auditOnlyResult.stderr);
    expect(auditOnlyResult.exitCode).toBe(1);
    expect(auditOnlyStderr).toContain("保存 Org 与 paper-map");
    expect(auditOnlyStderr).toContain("保存同一 Org 与 paper-map");
  });

  test("does not rewrite the publisher's own runtime audit literals", () => {
    const root = mkdtempSync(join(tmpdir(), "ljg-push-meta-test-"));
    temporaryRoots.push(root);
    const localRoot = join(root, "local");
    const repoRoot = join(root, "repo");
    const publisherRoot = join(localRoot, "ljg-push");
    const publisherFixture = [
      "最多保留一个 Org example 图块",
      "stdin__paper.org",
      "保存 Org 与 paper-map",
    ].join("\n");
    writeFixture(join(publisherRoot, "SKILL.md"), "---\nname: ljg-push\n---\n");
    writeFixture(join(publisherRoot, "Tools", "Push.sh"), publisherFixture);

    const command = [
      'task_push_path="$1"',
      'task_local_root="$2"',
      'task_repo_root="$3"',
      "set --",
      "export LJG_PUSH_LIBRARY_ONLY=1",
      'source "$task_push_path"',
      'SKILLS_LOCAL="$task_local_root"',
      'SKILLS_REPO="$task_repo_root"',
      'mkdir -p "$SKILLS_REPO/skills"',
      'sync_skill "ljg-push" 1',
      'audit_md_skill "$SKILLS_REPO/skills/ljg-push"',
    ].join("\n");
    const result = Bun.spawnSync(
      ["bash", "-c", command, "bash", pushPath, localRoot, repoRoot],
      { stdout: "pipe", stderr: "pipe" },
    );
    const stderr = new TextDecoder().decode(result.stderr);
    expect(result.exitCode, stderr).toBe(0);
    expect(
      readFileSync(join(repoRoot, "skills", "ljg-push", "Tools", "Push.sh"), "utf8"),
    ).toBe(publisherFixture);
  });
});
