import { describe, expect, test } from "bun:test";
import { convertEmbeddedOrgTemplates } from "./MdizeEmbeddedOrg";

describe("convertEmbeddedOrgTemplates", () => {
  test("converts a full Org document template into fenced Markdown with YAML", () => {
    const source = [
      "```org",
      "#+title: 盲区扫描",
      "#+date: [2026-08-17]",
      "#+filetags: :blind:weread:",
      "",
      "* 昨天你在想什么",
      "- 链接：[[https://example.com][阅读]]",
      "```",
      "",
    ].join("\n");

    const converted = convertEmbeddedOrgTemplates(source);
    expect(converted).toContain("```markdown\n---\ntitle: 盲区扫描");
    expect(converted).toContain("tags: blind weread\n---\n# 昨天你在想什么");
    expect(converted).toContain("- 链接：[阅读](https://example.com)");
    expect(converted).not.toContain("#+");
  });

  test("preserves indentation for a nested full-document example", () => {
    const source = [
      "3. 文件结构：",
      "",
      "   ```org",
      "   #+title: 圆桌",
      "   #+filetags: :roundtable:",
      "   * 议题与参会者",
      "   ** 第 N 轮",
      "   ```",
    ].join("\n");

    const converted = convertEmbeddedOrgTemplates(source);
    expect(converted).toContain("   ```markdown\n   ---\n   title: 圆桌");
    expect(converted).toContain("   tags: roundtable\n   ---\n   # 议题与参会者");
    expect(converted).toContain("   ## 第 N 轮");
  });

  test("converts Org fragments without inventing frontmatter", () => {
    const source = [
      "```org",
      "- *主体/边界*：限定",
      "- *状态式*：A -> B",
      "```",
    ].join("\n");

    const converted = convertEmbeddedOrgTemplates(source);
    expect(converted).toBe([
      "```markdown",
      "- **主体/边界**：限定",
      "- **状态式**：A -> B",
      "```",
    ].join("\n"));
    expect(converted).not.toContain("---");
  });

  test("leaves non-Org fences untouched", () => {
    const source = "```text\n* literal\n```\n";
    expect(convertEmbeddedOrgTemplates(source)).toBe(source);
  });

  test("preserves CRLF line endings while converting an Org template", () => {
    const source = "```org\r\n#+title: 圆桌\r\n* 第一轮\r\n```\r\n";
    const converted = convertEmbeddedOrgTemplates(source);
    expect(converted).toBe("```markdown\r\n---\r\ntitle: 圆桌\r\n---\r\n# 第一轮\r\n```\r\n");
    expect(converted.replace(/\r\n/g, "")).not.toContain("\n");
  });

  test("recognizes an unlabeled fence whose first line is an Org header", () => {
    const source = [
      "文件头：",
      "```",
      "#+title: plain-example",
      "#+filetags: :plain:atom:",
      "```",
    ].join("\n");
    expect(convertEmbeddedOrgTemplates(source)).toContain(
      "```markdown\n---\ntitle: plain-example\ntags: plain atom\n---\n```",
    );
  });
});
