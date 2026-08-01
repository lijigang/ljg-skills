import { describe, expect, test } from "bun:test";
import { validateNoteText } from "./ValidateNote";

const filePath = "/tmp/20260801T010203--本质-taxi__is.org";
const markdownFilePath = "/tmp/20260801T010203--本质-taxi__is.md";

function goodNote(): string {
  return `#+title: 本质：Taxi
#+date: [2026-08-01 Sat 01:02]
#+identifier: 20260801T010203
#+filetags: :is:

* 问题
容易误认：把按需叫车、安全舒适和汽车这种实现当成 Taxi 的本质
真正问题：乘客最终从什么位置状态到什么位置状态？

* 完整表达
完整：（面向乘客，按需、安全、舒适地）把人从 A 点送到 B 点

* 剥离
- *主体/边界*：面向乘客和出行场景，只限定为谁、在哪里
- *实现*：按需叫车、付费和汽车可以替换
- *质量/优化*：安全、舒适只决定做得怎样
- *状态式*：人：地点 A -> 地点 B

* 本质
核心：把人从 A 点送到 B 点

* 示例
- *代入*：你下班后站在公司门口，想回到家
- *操作*：你叫车、上车、抵达家门口后下车
- *变化*：你：公司门口 -> 家门口
- *点题*：你刚刚真正完成的是「把人从 A 点送到 B 点」；车型、价格和舒适度只是实现与质量

* 验证
- *替换*：换成公交车或步行，核心仍然成立
- *删除*：再删「人」或起终点，就会失去对象或方向
`;
}

function goodMarkdownNote(): string {
  return `---
title: 本质：Taxi
date: 2026-08-01 01:02
identifier: 20260801T010203
tags: [is]
---

# 问题
容易误认：把按需叫车、安全舒适和汽车这种实现当成 Taxi 的本质
真正问题：乘客最终从什么位置状态到什么位置状态？

# 完整表达
完整：（面向乘客，按需、安全、舒适地）把人从 A 点送到 B 点

# 剥离
- **主体/边界**：面向乘客和出行场景，只限定为谁、在哪里
- **实现**：按需叫车、付费和汽车可以替换
- **质量/优化**：安全、舒适只决定做得怎样
- **状态式**：人：地点 A -> 地点 B

# 本质
核心：把人从 A 点送到 B 点

# 示例
- **代入**：你下班后站在公司门口，想回到家
- **操作**：你叫车、上车、抵达家门口后下车
- **变化**：你：公司门口 -> 家门口
- **点题**：你刚刚真正完成的是「把人从 A 点送到 B 点」；车型、价格和舒适度只是实现与质量

# 验证
- **替换**：换成公交车或步行，核心仍然成立
- **删除**：再删「人」或起终点，就会失去对象或方向
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
    const note = goodMarkdownNote().replace("# 问题", "* 问题");
    expect(validateNoteText(markdownFilePath, note).errors.some((error) => error.includes("Org"))).toBe(true);
  });

  test("rejects the old goal section", () => {
    const note = goodNote().replace("* 问题", "* 目标");
    expect(errorsFor(note).some((error) => error.includes("一级标题"))).toBe(true);
  });

  test("rejects the constant question type field", () => {
    const note = goodNote().replace(
      "真正问题：乘客最终从什么位置状态到什么位置状态？",
      "真正问题：乘客最终从什么位置状态到什么位置状态？\n问题类型：目的本质",
    );
    expect(errorsFor(note).some((error) => error.includes("问题类型"))).toBe(true);
  });

  test("rejects an empty confusion field", () => {
    const note = goodNote().replace(
      "容易误认：把按需叫车、安全舒适和汽车这种实现当成 Taxi 的本质",
      "容易误认：",
    );
    expect(errorsFor(note).some((error) => error.includes("容易误认"))).toBe(true);
  });

  test("rejects a missing real-question field", () => {
    const note = goodNote().replace("真正问题：乘客最终从什么位置状态到什么位置状态？\n", "");
    expect(errorsFor(note).some((error) => error.includes("真正问题"))).toBe(true);
  });

  test("rejects the legacy plain peel format", () => {
    const note = goodNote().replace(
      "- *主体/边界*：面向乘客和出行场景，只限定为谁、在哪里",
      "- 限定：面向乘客和出行场景",
    );
    expect(errorsFor(note).some((error) => error.includes("强调关键词"))).toBe(true);
  });

  test("rejects a peel section without a qualifier category", () => {
    const note = goodNote().replace(
      "- *主体/边界*：面向乘客和出行场景，只限定为谁、在哪里\n- *实现*：按需叫车、付费和汽车可以替换\n- *质量/优化*：安全、舒适只决定做得怎样\n",
      "",
    );
    expect(errorsFor(note).some((error) => error.includes("限定"))).toBe(true);
  });

  test("rejects a non-final state bullet", () => {
    const note = goodNote().replace(
      "- *质量/优化*：安全、舒适只决定做得怎样\n- *状态式*：人：地点 A -> 地点 B",
      "- *状态式*：人：地点 A -> 地点 B\n- *质量/优化*：安全、舒适只决定做得怎样",
    );
    expect(errorsFor(note).some((error) => error.includes("收尾"))).toBe(true);
  });

  test("rejects a state bullet without an arrow", () => {
    const note = goodNote().replace("人：地点 A -> 地点 B", "人从地点 A 到地点 B");
    expect(errorsFor(note).some((error) => error.includes("必须包含 ->"))).toBe(true);
  });

  test("rejects the legacy scene and explanation example", () => {
    const note = goodNote().replace(
      "- *代入*：你下班后站在公司门口，想回到家\n- *操作*：你叫车、上车、抵达家门口后下车\n- *变化*：你：公司门口 -> 家门口\n- *点题*：你刚刚真正完成的是「把人从 A 点送到 B 点」；车型、价格和舒适度只是实现与质量",
      "场景：小李从公司回到家\n这说明：他完成了一段位移",
    );
    expect(errorsFor(note).some((error) => error.includes("代入 / 操作 / 变化 / 点题"))).toBe(true);
  });

  test("rejects an example that does not put the reader in second person", () => {
    const note = goodNote().replace(
      "- *代入*：你下班后站在公司门口，想回到家",
      "- *代入*：小李下班后站在公司门口，想回到家",
    );
    expect(errorsFor(note).some((error) => error.includes("第二人称"))).toBe(true);
  });

  test("rejects a missing operation step", () => {
    const note = goodNote().replace("- *操作*：你叫车、上车、抵达家门口后下车\n", "");
    expect(errorsFor(note).some((error) => error.includes("代入 / 操作 / 变化 / 点题"))).toBe(true);
  });

  test("rejects an operation that does not involve the reader", () => {
    const note = goodNote().replace(
      "- *操作*：你叫车、上车、抵达家门口后下车",
      "- *操作*：车辆从公司门口驶到家门口",
    );
    expect(errorsFor(note).some((error) => error.includes("执行或观察"))).toBe(true);
  });

  test("rejects an example change without an arrow", () => {
    const note = goodNote().replace("你：公司门口 -> 家门口", "你从公司门口回到家门口");
    expect(errorsFor(note).some((error) => error.includes("变化"))).toBe(true);
  });

  test("rejects a point that does not map back to the exact core", () => {
    const note = goodNote().replace(
      "你刚刚真正完成的是「把人从 A 点送到 B 点」",
      "你刚刚真正完成的是「完成一段位移」",
    );
    expect(errorsFor(note).some((error) => error.includes("逐字包含最终核心"))).toBe(true);
  });

  test("rejects extra visible validation tests", () => {
    const note = goodNote().replace(
      "- *删除*：再删「人」或起终点，就会失去对象或方向",
      "- *删除*：再删「人」或起终点，就会失去对象或方向\n- *过度压缩*：「运输」丢掉完成态",
    );
    expect(errorsFor(note).some((error) => error.includes("替换 / 删除"))).toBe(true);
  });

  test("rejects validation bullets without emphasis", () => {
    const note = goodNote().replace("- *替换*：换成公交车或步行，核心仍然成立", "- 替换：换成公交车或步行，核心仍然成立");
    expect(errorsFor(note).some((error) => error.includes("替换 / 删除"))).toBe(true);
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
    const note = goodNote().replace(
      "容易误认：把按需叫车、安全舒适和汽车这种实现当成 Taxi 的本质",
      "# 容易误认：把按需叫车、安全舒适和汽车这种实现当成 Taxi 的本质",
    );
    expect(errorsFor(note).some((error) => error.includes("Markdown"))).toBe(true);
  });

  test("rejects placeholder residue", () => {
    const note = goodNote().replace(
      "容易误认：把按需叫车、安全舒适和汽车这种实现当成 Taxi 的本质",
      "容易误认：{最容易误认的内容}",
    );
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
    const note = goodNote().replace(
      "容易误认：把按需叫车、安全舒适和汽车这种实现当成 Taxi 的本质",
      "容易误认：[按需叫车](https://example.com) 是本质",
    );
    expect(errorsFor(note).some((error) => error.includes("Markdown 链接"))).toBe(true);
  });

  test("rejects a malformed Denote filename", () => {
    expect(errorsFor(goodNote(), "/tmp/taxi.org").some((error) => error.includes("文件名"))).toBe(true);
  });
});
