#!/usr/bin/env bun
import {resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
import {VERSION,dataErrors,normalizedTemplate,parseDeck,prepareDeck,materialize,hash,safeJson} from './DeckData';
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
  const end = script.indexOf("// END CHART RENDERER", start);
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


export async function validateHtml(html:string,theme?:string,browser?:any){
 const checks:{id:string;pass:boolean;detail:string}[]=[];const add=(id:string,pass:boolean,detail:string)=>checks.push({id,pass,detail});
 const canonical=await Bun.file(resolve(import.meta.dir,'../SloganTemplate.html')).text();
 add('canonical-template',normalizedTemplate(html)===normalizedTemplate(canonical),'Only data and embedded fonts may differ from the current template; old token presence cannot certify an alternate renderer.');
 add('template-version',html.includes('data-template-version="'+VERSION+'"'),'Template '+VERSION);
 let data:any;try{data=parseDeck(html);const errs=dataErrors({...data.meta,slides:data.slides});add('data-and-source-contract',!errs.length,errs.join('; ')||'Explicit roles, source coverage and content contracts hold.');const {buildId,...meta}=data.meta;add('payload-integrity',buildId===hash(safeJson({slides:data.slides,meta}))&&meta.templateId===hash(normalizedTemplate(canonical)),'Content, metadata and renderer match the build fingerprint.');if(theme)add('requested-theme',theme===data.meta.theme,'Requested theme matches compiled metadata.');}catch(e){add('data-and-source-contract',false,String(e));}
 const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1]??'',style=[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(x=>x[1]).join('\n');
 try{new Function(script);add('javascript-syntax',true,'Runtime compiles.');}catch(e){add('javascript-syntax',false,String(e));}
 const engine=script.replace(/const (RAW_SLIDES|DECK_META) = [\s\S]*?;\n/g,'');
 const fonts=html.match(/\/\* BEGIN DECK FONTS \*\/([\s\S]*?)\/\* END DECK FONTS \*\//)?.[1]??'';
 const fontRemainder=fonts.replace(/@font-face\s*\{[^}]*\}/gi,'').replace(/\/\*[\s\S]*?\*\//g,'').trim();
 const license=html.match(/<template id="deck-font-license">([\s\S]*?)<\/template>/)?.[1];
 const knownLicense=(await Bun.file(resolve(import.meta.dir,'../Fonts/IBMPlexMono-OFL.txt')).text()).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 add('asset-slot-boundary',!fontRemainder&&(license===undefined||license===knownLicense),'Font slot contains only font faces and the bundled license.');
 const offline=offlineViolations(html,style,engine);add('offline',!offline.length,offline.join('; ')||'One runtime, inline resources, no network dependencies.');
 const motion=/\b(?:animation|transition|view-transition)(?:-[a-z-]+)?\s*:|@keyframes\b|scroll-behavior\s*:\s*smooth/i.test(style)||/\.animate\s*\(|set(?:Interval|Timeout)\s*\(/.test(engine)||/<(?:animate|animateMotion|animateTransform|set)\b/i.test(html.replace(/<script>[\s\S]*?<\/script>/g,''));add('zero-motion',!motion,'Hard cuts only; animation-frame callbacks are for measurement.');
 if(browser&&data){
  const report=browser.value??browser;add('browser-build',report.buildId===data.meta.buildId,'Live probe belongs to this payload.');
  add('browser-coverage',report.count===data.slides.length&&report.pages?.length===data.slides.length,'Every slide was inspected.');
  add('browser-rendered-content',report.pages?.every((p:any)=>p.pass)&&report.pass===true,'Rendered roles, primary objects, text, geometry and fonts passed for the recorded viewport.');
 }
 return checks;
}
async function selfTest(){
 const template=await Bun.file(resolve(import.meta.dir,'../SloganTemplate.html')).text();const fixture=await Bun.file(resolve(import.meta.dir,'../References/CompositionDeck.json')).json();
 const prepared=prepareDeck(fixture),html=materialize(template,prepared);const checks=await validateHtml(html);const result:Record<string,boolean>={templatePass:checks.every(c=>c.pass)};
 const mutations={bypass:html.replace('SLIDES.forEach((s,i)=>{','SLIDES.forEach((s,i)=>{ return;'),cssOverride:html.replace('</style>','.claim{font-size:8px}</style>'),extraScript:html.replace('</body>','<script>console.log(1)</script></body>'),externalResource:html.replace('</head>','<link rel="stylesheet" href="https://example.com/x.css"></head>'),fakeFont:html.replace('/* BEGIN DECK FONTS */','/* BEGIN DECK FONTS */\n@font-face{font-family:X;src:url(data:font/ttf;base64,AAAA)}'),fontSlotStyle:html.replace('/* BEGIN DECK FONTS */','/* BEGIN DECK FONTS */\n.claim{display:none}')};
 for(const [name,bad] of Object.entries(mutations))result['reject_'+name]=(await validateHtml(bad)).some(c=>!c.pass);
 const variants=[structuredClone(fixture),structuredClone(fixture),structuredClone(fixture),structuredClone(fixture)];variants[0].slides[1].lines[0].chunks[0].t='changed';variants[1].slides[3].diagram.edges[0].to='missing';delete variants[2].slides[1].role;variants[3].mode='editorial';result.dataMutationsRejected=variants.every(v=>dataErrors(v).length>0);
 result.shareStaysDark=prepareDeck({...fixture,tags:['share','talk']}).meta.theme==='hacker-dark';
 result.explicitThemeWins=prepareDeck({...fixture,theme:'hacker',tags:['share']}).meta.theme==='hacker';
 result.twoLineStatement=prepared.slides.some(s=>s.role==='statement'&&s.lines.length===2);
 const dollar=structuredClone(fixture);dollar.title='$$x$$ $& $`';const d=prepareDeck(dollar);result.dollarSafeInjection=parseDeck(materialize(template,d)).meta.title===dollar.title;
 const token=structuredClone(fixture);token.title='{{DECK_META_JSON}}';const tp=prepareDeck(token);result.placeholderLiteralsPreserved=parseDeck(materialize(template,tp)).meta.title===token.title;
 const incomplete=structuredClone(fixture);incomplete.slides[1].sourceParts=[{id:incomplete.slides[1].sourceIds[0],index:1,total:2,joinBefore:''}];result.incompleteContinuationRejected=dataErrors(incomplete).length>0;
 result.staleBrowserRejected=(await validateHtml(html,undefined,{buildId:'old',count:prepared.slides.length,pages:prepared.slides.map(()=>({pass:true})),pass:true})).some(c=>c.id==='browser-build'&&!c.pass);
 for(const [k,v] of Object.entries(chartRendererFixtures(template)))result['chart_'+k]=v;
 const mathCode=template.slice(template.indexOf('  function escapeHtml('),template.indexOf('// BEGIN CHART RENDERER'));const renderMath=(text:string)=>runInNewContext(mathCode+'\nrenderMathAware(input)',{input:text},{timeout:1000});
 result.priceProtection=!String(renderMath('$20/month 与 $200/month')).includes('class="math"');result.mathClosedDelimiters=String(renderMath('$$x^2 \\cdot y$$')).includes('<sup>2</sup>');
 const validFonts=['data:font/ttf;base64,AAEAAA==','data:font/otf;base64,T1RUTw=='];result.fontSignatures=validFonts.every(x=>isEmbeddedAsset(x,'font'))&&!isEmbeddedAsset('data:font/ttf;base64,VEVYVA==','font');
 const ok=Object.values(result).every(Boolean);console.log(JSON.stringify({status:ok?'PASS':'FAIL',...result,failedChecks:checks.filter(c=>!c.pass)},null,2));return ok;
}
async function main(){
 const args=process.argv.slice(2);if(args.includes('--help')||!args.length){console.log('ValidateDeck <deck.html> [--theme NAME] [--json] [--template] [--browser-report report.json]\nValidateDeck --self-test\nStatic validation checks a canonical renderer and data. Use ProbeDeck.js in the isolated browser for actual rendering.');return;}
 if(args.includes('--self-test')){if(!await selfTest())process.exitCode=1;return;}
 const path=args[0],theme=args.includes('--theme')?args[args.indexOf('--theme')+1]:undefined;let html=await Bun.file(path).text();
 if(args.includes('--template')){const fixture=await Bun.file(resolve(import.meta.dir,'../References/CompositionDeck.json')).json();if(theme)fixture.theme=theme;html=materialize(html,prepareDeck(fixture));}
 let report:any;if(args.includes('--browser-report')){report=await Bun.file(args[args.indexOf('--browser-report')+1]).json();if(report.results)report=report.results.at(-1).value;}
 const checks=await validateHtml(html,theme,report),failed=checks.filter(c=>!c.pass);const result={status:failed.length?'FAIL':'PASS',file:path,passed:checks.length-failed.length,total:checks.length,failed,browser:report?'checked':'not supplied; visual verification remains separate'};
 if(args.includes('--json'))console.log(JSON.stringify(result,null,2));else{console.log(result.status+' '+path+' — '+result.passed+'/'+result.total);failed.forEach(f=>console.error(f.id+': '+f.detail));}
 if(failed.length)process.exitCode=1;
}
if(import.meta.main)await main();
