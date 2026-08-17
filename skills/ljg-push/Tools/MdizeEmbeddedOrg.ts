import { readFile, writeFile } from "node:fs/promises";

const orgFence = /^([\t ]*)```org[\t ]*$/;
const bareFence = /^([\t ]*)```[\t ]*$/;
const closingFence = /^[\t ]*```[\t ]*$/;
const orgHeader = /^[\t ]*#\+([A-Za-z_]+):[\t ]*(.*)$/;

function orgTemplateFence(lines: string[], index: number): RegExpMatchArray | null {
  const explicit = lines[index].match(orgFence);
  if (explicit) return explicit;
  const bare = lines[index].match(bareFence);
  return bare && orgHeader.test(lines[index + 1] ?? "") ? bare : null;
}

function yamlHeader(key: string, value: string, indent: string): string {
  const normalizedKey = key.toLowerCase() === "filetags" ? "tags" : key.toLowerCase();
  let normalizedValue = value.trim();
  if (normalizedKey === "tags") {
    normalizedValue = normalizedValue.replace(/^:+|:+$/g, "").replace(/:+/g, " ");
  }
  return `${indent}${normalizedKey}: ${normalizedValue}`;
}

function convertOrgBodyLine(line: string): string {
  const heading = line.match(/^([\t ]*)(\*+)[\t ]+(.*)$/);
  let converted = heading
    ? `${heading[1]}${"#".repeat(heading[2].length)} ${heading[3]}`
    : line;

  converted = converted
    .replace(/\[\[file:([^\]]+)\]\]/g, "![]($1)")
    .replace(/\[\[([^\][\n]+)\]\[([^\][\n]+)\]\]/g, "[$2]($1)")
    .replace(/\*([^*\n]+)\*/g, "**$1**")
    .replace(/~([^~\n]+)~/g, "`$1`");

  if (/^[\t ]*-{5,}[\t ]*$/.test(converted)) {
    return converted.replace(/-{5,}/, "---");
  }
  return converted;
}

export function convertEmbeddedOrgTemplates(content: string): string {
  const normalizedLines = content.replace(/\r\n/g, "\n").split("\n");
  if (!normalizedLines.some((_, index) => orgTemplateFence(normalizedLines, index))) {
    return content;
  }

  const usesOnlyCrlf = content.includes("\r\n") && !content.replace(/\r\n/g, "").includes("\n");
  const trailingNewline = content.endsWith("\n");
  const lines = normalizedLines;
  const output: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const fence = orgTemplateFence(lines, index);
    if (!fence) {
      output.push(lines[index]);
      continue;
    }

    const indent = fence[1];
    let cursor = index + 1;
    const headers: Array<{ key: string; value: string }> = [];
    while (cursor < lines.length) {
      const header = lines[cursor].match(orgHeader);
      if (!header) break;
      headers.push({ key: header[1], value: header[2] });
      cursor += 1;
    }

    let closing = cursor;
    while (closing < lines.length && !closingFence.test(lines[closing])) closing += 1;
    if (closing >= lines.length) {
      output.push(lines[index]);
      continue;
    }

    output.push(`${indent}\`\`\`markdown`);
    if (headers.length > 0) {
      output.push(`${indent}---`);
      output.push(...headers.map(({ key, value }) => yamlHeader(key, value, indent)));
      output.push(`${indent}---`);
      if (lines[cursor] === "") cursor += 1;
    }
    for (; cursor < closing; cursor += 1) {
      output.push(convertOrgBodyLine(lines[cursor]));
    }
    output.push(lines[closing]);
    index = closing;
  }

  const converted = output.join("\n");
  const withTrailingNewline = trailingNewline && !converted.endsWith("\n")
    ? `${converted}\n`
    : converted;
  return usesOnlyCrlf ? withTrailingNewline.replace(/\n/g, "\r\n") : withTrailingNewline;
}

if (import.meta.main) {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error("Usage: bun Tools/MdizeEmbeddedOrg.ts <markdown-file> [...]");
    process.exit(2);
  }
  for (const file of files) {
    const source = await readFile(file, "utf8");
    const converted = convertEmbeddedOrgTemplates(source);
    if (converted !== source) await writeFile(file, converted, "utf8");
  }
}
