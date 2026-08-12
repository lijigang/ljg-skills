#!/usr/bin/env bun

import { mkdir, readdir, unlink } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export type Tone = "word" | "clause" | "variant";

export interface ClassicToken {
  text: string;
  punctuation?: boolean;
  note?: string;
  pinyin?: string;
  tone?: Tone;
}

export interface ClassicPassage {
  tokens: ClassicToken[];
}

export interface ClassicSpec {
  book: string;
  chapter: string;
  heroImage?: string;
  heroAlt?: string;
  original: string;
  source?: string;
  passages: ClassicPassage[];
  interpretation: string[];
}

interface RenderOptions {
  input: string;
  output: string;
  html: string;
  width: number;
  slicesDir?: string;
}

interface DomAudit {
  documentHeight: number;
  scrollWidth: number;
  tokenCount: number;
  annotationCount: number;
  interpretationParagraphs: number;
  overflowCount: number;
  clippedCount: number;
  emptyTextCount: number;
  titleVisible: boolean;
  chapterVisible: boolean;
  heroVisible: boolean;
  interpretationVisible: boolean;
  originalMatches: boolean;
  fontSizes: {
    book: number;
    original: number;
    pinyin: number;
    annotation: number;
    source: number;
  };
}

export interface QaSliceDetail {
  index: number;
  path: string;
  y: number;
  width: number;
  height: number;
  sha256: string;
}

const VALID_TONES = new Set<Tone>(["word", "clause", "variant"]);
const DEFAULT_WIDTH = 1080;
const MIN_WIDTH = 720;
const MAX_WIDTH = 1600;

function assertPlainString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function isExplicitLineBreak(token: Pick<ClassicToken, "text" | "punctuation">): boolean {
  return token.punctuation === true && token.text === "\n";
}

export function validateSpec(value: unknown): ClassicSpec {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Input must be a JSON object");
  }

  const spec = value as Partial<ClassicSpec>;
  assertPlainString(spec.book, "book");
  assertPlainString(spec.chapter, "chapter");
  assertPlainString(spec.original, "original");
  if (spec.heroImage !== undefined) {
    assertPlainString(spec.heroImage, "heroImage");
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(spec.heroImage)) {
      throw new Error("heroImage must be a local file path");
    }
    assertPlainString(spec.heroAlt, "heroAlt");
  } else if (spec.heroAlt !== undefined) {
    throw new Error("heroAlt requires heroImage");
  }
  if (spec.source !== undefined && typeof spec.source !== "string") {
    throw new Error("source must be a string when provided");
  }
  if (!Array.isArray(spec.passages) || spec.passages.length === 0) {
    throw new Error("passages must be a non-empty array");
  }
  if (!Array.isArray(spec.interpretation) || spec.interpretation.length === 0) {
    throw new Error("interpretation must be a non-empty array");
  }

  spec.interpretation.forEach((paragraph, index) => {
    assertPlainString(paragraph, `interpretation[${index}]`);
    if (paragraph.includes("解读边界")) {
      throw new Error("interpretation must not contain 解读边界");
    }
  });

  const originalParts: string[] = [];
  spec.passages.forEach((passage, passageIndex) => {
    if (!passage || typeof passage !== "object" || !Array.isArray(passage.tokens) || passage.tokens.length === 0) {
      throw new Error(`passages[${passageIndex}].tokens must be a non-empty array`);
    }

    passage.tokens.forEach((token, tokenIndex) => {
      const label = `passages[${passageIndex}].tokens[${tokenIndex}]`;
      if (!token || typeof token !== "object") throw new Error(`${label} must be an object`);
      if (token.punctuation !== undefined && typeof token.punctuation !== "boolean") {
        throw new Error(`${label}.punctuation must be a boolean when provided`);
      }
      if (isExplicitLineBreak(token)) {
        // A locked source can contain meaningful line boundaries. Keep the literal
        // newline in the round trip while treating it as punctuation for coverage.
      } else {
        assertPlainString(token.text, `${label}.text`);
        if (token.text.includes("\n") || token.text.includes("\r")) {
          throw new Error(`${label}.text must isolate each line break as punctuation text "\\n"`);
        }
      }
      originalParts.push(token.text);

      if (token.punctuation === true) {
        if (token.text.trim().length === 0 && !isExplicitLineBreak(token)) {
          throw new Error(`${label}.text may only be the explicit newline "\\n" when punctuation is whitespace`);
        }
        if (token.note !== undefined || token.pinyin !== undefined || token.tone !== undefined) {
          throw new Error(`${label} is punctuation and cannot have note, pinyin, or tone`);
        }
        return;
      }

      assertPlainString(token.note, `${label}.note`);
      if (!token.tone || !VALID_TONES.has(token.tone)) {
        throw new Error(`${label}.tone must be word, clause, or variant`);
      }
      if (token.pinyin !== undefined && (typeof token.pinyin !== "string" || token.pinyin.trim().length === 0)) {
        throw new Error(`${label}.pinyin must be a non-empty string when provided`);
      }
    });
  });

  const reconstructed = originalParts.join("");
  if (reconstructed !== spec.original) {
    throw new Error(
      `Original round-trip mismatch: tokens reconstruct ${JSON.stringify(reconstructed)}, expected ${JSON.stringify(spec.original)}`,
    );
  }

  return spec as ClassicSpec;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

interface TokenGroup {
  token: ClassicToken;
  leading: ClassicToken[];
  trailing: ClassicToken[];
}

const OPENING_PUNCTUATION = new Set(["“", "‘", "「", "『", "《", "〈", "（", "〔", "【"]);

function isOpeningPunctuation(token: ClassicToken): boolean {
  return token.punctuation === true && OPENING_PUNCTUATION.has(token.text);
}

function groupPassageTokens(tokens: ClassicToken[]): TokenGroup[] {
  const groups: TokenGroup[] = [];
  let pendingLeading: ClassicToken[] = [];
  let afterLineBreak = false;

  for (const token of tokens) {
    if (token.punctuation) {
      if (isExplicitLineBreak(token)) {
        if (groups.length > 0 && pendingLeading.length === 0) groups.at(-1)!.trailing.push(token);
        else pendingLeading.push(token);
        afterLineBreak = true;
      } else if (groups.length === 0 || pendingLeading.length > 0 || afterLineBreak || isOpeningPunctuation(token)) {
        pendingLeading.push(token);
      } else {
        groups.at(-1)!.trailing.push(token);
      }
      continue;
    }

    groups.push({ token, leading: pendingLeading, trailing: [] });
    pendingLeading = [];
    afterLineBreak = false;
  }

  if (pendingLeading.length > 0 && groups.length > 0 && pendingLeading.every(isExplicitLineBreak)) {
    groups.at(-1)!.trailing.push(...pendingLeading);
    pendingLeading = [];
  }
  if (pendingLeading.length > 0) {
    throw new Error("A passage cannot contain punctuation without an annotated token");
  }
  return groups;
}

function renderPunctuation(token: ClassicToken): string {
  return `<span class="punctuation" data-token="punctuation">${escapeHtml(token.text)}</span>`;
}

function renderLineBreak(): string {
  return `<br class="punctuation-break" data-token="punctuation">`;
}

function renderTokenGroup(group: TokenGroup): string {
  const pinyin = group.token.pinyin
    ? `<span class="pinyin">${escapeHtml(group.token.pinyin)}</span>`
    : "";
  const lastLeadingBreak = group.leading.findLastIndex(isExplicitLineBreak);
  const firstTrailingBreak = group.trailing.findIndex(isExplicitLineBreak);
  const leadingOutside = group.leading.slice(0, lastLeadingBreak + 1)
    .map(token => isExplicitLineBreak(token) ? renderLineBreak() : renderPunctuation(token))
    .join("");
  const leadingInside = group.leading.slice(lastLeadingBreak + 1);
  const trailingInside = firstTrailingBreak === -1 ? group.trailing : group.trailing.slice(0, firstTrailingBreak);
  const trailingOutside = firstTrailingBreak === -1 ? "" : group.trailing.slice(firstTrailingBreak)
    .map(token => isExplicitLineBreak(token) ? renderLineBreak() : renderPunctuation(token))
    .join("");
  const classicRun = [
    ...leadingInside.map(renderPunctuation),
    `<span class="classic-text">${escapeHtml(group.token.text)}</span>`,
    ...trailingInside.map(renderPunctuation),
  ].join("");
  return `${leadingOutside}<span class="token-unit tone-${group.token.tone}" data-token="annotated">
    ${pinyin}
    <span class="classic-run">${classicRun}</span>
    <span class="annotation">${escapeHtml(group.token.note ?? "")}</span>
  </span>${trailingOutside}`;
}

export function renderHtml(spec: ClassicSpec, width = DEFAULT_WIDTH, heroDataUri?: string): string {
  const passages = spec.passages.map((passage, index) => `
    <section class="passage" data-passage="${index + 1}">
      <div class="annotated-line">${groupPassageTokens(passage.tokens).map(renderTokenGroup).join("")}</div>
    </section>`).join("");
  const interpretation = spec.interpretation
    .map(paragraph => `<p>${escapeHtml(paragraph)}</p>`)
    .join("\n");
  const source = spec.source?.trim()
    ? `<footer class="source">底本｜${escapeHtml(spec.source.trim())}</footer>`
    : "";
  let hero = "";
  if (spec.heroImage) {
    if (!heroDataUri?.startsWith("data:image/")) {
      throw new Error("heroImage requires an embedded image data URI");
    }
    hero = `<figure class="hero" data-hero>
      <img class="hero-image" src="${escapeHtml(heroDataUri)}" alt="${escapeHtml(spec.heroAlt!)}">
    </figure>`;
  }

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(spec.book)} · ${escapeHtml(spec.chapter)}</title>
  <style>
    :root {
      --ink: #171512;
      --muted: #77716a;
      --paper: #fdfcf9;
      --teal: #278f83;
      --vermilion: #d54a42;
      --ochre: #ad750f;
      --interpretation-ink: #39342e;
      --interpretation-heading: #795f43;
      --interpretation-paper: #eee8dc;
      --rule: #e6e1d8;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; width: ${width}px; min-width: ${width}px; background: var(--paper); }
    body {
      color: var(--ink);
      font-family: "Songti SC", "STSong", "Noto Serif CJK SC", serif;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
      overflow-x: hidden;
    }
    .sheet {
      width: ${width}px;
      min-height: 100vh;
      padding: 76px 82px 68px;
      background: var(--paper);
    }
    .book {
      margin: 0;
      text-align: center;
      font-size: 58px;
      line-height: 1.3;
      font-weight: 500;
      letter-spacing: .18em;
    }
    .chapter {
      margin: 13px 0 0;
      text-align: center;
      font-size: 52px;
      line-height: 1.25;
      font-weight: 650;
      letter-spacing: .08em;
    }
    .title-rule {
      width: 48px;
      height: 3px;
      margin: 31px auto 48px;
      background: var(--vermilion);
      border-radius: 3px;
    }
    .hero {
      position: relative;
      width: 100%;
      aspect-ratio: 3 / 2;
      margin: 0 0 66px;
      overflow: hidden;
      background: #ebe5da;
      border-top: 1px solid #e1d9cc;
      border-bottom: 1px solid #ded5c7;
    }
    .hero::after {
      content: "";
      position: absolute;
      inset: auto 0 0;
      height: 18%;
      background: linear-gradient(to bottom, transparent, color-mix(in srgb, var(--paper) 54%, transparent));
      pointer-events: none;
    }
    .hero-image {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      filter: saturate(.78) contrast(.94) brightness(1.025);
    }
    .passage {
      margin: 0 0 42px;
      break-inside: avoid;
    }
    .annotated-line {
      font-size: 0;
      line-height: 1;
      text-align: left;
    }
    .token-unit {
      display: inline-flex;
      max-width: 100%;
      min-width: 2.4em;
      margin: 0 14px 28px 0;
      padding: 0 2px 9px;
      flex-direction: column;
      align-items: center;
      vertical-align: top;
      border-bottom: 1px solid color-mix(in srgb, currentColor 30%, transparent);
      page-break-inside: avoid;
    }
    .classic-run,
    .classic-text,
    .punctuation {
      color: var(--ink);
      font-size: 46px;
      line-height: 1.24;
      font-weight: 550;
      letter-spacing: .035em;
      white-space: nowrap;
    }
    .classic-run {
      display: inline-flex;
      align-items: baseline;
    }
    .punctuation {
      display: inline;
      margin: 0;
      vertical-align: baseline;
    }
    .pinyin {
      min-height: 19px;
      margin: 0 0 3px;
      color: var(--muted);
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      font-size: 20px;
      line-height: 1.2;
      letter-spacing: .04em;
      white-space: nowrap;
    }
    .annotation {
      max-width: 9.6em;
      margin-top: 8px;
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Noto Sans CJK SC", sans-serif;
      font-size: 24px;
      line-height: 1.48;
      font-weight: 520;
      letter-spacing: .015em;
      text-align: center;
      overflow-wrap: anywhere;
    }
    .tone-word { color: var(--teal); }
    .tone-clause { color: var(--vermilion); }
    .tone-variant { color: var(--ochre); }
    .punctuation-break {
      display: block;
      width: 100%;
    }
    .interpretation {
      margin: 70px -20px 0;
      padding: 49px 48px 27px;
      border-top: 1px solid #ddd3c3;
      border-bottom: 1px solid #ddd3c3;
      background: var(--interpretation-paper);
      color: var(--interpretation-ink);
    }
    .interpretation h2 {
      margin: 0 0 31px;
      color: var(--interpretation-heading);
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      font-size: 30px;
      line-height: 1.3;
      font-weight: 650;
      letter-spacing: .12em;
    }
    .interpretation p {
      margin: 0 0 20px;
      font-size: 26px;
      line-height: 1.96;
      font-weight: 430;
      letter-spacing: .018em;
      text-align: justify;
      text-justify: inter-ideograph;
    }
    .interpretation p:first-of-type {
      color: #292621;
      font-size: 28px;
      line-height: 1.9;
      font-weight: 500;
    }
    .interpretation p + p { text-indent: 2em; }
    .source {
      margin-top: 52px;
      padding-top: 20px;
      border-top: 1px solid var(--rule);
      color: var(--muted);
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      font-size: 20px;
      line-height: 1.6;
      letter-spacing: .02em;
      overflow-wrap: anywhere;
    }
  </style>
</head>
<body>
  <main class="sheet">
    <header>
      <p class="book" data-book>${escapeHtml(spec.book)}</p>
      <h1 class="chapter" data-chapter>${escapeHtml(spec.chapter)}</h1>
      <div class="title-rule" aria-hidden="true"></div>
    </header>
    ${hero}
    <article class="classic" aria-label="原文与注解">${passages}
    </article>
    <section class="interpretation" data-interpretation>
      <h2>章节解读</h2>
      ${interpretation}
    </section>
    ${source}
  </main>
</body>
</html>`;
}

function printHelp(): void {
  console.log(`ljg-classic renderer

Usage:
  bun Tools/RenderClassic.ts --input <spec.json> --output <image.png> [options]

Required:
  --input <path>         Classic JSON spec
  --output <path>        Output PNG path

Options:
  --html <path>          Output HTML path (default: beside PNG)
  --width <720-1600>     Image width in pixels (default: 1080)
  --slices-dir <path>    Save overlapping QA slices
  --help                 Show this help`);
}

function parseArgs(args: string[]): RenderOptions | null {
  if (args.includes("--help") || args.includes("-h")) return null;
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (!key.startsWith("--")) throw new Error(`Unexpected argument: ${key}`);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${key}`);
    values.set(key, value);
    index += 1;
  }
  const input = values.get("--input");
  const output = values.get("--output");
  if (!input || !output) throw new Error("--input and --output are required; use --help for usage");
  const width = Number.parseInt(values.get("--width") ?? String(DEFAULT_WIDTH), 10);
  if (!Number.isInteger(width) || width < MIN_WIDTH || width > MAX_WIDTH) {
    throw new Error(`--width must be an integer from ${MIN_WIDTH} to ${MAX_WIDTH}`);
  }
  const resolvedOutput = resolve(output);
  const html = values.get("--html")
    ? resolve(values.get("--html")!)
    : resolvedOutput.slice(0, -extname(resolvedOutput).length) + ".html";
  return {
    input: resolve(input),
    output: resolvedOutput,
    html,
    width,
    slicesDir: values.get("--slices-dir") ? resolve(values.get("--slices-dir")!) : undefined,
  };
}

export async function sha256File(path: string): Promise<string> {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(await Bun.file(path).arrayBuffer());
  return hasher.digest("hex");
}

export async function readHeroDataUri(path: string): Promise<string> {
  const mimeByExtension: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
  };
  const mime = mimeByExtension[extname(path).toLowerCase()];
  if (!mime) throw new Error("heroImage must be PNG, JPEG, or WebP");
  const file = Bun.file(path);
  if (!(await file.exists())) throw new Error(`heroImage not found: ${path}`);
  const bytes = await file.arrayBuffer();
  if (bytes.byteLength === 0) throw new Error(`heroImage is empty: ${path}`);
  return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
}

export async function readPngDimensions(path: string): Promise<{ width: number; height: number }> {
  const bytes = new Uint8Array(await Bun.file(path).arrayBuffer());
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 45 || signature.some((byte, index) => bytes[index] !== byte)) {
    throw new Error(`${path} is not a valid PNG`);
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8;
  let width: number | null = null;
  let height: number | null = null;
  let sawIdat = false;
  let sawIend = false;
  let chunkIndex = 0;
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) throw new Error(`${path} has a truncated PNG chunk`);
    const length = view.getUint32(offset);
    const typeOffset = offset + 4;
    const dataOffset = offset + 8;
    const dataEnd = dataOffset + length;
    const nextOffset = dataEnd + 4;
    if (dataEnd < dataOffset || nextOffset > bytes.length) throw new Error(`${path} has a truncated PNG chunk`);
    const type = String.fromCharCode(...bytes.subarray(typeOffset, typeOffset + 4));
    const expectedCrc = view.getUint32(dataEnd);
    const actualCrc = crc32(bytes.subarray(typeOffset, dataEnd));
    if (actualCrc !== expectedCrc) throw new Error(`${path} has an invalid ${type} CRC`);

    if (chunkIndex === 0) {
      if (type !== "IHDR" || length !== 13) throw new Error(`${path} must begin with a 13-byte IHDR chunk`);
      width = view.getUint32(dataOffset);
      height = view.getUint32(dataOffset + 4);
      if (width <= 0 || height <= 0 || bytes[dataOffset + 10] !== 0 || bytes[dataOffset + 11] !== 0
        || (bytes[dataOffset + 12] !== 0 && bytes[dataOffset + 12] !== 1)) {
        throw new Error(`${path} has an invalid IHDR chunk`);
      }
    } else if (type === "IHDR") {
      throw new Error(`${path} contains a duplicate IHDR chunk`);
    }
    if (type === "IDAT") sawIdat = true;
    if (type === "IEND") {
      if (length !== 0) throw new Error(`${path} has an invalid IEND chunk`);
      sawIend = true;
      if (nextOffset !== bytes.length) throw new Error(`${path} has trailing bytes after IEND`);
      break;
    }
    offset = nextOffset;
    chunkIndex += 1;
  }
  if (width === null || height === null || !sawIdat || !sawIend) throw new Error(`${path} is an incomplete PNG`);
  return { width, height };
}

const CRC32_TABLE = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) === 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

const GENERATED_SLICE_NAME = /^\d+--y-\d+\.png$/;

export async function clearGeneratedSlices(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true });
  const entries = await readdir(directory, { withFileTypes: true });
  await Promise.all(entries
    .filter(entry => GENERATED_SLICE_NAME.test(entry.name) && (entry.isFile() || entry.isSymbolicLink()))
    .map(entry => unlink(resolve(directory, entry.name))));
}

async function createSlices(
  page: import("playwright").Page,
  directory: string,
  width: number,
  height: number,
): Promise<QaSliceDetail[]> {
  const sliceHeight = Math.min(1600, height);
  const overlap = Math.min(260, Math.floor(sliceHeight * 0.2));
  const step = Math.max(1, sliceHeight - overlap);
  const slices: QaSliceDetail[] = [];
  let index = 1;
  for (let y = 0; y < height; y += step) {
    const currentHeight = Math.min(sliceHeight, height - y);
    const target = resolve(directory, `${String(index).padStart(2, "0")}--y-${y}.png`);
    await page.screenshot({
      path: target,
      type: "png",
      clip: { x: 0, y, width, height: currentHeight },
    });
    const dimensions = await readPngDimensions(target);
    slices.push({
      index,
      path: target,
      y,
      width: dimensions.width,
      height: dimensions.height,
      sha256: await sha256File(target),
    });
    if (y + currentHeight >= height) break;
    index += 1;
  }
  return slices;
}

async function run(options: RenderOptions): Promise<void> {
  const raw = await Bun.file(options.input).json();
  const spec = validateSpec(raw);
  const heroImagePath = spec.heroImage
    ? resolve(dirname(options.input), spec.heroImage)
    : undefined;
  const heroDataUri = heroImagePath ? await readHeroDataUri(heroImagePath) : undefined;
  if (options.slicesDir) await clearGeneratedSlices(options.slicesDir);
  await mkdir(dirname(options.output), { recursive: true });
  await mkdir(dirname(options.html), { recursive: true });
  await Bun.write(options.html, renderHtml(spec, options.width, heroDataUri));

  let chromium: typeof import("playwright").chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    throw new Error("Playwright not found. Run: bun install && bunx playwright install chromium");
  }

  const browser = await chromium.launch({ headless: true });
  let audit: DomAudit;
  let sliceDetails: QaSliceDetail[] = [];
  try {
    const page = await browser.newPage({ viewport: { width: options.width, height: 900 }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(options.html).href, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      await document.fonts?.ready;
      await Promise.all(Array.from(document.images).map(image => image.decode()));
    });
    await page.waitForTimeout(180);
    audit = await page.evaluate((expectedOriginal) => {
      const visible = (element: Element | null): boolean => {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      };
      const elements = Array.from(document.querySelectorAll<HTMLElement>(".token-unit, .punctuation, .interpretation p, .source"));
      const fontSize = (selector: string, className: string): number => {
        let element = document.querySelector<HTMLElement>(selector);
        let probe: HTMLElement | null = null;
        if (!element) {
          probe = document.createElement("span");
          probe.className = className;
          probe.textContent = "字";
          probe.style.position = "absolute";
          probe.style.visibility = "hidden";
          document.body.append(probe);
          element = probe;
        }
        const size = Number.parseFloat(getComputedStyle(element).fontSize);
        probe?.remove();
        return size;
      };
      const overflowCount = elements.filter(element => element.scrollWidth > element.clientWidth + 1).length;
      const clippedCount = elements.filter(element => {
        const rect = element.getBoundingClientRect();
        return rect.left < -1 || rect.right > document.documentElement.clientWidth + 1;
      }).length;
      const emptyTextCount = elements.filter(element => !element.textContent?.trim()).length;
      return {
        documentHeight: Math.ceil(document.documentElement.scrollHeight),
        scrollWidth: Math.ceil(document.documentElement.scrollWidth),
        tokenCount: document.querySelectorAll("[data-token]").length,
        annotationCount: document.querySelectorAll('[data-token="annotated"] .annotation').length,
        interpretationParagraphs: document.querySelectorAll(".interpretation p").length,
        overflowCount,
        clippedCount,
        emptyTextCount,
        titleVisible: visible(document.querySelector("[data-book]")),
        chapterVisible: visible(document.querySelector("[data-chapter]")),
        heroVisible: visible(document.querySelector("[data-hero]")),
        interpretationVisible: visible(document.querySelector("[data-interpretation]")),
        originalMatches: Array.from(document.querySelectorAll<HTMLElement>(
          ".classic .classic-text, .classic .punctuation, .classic .punctuation-break",
        )).map(element => element.matches(".punctuation-break") ? "\n" : element.textContent ?? "").join("") === expectedOriginal,
        fontSizes: {
          book: fontSize(".book", "book"),
          original: fontSize(".classic-text", "classic-text"),
          pinyin: fontSize(".pinyin", "pinyin"),
          annotation: fontSize(".annotation", "annotation"),
          source: fontSize(".source", "source"),
        },
      };
    }, spec.original);

    if (audit.scrollWidth > options.width) throw new Error(`Horizontal overflow: ${audit.scrollWidth}px > ${options.width}px`);
    if (audit.overflowCount > 0 || audit.clippedCount > 0 || audit.emptyTextCount > 0) {
      throw new Error(`DOM audit failed: ${JSON.stringify(audit)}`);
    }
    if (!audit.titleVisible || !audit.chapterVisible || !audit.interpretationVisible) {
      throw new Error(`Required section invisible: ${JSON.stringify(audit)}`);
    }
    if (!audit.originalMatches) throw new Error(`Rendered original order mismatch: ${JSON.stringify(audit)}`);
    if (spec.heroImage && !audit.heroVisible) {
      throw new Error(`Hero image invisible: ${JSON.stringify(audit)}`);
    }

    await page.setViewportSize({ width: options.width, height: audit.documentHeight });
    await page.screenshot({
      path: options.output,
      type: "png",
      clip: { x: 0, y: 0, width: options.width, height: audit.documentHeight },
    });
    if (options.slicesDir) {
      sliceDetails = await createSlices(page, options.slicesDir, options.width, audit.documentHeight);
    }
  } finally {
    await browser.close();
  }

  const dimensions = await readPngDimensions(options.output);
  const allTokens = spec.passages.flatMap(passage => passage.tokens);
  const annotatedTokens = allTokens.filter(token => !token.punctuation);
  const punctuationCount = allTokens.filter(token => token.punctuation).length;
  const toneCounts = annotatedTokens.reduce<Record<Tone, number>>(
    (counts, token) => {
      counts[token.tone!] += 1;
      return counts;
    },
    { word: 0, clause: 0, variant: 0 },
  );
  const manifestPath = options.output.slice(0, -extname(options.output).length) + ".manifest.json";
  const manifest = {
    schemaVersion: 2,
    renderedAt: new Date().toISOString(),
    book: spec.book,
    chapter: spec.chapter,
    heroPresent: Boolean(spec.heroImage),
    heroVisible: audit.heroVisible,
    heroImagePath: heroImagePath ?? null,
    source: spec.source ?? null,
    inputPath: options.input,
    htmlPath: options.html,
    pngPath: options.output,
    manifestPath,
    width: dimensions.width,
    height: dimensions.height,
    original: spec.original,
    originalChars: Array.from(spec.original).length,
    passageCount: spec.passages.length,
    tokenCount: allTokens.length,
    punctuationCount,
    annotationCount: annotatedTokens.length,
    annotationCoverage: 1,
    toneCounts,
    interpretationParagraphs: spec.interpretation.length,
    interpretationChars: Array.from(spec.interpretation.join("")).length,
    dom: audit,
    qaSlices: sliceDetails.map(slice => slice.path),
    qaSliceDetails: sliceDetails,
    sha256: {
      input: await sha256File(options.input),
      html: await sha256File(options.html),
      png: await sha256File(options.output),
      hero: heroImagePath ? await sha256File(heroImagePath) : null,
    },
  };
  await Bun.write(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ status: "rendered", png: options.output, html: options.html, manifest: manifestPath, width: dimensions.width, height: dimensions.height, qaSlices: sliceDetails.length }));
}

if (import.meta.main) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (!options) {
      printHelp();
      process.exit(0);
    }
    await run(options);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
