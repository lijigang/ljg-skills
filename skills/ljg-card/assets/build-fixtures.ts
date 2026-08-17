import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = join(import.meta.dir, "..");
const output = resolve(process.env.LJG_CARD_FIXTURE_DIR ?? "/tmp/ljg-card-v7-fixtures");
const logo = pathToFileURL(join(import.meta.dir, "logo.png")).href;
const fixtureImagePath = process.env.LJG_CARD_FIXTURE_IMAGE;
const fixtureImage = pathToFileURL(resolve(fixtureImagePath ?? join(import.meta.dir, "logo.png"))).href;
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
    IMAGE_SRC: fixtureImage,
    IMAGE_ALT: fixtureImageAlt,
    BG_COLOR: "#FAF6EC",
    ACCENT_COLOR: "#B6533F",
    TITLE_BLOCK: '<div class="title-area"><div class="eyebrow">论文解读 · 决策边界</div><h1>AI 不只是在省时间</h1><p class="deck">真正的生产率问题，是控制权如何在工作流里移动。</p></div>',
    BODY_HTML: '<p class="dropcap">当一个人面对同一组任务：先全部手做，再让工具接管重复步骤。场景只画动作变化，结论仍由文字说准。</p><p class="highlight">关键变化不是“更快”，而是人的注意力从执行移向判断。</p><section class="narrative-beat"><span class="beat-index">01</span><div><h2>压力出现</h2><p>任务数量没有减少，重复操作先挤占了用于判断的时间。</p></div></section><section class="narrative-beat"><span class="beat-index">02</span><div><h2>控制权移动</h2><p>工具接走可描述的步骤，人保留目标、例外与验收。</p></div></section><div class="metric-row"><div class="metric"><strong>1 个</strong><span>稳定人物贯穿前后变化</span></div><div class="metric"><strong>2 拍</strong><span>足够表达一条因果链</span></div></div><div class="evidence-boundary"><strong>证据边界</strong><p>效率数字可以说明局部任务表现，不能自动推出组织总产出或长期福利。</p></div><div class="prompt"><strong>阅读问题：</strong>工具替你做了什么，又把哪一种判断还给了你？</div><div class="closing-judgment">把 AI 放进工作流时，先画清控制权，再讨论速度。</div>',
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
    IMAGE_SRC: pathToFileURL(join(output, "does-not-exist.png")).href,
    IMAGE_ALT: "用于验证损坏图片会被截图门禁拒绝",
  },
})) {
  const path = join(output, `${name}.html`);
  await Bun.write(path, fill(longTemplate, { ...longBase, ...imageValues }));
  console.log(path);
}
