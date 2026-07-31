#!/usr/bin/env bun

import { basename } from "node:path";

export type ValidationResult = {
  ok: boolean;
  errors: string[];
  identifier?: string;
  core?: string;
};

type NoteFormat = "org" | "md";

const REQUIRED_HEADINGS = ["目标", "完整表达", "剥离", "本质", "验证"];
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
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const marker = format === "org" ? "\\*" : "#";
  const match = content.match(
    new RegExp(`^${marker} ${escaped}\\s*$\\n([\\s\\S]*?)(?=^${marker} |\\s*$)`, "m"),
  );
  return match?.[1]?.trim();
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
  const metadataPrefix = effectiveFormat === "org" ? "#+" : "";

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
  if (JSON.stringify(headings) !== JSON.stringify(REQUIRED_HEADINGS)) {
    errors.push(`一级标题必须严格依次为：${REQUIRED_HEADINGS.join(" / ")}`);
  }

  if (effectiveFormat === "org") {
    if (/^#{1,6}\s+/mu.test(content) || /```/u.test(content)) {
      errors.push("Org 文件中不能出现 Markdown 标题或代码围栏");
    }
    if (/\[[^\]\n]+\]\([^\)\n]+\)/u.test(content)) {
      errors.push("Org 文件中不能出现 Markdown 链接语法");
    }
  } else if (/^#\+/mu.test(content) || /^\* (?:目标|完整表达|剥离|本质|验证)\s*$/mu.test(content)) {
    errors.push("Markdown 文件中不能出现 Org 元数据或 Org 一级标题");
  }
  if (/\b(?:TODO|TBD)\b|待补|占位|[<{（]\s*(?:目标|核心|限定|时间戳)\s*[>}）]/iu.test(content)) {
    errors.push("文件中不能残留 TODO、TBD 或模板占位符");
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

  return {
    ok: errors.length === 0,
    errors,
    identifier,
    core,
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
    console.log("校验 ljg-is 生成的 Denote/Org 或 Markdown 笔记结构与极简核心。");
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
      { status: "ok", path: filePath, identifier: result.identifier, core: result.core },
      null,
      2,
    ),
  );
}
