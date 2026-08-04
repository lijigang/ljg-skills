#!/usr/bin/env bun

import { basename } from "node:path";

export type ValidationResult = {
  ok: boolean;
  errors: string[];
  identifier?: string;
  core?: string;
  schema?: "legacy" | "ljg-is-v2";
};

type NoteFormat = "org" | "md";

type EmphasizedBullet = {
  label: string;
  value: string;
};

const LEGACY_REQUIRED_HEADINGS = ["问题", "完整表达", "剥离", "本质", "示例", "验证"];
const V2_REQUIRED_HEADINGS = ["问题", "完整表达", "剥离", "本质", "示例", "结构迁移", "验证"];
const V2_SCHEMA = "ljg-is-v2";
const GENERIC_CORES = new Set([
  "服务",
  "价值",
  "连接",
  "体验",
  "效率",
  "安全",
  "舒适",
  "满足需求",
]);

function metadataValue(content: string, key: string, format: NoteFormat): string | undefined {
  const prefix = format === "org" ? "#\\+" : "";
  const match = content.match(new RegExp(`^${prefix}${key}:\\s*(.+?)\\s*$`, "mi"));
  return match?.[1]?.trim();
}

function sectionBody(content: string, heading: string, format: NoteFormat): string | undefined {
  const lines = content.split(/\r?\n/u);
  const headingLine = `${format === "org" ? "*" : "#"} ${heading}`;
  const start = lines.findIndex((line) => line.trimEnd() === headingLine);
  if (start < 0) return undefined;

  const nextHeading = format === "org" ? /^\* /u : /^# /u;
  const endOffset = lines.slice(start + 1).findIndex((line) => nextHeading.test(line));
  const end = endOffset < 0 ? lines.length : start + 1 + endOffset;
  return lines.slice(start + 1, end).join("\n").trim();
}

function parseCompleteCore(line: string): string | undefined {
  const value = line.replace(/^完整：/, "").trim();
  if (!value) return undefined;

  if (value.startsWith("（")) {
    const closing = value.indexOf("）");
    if (closing <= 1) return undefined;
    const core = value.slice(closing + 1).trim();
    return core || undefined;
  }

  return value;
}

function labeledLines(body: string, label: string): string[] {
  const prefix = `${label}：`;
  return body
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.startsWith(prefix));
}

function nonEmptyLines(body: string): string[] {
  return body
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseEmphasizedBullets(body: string, format: NoteFormat): EmphasizedBullet[] {
  const pattern = format === "org"
    ? /^- \*([^*\n]+)\*：\s*(.+)$/u
    : /^- \*\*([^*\n]+)\*\*：\s*(.+)$/u;

  return nonEmptyLines(body).flatMap((line) => {
    const match = line.match(pattern);
    if (!match) return [];
    const label = match[1]?.trim() ?? "";
    const value = match[2]?.trim() ?? "";
    return label && value ? [{ label, value }] : [];
  });
}

function hasExactLabels(entries: EmphasizedBullet[], labels: string[]): boolean {
  return JSON.stringify(entries.map(({ label }) => label)) === JSON.stringify(labels);
}

export function validateNoteText(filePath: string, content: string): ValidationResult {
  const errors: string[] = [];
  const fileName = basename(filePath);
  const extensionMatch = fileName.match(/\.(org|md)$/u);
  const format = extensionMatch?.[1] as NoteFormat | undefined;
  const fileMatch = fileName.match(/^(\d{8}T\d{6})--本质-(.+)__is\.(org|md)$/u);

  if (!format || !fileMatch) {
    errors.push("文件名必须符合 YYYYMMDDTHHMMSS--本质-<目标>__is.org 或 __is.md");
  } else if (!fileMatch[2]?.trim()) {
    errors.push("文件名中的目标片段不能为空");
  }

  const effectiveFormat = format ?? "org";
  const title = metadataValue(content, "title", effectiveFormat);
  const date = metadataValue(content, "date", effectiveFormat);
  const identifier = metadataValue(content, "identifier", effectiveFormat);
  const filetags = metadataValue(
    content,
    effectiveFormat === "org" ? "filetags" : "tags",
    effectiveFormat,
  );
  const declaredSchema = metadataValue(content, "schema", effectiveFormat);
  const isV2 = declaredSchema === V2_SCHEMA;
  const schema = isV2 ? V2_SCHEMA : "legacy";
  const metadataPrefix = effectiveFormat === "org" ? "#+" : "";

  if (declaredSchema && !isV2) {
    errors.push(`${metadataPrefix}schema 只支持 ${V2_SCHEMA}；无 schema 的历史笔记按 legacy 校验`);
  }

  if (!title?.startsWith("本质：") || title === "本质：") {
    errors.push(`${metadataPrefix}title 必须是非空的「本质：<目标>」`);
  }
  if (!date || (effectiveFormat === "org" && !/^\[[^\]]+\]$/u.test(date))) {
    errors.push(`${metadataPrefix}date 缺失或格式不正确`);
  }
  if (!identifier || !/^\d{8}T\d{6}$/u.test(identifier)) {
    errors.push(`${metadataPrefix}identifier 必须是 YYYYMMDDTHHMMSS`);
  }
  if (fileMatch && identifier && identifier !== fileMatch[1]) {
    errors.push(`${metadataPrefix}identifier 必须与文件名时间戳一致`);
  }
  const tags = filetags?.replace(/[\[\],:]/gu, " ").split(/\s+/u).filter(Boolean) ?? [];
  if (!tags.includes("is")) {
    errors.push(`${metadataPrefix}${effectiveFormat === "org" ? "filetags" : "tags"} 必须包含 is`);
  }

  const headingPattern = effectiveFormat === "org" ? /^\* ([^\n]+?)\s*$/gmu : /^# ([^\n]+?)\s*$/gmu;
  const headings = [...content.matchAll(headingPattern)].map(
    (match) => match[1] ?? "",
  );
  const requiredHeadings = isV2 ? V2_REQUIRED_HEADINGS : LEGACY_REQUIRED_HEADINGS;
  if (JSON.stringify(headings) !== JSON.stringify(requiredHeadings)) {
    errors.push(`一级标题必须严格依次为：${requiredHeadings.join(" / ")}`);
  }

  if (effectiveFormat === "org") {
    if (/^#{1,6}\s+/mu.test(content) || /```/u.test(content)) {
      errors.push("Org 文件中不能出现 Markdown 标题或代码围栏");
    }
    if (/\[[^\]\n]+\]\([^\)\n]+\)/u.test(content)) {
      errors.push("Org 文件中不能出现 Markdown 链接语法");
    }
  } else if (/^#\+/mu.test(content) || /^\* (?:问题|完整表达|剥离|本质|示例|验证)\s*$/mu.test(content)) {
    errors.push("Markdown 文件中不能出现 Org 元数据或 Org 一级标题");
  }
  if (/\b(?:TODO|TBD)\b|待补|占位|\{[^}\n]+\}/iu.test(content)) {
    errors.push("文件中不能残留 TODO、TBD 或模板占位符");
  }
  if (/^问题类型：/mu.test(content)) {
    errors.push("不得保留恒定的「问题类型」字段；ljg-is 始终寻找目的本质");
  }

  const problemBody = sectionBody(content, "问题", effectiveFormat) ?? "";
  const confusionLines = labeledLines(problemBody, "容易误认");
  const realQuestionLines = labeledLines(problemBody, "真正问题");
  const allConfusionLines = labeledLines(content, "容易误认");
  const allRealQuestionLines = labeledLines(content, "真正问题");
  if (
    confusionLines.length !== 1
    || allConfusionLines.length !== 1
    || !confusionLines[0]?.replace(/^容易误认：/u, "").trim()
  ) {
    errors.push("「问题」必须有且只有一行非空的「容易误认：...」");
  }
  if (
    realQuestionLines.length !== 1
    || allRealQuestionLines.length !== 1
    || !realQuestionLines[0]?.replace(/^真正问题：/u, "").trim()
  ) {
    errors.push("「问题」必须有且只有一行非空的「真正问题：...」");
  }

  const completeBody = sectionBody(content, "完整表达", effectiveFormat) ?? "";
  const completeLines = completeBody
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("完整："));
  if (completeLines.length !== 1) {
    errors.push("「完整表达」必须有且只有一行「完整：...」");
  }

  const essenceBody = sectionBody(content, "本质", effectiveFormat) ?? "";
  const coreLines = essenceBody
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("核心："));
  const allCoreLines = [...content.matchAll(/^核心：(.+)$/gmu)];
  if (coreLines.length !== 1 || allCoreLines.length !== 1) {
    errors.push("全文必须有且只有一行「核心：...」，并位于「本质」中");
  }

  const core = coreLines[0]?.replace(/^核心：/, "").trim();
  if (!core) {
    errors.push("核心不能为空");
  } else {
    if (/[()（）]/u.test(core)) {
      errors.push("核心不能包含括号；限定条件应留在完整表达中");
    }
    if ([...core].length > 30) {
      errors.push("核心不能超过 30 个 Unicode 字符");
    }
    if (GENERIC_CORES.has(core)) {
      errors.push("核心不能只是无方向的泛化名词");
    }
  }

  if (completeLines.length === 1) {
    const completeLine = completeLines[0] ?? "";
    if (/[()]/u.test(completeLine)) {
      errors.push("完整表达若使用括号，必须使用全角括号「（ ）」");
    }
    const completeCore = parseCompleteCore(completeLine);
    if (!completeCore) {
      errors.push("完整表达必须在限定条件后落到非空核心");
    } else if (core && completeCore !== core) {
      errors.push("完整表达的落脚核心必须与「核心：」完全一致");
    }
  }

  const peelBody = sectionBody(content, "剥离", effectiveFormat) ?? "";
  const peelLines = nonEmptyLines(peelBody);
  const peelEntries = parseEmphasizedBullets(peelBody, effectiveFormat);
  if (peelLines.length !== peelEntries.length) {
    errors.push("「剥离」每一行都必须是带强调关键词的 bullet");
  }
  if (peelEntries.length < 2) {
    errors.push("「剥离」至少需要一个限定分类和最后一个「状态式」bullet");
  }
  const peelLabels = peelEntries.map(({ label }) => label);
  if (new Set(peelLabels).size !== peelLabels.length) {
    errors.push("「剥离」的关键词不能重复");
  }
  const stateEntries = peelEntries.filter(({ label }) => label === "状态式");
  if (stateEntries.length !== 1 || peelEntries.at(-1)?.label !== "状态式") {
    errors.push("「剥离」必须以唯一的强调关键词「状态式」收尾");
  }
  if (peelEntries.filter(({ label }) => label !== "状态式").length < 1) {
    errors.push("「剥离」必须至少说明一类被移出核心的限定");
  }
  if (stateEntries.length === 1 && !stateEntries[0]?.value.includes("->")) {
    errors.push("「剥离」的「状态式」必须包含 ->");
  }

  const exampleBody = sectionBody(content, "示例", effectiveFormat) ?? "";
  const exampleLines = nonEmptyLines(exampleBody);
  const exampleEntries = parseEmphasizedBullets(exampleBody, effectiveFormat);
  const exampleLabels = ["代入", "操作", "变化", "点题"];
  if (
    exampleLines.length !== exampleEntries.length
    || !hasExactLabels(exampleEntries, exampleLabels)
  ) {
    errors.push("「示例」必须严格依次使用强调 bullet：代入 / 操作 / 变化 / 点题");
  }
  const exampleValues = new Map(exampleEntries.map(({ label, value }) => [label, value]));
  if (exampleValues.has("代入") && !exampleValues.get("代入")?.includes("你")) {
    errors.push("「示例」的「代入」必须使用第二人称「你」");
  }
  if (exampleValues.has("操作") && !exampleValues.get("操作")?.includes("你")) {
    errors.push("「示例」的「操作」必须让「你」执行或观察具体动作");
  }
  if (exampleValues.has("变化") && !exampleValues.get("变化")?.includes("->")) {
    errors.push("「示例」的「变化」必须包含 ->");
  }
  if (core && exampleValues.has("点题") && !exampleValues.get("点题")?.includes(core)) {
    errors.push("「示例」的「点题」必须逐字包含最终核心");
  }

  if (isV2) {
    const transferBody = sectionBody(content, "结构迁移", effectiveFormat) ?? "";
    const transferLines = nonEmptyLines(transferBody);
    const transferEntries = parseEmphasizedBullets(transferBody, effectiveFormat);
    const transferLabels = ["结构式", "变量", "迁移", "边界"];
    if (
      transferLines.length !== transferEntries.length
      || !hasExactLabels(transferEntries, transferLabels)
    ) {
      errors.push("v2「结构迁移」必须严格依次使用强调 bullet：结构式 / 变量 / 迁移 / 边界");
    }

    const transferValues = new Map(transferEntries.map(({ label, value }) => [label, value]));
    if (transferValues.has("结构式") && !transferValues.get("结构式")?.includes("->")) {
      errors.push("v2「结构式」必须包含 ->，保留变化方向");
    }
    if (transferValues.has("变量") && !transferValues.get("变量")?.includes("=")) {
      errors.push("v2「变量」必须使用 = 逐一解释结构式中的符号");
    }
    if (transferValues.has("迁移") && !transferValues.get("迁移")?.includes("->")) {
      errors.push("v2「迁移」必须包含目标领域的具体 -> 状态变化");
    }
    const boundary = transferValues.get("边界");
    if (boundary && (!boundary.includes("只迁移") || !boundary.includes("不迁移"))) {
      errors.push("v2「边界」必须同时说明「只迁移」与「不迁移」的内容");
    }
  }

  const validationBody = sectionBody(content, "验证", effectiveFormat) ?? "";
  const validationLines = nonEmptyLines(validationBody);
  const validationEntries = parseEmphasizedBullets(validationBody, effectiveFormat);
  if (
    validationLines.length !== validationEntries.length
    || !hasExactLabels(validationEntries, ["替换", "删除"])
  ) {
    errors.push("「验证」必须且只能依次使用两个强调 bullet：替换 / 删除");
  }

  return {
    ok: errors.length === 0,
    errors,
    identifier,
    core,
    schema,
  };
}

export async function validateNoteFile(filePath: string): Promise<ValidationResult> {
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    return { ok: false, errors: [`文件不存在：${filePath}`] };
  }
  return validateNoteText(filePath, await file.text());
}

if (import.meta.main) {
  const filePath = Bun.argv[2];
  if (filePath === "--help" || filePath === "-h") {
    console.log("用法：bun ValidateNote.ts <note-file>");
    console.log("校验 ljg-is 笔记：历史六段结构兼容；v2 七段结构增加结构式、变量、跨域迁移与边界。");
    process.exit(0);
  }
  if (!filePath) {
    console.error(
      JSON.stringify({ status: "error", errors: ["用法：bun ValidateNote.ts <note-file>"] }),
    );
    process.exit(2);
  }

  const result = await validateNoteFile(filePath);
  if (!result.ok) {
    console.error(JSON.stringify({ status: "error", ...result }, null, 2));
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        status: "ok",
        path: filePath,
        identifier: result.identifier,
        core: result.core,
        schema: result.schema,
      },
      null,
      2,
    ),
  );
}
