import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const output = "/tmp/ljg-card-v7-fixtures";
const logo = `file://${join(import.meta.dir, "logo.png")}`;

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

const common = {
  IMAGE_STATE: "ready",
  IMAGE_SRC: logo,
  IMAGE_ALT: "黑色圆形品牌图像，仅用于验证本地位图槽成功加载",
  LOGO: logo,
  SOURCE_LINE: '<span class="info-source">结构验收样例</span>',
};

const fixtures: Record<string, Record<string, string>> = {
  long: {
    ...common,
    BG_COLOR: "#FAF8F2",
    ACCENT_COLOR: "#9A4939",
    TITLE_BLOCK: '<div class="title-area"><h1>长图的视觉锚点</h1></div>',
    BODY_HTML: '<p class="dropcap">生成图只在真正承载结构的位置出现，其他段落保持安静。</p><p class="highlight">图片负责看见，文字负责说准。</p>',
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

const longTemplate = await Bun.file(join(root, "assets", "long_template.html")).text();
const longBase = fixtures.long;

for (const [name, imageValues] of Object.entries({
  "long-empty": { IMAGE_STATE: "empty", IMAGE_SRC: "", IMAGE_ALT: "" },
  "long-broken": {
    IMAGE_STATE: "ready",
    IMAGE_SRC: "file:///tmp/ljg-card-v7-fixtures/does-not-exist.png",
    IMAGE_ALT: "用于验证损坏图片会被截图门禁拒绝",
  },
})) {
  const path = join(output, `${name}.html`);
  await Bun.write(path, fill(longTemplate, { ...longBase, ...imageValues }));
  console.log(path);
}
