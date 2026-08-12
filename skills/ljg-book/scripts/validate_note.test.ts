import { describe, expect, test } from "bun:test";
import { validate } from "./validate_note";

const filename = "20260812T120000--拆书-示例__book.org";
const defaultHeadings = [
  "为什么换一种说法，选择就翻了",
  "人先站在哪里，再看得到失",
  "同一决定怎样重新问一遍",
];

function note(options: {
  identifier?: string;
  opening?: string;
  firstBody?: string;
  headings?: string[];
  diagram?: string;
  description?: string;
  tail?: string;
} = {}): string {
  const headings = options.headings ?? defaultHeadings;
  const bodies = headings.map((heading, index) => {
    const body = index === 0
      ? options.firstBody ?? "小李要在两个方案中选一个。他按最自然的办法作出选择，结果却和自己的目标相反。"
      : index === headings.length - 1
        ? "回到原来的选择，小李现在会先检查参照条件，再决定怎样行动。"
        : "他先看见一个遗漏的条件。把它放回原来的选择，结果立刻改变。新的结果又露出另一个问题，于是他继续检查角色之间的关系。";
    return `* ${heading}\n\n${body}\n`;
  }).join("\n");

  return `#+TITLE: 拆书：《示例》
#+SUBTITLE: 某作者 | 一次判断变化
${options.description === "" ? "" : `#+DESCRIPTION: ${options.description ?? "同一组结果换一种说法，选择为什么会翻转。"}\n`}#+DATE: [2026-08-12 Wed 12:00]
#+FILETAGS: :book:test:
#+IDENTIFIER: ${options.identifier ?? "20260812T120000"}

${options.opening ?? ""}${bodies}
${options.diagram ?? ""}${options.tail ?? ""}`;
}

function coverage(grade: "完整拆书" | "初拆" | "假设版" = "完整拆书"): string {
  const boundary = `# ljg-book 后台覆盖记录

## 材料边界
- 材料等级：${grade}
- 主要材料：原书全文与作者访谈
- 能支持到：支持核心机制与边界，不延伸到作者未讨论的领域
`;
  if (grade !== "完整拆书") return boundary;

  return `${boundary}
## 作者自述
- 问题：为什么选择会翻转
- 对象：风险判断
- 方法：对照两种说法

## 全书证据
- [question] 位置：loc-01｜作者为什么非处理这个问题不可：选择翻转｜证据：案例
- [setup] 位置：loc-20｜对象和基本区分怎样建立：参照点｜证据：定义
- [mechanism] 位置：loc-50｜核心机制或做法怎样运行：损失厌恶｜证据：实验
- [boundary] 位置：loc-90｜最后形成什么、停在哪里：条件限制｜证据：反例

## 候选部件
- [candidate] 名称：A｜位置：1｜解决的问题：a｜与其他部件的关系：a｜决定：保留｜删除测试：不能删
- [candidate] 名称：B｜位置：2｜解决的问题：b｜与其他部件的关系：b｜决定：保留｜删除测试：不能删
- [candidate] 名称：C｜位置：3｜解决的问题：c｜与其他部件的关系：c｜决定：保留｜删除测试：不能删
- [candidate] 名称：D｜位置：4｜解决的问题：d｜与其他部件的关系：d｜决定：保留｜删除测试：不能删
- [candidate] 名称：E｜位置：5｜解决的问题：e｜与其他部件的关系：e｜决定：保留｜删除测试：不能删

## 例子回流
- 处境：两个方案
- 贯穿张力：同一结果为什么带出不同选择
- 最自然的理解或反应：选确定方案
- 得到的结果：换种说法后选择翻转
- 证据或事件暴露的缺口：概率没变却无法解释翻转
- 被改写的是 x / R / f / E 中哪一项：R，判断参照改变
- 改写后的结果：得失重新呈现
- 下一场景：谁决定参照点
- 最后回到哪里：重新表述最初方案

## 反证检查
- 当前理解：表述改变参照点
- 反证：熟练者可能不变
- 处理：限定适用条件
`;
}

function markdownNote(): string {
  return `title: 拆书：《示例》
subtitle: 某作者 | 一次判断变化
description: 同一组结果换一种说法，选择为什么会翻转。
date: 2026-08-12
tags: book,test
identifier: 20260812T120000

# 为什么换一种说法，选择就翻了

小李先选确定方案，换一种表述后却改选冒险方案。

# 同一决定怎样重新问一遍

他现在会先检查参照条件，再决定怎样行动。
`;
}

describe("validate ljg-book note", () => {
  test("accepts three content-led headings", () => {
    const result = validate(note(), filename, coverage());
    expect(result.ok).toBe(true);
    expect(result.checks.top_headings).toBe(3);
    expect(result.checks.material_grade).toBe("完整拆书");
    expect(result.checks.coverage_zones).toBe(4);
  });

  test("keeps Markdown notes on the same contract", () => {
    const result = validate(markdownNote(), filename.replace(/\.org$/, ".md"), coverage("初拆"));
    expect(result.ok).toBe(true);
    expect(result.checks.format).toBe("markdown");
    expect(result.checks.top_headings).toBe(2);
  });

  for (const count of [2, 4] as const) {
    test(`accepts ${count} content-led headings`, () => {
      const headings = [
        "为什么换一种说法，选择就翻了",
        "人先站在哪里，再看得到失",
        "谁在悄悄移动参照点",
        "同一决定怎样重新问一遍",
      ].slice(0, count);
      const result = validate(note({ headings }), filename, coverage());
      expect(result.ok).toBe(true);
      expect(result.checks.top_headings).toBe(count);
    });
  }

  test("rejects fewer than two top headings", () => {
    const result = validate(note({ headings: ["为什么换一种说法，选择就翻了"] }), filename, coverage());
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("至少需要 2 个");
  });

  test("rejects the old fixed headings", () => {
    const result = validate(note({ headings: ["走进这个问题", "作者怎样一步步看见", "回到现实", "资料校准"] }), filename, coverage());
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("旧框架");
  });

  test("rejects an exact generic heading without rejecting a specific question", () => {
    const rejected = validate(note({ headings: ["问题", "问题为什么越来越大"] }), filename, coverage());
    const accepted = validate(note({ headings: ["问题为什么越来越大", "同一办法怎样制造第二个问题"] }), filename, coverage());
    expect(rejected.ok).toBe(false);
    expect(rejected.errors.join("\n")).toContain("空泛标签");
    expect(accepted.ok).toBe(true);
  });

  test("rejects a visible research-calibration label", () => {
    const result = validate(note({ tail: "\n* 资料校准\n\n- 某来源\n" }), filename, coverage());
    expect(result.ok).toBe(false);
    expect(result.checks.calibration_hits).toBeGreaterThan(0);
  });

  test("rejects a visible material-grade field", () => {
    const result = validate(note({ tail: "\n- 材料等级：完整拆书\n" }), filename, coverage());
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("只能写在后台");
  });

  test("requires a description", () => {
    const result = validate(note({ description: "" }), filename, coverage());
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("#+DESCRIPTION");
  });

  test("rejects exposed x/R/f/E labels", () => {
    const result = validate(note({ opening: "- *x*：处境\n- *R*：理解\n- *f*：行动\n- *E*：证据\n\n" }), filename, coverage());
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("x/R/f/E");
  });

  for (const label of ["前言先交代了问题。", "作者在第3章给出例子。", "这些章节依次展开。"] as const) {
    test(`rejects source-structure prose: ${label}`, () => {
      const result = validate(note({ firstBody: label }), filename, coverage());
      expect(result.ok).toBe(false);
      expect(result.errors.join("\n")).toContain("来源结构标签");
    });
  }

  test("rejects an identifier mismatch", () => {
    const result = validate(note({ identifier: "20260812T120001" }), filename, coverage());
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("与文件名");
  });

  test("requires a backstage coverage record", () => {
    const result = validate(note(), filename);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("所有拆书都必须提供");
  });

  test("rejects a complete coverage record missing one evidence zone", () => {
    const result = validate(note(), filename, coverage().replace("[boundary]", "[missing]"));
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("四类证据");
  });

  test("rejects a complete evidence zone whose location is blank", () => {
    const result = validate(note(), filename, coverage().replace("位置：loc-90", "位置："));
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("四类证据");
  });

  test("does not count an unlocated evidence zone as covered", () => {
    const result = validate(note(), filename, coverage().replace("位置：loc-90", "位置：未找到"));
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("四类证据");
  });

  test("rejects an unfilled candidate placeholder", () => {
    const result = validate(note(), filename, coverage().replace("名称：E｜位置：5", "名称：｜位置：5"));
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("候选部件必须填完");
  });

  test("rejects a complete coverage record with an empty loop field", () => {
    const result = validate(note(), filename, coverage().replace("- 最后回到哪里：重新表述最初方案", "- 最后回到哪里："));
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("一路回流到返程");
  });

  for (const grade of ["初拆", "假设版"] as const) {
    test(`accepts minimal backstage coverage for ${grade}`, () => {
      const result = validate(note(), filename, coverage(grade));
      expect(result.ok).toBe(true);
      expect(result.checks.material_grade).toBe(grade);
      expect(result.checks.coverage_zones).toBe(0);
    });
  }

  test("rejects coverage missing a shared source-boundary field", () => {
    const result = validate(note(), filename, coverage("初拆").replace("- 能支持到：支持核心机制与边界，不延伸到作者未讨论的领域", "- 能支持到："));
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("主要材料与能支持到哪里");
  });

  test("rejects an invalid backstage material grade", () => {
    const result = validate(note(), filename, coverage("初拆").replace("材料等级：初拆", "材料等级：大概读过"));
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("完整拆书 / 初拆 / 假设版");
  });

  test("rejects an over-wide ASCII diagram", () => {
    const diagram = `#+begin_example\n${"中".repeat(41)}\n#+end_example\n`;
    const result = validate(note({ diagram }), filename, coverage());
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("超过 80");
  });
});
