#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import { basename } from "node:path";

export type Result = {
  /** ok only reports the structural checks below, never reading quality. */
  ok: boolean;
  assessment_scope: "结构与记录完整性；不证明来源准确、阅读连续或理解效果";
  semantic_assessment: "not_performed";
  file: string;
  errors: string[];
  warnings: string[];
  checks: Record<string, number | string | boolean>;
};

const validMaterialGrades = ["完整拆书", "初拆", "假设版"] as const;
const essenceHeading = "读完后留下什么";
const legacyCoverageLoopFields = [
  "处境",
  "贯穿张力",
  "最自然的理解或反应",
  "得到的结果",
  "证据或事件暴露的缺口",
  "被改写的是 x / R / f / E 中哪一项",
  "改写后的结果",
  "下一场景",
  "最后回到哪里",
];
const legacyConcretizationFields = [
  "核心动作或变化",
  "原状态",
  "只改变的关键条件或动作",
  "可见结果",
  "角色、动作、方向与结果怎样对应",
  "失败或反例怎样划出边界",
  "删掉解释后，场景本身还能看见什么",
];
const legacyEmbodimentFields = [
  "镜头站在哪里",
  "读者或人物先看见什么",
  "解释出现前会怎样判断或行动",
  "这个判断先产生什么可见结果",
  "哪条证据、事件或对象反馈打断它",
  "命名以后回到哪一幕重跑",
  "原书依据与简化边界",
];
const legacyRunnableFields = [
  "读者先问什么",
  "稳定对象或最小模型",
  "读者第一次会猜什么",
  "最小动作或变化",
  "立刻出现的结果",
  "结果紧接着叫什么",
  "同一对象怎样再运行",
  "陌生读者能怎样复述",
  "原书依据与简化边界",
];
const understandingPathFields = [
  "读者进入什么具体处境",
  "最初最自然会怎样理解",
  "哪个事实、事件或结果让它不够",
  "作者增加了什么关系或条件",
  "回看原处境，什么已经改变",
  "新结果自然带出什么问题",
  "贯穿全文的扶手",
  "结尾回到哪里",
  "陌生读者能怎样复述",
  "原书依据与简化边界",
];
const wholeBookIdentityFields = [
  "这是什么类型或形态的书",
  "字面上跟着谁、什么对象或什么问题展开",
  "起点、主要变化与终点",
  "不可省略的主线",
  "主线为什么属于同一本书",
  "正文必须出现的整书锚点",
  "三十秒整书复述",
  "可迁移性反测",
];
const genericWholeBookAnchors = new Set([
  "问题",
  "关系",
  "变化",
  "结果",
  "理解",
  "判断",
  "结论",
  "主题",
  "作者",
  "本书",
  "读者",
  "证据",
  "边界",
  "方法",
  "概念",
]);
const bookSelectionFields = [
  "贯穿全书的困惑或张力",
  "正文保留哪些必要转折",
  "为什么这些转折足以让读者理解全书主干",
  "哪些重要内容留在后台而不进入正文",
  "每次转折怎样由前一结果带出下一问题",
];
const narrativeContinuityFields = [
  "开篇留下的真实问题",
  "转折链",
  "每次换场为什么不可提前",
  "换序测试",
  "摘句拼接反测",
];
const generatorFields = [
  "全书生成器",
  "输入、起点或当前状态",
  "结果方向或终点",
  "生成器怎样贯穿至少两个远距转折",
  "生成器在哪些条件、范围或层级失效",
  "正文生成器锚点",
  "生成器是否需要在前两个一级标题内运行",
  "是否需要视觉表示",
];
const frontstageFields = [
  "名称",
  "唯一职责",
  "设置或起点",
  "结果或后果",
  "改变的关系",
  "下一问",
];
const v3WholeBookFields = [
  "这是什么类型或形态的书", "起点、主要变化与终点", "核心理解",
  "各部分怎样相连", "作者最想纠正或保留什么", "正文必须出现的整书锚点",
];
const v3ThreadFields = ["名称", "起点", "关键推进", "前后变化", "换场理由", "依据与边界"];
const v3ReviewFields = [
  "反证与取舍", "整书复述与关系重建", "阅读断点与修订",
  "遮住末节后能否理解作者关切", "正文中哪两个相隔较远的转折共同托住它",
];
const v3GeneratorFields = [
  "全书生成器", "生成器怎样贯穿至少两个远距转折", "生成器在哪些条件、范围或层级失效",
];
const legacyBookSelectionFields = [
  "贯穿全书的普通问题",
  "正文保留哪两到四个关系",
  "为什么这些关系足以让读者理解全书主干",
  "哪些重要内容留在后台而不进入正文",
  "各模块如何继续使用同一对象，或为什么必须换对象",
];
const legacyNarrativeSelectionFields = [
  "开头用哪件具体事情",
  "为什么它能承载贯穿张力",
  "一个场景是否够用",
  "若不够，前一个结果怎样产生下一个场景",
  "标题将用哪些事件、变化或条件命名",
  "返程后，原来的看法在哪里改变",
];

function displayWidth(line: string): number {
  return [...line].reduce((width, char) => width + (char.codePointAt(0)! > 127 ? 2 : 1), 0);
}

function lineField(content: string, field: string): string {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return content.match(new RegExp(`^- ${escaped}[：:][ \\t]*([^\\n]*)$`, "m"))?.[1]?.trim() ?? "";
}

function substantive(value: string): boolean {
  return Boolean(value) && value !== "未找到" && !/[{}]/.test(value);
}

function yesNoDecision(value: string): boolean {
  return /^(?:是|否)(?:\b|[—：:，,。\s]|$)/.test(value);
}

function parseWholeBookAnchors(value: string): string[] {
  return [...new Set(value.split(/[｜|]/).map((anchor) => anchor.trim()).filter(Boolean))];
}

function segmentField(line: string, field: string): string {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return line.match(new RegExp(`${escaped}[：:]\\s*([^｜|\\n]*)`))?.[1]?.trim() ?? "";
}

function locationForZone(content: string, zone: string): string {
  const line = content.match(new RegExp(`^- \\[${zone}\\][^\\n]*$`, "m"))?.[0] ?? "";
  return line.match(/位置[：:]\s*([^｜|\n]*)/)?.[1]?.trim() ?? "";
}

export function validate(content: string, file: string, coverage?: string): Result {
  const errors: string[] = [];
  const warnings: string[] = [];
  const markdownMode = file.toLowerCase().endsWith(".md");
  const requiredHeaders = markdownMode
    ? ["title", "subtitle", "description", "date", "tags", "identifier"]
    : ["TITLE", "SUBTITLE", "DESCRIPTION", "DATE", "FILETAGS", "IDENTIFIER"];

  for (const header of requiredHeaders) {
    const pattern = markdownMode
      ? new RegExp(`^${header}:\\s*\\S`, "mi")
      : new RegExp(`^#\\+${header}:\\s*\\S`, "mi");
    if (!pattern.test(content)) {
      errors.push(`缺少或为空的 ${markdownMode ? header : `#+${header}`}`);
    }
  }

  const identifier = markdownMode
    ? content.match(/^identifier:\s*(\S+)/mi)?.[1] ?? ""
    : content.match(/^#\+IDENTIFIER:\s*(\S+)/mi)?.[1] ?? "";
  const filenameIdentifier = basename(file).match(/^(\d{8}T\d{6})--/)?.[1] ?? "";
  if (!filenameIdentifier) {
    errors.push("文件名不是 Denote 时间戳格式");
  } else if (identifier !== filenameIdentifier) {
    errors.push(`IDENTIFIER ${identifier || "为空"} 与文件名 ${filenameIdentifier} 不一致`);
  }

  const headingPattern = markdownMode ? /^# ([^#].*)$/gm : /^\* ([^*].*)$/gm;
  const headingMatches = [...content.matchAll(headingPattern)];
  const allHeadings = headingMatches.map((match) => match[1].trim());
  const essenceHeadingIndexes = allHeadings
    .map((heading, index) => heading === essenceHeading ? index : -1)
    .filter((index) => index >= 0);
  const essenceHeadingIndex = essenceHeadingIndexes[0] ?? -1;
  const essenceHeadingMatch = essenceHeadingIndex >= 0 ? headingMatches[essenceHeadingIndex] : undefined;
  const essenceSection = essenceHeadingMatch?.index !== undefined
    ? content.slice(essenceHeadingMatch.index + essenceHeadingMatch[0].length).trim()
    : "";
  const headings = allHeadings.filter((heading) => heading !== essenceHeading);
  if (headings.length < 1) {
    errors.push("末节以前至少需要 1 个正文一级标题");
  }

  if (essenceHeadingIndexes.length === 0) {
    errors.push(`成品最后必须有一级标题“${essenceHeading}”`);
  } else if (essenceHeadingIndexes.length > 1) {
    errors.push(`一级标题“${essenceHeading}”只能出现一次`);
  } else if (essenceHeadingIndex !== allHeadings.length - 1) {
    errors.push(`“${essenceHeading}”必须是成品最后一个一级标题`);
  }

  const essenceParagraphs = essenceSection
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const essenceText = essenceParagraphs.join(" ").replace(/\s+/g, " ").trim();
  const essenceChars = [...essenceText.replace(/\s/g, "")].length;
  const essenceSentenceCount = essenceText
    .split(/[。！？]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean).length;
  const essenceFormatLineHits = [...essenceSection.matchAll(/^(?:[-+] |\d+[.)] |(?:\*{2,}|#{2,}) )/gm)].length;
  if (essenceHeadingIndexes.length === 1) {
    if (essenceParagraphs.length !== 1) {
      errors.push(`“${essenceHeading}”只写一个自然段，当前为 ${essenceParagraphs.length} 段`);
    }
    if (essenceFormatLineHits > 0) {
      errors.push(`“${essenceHeading}”不能写成分类清单或子标题；结构、洞见、模型等只在后台帮助寻找精神内核`);
    }
    if (essenceChars === 0) errors.push(`“${essenceHeading}”不能为空`);
  }

  const legacyTriadPattern = markdownMode
    ? /^- \*\*(?:x|R|f|E|f\(x\))\*\*[：:].+$/gmi
    : /^- \*(?:x|R|f|E|f\(x\))\*[：:].+$/gmi;
  const legacyTriadHits = [...content.matchAll(legacyTriadPattern)];
  const internalHeadingPattern = markdownMode
    ? /^# (?:x|R|f|E|f\(x\))[：:].+$/gmi
    : /^\* (?:x|R|f|E|f\(x\))[：:].+$/gmi;
  const internalHeadingHits = [...content.matchAll(internalHeadingPattern)];
  if (legacyTriadHits.length > 0 || internalHeadingHits.length > 0) {
    errors.push("成品不能暴露 x/R/f/E 或旧 x/f/f(x) 分析标签");
  }

  const calibrationHits = [...content.matchAll(/资料校准/g)].length;
  if (calibrationHits > 0) {
    errors.push("成品不能出现独立的研究校准章节或标签");
  }
  const visibleMaterialGradeHits = [...content.matchAll(/材料等级[：:]/g)].length;
  if (visibleMaterialGradeHits > 0) {
    errors.push("材料等级只能写在后台覆盖记录，不能出现在成品");
  }

  const bodyStart = headingMatches[0]?.index ?? -1;
  const narrativeBody = bodyStart >= 0 ? content.slice(bodyStart) : "";
  const beforeEssence = bodyStart >= 0 ? content.slice(bodyStart, essenceHeadingMatch?.index ?? content.length) : "";
  const bodyText = beforeEssence.replace(markdownMode ? /^#{1,6} .*$/gm : /^\*+ .*$/gm, "").trim();
  if (!bodyText) errors.push("末节以前必须有非空正文");
  // Only explicit run/accounting language is checked. Ordinary author attribution,
  // source structure, model descriptions and limitations require human reading.
  const backstageAccountingPatterns = [
    /本轮[^。！？\n]{0,24}(?:核验|核到|读取|提取|查到|验证|未核|未查|不替|未替|补写|补充)[^。！？\n]*/g,
    /本轮(?:真实|现有|已有)?材料(?:测试|核验|读取|提取|检查|验证)[^。！？\n]*/g,
  ];
  const backstageAccountingHits = backstageAccountingPatterns.flatMap((pattern) =>
    [...narrativeBody.matchAll(pattern)].map((match) => match[0]),
  );
  if (backstageAccountingHits.length > 0) {
    errors.push(`正文含后台核验语言：${[...new Set(backstageAccountingHits)].join("、")}；请将本轮核验记录移回 coverage`);
  }

  const proseParagraphs = narrativeBody
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph && !/^(?:\*|#|\+|- )/.test(paragraph));
  const paragraphSizes = proseParagraphs.map((paragraph) => [...paragraph.replace(/\s/g, "")].length);
  const maxParagraphChars = paragraphSizes.length ? Math.max(...paragraphSizes) : 0;
  const denseParagraphHits = paragraphSizes.filter((size) => size > 220).length;

  const sentenceSizes = proseParagraphs.flatMap((paragraph) =>
    paragraph.split(/[。！？；]/).map((sentence) => [...sentence.replace(/\s/g, "")].length).filter(Boolean),
  );
  const maxSentenceChars = sentenceSizes.length ? Math.max(...sentenceSizes) : 0;
  const longSentenceHits = sentenceSizes.filter((size) => size > 90).length;

  let materialGrade = "";
  let understandingPathSupport = "";
  let coverageZones = 0;
  let coverageLoopFields = 0;
  let coverageConcretizationFields = 0;
  let coverageEmbodimentFields = 0;
  let coverageRunnableFields = 0;
  let coverageUnderstandingFields = 0;
  let coverageWholeBookIdentityFields = 0;
  let requiredWholeBookAnchors: string[] = [];
  let requiredWholeBookAnchorHits = 0;
  let missingWholeBookAnchors: string[] = [];
  let genericWholeBookAnchorHits: string[] = [];
  let coverageEssenceFields = 0;
  let coverageTitleAnswer = "";
  let coverageBookSelectionFields = 0;
  let coverageNarrativeContinuityFields = 0;
  let coverageLegacyNarrativeSelectionFields = 0;
  let coverageCandidateCount = 0;
  let coverageContractVersion = "legacy";
  let coverageGeneratorGatePresent = false;
  let generatorExists = "";
  let coverageGeneratorFields = 0;
  let generatorAnchorCount = 0;
  let generatorAnchorHits = 0;
  let generatorEarlyAnchorHits = 0;
  let generatorEarlyDecision = "";
  let representationRequired = "";
  let representationRunAnchor = "";
  let threadCount = 0;
  let threadCompleteCount = 0;
  let threadMissingInBody: string[] = [];
  let representationPurpose = "";
  let frontstageCount = 0;
  let frontstageCompleteCount = 0;
  let frontstageMissingInBody: string[] = [];
  let frontstageDuplicateResponsibilities: string[] = [];
  if (!coverage) {
    errors.push("所有拆书都必须提供 --coverage 后台覆盖记录");
  } else {
    const declaredCoverageVersion = lineField(coverage, "覆盖合同版本");
    coverageContractVersion = declaredCoverageVersion || "legacy";
    if (declaredCoverageVersion && !["2", "3", "legacy"].includes(declaredCoverageVersion)) {
      errors.push(`覆盖记录版本 ${declaredCoverageVersion} 不受支持；当前版本为 3，兼容 2 与 legacy`);
    }

    materialGrade = lineField(coverage, "材料等级");
    if (!validMaterialGrades.includes(materialGrade as (typeof validMaterialGrades)[number])) {
      errors.push("覆盖记录的材料等级必须是：完整拆书 / 初拆 / 假设版");
    }

    const sourceBoundaryFields = ["主要材料", "能支持到"].filter((field) => substantive(lineField(coverage, field))).length;
    if (sourceBoundaryFields !== 2) {
      errors.push("覆盖记录必须写明主要材料与能支持到哪里");
    }
    if (coverageContractVersion === "3") {
      const requireFields = (fields: string[]) => {
        for (const field of fields) {
          if (!substantive(lineField(coverage, field))) errors.push(`覆盖记录版本 3 缺少或为空的字段：${field}`);
        }
      };
      understandingPathSupport = lineField(coverage, "材料能否支撑认识更新路径");
      if (!yesNoDecision(understandingPathSupport)) {
        errors.push("“材料能否支撑认识更新路径”必须明确写是或否，并说明依据");
      }
      const supported = /^是/.test(understandingPathSupport);
      const complete = materialGrade === "完整拆书";
      if (!supported && complete) errors.push("完整拆书不能通过：材料不足以支撑认识更新路径");
      if (/^否/.test(understandingPathSupport) && !complete) {
        warnings.push("材料不足以支撑认识更新路径；仅检查材料能支持的记录，未支持的理解可写未确定，不能虚构经历");
      }
      // Partial unsupported records still identify the book and state the core's uncertainty.
      requireFields(supported || complete ? v3WholeBookFields : ["这是什么类型或形态的书", "核心理解", "正文必须出现的整书锚点"]);
      coverageWholeBookIdentityFields = v3WholeBookFields.filter((field) => substantive(lineField(coverage, field))).length;
      requiredWholeBookAnchors = parseWholeBookAnchors(lineField(coverage, "正文必须出现的整书锚点"));
      missingWholeBookAnchors = requiredWholeBookAnchors.filter((anchor) => !narrativeBody.includes(anchor));
      requiredWholeBookAnchorHits = requiredWholeBookAnchors.length - missingWholeBookAnchors.length;
      genericWholeBookAnchorHits = requiredWholeBookAnchors.filter((anchor) => genericWholeBookAnchors.has(anchor));
      if (genericWholeBookAnchorHits.length) errors.push(`整书锚点过于通用：${genericWholeBookAnchorHits.join("、")}`);
      const minimumAnchors = complete ? 3 : 1;
      if (requiredWholeBookAnchors.length < minimumAnchors) errors.push(`${materialGrade || "拆书"}必须声明至少 ${minimumAnchors} 个正文整书锚点`);
      if (missingWholeBookAnchors.length) errors.push(`这些整书锚点没有出现在正文：${missingWholeBookAnchors.join("、")}`);

      const threads = [...coverage.matchAll(/^- \[thread\]\s*.*$/gm)];
      threadCount = threads.length;
      threadCompleteCount = threads.filter((entry) => v3ThreadFields.every((field) => substantive(segmentField(entry[0], field)))).length;
      threadMissingInBody = threads.map((entry) => segmentField(entry[0], "名称")).filter(substantive).filter((name) => !narrativeBody.includes(name));
      if (supported && threadCount < 1) errors.push("覆盖记录版本 3 必须声明至少 1 条 [thread] 认识线索");
      if (threadCompleteCount !== threadCount) errors.push("[thread] 必须填完名称、起点、关键推进、前后变化、换场理由、依据与边界");
      if (threadMissingInBody.length) errors.push(`这些认识线索名称没有出现在正文：${threadMissingInBody.join("、")}`);

      generatorExists = lineField(coverage, "是否存在全书生成器");
      coverageGeneratorGatePresent = substantive(generatorExists);
      representationRequired = lineField(coverage, "是否需要视觉表示");
      representationPurpose = lineField(coverage, "使用图表的位置与目的");
      for (const [field, value] of [["是否存在全书生成器", generatorExists], ["是否需要视觉表示", representationRequired]]) {
        if ((supported || complete || substantive(value)) && !yesNoDecision(value)) errors.push(`“${field}”必须明确写是或否`);
      }
      if (/^是/.test(generatorExists)) requireFields(v3GeneratorFields);
      coverageGeneratorFields = v3GeneratorFields.filter((field) => substantive(lineField(coverage, field))).length;
      if (/^是/.test(representationRequired)) requireFields(["使用图表的位置与目的"]);
      const zones = ["starting-point", "pressure", "revision", "boundary"];
      coverageZones = zones.filter((zone) => substantive(locationForZone(coverage, zone))).length;
      const evidenceRows = [...coverage.matchAll(/^- \[(?:starting-point|pressure|revision|boundary)\][^\n]*$/gm)];
      if (evidenceRows.some((entry) => !substantive(segmentField(entry[0], "位置")))) {
        errors.push("已声明的来源证据必须写明位置；材料不支持的证据行应删除");
      }
      if (supported || complete) {
        requireFields(v3ReviewFields);
        if (complete && coverageZones !== zones.length) errors.push("覆盖记录版本 3 没有填完起点、压力、改写与边界四类证据的位置");
      }
      const candidates = [...coverage.matchAll(/^- \[candidate\]\s*.*$/gm)];
      coverageCandidateCount = candidates.length;
      const candidateFields = ["名称", "位置", "解决的问题", "与其他部件的关系", "决定", "删除测试"];
      if (complete && coverageCandidateCount < 5) errors.push(`完整拆书的覆盖记录必须有至少 5 个候选部件，当前为 ${coverageCandidateCount}`);
      for (const candidate of candidates) {
        if (!candidateFields.every((field) => substantive(segmentField(candidate[0], field))) || !["保留", "合并", "删除"].includes(segmentField(candidate[0], "决定"))) {
          errors.push("候选部件必须填完名称、位置、作用、关系、决定与删除测试；决定为保留/合并/删除");
        }
      }
    } else {
      const currentSupport = lineField(coverage, "材料能否支撑认识更新路径");
      const legacyRunnableSupport = lineField(coverage, "材料能否支撑具体运行");
      understandingPathSupport = currentSupport || legacyRunnableSupport;
      coverageUnderstandingFields = understandingPathFields.filter((field) => substantive(lineField(coverage, field))).length;
      coverageWholeBookIdentityFields = wholeBookIdentityFields
        .filter((field) => substantive(lineField(coverage, field))).length;
      requiredWholeBookAnchors = parseWholeBookAnchors(lineField(coverage, "正文必须出现的整书锚点"));
      missingWholeBookAnchors = requiredWholeBookAnchors
        .filter((anchor) => !narrativeBody.includes(anchor));
      requiredWholeBookAnchorHits = requiredWholeBookAnchors.length - missingWholeBookAnchors.length;
      genericWholeBookAnchorHits = requiredWholeBookAnchors
        .filter((anchor) => genericWholeBookAnchors.has(anchor));
      coverageRunnableFields = legacyRunnableFields.filter((field) => substantive(lineField(coverage, field))).length;
      coverageEmbodimentFields = legacyEmbodimentFields.filter((field) => substantive(lineField(coverage, field))).length;
      if (substantive(currentSupport)) {
        const essenceCoverageFields = ["作者最后只想留下什么", "正文中哪两个相隔较远的转折共同托住它", "是否需要回答书名", "精神内核可替换性反测"];
        coverageEssenceFields = essenceCoverageFields
          .filter((field) => substantive(lineField(coverage, field))).length;
        coverageTitleAnswer = lineField(coverage, "是否需要回答书名");
        if (coverageEssenceFields !== essenceCoverageFields.length) {
          errors.push("当前版覆盖记录必须填完精神内核、两个相隔转折、书名判断与可替换性反测");
        }
        if (substantive(coverageTitleAnswer) && !/^(?:是|否)(?:\b|[—：:，,。\s]|$)/.test(coverageTitleAnswer)) {
          errors.push("“是否需要回答书名”必须明确写是或否，并说明书名是否承载精神内核");
        }
        if (!/^(?:是|否)(?:\b|[—：:，,。\s]|$)/.test(currentSupport)) {
          errors.push("“材料能否支撑认识更新路径”必须明确写是或否，并说明依据");
        } else if (/^是/.test(currentSupport) && coverageUnderstandingFields !== understandingPathFields.length) {
          errors.push("材料声明能够支撑认识更新路径，但覆盖记录没有填完具体处境、自然理解、压力、新关系、回看、下一问、扶手、返程、复述与来源边界");
        } else if (/^否/.test(currentSupport)) {
          const message = "材料不足以支撑认识更新路径；成品应缩成局部理解或先补材料，不能用泛化场景冒充现场";
          if (materialGrade === "完整拆书") {
            errors.push(`完整拆书不能通过：${message}`);
          } else {
            warnings.push(message);
          }
        }
      } else if (substantive(legacyRunnableSupport)) {
        if (!/^(?:是|否)(?:\b|[—：:，,。\s]|$)/.test(legacyRunnableSupport)) {
          errors.push("旧版“材料能否支撑具体运行”必须明确写是或否，并说明依据");
        } else if (/^是/.test(legacyRunnableSupport) && coverageRunnableFields !== legacyRunnableFields.length) {
          errors.push("旧版材料声明可运行，但读者运行门没有填完");
        } else if (/^否/.test(legacyRunnableSupport)) {
          warnings.push("材料不足以支撑具体运行；成品应缩成局部理解或先补材料，不能用泛化场景冒充现场");
        }
        warnings.push("覆盖记录仍使用旧版读者运行门；本次兼容通过，下次重跑时请改用认识更新门");
      } else if (coverageEmbodimentFields === legacyEmbodimentFields.length) {
        understandingPathSupport = "legacy";
        warnings.push("覆盖记录仍使用旧版现场化门；本次兼容通过，下次重跑时请改用认识更新门");
      } else {
        errors.push("覆盖记录必须填写认识更新门，或提供完整的旧版读者运行门/现场化门以便兼容读取");
      }

      if (coverageContractVersion === "2") {
        coverageGeneratorGatePresent = /^- 是否存在全书生成器[：:]/m.test(coverage);
        generatorExists = lineField(coverage, "是否存在全书生成器");
        generatorEarlyDecision = lineField(coverage, "生成器是否需要在前两个一级标题内运行");
        representationRequired = lineField(coverage, "是否需要视觉表示");
        representationRunAnchor = lineField(coverage, "视觉表示后用哪个载体运行");

        if (!coverageGeneratorGatePresent || !yesNoDecision(generatorExists)) {
          errors.push("覆盖记录版本 2 必须明确“是否存在全书生成器”：是或否，并说明理由");
        }

        if (!yesNoDecision(representationRequired)) {
          errors.push("覆盖记录版本 2 必须明确“是否需要视觉表示”：是或否，并说明理由");
        }

        if (/^是/.test(generatorExists)) {
          coverageGeneratorFields = generatorFields
            .filter((field) => substantive(lineField(coverage, field))).length;
          if (coverageGeneratorFields !== generatorFields.length) {
            errors.push("解释生成器门没有填完：生成器、输入/起点、结果方向、远距转折、失效边界、正文锚点、前置判断与视觉判断缺一不可");
          }

          const generatorAnchors = parseWholeBookAnchors(lineField(coverage, "正文生成器锚点"));
          generatorAnchorCount = generatorAnchors.length;
          generatorAnchorHits = generatorAnchors.filter((anchor) => narrativeBody.includes(anchor)).length;
          if (generatorAnchorCount === 0) {
            errors.push("声明存在全书生成器时，必须提供至少 1 个正文生成器锚点");
          } else if (generatorAnchorHits !== generatorAnchorCount) {
            const missing = generatorAnchors.filter((anchor) => !narrativeBody.includes(anchor));
            errors.push(`这些生成器锚点没有出现在正文：${missing.join("、")}`);
          }

          if (!yesNoDecision(generatorEarlyDecision)) {
            errors.push("“生成器是否需要在前两个一级标题内运行”必须明确写是或否，并说明理由");
          } else if (/^是/.test(generatorEarlyDecision)) {
            const thirdHeadingStart = headingMatches[2]?.index ?? content.length;
            const earlyBody = bodyStart >= 0 ? content.slice(bodyStart, thirdHeadingStart) : "";
            generatorEarlyAnchorHits = generatorAnchors.filter((anchor) => earlyBody.includes(anchor)).length;
            if (generatorEarlyAnchorHits !== generatorAnchorCount) {
              errors.push("声明生成器需要前置，但正文生成器锚点没有全部出现在前两个一级标题内");
            }
          }
        } else if (/^否/.test(generatorExists)) {
          coverageGeneratorFields = generatorFields
            .filter((field) => substantive(lineField(coverage, field))).length;
        }

        const frontstage = [...coverage.matchAll(/^- \[frontstage\]\s+.+$/gm)];
        frontstageCount = frontstage.length;
        const frontstageNames = frontstage.map((item) => segmentField(item[0], "名称"));
        const frontstageResponsibilities = frontstage.map((item) => segmentField(item[0], "唯一职责"));
        frontstageCompleteCount = frontstage.filter((item) =>
          frontstageFields.every((field) => substantive(segmentField(item[0], field))),
        ).length;
        frontstageMissingInBody = frontstageNames
          .filter(substantive)
          .filter((name) => !narrativeBody.includes(name));
        frontstageDuplicateResponsibilities = [...new Set(frontstageResponsibilities.filter((responsibility, index, all) =>
          substantive(responsibility) && all.indexOf(responsibility) !== index,
        ))];

        if (/^是/.test(currentSupport) && frontstageCount === 0) {
          errors.push("覆盖记录版本 2 必须声明至少 1 个 [frontstage] 前台载体");
        } else if (frontstageCompleteCount !== frontstageCount) {
          errors.push("前台载体必须填完名称、唯一职责、设置或起点、结果或后果、改变的关系与下一问");
        }
        if (frontstageMissingInBody.length > 0) {
          errors.push(`这些前台载体没有出现在正文：${frontstageMissingInBody.join("、")}`);
        }
        if (frontstageDuplicateResponsibilities.length > 0) {
          errors.push(`前台载体的唯一职责不能重复：${frontstageDuplicateResponsibilities.join("、")}`);
        }
      }

      if (substantive(currentSupport) && materialGrade !== "完整拆书" && requiredWholeBookAnchors.length < 1) {
        errors.push("初拆或假设版也必须声明至少 1 个材料真正支持的整书锚点，精神内核不能只剩通用主题");
      }

      if (materialGrade === "完整拆书") {
        const authorFields = ["作者一直在追问什么", "作者用什么材料或经历逼近", "最终改变了什么判断"]
          .filter((field) => substantive(lineField(coverage, field))).length;
        const legacyAuthorFields = ["问题", "对象", "方法"]
          .filter((field) => substantive(lineField(coverage, field))).length;
        const zones = ["starting-point", "pressure", "revision", "boundary"];
        const legacyZones = ["question", "setup", "mechanism", "boundary"];
        const currentZoneCount = zones.filter((zone) => substantive(locationForZone(coverage, zone))).length;
        const legacyZoneCount = legacyZones.filter((zone) => substantive(locationForZone(coverage, zone))).length;
        coverageZones = Math.max(currentZoneCount, legacyZoneCount);
        const candidates = [...coverage.matchAll(/^- \[candidate\]\s+.+$/gm)];
        coverageCandidateCount = candidates.length;
        const candidateFields = ["名称", "位置", "解决的问题", "与其他部件的关系", "决定", "删除测试"];
        const completeCandidates = candidates.filter((candidate) =>
          candidateFields.every((field) => substantive(segmentField(candidate[0], field)))
          && /决定[：:]\s*(?:保留|合并|删除)(?:｜|\||$)/.test(candidate[0]),
        ).length;
        coverageLoopFields = legacyCoverageLoopFields.filter((field) => substantive(lineField(coverage, field))).length;
        coverageConcretizationFields = legacyConcretizationFields.filter((field) => substantive(lineField(coverage, field))).length;
        const currentBookSelectionFields = bookSelectionFields
          .filter((field) => substantive(lineField(coverage, field))).length;
        const legacySelectionFields = legacyBookSelectionFields
          .filter((field) => substantive(lineField(coverage, field))).length;
        coverageBookSelectionFields = Math.max(currentBookSelectionFields, legacySelectionFields);
        coverageNarrativeContinuityFields = narrativeContinuityFields
          .filter((field) => substantive(lineField(coverage, field))).length;
        coverageLegacyNarrativeSelectionFields = legacyNarrativeSelectionFields
          .filter((field) => substantive(lineField(coverage, field))).length;
        const challengeFields = ["当前理解", "反证", "处理"].filter((field) => substantive(lineField(coverage, field))).length;
        const legacyFullNarrativeComplete = coverageLoopFields === legacyCoverageLoopFields.length
          && coverageConcretizationFields === legacyConcretizationFields.length;

        if (coverageWholeBookIdentityFields !== wholeBookIdentityFields.length) {
          errors.push("完整拆书的覆盖记录没有填完整书身份：书的形态、字面对象、起点变化终点、必要主线、共同关系、正文锚点、三十秒复述与可迁移性反测缺一不可");
        }
        if (requiredWholeBookAnchors.length < 3) {
          errors.push(`完整拆书必须声明至少 3 个正文整书锚点，当前为 ${requiredWholeBookAnchors.length}`);
        }
        if (genericWholeBookAnchorHits.length > 0) {
          errors.push(`整书锚点过于通用，不能唯一指向这本书：${genericWholeBookAnchorHits.join("、")}`);
        }
        if (missingWholeBookAnchors.length > 0) {
          errors.push(`这些整书锚点没有出现在正文：${missingWholeBookAnchors.join("、")}`);
        }
        if (authorFields !== 3 && legacyAuthorFields !== 3) {
          errors.push("完整拆书的覆盖记录没有填完作者的追问、逼近材料与最终判断");
        }
        if (coverageZones !== 4) errors.push("完整拆书的覆盖记录没有填完起点、压力、改写与边界四类证据的位置");
        if (candidates.length < 5) {
          errors.push(`完整拆书的覆盖记录必须有至少 5 个候选部件，当前为 ${candidates.length}`);
        } else if (completeCandidates !== candidates.length) {
          errors.push("完整拆书的候选部件必须填完名称、位置、作用、关系、决定与删除测试");
        }
        if (substantive(understandingPathSupport)
            && coverageBookSelectionFields !== bookSelectionFields.length
            && !legacyFullNarrativeComplete) {
          errors.push("完整拆书的覆盖记录没有填完贯穿张力、必要转折、正文取舍、后台留存与转折连接");
        }
        if (coverageNarrativeContinuityFields !== narrativeContinuityFields.length) {
          errors.push("完整拆书的覆盖记录没有填完叙事连续性门：开篇真实问题、转折链、换场必要性、换序测试与摘句拼接反测缺一不可");
        }
        if (challengeFields !== 3) errors.push("完整拆书的覆盖记录没有完成当前理解、反证与处理");
      }
    }
  }

  const examplePattern = markdownMode
    ? /^```(?:text)?[ \t]*\r?\n([\s\S]*?)^```[ \t]*$/gmi
    : /^#\+begin_example[ \t]*\r?\n([\s\S]*?)^#\+end_example[ \t]*$/gmi;
  const exampleBlocks = [...narrativeBody.matchAll(examplePattern)].filter((block) => block[1].trim());
  // Quoted source/code is not a rendered table. Keep offsets irrelevant here by
  // masking complete fences before looking for actual table rows.
  const tableBody = markdownMode
    ? narrativeBody.replace(/^(`{3,}|~{3,})[^\n]*\r?\n[\s\S]*?^\1[ \t]*$/gm, "")
    : narrativeBody.replace(/^#\+begin_\S+[^\n]*\r?\n[\s\S]*?^#\+end_\S+[ \t]*$/gmi, "");
  const tableBlocks = [...tableBody.matchAll(/(?:^\|[^\n]*\|[ \t]*(?:\r?\n|$)){2,}/gm)]
    .filter((match) => markdownMode
      ? match[0].split(/\r?\n/).some((line) => /^\|(?:[ \t]*:?-{3,}:?[ \t]*\|)+[ \t]*$/.test(line))
      : true);
  const diagramWidths = exampleBlocks.map((block) => Math.max(0, ...block[1].split(/\r?\n/).map(displayWidth)));
  const tableWidths = tableBlocks.map((block) => Math.max(0, ...block[0].split(/\r?\n/).map(displayWidth)));
  const maxDiagramWidth = Math.max(0, ...diagramWidths);
  const maxTableWidth = Math.max(0, ...tableWidths);
  diagramWidths.forEach((width, index) => {
    if (width > 80) errors.push(`第 ${index + 1} 个 ASCII 图宽度 ${width}，超过 80`);
  });
  tableWidths.forEach((width, index) => {
    if (width > 80) errors.push(`第 ${index + 1} 个表格宽度 ${width}，超过 80`);
  });
  if (["2", "3"].includes(coverageContractVersion) && /^是/.test(representationRequired)) {
    if (exampleBlocks.length + tableBlocks.length === 0) errors.push("覆盖记录声明需要视觉表示，正文必须至少有 1 个实际 example 图块或表格");
    // Version 2's carrier is readable as a recorded field, never proof of an explanation.
    if (coverageContractVersion === "2" && !substantive(representationRunAnchor)) errors.push("覆盖记录声明需要视觉表示时，必须写明图后运行载体");
  }

  const bodyChars = [...narrativeBody.replace(/\s/g, "")].length;

  return {
    ok: errors.length === 0,
    assessment_scope: "结构与记录完整性；不证明来源准确、阅读连续或理解效果",
    semantic_assessment: "not_performed",
    file,
    errors,
    warnings,
    checks: {
      identifier,
      material_grade: materialGrade,
      top_headings: headings.length,
      generic_heading_hits: "not_assessed",
      internal_framework_hits: legacyTriadHits.length + internalHeadingHits.length,
      calibration_hits: calibrationHits,
      visible_material_grade_hits: visibleMaterialGradeHits,
      source_structure_hits: "not_assessed",
      outside_camera_opening_hits: "not_assessed",
      meta_narration_hits: "not_assessed",
      backstage_accounting_hits: backstageAccountingHits.length,
      dense_paragraph_hits: denseParagraphHits,
      max_paragraph_chars: maxParagraphChars,
      long_sentence_hits: longSentenceHits,
      max_sentence_chars: maxSentenceChars,
      example_blocks: exampleBlocks.length,
      table_blocks: tableBlocks.length,
      max_table_width: maxTableWidth,
      thread_count: threadCount,
      thread_complete_count: threadCompleteCount,
      thread_missing_in_body: threadMissingInBody.join("｜"),
      representation_purpose: representationPurpose,
      max_diagram_width: maxDiagramWidth,
      body_chars: bodyChars,
      coverage_supplied: Boolean(coverage),
      coverage_zones: coverageZones,
      coverage_loop_fields: coverageLoopFields,
      coverage_concretization_fields: coverageConcretizationFields,
      coverage_embodiment_fields: coverageEmbodimentFields,
      coverage_whole_book_identity_fields: coverageWholeBookIdentityFields,
      required_whole_book_anchor_count: requiredWholeBookAnchors.length,
      required_whole_book_anchor_hits: requiredWholeBookAnchorHits,
      missing_whole_book_anchors: missingWholeBookAnchors.join("｜"),
      generic_whole_book_anchors: genericWholeBookAnchorHits.join("｜"),
      essence_heading_count: essenceHeadingIndexes.length,
      essence_is_last_heading: essenceHeadingIndex >= 0 && essenceHeadingIndex === allHeadings.length - 1,
      essence_paragraph_count: essenceParagraphs.length,
      essence_sentence_count: essenceSentenceCount,
      essence_format_line_hits: essenceFormatLineHits,
      essence_chars: essenceChars,
      coverage_essence_fields: coverageEssenceFields,
      coverage_title_answer: coverageTitleAnswer,
      coverage_understanding_fields: coverageUnderstandingFields,
      coverage_runnable_fields: coverageUnderstandingFields === understandingPathFields.length
        ? coverageUnderstandingFields
        : coverageRunnableFields,
      coverage_book_selection_fields: coverageBookSelectionFields,
      coverage_narrative_continuity_fields: coverageNarrativeContinuityFields,
      coverage_candidate_count: coverageCandidateCount,
      coverage_legacy_narrative_selection_fields: coverageLegacyNarrativeSelectionFields,
      coverage_contract_version: coverageContractVersion,
      coverage_generator_gate_present: coverageGeneratorGatePresent,
      generator_exists: generatorExists,
      coverage_generator_fields: coverageGeneratorFields,
      generator_anchor_count: generatorAnchorCount,
      generator_anchor_hits: generatorAnchorHits,
      generator_early_anchor_hits: generatorEarlyAnchorHits,
      generator_early_decision: generatorEarlyDecision,
      representation_required: representationRequired,
      representation_run_anchor: representationRunAnchor,
      representation_run_anchor_hit: "not_assessed",
      frontstage_count: frontstageCount,
      frontstage_complete_count: frontstageCompleteCount,
      frontstage_missing_in_body: frontstageMissingInBody.join("｜"),
      frontstage_duplicate_responsibilities: frontstageDuplicateResponsibilities.join("｜"),
      understanding_path_support: understandingPathSupport,
      runnable_support: understandingPathSupport,
      format: markdownMode ? "markdown" : "org",
    },
  };
}

function main(): never {
  const args = process.argv.slice(2);
  const stdinMode = args[0] === "--stdin";
  const file = stdinMode ? args[1] ?? "19700101T000000--stdin__book.org" : args[0];
  const coverageFlag = args.indexOf("--coverage");
  const coveragePath = coverageFlag >= 0 ? args[coverageFlag + 1] : undefined;

  if (!file) {
    console.error("用法：bun scripts/validate_note.ts <note.org|note.md> --coverage <coverage-map.md>");
    console.error("或：  bun scripts/validate_note.ts --stdin <denote-filename> --coverage <coverage-map.md>");
    process.exit(2);
  }

  if (coverageFlag >= 0 && !coveragePath) {
    console.error("--coverage 后必须提供覆盖记录路径");
    process.exit(2);
  }

  const content = stdinMode ? readFileSync(0, "utf8") : readFileSync(file, "utf8");
  const coverage = coveragePath ? readFileSync(coveragePath, "utf8") : undefined;
  const result = validate(content, file, coverage);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

if (import.meta.main) {
  main();
}
