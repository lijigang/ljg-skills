import { describe, expect, test } from "bun:test";
import { validateNoteText } from "./ValidateNote";

const filePath = "/tmp/20260801T010203--本质-taxi__is.org";
const markdownFilePath = "/tmp/20260801T010203--本质-taxi__is.md";

function goodNote(): string {
  return `#+title: 本质：Taxi
#+date: [2026-08-01 Sat 01:02]
#+identifier: 20260801T010203
#+filetags: :is:

* 目标
Taxi
问题类型：目的本质

* 完整表达
完整：（面向乘客，按需、安全、舒适地）把人从 A 点送到 B 点

* 剥离
- 限定：服务对象和质量要求不改变最终完成态
- 状态式：人：地点 A -> 地点 B

* 本质
核心：把人从 A 点送到 B 点

* 验证
- 删除测试：再删会失去承受变化的人或移动方向
- 替换测试：换交通工具仍成立
- 过度压缩：「运输」丢掉对象和完成态
- 非唯一性：允许与公交车共享目的本质
`;
}

function goodMarkdownNote(): string {
  return `---
title: 本质：Taxi
date: 2026-08-01 01:02
identifier: 20260801T010203
tags: [is]
---

# 目标
Taxi
问题类型：目的本质

# 完整表达
完整：（面向乘客，按需、安全、舒适地）把人从 A 点送到 B 点

# 剥离
- 限定：服务对象和质量要求不改变最终完成态
- 状态式：人：地点 A -> 地点 B

# 本质
核心：把人从 A 点送到 B 点

# 验证
- 删除测试：再删会失去承受变化的人或移动方向
- 替换测试：换交通工具仍成立
- 过度压缩：「运输」丢掉对象和完成态
- 非唯一性：允许与公交车共享目的本质
`;
}

function errorsFor(content: string, path = filePath): string[] {
  return validateNoteText(path, content).errors;
}

describe("ValidateNote", () => {
  test("accepts a valid ljg-is Org note", () => {
    const result = validateNoteText(filePath, goodNote());
    expect(result.ok).toBe(true);
    expect(result.core).toBe("把人从 A 点送到 B 点");
  });

  test("accepts a valid ljg-is Markdown note", () => {
    const result = validateNoteText(markdownFilePath, goodMarkdownNote());
    expect(result.ok).toBe(true);
    expect(result.core).toBe("把人从 A 点送到 B 点");
  });

  test("rejects Org structure in a Markdown note", () => {
    const note = goodMarkdownNote().replace("# 目标", "* 目标");
    expect(validateNoteText(markdownFilePath, note).errors.some((error) => error.includes("Org"))).toBe(true);
  });

  test("rejects top-level headings in the wrong order", () => {
    const note = goodNote().replace("* 完整表达\n", "* 临时\n");
    expect(errorsFor(note).some((error) => error.includes("一级标题"))).toBe(true);
  });

  test("rejects an identifier that disagrees with the filename", () => {
    const note = goodNote().replace("20260801T010203\n#+filetags", "20260801T010204\n#+filetags");
    expect(errorsFor(note).some((error) => error.includes("文件名时间戳"))).toBe(true);
  });

  test("rejects Markdown syntax", () => {
    const note = goodNote().replace("Taxi\n问题类型", "# Taxi\n问题类型");
    expect(errorsFor(note).some((error) => error.includes("Markdown"))).toBe(true);
  });

  test("rejects placeholder residue", () => {
    const note = goodNote().replace("Taxi\n问题类型", "{目标}\n问题类型");
    expect(errorsFor(note).some((error) => error.includes("占位符"))).toBe(true);
  });

  test("rejects qualifiers inside the core", () => {
    const note = goodNote()
      .replace("核心：把人从 A 点送到 B 点", "核心：（安全地）把人从 A 点送到 B 点")
      .replace(
        "完整：（面向乘客，按需、安全、舒适地）把人从 A 点送到 B 点",
        "完整：（面向乘客） （安全地）把人从 A 点送到 B 点",
      );
    expect(errorsFor(note).some((error) => error.includes("不能包含括号"))).toBe(true);
  });

  test("rejects a core over 30 Unicode characters", () => {
    const longCore = "把一个处于地点甲且需要立刻出发的人安全稳定舒适顺利地送到非常遥远的地点乙";
    const note = goodNote()
      .replace("把人从 A 点送到 B 点", longCore)
      .replace("把人从 A 点送到 B 点", longCore);
    expect(errorsFor(note).some((error) => error.includes("30"))).toBe(true);
  });

  test("rejects a directionless generic noun", () => {
    const note = goodNote()
      .replace("把人从 A 点送到 B 点", "价值")
      .replace("把人从 A 点送到 B 点", "价值");
    expect(errorsFor(note).some((error) => error.includes("泛化名词"))).toBe(true);
  });

  test("rejects Markdown links", () => {
    const note = goodNote().replace("Taxi\n问题类型", "[Taxi](https://example.com)\n问题类型");
    expect(errorsFor(note).some((error) => error.includes("Markdown 链接"))).toBe(true);
  });

  test("rejects a malformed Denote filename", () => {
    expect(errorsFor(goodNote(), "/tmp/taxi.org").some((error) => error.includes("文件名"))).toBe(true);
  });
});
