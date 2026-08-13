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
const fullCoverageLoopFields = [
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
const fullConcretizationFields = [
  "核心动作或变化",
  "原状态",
  "只改变的关键条件或动作",
  "可见结果",
  "角色、动作、方向与结果怎样对应",
  "失败或反例怎样划出边界",
  "删掉解释后，场景本身还能看见什么",
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

  let materialGrade = "";
  let coverageZones = 0;
  let coverageLoopFields = 0;
  let coverageConcretizationFields = 0;
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
      coverageLoopFields = fullCoverageLoopFields.filter((field) => substantive(lineField(coverage, field))).length;
      coverageConcretizationFields = fullConcretizationFields.filter((field) => substantive(lineField(coverage, field))).length;
      const challengeFields = ["当前理解", "反证", "处理"].filter((field) => substantive(lineField(coverage, field))).length;

      if (authorFields !== 3) errors.push("完整拆书的覆盖记录没有填完作者自述的问题、对象与方法");
      if (coverageZones !== 4) errors.push("完整拆书的覆盖记录没有填完问题、对象、机制与边界四类证据的位置");
      if (candidates.length < 5 || candidates.length > 12) {
        errors.push(`完整拆书的覆盖记录必须有 5–12 个候选部件，当前为 ${candidates.length}`);
      } else if (completeCandidates !== candidates.length) {
        errors.push("完整拆书的候选部件必须填完名称、位置、作用、关系、决定与删除测试");
      }
      if (coverageLoopFields !== fullCoverageLoopFields.length) {
        errors.push("完整拆书的覆盖记录没有把例子从处境、张力和旧反应一路回流到返程");
      }
      if (coverageConcretizationFields !== fullConcretizationFields.length) {
        errors.push("完整拆书的覆盖记录没有完成核心变化、场景对应、失败边界与删解释测试");
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
  if (bodyChars < 1000 || bodyChars > 1800) {
    warnings.push(`正文约 ${bodyChars} 字，超出通常的 1000–1800 字范围；以走完关键变化为准`);
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
      example_blocks: exampleBlocks.length,
      max_diagram_width: maxDiagramWidth,
      body_chars: bodyChars,
      coverage_supplied: Boolean(coverage),
      coverage_zones: coverageZones,
      coverage_loop_fields: coverageLoopFields,
      coverage_concretization_fields: coverageConcretizationFields,
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
