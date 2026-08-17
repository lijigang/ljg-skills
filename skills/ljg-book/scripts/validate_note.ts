#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import { basename } from "node:path";

export type Result = {
  ok: boolean;
  file: string;
  errors: string[];
  warnings: string[];
  checks: Record<string, number | string | boolean>;
};

const validMaterialGrades = ["完整拆书", "初拆", "假设版"] as const;
const essenceHeading = "读完后留下什么";
const forbiddenExactHeadings = new Set([
  "走进这个问题",
  "作者怎样一步步看见",
  "回到现实",
  "资料校准",
  "问题",
  "发现",
  "启示",
]);
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
  if (headings.length < 2) {
    errors.push(`至少需要 2 个由具体事件、变化或条件命名的一级标题，当前为 ${headings.length}`);
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
    if (essenceChars < 24) {
      errors.push(`精神内核只有 ${essenceChars} 字，仍像主题词或口号；用极直白的话说清作者最终想纠正、重连或保留什么`);
    }
    if (essenceSentenceCount > 4) {
      errors.push(`精神内核用了 ${essenceSentenceCount} 句，已经不够收束；压到一至四句`);
    }
    if (essenceChars > 220) {
      errors.push(`精神内核共 ${essenceChars} 字，已经变成另一份摘要；只留下作者最想让读者真正明白的那层关系`);
    } else if (essenceChars > 160) {
      warnings.push(`精神内核共 ${essenceChars} 字，可能还不够精练；检查能否继续去掉解释而不损失核心`);
    }
  }

  const genericHeadingHits = headings.filter((heading) => forbiddenExactHeadings.has(heading));
  if (genericHeadingHits.length > 0) {
    errors.push(`一级标题不能沿用旧框架或空泛标签：${[...new Set(genericHeadingHits)].join("、")}`);
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
  const firstHeadingEnd = narrativeBody.indexOf("\n");
  const firstParagraph = firstHeadingEnd >= 0
    ? narrativeBody.slice(firstHeadingEnd + 1).trimStart().split(/\r?\n\s*\r?\n/, 1)[0]?.trim() ?? ""
    : "";
  const outsideCameraOpeningPattern = /^(?:书中|本书|作者|本文|本节|这一节|这一步|这里|叙述者)(?:[，,:：\s]|[^。！？]{0,16}(?:给出|提出|指出|说明|展示|带着))/;
  const outsideCameraOpeningHits = outsideCameraOpeningPattern.test(firstParagraph) ? 1 : 0;
  if (outsideCameraOpeningHits > 0) {
    warnings.push("首个正文段落的镜头可能仍在现场外；先让读者或人物看见、判断或行动，再交代书与作者");
  }

  const metaNarrationPattern = /(?:^|[。！？]\s*|\n\s*)((?:书中|本书|作者)(?:给出|提出|指出|认为|说明|展示|称)|(?:本文|本节|这一节)(?:把|将|汇集|说明|展示)|这一步(?:汇集|说明|展示|把|将)|先把[^。！？\n]{0,30}(?:画清|拆开|理清)|这里被改变的(?:是|不是)|(?:保持|保留)[^。！？\n]{0,80}只改变)/gm;
  const metaNarrationHits = [...narrativeBody.matchAll(metaNarrationPattern)].map((match) => match[1]);
  if (metaNarrationHits.length > 0) {
    warnings.push(`正文含可能泄漏后台分析的讲台语言：${[...new Set(metaNarrationHits)].join("、")}；确认事情能否在删掉这些报幕后自行推进`);
  }
  const backstageAccountingPatterns = [
    /讲解者[^。！？\n]{0,30}(?:依据|根据|构造|自建|搭建|简化|设计)[^。！？\n]*/g,
    /(?:不是|并非)书中(?:案例|例子|实验|原例|场景)/g,
    /本轮[^。！？\n]{0,24}(?:核验|核到|读取|提取|查到|验证|未核|未查|不替|未替|补写|补充)[^。！？\n]*/g,
    /本轮(?:真实|现有|已有)?材料(?:测试|核验|读取|提取|检查|验证)[^。！？\n]*/g,
    /(?:旧稿|现有旧稿|已有旧稿)[^。！？\n]{0,20}(?:讲解|模型|边界|本轮|核验|材料|依据|简化|支撑范围)[^。！？\n]*/g,
    /(?:讲解|模型|边界|本轮|核验|材料|依据|简化|支撑范围)[^。！？\n]{0,20}(?:旧稿|现有旧稿|已有旧稿)[^。！？\n]*/g,
    /不能替[^。！？\n]{0,50}(?:作证|证明|下结论)/g,
    /(?:按模型规则|模型设定|继续运行[^。！？\n]{0,20}模型|仍在[^。！？\n]{0,12}模型里)/g,
    /(?:没有|缺少)[^。！？\n]{0,20}(?:全文|原文|材料)(?:可核|可查|可验证)/g,
  ];
  const backstageAccountingHits = backstageAccountingPatterns.flatMap((pattern) =>
    [...narrativeBody.matchAll(pattern)].map((match) => match[0]),
  );
  if (backstageAccountingHits.length > 0) {
    errors.push(`正文含后台核验语言：${[...new Set(backstageAccountingHits)].join("、")}；把来源身份与材料状态移回 coverage，正文改写成对象已经回答什么、还需要哪些现实条件`);
  }
  const sourceStructurePatterns = [
    /(?:^|[。！？\s])(?:前言|序言|导言|导论|开篇|结论章|末章)(?=[，、：:。！？\s]|$)/g,
    /(?:^|[。！？\s])(?:前言|序言|导言|导论|开篇|结论章|末章)[^。！？\n]{0,12}(?:交代|介绍|提出|说明|讨论|写到|展开)/g,
    /(?:作者|本书|书中|原书|正文|内容|叙述|结构)[^。！？\n]{0,12}(?:前部|中部|后部|章节|开篇|结论章|末章)/g,
    /(?:前部|中部|后部|章节)[^。！？\n]{0,12}(?:写到|讨论|介绍|提出|说明|展开|进入|给出)/g,
    /第[0-9一二三四五六七八九十百千万〇两]+(?:章|节|部|卷|篇)/g,
  ];
  const sourceStructureHits = sourceStructurePatterns.flatMap((pattern) =>
    [...narrativeBody.matchAll(pattern)].map((match) => match[0]),
  );
  if (sourceStructureHits.length > 0) {
    errors.push(`正文不能用来源结构标签组织叙述：${[...new Set(sourceStructureHits)].join("、")}`);
  }

  const proseParagraphs = narrativeBody
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph && !/^(?:\*|#|\+|- )/.test(paragraph));
  const paragraphSizes = proseParagraphs.map((paragraph) => [...paragraph.replace(/\s/g, "")].length);
  const maxParagraphChars = paragraphSizes.length ? Math.max(...paragraphSizes) : 0;
  const denseParagraphHits = paragraphSizes.filter((size) => size > 220).length;
  if (denseParagraphHits > 0) {
    warnings.push(`正文有 ${denseParagraphHits} 段超过 220 字；检查是否一次塞入多个新关系，优先拆成可运行的小步`);
  }
  const sentenceSizes = proseParagraphs.flatMap((paragraph) =>
    paragraph.split(/[。！？；]/).map((sentence) => [...sentence.replace(/\s/g, "")].length).filter(Boolean),
  );
  const maxSentenceChars = sentenceSizes.length ? Math.max(...sentenceSizes) : 0;
  const longSentenceHits = sentenceSizes.filter((size) => size > 90).length;
  if (longSentenceHits > 0) {
    warnings.push(`正文有 ${longSentenceHits} 句超过 90 字；朗读时可能失去当前对象，确认每句只推进一个关系`);
  }
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
  if (!coverage) {
    errors.push("所有拆书都必须提供 --coverage 后台覆盖记录");
  } else {
    materialGrade = lineField(coverage, "材料等级");
    if (!validMaterialGrades.includes(materialGrade as (typeof validMaterialGrades)[number])) {
      errors.push("覆盖记录的材料等级必须是：完整拆书 / 初拆 / 假设版");
    }

    const sourceBoundaryFields = ["主要材料", "能支持到"].filter((field) => substantive(lineField(coverage, field))).length;
    if (sourceBoundaryFields !== 2) {
      errors.push("覆盖记录必须写明主要材料与能支持到哪里");
    }
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

  const examplePattern = markdownMode
    ? /^```(?:text)?\s*$([\s\S]*?)^```\s*$/gmi
    : /^#\+begin_example\s*$([\s\S]*?)^#\+end_example\s*$/gmi;
  const exampleBlocks = [...content.matchAll(examplePattern)];
  if (exampleBlocks.length > 1) {
    errors.push("最多保留一个 example 图块");
  }
  const maxDiagramWidth = exampleBlocks.length
    ? Math.max(...exampleBlocks[0][1].split(/\r?\n/).map(displayWidth))
    : 0;
  if (maxDiagramWidth > 80) {
    errors.push(`ASCII 图宽度 ${maxDiagramWidth}，超过 80`);
  }

  const bodyChars = [...narrativeBody.replace(/\s/g, "")].length;

  return {
    ok: errors.length === 0,
    file,
    errors,
    warnings,
    checks: {
      identifier,
      material_grade: materialGrade,
      top_headings: headings.length,
      generic_heading_hits: genericHeadingHits.length,
      internal_framework_hits: legacyTriadHits.length + internalHeadingHits.length,
      calibration_hits: calibrationHits,
      visible_material_grade_hits: visibleMaterialGradeHits,
      source_structure_hits: sourceStructureHits.length,
      outside_camera_opening_hits: outsideCameraOpeningHits,
      meta_narration_hits: metaNarrationHits.length,
      backstage_accounting_hits: backstageAccountingHits.length,
      dense_paragraph_hits: denseParagraphHits,
      max_paragraph_chars: maxParagraphChars,
      long_sentence_hits: longSentenceHits,
      max_sentence_chars: maxSentenceChars,
      example_blocks: exampleBlocks.length,
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
      understanding_path_support: understandingPathSupport,
      runnable_support: understandingPathSupport,
      format: markdownMode ? "markdown" : "org",
    },
  };
}

function main(): never {
  const args = process.argv.slice(2);
  const stdinMode = args[0] === "--stdin";
  const file = stdinMode ? args[1] ?? "19700101T000000--stdin__book.md" : args[0];
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
