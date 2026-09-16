#!/usr/bin/env bun

import { resolve } from "node:path";
import { runInNewContext } from "node:vm";

const VERSION = "4.7.1";

const HELP = `ValidateDeck ${VERSION}

Usage:
  bun Tools/ValidateDeck.ts <deck.html> [--theme black|red|yellow|hacker|hacker-dark] [--template] [--json]
  bun Tools/ValidateDeck.ts --self-test
  bun Tools/ValidateDeck.ts --help

Checks:
  template version and JavaScript syntax
  stable centered stage axis, finite composition grammar, whitespace budget, header/footer contract
  semantic-atom Takahashi typography, CJK tail guard, grouped rows and measured fit guard
  chart data, single-series numeric geometry and source provenance
  offline math guards and presentation key map
  zero motion; embedded raster images/fonts and zero external resources
  flat Hacker theme grammar when --theme hacker or --theme hacker-dark
`;

type Check = { id: string; pass: boolean; detail: string };
type Options = {
  file?: string;
  theme?: string;
  template: boolean;
  json: boolean;
  selfTest: boolean;
  help: boolean;
};

function parseArgs(args: string[]): Options {
  const options: Options = { template: false, json: false, selfTest: false, help: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--template") options.template = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--self-test") options.selfTest = true;
    else if (arg === "--theme") options.theme = args[++index];
    else if (arg.startsWith("--theme=")) options.theme = arg.slice("--theme=".length);
    else if (arg.startsWith("-")) throw new Error(`Unknown option: ${arg}`);
    else if (!options.file) options.file = arg;
    else throw new Error(`Unexpected argument: ${arg}`);
  }
  return options;
}

function materializeTemplate(html: string, theme = "hacker") {
  const fixtureSlides = [
    { emphasis: true, lines: [{ indent: 0, chunks: [{ t: "章节" }] }], sourceIds: ["SRC-001"] },
    { lines: [{ indent: 0, chunks: [{ t: "脑力：组织信息" }] }, { indent: 0, chunks: [{ t: "心力：组织自己" }] }], sourceIds: ["SRC-002", "SRC-003"] },
    { lines: [{ indent: 0, chunks: [{ t: "一" }] }, { indent: 0, chunks: [{ t: "二" }] }, { indent: 0, chunks: [{ t: "三" }] }], sourceIds: ["SRC-004", "SRC-005", "SRC-006"] },
    { lines: [{ indent: 0, chunks: [{ t: "A" }] }, { indent: 0, chunks: [{ t: "B" }] }, { indent: 0, chunks: [{ t: "C" }] }, { indent: 0, chunks: [{ t: "D" }] }], sourceIds: ["SRC-007", "SRC-008", "SRC-009", "SRC-010"] },
    { lines: [{ indent: 0, chunks: [{ t: "$$C(Q)=C_1 \\cdot Q^{-b}$$" }] }], sourceIds: ["SRC-011"] },
    { lines: [{ indent: 0, chunks: [{ t: "定价: $20/month" }] }], sourceIds: ["SRC-012"] },
    { lines: [{ indent: 0, chunks: [{ t: "AI 为火药，人为点火者。" }] }], sourceIds: ["SRC-013"] },
    { quote: true, lines: [{ indent: 0, chunks: [{ t: "人 → 人 + Agents" }] }], sourceIds: ["SRC-014"] },
    { semanticGroup: "list-run", lines: [{ indent: 0, chunks: [{ t: "System 0: 本能" }] }, { indent: 0, chunks: [{ t: "System 1: 快思考" }] }, { indent: 0, chunks: [{ t: "System 2: 慢思考" }] }], sourceIds: ["SRC-015", "SRC-016", "SRC-017"] },
    { table: { caption: "无表头", header: false, rows: [["能量", "太阳能"], ["组织", "国家"]] }, sourceIds: ["SRC-018"] },
    { pre: "+---+\n|AI |\n+---+", sourceIds: ["SRC-019"] },
    { chart: { kind: "bar", title: "收支", unit: "元", items: [{ label: "支出", value: -2 }, { label: "结余", value: 0 }, { label: "收入", value: 3, emphasis: true }] }, sourceIds: ["SRC-020"] },
    { chart: { kind: "line", title: "增长", xLabel: "时间", items: [{ label: "首日", x: 1, value: 3 }, { label: "末日", x: 5, value: 6 }] }, sourceIds: ["SRC-021"] },
    { chart: { kind: "flow", title: "处理", items: [{ label: "输入" }, { label: "输出", text: "完成" }] }, sourceIds: ["SRC-022"] },
    { chart: { kind: "compare", title: "选择", items: [{ label: "A", text: "简单" }, { label: "B", text: "完整" }] }, sourceIds: ["SRC-023"] }
  ];
  return html
    .replaceAll("{{TITLE}}", () => "Fixture Deck")
    .replaceAll("{{SUBTITLE}}", () => "Fixture Meta")
    .replaceAll("{{THEME}}", () => theme)
    .replaceAll("{{SLIDES_JSON}}", () => JSON.stringify(fixtureSlides));
}

function mathSegments(text: string) {
  return [...text.matchAll(/\$\$([\s\S]+?)\$\$|\$(?![\d?])([^$\n]+?)\$/g)].map((match) => match[0]);
}

function chooseLayout(weights: number[]) {
  const lineCount = weights.length;
  if (lineCount >= 2 && lineCount <= 4) return "rows";
  return "single";
}

function splitSelectors(selectors: string): string[] {
  const parts: string[] = [];
  let depth = 0, start = 0;
  for (let i = 0; i < selectors.length; i += 1) {
    if (selectors[i] === "(" || selectors[i] === "[") depth += 1;
    else if (selectors[i] === ")" || selectors[i] === "]") depth -= 1;
    else if (selectors[i] === "," && depth === 0) { parts.push(selectors.slice(start, i).trim()); start = i + 1; }
  }
  parts.push(selectors.slice(start).trim());
  return parts;
}

function ruleBodies(style: string, exactSelector: string) {
  const bodies: string[] = [];
  for (const match of style.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = splitSelectors(match[1]);
    if (selectors.includes(exactSelector)) bodies.push(match[2]);
  }
  return bodies;
}

function relativeLuminance(hex: string) {
  const channels = hex.match(/[0-9a-f]{2}/gi)?.map((value) => parseInt(value, 16) / 255) || [];
  if (channels.length !== 3) return Number.NaN;
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground: string, background: string) {
  const fg = relativeLuminance(foreground);
  const bg = relativeLuminance(background);
  return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sourceIds(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0
    && value.every((id) => typeof id === "string" && id.trim().length > 0)
    && new Set(value).size === value.length;
}

function chartDataErrors(raw: unknown): string[] {
  if (!Array.isArray(raw)) return ["RAW_SLIDES must be an array"];
  const errors: string[] = [];
  for (const [index, value] of raw.entries()) {
    if (!isRecord(value) || !("chart" in value)) continue;
    const fail = (message: string) => errors.push(`slide ${index + 1}: ${message}`);
    const chart = value.chart;
    if (!isRecord(chart)) { fail("chart must be an object"); continue; }
    const kind = chart.kind;
    if (!["bar", "line", "flow", "compare"].includes(String(kind))) fail("unsupported chart kind");
    if (typeof chart.title !== "string" || !chart.title.trim()) fail("chart title is required");
    for (const key of ["unit", "xLabel", "yLabel", "note"]) {
      if (key in chart && typeof chart[key] !== "string") fail(`${key} must be a string`);
    }
    if (kind !== "line" && ("xLabel" in chart || "yLabel" in chart)) fail("xLabel and yLabel are only valid for line charts");
    if (kind !== "bar" && kind !== "line" && "unit" in chart) fail("unit is only valid for bar and line charts");
    const chartKeys = new Set(["kind", "title", "items", "unit", "xLabel", "yLabel", "note"]);
    if (Object.keys(chart).some((key) => !chartKeys.has(key))) fail("chart contains an unsupported field");
    const conflicts = ["pre", "preTitle", "table", "lines", "cover", "title", "emphasis", "quote", "sourceParts"];
    if (conflicts.some((key) => key in value)) fail("chart cannot share a slide with another content type or continuation");
    const native = "sourceIds" in value;
    const derived = "derivedFrom" in value;
    if (native === derived || !sourceIds(value[native ? "sourceIds" : "derivedFrom"])) {
      fail("exactly one non-empty sourceIds or derivedFrom array is required");
    } else if (derived) {
      const previous = raw[index - 1];
      const previousIds = isRecord(previous) && !previous.chart && Array.isArray(previous.sourceIds) ? previous.sourceIds : [];
      if (!(value.derivedFrom as string[]).every((id) => previousIds.includes(id))) {
        fail("derived chart must immediately follow the source slide named by derivedFrom");
      }
    }
    if (!Array.isArray(chart.items)) { fail("chart items must be an array"); continue; }
    const maxItems = kind === "flow" ? 4 : kind === "compare" ? 2 : 6;
    if (chart.items.length < 2 || chart.items.length > maxItems) fail(`chart requires 2..${maxItems} items`);
    if (chart.items.filter((item) => isRecord(item) && item.emphasis === true).length > 1) fail("only one item may be emphasized");
    let previousX = -Infinity;
    for (const [itemIndex, item] of chart.items.entries()) {
      if (!isRecord(item)) { fail(`item ${itemIndex + 1} must be an object`); continue; }
      if (typeof item.label !== "string" || !item.label.trim()) fail(`item ${itemIndex + 1} needs a non-empty label`);
      if ("emphasis" in item && typeof item.emphasis !== "boolean") fail(`item ${itemIndex + 1} emphasis must be boolean`);
      const itemKeys = new Set(["label", "emphasis", ...(kind === "bar" ? ["value"] : kind === "line" ? ["x", "value"] : ["text"])]);
      if (Object.keys(item).some((key) => !itemKeys.has(key))) fail(`item ${itemIndex + 1} contains an unsupported field`);
      if (kind === "bar" || kind === "line") {
        if (typeof item.value !== "number" || !Number.isFinite(item.value)) fail(`item ${itemIndex + 1} value must be finite`);
      }
      if (kind === "line") {
        if (typeof item.x !== "number" || !Number.isFinite(item.x) || item.x <= previousX) fail(`item ${itemIndex + 1} x must be finite and strictly increasing`);
        if (typeof item.x === "number") previousX = item.x;
      }
      if (kind === "compare" && (typeof item.text !== "string" || !item.text.trim())) fail(`item ${itemIndex + 1} comparison text is required`);
      if (kind === "flow" && "text" in item && typeof item.text !== "string") fail(`item ${itemIndex + 1} flow text must be a string`);
    }
  }
  return errors;
}

function isEmbeddedAsset(uri: string, family: "font" | "image"): boolean {
  const match = uri.match(/^data:([^;,]+);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || match[2].length % 4 !== 0) return false;
  const mime = match[1].toLowerCase();
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.toString("base64") !== match[2]) return false;
  const start = bytes.subarray(0, 4).toString("latin1");
  if (family === "font") {
    return (mime === "font/ttf" && (start === "\x00\x01\x00\x00" || start === "true"))
      || (mime === "font/otf" && start === "OTTO")
      || (mime === "font/woff" && start === "wOFF")
      || (mime === "font/woff2" && start === "wOF2");
  }
  return (mime === "image/png" && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    || (mime === "image/jpeg" && bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    || (mime === "image/webp" && start === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP");
}

function offlineViolations(html: string, style: string, script: string): string[] {
  // Inspect markup separately so literal source text and the SVG namespace are not mistaken for dependencies.
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (tag) => tag.match(/^<script\b[^>]*>/i)?.[0] || "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  const violations: string[] = [];
  if ([...html.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)].length !== 1) violations.push("deck must contain exactly one inline runtime script");
  if (/<(?:link|iframe|video|audio|source|object|embed|foreignObject)\b/i.test(markup)) violations.push("resource or embedded-content tag");
  if (/<script\b[^>]*\bsrc\s*=/i.test(markup)) violations.push("external script");
  if (/<[a-z][^>]*\bon[a-z]+\s*=/i.test(markup)) violations.push("inline event handler");
  for (const match of markup.matchAll(/<([a-z][a-z0-9:-]*)\b([^>]*)>/gi)) {
    const tag = match[1].toLowerCase();
    const attributes = [...match[2].matchAll(/(?:^|\s)([a-z][a-z0-9:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)]
      .map((attribute) => ({ name: attribute[1].toLowerCase(), value: attribute[2] ?? attribute[3] ?? attribute[4] ?? "" }));
    const rasterReferences = attributes.filter(({ name }) => tag === "img" ? name === "src" : tag === "image" && ["href", "xlink:href"].includes(name));
    if (["img", "image"].includes(tag) && (!rasterReferences.length || !rasterReferences.every(({ value }) => isEmbeddedAsset(value, "image")))) violations.push("image must embed PNG, JPEG or WEBP with a matching data MIME and signature");
    for (const attribute of attributes) {
      if (["srcset", "poster"].includes(attribute.name)) violations.push("unsupported resource attribute");
      if (!["href", "xlink:href", "src"].includes(attribute.name)) continue;
      if (rasterReferences.includes(attribute)) continue;
      if (!attribute.value.startsWith("#")) violations.push("non-local resource reference");
    }
  }
  const inlineStyles = [...markup.matchAll(/\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map((match) => match[1] ?? match[2] ?? "").join("\n");
  const css = `${style}\n${inlineStyles}`;
  if (/@import\b|\bimage-set\s*\(/i.test(css)) violations.push("CSS dependency");
  const fontFaces = [...css.matchAll(/@font-face\s*\{[^}]*\}/gi)].map((match) => ({ start: match.index!, end: match.index! + match[0].length }));
  for (const match of css.matchAll(/\burl\s*\(\s*([^)]+)\)/gi)) {
    const raw = match[1].trim();
    const uri = raw.startsWith('"') || raw.startsWith("'") ? (raw.at(-1) === raw[0] ? raw.slice(1, -1) : "") : raw;
    const fontFace = fontFaces.find((range) => match.index! > range.start && match.index! < range.end);
    const descriptor = fontFace && [...css.slice(fontFace.start, match.index!).matchAll(/[;{]\s*([a-z-]+)\s*:/gi)].at(-1)?.[1].toLowerCase();
    const isFontSource = descriptor === "src";
    if (!isFontSource || !isEmbeddedAsset(uri, "font")) violations.push("CSS URL must be an embedded TTF, OTF, WOFF or WOFF2 font source");
  }
  if (/\b(?:fetch|importScripts)\s*\(|\bnew\s+(?:XMLHttpRequest|WebSocket|EventSource|Worker)\s*\(|\bimport\s*\(/.test(script)) violations.push("script network dependency");
  if (/createElement(?:NS)?\(\s*(?:[^,]+,\s*)?["'](?:img|image|script|iframe|link|object|embed|foreignObject)["']/i.test(script)) violations.push("script resource element");
  return violations;
}

function rawSlidesFrom(script: string): unknown {
  const match = script.match(/\bconst\s+RAW_SLIDES\s*=\s*([\s\S]*?);\s*(?:\n|$)/);
  if (!match) throw new Error("RAW_SLIDES JSON assignment not found");
  return JSON.parse(match[1]);
}

// A deliberately small DOM fixture tests geometry and text safety, not browser layout.
class ChartFixtureNode {
  tagName: string;
  className = "";
  textContent = "";
  children: ChartFixtureNode[] = [];
  dataset: Record<string, string> = {};
  attributes: Record<string, string> = {};
  properties: Record<string, string> = {};
  constructor(tag: string) { this.tagName = tag; }
  classList = { add: (...names: string[]) => { this.className = [this.className, ...names].filter(Boolean).join(" "); } };
  style = { setProperty: (name: string, value: unknown) => { this.properties[name] = String(value); } };
  setAttribute(name: string, value: string) { this.attributes[name] = value; if (name === "class") this.className = value; }
  append(...nodes: ChartFixtureNode[]) { this.children.push(...nodes); }
  appendChild(node: ChartFixtureNode) { this.children.push(node); return node; }
  set innerHTML(_value: string) { throw new Error("Chart text must not be assigned as HTML"); }
}

function chartRendererFixtures(template: string): Record<string, boolean> {
  const script = template.match(/<script>([\s\S]*?)<\/script>/i)?.[1] || "";
  const start = script.indexOf("function chartElement(");
  const end = script.indexOf("SLIDES.forEach", start);
  if (start < 0 || end < 0) return { rendererExtracted: false };
  const source = script.slice(start, end);
  const document = {
    createElement: (tag: string) => new ChartFixtureNode(tag),
    createElementNS: (_namespace: string, tag: string) => new ChartFixtureNode(tag)
  };
  const body = new ChartFixtureNode("body");
  const palette: Record<string, string> = { "--fg": "#E8E5DF", "--bg": "#18191C", "--hl": "#D7AF74" };
  const getComputedStyle = (node: ChartFixtureNode) => {
    if (node !== body) throw new Error("Fixture only provides the body palette");
    return { getPropertyValue: (name: string) => ` ${palette[name] || ""} `, fontFamily: '"Fixture Mono", monospace' };
  };
  const render = (chart: unknown): ChartFixtureNode => runInNewContext(`${source}\nrenderChart(input);`, { document, body, getComputedStyle, input: chart }, { timeout: 1000 });
  const all = (node: ChartFixtureNode): ChartFixtureNode[] => [node, ...node.children.flatMap(all)];
  const byClass = (node: ChartFixtureNode, name: string) => all(node).filter((item) => item.className.split(/\s+/).includes(name));
  const text = (node: ChartFixtureNode): string => node.textContent + node.children.map(text).join("");
  try {
    const bars = render({ kind: "bar", title: "收支", items: [{ label: "负", value: -2 }, { label: "零", value: 0 }, { label: "正", value: 3 }] });
    const tracks = byClass(bars, "bar-track");
    const zeroBars = render({ kind: "bar", title: "零", items: [{ label: "A", value: 0 }, { label: "B", value: 0 }] });
    const line = render({ kind: "line", title: "变化", items: [{ label: "A", x: 1, value: -2 }, { label: "B", x: 2, value: 0 }, { label: "C", x: 5, value: 3, emphasis: true }] });
    const points = byClass(line, "plot-point");
    const xs = points.map((node) => Number(node.attributes.cx));
    const mobile = byClass(line, "chart-data")[0];
    const unsafeTitle = '<img src="missing.png"> & <script>';
    const literalText = render({ kind: "compare", title: unsafeTitle, items: [{ label: "<svg>", text: "fetch('x')" }, { label: "B", text: "https://example.com" }] });
    const compare = byClass(literalText, "relation-item");
    return {
      sharedBarZero: tracks.length === 3 && tracks.every((node) => node.properties["--zero"] === "40%"),
      signedBarGeometry: tracks.map((node) => node.properties["--start"]).join() === "0%,40%,40%" && tracks.map((node) => node.properties["--length"]).join() === "40%,0%,60%",
      allZeroBarsFinite: byClass(zeroBars, "bar-track").every((node) => Object.values(node.properties).every((value) => Number.isFinite(Number.parseFloat(value)))),
      numericLineSpacing: xs.length === 3 && Math.abs((xs[1] - xs[0]) / (xs[2] - xs[0]) - .25) < 1e-9,
      lineUsesOriginalPoints: byClass(line, "plot-line")[0]?.attributes.points.split(" ").length === 3 && points.length === 3,
      svgLineHasExplicitPaint: byClass(line, "plot-line")[0]?.attributes.fill === "none" && byClass(line, "plot-line")[0]?.attributes.stroke === palette["--fg"] && byClass(line, "plot-axis")[0]?.attributes.stroke === palette["--fg"],
      svgPointsHaveExplicitPaint: points.length === 3 && points.slice(0, 2).every((node) => node.attributes.fill === palette["--bg"] && node.attributes.stroke === palette["--fg"]) && points[2].attributes.fill === palette["--hl"] && points[2].attributes.stroke === palette["--hl"],
      svgLabelsHaveExplicitPaint: all(line).filter((node) => node.tagName === "text").length === 6 && all(line).filter((node) => node.tagName === "text").every((node) => node.attributes.fill === palette["--fg"] && node.attributes["font-size"] === "32" && node.attributes["font-family"] === '"Fixture Mono", monospace'),
      mobileDataKeepsOrder: mobile?.children.length === 3 && text(mobile.children[0]).includes("A") && text(mobile.children[1]).includes("B") && text(mobile.children[2]).includes("C"),
      mobileDataKeepsCoordinates: mobile?.children.length === 3 && byClass(mobile, "chart-label").map((node) => node.textContent).join("|") === "A · 1|B · 2|C · 5",
      literalChartText: byClass(literalText, "chart-title")[0]?.textContent === unsafeTitle && all(literalText).every((node) => !["img", "script", "svg"].includes(node.tagName)),
      comparisonPreservesOrder: compare.length === 2 && text(compare[0]) === "<svg>fetch('x')" && text(compare[1]) === "Bhttps://example.com"
    };
  } catch { return { rendererExecutesSafely: false }; }
}

function validateHtml(original: string, options: Pick<Options, "theme" | "template">): Check[] {
  const html = options.template || original.includes("{{SLIDES_JSON}}")
    ? materializeTemplate(original, options.theme || "hacker")
    : original;
  const style = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1]).join("\n");
  const script = html.match(/<script>([\s\S]*?)<\/script>/i)?.[1] ?? "";
  const runtimeScript = script.replace(/\bconst\s+RAW_SLIDES\s*=\s*[\s\S]*?;\s*(?:\n|$)/, "const RAW_SLIDES = [];\n");
  const staticMarkup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  const checks: Check[] = [];
  const add = (id: string, pass: boolean, detail: string) => checks.push({ id, pass, detail });

  let syntaxPass = false;
  try {
    new Function(script);
    syntaxPass = true;
  } catch (error) {
    add("javascript-syntax", false, String(error));
  }
  if (syntaxPass) add("javascript-syntax", true, "script compiles");

  add("template-version", html.includes(`data-template-version="${VERSION}"`), `template version is ${VERSION}`);
  add("title-present", /<title>[^<]+<\/title>/i.test(html), "document title is non-empty");
  add("cover-normalization", script.includes("function normalizeSlides") && script.includes("cover: true") && script.includes("linesText(slides[0]) === title"), "title cover is synthesized or deduplicated");
  add("no-information-header", !/<header\b/i.test(html) && !/first-guide/i.test(html), "no header or top guide");
  add("footer-cover-only", script.includes("metaFooter.hidden = index !== 0") && html.includes('id="pager"') && html.includes('id="metaFooter"'), "meta footer is cover-only; pager persists");

  const centeredStageAxis = ruleBodies(style, '.slide[data-cover="true"]').some((body) =>
    /flex-direction\s*:\s*column/.test(body)
    && /align-items\s*:\s*center/.test(body)
    && /justify-content\s*:\s*center/.test(body)
  ) && style.includes('transform-origin: center center');
  add("centered-stage-axis", centeredStageAxis, "cover explicitly uses a centered column axis and centered fit origin");

  const centeredText = ruleBodies(style, ".lines").some((body) =>
    /align-items\s*:\s*center/.test(body) && /text-align\s*:\s*center/.test(body)
  ) && ruleBodies(style, ".line").some((body) => /text-align\s*:\s*center/.test(body))
    && !script.includes("node.style.textAlign");
  add("centered-text-contract", centeredText, "all line-based pages inherit centered text without inline alignment overrides");

  const compositionTokens = [
    "function compositionFor(slide)",
    'if (slide?.cover) return "identity"',
    'if (slide?.emphasis || slide?.title) return "chapter"',
    'if (slide?.chart) return "chart"',
    'if (slide?.table || slide?.pre != null) return "evidence"',
    'if (slide?.quote) return "quotation"',
    'slide?.semanticGroup === "list-run" || (lineCount >= 2 && lineCount <= 4)',
    'return "sequence"',
    'return "statement"',
    "element.dataset.composition = compositionFor(slide)"
  ];
  add("composition-grammar", compositionTokens.every((token) => script.includes(token)), "all seven composition roles derive deterministically from source-semantic fields");
  add("composition-audit-interface", script.includes("composition: slides[index]?.dataset.composition"), "runtime audit exposes each slide's composition role");

  const whitespaceBudget = ruleBodies(style, ".lines").some((body) =>
    /width\s*:\s*min\(82vw,\s*1480px\)/.test(body)
  ) && ruleBodies(style, ".slide").some((body) =>
    /padding\s*:[^;]*var\(--stage-inline\)[^;]*;/.test(body)
  );
  add("whitespace-budget", whitespaceBudget, "regular text stays within 82vw on symmetric stage padding");

  const titleSignal = ruleBodies(style, '.slide[data-title="true"] .lines').some((body) =>
    /border-top\s*:\s*0/.test(body)
    && body.includes("var(--title-signal-w)")
    && /center\s+top/.test(body)
    && /linear-gradient\(var\(--hl\),\s*var\(--hl\)\)/.test(body)
  );
  add("title-short-signal", titleSignal, "title page uses a short signal rule instead of a full-width border");

  const cssMotion = style.match(/\b(?:animation|transition|view-transition)(?:-[a-z-]+)?\s*:|@keyframes\b|scroll-behavior\s*:\s*smooth\b/gi) || [];
  const jsMotion = runtimeScript.match(/\.animate\s*\(|set(?:Interval|Timeout)\s*\(/g) || [];
  const svgMotion = [...(staticMarkup.match(/<(?:animate|animateMotion|animateTransform|set)\b/gi) || []), ...(runtimeScript.match(/createElementNS\([^\n]*["'](?:animate|animateMotion|animateTransform|set)["']/gi) || [])];
  add("zero-motion", cssMotion.length === 0 && jsMotion.length === 0 && svgMotion.length === 0, `css=${cssMotion.length}, js=${jsMotion.length}, svg=${svgMotion.length}`);

  const externalResources = offlineViolations(html, style, runtimeScript);
  add("offline", externalResources.length === 0, externalResources.join("; ") || "inline SVG and embedded fonts/raster images allowed; no external resources");

  add("render-lines", script.includes("slide.lines?.length") && script.includes('lines.className = "lines fit-box"'), "lines renderer exists");
  add("render-table", script.includes("slide.table") && script.includes("slide.table.header === true") && script.includes('document.createElement("thead")') && script.includes('document.createElement("tbody")'), "table renderer respects explicit header flag and semantic sections");
  add("render-pre", script.includes("slide.pre != null") && script.includes('document.createElement("pre")'), "pre renderer exists");
  const chartTokens = ["function renderChart(chart)", "document.createElementNS", "chart-wrap fit-box", "chart-title", "chart-body", "chart-note", "chart-svg", "dataset.chartKind"];
  add("render-chart", chartTokens.every((token) => script.includes(token)), "chart renderer exposes kind, native SVG, title, body and note");
  add("chart-audit-interface", ["chartKind: slides[index]?.dataset.chartKind", "derivedFrom: slides[index]?.dataset.derivedFrom", "element.dataset.derivedFrom"].every((token) => script.includes(token)), "runtime audit exposes chart kind and derived provenance");
  add("chart-portrait-data", ruleBodies(style, ".chart-data").some((body) => /display\s*:\s*none/.test(body))
    && ruleBodies(style, ".chart-data").some((body) => /display\s*:\s*grid/.test(body))
    && ruleBodies(style, ".chart-svg").some((body) => /display\s*:\s*none/.test(body)), "line charts have a narrow-screen data reading view");
  let chartErrors: string[];
  try { chartErrors = chartDataErrors(rawSlidesFrom(script)); }
  catch (error) { chartErrors = [String(error)]; }
  add("chart-data-and-provenance", chartErrors.length === 0, chartErrors.join("; ") || "chart schemas and immediate source provenance are valid");

  const layoutTokens = ["lineCount", "maxWeight", "totalWeight", '"rows"', '"single"', "dataset.density"];
  add("density-layout", layoutTokens.every((token) => script.includes(token)), "line count and density route a stable rows/single layout");
  add("rows-only-layout", script.includes('lineCount >= 2 && lineCount <= 4 ? "rows" : "single"') && !/["'](?:duo|triptych|matrix)["']/.test(script), "two-to-four line pages always use one centered column");
  add("projection-size-tokens", ["9.2vmin", "8.2vmin", "7.4vmin", "7.2vmin", "6.8vmin", "6.4vmin"].every((token) => style.includes(token)), "density-specific projection sizes exist");
  add("portrait-centered-stage", style.includes("@media (max-aspect-ratio: 1/1)") && style.includes('--stage-inline: clamp(34px, 8vw, 78px)'), "portrait keeps symmetric centered stage padding");
  add("grid-safety", style.includes("min-width: 0") && style.includes("overflow-wrap: break-word") && style.includes("word-break: normal"), "grid items can shrink and wrap naturally");
  add("length-tier-boundary", script.includes('if (max <= 10) return "medium";'), "medium tier ends at weighted length 10");
  add("takahashi-tier", script.includes('element.dataset.takahashi = "true"') && style.includes('data-len="single"') && style.includes('data-len="short"') && style.includes('data-len="medium"'), "short single-line pages expose Takahashi sizing");
  const semanticAtomLineBodies = ruleBodies(style, 'body[data-theme] .slide[data-semantic-atom="true"] .line');
  const semanticAtomContainerBodies = ruleBodies(style, 'body[data-theme] .slide[data-semantic-atom="true"] .lines');
  const semanticAtomTokens = ["Intl.Segmenter", "function glyphCount", "semanticAtom", 'element.dataset.semanticAtom = "true"'].every((token) => html.includes(token))
    && semanticAtomLineBodies.some((body) => /white-space\s*:\s*nowrap/.test(body) && /overflow-wrap\s*:\s*normal/.test(body) && /word-break\s*:\s*normal/.test(body) && /text-wrap\s*:\s*nowrap/.test(body))
    && semanticAtomContainerBodies.some((body) => /width\s*:\s*max-content/.test(body) && /max-width\s*:\s*none/.test(body))
    && style.includes('body[data-theme] .slide[data-semantic-atom="true"][data-len="xlong"] .lines')
    && style.includes("font-size: clamp(64px, 12vmin, 190px)");
  add("semantic-atom-nowrap", semanticAtomTokens, "short non-list semantic atoms stay on one line and enter Takahashi mode");
  const cjkTailTokens = ["function renderPlainAware", 'class="keep-cjk-tail"'].every((token) => html.includes(token))
    && ruleBodies(style, ".keep-cjk-tail").some((body) => /white-space\s*:\s*nowrap/.test(body));
  add("cjk-tail-protection", cjkTailTokens, "wrapped CJK text keeps a meaningful tail instead of one orphan character");
  add("semantic-group-runtime", script.includes("slide.semanticGroup") && script.includes("dataset.semanticGroup"), "semantic list groups remain queryable for browser verification");
  add("xlong-start-size", /\.slide\[data-len="xlong"\] \.lines\s*\{[^}]*font-size:\s*clamp\(42px,\s*8\.4vmin,\s*136px\)/.test(style), "xlong wraps from a projection-readable 8.4vmin");

  const fitTokens = ["function fitSlide", "availableWidth", "availableHeight", "scrollWidth", "scrollHeight", 'addEventListener("resize"', 'addEventListener("fullscreenchange"', "document.fonts?.ready", '"ResizeObserver" in window'];
  add("measured-fit", fitTokens.every((token) => script.includes(token)), "fit uses both dimensions and four refit triggers");
  add("fit-audit", script.includes("data.fitScale") || script.includes("dataset.fitScale"), "fit scale is exposed for readability audit");

  const mathTokens = ["function latexBody", "function renderMathAware", "<sup>", "<sub>", "\\\\cdot", "\\\\propto", "\\\\alpha"];
  add("offline-math", mathTokens.every((token) => script.includes(token)), "offline math subset and scripts exist");
  add("price-protection", mathSegments("$20/month\n$200/month\n$???/month").length === 0, "unclosed price strings are plain text");
  const preDensity = ["preRows", "preCols", 'preDensity = preRows >= 25 ? "x-dense" : preRows >= 17 ? "dense" : "normal"'].every((token) => script.includes(token));
  add("ascii-density-size", preDensity && ["clamp(22px, 3.8vmin, 70px)", "clamp(18px, 3vmin, 52px)", "clamp(15.5px, 2.5vmin, 42px)"].every((token) => style.includes(token)), "pre sizing follows physical row-density floors");
  add("table-projection-size", style.includes("font-size: clamp(30px, 5.2vmin, 82px)"), "tables start at a projection-readable size");
  add("source-continuation-runtime", script.includes("slide.sourceParts?.length") && script.includes("dataset.sourceParts"), "continuation provenance is exposed at runtime");

  const nextKeys = ["ArrowRight", "ArrowDown", "PageDown"].every((key) => script.includes(`"${key}"`));
  const prevKeys = ["ArrowLeft", "ArrowUp", "PageUp"].every((key) => script.includes(`"${key}"`));
  const inputGuard = script.includes("function isEditableTarget") && script.includes("contenteditable") && script.includes("if (isEditableTarget(event.target)) return");
  add("presenter-keys", nextKeys && prevKeys && inputGuard, "horizontal, vertical and page keys exist with editable-target guard");
  add("audit-interface", script.includes("window.__DECK_AUDIT") && script.includes("currentLayout") && script.includes("footerState"), "runtime audit interface exists");

  const activeTheme = options.theme || html.match(/<body[^>]*data-theme="([^"]+)"/i)?.[1];
  if (["hacker", "cyber", "hacker-dark"].includes(activeTheme || "")) {
    const noTexture = !/(?:repeating-)?radial-gradient\s*\(|repeating-linear-gradient\s*\(|(?:-webkit-)?mask-image\s*:|(?:backdrop-)?filter\s*:|\b(?:text-shadow|box-shadow)\s*:/i.test(style);
    const stageOrnament = [...style.matchAll(/([^{}]+)\{([^{}]*)\}/g)].some((match) =>
      splitSelectors(match[1]).some((selector) => /hacker|cyber/.test(selector)
        && /\.slide(?:(?:\[[^\]]+\])|(?::is\([^)]*\)))*::(?:before|after)\s*$/.test(selector))
      && !/\b(?:content\s*:\s*none|display\s*:\s*none)\b/.test(match[2])
    );
    add("hacker-flat-fields", noTexture && !stageOrnament, "Hacker uses flat fields without texture, glow, filters or page-wide pseudo-element rails");
  }
  if (activeTheme === "hacker" || activeTheme === "cyber") {
    const hackerColors = [
      /--hacker-void:\s*#18191C/i,
      /--hacker-paper:\s*#F2F0EB/i,
      /--hacker-signal:\s*#D7AF74/i,
      /--hl:\s*#825B25/i
    ];
    add("hacker-palette", hackerColors.every((pattern) => pattern.test(style)), "graphite, warm paper and amber palette with readable light-theme highlight exists");
    const genericFields = ruleBodies(style, ".slide").some((body) => /background\s*:\s*var\(--bg\)/.test(body))
      && ruleBodies(style, '.slide[data-cover="true"]').some((body) => /background\s*:\s*var\(--acc-bg\)/.test(body));
    const paperTheme = ruleBodies(style, 'body[data-theme="hacker"]').some((body) => body.includes("--bg: var(--hacker-paper)") && body.includes("--acc-bg: var(--hacker-void)"));
    add("hacker-reading-strategy", genericFields && paperTheme, "regular paper and dark cover/chapter use inherited flat color fields");
    const hackerSlideBodies = ruleBodies(style, 'body[data-theme="hacker"] .slide');
    const symmetricHacker = hackerSlideBodies.every((body) => !/padding-left\s*:/.test(body))
      && style.includes("padding: clamp(28px, 6vmin, 96px) var(--stage-inline)");
    add("symmetric-hacker-stage", symmetricHacker, "Hacker stage padding remains symmetric");
  }
  if (activeTheme === "hacker-dark") {
    const darkColors = [
      /--hacker-dark-bg:\s*#18191C/i,
      /--hacker-dark-deep:\s*#101113/i,
      /--hacker-dark-panel:\s*#212226/i,
      /--hacker-dark-fg:\s*#E8E5DF/i,
      /--hacker-dark-muted:\s*#99958E/i,
      /--hacker-dark-signal:\s*#D7AF74/i
    ];
    add("hacker-dark-palette", darkColors.every((pattern) => pattern.test(style)), "exact graphite, warm-white and amber Hacker palette exists");
    add("hacker-dark-contrast", contrastRatio("E8E5DF", "18191C") >= 9, `contrast=${contrastRatio("E8E5DF", "18191C").toFixed(2)}:1`);
    const darkSlideBodies = ruleBodies(style, 'body[data-theme="hacker-dark"] .slide');
    const darkCoverBodies = [...ruleBodies(style, 'body[data-theme="hacker-dark"] .slide[data-cover="true"]'), ...ruleBodies(style, 'body[data-theme="hacker-dark"] .slide:is([data-cover="true"], [data-emphasis="true"])')];
    add("hacker-dark-all-pages", darkSlideBodies.some((body) => body.includes("var(--hacker-dark-bg)")) && darkCoverBodies.some((body) => body.includes("var(--hacker-dark-deep)")), "regular and cover pages both use distinct dark fields");
    add("hacker-dark-signal-scope", style.includes("--fg: var(--hacker-dark-fg)") && !/\.line\s*\{[^}]*color\s*:\s*var\(--hacker-dark-signal\)/s.test(style), "signal amber is not the body-text color");
    add("hacker-dark-no-effects", !/\b(?:text-shadow|box-shadow)\s*:|drop-shadow\s*\(|@keyframes\b|\banimation(?:-[a-z-]+)?\s*:|\btransition(?:-[a-z-]+)?\s*:/i.test(style), "dark theme has no glow, shadow, animation, or transition effects");
    const symmetricDark = darkSlideBodies.length > 0
      && darkSlideBodies.every((body) => !/padding-left\s*:/.test(body));
    add("symmetric-hacker-dark-stage", symmetricDark, "dark Hacker stage padding remains symmetric");
  }

  if (options.template) {
    const placeholders = ["{{TITLE}}", "{{SUBTITLE}}", "{{THEME}}", "{{SLIDES_JSON}}"];
    add("template-placeholders", placeholders.every((placeholder) => original.includes(placeholder)), "four template placeholders remain");
  }

  return checks;
}

function printResult(label: string, checks: Check[], json: boolean) {
  const failed = checks.filter((check) => !check.pass);
  const result = {
    status: failed.length === 0 ? "PASS" : "FAIL",
    label,
    passed: checks.length - failed.length,
    total: checks.length,
    failed
  };
  if (json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`${result.status} ${label} — ${result.passed}/${result.total}`);
    for (const failure of failed) console.error(`  ${failure.id}: ${failure.detail}`);
  }
  return failed.length === 0;
}

async function selfTest() {
  const templatePath = resolve(import.meta.dir, "..", "SloganTemplate.html");
  const template = await Bun.file(templatePath).text();
  const goodChecks = validateHtml(template, { theme: "hacker", template: true });
  const goodPass = goodChecks.every((check) => check.pass);
  const darkChecks = validateHtml(template, { theme: "hacker-dark", template: true });
  const darkPass = darkChecks.every((check) => check.pass);

  const motionFixtures = [
    ".bad{transition:opacity 1s}",
    ".bad{transition-property:opacity;transition-duration:1s}",
    ".bad{animation-name:pulse}",
    ".bad{scroll-behavior:smooth}",
    ".bad{view-transition-name:card}"
  ];
  const motionFixturesRejected = motionFixtures.every((fixture) => {
    const bad = template.replace("</style>", `${fixture}</style>`);
    return validateHtml(bad, { theme: "hacker", template: true })
      .some((check) => check.id === "zero-motion" && !check.pass);
  });
  const svgMotionFixturesRejected = [
    '<svg xmlns="http://www.w3.org/2000/svg"><animate attributeName="x" /></svg>',
    '<svg><animateMotion path="M 0 0 L 1 1" /></svg>',
    '<svg><animateTransform attributeName="transform" /></svg>',
    '<svg><set attributeName="visibility" to="hidden" /></svg>'
  ].every((fixture) => validateHtml(template.replace("</main>", `${fixture}</main>`), { theme: "hacker", template: true })
    .some((check) => check.id === "zero-motion" && !check.pass));

  const resourceFixtures = [
    ".bad{background-image:url(external.png)}",
    '@import "theme.css";',
    '.bad{background-image:image-set("one.png" 1x)}'
  ];
  const resourceFixturesRejected = resourceFixtures.every((fixture) => {
    const bad = template.replace("</style>", `${fixture}</style>`);
    return validateHtml(bad, { theme: "hacker", template: true })
      .some((check) => check.id === "offline" && !check.pass);
  });
  const dataUri = (mime: string, bytes: Buffer) => `data:${mime};base64,${bytes.toString("base64")}`;
  const pngUri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=";
  const jpegUri = dataUri("image/jpeg", Buffer.from([255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 255, 217]));
  const webpUri = dataUri("image/webp", Buffer.concat([Buffer.from("RIFF"), Buffer.from([4, 0, 0, 0]), Buffer.from("WEBP")]));
  const fontUris = [
    dataUri("font/ttf", Buffer.from([0, 1, 0, 0, 0, 0, 0, 0])),
    dataUri("font/otf", Buffer.from("OTTOfixture")),
    dataUri("font/woff", Buffer.from("wOFFfixture")),
    dataUri("font/woff2", Buffer.from("wOF2fixture"))
  ];
  const embeddedAssetFixtures = [
    ...[pngUri, jpegUri, webpUri].map((uri) => template.replace("</main>", `<img src="${uri}" alt="embedded" /></main>`)),
    template.replace("</main>", `<svg><image href="${pngUri}" /></svg></main>`),
    template.replace("</main>", `<svg><image xlink:href="${pngUri}" /></svg></main>`),
    ...fontUris.map((uri) => template.replace("</head>", `<style data-embedded-font>@font-face{font-family:"Fixture";src:url("${uri}")}</style></head>`)),
    template.replace("</style>", `@font-face{font-family:"Fixture";src:url("${fontUris[0]}"), url("${fontUris[1]}")}</style>`)
  ];
  const embeddedAssetsAccepted = embeddedAssetFixtures.every((fixture) => validateHtml(fixture, { theme: "hacker", template: true }).find((check) => check.id === "offline")?.pass === true);
  const unsupportedDataAssets = [
    dataUri("image/gif", Buffer.from("GIF89afixture")),
    dataUri("image/svg+xml", Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>")),
    dataUri("image/png", Buffer.from("GIF89afixture")),
    "data:image/png;base64,%%%",
    "data:image/png;base64,AAAA",
    fontUris[0]
  ];
  const invalidEmbeddedAssetsRejected = [
    ...unsupportedDataAssets.map((uri) => template.replace("</main>", `<img src="${uri}" /></main>`)),
    template.replace("</main>", '<img src="relative.png" /></main>'),
    template.replace("</main>", '<img src="https://example.com/image.png" /></main>'),
    template.replace("</main>", '<img /></main>'),
    template.replace("</main>", `<img src="${pngUri}" srcset="relative.png 2x" /></main>`),
    template.replace("</main>", '<svg><image href="#local" /></svg></main>'),
    template.replace("</main>", `<svg><use href="${pngUri}" /></svg></main>`),
    template.replace("</style>", `@font-face{font-family:"Bad";src:url("${pngUri}")}</style>`),
    template.replace("</style>", `@font-face{font-family:"Bad";src:url("${dataUri("font/ttf", Buffer.from("<svg>"))}")}</style>`),
    template.replace("</style>", `.bad{background:url("${pngUri}")}</style>`),
    template.replace("</style>", `.bad{background:url("${fontUris[0]}")}</style>`),
    template.replace("</style>", ".bad{fill:url(#local)}</style>"),
    template.replace("</head>", '<style data-font>@font-face{font-family:"Bad";src:url(relative.ttf)}</style></head>')
  ].every((fixture) => validateHtml(fixture, { theme: "hacker", template: true }).some((check) => check.id === "offline" && !check.pass));
  const markupResourceFixturesRejected = [
    '<script src="local.js"></script>',
    '<script>fetch("https://example.com")</script>',
    '<svg><image href="external.png" /></svg>',
    '<svg><use href="symbols.svg#chart" /></svg>',
    '<svg><use xlink:href="https://example.com/chart.svg#chart" /></svg>',
    '<svg><foreignObject><div>embedded HTML</div></foreignObject></svg>',
    '<svg style="fill: url(external.svg#shape)"></svg>'
  ].every((fixture) => validateHtml(template.replace("</main>", `${fixture}</main>`), { theme: "hacker", template: true })
    .some((check) => check.id === "offline" && !check.pass));
  const inlineSvgAccepted = validateHtml(template.replace("</main>", '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path id="local" d="M 0 0 L 100 100"/><use href="#local"/></svg></main>'), { theme: "hacker", template: true })
    .find((check) => check.id === "offline")?.pass === true;
  const literalSource = [{ chart: { kind: "compare", title: "<svg> <script> https://example.com", items: [{ label: "<animate>", text: "fetch('data')" }, { label: "B", text: "document.createElement('img')" }] }, sourceIds: ["SRC-LITERAL"] }];
  const literalDeck = materializeTemplate(template).replace(/\bconst\s+RAW_SLIDES\s*=\s*[\s\S]*?;\s*(?:\n|$)/, () => `const RAW_SLIDES = ${JSON.stringify(literalSource)};\n`);
  const literalSourceAccepted = validateHtml(literalDeck, { theme: "hacker", template: false })
    .filter((check) => ["javascript-syntax", "offline", "zero-motion", "chart-data-and-provenance"].includes(check.id)).every((check) => check.pass);

  const spatialFixtures = [
    {
      id: "centered-stage-axis",
      html: template.replace(
        '.slide[data-cover="true"] {\n    flex-direction: column;\n    align-items: center;\n    justify-content: center;',
        '.slide[data-cover="true"] {\n    flex-direction: column;\n    align-items: center;\n    justify-content: flex-end;'
      )
    },
    {
      id: "centered-text-contract",
      html: template.replace("text-align: center;", "text-align: left;")
    },
    {
      id: "title-short-signal",
      html: template.replace(
        "background: linear-gradient(var(--hl), var(--hl)) center top / var(--title-signal-w) clamp(4px, .55vmin, 8px) no-repeat;",
        "background: none;"
      )
    },
    {
      id: "length-tier-boundary",
      html: template.replace('if (max <= 10) return "medium";', 'if (max <= 14) return "medium";')
    },
    {
      id: "xlong-start-size",
      html: template.replace("font-size: clamp(42px, 8.4vmin, 136px);", "font-size: clamp(34px, 5.2vmin, 96px);")
    },
    {
      id: "symmetric-hacker-stage",
      html: template.replace("</style>", 'body[data-theme="hacker"] .slide { padding-left: 12vw; }</style>')
    },
    {
      id: "hacker-flat-fields",
      html: template.replace("</style>", '.bad { background: repeating-linear-gradient(0deg, transparent 0 5px, green 6px); }</style>')
    },
    {
      id: "hacker-flat-fields",
      html: template.replace("</style>", 'body[data-theme="hacker-dark"] .slide::after { content: ""; width: 80vw; }</style>')
    },
    {
      id: "composition-grammar",
      html: template.replace("element.dataset.composition = compositionFor(slide);", "")
    },
    {
      id: "composition-audit-interface",
      html: template.replace("composition: slides[index]?.dataset.composition,", "")
    },
    {
      id: "whitespace-budget",
      html: template.replace("width: min(82vw, 1480px);", "width: min(96vw, 1700px);")
    }
  ];
  const spatialFixturesRejected = spatialFixtures.every((fixture) =>
    validateHtml(fixture.html, { theme: "hacker", template: true })
      .some((check) => check.id === fixture.id && !check.pass)
  );

  const semanticFixtures = [
    {
      id: "semantic-atom-nowrap",
      html: template.replace(
        'body[data-theme] .slide[data-semantic-atom="true"] .line {\n    white-space: nowrap;',
        'body[data-theme] .slide[data-semantic-atom="true"] .line {\n    white-space: normal;'
      )
    },
    {
      id: "cjk-tail-protection",
      html: template.replace(".keep-cjk-tail { white-space: nowrap; }", ".keep-cjk-tail { white-space: normal; }")
    },
    {
      id: "semantic-group-runtime",
      html: template.replace('if (slide.semanticGroup) element.dataset.semanticGroup = slide.semanticGroup;', "")
    }
  ];
  const semanticFixturesRejected = semanticFixtures.every((fixture) =>
    validateHtml(fixture.html, { theme: "hacker", template: true })
      .some((check) => check.id === fixture.id && !check.pass)
  );

  const layouts = [
    chooseLayout([22, 24]),
    chooseLayout([48, 45]),
    chooseLayout([12, 13, 14]),
    chooseLayout([30, 28, 24]),
    chooseLayout([20, 21, 22, 23])
  ];
  const layoutPass = layouts.every((layout) => layout === "rows");
  const mathPass = mathSegments("$$C(Q)=C_1\\cdot Q^{-b}$$ and $V\\propto n^2$").length === 2
    && mathSegments("$20/month $200/month $???/month").length === 0;
  const dollarSafeMaterialization = materializeTemplate(template).includes('"$$C(Q)=C_1 \\\\cdot Q^{-b}$$"');

  const nativeChart = (chart: unknown) => ({ chart, sourceIds: ["SRC-CHART"] });
  const bar = { kind: "bar", title: "收支", items: [{ label: "负", value: -2 }, { label: "零", value: 0 }, { label: "正", value: 3, emphasis: true }] };
  const line = { kind: "line", title: "增长", items: [{ label: "A", x: 1, value: 2 }, { label: "B", x: 4, value: 2 }] };
  const validChartFixtures = [
    [nativeChart(bar)],
    [nativeChart(line)],
    [nativeChart({ kind: "flow", title: "过程", items: [{ label: "输入" }, { label: "输出", text: "结果" }] })],
    [nativeChart({ kind: "compare", title: "取舍", items: [{ label: "A", text: "简洁" }, { label: "B", text: "完整" }] })],
    [{ lines: [{ chunks: [{ t: "原文保留" }] }], sourceIds: ["SRC-ORIGINAL"] }, { chart: bar, derivedFrom: ["SRC-ORIGINAL"] }]
  ];
  const invalidChartFixtures = [
    [nativeChart({ ...bar, kind: "pie" })],
    [nativeChart({ ...bar, xLabel: "unused" })],
    [nativeChart({ ...bar, title: " " })],
    [nativeChart({ ...bar, items: [{ label: "唯一", value: 1 }] })],
    [nativeChart({ ...bar, items: Array.from({ length: 7 }, (_, i) => ({ label: `条${i}`, value: i })) })],
    [nativeChart({ ...bar, items: [{ label: "A", value: Number.NaN }, { label: "B", value: 1 }] })],
    [nativeChart({ ...bar, items: [{ label: "A", value: Infinity }, { label: "B", value: 1 }] })],
    [nativeChart({ ...bar, items: [{ label: "A", value: "1" }, { label: "B", value: 1 }] })],
    [nativeChart({ ...bar, items: [{ label: "A", value: 1, emphasis: true }, { label: "B", value: 2, emphasis: true }] })],
    [nativeChart({ ...line, items: [{ label: "A", x: 1, value: 0 }, { label: "B", x: 1, value: 2 }] })],
    [nativeChart({ ...line, items: [{ label: "A", x: 2, value: 0 }, { label: "B", x: 1, value: 2 }] })],
    [nativeChart({ ...line, items: [{ label: "A", x: 1, value: 0 }, { label: "B", x: Infinity, value: 2 }] })],
    [nativeChart({ kind: "flow", title: "过程", items: Array.from({ length: 5 }, (_, i) => ({ label: String(i) })) })],
    [nativeChart({ kind: "flow", title: "过程", unit: "unused", items: [{ label: "A" }, { label: "B" }] })],
    [nativeChart({ kind: "compare", title: "比较", items: [{ label: "A", text: "A" }, { label: "B" }] })],
    [{ chart: bar }],
    [{ chart: bar, sourceIds: [] }],
    [{ chart: bar, sourceIds: ["SRC-A"], derivedFrom: ["SRC-A"] }],
    [{ ...nativeChart(bar), lines: [] }],
    [{ ...nativeChart(bar), sourceParts: [] }],
    [{ chart: bar, derivedFrom: ["SRC-MISSING"] }],
    [{ sourceIds: ["SRC-A"] }, { sourceIds: ["SRC-B"] }, { chart: bar, derivedFrom: ["SRC-A"] }]
  ];
  const validChartsAccepted = validChartFixtures.every((slides) => chartDataErrors(slides).length === 0);
  const invalidChartsRejected = invalidChartFixtures.every((slides) => chartDataErrors(slides).length > 0);
  const materializedChartMutationRejected = validateHtml(materializeTemplate(template).replace('"kind":"bar"', '"kind":"pie"'), { theme: "hacker", template: false })
    .some((check) => check.id === "chart-data-and-provenance" && !check.pass);
  const chartRendererBehavior = chartRendererFixtures(template);
  const chartRendererPass = Object.values(chartRendererBehavior).every(Boolean);

  const pass = goodPass && darkPass && motionFixturesRejected && svgMotionFixturesRejected && resourceFixturesRejected && embeddedAssetsAccepted && invalidEmbeddedAssetsRejected && markupResourceFixturesRejected && inlineSvgAccepted && literalSourceAccepted && spatialFixturesRejected && semanticFixturesRejected && layoutPass && mathPass && dollarSafeMaterialization && validChartsAccepted && invalidChartsRejected && materializedChartMutationRejected && chartRendererPass;
  console.log(JSON.stringify({
    status: pass ? "PASS" : "FAIL",
    goodTemplateChecks: `${goodChecks.filter((check) => check.pass).length}/${goodChecks.length}`,
    darkTemplateChecks: `${darkChecks.filter((check) => check.pass).length}/${darkChecks.length}`,
    motionFixturesRejected,
    svgMotionFixturesRejected,
    resourceFixturesRejected,
    embeddedAssetsAccepted,
    invalidEmbeddedAssetsRejected,
    markupResourceFixturesRejected,
    inlineSvgAccepted,
    literalSourceAccepted,
    spatialFixturesRejected,
    semanticFixturesRejected,
    layouts,
    stableRowsLayout: layoutPass,
    mathAndPriceFixtures: mathPass,
    dollarSafeMaterialization,
    validChartsAccepted,
    invalidChartsRejected,
    materializedChartMutationRejected,
    chartRendererBehavior,
    failedTemplateChecks: [...goodChecks, ...darkChecks].filter((check) => !check.pass)
  }, null, 2));
  if (!pass) process.exit(1);
}

async function main() {
  const options = parseArgs(Bun.argv.slice(2));
  if (options.help) {
    console.log(HELP);
    return;
  }
  if (options.selfTest) {
    await selfTest();
    return;
  }
  if (!options.file) {
    console.error(HELP);
    process.exit(2);
  }

  const html = await Bun.file(options.file).text();
  const checks = validateHtml(html, options);
  const pass = printResult(options.file, checks, options.json);
  if (!pass) process.exit(1);
}

await main();
