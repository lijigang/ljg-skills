import { describe, expect, test } from "bun:test";
import { validate } from "./validate_note";

const filename = "20260812T120000--拆书-示例__book.org";
const defaultHeadings = [
  "四句话摆在眼前，你会不会点头",
  "遮住最后一句，证据突然少了一块",
  "再看同一句话，你开始等哪种证据",
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
      ? options.firstBody ?? "四句话摆在小李面前。他顺着前三句的危险感点了头。遮住最后一句，他才发现前三句只能证明问题严重。这就叫理由还没有走到结论。"
      : index === headings.length - 1
        ? "回到同一句话，小李不急着赞成或反对。他现在会先问，哪一种比较结果能证明处罚真的更有效。"
        : "一份地区比较放回原来的判断。处罚变重以后事故没有下降，刚才那一下点头停住了。也就是说，问题严重不等于这个办法有效。";
    return `* ${heading}\n\n${body}\n`;
  }).join("\n");

  return `#+TITLE: 拆书：《示例》
#+SUBTITLE: 某作者 | 同一句结论为什么开始等待证据
${options.description === "" ? "" : `#+DESCRIPTION: ${options.description ?? "四句话让人顺势点头；遮住最后一句，理由与结论之间的缺口显出来。"}\n`}#+DATE: [2026-08-12 Wed 12:00]
#+FILETAGS: :book:test:
#+IDENTIFIER: ${options.identifier ?? "20260812T120000"}

${options.opening ?? ""}${bodies}
${options.diagram ?? ""}${options.tail ?? ""}`;
}

function coverage(grade: "完整拆书" | "初拆" | "假设版" = "完整拆书", support = "是——原书有完整选择实验"): string {
  const boundary = `# ljg-book 后台覆盖记录

## 材料边界
- 材料等级：${grade}
- 主要材料：原书全文与作者访谈
- 能支持到：支持核心机制与边界，不延伸到作者未讨论的领域
- 材料能否支撑具体运行：${support}

## 读者运行门
- 读者先问什么：为什么同一句结论听起来很顺
- 稳定对象或最小模型：四句话组成的手机政策论证
- 读者第一次会猜什么：问题严重，所以处罚应该更重
- 最小动作或变化：遮住最后一句，只看前三句
- 立刻出现的结果：前三句只能证明问题存在
- 结果紧接着叫什么：理由与结论之间还有缺口
- 同一对象怎样再运行：放入比较证据后重新判断是否升级处罚
- 陌生读者能怎样复述：问题严重不等于某个办法已经有效
- 原书依据与简化边界：案例来自原书，只压缩措辞，不增加结果
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

## 全书取舍
- 贯穿全书的普通问题：什么时候一句结论才值得相信
- 正文保留哪两到四个关系：理由与结论、比较证据、替代解释
- 为什么这些关系足以让读者理解全书主干：它们让同一判断从直觉走到带条件行动
- 哪些重要内容留在后台而不进入正文：证据类型清单与全部谬误名称
- 各模块如何继续使用同一对象，或为什么必须换对象：始终回到手机政策论证重做判断

## 反证检查
- 当前理解：表述改变参照点
- 反证：熟练者可能不变
- 处理：限定适用条件
`;
}

function legacyCoverage(): string {
  return `# 旧覆盖
- 材料等级：初拆
- 主要材料：旧笔记
- 能支持到：支持局部理解
- 镜头站在哪里：方案摆在眼前
- 读者或人物先看见什么：两组数字
- 解释出现前会怎样判断或行动：先选确定方案
- 这个判断先产生什么可见结果：换说法后改选
- 哪条证据、事件或对象反馈打断它：概率没有变化
- 命名以后回到哪一幕重跑：回到原方案
- 原书依据与简化边界：只压缩原案例
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

小李先选确定方案，换一种表述后却改选冒险方案。这就是参照点在移动。

# 同一决定怎样重新问一遍

他现在会先检查参照条件，再决定怎样行动。
`;
}

describe("validate ljg-book note", () => {
  test("accepts the new runnable full-book contract", () => {
    const result = validate(note(), filename, coverage());
    expect(result.ok).toBe(true);
    expect(result.checks.material_grade).toBe("完整拆书");
    expect(result.checks.coverage_zones).toBe(4);
    expect(result.checks.coverage_runnable_fields).toBe(9);
    expect(result.checks.coverage_book_selection_fields).toBe(5);
    expect(result.checks.runnable_support).toContain("是");
    expect(result.checks.coverage_loop_fields).toBe(0);
    expect(result.checks.coverage_concretization_fields).toBe(0);
    expect(result.checks.immediate_naming_hits).toBeGreaterThan(0);
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
        "四句话摆在眼前，你会不会点头",
        "遮住最后一句，证据突然少了一块",
        "一份比较结果怎样改变选择",
        "再看同一句话，你开始等哪种证据",
      ].slice(0, count);
      const result = validate(note({ headings }), filename, coverage());
      expect(result.ok).toBe(true);
      expect(result.checks.top_headings).toBe(count);
    });
  }

  test("rejects fewer than two top headings", () => {
    const result = validate(note({ headings: ["四句话摆在眼前，你会不会点头"] }), filename, coverage());
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("至少需要 2 个");
  });

  test("rejects old fixed or generic headings", () => {
    const result = validate(note({ headings: ["走进这个问题", "问题"] }), filename, coverage());
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("旧框架或空泛标签");
  });

  test("rejects visible backstage fields and missing description", () => {
    const calibration = validate(note({ tail: "\n* 资料校准\n\n- 某来源\n" }), filename, coverage());
    const grade = validate(note({ tail: "\n- 材料等级：完整拆书\n" }), filename, coverage());
    const description = validate(note({ description: "" }), filename, coverage());
    expect(calibration.ok).toBe(false);
    expect(grade.ok).toBe(false);
    expect(description.ok).toBe(false);
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

  test("rejects identifier mismatch and missing coverage", () => {
    const mismatch = validate(note({ identifier: "20260812T120001" }), filename, coverage());
    const missing = validate(note(), filename);
    expect(mismatch.ok).toBe(false);
    expect(missing.ok).toBe(false);
  });

  test("requires source boundary and valid material grade", () => {
    const boundary = validate(note(), filename, coverage("初拆").replace("- 能支持到：支持核心机制与边界，不延伸到作者未讨论的领域", "- 能支持到："));
    const grade = validate(note(), filename, coverage("初拆").replace("材料等级：初拆", "材料等级：大概读过"));
    expect(boundary.ok).toBe(false);
    expect(grade.ok).toBe(false);
  });

  test("requires yes or no for runnable material support", () => {
    const result = validate(note(), filename, coverage("初拆", "也许可以"));
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("必须明确写是或否");
  });

  test("requires all runnable fields when material says yes", () => {
    const incomplete = coverage("初拆").replace("- 同一对象怎样再运行：放入比较证据后重新判断是否升级处罚", "- 同一对象怎样再运行：");
    const result = validate(note(), filename, incomplete);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("没有填完普通问题、稳定对象");
  });

  test("allows an honest no while warning against fabricated scenes", () => {
    const thin = coverage("初拆", "否——只有目录，没有可还原的动作与结果")
      .replace("- 稳定对象或最小模型：四句话组成的手机政策论证", "- 稳定对象或最小模型：")
      .replace("- 最小动作或变化：遮住最后一句，只看前三句", "- 最小动作或变化：");
    const result = validate(note(), filename, thin);
    expect(result.ok).toBe(true);
    expect(result.warnings.join("\n")).toContain("材料不足以支撑具体运行");
  });

  test("keeps legacy coverage readable with a migration warning", () => {
    const result = validate(note(), filename, legacyCoverage());
    expect(result.ok).toBe(true);
    expect(result.checks.runnable_support).toBe("legacy");
    expect(result.checks.coverage_embodiment_fields).toBe(7);
    expect(result.warnings.join("\n")).toContain("旧版现场化门");
  });

  test("rejects incomplete full-book evidence, candidates, selection, and challenge", () => {
    const zone = validate(note(), filename, coverage().replace("[boundary]", "[missing]"));
    const candidate = validate(note(), filename, coverage().replace("名称：E｜位置：5", "名称：｜位置：5"));
    const selection = validate(note(), filename, coverage().replace("- 各模块如何继续使用同一对象，或为什么必须换对象：始终回到手机政策论证重做判断", "- 各模块如何继续使用同一对象，或为什么必须换对象："));
    const challenge = validate(note(), filename, coverage().replace("- 处理：限定适用条件", "- 处理："));
    expect(zone.ok).toBe(false);
    expect(candidate.ok).toBe(false);
    expect(selection.ok).toBe(false);
    expect(challenge.ok).toBe(false);
  });

  for (const opening of ["书中给出一段手机论证。", "叙述者带着儿子骑摩托车远行。"] as const) {
    test(`warns when the opening camera stays outside: ${opening}`, () => {
      const result = validate(note({ firstBody: opening }), filename, coverage());
      expect(result.ok).toBe(true);
      expect(result.checks.outside_camera_opening_hits).toBe(1);
    });
  }

  test("warns when backstage stage directions or controlled comparisons leak", () => {
    const stage = validate(note({ firstBody: "小李读完四句话。这一步汇集了全书对证据的盘问。" }), filename, coverage());
    const comparison = validate(note({ firstBody: "小李先点头。保留同一组数字，只改变表达方式，选择随即翻转。" }), filename, coverage());
    expect(stage.checks.meta_narration_hits).toBe(1);
    expect(comparison.checks.meta_narration_hits).toBe(1);
  });

  test("rejects backstage evidence accounting inside the explanation", () => {
    const result = validate(note({
      firstBody: "这组纸条、杯子和薄书是讲解者依据旧稿局部关系构造的最小模型。它不是书中案例，也不是本轮真实材料测试，不能替钢材强度或工程结论作证。",
    }), filename, coverage());
    expect(result.ok).toBe(false);
    expect(result.checks.backstage_accounting_hits).toBeGreaterThan(0);
    expect(result.errors.join("\n")).toContain("后台核验语言");
  });

  test("rejects recurring model-management phrases from the reported note", () => {
    const result = validate(note({
      firstBody: "继续运行同一讲解模型。按模型规则，纸条被重新折起。旧稿保存的边界没有变，本轮不替它补参数。模型设定到这里结束。",
    }), filename, coverage());
    expect(result.ok).toBe(false);
    expect(result.checks.backstage_accounting_hits).toBeGreaterThanOrEqual(5);
  });

  test("accepts an in-scene boundary stated through the object's limits", () => {
    const result = validate(note({
      firstBody: "桌上有十二根同样长、同样宽的纸条。把它们折成三角格，再首尾接起来。薄书还没放上去，先猜一猜：材料一样、数量一样，它们托得住的重量会一样吗？纸条不会告诉你钢梁能承受多少吨，却已经把问题拨正：决定结果的不只有材料，还有材料怎样连成一个整体。",
    }), filename, coverage());
    expect(result.ok).toBe(true);
    expect(result.checks.backstage_accounting_hits).toBe(0);
  });

  test("recognizes an opening that runs and names a result", () => {
    const result = validate(note(), filename, coverage());
    expect(result.checks.outside_camera_opening_hits).toBe(0);
    expect(result.checks.meta_narration_hits).toBe(0);
    expect(result.checks.immediate_naming_hits).toBeGreaterThan(0);
  });

  test("warns when no result receives an adjacent name", () => {
    const result = validate(note({
      firstBody: "四句话摆在小李面前。他顺着危险感点了头。后来他又考虑了许多别的因素。",
      headings: ["四句话摆在眼前", "后来又有很多因素"],
    }), filename, coverage());
    expect(result.ok).toBe(true);
    expect(result.checks.immediate_naming_hits).toBe(0);
    expect(result.warnings.join("\n")).toContain("结果后立即命名");
  });

  test("warns on an overloaded paragraph and sentence", () => {
    const dense = "小李看着同一组数字，" + "一个关系又带出另一个关系，".repeat(24) + "这就是概念拥挤。";
    const result = validate(note({ firstBody: dense }), filename, coverage());
    expect(result.ok).toBe(true);
    expect(result.checks.dense_paragraph_hits).toBeGreaterThan(0);
    expect(result.checks.long_sentence_hits).toBeGreaterThan(0);
  });

  test("rejects an over-wide ASCII diagram", () => {
    const diagram = `#+begin_example\n${"中".repeat(41)}\n#+end_example\n`;
    const result = validate(note({ diagram }), filename, coverage());
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("超过 80");
  });
});
