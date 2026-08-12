import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { deflateSync } from "node:zlib";
import { chromium } from "playwright";
import {
  clearGeneratedSlices,
  readHeroDataUri,
  readPngDimensions,
  renderHtml,
  sha256File,
  validateSpec,
} from "./RenderClassic.ts";
import { validateClassicArtifacts } from "./ValidateClassic.ts";

const validSpec = {
  book: "道德经",
  chapter: "第十六章",
  original: "致虚极，守静笃。",
  source: "通行本",
  passages: [{
    tokens: [
      { text: "致虚极", note: "尽力使内心虚静", tone: "word" },
      { text: "，", punctuation: true },
      { text: "守静笃", note: "彻底守住清静", tone: "clause" },
      { text: "。", punctuation: true },
    ],
  }],
  interpretation: ["先让心静下来，才看得见事物如何往复。"],
};

describe("validateSpec", () => {
  test("accepts a fully annotated round-trip spec", () => {
    const spec = validateSpec(validSpec);
    expect(spec.book).toBe("道德经");
  });

  test("rejects an unannotated non-punctuation token", () => {
    const broken = structuredClone(validSpec) as any;
    delete broken.passages[0].tokens[0].note;
    expect(() => validateSpec(broken)).toThrow("note must be a non-empty string");
  });

  test("rejects original round-trip drift", () => {
    const broken = structuredClone(validSpec) as any;
    broken.original = "致虚极。";
    expect(() => validateSpec(broken)).toThrow("Original round-trip mismatch");
  });

  test("rejects annotation fields on punctuation", () => {
    const broken = structuredClone(validSpec) as any;
    broken.passages[0].tokens[1].note = "逗号";
    expect(() => validateSpec(broken)).toThrow("is punctuation");
  });

  test("rejects a non-boolean punctuation flag", () => {
    const broken = structuredClone(validSpec) as any;
    broken.passages[0].tokens[0].punctuation = "yes";
    expect(() => validateSpec(broken)).toThrow("punctuation must be a boolean");
  });

  test("accepts a local hero image with paired alt text", () => {
    const spec = validateSpec({
      ...validSpec,
      heroImage: "assets/chapter-hero.png",
      heroAlt: "雾山静水间，一圈涟漪正在平复",
    });
    expect(spec.heroImage).toBe("assets/chapter-hero.png");
  });

  test("rejects a hero image without alt text", () => {
    expect(() => validateSpec({ ...validSpec, heroImage: "assets/chapter-hero.png" }))
      .toThrow("heroAlt must be a non-empty string");
  });

  test("rejects remote and data hero sources", () => {
    for (const heroImage of ["https://example.com/hero.png", "data:image/png;base64,AAAA"]) {
      expect(() => validateSpec({ ...validSpec, heroImage, heroAlt: "章节意旨图" }))
        .toThrow("heroImage must be a local file path");
    }
  });

  test("rejects interpretation scaffolding labels", () => {
    expect(() => validateSpec({ ...validSpec, interpretation: ["解读边界：这里只适用于某些情况。"] }))
      .toThrow("interpretation must not contain 解读边界");
  });

  test("preserves an explicit newline punctuation token in the original round trip", () => {
    const spec = validateSpec({
      ...validSpec,
      original: "致虚极。\n守静笃。",
      passages: [{
        tokens: [
          { text: "致虚极", note: "尽力使内心虚静", tone: "word" },
          { text: "。", punctuation: true },
          { text: "\n", punctuation: true },
          { text: "守静笃", note: "彻底守住清静", tone: "clause" },
          { text: "。", punctuation: true },
        ],
      }],
    });
    expect(spec.original).toBe("致虚极。\n守静笃。");
    expect(renderHtml(spec)).toContain('<br class="punctuation-break" data-token="punctuation">');
  });

  test("rejects unsupported whitespace and unsplit line breaks", () => {
    for (const token of [
      { text: " ", punctuation: true },
      { text: "\t", punctuation: true },
      { text: "\n\n", punctuation: true },
      { text: "\n", note: "换行", tone: "word" },
      { text: "致虚极\n", note: "未拆换行", tone: "word" },
      { text: "。\n", punctuation: true },
    ]) {
      const broken = structuredClone(validSpec) as any;
      broken.passages[0].tokens[0] = token;
      expect(() => validateSpec(broken)).toThrow();
    }
  });
});

describe("renderHtml", () => {
  test("escapes content and emits all semantic sections", () => {
    const spec = validateSpec({ ...validSpec, source: "通行本 <校本>" });
    const html = renderHtml(spec, 1080);
    expect(html).toContain("data-book");
    expect(html).toContain("data-chapter");
    expect(html).toContain("章节解读");
    expect(html).toContain("tone-word");
    expect(html).toContain("tone-clause");
    expect(html).toContain("&lt;校本&gt;");
    expect(html).toContain("width: 1080px");
    expect(html).toContain(
      '<span class="classic-run"><span class="classic-text">致虚极</span><span class="punctuation" data-token="punctuation">，</span></span>',
    );
  });

  test("embeds a quiet hero before the classic text and uses warm ink interpretation", () => {
    const spec = validateSpec({
      ...validSpec,
      heroImage: "assets/chapter-hero.png",
      heroAlt: "雾山静水间，一圈涟漪正在平复",
    });
    const html = renderHtml(spec, 1080, "data:image/png;base64,AAAA");
    expect(html).toContain('class="hero-image"');
    expect(html).toContain('src="data:image/png;base64,AAAA"');
    expect(html).toContain('alt="雾山静水间，一圈涟漪正在平复"');
    expect(html.indexOf('class="hero"')).toBeLessThan(html.indexOf('class="classic"'));
    expect(html).toContain("--interpretation-ink: #39342e");
    expect(html).toContain("--interpretation-paper: #eee8dc");
    expect(html).not.toContain("--blue:");
  });

  test("keeps opening punctuation with the following token across explicit line breaks", () => {
    const spec = validateSpec({
      ...validSpec,
      original: "曰：“道。”\n“德”。",
      passages: [{ tokens: [
        { text: "曰", note: "说", tone: "word" },
        { text: "：", punctuation: true },
        { text: "“", punctuation: true },
        { text: "道", note: "道路与规律", tone: "word" },
        { text: "。", punctuation: true },
        { text: "”", punctuation: true },
        { text: "\n", punctuation: true },
        { text: "“", punctuation: true },
        { text: "德", note: "所得与品格", tone: "word" },
        { text: "”", punctuation: true },
        { text: "。", punctuation: true },
      ] }],
    });
    const html = renderHtml(spec, 1080);
    expect(html).toContain(
      '<span class="classic-run"><span class="punctuation" data-token="punctuation">“</span><span class="classic-text">道</span>',
    );
    const lineBreak = html.indexOf('<br class="punctuation-break" data-token="punctuation">');
    const firstClosingQuote = html.indexOf('<span class="punctuation" data-token="punctuation">”</span>');
    const secondOpeningQuote = html.indexOf(
      '<span class="punctuation" data-token="punctuation">“</span><span class="classic-text">德</span>',
    );
    expect(firstClosingQuote).toBeLessThan(lineBreak);
    expect(lineBreak).toBeLessThan(secondOpeningQuote);
  });

  test("never reorders punctuation that appears before a line break", () => {
    const spec = validateSpec({
      ...validSpec,
      original: "曰“\n善",
      passages: [{ tokens: [
        { text: "曰", note: "说", tone: "word" },
        { text: "“", punctuation: true },
        { text: "\n", punctuation: true },
        { text: "善", note: "好", tone: "word" },
      ] }],
    });
    const html = renderHtml(spec, 1080);
    const openingQuote = html.indexOf('<span class="punctuation" data-token="punctuation">“</span>');
    const lineBreak = html.indexOf('<br class="punctuation-break" data-token="punctuation">');
    const followingToken = html.indexOf('<span class="classic-text">善</span>');
    expect(openingQuote).toBeLessThan(lineBreak);
    expect(lineBreak).toBeLessThan(followingToken);
  });

  test("keeps computed typography inside the layout grammar ranges", async () => {
    const spec = validateSpec({
      ...validSpec,
      source: "維基文庫固定修订 https://zh.wikisource.org/w/index.php?title=%E9%81%93%E5%BE%B7%E7%B6%93&oldid=2354026",
      passages: [{
        tokens: [
          { text: "致虚极", note: "尽力使内心虚静", tone: "word", pinyin: "zhì xū jí" },
          { text: "，", punctuation: true },
          { text: "守静笃", note: "彻底守住清静", tone: "clause" },
          { text: "。", punctuation: true },
        ],
      }],
    });
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 1080, height: 900 } });
      await page.setContent(renderHtml(spec, 1080));
      const sizes = await page.evaluate(() => {
        const px = (selector: string) => Number.parseFloat(getComputedStyle(document.querySelector(selector)!).fontSize);
        return {
          book: px(".book"),
          original: px(".classic-text"),
          pinyin: px(".pinyin"),
          annotation: px(".annotation"),
          source: px(".source"),
          scrollWidth: document.documentElement.scrollWidth,
        };
      });
      expect(sizes.book).toBeGreaterThanOrEqual(54);
      expect(sizes.book).toBeLessThanOrEqual(68);
      expect(sizes.original).toBeGreaterThanOrEqual(42);
      expect(sizes.original).toBeLessThanOrEqual(52);
      expect(sizes.pinyin).toBeGreaterThanOrEqual(18);
      expect(sizes.pinyin).toBeLessThanOrEqual(22);
      expect(sizes.annotation).toBeGreaterThanOrEqual(22);
      expect(sizes.annotation).toBeLessThanOrEqual(28);
      expect(sizes.source).toBeGreaterThanOrEqual(18);
      expect(sizes.source).toBeLessThanOrEqual(22);
      expect(sizes.scrollWidth).toBe(1080);
    } finally {
      await browser.close();
    }
  });

  test("renders an explicit newline as a real visual line break", async () => {
    const spec = validateSpec({
      ...validSpec,
      original: "致虚极。\n守静笃。",
      passages: [{ tokens: [
          { text: "致虚极", note: "尽力使内心虚静", tone: "word" },
          { text: "。", punctuation: true },
          { text: "\n", punctuation: true },
          { text: "守静笃", note: "彻底守住清静", tone: "clause" },
          { text: "。", punctuation: true },
      ] }],
    });
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 1080, height: 900 } });
      await page.setContent(renderHtml(spec, 1080));
      const layout = await page.evaluate(() => ({
        tops: Array.from(document.querySelectorAll<HTMLElement>(".token-unit"))
          .map(element => element.getBoundingClientRect().top),
        tokenCount: document.querySelectorAll("[data-token]").length,
      }));
      expect(layout.tops[1]).toBeGreaterThan(layout.tops[0]);
      expect(layout.tokenCount).toBe(5);
    } finally {
      await browser.close();
    }
  });
});

describe("readHeroDataUri", () => {
  test("rejects a missing local hero file", async () => {
    await expect(readHeroDataUri("/tmp/ljg-classic-missing-hero.png"))
      .rejects.toThrow("heroImage not found");
  });
});

describe("QA slice lifecycle", () => {
  test("removes only renderer-owned slices before a rerender", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "ljg-classic-slices-"));
    try {
      await Promise.all([
        Bun.write(resolve(directory, "01--y-0.png"), "old head"),
        Bun.write(resolve(directory, "09--y-9999.png"), "stale tail"),
        Bun.write(resolve(directory, "visual-note.png"), "keep"),
        Bun.write(resolve(directory, "README.md"), "keep"),
      ]);
      await clearGeneratedSlices(directory);
      expect(await Bun.file(resolve(directory, "01--y-0.png")).exists()).toBe(false);
      expect(await Bun.file(resolve(directory, "09--y-9999.png")).exists()).toBe(false);
      expect(await Bun.file(resolve(directory, "visual-note.png")).exists()).toBe(true);
      expect(await Bun.file(resolve(directory, "README.md")).exists()).toBe(true);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

const TEST_CRC32_TABLE = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) === 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});

function testCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = TEST_CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Buffer {
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  chunk.write(type, 4, 4, "ascii");
  Buffer.from(data).copy(chunk, 8);
  chunk.writeUInt32BE(testCrc32(chunk.subarray(4, 8 + data.length)), 8 + data.length);
  return chunk;
}

function testPng(width: number, height: number): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 0;
  const raw = Buffer.alloc((width + 1) * height);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

describe("readPngDimensions", () => {
  test("accepts a complete PNG and rejects a truncated header impostor", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "ljg-classic-png-"));
    const valid = resolve(directory, "valid.png");
    const truncated = resolve(directory, "truncated.png");
    try {
      await Bun.write(valid, testPng(1080, 1200));
      const fakeHeader = new Uint8Array(24);
      fakeHeader.set([137, 80, 78, 71, 13, 10, 26, 10]);
      new DataView(fakeHeader.buffer).setUint32(16, 1080);
      new DataView(fakeHeader.buffer).setUint32(20, 1200);
      await Bun.write(truncated, fakeHeader);
      expect(await readPngDimensions(valid)).toEqual({ width: 1080, height: 1200 });
      await expect(readPngDimensions(truncated)).rejects.toThrow("is not a valid PNG");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

async function createArtifactFixture(options: { gap?: boolean } = {}) {
  const directory = await mkdtemp(resolve(tmpdir(), "ljg-classic-artifacts-"));
  const assets = resolve(directory, "assets");
  const slicesDirectory = resolve(directory, "qa-slices");
  await Promise.all([mkdir(assets, { recursive: true }), mkdir(slicesDirectory, { recursive: true })]);
  const input = resolve(directory, "classic.json");
  const html = resolve(directory, "classic.html");
  const png = resolve(directory, "classic.png");
  const manifestPath = resolve(directory, "classic.manifest.json");
  const hero = resolve(assets, "hero.png");
  const spec = validateSpec({
    ...validSpec,
    heroImage: "assets/hero.png",
    heroAlt: "山谷中一圈涟漪正在平复",
  });
  await Bun.write(input, `${JSON.stringify(spec, null, 2)}\n`);
  await Bun.write(hero, testPng(900, 600));
  await Bun.write(html, renderHtml(spec, 1080, await readHeroDataUri(hero)));
  await Bun.write(png, testPng(1080, 1200));

  const sliceOne = resolve(slicesDirectory, "01--y-0.png");
  const secondY = options.gap ? 700 : 600;
  const sliceTwo = resolve(slicesDirectory, `02--y-${secondY}.png`);
  await Bun.write(sliceOne, testPng(1080, options.gap ? 600 : 700));
  await Bun.write(sliceTwo, testPng(1080, 1200 - secondY));
  const sliceDetails = [
    { index: 1, path: sliceOne, y: 0, width: 1080, height: options.gap ? 600 : 700, sha256: await sha256File(sliceOne) },
    { index: 2, path: sliceTwo, y: secondY, width: 1080, height: 1200 - secondY, sha256: await sha256File(sliceTwo) },
  ];
  const manifest = {
    schemaVersion: 2,
    renderedAt: new Date().toISOString(),
    book: spec.book,
    chapter: spec.chapter,
    heroPresent: true,
    heroVisible: true,
    heroImagePath: hero,
    source: spec.source ?? null,
    inputPath: input,
    htmlPath: html,
    pngPath: png,
    manifestPath,
    width: 1080,
    height: 1200,
    original: spec.original,
    originalChars: Array.from(spec.original).length,
    passageCount: spec.passages.length,
    tokenCount: 4,
    punctuationCount: 2,
    annotationCount: 2,
    annotationCoverage: 1,
    toneCounts: { word: 1, clause: 1, variant: 0 },
    interpretationParagraphs: spec.interpretation.length,
    interpretationChars: Array.from(spec.interpretation.join("")).length,
    dom: {
      documentHeight: 1200,
      scrollWidth: 1080,
      tokenCount: 4,
      annotationCount: 2,
      interpretationParagraphs: 1,
      overflowCount: 0,
      clippedCount: 0,
      emptyTextCount: 0,
      titleVisible: true,
      chapterVisible: true,
      heroVisible: true,
      interpretationVisible: true,
      originalMatches: true,
      fontSizes: { book: 58, original: 46, pinyin: 20, annotation: 24, source: 20 },
    },
    qaSlices: [sliceOne, sliceTwo],
    qaSliceDetails: sliceDetails,
    sha256: {
      input: await sha256File(input),
      html: await sha256File(html),
      png: await sha256File(png),
      hero: await sha256File(hero),
    },
  };
  await Bun.write(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { directory, input, html, png, manifestPath, manifest, slicesDirectory };
}

describe("validateClassicArtifacts", () => {
  test("accepts a complete schema v2 artifact set", async () => {
    const fixture = await createArtifactFixture();
    try {
      const result = await validateClassicArtifacts({
        input: fixture.input,
        png: fixture.png,
        manifest: fixture.manifestPath,
      });
      expect(result.status).toBe("valid");
      expect(result.qaSlices).toBe(2);
    } finally {
      await rm(fixture.directory, { recursive: true, force: true });
    }
  });

  test("rejects schema, path, PNG dimension, HTML hash, and hero hash drift", async () => {
    const fixture = await createArtifactFixture();
    try {
      const broken = structuredClone(fixture.manifest) as any;
      broken.schemaVersion = 1;
      broken.inputPath = resolve(fixture.directory, "wrong.json");
      broken.height = 1199;
      broken.dom.fontSizes.book = 40;
      broken.sha256.html = "0".repeat(64);
      broken.sha256.hero = "f".repeat(64);
      await Bun.write(fixture.manifestPath, `${JSON.stringify(broken, null, 2)}\n`);
      await expect(validateClassicArtifacts({
        input: fixture.input,
        png: fixture.png,
        manifest: fixture.manifestPath,
      })).rejects.toThrow("manifest schemaVersion must be 2");
      await expect(validateClassicArtifacts({
        input: fixture.input,
        png: fixture.png,
        manifest: fixture.manifestPath,
      })).rejects.toThrow("inputPath mismatch");
      await expect(validateClassicArtifacts({
        input: fixture.input,
        png: fixture.png,
        manifest: fixture.manifestPath,
      })).rejects.toThrow("PNG dimension mismatch");
      await expect(validateClassicArtifacts({
        input: fixture.input,
        png: fixture.png,
        manifest: fixture.manifestPath,
      })).rejects.toThrow("computed book font size must be 54-68px");
      await expect(validateClassicArtifacts({
        input: fixture.input,
        png: fixture.png,
        manifest: fixture.manifestPath,
      })).rejects.toThrow("HTML hash mismatch");
      await expect(validateClassicArtifacts({
        input: fixture.input,
        png: fixture.png,
        manifest: fixture.manifestPath,
      })).rejects.toThrow("hero hash mismatch");
    } finally {
      await rm(fixture.directory, { recursive: true, force: true });
    }
  });

  test("rejects a QA slice coverage gap", async () => {
    const fixture = await createArtifactFixture({ gap: true });
    try {
      await expect(validateClassicArtifacts({
        input: fixture.input,
        png: fixture.png,
        manifest: fixture.manifestPath,
      })).rejects.toThrow("QA slice coverage gap before y=700");
    } finally {
      await rm(fixture.directory, { recursive: true, force: true });
    }
  });

  test("rejects stale slices and per-slice hash drift", async () => {
    const fixture = await createArtifactFixture();
    try {
      await Bun.write(resolve(fixture.slicesDirectory, "09--y-9999.png"), testPng(1080, 1));
      const broken = structuredClone(fixture.manifest) as any;
      broken.qaSliceDetails[0].sha256 = "0".repeat(64);
      await Bun.write(fixture.manifestPath, `${JSON.stringify(broken, null, 2)}\n`);
      await expect(validateClassicArtifacts({
        input: fixture.input,
        png: fixture.png,
        manifest: fixture.manifestPath,
      })).rejects.toThrow("QA slice hash mismatch");
      await expect(validateClassicArtifacts({
        input: fixture.input,
        png: fixture.png,
        manifest: fixture.manifestPath,
      })).rejects.toThrow("stale/unlisted QA slices");
    } finally {
      await rm(fixture.directory, { recursive: true, force: true });
    }
  });
});
