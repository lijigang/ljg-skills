#!/usr/bin/env bun

import { readdir } from "node:fs/promises";
import { basename, dirname, extname, isAbsolute, resolve } from "node:path";
import {
  readHeroDataUri,
  readPngDimensions,
  renderHtml,
  sha256File,
  validateSpec,
  type ClassicSpec,
  type QaSliceDetail,
  type Tone,
} from "./RenderClassic.ts";

export interface ValidateOptions {
  input: string;
  png: string;
  manifest: string;
}

interface ManifestSha256 {
  input?: unknown;
  html?: unknown;
  png?: unknown;
  hero?: unknown;
}

interface ManifestDom {
  documentHeight?: unknown;
  scrollWidth?: unknown;
  tokenCount?: unknown;
  annotationCount?: unknown;
  interpretationParagraphs?: unknown;
  overflowCount?: unknown;
  clippedCount?: unknown;
  emptyTextCount?: unknown;
  titleVisible?: unknown;
  chapterVisible?: unknown;
  heroVisible?: unknown;
  interpretationVisible?: unknown;
  originalMatches?: unknown;
  fontSizes?: unknown;
}

interface ClassicManifest {
  schemaVersion?: unknown;
  book?: unknown;
  chapter?: unknown;
  heroPresent?: unknown;
  heroVisible?: unknown;
  heroImagePath?: unknown;
  source?: unknown;
  inputPath?: unknown;
  htmlPath?: unknown;
  pngPath?: unknown;
  manifestPath?: unknown;
  width?: unknown;
  height?: unknown;
  original?: unknown;
  originalChars?: unknown;
  passageCount?: unknown;
  tokenCount?: unknown;
  punctuationCount?: unknown;
  annotationCount?: unknown;
  annotationCoverage?: unknown;
  toneCounts?: unknown;
  interpretationParagraphs?: unknown;
  interpretationChars?: unknown;
  dom?: ManifestDom;
  qaSlices?: unknown;
  qaSliceDetails?: unknown;
  sha256?: ManifestSha256;
}

interface ValidatedSlice {
  index: number;
  path: string;
  y: number;
  width: number;
  height: number;
  sha256: string;
}

export interface ValidationSummary {
  status: "valid";
  png: string;
  width: number;
  height: number;
  tokenCount: number;
  annotationCount: number;
  annotationCoverage: 1;
  interpretationParagraphs: number;
  heroPresent: boolean;
  heroVisible: boolean;
  qaSlices: number;
}

const SHA256 = /^[a-f0-9]{64}$/;
const GENERATED_SLICE_NAME = /^(\d+)--y-(\d+)\.png$/;
const FONT_SIZE_RANGES = {
  book: [54, 68],
  original: [42, 52],
  pinyin: [18, 22],
  annotation: [22, 28],
  source: [18, 22],
} as const;

function printHelp(): void {
  console.log(`ljg-classic validator

Usage:
  bun Tools/ValidateClassic.ts --input <spec.json> --png <image.png> --manifest <manifest.json>

Options:
  --help                 Show this help`);
}

function parseArgs(args: string[]): ValidateOptions | null {
  if (args.includes("--help") || args.includes("-h")) return null;
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith("--") || !value || value.startsWith("--")) {
      throw new Error(`Invalid argument near ${key ?? "end"}`);
    }
    values.set(key, value);
    index += 1;
  }
  const input = values.get("--input");
  const png = values.get("--png");
  const manifest = values.get("--manifest");
  if (!input || !png || !manifest) throw new Error("--input, --png, and --manifest are required");
  return { input: resolve(input), png: resolve(png), manifest: resolve(manifest) };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function expectPath(
  label: string,
  actual: unknown,
  expected: string,
  errors: string[],
): actual is string {
  if (typeof actual !== "string" || !isAbsolute(actual)) {
    errors.push(`${label} must be an absolute path`);
    return false;
  }
  if (resolve(actual) !== resolve(expected)) errors.push(`${label} mismatch: expected ${expected}, got ${actual}`);
  return true;
}

async function fileExists(path: string): Promise<boolean> {
  return Bun.file(path).exists();
}

async function verifyHash(
  label: string,
  path: string,
  expected: unknown,
  errors: string[],
): Promise<string | null> {
  if (typeof expected !== "string" || !SHA256.test(expected)) {
    errors.push(`${label} hash must be a lowercase SHA-256 hex string`);
    return null;
  }
  if (!(await fileExists(path))) {
    errors.push(`${label} file missing: ${path}`);
    return null;
  }
  const actual = await sha256File(path);
  if (actual !== expected) errors.push(`${label} hash mismatch`);
  return actual;
}

function countSpec(spec: ClassicSpec): {
  allTokens: ClassicSpec["passages"][number]["tokens"];
  annotatedTokens: ClassicSpec["passages"][number]["tokens"];
  punctuationCount: number;
  toneCounts: Record<Tone, number>;
} {
  const allTokens = spec.passages.flatMap(passage => passage.tokens);
  const annotatedTokens = allTokens.filter(token => !token.punctuation);
  const toneCounts = annotatedTokens.reduce<Record<Tone, number>>(
    (counts, token) => {
      counts[token.tone!] += 1;
      return counts;
    },
    { word: 0, clause: 0, variant: 0 },
  );
  return {
    allTokens,
    annotatedTokens,
    punctuationCount: allTokens.length - annotatedTokens.length,
    toneCounts,
  };
}

function validateComputedFontSizes(value: unknown, errors: string[]): void {
  if (value === undefined) return; // schema v2 manifests rendered before font capture stay readable
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push("computed font sizes must be an object");
    return;
  }
  const sizes = value as Record<string, unknown>;
  for (const [name, [minimum, maximum]] of Object.entries(FONT_SIZE_RANGES)) {
    const size = sizes[name];
    if (typeof size !== "number" || !Number.isFinite(size) || size < minimum || size > maximum) {
      errors.push(`computed ${name} font size must be ${minimum}-${maximum}px, got ${String(size)}`);
    }
  }
}

async function validateHtml(
  spec: ClassicSpec,
  inputPath: string,
  manifest: ClassicManifest,
  errors: string[],
): Promise<void> {
  if (typeof manifest.htmlPath !== "string" || !isAbsolute(manifest.htmlPath)) {
    errors.push("htmlPath must be an absolute path");
    return;
  }
  const htmlPath = resolve(manifest.htmlPath);
  if (!(await fileExists(htmlPath))) {
    errors.push(`HTML file missing: ${htmlPath}`);
    return;
  }
  await verifyHash("HTML", htmlPath, manifest.sha256?.html, errors);
  const html = await Bun.file(htmlPath).text();
  const requiredFragments = [
    "<html",
    "data-book",
    "data-chapter",
    "data-interpretation",
    escapeHtml(spec.book),
    escapeHtml(spec.chapter),
    "章节解读",
    ...spec.interpretation.map(escapeHtml),
  ];
  for (const fragment of requiredFragments) {
    if (!html.includes(fragment)) errors.push(`HTML content mismatch: missing ${JSON.stringify(fragment.slice(0, 80))}`);
  }
  if (spec.source?.trim() && !html.includes(escapeHtml(spec.source.trim()))) {
    errors.push("HTML content mismatch: source text missing");
  }
  if (/(?:src|href)\s*=\s*["'](?:https?:)?\/\//i.test(html) || /src\s*=\s*["']file:/i.test(html)) {
    errors.push("HTML contains a remote or file-linked resource");
  }

  let embeddedHeroDataUri: string | undefined;
  if (spec.heroImage) {
    const heroPath = resolve(dirname(inputPath), spec.heroImage);
    if (await fileExists(heroPath)) {
      embeddedHeroDataUri = await readHeroDataUri(heroPath);
      if (!html.includes(`src="${embeddedHeroDataUri}"`)) errors.push("HTML embedded hero does not match the hero file");
    }
    if (!html.includes("data-hero") || !html.includes(`alt="${escapeHtml(spec.heroAlt!)}"`)) {
      errors.push("HTML hero markup mismatch");
    }
  } else if (html.includes("data-hero")) {
    errors.push("HTML contains an unexpected hero");
  }

  const currentManifest = manifest.dom?.originalMatches !== undefined
    || manifest.dom?.fontSizes !== undefined
    || manifest.qaSliceDetails !== undefined;
  if (currentManifest) {
    if (typeof manifest.width !== "number") errors.push("manifest width is required for deterministic HTML validation");
    else if (html !== renderHtml(spec, manifest.width, embeddedHeroDataUri)) {
      errors.push("HTML differs from deterministic renderer output");
    }
  }
}

async function validateSlices(
  rawPaths: unknown,
  rawDetails: unknown,
  mainWidth: number,
  mainHeight: number,
  errors: string[],
): Promise<ValidatedSlice[]> {
  if (!Array.isArray(rawPaths)) {
    errors.push("qaSlices must be an array");
    return [];
  }
  if (rawPaths.length === 0) {
    if (rawDetails !== undefined && (!Array.isArray(rawDetails) || rawDetails.length !== 0)) {
      errors.push("qaSliceDetails must be empty when qaSlices is empty");
    }
    return [];
  }

  const detailByPath = new Map<string, QaSliceDetail>();
  if (rawDetails !== undefined) {
    if (!Array.isArray(rawDetails)) {
      errors.push("qaSliceDetails must be an array when provided");
    } else {
      for (const rawDetail of rawDetails) {
        if (!rawDetail || typeof rawDetail !== "object" || typeof (rawDetail as QaSliceDetail).path !== "string") {
          errors.push("qaSliceDetails contains an invalid entry");
          continue;
        }
        const detail = rawDetail as QaSliceDetail;
        if (!isAbsolute(detail.path)) errors.push(`qaSliceDetails path must be absolute: ${detail.path}`);
        const detailPath = resolve(detail.path);
        if (detailByPath.has(detailPath)) errors.push(`duplicate qaSliceDetails path: ${detailPath}`);
        detailByPath.set(detailPath, detail);
      }
      if (rawDetails.length !== rawPaths.length) errors.push("qaSliceDetails count mismatch");
    }
  }

  const slices: ValidatedSlice[] = [];
  const seenPaths = new Set<string>();
  for (let position = 0; position < rawPaths.length; position += 1) {
    const rawPath = rawPaths[position];
    if (typeof rawPath !== "string" || !isAbsolute(rawPath)) {
      errors.push(`qaSlices[${position}] must be an absolute path`);
      continue;
    }
    const path = resolve(rawPath);
    if (seenPaths.has(path)) errors.push(`duplicate QA slice path: ${path}`);
    seenPaths.add(path);
    const match = basename(path).match(GENERATED_SLICE_NAME);
    if (!match) {
      errors.push(`invalid QA slice filename: ${basename(path)}`);
      continue;
    }
    const index = Number.parseInt(match[1], 10);
    const y = Number.parseInt(match[2], 10);
    if (index !== position + 1) errors.push(`QA slice sequence mismatch at ${basename(path)}: expected index ${position + 1}`);
    if (!(await fileExists(path))) {
      errors.push(`QA slice missing: ${path}`);
      continue;
    }
    let dimensions: { width: number; height: number };
    try {
      dimensions = await readPngDimensions(path);
    } catch (error) {
      errors.push(`invalid QA slice ${path}: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    const hash = await sha256File(path);
    if (dimensions.width !== mainWidth) errors.push(`QA slice width mismatch at ${basename(path)}`);
    if (dimensions.height <= 0 || dimensions.height > 1600) errors.push(`QA slice height invalid at ${basename(path)}`);
    if (y < 0 || y >= mainHeight || y + dimensions.height > mainHeight) {
      errors.push(`QA slice bounds mismatch at ${basename(path)}`);
    }

    const detail = detailByPath.get(path);
    if (rawDetails !== undefined && !detail) {
      errors.push(`qaSliceDetails missing entry for ${path}`);
    } else if (detail) {
      if (detail.index !== index || detail.y !== y) errors.push(`QA slice metadata position mismatch at ${basename(path)}`);
      if (detail.width !== dimensions.width || detail.height !== dimensions.height) {
        errors.push(`QA slice metadata dimension mismatch at ${basename(path)}`);
      }
      if (detail.sha256 !== hash) errors.push(`QA slice hash mismatch at ${basename(path)}`);
    }
    slices.push({ index, path, y, width: dimensions.width, height: dimensions.height, sha256: hash });
  }

  const directories = new Set(slices.map(slice => dirname(slice.path)));
  if (directories.size !== 1) {
    errors.push("QA slices must share one directory");
  } else if (directories.size === 1) {
    const directory = [...directories][0];
    const actual = (await readdir(directory))
      .filter(name => GENERATED_SLICE_NAME.test(name))
      .map(name => resolve(directory, name));
    const stale = actual.filter(path => !seenPaths.has(path));
    if (stale.length > 0) errors.push(`stale/unlisted QA slices: ${stale.map(path => basename(path)).sort().join(", ")}`);
  }

  const ordered = [...slices].sort((left, right) => left.index - right.index);
  if (ordered.length > 0) {
    if (ordered[0].y !== 0) errors.push(`QA slice coverage must start at y=0, got ${ordered[0].y}`);
    let coveredUntil = ordered[0].y + ordered[0].height;
    let previousY = ordered[0].y;
    for (const slice of ordered.slice(1)) {
      if (slice.y <= previousY) errors.push(`QA slice y positions must increase: ${slice.y} after ${previousY}`);
      if (slice.y > coveredUntil) errors.push(`QA slice coverage gap before y=${slice.y}`);
      coveredUntil = Math.max(coveredUntil, slice.y + slice.height);
      previousY = slice.y;
    }
    if (coveredUntil !== mainHeight) {
      errors.push(`QA slice coverage must end at y=${mainHeight}, got ${coveredUntil}`);
    }
  }
  return ordered;
}

export async function validateClassicArtifacts(options: ValidateOptions): Promise<ValidationSummary> {
  const resolvedOptions = {
    input: resolve(options.input),
    png: resolve(options.png),
    manifest: resolve(options.manifest),
  };
  const spec = validateSpec(await Bun.file(resolvedOptions.input).json());
  const manifest = await Bun.file(resolvedOptions.manifest).json() as ClassicManifest;
  const dimensions = await readPngDimensions(resolvedOptions.png);
  const { allTokens, annotatedTokens, punctuationCount, toneCounts } = countSpec(spec);
  const errors: string[] = [];

  if (manifest.schemaVersion !== 2) errors.push(`manifest schemaVersion must be 2, got ${String(manifest.schemaVersion)}`);
  expectPath("inputPath", manifest.inputPath, resolvedOptions.input, errors);
  expectPath("pngPath", manifest.pngPath, resolvedOptions.png, errors);
  expectPath("manifestPath", manifest.manifestPath, resolvedOptions.manifest, errors);
  if (manifest.book !== spec.book || manifest.chapter !== spec.chapter) errors.push("book/chapter mismatch");
  if (manifest.original !== spec.original) errors.push("original mismatch");
  if (manifest.source !== (spec.source ?? null)) errors.push("source mismatch");
  if (manifest.originalChars !== Array.from(spec.original).length) errors.push("original character count mismatch");
  if (manifest.passageCount !== spec.passages.length) errors.push("passage count mismatch");
  if (manifest.tokenCount !== allTokens.length) errors.push("token count mismatch");
  if (manifest.punctuationCount !== punctuationCount) errors.push("punctuation count mismatch");
  if (manifest.annotationCount !== annotatedTokens.length || manifest.annotationCoverage !== 1) {
    errors.push("annotation coverage mismatch");
  }
  const rawToneCounts = manifest.toneCounts as Partial<Record<Tone, unknown>> | undefined;
  if (!rawToneCounts || (Object.keys(toneCounts) as Tone[]).some(tone => rawToneCounts[tone] !== toneCounts[tone])) {
    errors.push("tone count mismatch");
  }
  if (manifest.interpretationParagraphs !== spec.interpretation.length) errors.push("interpretation paragraph mismatch");
  if (manifest.interpretationChars !== Array.from(spec.interpretation.join("")).length) {
    errors.push("interpretation character count mismatch");
  }

  const heroPath = spec.heroImage ? resolve(dirname(resolvedOptions.input), spec.heroImage) : null;
  if (manifest.heroPresent !== Boolean(heroPath)) errors.push("hero presence mismatch");
  if (heroPath) {
    expectPath("heroImagePath", manifest.heroImagePath, heroPath, errors);
    if (manifest.heroVisible !== true || manifest.dom?.heroVisible !== true) errors.push("hero visibility mismatch");
    await verifyHash("hero", heroPath, manifest.sha256?.hero, errors);
    if (extname(heroPath).toLowerCase() === ".png" && await fileExists(heroPath)) {
      try {
        await readPngDimensions(heroPath);
      } catch (error) {
        errors.push(`hero PNG invalid: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } else {
    if (manifest.heroImagePath !== null) errors.push("unexpected hero image path");
    if (manifest.sha256?.hero !== null) errors.push("unexpected hero hash");
    if (manifest.heroVisible !== false || manifest.dom?.heroVisible !== false) errors.push("unexpected hero visibility");
  }

  if (manifest.width !== dimensions.width || manifest.height !== dimensions.height) errors.push("PNG dimension mismatch");
  if (dimensions.width < 720 || dimensions.width > 1600 || dimensions.height <= 0) errors.push("invalid PNG dimensions");
  if (manifest.dom?.documentHeight !== dimensions.height) errors.push("DOM/document PNG height mismatch");
  if (manifest.dom?.scrollWidth !== dimensions.width) {
    errors.push("DOM scroll width mismatch");
  }
  if (manifest.dom?.tokenCount !== allTokens.length || manifest.dom?.annotationCount !== annotatedTokens.length) {
    errors.push("DOM token count mismatch");
  }
  if (manifest.dom?.interpretationParagraphs !== spec.interpretation.length) errors.push("DOM interpretation count mismatch");
  if (manifest.dom?.overflowCount !== 0 || manifest.dom?.clippedCount !== 0 || manifest.dom?.emptyTextCount !== 0) {
    errors.push("DOM audit mismatch");
  }
  if (!manifest.dom?.titleVisible || !manifest.dom?.chapterVisible || !manifest.dom?.interpretationVisible) {
    errors.push("required section not visible");
  }
  if (manifest.dom?.originalMatches !== undefined && manifest.dom.originalMatches !== true) {
    errors.push("rendered original order mismatch");
  }
  validateComputedFontSizes(manifest.dom?.fontSizes, errors);

  await verifyHash("input", resolvedOptions.input, manifest.sha256?.input, errors);
  await verifyHash("PNG", resolvedOptions.png, manifest.sha256?.png, errors);
  await validateHtml(spec, resolvedOptions.input, manifest, errors);
  const slices = await validateSlices(manifest.qaSlices, manifest.qaSliceDetails, dimensions.width, dimensions.height, errors);

  if (errors.length > 0) throw new Error(`Validation failed:\n- ${errors.join("\n- ")}`);
  return {
    status: "valid",
    png: resolvedOptions.png,
    width: dimensions.width,
    height: dimensions.height,
    tokenCount: allTokens.length,
    annotationCount: annotatedTokens.length,
    annotationCoverage: 1,
    interpretationParagraphs: spec.interpretation.length,
    heroPresent: Boolean(heroPath),
    heroVisible: manifest.heroVisible === true,
    qaSlices: slices.length,
  };
}

if (import.meta.main) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (!options) {
      printHelp();
      process.exit(0);
    }
    console.log(JSON.stringify(await validateClassicArtifacts(options)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
