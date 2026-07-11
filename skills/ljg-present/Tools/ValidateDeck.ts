#!/usr/bin/env bun

import { resolve } from "node:path";

const VERSION = "4.4.0";

const HELP = `ValidateDeck ${VERSION}

Usage:
  bun Tools/ValidateDeck.ts <deck.html> [--theme black|red|yellow|hacker|hacker-dark] [--template] [--json]
  bun Tools/ValidateDeck.ts --self-test
  bun Tools/ValidateDeck.ts --help

Checks:
  template version and JavaScript syntax
  stable centered stage axis, chapter signal rule, header/footer contract
  semantic-atom Takahashi typography, CJK tail guard, grouped rows and measured fit guard
  offline math guards and presentation key map
  zero motion and zero external resources
  Hacker theme grammar when --theme hacker or --theme hacker-dark
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
    { pre: "+---+\n|AI |\n+---+", sourceIds: ["SRC-019"] }
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

function ruleBodies(style: string, exactSelector: string) {
  const bodies: string[] = [];
  for (const match of style.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = match[1].split(",").map((value) => value.trim());
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

function validateHtml(original: string, options: Pick<Options, "theme" | "template">): Check[] {
  const html = options.template || original.includes("{{SLIDES_JSON}}")
    ? materializeTemplate(original, options.theme || "hacker")
    : original;
  const style = html.match(/<style>([\s\S]*?)<\/style>/i)?.[1] ?? "";
  const script = html.match(/<script>([\s\S]*?)<\/script>/i)?.[1] ?? "";
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

  add("template-version", html.includes('data-template-version="4.4.0"'), "template version is 4.4.0");
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

  const titleSignal = ruleBodies(style, '.slide[data-title="true"] .lines').some((body) =>
    /border-top\s*:\s*0/.test(body)
    && body.includes("var(--title-signal-w)")
    && /center\s+top/.test(body)
    && /linear-gradient\(var\(--hl\),\s*var\(--hl\)\)/.test(body)
  );
  add("title-short-signal", titleSignal, "title page uses a short signal rule instead of a full-width border");

  const cssMotion = style.match(/\b(?:animation|transition|view-transition)(?:-[a-z-]+)?\s*:|@keyframes\b|scroll-behavior\s*:\s*smooth\b/gi) || [];
  const jsMotion = script.match(/\.animate\s*\(|setInterval\s*\(/g) || [];
  add("zero-motion", cssMotion.length === 0 && jsMotion.length === 0, `css=${cssMotion.length}, js=${jsMotion.length}`);

  const externalMarkup = html.match(/<(?:img|svg|link|iframe|video|audio|source)\b|https?:\/\//gi) || [];
  const externalCss = style.match(/@import\b|\burl\s*\(|\bimage-set\s*\(/gi) || [];
  add("offline", externalMarkup.length === 0 && externalCss.length === 0, `markup=${externalMarkup.length}, css=${externalCss.length}`);

  add("render-lines", script.includes("slide.lines?.length") && script.includes('lines.className = "lines fit-box"'), "lines renderer exists");
  add("render-table", script.includes("slide.table") && script.includes("slide.table.header === true") && script.includes('document.createElement("thead")') && script.includes('document.createElement("tbody")'), "table renderer respects explicit header flag and semantic sections");
  add("render-pre", script.includes("slide.pre != null") && script.includes('document.createElement("pre")'), "pre renderer exists");

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
  if (activeTheme === "hacker" || activeTheme === "cyber") {
    const hackerColors = [
      /--hacker-void:\s*#07110D/i,
      /--hacker-paper:\s*#EAF4EC/i,
      /--hacker-signal:\s*#00C46A/i
    ];
    add("hacker-palette", hackerColors.every((pattern) => pattern.test(style)), "exact void, paper and signal colors exist");
    add("hacker-reading-strategy", style.includes('body[data-theme="hacker"] .slide') && style.includes('slide[data-cover="true"]') && style.includes("var(--hacker-paper)") && style.includes("var(--hacker-void)"), "regular paper and dark cover/chapter rules exist");
    const hackerSlideBodies = ruleBodies(style, 'body[data-theme="hacker"] .slide');
    const hackerRailBodies = ruleBodies(style, 'body[data-theme="hacker"] .slide::after');
    const symmetricHacker = hackerSlideBodies.length > 0
      && hackerSlideBodies.every((body) => !/padding-left\s*:/.test(body))
      && style.includes("padding: clamp(28px, 6vmin, 96px) var(--stage-inline)")
      && hackerRailBodies.some((body) => /left\s*:\s*50%/.test(body) && /translateX\(-50%\)/.test(body));
    add("symmetric-hacker-stage", symmetricHacker, "Hacker ornament and stage padding share the centered axis");
  }
  if (activeTheme === "hacker-dark") {
    const darkColors = [
      /--hacker-dark-bg:\s*#06110D/i,
      /--hacker-dark-deep:\s*#020806/i,
      /--hacker-dark-panel:\s*#0A1A13/i,
      /--hacker-dark-fg:\s*#CFE1D5/i,
      /--hacker-dark-signal:\s*#25E981/i
    ];
    add("hacker-dark-palette", darkColors.every((pattern) => pattern.test(style)), "exact low-glare dark Hacker palette exists");
    add("hacker-dark-contrast", contrastRatio("CFE1D5", "06110D") >= 9, `contrast=${contrastRatio("CFE1D5", "06110D").toFixed(2)}:1`);
    const darkSlideBodies = ruleBodies(style, 'body[data-theme="hacker-dark"] .slide');
    const darkRailBodies = ruleBodies(style, 'body[data-theme="hacker-dark"] .slide::after');
    const darkCoverBodies = ruleBodies(style, 'body[data-theme="hacker-dark"] .slide[data-cover="true"]');
    add("hacker-dark-all-pages", darkSlideBodies.some((body) => body.includes("var(--hacker-dark-bg)")) && darkCoverBodies.some((body) => body.includes("var(--hacker-dark-deep)")), "regular and cover pages both use distinct dark fields");
    add("hacker-dark-signal-scope", style.includes("--fg: var(--hacker-dark-fg)") && !/\.line\s*\{[^}]*color\s*:\s*var\(--hacker-dark-signal\)/s.test(style), "signal green is not the body-text color");
    add("hacker-dark-no-effects", !/\b(?:text-shadow|box-shadow)\s*:|drop-shadow\s*\(|@keyframes\b|\banimation(?:-[a-z-]+)?\s*:|\btransition(?:-[a-z-]+)?\s*:/i.test(style), "dark theme has no glow, shadow, animation, or transition effects");
    const symmetricDark = darkSlideBodies.length > 0
      && darkRailBodies.some((body) => /left\s*:\s*50%/.test(body) && /translateX\(-50%\)/.test(body));
    add("symmetric-hacker-dark-stage", symmetricDark, "dark Hacker ornament remains on the centered stage axis");
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
      html: template.replace("left: 50%;\n    top: clamp(22px, 5vh, 66px);", "left: 12%;\n    top: clamp(22px, 5vh, 66px);")
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

  const pass = goodPass && darkPass && motionFixturesRejected && resourceFixturesRejected && spatialFixturesRejected && semanticFixturesRejected && layoutPass && mathPass && dollarSafeMaterialization;
  console.log(JSON.stringify({
    status: pass ? "PASS" : "FAIL",
    goodTemplateChecks: `${goodChecks.filter((check) => check.pass).length}/${goodChecks.length}`,
    darkTemplateChecks: `${darkChecks.filter((check) => check.pass).length}/${darkChecks.length}`,
    motionFixturesRejected,
    resourceFixturesRejected,
    spatialFixturesRejected,
    semanticFixturesRejected,
    layouts,
    stableRowsLayout: layoutPass,
    mathAndPriceFixtures: mathPass,
    dollarSafeMaterialization
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
