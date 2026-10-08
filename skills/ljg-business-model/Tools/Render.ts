#!/usr/bin/env bun
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";

export const BLOCKS = [
  { key: "key_partners", title: "重要合作", en: "KEY PARTNERS", question: "谁与我们一起完成交付？", num: "08", area: "partners", tone: "supply" },
  { key: "key_activities", title: "关键业务", en: "KEY ACTIVITIES", question: "必须持续做好哪些事？", num: "07", area: "activities", tone: "supply" },
  { key: "key_resources", title: "核心资源", en: "KEY RESOURCES", question: "依靠哪些关键资产与能力？", num: "06", area: "resources", tone: "supply" },
  { key: "value_propositions", title: "价值主张", en: "VALUE PROPOSITIONS", question: "给客户带来什么具体价值？", num: "02", area: "value", tone: "value" },
  { key: "customer_relationships", title: "客户关系", en: "CUSTOMER RELATIONSHIPS", question: "如何建立并维系客户关系？", num: "04", area: "relationships", tone: "market" },
  { key: "channels", title: "渠道通路", en: "CHANNELS", question: "客户如何发现、购买与获得？", num: "03", area: "channels", tone: "market" },
  { key: "customer_segments", title: "客户细分", en: "CUSTOMER SEGMENTS", question: "为谁服务，谁来付费？", num: "01", area: "segments", tone: "market" },
  { key: "cost_structure", title: "成本结构", en: "COST STRUCTURE", question: "主要的钱花在哪里？", num: "09", area: "cost", tone: "money" },
  { key: "revenue_streams", title: "收入来源", en: "REVENUE STREAMS", question: "谁付钱，按什么方式收费？", num: "05", area: "revenue", tone: "money" },
] as const;

type Key = typeof BLOCKS[number]["key"];
type Item = { text: string; status: "given" | "inferred" | "unknown"; source_refs?: string[]; segment?: string; reason?: string };
export type Model = {
  title: string; scope: string; date: string; version: string; summary: string;
  sources: { id: string; label: string; detail?: string }[];
  segments?: { id: string; label: string }[];
  blocks: Record<Key, Item[]>;
};

const statusNames = { given: "材料提供", inferred: "推测", unknown: "待补充" };
const esc = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const fail = (message: string): never => { throw new Error(message); };
function record(value: unknown, path: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${path} 必须为对象`);
}
function str(value: unknown, path: string, max: number): asserts value is string {
  if (typeof value !== "string" || !value.trim() || [...value].length > max) fail(`${path} 需要 1–${max} 字符的文字`);
}
function keys(value: Record<string, unknown>, allowed: string[], path: string) {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`${path} 不支持字段 ${key}`);
}

export function validateModel(input: unknown): Model {
  record(input, "model");
  keys(input, ["title", "scope", "date", "version", "summary", "sources", "segments", "blocks"], "model");
  for (const [key, max] of Object.entries({ title: 32, scope: 60, date: 10, version: 24, summary: 100 })) str(input[key], key, max);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date as string) || new Date(input.date as string).toISOString().slice(0, 10) !== input.date) fail("date 必须是有效的 YYYY-MM-DD");
  if (!Array.isArray(input.sources) || input.sources.length > 12) fail("sources 必须是数组，最多 12 个来源");
  const sourceIds = new Set<string>();
  for (const [i, source] of input.sources.entries()) {
    record(source, `sources[${i}]`); keys(source, ["id", "label", "detail"], "source");
    str(source.id, "source.id", 12); str(source.label, "source.label", 60);
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(source.id) || sourceIds.has(source.id)) fail("来源编号须为不重复的字母数字编号");
    if (source.detail !== undefined) str(source.detail, "source.detail", 6000);
    sourceIds.add(source.id);
  }
  const segmentIds = new Set<string>();
  if (input.segments !== undefined && (!Array.isArray(input.segments) || input.segments.length > 4)) fail("segments 必须是数组，最多 4 类客户");
  for (const segment of (input.segments ?? []) as unknown[]) {
    record(segment, "segment"); keys(segment, ["id", "label"], "segment");
    str(segment.id, "segment.id", 8); str(segment.label, "segment.label", 20);
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(segment.id) || segmentIds.has(segment.id)) fail("客户编号须为不重复的字母数字编号");
    segmentIds.add(segment.id);
  }
  record(input.blocks, "blocks");
  keys(input.blocks, BLOCKS.map(b => b.key), "blocks");
  for (const { key } of BLOCKS) {
    const items = input.blocks[key];
    if (!Array.isArray(items) || items.length > 5) fail(`${key} 必须为数组，每格最多 5 条，缺项请用 []`);
    for (const [i, item] of items.entries()) {
      const path = `${key}[${i}]`;
      record(item, path); keys(item, ["text", "status", "source_refs", "segment", "reason"], path);
      str(item.text, `${path}.text`, 90);
      if (!["given", "inferred", "unknown"].includes(item.status as string)) fail(`${path} 缺少有效 status`);
      if (item.source_refs !== undefined && (!Array.isArray(item.source_refs) || item.source_refs.some((id: unknown) => typeof id !== "string" || !sourceIds.has(id)))) fail(`${path} 引用了不存在的来源`);
      if (item.status === "given" && (!Array.isArray(item.source_refs) || !item.source_refs.length)) fail(`${path} 材料提供条目须有 source_refs`);
      if (item.reason !== undefined) str(item.reason, `${path}.reason`, 240);
      if (item.status === "inferred") str(item.reason, `${path}.reason`, 240);
      if (item.segment !== undefined && !segmentIds.has(item.segment as string)) fail(`${path} 引用了不存在的客户编号`);
    }
  }
  return input as Model;
}

export function renderModel(input: unknown, width = 1600): string {
  const model = validateModel(input);
  if (!Number.isInteger(width) || width < 1200 || width > 2400) fail("width 必须为 1200–2400 的整数");
  const segmentIndex = new Map((model.segments ?? []).map((s, i) => [s.id, i]));
  const segmentBadge = (id: string) => `<span class="segment s${segmentIndex.get(id)}">${esc(id)}</span>`;
  const items = BLOCKS.flatMap(b => model.blocks[b.key]);
  const unknown = BLOCKS.reduce((n, b) => n + (model.blocks[b.key].length ? model.blocks[b.key].filter(i => i.status === "unknown").length : 1), 0);
  const inferred = items.filter(i => i.status === "inferred").length;
  const blocks = BLOCKS.map(b => {
    const values: Item[] = model.blocks[b.key].length ? model.blocks[b.key] : [{ text: "相关信息尚未提供", status: "unknown" }];
    return `<section class="block ${b.tone}" data-block="${b.key}" style="grid-area:${b.area}">
      <div class="block-heading"><div><div class="en">${b.en}</div><h2>${b.title}</h2></div><span class="number">${b.num}</span></div>
      <p class="question">${b.question}</p><ul>${values.map(item => `<li class="item ${item.status}"${item.reason ? ` title="推测依据：${esc(item.reason)}"` : ""}>
      <div class="item-meta">${item.segment ? segmentBadge(item.segment) : ""}<span class="status">${statusNames[item.status]}</span>${item.source_refs?.length ? `<span class="ref">${item.source_refs.map(esc).join(" · ")}</span>` : ""}</div>
      <p>${esc(item.text)}</p></li>`).join("")}</ul></section>`;
  }).join("");
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(model.title)} · 商业模式画布</title>
<style>
*{box-sizing:border-box}html,body{margin:0;padding:0;background:#e9e8e1;color:#222b32}body{font-family:"PingFang SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif}#canvas{width:${width}px;padding:42px 42px 28px;background:#f6f5ef;--rule:#cbd0cd;--blue:#325f79;--green:#386958;--amber:#775619}a{color:inherit;text-decoration:none}header{display:grid;grid-template-columns:1fr auto;gap:16px;margin-bottom:22px}.eyebrow{font-size:13px;letter-spacing:2px;font-weight:700;color:#62706f;margin-bottom:12px}h1{font-size:46px;line-height:1.4;margin:0 0 10px;letter-spacing:-1.5px;overflow-wrap:anywhere}.scope{font-size:18px;color:#53605e;margin:0}.edition{font-size:14px;line-height:1.9;text-align:right;color:#596661;padding-top:3px}.edition strong{display:block;font-size:16px;color:#202a2a}.summary{font-size:23px;line-height:1.5;margin:0;padding:16px 20px;border-left:4px solid #d29d3d;background:#eeece2;overflow-wrap:anywhere}.legend{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:18px 0;font-size:13px;color:#61706a}.legend-left,.legend-right,.customers{display:flex;flex-wrap:wrap;align-items:center;gap:12px}.customers{gap:14px}.customer{display:flex;gap:7px;align-items:center}.dot{width:6px;height:6px;border-radius:50%;display:inline-block;background:#7a8a84;margin-right:5px}.dot.hypothesis{background:#b98728}.dot.missing{background:#aaa}.canvas-grid{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));grid-template-rows:minmax(280px,auto) minmax(280px,auto) auto;grid-template-areas:"partners partners activities activities value value relationships relationships segments segments" "partners partners resources resources value value channels channels segments segments" "cost cost cost cost cost revenue revenue revenue revenue revenue";border-left:1px solid var(--rule);border-top:1px solid var(--rule)}.block{padding:21px 18px 22px;border-right:1px solid var(--rule);border-bottom:1px solid var(--rule);min-width:0;background:#fffefa}.block.supply{background:#f4f7f8}.block.value{background:#f5eacb}.block.market{background:#f1f6f1}.block.money{background:#fcfcf7}.block-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:6px}.en{font-size:10px;letter-spacing:.8px;color:#6b7777;font-weight:600;line-height:1.4}h2{font-size:27px;line-height:1.25;letter-spacing:.6px;margin:5px 0 0;white-space:nowrap}.number{font-family:Georgia,serif;font-size:30px;line-height:1.1;color:#829ba9}.market .number{color:#7b9b89}.value .number{color:#b59a57}.money .number{color:#8f9994}.question{font-size:13px;line-height:1.5;color:#697571;margin:12px 0 20px;padding-bottom:13px;border-bottom:1px solid #d8dfd9}.value .question{border-color:#ddcca0}ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:18px}.item{min-width:0;border-left:2px solid #a0b4bc;padding-left:10px}.market .item{border-color:#9bb6a4}.value .item{border-color:#c6a860}.item.inferred{border-color:#b88830;border-left-style:dashed}.item.unknown{border-color:#a3aaa5;border-left-style:dotted}.item-meta{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:6px;font-size:11px;line-height:1.5;letter-spacing:.2px;color:#677570}.ref{color:#89928e;font-size:10px;margin-left:auto}.item p{font-size:21px;line-height:1.55;margin:0;overflow-wrap:anywhere}.item.inferred .status{color:#91651c}.item.unknown p{color:#757f79}.segment{display:inline-block;font-size:11px;font-weight:700;line-height:18px;padding:0 5px;border-radius:3px;background:#dbe7ef;color:#33546e}.segment.s1{background:#ecdff1;color:#754686}.segment.s2{background:#f6dfd0;color:#93531d}.segment.s3{background:#dcedd7;color:#426d36}.money ul{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:17px 22px}.money .item p{font-size:21px}.money .question{margin-bottom:17px}.bottom{display:flex;justify-content:space-between;gap:16px;margin-top:15px;font-size:12px;line-height:1.5;color:#69736e}.bottom .signal{font-weight:600;color:#715522}.sources{margin-top:13px;font-size:11px;line-height:1.7;color:#727d77;overflow-wrap:anywhere}.credit{display:flex;justify-content:space-between;gap:20px;margin-top:15px;padding-top:12px;border-top:1px solid #d6dbd4;font-size:10px;line-height:1.6;color:#788079}.credit strong{font-weight:600;color:#5c6861}@media print{body{background:white}#canvas{margin:0} @page{size:landscape;margin:0}}
</style></head><body><main id="canvas">
<header><div><div class="eyebrow">BUSINESS MODEL CANVAS ／ 商业模式画布</div><h1>${esc(model.title)}</h1><p class="scope">${esc(model.scope)}</p></div><div class="edition"><strong>一张图，看清生意如何运转</strong>${esc(model.date)}<br>${esc(model.version)}</div></header>
<p class="summary">${esc(model.summary)}</p>
<div class="legend"><div class="legend-left"><span><i class="dot"></i>材料提供</span><span><i class="dot hypothesis"></i>推测</span><span><i class="dot missing"></i>待补充</span></div><div class="customers">${(model.segments ?? []).map(s => `<span class="customer">${segmentBadge(s.id)}${esc(s.label)}</span>`).join("")}</div><div class="legend-right">经营支撑 → 价值创造 → 客户市场</div></div>
<div class="canvas-grid">${blocks}</div>
<div class="bottom"><span>基于当前材料整理 · 材料提供 ≠ 外部验证 · 画布不代表商业模式已获验证</span><span class="signal">${inferred} 项推测 · ${unknown} 项待补充</span></div>
<div class="sources">材料：${model.sources.length ? model.sources.map(s => `${esc(s.id)} ${esc(s.label)}`).join(" ／ ") : "尚未提供"}</div>
<footer class="credit"><span>基于《商业模式新生代》 · Alexander Osterwalder &amp; Yves Pigneur<br>中文翻译与视觉排版改编 · 业务材料权利归原权利人</span><span><strong>Business Model Canvas · <a href="https://www.strategyzer.com/">Strategyzer.com</a></strong><br>画布模板：<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a> · 原设计：Strategyzer AG</span></footer>
</main><script>
window.businessModelAudit=function(){
const root=document.querySelector('#canvas');const r=root.getBoundingClientRect();
const overflow=[...root.querySelectorAll('section,h1,h2,.item,.item p,.summary,.legend,.edition,.sources')].filter(e=>{const b=e.getBoundingClientRect();return e.scrollWidth>e.clientWidth+2||e.scrollHeight>e.clientHeight+2||b.left<r.left-1||b.right>r.right+1}).map(e=>({element:e.tagName,block:e.closest('[data-block]')?.dataset.block||null,text:e.textContent.slice(0,90)}));
return {ok:document.fonts.status==='loaded'&&document.querySelectorAll('[data-block]').length===9&&!overflow.length,blocks:document.querySelectorAll('[data-block]').length,items:document.querySelectorAll('.item').length,inferred:document.querySelectorAll('.item.inferred').length,unknown:document.querySelectorAll('.item.unknown').length,overflow,bounds:{width:r.width,height:r.height},fonts:document.fonts.status};};
</script></body></html>`;
}

if (import.meta.main) {
  try {
    const { values } = parseArgs({ args: Bun.argv.slice(2), options: { input: { type: "string" }, output: { type: "string" }, width: { type: "string" }, help: { type: "boolean" } }, strict: true });
    if (values.help) {
      console.log("Usage: bun Render.ts --input model.json --output model.html [--width 1600]\n生成离线商业模式画布 HTML。宽度 1200–2400。输入格式见 Render.help.md。输出文件不能已存在。");
    } else {
      if (!values.input || !values.output) fail("需要 --input 和 --output；使用 --help 查看帮助");
      const model = validateModel(await Bun.file(values.input).json());
      const html = renderModel(model, values.width === undefined ? 1600 : Number(values.width));
      const output = resolve(values.output);
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, html, { flag: "wx" });
      console.log(JSON.stringify({ status: "ok", output, blocks: BLOCKS.length, items: Object.values(model.blocks).flat().length, width: values.width === undefined ? 1600 : Number(values.width) }));
    }
  } catch (error) {
    console.error(JSON.stringify({ status: "error", message: error instanceof Error ? error.message : String(error) }));
    process.exitCode = 1;
  }
}
