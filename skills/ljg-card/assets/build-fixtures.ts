import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = join(import.meta.dir, "..");
const output = resolve(process.env.LJG_CARD_FIXTURE_DIR ?? "/tmp/ljg-card-v7-fixtures");
const logoPath = join(import.meta.dir, "logo.png");
const logo = pathToFileURL(logoPath).href;
const fixtureImagePath = process.env.LJG_CARD_FIXTURE_IMAGE;
const fixtureImage = pathToFileURL(resolve(fixtureImagePath ?? logoPath)).href;
const fixtureImageAlt = fixtureImagePath
  ? "人物面对一组工作任务，单线场景用于验证长图叙事锚点"
  : "黑色圆形品牌图像，仅用于验证本地位图槽成功加载";

await mkdir(output, { recursive: true });

function fill(template: string, values: Record<string, string>): string {
  let rendered = template;
  for (const [key, value] of Object.entries(values)) {
    rendered = rendered.replaceAll(`{{${key}}}`, value);
  }
  const leftovers = rendered.match(/\{\{[A-Z_]+\}\}/g) ?? [];
  if (leftovers.length > 0) throw new Error(`Unreplaced placeholders: ${leftovers.join(", ")}`);
  return rendered;
}

function sha256(bytes: Uint8Array): string {
  return new Bun.CryptoHasher("sha256").update(bytes).digest("hex");
}

async function run(command: string[]): Promise<void> {
  const process = Bun.spawn(command, {
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  if (stdout.trim()) console.log(stdout.trim());
  if (exitCode !== 0) {
    throw new Error(`${command.join(" ")} failed (${exitCode}): ${stderr.trim()}`);
  }
}

async function readPngWidth(path: string): Promise<number> {
  const bytes = new Uint8Array(await Bun.file(path).arrayBuffer());
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 24 || signature.some((byte, index) => bytes[index] !== byte)) {
    throw new Error(`Invalid PNG: ${path}`);
  }
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(16);
}

function contrastRatio(foreground: string, background: string): number {
  const channels = (value: string): number[] => {
    const matches = value.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [];
    if (matches.length !== 3) throw new Error(`Unsupported color for contrast check: ${value}`);
    return matches;
  };
  const luminance = (value: string): number => {
    const linear = channels(value).map(channel => {
      const normalized = channel / 255;
      return normalized <= 0.03928
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

async function inspectBodyFonts(path: string): Promise<{
  computed_stack: string;
  title_computed_stack: string;
  headline_computed_stack: string;
  platform_fonts: Array<{ familyName: string; postScriptName: string; glyphCount: number }>;
  title_platform_fonts: Array<{ familyName: string; postScriptName: string; glyphCount: number }>;
  headline_platform_fonts: Array<{ familyName: string; postScriptName: string; glyphCount: number }>;
  remote_resources: string[];
  visual_metrics: {
    canvas_background: string;
    card_background: string;
    text_color: string;
    font_size_px: number;
    line_height_px: number;
    line_height_ratio: number;
    document_width_px: number;
    contrast_ratio: number;
  };
}> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(path).href, { waitUntil: "load" });
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });
    const selector = ".full-document > p:not(.opening):not(.full-key)";
    const computed = await page.$eval(selector, element => {
      const style = getComputedStyle(element);
      const fontSize = Number.parseFloat(style.fontSize);
      const lineHeight = Number.parseFloat(style.lineHeight);
      const card = document.querySelector<HTMLElement>(".full-card");
      const documentRoot = document.querySelector<HTMLElement>(".full-document");
      return {
        stack: style.fontFamily,
        canvasBackground: getComputedStyle(document.documentElement).backgroundColor,
        cardBackground: card ? getComputedStyle(card).backgroundColor : "",
        textColor: style.color,
        fontSize,
        lineHeight,
        lineHeightRatio: lineHeight / fontSize,
        documentWidth: documentRoot?.getBoundingClientRect().width ?? 0,
      };
    });
    const remoteResources = await page.evaluate(() =>
      performance.getEntriesByType("resource")
        .map(entry => entry.name)
        .filter(name => /^https?:/i.test(name)),
    );
    const titleComputedStack = await page.$eval(".full-document h1", element => getComputedStyle(element).fontFamily);
    const headlineComputedStack = await page.$eval(".full-document h2", element => getComputedStyle(element).fontFamily);
    const session = await page.context().newCDPSession(page);
    await session.send("DOM.enable");
    await session.send("CSS.enable");
    const documentNode = await session.send("DOM.getDocument") as { root: { nodeId: number } };
    const platformFonts = async (surfaceSelector: string) => {
      const node = await session.send("DOM.querySelector", {
        nodeId: documentNode.root.nodeId,
        selector: surfaceSelector,
      }) as { nodeId: number };
      const result = await session.send("CSS.getPlatformFontsForNode", {
        nodeId: node.nodeId,
      }) as { fonts: Array<{ familyName: string; postScriptName: string; glyphCount: number }> };
      return result.fonts;
    };
    return {
      computed_stack: computed.stack,
      title_computed_stack: titleComputedStack,
      headline_computed_stack: headlineComputedStack,
      platform_fonts: await platformFonts(selector),
      title_platform_fonts: await platformFonts(".full-document h1"),
      headline_platform_fonts: await platformFonts(".full-document h2"),
      remote_resources: remoteResources,
      visual_metrics: {
        canvas_background: computed.canvasBackground,
        card_background: computed.cardBackground,
        text_color: computed.textColor,
        font_size_px: computed.fontSize,
        line_height_px: computed.lineHeight,
        line_height_ratio: computed.lineHeightRatio,
        document_width_px: computed.documentWidth,
        contrast_ratio: contrastRatio(computed.textColor, computed.cardBackground),
      },
    };
  } finally {
    await browser.close();
  }
}

const common = {
  IMAGE_STATE: "ready",
  IMAGE_SRC: logo,
  IMAGE_ALT: "黑色圆形品牌图像，仅用于验证本地位图槽成功加载",
  LOGO: logo,
  SOURCE_LINE: '<span class="info-source">结构验收样例</span>',
};

const fullBlocks = [
  { id: "b001", text: "当内容不动，设计才真正开始" },
  { id: "b002", text: "原文中的“一个字”与 A & B 都不能被改写。" },
  { id: "b003", text: "排版负责什么" },
  { id: "b004", text: "强调可以改变看见的顺序，不能改变原稿的顺序。" },
  { id: "b005", text: "标题建立层级。" },
  { id: "b006", text: "正文保持呼吸。" },
  { id: "b007", text: "作者的句子只出现一次。" },
  { id: "b008", text: "结构样例" },
  { id: "b009", text: "行内代码 const answer 仍属于原文。" },
  { id: "b010", text: "const answer = 42;" },
  { id: "b011", text: "表一　设计与边界" },
  { id: "b012", text: "动作" },
  { id: "b013", text: "边界" },
  { id: "b014", text: "排版" },
  { id: "b015", text: "只改呈现" },
  { id: "b016", text: "原稿图片保真进入，不承担新解释。" },
  { id: "b017", text: "注：脚注降级显示，但仍完整可读。" },
];

const fullDocumentHtml = [
  '<h1 data-source-block="b001">当内容不动，设计才真正开始</h1>',
  '<p class="opening" data-source-block="b002">原文中的“<strong>一个字</strong>”与 A &amp; B 都不能被改写。</p>',
  '<h2 data-source-block="b003">排版负责什么</h2>',
  '<p class="full-key" data-source-block="b004">强调可以改变看见的顺序，不能改变原稿的顺序。</p>',
  '<ul><li data-source-block="b005">标题建立层级。</li><li data-source-block="b006">正文保持呼吸。</li></ul>',
  '<blockquote><p data-source-block="b007">作者的句子只出现一次。</p></blockquote>',
  '<h3 data-source-block="b008">结构样例</h3>',
  '<p data-source-block="b009">行内代码 <code>const answer</code> 仍属于原文。</p>',
  '<pre data-source-block="b010"><code>const answer = 42;</code></pre>',
  '<table><caption data-source-block="b011">表一　设计与边界</caption><thead><tr><th data-source-block="b012">动作</th><th data-source-block="b013">边界</th></tr></thead><tbody><tr><td data-source-block="b014">排版</td><td data-source-block="b015">只改呈现</td></tr></tbody></table>',
  `<figure class="source-figure"><img src="${fixtureImage}" alt="来源图片，用于验证全文模式的本地 source 资产"><figcaption data-source-block="b016">原稿图片保真进入，不承担新解释。</figcaption></figure>`,
  '<hr class="section-break" aria-hidden="true">',
  '<section class="footnotes"><p class="footnote" data-source-block="b017">注：脚注降级显示，但仍完整可读。</p></section>',
].join("");

const sourceSnapshot = `${fullBlocks.map(block => block.text).join("\n\n")}\n`;
const sourcePath = join(output, "full-source.txt");
const ledgerPath = join(output, "full-source-ledger.json");
await Bun.write(sourcePath, sourceSnapshot);
await Bun.write(
  ledgerPath,
  `${JSON.stringify({
    version: 1,
    source_sha256: sha256(new TextEncoder().encode(sourceSnapshot)),
    blocks: fullBlocks,
  }, null, 2)}\n`,
);

const fixtures: Record<string, Record<string, string>> = {
  long: {
    ...common,
    IMAGE_SRC: fixtureImage,
    IMAGE_ALT: fixtureImageAlt,
    BG_COLOR: "#FAF6EC",
    ACCENT_COLOR: "#B6533F",
    TITLE_BLOCK: '<div class="title-area"><div class="eyebrow">论文解读 · 决策边界</div><h1>AI 不只是在省时间</h1><p class="deck">真正的生产率问题，是控制权如何在工作流里移动。</p></div>',
    BODY_HTML: '<p class="dropcap">当一个人面对同一组任务：先全部手做，再让工具接管重复步骤。场景只画动作变化，结论仍由文字说准。</p><p class="highlight">关键变化不是“更快”，而是人的注意力从执行移向判断。</p><section class="narrative-beat"><span class="beat-index">01</span><div><h2>压力出现</h2><p>任务数量没有减少，重复操作先挤占了用于判断的时间。</p></div></section><section class="narrative-beat"><span class="beat-index">02</span><div><h2>控制权移动</h2><p>工具接走可描述的步骤，人保留目标、例外与验收。</p></div></section><div class="metric-row"><div class="metric"><strong>1 个</strong><span>稳定人物贯穿前后变化</span></div><div class="metric"><strong>2 拍</strong><span>足够表达一条因果链</span></div></div><div class="evidence-boundary"><strong>证据边界</strong><p>效率数字可以说明局部任务表现，不能自动推出组织总产出或长期福利。</p></div><div class="prompt"><strong>阅读问题：</strong>工具替你做了什么，又把哪一种判断还给了你？</div><div class="closing-judgment">把 AI 放进工作流时，先画清控制权，再讨论速度。</div>',
  },
  full: {
    ...common,
    CUSTOM_CSS: "",
    DOCUMENT_HTML: fullDocumentHtml,
  },
  comic: {
    ...common,
    CUSTOM_CSS: '.fixture { margin: 24px 60px 42px; padding: 32px; border: 4px solid var(--ink); } .fixture h1 { font: 900 68px/1 var(--serif); } .fixture p { margin-top: 18px; font: 400 28px/1.5 var(--sans); }',
    CONTENT_HTML: '<main class="fixture"><h1>动作进入分格</h1><p>对白、旁白和格线仍由排版层承担。</p></main>',
  },
  whiteboard: {
    ...common,
    CUSTOM_CSS: '.fixture { position: relative; z-index: 1; padding: 34px 56px 54px; } .fixture h1 { font: 700 72px/1.05 var(--marker); } .fixture p { margin-top: 20px; font: 400 30px/1.55 var(--sans); }',
    CONTENT_HTML: '<main class="fixture"><h1>图像不替代逻辑</h1><p>节点、关系词和箭头仍由结构层精确表达。</p><div class="connector"></div></main>',
  },
};

for (const [name, values] of Object.entries(fixtures)) {
  const template = await Bun.file(join(root, "assets", `${name}_template.html`)).text();
  const path = join(output, `${name}.html`);
  await Bun.write(path, fill(template, values));
  console.log(path);
}

const fullTemplate = await Bun.file(join(root, "assets", "full_template.html")).text();
const missingPreferredTemplate = fullTemplate.replaceAll(
  "'KingHwa_OldSong'",
  "'DefinitelyMissingKingHwaOldSong'",
);
if (missingPreferredTemplate === fullTemplate) {
  throw new Error("Full template does not expose the KingHwa_OldSong preferred-font slot");
}
const fallbackHtmlPath = join(output, "full-fallback.html");
await Bun.write(fallbackHtmlPath, fill(missingPreferredTemplate, fixtures.full));
console.log(fallbackHtmlPath);

const longTemplate = await Bun.file(join(root, "assets", "long_template.html")).text();
const longBase = fixtures.long;

for (const [name, imageValues] of Object.entries({
  "long-empty": { IMAGE_STATE: "empty", IMAGE_SRC: "", IMAGE_ALT: "" },
  "long-broken": {
    IMAGE_STATE: "ready",
    IMAGE_SRC: pathToFileURL(join(output, "does-not-exist.png")).href,
    IMAGE_ALT: "用于验证损坏图片会被截图门禁拒绝",
  },
})) {
  const path = join(output, `${name}.html`);
  await Bun.write(path, fill(longTemplate, { ...longBase, ...imageValues }));
  console.log(path);
}

await run([
  "bun",
  join(root, "assets", "verify-full-text.ts"),
  ledgerPath,
  join(output, "full.html"),
  sourcePath,
]);

const preferredFontReport = await inspectBodyFonts(join(output, "full.html"));
const fallbackFontReport = await inspectBodyFonts(fallbackHtmlPath);
if (preferredFontReport.platform_fonts.length === 0) {
  throw new Error("Preferred full-text body resolved to no platform font");
}
if (preferredFontReport.title_platform_fonts.length === 0 || preferredFontReport.headline_platform_fonts.length === 0) {
  throw new Error("Preferred full-text title or headline resolved to no platform font");
}
if (fallbackFontReport.platform_fonts.length === 0) {
  throw new Error("Missing-preferred-font simulation resolved to no fallback platform font");
}
if (fallbackFontReport.title_platform_fonts.length === 0 || fallbackFontReport.headline_platform_fonts.length === 0) {
  throw new Error("Missing-preferred-font simulation resolved title or headline to no fallback font");
}
if (preferredFontReport.remote_resources.length > 0 || fallbackFontReport.remote_resources.length > 0) {
  throw new Error("Full-text font path loaded a remote resource");
}
const preferredSurfaces = [
  preferredFontReport.platform_fonts,
  preferredFontReport.title_platform_fonts,
  preferredFontReport.headline_platform_fonts,
];
if (preferredSurfaces.some(fonts => !fonts.some(font => font.familyName === "KingHwa_OldSong"))) {
  throw new Error("Installed KingHwa_OldSong did not unify body, title, and headline");
}
const fallbackSurfaces = [
  fallbackFontReport.platform_fonts,
  fallbackFontReport.title_platform_fonts,
  fallbackFontReport.headline_platform_fonts,
];
if (fallbackSurfaces.some(fonts => fonts.some(font => font.familyName === "KingHwa_OldSong"))) {
  throw new Error("Missing-preferred-font simulation did not fall through the local stack");
}
if (!fallbackFontReport.platform_fonts.some(font => font.familyName === "Songti SC")) {
  throw new Error("Missing-preferred-font body did not resolve to Songti SC on this machine");
}
if (!fallbackFontReport.title_platform_fonts.some(font => font.familyName === "PingFang SC") ||
    !fallbackFontReport.headline_platform_fonts.some(font => font.familyName === "PingFang SC")) {
  throw new Error("Missing-preferred-font title or headline did not resolve to PingFang SC on this machine");
}
for (const report of [preferredFontReport, fallbackFontReport]) {
  const metrics = report.visual_metrics;
  if (metrics.canvas_background !== "rgb(255, 255, 255)" || metrics.card_background !== "rgb(255, 255, 255)") {
    throw new Error("Full-text reading surface is not pure white");
  }
  if (metrics.text_color !== "rgb(23, 23, 23)") {
    throw new Error("Full-text body is not deep neutral black");
  }
  if (metrics.font_size_px < 32 || metrics.line_height_ratio < 1.9) {
    throw new Error("Full-text body size or line-height fell below the reading threshold");
  }
  if (metrics.document_width_px < 890 || metrics.document_width_px > 900) {
    throw new Error("Full-text measure escaped the 890–900px reading range");
  }
  if (metrics.contrast_ratio < 15) {
    throw new Error("Full-text body contrast fell below 15:1");
  }
}
console.log(JSON.stringify({
  "font-readback": "pass",
  "readability-readback": "pass",
  preferred: preferredFontReport,
  missing_preferred_fallback: fallbackFontReport,
}, null, 2));

for (const name of Object.keys(fixtures)) {
  const pngPath = join(output, `${name}.png`);
  await run([
    "bun",
    join(root, "assets", "capture.ts"),
    join(output, `${name}.html`),
    pngPath,
    "1080",
    "1600",
    "fullpage",
  ]);
  const width = await readPngWidth(pngPath);
  if (width !== 1080) throw new Error(`Fixture width mismatch for ${name}: ${width}`);
  console.log(`fixture-readback: ${name} width=${width}`);
}
