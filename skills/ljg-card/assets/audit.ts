import { readdir } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const templateNames = ["long", "full", "comic", "whiteboard"];
const modeNames = ["long", "full", "comic", "whiteboard"];
const failures: string[] = [];

async function text(path: string): Promise<string> {
  return Bun.file(path).text();
}

function requireThat(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}

const activeFiles = [join(root, "SKILL.md")];
for (const file of await readdir(join(root, "references"))) {
  if (file.endsWith(".md")) activeFiles.push(join(root, "references", file));
}
for (const file of await readdir(join(root, "assets"))) {
  if (/\.(html|js|ts)$/.test(file)) activeFiles.push(join(root, "assets", file));
}

const vectorToken = String.fromCharCode(115, 118, 103);
const fragmentFilter = `url(${String.fromCharCode(35)}`;
const legacyPackageCommands = [
  String.fromCharCode(110, 112, 109, 32),
  String.fromCharCode(110, 112, 120, 32),
];

for (const file of activeFiles) {
  const body = await text(file);
  if (body.toLowerCase().includes(vectorToken)) failures.push(`vector token remains: ${file}`);
  if (body.toLowerCase().includes(fragmentFilter)) failures.push(`fragment filter remains: ${file}`);
  if (file.endsWith(".md") || file.endsWith("capture.ts")) {
    for (const command of legacyPackageCommands) {
      if (body.toLowerCase().includes(command)) failures.push(`legacy package command remains: ${file}`);
    }
  }
}

const skill = await text(join(root, "SKILL.md"));
requireThat(/version:\s*"\d+\.\d+\.\d+"/.test(skill), "SKILL version is not valid semver");
requireThat(skill.includes("references/image-generation.md"), "shared protocol missing from SKILL route");
requireThat(skill.includes("`-l`（默认）"), "default long mode changed");
for (const term of [
  "## `-f` 字体优先级",
  "KingHwa_OldSong",
  "Songti SC",
  "不得为了制卡联网下载",
  "实际解析到 `KingHwa_OldSong`",
  "所有编辑性文字",
  "title、headline",
  "代码与来源行的等宽字体是唯一例外",
]) {
  requireThat(skill.includes(term), `SKILL full-font contract missing: ${term}`);
}
for (const term of [
  "## `-f` 长文阅读面",
  "白底黑字",
  "#FFFFFF",
  "#171717",
  "不小于 32px",
  "行高保持 1.9",
  "有效宽度约 896px",
]) {
  requireThat(skill.includes(term), `SKILL full-readability contract missing: ${term}`);
}

const shared = await text(join(root, "references", "image-generation.md"));
for (const field of ["源判断", "核心冲突", "视觉动词", "承载物", "文字安全区"]) {
  requireThat(shared.includes(field), `motif field missing: ${field}`);
}
for (const term of ["系列圣经", "先样图，后批量", "No readable text", "SHA-256", "alt"]) {
  requireThat(shared.includes(term), `shared protocol term missing: ${term}`);
}

for (const mode of modeNames) {
  const body = await text(join(root, "references", `mode-${mode}.md`));
  if (mode === "full") {
    requireThat(body.includes("references/taste.md"), "full mode does not read taste contract");
    requireThat(body.includes("assets/full_template.html"), "full mode does not read full template");
    requireThat(body.includes("生成图数量为 `0`"), "full mode generated-image budget is not zero");
  } else {
    requireThat(body.includes("references/image-generation.md"), `mode does not read shared protocol: ${mode}`);
  }
  requireThat(body.includes("bun assets/capture.ts"), `mode capture command is not Bun: ${mode}`);
}

const longMode = await text(join(root, "references", "mode-long.md"));
for (const term of [
  "静线叙事",
  "3 秒",
  "15 秒",
  "60 秒",
  "原状 → 压力 → 变化 → 余波",
  "问题 → 机制 → 证据 → 边界 → 决策",
  "整卡缩略",
  "非专属视觉属性",
  "无论参照对象身份",
  "不写创作者姓名",
  ".evidence-boundary",
  ".closing-judgment",
]) {
  requireThat(longMode.includes(term), `long-mode contract missing: ${term}`);
}

for (const name of ["long", "comic"]) {
  const body = await text(join(root, "assets", `${name}_template.html`));
  requireThat(body.includes(`generated-visual--${name}`), `mode class missing: ${name}`);
  requireThat(body.includes('data-state="{{IMAGE_STATE}}"'), `image state slot missing: ${name}`);
  requireThat(body.includes('src="{{IMAGE_SRC}}"'), `image source slot missing: ${name}`);
  requireThat(body.includes('alt="{{IMAGE_ALT}}"'), `image alt slot missing: ${name}`);
  requireThat(body.includes('[data-state="empty"]'), `empty image hiding missing: ${name}`);
}

const whiteboardMode = await text(join(root, "references", "mode-whiteboard.md"));
for (const term of [
  "`0–4`",
  "论证账本",
  "source_sections",
  "must_render",
  ".reasoning-spine",
  "data-logic-shape",
  "data-step-id",
  "data-source-refs",
  "data-from",
  "data-to",
  "branch-return",
  "没有顶部 hero 图槽",
  "data-source-claim",
  "prepare-whiteboard-source.ts",
  "精确来源快照",
  "独立清单",
  "visibility: implicit",
  "visibility: visible",
  "`residue`",
  "transition-sentence",
  "流水式衔接的删除测试",
  "relation-arrowhead",
  '`question`',
  '`conclusion`',
  '`boundary`',
]) {
  requireThat(whiteboardMode.includes(term), `whiteboard mode contract missing: ${term}`);
}

const whiteboardTemplate = await text(join(root, "assets", "whiteboard_template.html"));
for (const primitive of [
  'data-card-mode="whiteboard"',
  'id="whiteboard-logic-ledger"',
  'type="application/json"',
  "{{LOGIC_LEDGER_JSON}}",
  "{{CONTENT_HTML}}",
  ".whiteboard-content",
  ".whiteboard-header",
  ".whiteboard-title",
  ".whiteboard-question",
  ".whiteboard-boundary",
  ".reasoning-spine",
  ".spine-rail",
  ".logic-step",
  ".step-depth",
  ".step-role",
  ".step-claim",
  ".step-support",
  ".step-residue",
  ".logic-relation",
  ".relation-rail",
  ".relation-arrowhead",
  ".transition-copy",
  ".transition-sentence",
  ".local-shape",
  ".local-chain",
  ".branch-grid",
  ".branch-path",
  ".branch-return",
  ".timeline-track",
  ".matrix-frame",
  ".matrix-axis-x",
  ".matrix-axis-y",
  ".matrix-grid",
  ".radial-grid",
  ".radial-center",
  ".generated-art--whiteboard",
]) {
  requireThat(whiteboardTemplate.includes(primitive), `whiteboard CSS/DOM surface missing: ${primitive}`);
}
for (const retired of [
  "generated-visual--whiteboard",
  "{{IMAGE_STATE}}",
  "{{IMAGE_SRC}}",
  "{{IMAGE_ALT}}",
  "{{IMAGE_CLAIM}}",
]) {
  requireThat(!whiteboardTemplate.includes(retired), `whiteboard template retained global hero surface: ${retired}`);
}
for (const retired of [
  ".step-why-next",
  ".relation-copy",
  ".relation-label",
  ".logic-why",
]) {
  requireThat(!whiteboardTemplate.includes(retired), `whiteboard template retained retired transition surface: ${retired}`);
  requireThat(!whiteboardMode.includes(retired), `whiteboard mode retained retired transition surface: ${retired}`);
}
for (const forbidden of [
  "@import",
  "http://",
  "https://",
  "linear-gradient",
  "radial-gradient",
  "box-shadow",
  "::before",
  "::after",
]) {
  requireThat(!whiteboardTemplate.includes(forbidden), `whiteboard template forbidden surface: ${forbidden}`);
}

const capture = await text(join(root, "assets", "capture.ts"));
for (const contract of [
  "findUnresolvedPlaceholders",
  "MAX_FULLPAGE_HEIGHT",
  "validateWhiteboardSnapshot",
  "WHITEBOARD_STEP_ROLES",
  "WHITEBOARD_LOCAL_SHAPES",
  "WHITEBOARD_RELATION_KINDS",
  "WHITEBOARD_RELATION_VISIBILITIES",
  "data-card-mode",
  "whiteboard-logic-ledger",
  "reasoning-spine",
  "data-step-id",
  "dataset.sourceRefs",
  "data-relation-id",
  "dataset.from",
  "dataset.to",
  "dataset.kind",
  "dataset.visibility",
  "relation-arrowhead",
  "transition-sentence",
  "whiteboard-boundary",
  "Ledger/DOM step mismatch",
  "Relation endpoint not found",
  "must keep bridge empty",
  "requires one bridge sentence",
  "duplicates the visible transition",
  "must remain visually and accessibly silent",
  "must return",
  "data-source-claim",
  "Generated whiteboard assets exceed 4",
  "Whiteboard source inventory is missing or invalid",
  "Whiteboard source snapshot SHA-256 differs from source inventory",
  "Whiteboard logic ledger SHA-256 differs from source inventory",
  "Source inventory/logic ledger section mismatch",
  "sourceBytesSha256",
  "Horizontal overflow",
  "Clipped content",
  "Full-page height",
]) {
  requireThat(capture.includes(contract), `capture whiteboard gate missing: ${contract}`);
}

const fullMode = await text(join(root, "references", "mode-full.md"));
for (const term of [
  "逐块只出现一次",
  "字符与先后顺序不变",
  "source-ledger.json",
  "data-source-block",
  "改单字",
  "调序",
  "漏块",
  "重复块",
  "assets/verify-full-text.ts",
  "纯白页面",
  "白底黑字",
  "#FFFFFF",
  "#171717",
  "32px",
  "1.9",
  "15:1",
  "暗朱红",
  "KingHwa_OldSong",
  "浏览器自动回退",
  "不得联网下载",
  "platform font",
  "缺失首选字体本身不是失败",
  "title、headline、章节标题",
  "`h1` title 与 `h2` headline",
  "唯一例外",
]) {
  requireThat(fullMode.includes(term), `full-mode contract missing: ${term}`);
}

const longTemplate = await text(join(root, "assets", "long_template.html"));
for (const placeholder of [
  "BG_COLOR",
  "ACCENT_COLOR",
  "TITLE_BLOCK",
  "BODY_HTML",
  "SOURCE_LINE",
  "LOGO",
  "IMAGE_STATE",
  "IMAGE_SRC",
  "IMAGE_ALT",
]) {
  requireThat(longTemplate.includes(`{{${placeholder}}}`), `long placeholder missing: ${placeholder}`);
}
for (const primitive of [
  ".highlight",
  ".prompt",
  ".dropcap",
  ".subtitle",
  ".item",
  "blockquote",
  ".divider",
  ".generated-art--inline",
  ".generated-art--closing",
  ".footer",
  ".eyebrow",
  ".deck",
  ".narrative-beat",
  ".beat-index",
  ".metric-row",
  ".metric",
  ".evidence-boundary",
  ".closing-judgment",
]) {
  requireThat(longTemplate.includes(primitive), `long CSS surface missing: ${primitive}`);
}
for (const token of ["#292621", "#746F68", "#DED7CC", "#B6533F"]) {
  requireThat(longMode.includes(token) || longTemplate.includes(token), `quiet-line token missing: ${token}`);
}

const fullTemplate = await text(join(root, "assets", "full_template.html"));
for (const placeholder of ["DOCUMENT_HTML", "CUSTOM_CSS", "SOURCE_LINE", "LOGO"]) {
  requireThat(fullTemplate.includes(`{{${placeholder}}}`), `full placeholder missing: ${placeholder}`);
}
for (const primitive of [
  ".full-document",
  ".opening",
  ".full-key",
  "blockquote",
  "ul,",
  "ol",
  "pre",
  "table",
  "caption",
  ".source-figure",
  "figcaption",
  ".footnotes",
  ".section-break",
  ".full-footer",
]) {
  requireThat(fullTemplate.includes(primitive), `full CSS surface missing: ${primitive}`);
}
for (const token of ["#FFFFFF", "#F6F6F4", "#171717", "#525252", "#7A7A7A", "#E5E5E3", "#A74432"]) {
  requireThat(fullTemplate.includes(token), `full taste token missing: ${token}`);
}
for (const contract of [
  "font: 400 32px/1.9 var(--body);",
  "padding: 88px 92px 56px;",
  "font: 400 32px/1.86 var(--body);",
  "font: 400 25px/1.74 var(--body);",
]) {
  requireThat(fullTemplate.includes(contract), `full readability CSS missing: ${contract}`);
}
requireThat(
  fullTemplate.includes("--body: 'KingHwa_OldSong', 'Songti SC', 'STSong', 'Noto Serif CJK SC', serif;"),
  "full body font stack must prefer KingHwa_OldSong and preserve local fallbacks",
);
requireThat(
  fullTemplate.includes("--display: 'KingHwa_OldSong', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', system-ui, sans-serif;"),
  "full display font stack must prefer KingHwa_OldSong and preserve local fallbacks",
);
for (const forbidden of [
  "@import",
  "@font-face",
  "http://",
  "https://",
  "linear-gradient",
  "radial-gradient",
  "box-shadow",
  "backdrop-filter",
  "generated-visual",
  "generated-art",
]) {
  requireThat(!fullTemplate.includes(forbidden), `full template forbidden surface: ${forbidden}`);
}

const fixtureBuilder = await text(join(root, "assets", "build-fixtures.ts"));
for (const primitive of [
  'class="eyebrow"',
  'class="deck"',
  'class="narrative-beat"',
  'class="beat-index"',
  'class="metric-row"',
  'class="metric"',
  'class="evidence-boundary"',
  'class="closing-judgment"',
]) {
  requireThat(fixtureBuilder.includes(primitive), `long fixture does not exercise: ${primitive}`);
}
for (const primitive of [
  "fullBlocks",
  'data-source-block="b001"',
  'class="opening"',
  'class="full-key"',
  "source-figure",
  "footnotes",
  "verify-full-text.ts",
  "capture.ts",
  "fixture-readback",
  "CSS.getPlatformFontsForNode",
  "full-fallback.html",
  "font-readback",
  "readability-readback",
  "contrast_ratio",
  "line_height_ratio",
  "document_width_px",
  "title_platform_fonts",
  "headline_platform_fonts",
  "Installed KingHwa_OldSong did not unify body, title, and headline",
  "whiteboard-font-readback",
  "Whiteboard title or visible transition did not resolve to local Kaiti SC",
  "Whiteboard body did not resolve to local PingFang SC",
]) {
  requireThat(fixtureBuilder.includes(primitive), `full fixture does not exercise: ${primitive}`);
}
for (const envName of ["LJG_CARD_FIXTURE_DIR", "LJG_CARD_FIXTURE_IMAGE"]) {
  requireThat(fixtureBuilder.includes(envName), `fixture override missing: ${envName}`);
}
for (const fixtureContract of [
  "runExpectFailure",
  "prepare-whiteboard-source.ts",
  "whiteboard-source-inventory.json",
  "whiteboard-source.txt",
  "compositeSteps",
  'data-logic-shape="chain"',
  'data-logic-shape="branch"',
  'data-logic-shape="timeline"',
  'data-logic-shape="matrix"',
  'data-logic-shape="radial"',
  "whiteboard-invalid-placeholder",
  "whiteboard-invalid-summary-collapse",
  "whiteboard-invalid-source-anchor",
  "whiteboard-invalid-relation-endpoint",
  "whiteboard-invalid-branch-return",
  "whiteboard-invalid-implicit-copy",
  "whiteboard-invalid-duplicate-transition",
  "whiteboard-invalid-overflow",
  "whiteboard-invalid-height",
]) {
  requireThat(fixtureBuilder.includes(fixtureContract), `whiteboard fixture contract missing: ${fixtureContract}`);
}

const verifier = await text(join(root, "assets", "verify-full-text.ts"));
for (const contract of [
  "source SHA-256 mismatch",
  "block count mismatch",
  "block order/id mismatch",
  "text mismatch",
  "nested data-source-block elements",
  "unregistered visible text",
]) {
  requireThat(verifier.includes(contract), `full verifier contract missing: ${contract}`);
}

const verifierTest = await text(join(root, "assets", "verify-full-text.test.ts"));
for (const mutation of [
  "exact ordered copy",
  "one-character rewrite",
  "reordered blocks",
  "missing block",
  "duplicated block",
]) {
  requireThat(verifierTest.includes(mutation), `full verifier test missing: ${mutation}`);
}

const captureTest = await text(join(root, "assets", "capture.test.ts"));
for (const contract of [
  "whiteboard reasoning-spine contract",
  "reasoning roles and composable local shapes",
  "load-bearing ledger step is absent",
  "silently drops a source paragraph",
  "dangling relation endpoint",
  "converged branch without a real return",
  "silent continuation without manufactured transition copy",
  "copy or arrows on an implicit relation",
  "visible turn without one complete bridge surface",
  "duplicate transition copy in both residue and relation bridge",
  "retired ledger version",
  "unresolved placeholders",
  "full-page safety ceiling",
]) {
  requireThat(captureTest.includes(contract), `whiteboard capture test missing: ${contract}`);
}

const whiteboardSourceBuilder = await text(join(root, "assets", "prepare-whiteboard-source.ts"));
for (const contract of [
  "buildWhiteboardSourceInventory",
  "source_sha256",
  "section_count",
  "text_sha256",
  "Whiteboard source contains no readable paragraphs",
]) {
  requireThat(whiteboardSourceBuilder.includes(contract), `whiteboard source inventory gate missing: ${contract}`);
}

const whiteboardSourceTest = await text(join(root, "assets", "prepare-whiteboard-source.test.ts"));
for (const contract of [
  "every non-empty source paragraph in order",
  "exact source bytes",
  "source without readable paragraphs",
]) {
  requireThat(whiteboardSourceTest.includes(contract), `whiteboard source inventory test missing: ${contract}`);
}
const packageJson = await text(join(root, "package.json"));
requireThat(packageJson.includes('"test": "bun test assets"'), "package test script does not include whiteboard tests");

const routes = [...skill.matchAll(/`((?:references|assets)\/[A-Za-z0-9._-]+)`/g)].map(match => match[1]);
for (const route of routes) {
  requireThat(await Bun.file(join(root, route)).exists(), `broken SKILL route: ${route}`);
}

const result = {
  status: failures.length === 0 ? "pass" : "fail",
  files_scanned: activeFiles.length,
  templates: templateNames.length,
  modes: modeNames.length,
  failures,
};

console.log(JSON.stringify(result, null, 2));
if (failures.length > 0) process.exit(1);
