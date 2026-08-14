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
const runnableFields = [
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
const bookSelectionFields = [
  "贯穿全书的普通问题",
  "正文保留哪两到四个关系",
  "为什么这些关系足以让读者理解全书主干",
  "哪些重要内容留在后台而不进入正文",
  "各模块如何继续使用同一对象，或为什么必须换对象",
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
  const headings = headingMatches.map((match) => match[1].trim());
  if (headings.length < 2) {
    errors.push(`至少需要 2 个由具体事件、变化或条件命名的一级标题，当前为 ${headings.length}`);
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
    /本轮[^。！？\n]*/g,
    /(?:依据|根据|沿用|来自)[^。！？\n]{0,12}(?:旧稿|现有旧稿|已有旧稿)[^。！？\n]*/g,
    /(?:旧稿|现有旧稿|已有旧稿)[^。！？\n]{0,12}(?:保存|提供|支持|记录|留下)[^。！？\n]*/g,
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
    /前言|序言|导言|导论|开篇|结论章|末章|章节|前部|中部|后部/g,
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
  const immediateNamingHits = [...narrativeBody.matchAll(/(?:这(?:就)?叫|这就是|也就是说|所谓)[^。！？\n]{0,36}/g)].length;
  if (narrativeBody && immediateNamingHits === 0) {
    warnings.push("正文没有可见的“结果后立即命名”信号；人工确认概念是否紧贴它所解释的动作或结果");
  }

  let materialGrade = "";
  let runnableSupport = "";
  let coverageZones = 0;
  let coverageLoopFields = 0;
  let coverageConcretizationFields = 0;
  let coverageEmbodimentFields = 0;
  let coverageRunnableFields = 0;
  let coverageBookSelectionFields = 0;
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
    runnableSupport = lineField(coverage, "材料能否支撑具体运行");
    coverageRunnableFields = runnableFields.filter((field) => substantive(lineField(coverage, field))).length;
    coverageEmbodimentFields = legacyEmbodimentFields.filter((field) => substantive(lineField(coverage, field))).length;
    if (substantive(runnableSupport)) {
      if (!/^(?:是|否)(?:\b|[—：:，,。\s]|$)/.test(runnableSupport)) {
        errors.push("“材料能否支撑具体运行”必须明确写是或否，并说明依据");
      } else if (/^是/.test(runnableSupport) && coverageRunnableFields !== runnableFields.length) {
        errors.push("材料声明可运行，但覆盖记录没有填完普通问题、稳定对象、首次猜测、微小动作、即时结果、命名、重跑、复述与来源边界");
      } else if (/^否/.test(runnableSupport)) {
        warnings.push("材料不足以支撑具体运行；成品应缩成局部理解或先补材料，不能用泛化场景冒充现场");
      }
    } else if (coverageEmbodimentFields === legacyEmbodimentFields.length) {
      runnableSupport = "legacy";
      warnings.push("覆盖记录仍使用旧版现场化门；本次兼容通过，下次重跑时请改用读者运行门");
    } else {
      errors.push("覆盖记录必须填写新版读者运行门，或提供完整的旧版现场化门以便兼容读取");
    }

    if (materialGrade === "完整拆书") {
      const authorFields = ["问题", "对象", "方法"].filter((field) => substantive(lineField(coverage, field))).length;
      const zones = ["question", "setup", "mechanism", "boundary"];
      coverageZones = zones.filter((zone) => substantive(locationForZone(coverage, zone))).length;
      const candidates = [...coverage.matchAll(/^- \[candidate\]\s+.+$/gm)];
      const candidateFields = ["名称", "位置", "解决的问题", "与其他部件的关系", "决定", "删除测试"];
      const completeCandidates = candidates.filter((candidate) =>
        candidateFields.every((field) => substantive(segmentField(candidate[0], field)))
        && /决定[：:]\s*(?:保留|合并|删除)(?:｜|\||$)/.test(candidate[0]),
      ).length;
      coverageLoopFields = legacyCoverageLoopFields.filter((field) => substantive(lineField(coverage, field))).length;
      coverageConcretizationFields = legacyConcretizationFields.filter((field) => substantive(lineField(coverage, field))).length;
      coverageBookSelectionFields = bookSelectionFields.filter((field) => substantive(lineField(coverage, field))).length;
      const challengeFields = ["当前理解", "反证", "处理"].filter((field) => substantive(lineField(coverage, field))).length;

      if (authorFields !== 3) errors.push("完整拆书的覆盖记录没有填完作者自述的问题、对象与方法");
      if (coverageZones !== 4) errors.push("完整拆书的覆盖记录没有填完问题、对象、机制与边界四类证据的位置");
      if (candidates.length < 5 || candidates.length > 12) {
        errors.push(`完整拆书的覆盖记录必须有 5–12 个候选部件，当前为 ${candidates.length}`);
      } else if (completeCandidates !== candidates.length) {
        errors.push("完整拆书的候选部件必须填完名称、位置、作用、关系、决定与删除测试");
      }
      if (substantive(lineField(coverage, "材料能否支撑具体运行"))
          && coverageBookSelectionFields !== bookSelectionFields.length) {
        errors.push("完整拆书的覆盖记录没有填完普通问题、正文取舍、后台留存与模块对象选择");
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
  if (bodyChars < 1000 || bodyChars > 3000) {
    warnings.push(`正文约 ${bodyChars} 字，超出通常的 1000–3000 字范围；复杂内容应增加步骤或缩小范围，不要提高概念密度`);
  }

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
      immediate_naming_hits: immediateNamingHits,
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
      coverage_runnable_fields: coverageRunnableFields,
      coverage_book_selection_fields: coverageBookSelectionFields,
      runnable_support: runnableSupport,
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
