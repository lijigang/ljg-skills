import { mkdir, unlink } from "node:fs/promises";
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

async function runExpectFailure(command: string[], expectedText: string): Promise<void> {
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
  const combined = `${stdout}\n${stderr}`;
  if (exitCode === 0) throw new Error(`${command.join(" ")} unexpectedly passed`);
  if (!combined.includes(expectedText)) {
    throw new Error(`${command.join(" ")} failed without expected text ${JSON.stringify(expectedText)}: ${combined.trim()}`);
  }
  console.log(`expected-failure: ${expectedText}`);
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

async function inspectWhiteboardFonts(path: string): Promise<{
  title: Array<{ familyName: string; postScriptName: string; glyphCount: number }>;
  relation: Array<{ familyName: string; postScriptName: string; glyphCount: number }>;
  body: Array<{ familyName: string; postScriptName: string; glyphCount: number }>;
  remote_resources: string[];
}> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(path).href, { waitUntil: "load" });
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });
    const session = await page.context().newCDPSession(page);
    await session.send("DOM.enable");
    await session.send("CSS.enable");
    const documentNode = await session.send("DOM.getDocument") as { root: { nodeId: number } };
    const platformFonts = async (selector: string) => {
      const node = await session.send("DOM.querySelector", {
        nodeId: documentNode.root.nodeId,
        selector,
      }) as { nodeId: number };
      const result = await session.send("CSS.getPlatformFontsForNode", {
        nodeId: node.nodeId,
      }) as { fonts: Array<{ familyName: string; postScriptName: string; glyphCount: number }> };
      return result.fonts;
    };
    return {
      title: await platformFonts(".whiteboard-title"),
      relation: await platformFonts(".transition-sentence"),
      body: await platformFonts(".step-support"),
      remote_resources: await page.evaluate(() =>
        performance.getEntriesByType("resource")
          .map(entry => entry.name)
          .filter(name => /^https?:/i.test(name)),
      ),
    };
  } finally {
    await browser.close();
  }
}

const common = {
  IMAGE_STATE: "ready",
  IMAGE_SRC: logo,
  IMAGE_ALT: "黑色圆形品牌图像，仅用于验证本地位图槽成功加载",
  IMAGE_CLAIM: "claim-anchor",
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

type FixtureRole = "question" | "premise" | "evidence" | "tension" | "inference" | "turn" | "synthesis" | "conclusion" | "boundary";
type FixturePresentation = "text" | "typography" | "image" | "chain" | "branch" | "timeline" | "matrix" | "radial";

interface FixtureStep {
  id: string;
  role: FixtureRole;
  source_refs: string[];
  claim: string;
  support: string;
  residue: string;
  must_render: true;
  presentation: FixturePresentation;
}

interface FixtureRelation {
  id: string;
  from: string;
  to: string;
  kind: "continue" | "deepen" | "contrast" | "question" | "branch" | "return" | "boundary";
  visibility: "implicit" | "visible";
  bridge: string;
}

const roleLabels: Record<FixtureRole, string> = {
  question: "问题",
  premise: "前提",
  evidence: "证据",
  tension: "矛盾",
  inference: "推论",
  turn: "转折",
  synthesis: "汇合",
  conclusion: "结论",
  boundary: "边界",
};

const whiteboardParagraphs = [
  "经验留下了大量轨迹，但模型能力没有随任务结束而改变。",
  "上下文只能暂存经验，不能保证下一次任务继续调用。",
  "不同记忆层的写入深度、更新频率与调用成本彼此牵制。",
  "单一路线无法同时优化稳定保留与快速更新，论证因此分叉。",
  "世界模型路线从完整轨迹中学习环境怎样变化。",
  "LoRA 与策略路线选择高价值轨迹并写入隔离能力。",
  "两条路线最终回到同一组写入深度与调用成本权衡。",
  "持续学习依赖经验进入下一轮仍可调用的载体。",
  "遗忘、在线更新与新旧能力干扰仍是开放问题。",
];
const whiteboardSource = `${whiteboardParagraphs.join("\n\n")}\n`;
const whiteboardSourceHash = sha256(new TextEncoder().encode(whiteboardSource));
const whiteboardSourcePath = join(output, "whiteboard-source.txt");
const whiteboardSourceInventoryPath = join(output, "whiteboard-source-inventory.json");
await Bun.write(whiteboardSourcePath, whiteboardSource);
await run([
  "bun",
  join(root, "assets", "prepare-whiteboard-source.ts"),
  whiteboardSourcePath,
  whiteboardSourceInventoryPath,
]);

const logicStep = (step: FixtureStep, depth: string): string => [
  `<article class="logic-step" data-step-id="${step.id}" data-role="${step.role}" data-source-refs="${step.source_refs.join(" ")}">`,
  `<div class="step-marker" aria-hidden="true"><span class="step-depth">${depth}</span><span class="step-dot"></span></div>`,
  `<div class="step-panel${step.role === "boundary" ? " whiteboard-boundary" : ""}">`,
  `<span class="step-role">${roleLabels[step.role]}</span>`,
  `<h2 class="step-claim">${step.claim}</h2>`,
  `<p class="step-support">${step.support}</p>`,
  `<p class="step-residue">${step.residue}</p>`,
  "</div></article>",
].join("");

const logicRelation = (relation: FixtureRelation): string => relation.visibility === "implicit"
  ? `<div class="logic-relation" data-relation-id="${relation.id}" data-from="${relation.from}" data-to="${relation.to}" data-kind="${relation.kind}" data-visibility="implicit" aria-hidden="true"></div>`
  : [
    `<div class="logic-relation" data-relation-id="${relation.id}" data-from="${relation.from}" data-to="${relation.to}" data-kind="${relation.kind}" data-visibility="visible" aria-label="${relation.bridge}">`,
    '<span class="relation-rail" aria-hidden="true"><span class="relation-stem"></span><span class="relation-arrowhead"></span></span>',
    `<div class="transition-copy"><p class="transition-sentence">${relation.bridge}</p></div>`,
    "</div>",
  ].join("");

const sourceSectionsFor = (steps: FixtureStep[]) => whiteboardParagraphs.map((_, index) => {
  const id = `src-${String(index + 1).padStart(2, "0")}`;
  const stepIds = steps.filter(step => step.source_refs.includes(id)).map(step => step.id);
  return stepIds.length > 0
    ? { id, disposition: "rendered" as const, step_ids: stepIds }
    : { id, disposition: "omitted" as const, omission_reason: "局部结构 fixture 只验证前五段的主干呈现。" };
});

const logicLedger = (steps: FixtureStep[], relations: FixtureRelation[]): string => JSON.stringify({
  version: 2,
  source_sha256: whiteboardSourceHash,
  source_sections: sourceSectionsFor(steps),
  steps,
  relations,
}).replaceAll("<", "\\u003c");

const whiteboardShell = (title: string, question: string, orientation: string, spine: string): string => [
  '<main class="whiteboard-content">',
  '<header class="whiteboard-header"><span class="whiteboard-kicker">LOGIC DIVE</span>',
  `<h1 class="whiteboard-title">${title}</h1>`,
  `<p class="whiteboard-question">${question}</p>`,
  `<p class="whiteboard-orientation">${orientation}</p></header>`,
  '<section class="reasoning-spine"><span class="spine-rail" aria-hidden="true"><span class="spine-line"></span></span>',
  spine,
  "</section></main>",
].join("");

const matrixShape = '<section class="local-shape local-matrix" data-logic-shape="matrix"><h3 class="local-shape-title">把两条路线放回同一坐标</h3><div class="matrix-frame"><div class="matrix-axis-x"><span>调用成本：低 → 高</span><span class="axis-line"></span><span class="axis-arrowhead" aria-hidden="true"></span></div><div class="matrix-axis-y"><span>写入深度：浅 → 深</span><span class="axis-line"></span><span class="axis-arrowhead" aria-hidden="true"></span></div><div class="matrix-grid"><article class="quadrant"><h3>上下文</h3><p>写入浅，调用轻。</p></article><article class="quadrant"><h3>状态</h3><p>局部保留，可再检索。</p></article><article class="quadrant"><h3>适配器</h3><p>能力隔离，按需加载。</p></article><article class="quadrant"><h3>参数</h3><p>写入深，更新昂贵。</p></article></div></div></section>';

const compositeSteps: FixtureStep[] = [
  { id: "step-01", role: "question", source_refs: ["src-01"], claim: "经验为什么没有变成能力？", support: "Agent 完成了任务，也留下了大量轨迹。", residue: "任务结束时，模型本身仍然没有改变。", must_render: true, presentation: "typography" },
  { id: "step-02", role: "premise", source_refs: ["src-02"], claim: "短期记住，不等于长期学会", support: "上下文能暂存经验，却不能保证跨任务继续调用。", residue: "", must_render: true, presentation: "text" },
  { id: "step-03", role: "tension", source_refs: ["src-03"], claim: "写得越深，能力越稳；代价也越高", support: "上下文、状态、适配器与参数，是不同深度的记忆层。", residue: "", must_render: true, presentation: "text" },
  { id: "step-04", role: "turn", source_refs: ["src-04"], claim: "问题因此分成两条技术路线", support: "一条先学习环境怎样变化；另一条先选择哪些经验值得写入。", residue: "", must_render: true, presentation: "branch" },
  { id: "step-05", role: "inference", source_refs: ["src-05"], claim: "世界模型路线", support: "从成功、失败与无标签轨迹中学习状态转移。", residue: "可学习的经验更多了，模型与训练成本也随之上升。", must_render: true, presentation: "branch" },
  { id: "step-06", role: "inference", source_refs: ["src-06"], claim: "LoRA / 策略路线", support: "强编码 Agent 选择轨迹，把变化写入隔离的适配器。", residue: "改写范围缩小了，路由与协作负担却留了下来。", must_render: true, presentation: "branch" },
  { id: "step-07", role: "synthesis", source_refs: ["src-07"], claim: "两条路线落到同一个权衡", support: "真正共同的坐标，是更新频率、写入深度与调用成本。", residue: "", must_render: true, presentation: "matrix" },
  { id: "step-08", role: "conclusion", source_refs: ["src-08"], claim: "能力来自可持续写入，而不是更多对话", support: "经验必须进入下一轮仍可检索、路由或训练的载体。", residue: "", must_render: true, presentation: "typography" },
  { id: "step-09", role: "boundary", source_refs: ["src-09"], claim: "人类水平的持续学习仍未完成", support: "遗忘、非独立同分布的在线更新与新旧能力干扰仍是开放问题。", residue: "", must_render: true, presentation: "text" },
];

const compositeRelations: FixtureRelation[] = [
  { id: "rel-01", from: "step-01", to: "step-02", kind: "deepen", visibility: "implicit", bridge: "" },
  { id: "rel-02", from: "step-02", to: "step-03", kind: "question", visibility: "visible", bridge: "如果经验要跨任务保留，就必须先看清它能写到多深、多久更新一次。" },
  { id: "rel-03", from: "step-03", to: "step-04", kind: "branch", visibility: "visible", bridge: "单一记忆层无法同时满足快速更新与稳定保留，问题由此分成两条路线。" },
  { id: "rel-04a", from: "step-04", to: "step-05", kind: "branch", visibility: "implicit", bridge: "" },
  { id: "rel-05a", from: "step-05", to: "step-07", kind: "return", visibility: "implicit", bridge: "" },
  { id: "rel-04b", from: "step-04", to: "step-06", kind: "branch", visibility: "implicit", bridge: "" },
  { id: "rel-05b", from: "step-06", to: "step-07", kind: "return", visibility: "implicit", bridge: "" },
  { id: "rel-06", from: "step-07", to: "step-08", kind: "deepen", visibility: "implicit", bridge: "" },
  { id: "rel-07", from: "step-08", to: "step-09", kind: "boundary", visibility: "visible", bridge: "即使经验已经能够写入，遗忘与在线更新仍然限制着它能否稳定积累。" },
];

const compositeSpine = [
  logicStep(compositeSteps[0], "00"), logicRelation(compositeRelations[0]),
  logicStep(compositeSteps[1], "20"), logicRelation(compositeRelations[1]),
  logicStep(compositeSteps[2], "40"), logicRelation(compositeRelations[2]),
  logicStep(compositeSteps[3], "60"),
  '<section class="local-shape local-branch" data-logic-shape="branch" data-branch-state="converged" data-entry-step="step-04" data-return-step="step-07"><h3 class="local-shape-title">同一缺口，分出两种写入路线</h3><div class="branch-grid">',
  `<div class="branch-path" data-branch-id="world-model">${logicRelation(compositeRelations[3])}${logicStep(compositeSteps[4], "A")}${logicRelation(compositeRelations[4])}</div>`,
  `<div class="branch-path" data-branch-id="policy-lora">${logicRelation(compositeRelations[5])}${logicStep(compositeSteps[5], "B")}${logicRelation(compositeRelations[6])}</div>`,
  '</div><p class="branch-return">两条路线在下一层重新汇合：比较的不再是哪条更先进，而是谁把经验写到多深、多久更新一次、调用时付出多少成本。</p></section>',
  logicStep(compositeSteps[6], "80"), matrixShape, logicRelation(compositeRelations[7]),
  logicStep(compositeSteps[7], "100"), logicRelation(compositeRelations[8]),
  logicStep(compositeSteps[8], "120"),
].join("");

const whiteboardComposite = whiteboardShell(
  "经验，怎样变成能力？",
  "一段任务经验，怎样进入下一次任务仍然可调用的能力？",
  "沿着写入位置不断下潜，直到两条技术路线在同一组成本约束下重新汇合。",
  compositeSpine,
);

const buildLinearWhiteboard = (shape: "chain" | "timeline" | "matrix" | "radial", shapeHtml: string) => {
  const steps: FixtureStep[] = [
    { id: "step-01", role: "question", source_refs: ["src-01"], claim: "这个变化从哪里开始？", support: "先找到原文试图解释的具体局面。", residue: "现状与目标之间还隔着一个没有解释的缺口。", must_render: true, presentation: "typography" },
    { id: "step-02", role: "premise", source_refs: ["src-02"], claim: "旧办法只解决了表面", support: "局部结果出现了，承重机制仍未改变。", residue: "", must_render: true, presentation: "text" },
    { id: "step-03", role: "inference", source_refs: ["src-03"], claim: "关键机制开始可见", support: "局部结构只解释这一层，不替代整条主干。", residue: "", must_render: true, presentation: shape },
    { id: "step-04", role: "conclusion", source_refs: ["src-04"], claim: "读者能够复述推导", support: "标题与正文顺着未解压力自然向下，不需要逐层报幕。", residue: "", must_render: true, presentation: "typography" },
    { id: "step-05", role: "boundary", source_refs: ["src-05"], claim: "结构清楚不自动证明判断为真", support: "白板保存原文推理，证据强度仍服从来源。", residue: "", must_render: true, presentation: "text" },
  ];
  const relations: FixtureRelation[] = [
    { id: "rel-01", from: "step-01", to: "step-02", kind: "deepen", visibility: "implicit", bridge: "" },
    { id: "rel-02", from: "step-02", to: "step-03", kind: "question", visibility: "visible", bridge: "表面结果已经出现，真正决定它能否持续的内部机制却还没有被看见。" },
    { id: "rel-03", from: "step-03", to: "step-04", kind: "continue", visibility: "implicit", bridge: "" },
    { id: "rel-04", from: "step-04", to: "step-05", kind: "boundary", visibility: "visible", bridge: "能够复述一条推导，只能证明结构清楚，还不能替来源补足证据。" },
  ];
  const spine = [
    logicStep(steps[0], "00"), logicRelation(relations[0]),
    logicStep(steps[1], "25"), logicRelation(relations[1]),
    logicStep(steps[2], "50"), shapeHtml, logicRelation(relations[2]),
    logicStep(steps[3], "75"), logicRelation(relations[3]),
    logicStep(steps[4], "100"),
  ].join("");
  return {
    html: whiteboardShell("逻辑沿主干不断下潜", "局部结构怎样服务整篇文章的推导？", "主干保持阅读方向，局部工具只在论证改变形状时出现。", spine),
    ledger: logicLedger(steps, relations),
  };
};

const chainShape = '<section class="local-shape local-chain" data-logic-shape="chain"><h3 class="local-shape-title">节点内部的短递进</h3><p class="local-chain-item">先辨认条件</p><p class="local-chain-item">再看机制变化</p><p class="local-chain-item">最后观察结果</p></section>';
const timelineShape = '<section class="local-shape local-timeline" data-logic-shape="timeline"><h3 class="local-shape-title">同一对象的状态迁移</h3><div class="timeline-track"><article class="timeline-event"><time class="timeline-time">T0</time><div><h3>手工执行</h3><p>注意力被重复动作占满。</p></div></article><article class="timeline-event"><time class="timeline-time">T1</time><div><h3>判断前移</h3><p>工具接走步骤，人开始管理例外。</p></div></article></div></section>';
const radialShape = '<section class="local-shape local-radial" data-logic-shape="radial"><h3 class="local-shape-title">多个机制共同作用</h3><div class="radial-grid"><article class="radial-center"><h3>反馈改变下一轮选择</h3><p>结果必须进入下一次分配。</p></article><article class="radial-spoke"><h3>改变信息</h3><p>偏差变得可见。</p></article><article class="radial-spoke"><h3>改变激励</h3><p>有效路径获得资源。</p></article></div></section>';

const linearWhiteboards = {
  "whiteboard-chain": buildLinearWhiteboard("chain", chainShape),
  "whiteboard-timeline": buildLinearWhiteboard("timeline", timelineShape),
  "whiteboard-matrix": buildLinearWhiteboard("matrix", matrixShape),
  "whiteboard-radial": buildLinearWhiteboard("radial", radialShape),
};

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
    LOGO: logo,
    SOURCE_LINE: '<span class="info-source">纵向论证验收样例</span>',
    CUSTOM_CSS: "",
    LOGIC_LEDGER_JSON: logicLedger(compositeSteps, compositeRelations),
    CONTENT_HTML: whiteboardComposite,
  },
  ...Object.fromEntries(Object.entries(linearWhiteboards).map(([name, fixture]) => [name, {
    LOGO: logo,
    SOURCE_LINE: '<span class="info-source">局部结构验收样例</span>',
    CUSTOM_CSS: "",
    LOGIC_LEDGER_JSON: fixture.ledger,
    CONTENT_HTML: fixture.html,
  }])),
};

for (const [name, values] of Object.entries(fixtures)) {
  const templateName = name.startsWith("whiteboard") ? "whiteboard" : name;
  const template = await Bun.file(join(root, "assets", `${templateName}_template.html`)).text();
  const path = join(output, `${name}.html`);
  await Bun.write(path, fill(template, values));
  console.log(path);
}

const whiteboardTemplate = await Bun.file(join(root, "assets", "whiteboard_template.html")).text();
const validWhiteboardHtml = fill(whiteboardTemplate, fixtures.whiteboard);
const implicitCopyRelations = structuredClone(compositeRelations);
implicitCopyRelations[0].bridge = "继续追问。";
const implicitCopyHtml = fill(whiteboardTemplate, {
  ...fixtures.whiteboard,
  LOGIC_LEDGER_JSON: logicLedger(compositeSteps, implicitCopyRelations),
});
const duplicateTransitionSteps = structuredClone(compositeSteps);
duplicateTransitionSteps[1].residue = "经验若要跨任务保留，就必须找到一种可持续写入的机制。";
const duplicateTransitionHtml = fill(whiteboardTemplate, {
  ...fixtures.whiteboard,
  LOGIC_LEDGER_JSON: logicLedger(duplicateTransitionSteps, compositeRelations),
  CONTENT_HTML: whiteboardComposite.replace(
    '<p class="step-residue"></p>',
    '<p class="step-residue">经验若要跨任务保留，就必须找到一种可持续写入的机制。</p>',
  ),
});
const invalidWhiteboards = [
  {
    name: "whiteboard-invalid-placeholder",
    expected: "Unreplaced placeholders",
    html: validWhiteboardHtml.replace('data-step-id="step-01"', 'data-step-id="{{UNRESOLVED_STEP}}"'),
  },
  {
    name: "whiteboard-invalid-summary-collapse",
    expected: "Ledger/DOM step mismatch",
    html: validWhiteboardHtml.replace(
      '<article class="logic-step" data-step-id="step-02"',
      '<article class="logic-step omitted-step" data-removed-step-id="step-02"',
    ),
  },
  {
    name: "whiteboard-invalid-source-anchor",
    expected: "missing source refs",
    html: validWhiteboardHtml.replace('data-source-refs="src-03"', 'data-source-refs=""'),
  },
  {
    name: "whiteboard-invalid-relation-endpoint",
    expected: "Relation endpoint not found",
    html: validWhiteboardHtml
      .replace('"to":"step-03"', '"to":"missing-step"')
      .replace('data-to="step-03"', 'data-to="missing-step"'),
  },
  {
    name: "whiteboard-invalid-branch-return",
    expected: "must return",
    html: validWhiteboardHtml.replace('class="branch-return"', 'class="branch-return-missing"'),
  },
  {
    name: "whiteboard-invalid-implicit-copy",
    expected: "must keep bridge empty",
    html: implicitCopyHtml,
  },
  {
    name: "whiteboard-invalid-duplicate-transition",
    expected: "duplicates the visible transition",
    html: duplicateTransitionHtml,
  },
  {
    name: "whiteboard-invalid-overflow",
    expected: "Horizontal overflow",
    html: validWhiteboardHtml.replace("</style>", ".whiteboard-content { width: 1320px; }</style>"),
  },
  {
    name: "whiteboard-invalid-height",
    expected: "Full-page height",
    html: validWhiteboardHtml.replace("</style>", ".whiteboard-content { min-height: 31050px; }</style>"),
  },
] as const;

for (const fixture of invalidWhiteboards) {
  const path = join(output, `${fixture.name}.html`);
  await Bun.write(path, fixture.html);
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

const whiteboardFontReport = await inspectWhiteboardFonts(join(output, "whiteboard.html"));
if (whiteboardFontReport.remote_resources.length > 0) {
  throw new Error("Whiteboard font path loaded a remote resource");
}
if (!whiteboardFontReport.title.some(font => font.familyName === "Kaiti SC") ||
    !whiteboardFontReport.relation.some(font => font.familyName === "Kaiti SC")) {
  throw new Error("Whiteboard title or visible transition did not resolve to local Kaiti SC");
}
if (!whiteboardFontReport.body.some(font => font.familyName === "PingFang SC")) {
  throw new Error("Whiteboard body did not resolve to local PingFang SC");
}
console.log(JSON.stringify({
  "whiteboard-font-readback": "pass",
  ...whiteboardFontReport,
}, null, 2));

for (const name of Object.keys(fixtures)) {
  const pngPath = join(output, `${name}.png`);
  const captureCommand = [
    "bun",
    join(root, "assets", "capture.ts"),
    join(output, `${name}.html`),
    pngPath,
    "1080",
    "1600",
    "fullpage",
  ];
  if (name.startsWith("whiteboard")) {
    captureCommand.push(whiteboardSourceInventoryPath, whiteboardSourcePath);
  }
  await run(captureCommand);
  const width = await readPngWidth(pngPath);
  if (width !== 1080) throw new Error(`Fixture width mismatch for ${name}: ${width}`);
  console.log(`fixture-readback: ${name} width=${width}`);
}

for (const fixture of invalidWhiteboards) {
  const invalidPng = join(output, `${fixture.name}.png`);
  await unlink(invalidPng).catch(error => {
    if ((error as { code?: string }).code !== "ENOENT") throw error;
  });
  await runExpectFailure([
    "bun",
    join(root, "assets", "capture.ts"),
    join(output, `${fixture.name}.html`),
    invalidPng,
    "1080",
    "1600",
    "fullpage",
    whiteboardSourceInventoryPath,
    whiteboardSourcePath,
  ], fixture.expected);
}
