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
  essenceHeading?: string;
  essenceBody?: string;
  omitEssence?: boolean;
  afterEssence?: string;
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
  const essence = options.omitEssence ? "" : `
* ${options.essenceHeading ?? "读完后留下什么"}

${options.essenceBody ?? "问题很严重，并不能直接推出处罚有效。这本书真正想留下的是：判断一项主张时，先找理由与结论之间缺少的那一步，再等能补上它的比较证据。"}
`;

  return `#+TITLE: 拆书：《示例》
#+SUBTITLE: 某作者 | 同一句结论为什么开始等待证据
${options.description === "" ? "" : `#+DESCRIPTION: ${options.description ?? "四句话让人顺势点头；遮住最后一句，理由与结论之间的缺口显出来。"}\n`}#+DATE: [2026-08-12 Wed 12:00]
#+FILETAGS: :book:test:
#+IDENTIFIER: ${options.identifier ?? "20260812T120000"}

${options.opening ?? ""}${bodies}
${options.diagram ?? ""}${options.tail ?? ""}${essence}${options.afterEssence ?? ""}`;
}

function coverage(
  grade: "完整拆书" | "初拆" | "假设版" = "完整拆书",
  support = "是——原书足以还原判断怎样被证据改变",
  contract: "legacy" | "2" = "legacy",
): string {
  const contractVersion = contract === "2" ? "- 覆盖合同版本：2\n" : "";
  const generatorContract = contract === "2" ? `
## 解释生成器门
- 是否存在全书生成器：是——理由与结论之间的缺口生成了全书后续追问
- 全书生成器：自然点头 → 遮住结论 → 暴露理由缺口 → 等待效果证据 → 排除替代原因
- 输入、起点或当前状态：读者看到四句话后顺势赞成加重处罚
- 结果方向或终点：读者能够指出结论还缺哪一种证据
- 生成器怎样贯穿至少两个远距转折：开头遮住结论发现缺口，结尾回到原句等待比较结果
- 生成器在哪些条件、范围或层级失效：材料已经直接提供效果比较时，不再需要从理由缺口起步
- 正文生成器锚点：理由还没有走到结论
- 生成器是否需要在前两个一级标题内运行：是——分析书应先交付读懂后续案例所需的判断关系
- 是否需要视觉表示：否——理由链用同一句话重跑即可看清，不依赖空间位置
- 视觉表示后用哪个载体运行：不需要——正文直接重跑四句话

## 前台载体门
- [frontstage] 名称：四句话｜唯一职责：让自然点头真实失效｜设置或起点：前三句说问题严重，第四句主张加重处罚｜结果或后果：遮住第四句后，处罚结论失去支持｜改变的关系：问题存在与办法有效被分开｜下一问：什么证据能证明处罚有效
- [frontstage] 名称：比较结果｜唯一职责：把效果证据放回原判断｜设置或起点：相近地区提高处罚后事故没有下降｜结果或后果：读者停止顺势赞成处罚｜改变的关系：理由缺口获得可检验的证据类型｜下一问：还有哪些替代原因
` : "";
  const boundary = `# ljg-book 后台覆盖记录

## 材料边界
${contractVersion}- 材料等级：${grade}
- 主要材料：原书全文与作者访谈
- 能支持到：支持核心机制与边界，不延伸到作者未讨论的领域
- 材料能否支撑认识更新路径：${support}

## 整书身份门
- 这是什么类型或形态的书：一本让普通读者亲手检查论证的分析书
- 字面上跟着谁、什么对象或什么问题展开：跟着群里的四句话检验政策主张
- 起点、主要变化与终点：从顺势点头，到遮住结论发现缺口，再等待比较结果
- 不可省略的主线：四句话的理由链与处罚效果证据
- 主线为什么属于同一本书：前者提出结论，后者决定结论能否成立
- 正文必须出现的整书锚点：四句话｜处罚｜比较结果
- 三十秒整书复述：一组政策主张怎样从直觉点头走到等待效果证据
- 可迁移性反测：若替换四句话、处罚与比较结果，复述就不再指向这本书

## 认识更新门
- 读者进入什么具体处境：群里转来四句话，最后一句主张加重处罚
- 最初最自然会怎样理解：问题严重，所以处罚应该更重
- 哪个事实、事件或结果让它不够：遮住结论后，前三句只能证明问题存在
- 作者增加了什么关系或条件：理由与政策结论之间还需要效果证据
- 回看原处境，什么已经改变：重新看到结论时会先等比较结果
- 新结果自然带出什么问题：还要排除哪些替代原因
- 贯穿全文的扶手：同一句政策主张是否已经得到足够支持
- 结尾回到哪里：回到群里的四句话重新判断
- 陌生读者能怎样复述：问题严重不等于某个办法已经有效
- 原书依据与简化边界：案例来自原书，只压缩措辞，不增加结果
${generatorContract}

## 精神内核门
- 作者最后只想留下什么：问题严重不等于处罚有效，理由与结论之间缺的那一步必须由比较证据补上
- 正文中哪两个相隔较远的转折共同托住它：开头四句话让人自然点头；结尾回到同一句话等待比较结果
- 是否需要回答书名：否——《示例》只是测试占位标题，不承载核心关系
- 精神内核可替换性反测：保留四句话、处罚与比较结果之间的具体缺口，删掉它们就会退化成一般的批判性思考口号
`;
  if (grade !== "完整拆书") return boundary;

  return `${boundary}
## 作者的发现路径
- 作者一直在追问什么：为什么选择会翻转
- 作者用什么材料或经历逼近：对照两种说法与选择结果
- 最终改变了什么判断：判断结论时要检查中间缺失的关系

## 全书证据
- [starting-point] 位置：loc-01｜最初的处境、困惑或自然理解怎样建立：选择翻转｜证据：案例
- [pressure] 位置：loc-20｜什么使原来的理解不再够用：相同事实得到不同选择｜证据：对照
- [revision] 位置：loc-50｜作者增加了什么关系、条件或观看方式：参照点｜证据：实验
- [boundary] 位置：loc-90｜最后形成什么、停在哪里：条件限制｜证据：反例

## 候选部件
- [candidate] 名称：A｜位置：1｜解决的问题：a｜与其他部件的关系：a｜决定：保留｜删除测试：不能删
- [candidate] 名称：B｜位置：2｜解决的问题：b｜与其他部件的关系：b｜决定：保留｜删除测试：不能删
- [candidate] 名称：C｜位置：3｜解决的问题：c｜与其他部件的关系：c｜决定：保留｜删除测试：不能删
- [candidate] 名称：D｜位置：4｜解决的问题：d｜与其他部件的关系：d｜决定：保留｜删除测试：不能删
- [candidate] 名称：E｜位置：5｜解决的问题：e｜与其他部件的关系：e｜决定：保留｜删除测试：不能删

## 全书取舍
- 贯穿全书的困惑或张力：什么时候一句结论才值得相信
- 正文保留哪些必要转折：理由与结论、比较证据、替代解释
- 为什么这些转折足以让读者理解全书主干：它们让同一判断从直觉走到带条件行动
- 哪些重要内容留在后台而不进入正文：证据类型清单与全部谬误名称
- 每次转折怎样由前一结果带出下一问题：理由缺口要求效果证据，效果证据再要求排除替代原因

## 叙事连续性门
- 开篇留下的真实问题：问题严重是否足以推出加重处罚
- 转折链：直觉点头 → 遮住结论发现缺口 → 等待效果证据 → 排除替代原因
- 每次换场为什么不可提前：没有先发现理由缺口，比较结果就只是额外资料
- 换序测试：先给比较结果会让读者不知道它在补哪一个缺口
- 摘句拼接反测：只留下四句话、处罚和比较结果，会失去从直觉到证据要求的认识变化

## 反证检查
- 当前理解：表述改变参照点
- 反证：熟练者可能不变
- 处理：限定适用条件
`;
}

function legacyRunnableCoverage(): string {
  return `# 上一版覆盖
- 材料等级：初拆
- 主要材料：旧笔记
- 能支持到：支持局部理解
- 材料能否支撑具体运行：是——旧记录完整
- 读者先问什么：为什么会点头
- 稳定对象或最小模型：四句话
- 读者第一次会猜什么：应该加重处罚
- 最小动作或变化：遮住结论
- 立刻出现的结果：理由只证明问题严重
- 结果紧接着叫什么：理由与结论缺口
- 同一对象怎样再运行：加入效果证据
- 陌生读者能怎样复述：严重不等于办法有效
- 原书依据与简化边界：只压缩原例
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

function legacyFullCoverage(): string {
  return `${legacyCoverage()}
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

## 具象化门
- 核心动作或变化：参照点改变，选择方向随之翻转
- 原状态：救援方案用存活人数表达
- 只改变的关键条件或动作：把存活人数改成死亡人数
- 可见结果：多数人的选择从确定方案转向冒险方案
- 角色、动作、方向与结果怎样对应：数字不变，只改表达方向，选择随之翻转
- 失败或反例怎样划出边界：熟悉框架效应的人可能不翻转
- 删掉解释后，场景本身还能看见什么：同一组数字换个方向，选择就变了

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

小李先选确定方案，换一种表述后却改选冒险方案。这就是参照点在移动。

# 同一决定怎样重新问一遍

他现在会先检查参照条件，再决定怎样行动。

# 读完后留下什么

数字没变，判断却可能因为起点变了而翻转。这本书最后想留下的，是先看自己正从哪里比较，再决定眼前的选择是否真的不同。
`;
}

describe("validate ljg-book note", () => {
  test("accepts the dual whole-book identity and understanding-path contract", () => {
    const result = validate(note(), filename, coverage("完整拆书", "是——原书足以还原判断怎样被证据改变", "2"));
    expect(result.ok).toBe(true);
    expect(result.checks.material_grade).toBe("完整拆书");
    expect(result.checks.coverage_zones).toBe(4);
    expect(result.checks.coverage_whole_book_identity_fields).toBe(8);
    expect(result.checks.required_whole_book_anchor_count).toBe(3);
    expect(result.checks.required_whole_book_anchor_hits).toBe(3);
    expect(result.checks.missing_whole_book_anchors).toBe("");
    expect(result.checks.coverage_understanding_fields).toBe(10);
    expect(result.checks.coverage_runnable_fields).toBe(10);
    expect(result.checks.coverage_book_selection_fields).toBe(5);
    expect(result.checks.coverage_narrative_continuity_fields).toBe(5);
    expect(result.checks.coverage_candidate_count).toBe(5);
    expect(result.checks.coverage_generator_gate_present).toBe(true);
    expect(result.checks.generator_exists).toContain("是");
    expect(result.checks.coverage_generator_fields).toBe(8);
    expect(result.checks.generator_anchor_count).toBe(1);
    expect(result.checks.generator_anchor_hits).toBe(1);
    expect(result.checks.generator_early_anchor_hits).toBe(1);
    expect(result.checks.representation_required).toContain("否");
    expect(result.checks.frontstage_count).toBe(2);
    expect(result.checks.frontstage_complete_count).toBe(2);
    expect(result.checks.frontstage_missing_in_body).toBe("");
    expect(result.checks.frontstage_duplicate_responsibilities).toBe("");
    expect(result.checks.essence_heading_count).toBe(1);
    expect(result.checks.essence_is_last_heading).toBe(true);
    expect(result.checks.essence_paragraph_count).toBe(1);
    expect(result.checks.essence_sentence_count).toBe(2);
    expect(result.checks.essence_format_line_hits).toBe(0);
    expect(result.checks.coverage_essence_fields).toBe(4);
    expect(result.checks.coverage_title_answer).toContain("否");
    expect(result.checks.understanding_path_support).toContain("是");
    expect(result.checks.coverage_loop_fields).toBe(0);
    expect(result.checks.coverage_concretization_fields).toBe(0);
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

  test("requires a substantive final essence section", () => {
    const missing = validate(note({ omitEssence: true }), filename, coverage());
    const empty = validate(note({ essenceBody: "要多思考。" }), filename, coverage());
    expect(missing.ok).toBe(false);
    expect(missing.errors.join("\n")).toContain("最后必须有一级标题");
    expect(empty.ok).toBe(false);
    expect(empty.errors.join("\n")).toContain("主题词或口号");
  });

  test("requires the essence section to be last and rejects category lists", () => {
    const misplaced = validate(note({ afterEssence: "\n* 又补一个结论\n\n这段不该出现在精华之后。\n" }), filename, coverage());
    const oldLabels = validate(note({ essenceBody: "- *结构*：四句话先让人点头。\n- *洞见*：问题严重不等于办法有效。\n- *模型*：再等待比较结果。" }), filename, coverage());
    expect(misplaced.ok).toBe(false);
    expect(misplaced.errors.join("\n")).toContain("最后一个一级标题");
    expect(oldLabels.ok).toBe(false);
    expect(oldLabels.errors.join("\n")).toContain("不能写成分类清单");
  });

  test("allows the core to answer a load-bearing book title without listing anchors", () => {
    const result = validate(note({
      essenceBody: "所谓《表象与本质》，并不是越过表面去找一个永远不变的标签。真正的本质，是当前处境让我们从许多可能关系里抓住了哪一条。",
    }), filename, coverage().replace("- 是否需要回答书名：否——《示例》只是测试占位标题，不承载核心关系", "- 是否需要回答书名：是——书名把固定标签与当前关系的冲突放在一起"));
    expect(result.ok).toBe(true);
    expect(result.checks.essence_paragraph_count).toBe(1);
    expect(result.checks.coverage_title_answer).toContain("是");
  });

  test("rejects multiple essence paragraphs even when each is substantive", () => {
    const result = validate(note({
      essenceBody: "问题严重并不能直接推出处罚有效，理由与结论之间仍然缺少效果证据。\n\n真正的判断要等比较结果进入以后，才能知道这项办法是否值得采用。",
    }), filename, coverage());
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("只写一个自然段");
  });

  test("warns when the essence section stops being concise", () => {
    const longEssence = `四句话和处罚之间的关系需要反复检查，${"比较结果必须真正补上理由与结论之间缺失的联系，".repeat(6)}否则问题再严重也不能证明办法有效。`;
    const result = validate(note({ essenceBody: longEssence }), filename, coverage());
    expect(result.ok).toBe(true);
    expect(result.checks.essence_chars).toBeGreaterThan(160);
    expect(result.checks.essence_chars).toBeLessThanOrEqual(220);
    expect(result.warnings.join("\n")).toContain("可能还不够精练");
  });

  test("rejects an essence section that grows into another summary", () => {
    const bloated = `四句话和处罚之间的关系需要反复检查，${"比较结果必须真正补上理由与结论之间缺失的联系，".repeat(12)}否则问题再严重也不能证明办法有效。`;
    const result = validate(note({ essenceBody: bloated }), filename, coverage());
    expect(result.ok).toBe(false);
    expect(result.checks.essence_chars).toBeGreaterThan(220);
    expect(result.errors.join("\n")).toContain("变成另一份摘要");
  });

  test("requires the spiritual-core coverage and an explicit title decision", () => {
    const missing = validate(note(), filename, coverage().replace("- 正文中哪两个相隔较远的转折共同托住它：开头四句话让人自然点头；结尾回到同一句话等待比较结果", "- 正文中哪两个相隔较远的转折共同托住它："));
    const undecided = validate(note(), filename, coverage().replace("- 是否需要回答书名：否——《示例》只是测试占位标题，不承载核心关系", "- 是否需要回答书名：看情况"));
    expect(missing.ok).toBe(false);
    expect(missing.errors.join("\n")).toContain("两个相隔转折");
    expect(undecided.ok).toBe(false);
    expect(undecided.errors.join("\n")).toContain("必须明确写是或否");
  });

  test("requires at least one source-specific anchor for partial notes", () => {
    const partialCoverage = coverage("初拆")
      .replace("- 正文必须出现的整书锚点：四句话｜处罚｜比较结果", "- 正文必须出现的整书锚点：");
    const result = validate(note(), filename, partialCoverage);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("初拆或假设版也必须声明至少 1 个");
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

  for (const sentence of ["居民走进城市中部。", "河流穿过大陆中部以后转向东南。"] as const) {
    test(`allows ordinary spatial use of source-structure words: ${sentence}`, () => {
      const result = validate(note({ firstBody: sentence }), filename, coverage());
      expect(result.ok).toBe(true);
      expect(result.checks.source_structure_hits).toBe(0);
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

  test("requires yes or no for understanding-path material support", () => {
    const result = validate(note(), filename, coverage("初拆", "也许可以"));
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("必须明确写是或否");
  });

  test("rejects complete-book coverage when understanding-path support starts with no", () => {
    const result = validate(note(), filename, coverage("完整拆书", "否——只有目录，无法看见认识怎样改变"));
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("完整拆书");
    expect(result.errors.join("\n")).toContain("材料不足以支撑认识更新路径");
  });

  test("requires all understanding-path fields when material says yes", () => {
    const incomplete = coverage("初拆").replace("- 新结果自然带出什么问题：还要排除哪些替代原因", "- 新结果自然带出什么问题：");
    const result = validate(note(), filename, incomplete);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("没有填完具体处境、自然理解");
  });

  test("allows an honest no while warning against fabricated scenes", () => {
    const thin = coverage("初拆", "否——只有目录，无法看见认识怎样改变")
      .replace("- 读者进入什么具体处境：群里转来四句话，最后一句主张加重处罚", "- 读者进入什么具体处境：")
      .replace("- 哪个事实、事件或结果让它不够：遮住结论后，前三句只能证明问题存在", "- 哪个事实、事件或结果让它不够：");
    const result = validate(note(), filename, thin);
    expect(result.ok).toBe(true);
    expect(result.warnings.join("\n")).toContain("材料不足以支撑认识更新路径");
  });

  test("keeps the previous runnable coverage readable with a migration warning", () => {
    const result = validate(note(), filename, legacyRunnableCoverage());
    expect(result.ok).toBe(true);
    expect(result.checks.runnable_support).toContain("是");
    expect(result.checks.coverage_runnable_fields).toBe(9);
    expect(result.warnings.join("\n")).toContain("旧版读者运行门");
  });

  test("keeps legacy coverage readable with a migration warning", () => {
    const result = validate(note(), filename, legacyCoverage());
    expect(result.ok).toBe(true);
    expect(result.checks.runnable_support).toBe("legacy");
    expect(result.checks.coverage_embodiment_fields).toBe(7);
    expect(result.warnings.join("\n")).toContain("旧版现场化门");
  });

  test("rejects legacy complete coverage that has no whole-book identity gate", () => {
    const result = validate(note(), filename, legacyFullCoverage().replace("材料等级：初拆", "材料等级：完整拆书"));
    expect(result.ok).toBe(false);
    expect(result.checks.coverage_loop_fields).toBe(9);
    expect(result.checks.coverage_concretization_fields).toBe(7);
    expect(result.checks.coverage_legacy_narrative_selection_fields).toBe(0);
    expect(result.errors.join("\n")).toContain("整书身份");
  });

  test("rejects an incomplete whole-book identity gate", () => {
    const incomplete = coverage().replace("- 起点、主要变化与终点：从顺势点头，到遮住结论发现缺口，再等待比较结果", "- 起点、主要变化与终点：");
    const result = validate(note(), filename, incomplete);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("整书身份");
  });

  test("rejects generic or absent whole-book anchors", () => {
    const generic = validate(note(), filename, coverage().replace("四句话｜处罚｜比较结果", "问题｜关系｜结论"));
    const absent = validate(note(), filename, coverage().replace("四句话｜处罚｜比较结果", "四句话｜处罚｜马尾藻海"));
    expect(generic.ok).toBe(false);
    expect(generic.errors.join("\n")).toContain("过于通用");
    expect(absent.ok).toBe(false);
    expect(absent.errors.join("\n")).toContain("没有出现在正文");
  });

  test("anti: a polished theme essay cannot pass as a complete book without identity", () => {
    const themeOnly = coverage().replace(/\n## 整书身份门[\s\S]*?(?=\n## 认识更新门)/, "\n");
    const result = validate(note(), filename, themeOnly);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("整书身份");
  });

  test("rejects incomplete full-book evidence, candidates, selection, and challenge", () => {
    const zone = validate(note(), filename, coverage().replace("[boundary]", "[missing]"));
    const candidate = validate(note(), filename, coverage().replace("名称：E｜位置：5", "名称：｜位置：5"));
    const selection = validate(note(), filename, coverage().replace("- 每次转折怎样由前一结果带出下一问题：理由缺口要求效果证据，效果证据再要求排除替代原因", "- 每次转折怎样由前一结果带出下一问题："));
    const challenge = validate(note(), filename, coverage().replace("- 处理：限定适用条件", "- 处理："));
    expect(zone.ok).toBe(false);
    expect(candidate.ok).toBe(false);
    expect(selection.ok).toBe(false);
    expect(challenge.ok).toBe(false);
  });

  test("rejects a complete-book map without narrative continuity", () => {
    const incomplete = coverage().replace("- 换序测试：先给比较结果会让读者不知道它在补哪一个缺口", "- 换序测试：");
    const result = validate(note(), filename, incomplete);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("叙事连续性门");
  });

  test("requires complete generator fields when a generator exists", () => {
    const incomplete = coverage("完整拆书", "是——原书足以还原判断怎样被证据改变", "2")
      .replace("- 结果方向或终点：读者能够指出结论还缺哪一种证据", "- 结果方向或终点：");
    const result = validate(note(), filename, incomplete);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("解释生成器门没有填完");
  });

  test("accepts an explicit no-generator path without forcing a formula", () => {
    const noGenerator = coverage("初拆", "是——原书足以还原判断怎样被证据改变", "2")
      .replace("- 是否存在全书生成器：是——理由与结论之间的缺口生成了全书后续追问", "- 是否存在全书生成器：否——这篇叙事只逐渐照亮一个没有被解决的关系")
      .replace("- 全书生成器：自然点头 → 遮住结论 → 暴露理由缺口 → 等待效果证据 → 排除替代原因", "- 全书生成器：")
      .replace("- 输入、起点或当前状态：读者看到四句话后顺势赞成加重处罚", "- 输入、起点或当前状态：")
      .replace("- 结果方向或终点：读者能够指出结论还缺哪一种证据", "- 结果方向或终点：")
      .replace("- 生成器怎样贯穿至少两个远距转折：开头遮住结论发现缺口，结尾回到原句等待比较结果", "- 生成器怎样贯穿至少两个远距转折：")
      .replace("- 生成器在哪些条件、范围或层级失效：材料已经直接提供效果比较时，不再需要从理由缺口起步", "- 生成器在哪些条件、范围或层级失效：")
      .replace("- 正文生成器锚点：理由还没有走到结论", "- 正文生成器锚点：")
      .replace("- 生成器是否需要在前两个一级标题内运行：是——分析书应先交付读懂后续案例所需的判断关系", "- 生成器是否需要在前两个一级标题内运行：否——叙事需要让关系随人物后果逐渐显形");
    const result = validate(note(), filename, noGenerator);
    expect(result.ok).toBe(true);
    expect(result.checks.generator_exists).toContain("否");
  });

  test("rejects a declared generator anchor that appears too late", () => {
    const lateNote = note({
      firstBody: "四句话摆在小李面前。他先顺势点了头。",
      tail: "\n理由还没有走到结论。\n",
    });
    const result = validate(lateNote, filename, coverage("完整拆书", "是——原书足以还原判断怎样被证据改变", "2"));
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("前两个一级标题");
  });

  test("requires an elected visual and a carrier that runs after it", () => {
    const visualCoverage = coverage("完整拆书", "是——原书足以还原判断怎样被证据改变", "2")
      .replace("- 是否需要视觉表示：否——理由链用同一句话重跑即可看清，不依赖空间位置", "- 是否需要视觉表示：是——两条曲线的中心与两端需要空间定位")
      .replace("- 视觉表示后用哪个载体运行：不需要——正文直接重跑四句话", "- 视觉表示后用哪个载体运行：比较结果");
    const missing = validate(note(), filename, visualCoverage);
    const diagram = "#+begin_example\ncenter -- result -- edge\n#+end_example";
    const withDiagram = note().replace("一份地区比较放回原来的判断。", `${diagram}\n\n一份地区比较放回原来的判断。`);
    const present = validate(withDiagram, filename, visualCoverage);
    const missingCarrier = validate(withDiagram, filename, visualCoverage.replace("视觉表示后用哪个载体运行：比较结果", "视觉表示后用哪个载体运行：马尾藻海"));
    expect(missing.ok).toBe(false);
    expect(missing.errors.join("\n")).toContain("需要视觉表示");
    expect(present.ok).toBe(true);
    expect(present.checks.representation_run_anchor_hit).toBe(true);
    expect(missingCarrier.ok).toBe(false);
    expect(missingCarrier.errors.join("\n")).toContain("图后运行载体");
  });

  test("requires complete frontstage carriers with unique responsibilities", () => {
    const contract = coverage("完整拆书", "是——原书足以还原判断怎样被证据改变", "2");
    const incomplete = contract.replace("｜结果或后果：遮住第四句后，处罚结论失去支持", "｜结果或后果：");
    const duplicate = contract.replace("唯一职责：把效果证据放回原判断", "唯一职责：让自然点头真实失效");
    const missingBody = contract.replace("名称：比较结果", "名称：马尾藻海");
    const a = validate(note(), filename, incomplete);
    const b = validate(note(), filename, duplicate);
    const c = validate(note(), filename, missingBody);
    expect(a.ok).toBe(false);
    expect(a.errors.join("\n")).toContain("前台载体必须填完");
    expect(b.ok).toBe(false);
    expect(b.errors.join("\n")).toContain("唯一职责不能重复");
    expect(c.ok).toBe(false);
    expect(c.errors.join("\n")).toContain("没有出现在正文");
  });

  test("allows long explanations without a length warning", () => {
    const longBody = "小李继续沿着同一个问题检查证据。新的事实不是补充材料，而是回答上一段留下的未知。".repeat(120);
    const result = validate(note({ tail: `\n${longBody}\n` }), filename, coverage());
    expect(result.ok).toBe(true);
    expect(result.checks.body_chars).toBeGreaterThan(3000);
    expect(result.warnings.join("\n")).not.toContain("1000–3000");
  });

  test("allows anchors and candidates to grow with the book", () => {
    const extraAnchors = ["遮住结论", "理由缺口", "效果证据", "替代原因", "重新判断"];
    const expandedCoverage = coverage()
      .replace("四句话｜处罚｜比较结果", `四句话｜处罚｜比较结果｜${extraAnchors.join("｜")}`)
      .replace("\n## 全书取舍", `${Array.from({ length: 8 }, (_, index) => `\n- [candidate] 名称：扩展${index + 1}｜位置：${index + 6}｜解决的问题：扩展问题${index + 1}｜与其他部件的关系：承接上一转折｜决定：保留｜删除测试：删除会使转折断裂`).join("")}\n\n## 全书取舍`);
    const result = validate(note({ tail: `\n${extraAnchors.join("，")}。\n` }), filename, expandedCoverage);
    expect(result.ok).toBe(true);
    expect(result.checks.required_whole_book_anchor_count).toBe(8);
    expect(result.checks.coverage_candidate_count).toBe(13);
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
    expect(result.checks.backstage_accounting_hits).toBeGreaterThanOrEqual(4);
  });

  test("allows ordinary historical use of 本轮", () => {
    const result = validate(note({
      firstBody: "本轮通胀里，企业第一次没有扩产。原来只看价格的判断，现在还得加入库存和利率。",
    }), filename, coverage());
    expect(result.ok).toBe(true);
    expect(result.checks.backstage_accounting_hits).toBe(0);
  });

  for (const sentence of [
    "本轮材料价格上涨以后，企业第一次没有扩产。",
    "他的旧稿保存了战争前的城市地图。",
    "根据旧稿修复城墙，反而暴露了地基裂缝。",
  ] as const) {
    test(`allows book content that shares words with backstage accounting: ${sentence}`, () => {
      const result = validate(note({ firstBody: sentence }), filename, coverage());
      expect(result.ok).toBe(true);
      expect(result.checks.backstage_accounting_hits).toBe(0);
    });
  }

  test("accepts an in-scene boundary stated through the object's limits", () => {
    const result = validate(note({
      firstBody: "桌上有十二根同样长、同样宽的纸条。把它们折成三角格，再首尾接起来。薄书还没放上去，先猜一猜：材料一样、数量一样，它们托得住的重量会一样吗？纸条不会告诉你钢梁能承受多少吨，却已经把问题拨正：决定结果的不只有材料，还有材料怎样连成一个整体。",
    }), filename, coverage());
    expect(result.ok).toBe(true);
    expect(result.checks.backstage_accounting_hits).toBe(0);
  });

  test("recognizes an immersive opening without requiring a naming formula", () => {
    const result = validate(note(), filename, coverage());
    expect(result.checks.outside_camera_opening_hits).toBe(0);
    expect(result.checks.meta_narration_hits).toBe(0);
  });

  test("accepts delayed naming when the understanding path remains concrete", () => {
    const result = validate(note({
      firstBody: "四句话摆在小李面前。他顺着危险感点了头。遮住最后一句以后，前三句话仍然成立，处罚却不再是唯一答案。",
      headings: ["四句话摆在眼前", "处罚为什么不再是唯一答案"],
    }), filename, coverage());
    expect(result.ok).toBe(true);
    expect(result.warnings.join("\n")).not.toContain("立即命名");
  });

  test("accepts a historical path whose question stays stable while scenes change", () => {
    const result = validate(note({
      firstBody: "港口刚开放时，商人只盯着更便宜的货。几年以后，税收、造船和城市人口一起变了，原来那笔买卖已经装不下它带来的后果。",
      headings: ["一船便宜货靠岸", "买卖怎样改了整座城", "同一个问题来到下一座港口"],
    }), filename, coverage("初拆"));
    expect(result.ok).toBe(true);
  });

  test("accepts a literary path that clarifies a tension without solving it", () => {
    const result = validate(note({
      firstBody: "他在葬礼上没有哭。周围人先把这当成冷漠，后来审判谈得最多的仍不是那场死亡，而是他的眼泪。一个人的情感方式开始替他的行为受审。",
      headings: ["葬礼上没有出现的眼泪", "审判为什么一直回到那一天", "看清矛盾，不替它收尾"],
    }), filename, coverage("初拆"));
    expect(result.ok).toBe(true);
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
