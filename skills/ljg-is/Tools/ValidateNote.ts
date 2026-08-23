#!/usr/bin/env bun

import { basename } from "node:path";

export type NoteSchema = "legacy" | "ljg-is-v2" | "ljg-is-v3" | "ljg-is-v4" | "ljg-is-v5";

export type ValidationResult = {
  ok: boolean;
  errors: string[];
  identifier?: string;
  schema?: NoteSchema;
  definition?: string;
  operation?: string;
  recognition?: string;
  guidance?: string;
  action?: string;
  core?: string;
};

type NoteFormat = "org" | "md";
type EmphasizedBullet = { label: string; value: string };

const V2_SCHEMA = "ljg-is-v2";
const V3_SCHEMA = "ljg-is-v3";
const V4_SCHEMA = "ljg-is-v4";
const V5_SCHEMA = "ljg-is-v5";
const LEGACY_HEADINGS = ["问题", "完整表达", "剥离", "本质", "示例", "验证"];
const V2_HEADINGS = ["问题", "完整表达", "剥离", "本质", "示例", "结构迁移", "验证"];
const V3_HEADINGS = [
  "动词判断",
  "一个不",
  "理由",
  "做成的秩序",
  "卷入与反制",
  "历史与未来",
  "未决问题",
  "根据与边界",
];

const V3_SECTION_LABELS: Record<string, string[]> = {
  动词判断: ["原问", "改问", "作"],
  一个不: ["给定", "不", "未选"],
  理由: ["已有", "尚缺"],
  做成的秩序: ["规则", "关系", "分配"],
  卷入与反制: ["卷入", "回应", "反制"],
  历史与未来: ["本源", "打开", "关闭", "修正"],
  未决问题: ["凭什么", "接下来"],
  根据与边界: ["根据", "推断", "边界", "反驳"],
};

const EXPOSED_FRAMEWORK_LABEL = /^(?:定义|是什么|运作|怎样运作|机制|认知改变|认知修正|行动指导|怎么做|建议|原问|改问|作|给定|不|未选|已有|尚缺|规则|关系|分配|卷入|回应|反制|本源|打开|关闭|修正|凭什么|接下来|根据|推断|边界|反驳)[：:]/mu;
const OLD_CONTRACT = /(?:^|\n)(?:核心|完整|容易误认|真正问题|结构式|变量|迁移)：|The One|最小状态变化|->/mu;

function metadataValue(content: string, key: string, format: NoteFormat): string | undefined {
  const prefix = format === "org" ? "#\\+" : "";
  return content.match(new RegExp(`^${prefix}${key}:\\s*(.+?)\\s*$`, "mi"))?.[1]?.trim();
}

function nonEmptyLines(body: string): string[] {
  return body.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
}

function sectionBody(content: string, heading: string, format: NoteFormat): string | undefined {
  const lines = content.split(/\r?\n/u);
  const headingLine = `${format === "org" ? "*" : "#"} ${heading}`;
  const start = lines.findIndex((line) => line.trimEnd() === headingLine);
  if (start < 0) return undefined;
  const nextHeading = format === "org" ? /^\* /u : /^# /u;
  const offset = lines.slice(start + 1).findIndex((line) => nextHeading.test(line));
  const end = offset < 0 ? lines.length : start + 1 + offset;
  return lines.slice(start + 1, end).join("\n").trim();
}

function paragraphs(body: string): string[] {
  return body.split(/\r?\n\s*\r?\n/u).map((part) => part.replace(/\s*\r?\n\s*/gu, " ").trim()).filter(Boolean);
}

function parseEmphasizedBullets(body: string, format: NoteFormat): EmphasizedBullet[] {
  const pattern = format === "org"
    ? /^- \*([^*\n]+)\*：\s*(.+)$/u
    : /^- \*\*([^*\n]+)\*\*：\s*(.+)$/u;
  return nonEmptyLines(body).flatMap((line) => {
    const match = line.match(pattern);
    const label = match?.[1]?.trim();
    const value = match?.[2]?.trim();
    return label && value ? [{ label, value }] : [];
  });
}

function hasExactLabels(entries: EmphasizedBullet[], expected: string[]): boolean {
  return JSON.stringify(entries.map(({ label }) => label)) === JSON.stringify(expected);
}

function parseCompleteCore(line: string): string | undefined {
  const value = line.replace(/^完整：/u, "").trim();
  if (!value) return undefined;
  if (!value.startsWith("（")) return value;
  const closing = value.indexOf("）");
  return closing > 0 ? value.slice(closing + 1).trim() || undefined : undefined;
}

function validateSyntax(content: string, format: NoteFormat, errors: string[]): void {
  if (/\b(?:TODO|TBD)\b|待补|占位|\{[^}\n]+\}/iu.test(content)) {
    errors.push("文件中不能残留 TODO、TBD 或模板占位符");
  }
  if (format === "org") {
    if (/^#{1,6}\s+/mu.test(content) || /```/u.test(content)) {
      errors.push("Org 文件中不能出现 Markdown 标题或代码围栏");
    }
    if (/\[[^\]\n]+\]\([^\)\n]+\)/u.test(content)) {
      errors.push("Org 文件中不能出现 Markdown 链接语法");
    }
  } else if (/^#\+/mu.test(content) || /^\*\s+/mu.test(content)) {
    errors.push("Markdown 文件中不能出现 Org 元数据或 Org 标题");
  }
}

function validateV3ActionContract(action: string, errors: string[], location: string): void {
  const hasActor = /^.{2,28}(?:通过|以|用|经由|借助|选择|制定|实施|建立|部署)/u.test(action);
  const hasCreation = /(?:做成|建立|创制|制定|实行|实施|部署|组织成|赋予|重构|改造|使.+成为|让.+成为|把.+(?:做成|变成|组织成))/u.test(action);
  const hasOrder = /(?:秩序|规则|关系|制度|规范|分配|权力|责任|身份|角色|治理|安排|机制|实践|网络)/u.test(action);
  if ([...action].length < 18 || !hasActor || !hasCreation || !hasOrder) {
    errors.push(`${location}必须写清行动者、具体创制行动及其建立的共同安排；长度足够的抽象句也不合格`);
  }
}

function validateV4ActionContract(action: string, errors: string[]): void {
  const hasAction = /(?:安排|决定|组织|建立|制定|部署|改造|引入|规定|连接|集中|开放|关闭|评分|派单|让|使|把|变成|成为)/u.test(action);
  const hasSharedChange = /(?:秩序|规则|关系|制度|安排|网络|入口|评价|服务|做法|机制|选择|权力|责任|工作|生活|城市|组织|共同)/u.test(action);
  if ([...action].length < 24 || [...action].length > 140 || !hasAction || !hasSharedChange) {
    errors.push("v4 action 要用一到两句普通话说清关键动作及其造成的共同变化，不能只写愿望、影响或抽象口号");
  }
}

type V5Fields = {
  definition?: string;
  operation?: string;
  recognition?: string;
  guidance?: string;
};

function validateV5(
  fileName: string,
  content: string,
  format: NoteFormat,
  identifier: string | undefined,
  title: string | undefined,
  tags: string[],
  headings: string[],
  errors: string[],
): V5Fields {
  const fileMatch = fileName.match(/^(\d{8}T\d{6})--理解-(.+)__is\.(org|md)$/u);
  if (!fileMatch || !fileMatch[2]?.trim()) {
    errors.push("v5 文件名必须符合 YYYYMMDDTHHMMSS--理解-<目标>__is.org 或 __is.md");
  } else if (identifier && identifier !== fileMatch[1]) {
    errors.push("identifier 必须与文件名时间戳一致");
  }
  if (!title?.startsWith("理解：") || title === "理解：") {
    errors.push("title 必须是非空的「理解：<目标>」");
  }
  if (!tags.includes("is") || !tags.includes("act")) {
    errors.push("v5 标签必须同时包含 is 与 act");
  }

  if (headings.length < 2 || headings.length > 4) {
    errors.push("v5 正文使用两到四个随内容生出的一级标题");
  }
  const fixedHeading = /^(?:是什么|定义|如何运作|怎样运作|机制|认知改变|认知修正|行动指导|怎么做|建议|开场|展开|结尾|引入|分析|结论|说明|正文|第一部分|第二部分|第三部分)$/u;
  const headingsAreDistinct = new Set(headings).size === headings.length;
  if (!headingsAreDistinct || headings.some((heading) => [...heading].length < 4 || [...heading].length > 28 || fixedHeading.test(heading))) {
    errors.push("v5 标题必须具体、互不重复并由内容生出，不能把理解步骤直接用作栏目名");
  }

  const bodies = headings.map((heading) => sectionBody(content, heading, format) ?? "");
  if (bodies.some((body) => /^\s*(?:[-+] |\d+[.)]\s+)/mu.test(body))) {
    errors.push("v5 正文不能使用项目符号或编号清单；理解步骤要写成连续讲解");
  }
  if (bodies.some((body) => EXPOSED_FRAMEWORK_LABEL.test(body))) {
    errors.push("v5 正文不能暴露「定义 / 运作 / 认知改变 / 行动指导」等字段标签");
  }

  const paragraphsBySection = bodies.map(paragraphs);
  const paragraphCount = paragraphsBySection.reduce((sum, items) => sum + items.length, 0);
  if (paragraphsBySection.some((items) => items.length < 1) || paragraphCount < 4 || paragraphCount > 10) {
    errors.push("v5 每节至少一个自然段，全文保持四到十段，让理解充分但不为结构填充篇幅");
  }

  const visibleBody = bodies.join("\n\n");
  const visibleChars = [...visibleBody.replace(/\s/gu, "")].length;
  if (visibleChars < 380) {
    errors.push("v5 正文过短，尚不足以讲清定义、运作、认知修正与行动判断");
  }

  const definition = metadataValue(content, "definition", format);
  if (!definition) {
    errors.push("v5 必须用 definition 元数据记录 X 是什么以及关键边界");
  } else if ([...definition].length < 18 || [...definition].length > 160 || /^(?:一种东西|某种事物|顾名思义|简单来说就是)/u.test(definition)) {
    errors.push("v5 definition 要用普通话给出上位类别与关键差别，不能只写空泛同义反复");
  }

  const operation = metadataValue(content, "operation", format);
  const operationVerb = /(?:输入|输出|映射|比较|选择|计算|组织|连接|限制|决定|调整|保留|排除|生成|改变|作用|把|将|让|使|通过|根据|按照)/u;
  if (!operation) {
    errors.push("v5 必须用 operation 元数据记录 X 怎样起作用");
  } else if ([...operation].length < 18 || [...operation].length > 200 || !operationVerb.test(operation)) {
    errors.push("v5 operation 要说清关键动作以及什么因此改变，不能只重复用途或影响");
  }

  const recognition = metadataValue(content, "recognition", format);
  const recognitionShift = /(?:不是|不再|原来|以为|意味着|这使|改变|不能只|不能再|应当从|关键不在|关键在|真正)/u;
  if (!recognition) {
    errors.push("v5 必须用 recognition 元数据记录这番理解修正了哪种旧判断");
  } else if ([...recognition].length < 18 || [...recognition].length > 200 || !recognitionShift.test(recognition)) {
    errors.push("v5 recognition 要写出理解前后的判断差别，不能另起一句抽象感想");
  }

  const guidance = metadataValue(content, "guidance", format);
  const guidanceAction = /(?:先|检查|比较|区分|确认|判断|测试|验证|追问|识别|选择|记录|调整|修改|不要|避免|看|问)/u;
  const genericGuidance = /^(?:今后|以后)?(?:对此)?(?:保持关注|保持重视|提高认识|综合考虑|谨慎对待|具体情况具体分析)/u;
  if (!guidance) {
    errors.push("v5 必须用 guidance 元数据记录面对 X 时怎样观察、判断或行动");
  } else if ([...guidance].length < 18 || [...guidance].length > 220 || !guidanceAction.test(guidance) || genericGuidance.test(guidance)) {
    errors.push("v5 guidance 要给出使用了前述机制的具体判断抓手，不能写万能建议");
  }

  const basis = metadataValue(content, "basis", format);
  if (!basis) {
    errors.push("v5 必须用 basis 元数据记录事实基础");
  } else if (/(?:据说|听说|传闻|有人说|大概|也许|可能是|我觉得|我感觉)/u.test(basis)) {
    errors.push("v5 basis 不能用传闻、感觉或未标明的可能性冒充事实根据");
  }

  const falsifier = metadataValue(content, "falsifier", format);
  if (!falsifier) {
    errors.push("v5 必须用 falsifier 元数据记录什么事实会推翻当前解释");
  } else if (!/(?:如果|若).*(?:站不住|不成立|重写|推翻|需要改)/su.test(falsifier)) {
    errors.push("v5 falsifier 必须明确写出在什么事实下当前解释会不成立或需要重写");
  }

  const semicolons = visibleBody.match(/；/gu)?.length ?? 0;
  const listCommas = visibleBody.match(/、/gu)?.length ?? 0;
  if (semicolons > 4 || listCommas > 12) {
    errors.push("v5 正文仍有明显的要素罗列：减少分号和连续顿号，让一句话只推进一个主要变化");
  }
  const longSentence = visibleBody.split(/[。！？\n]/u).map((part) => part.trim()).find((part) => [...part].length > 100);
  if (longSentence) {
    errors.push("v5 存在超过 100 字的长句；拆开抽象名词链，让理解分步发生");
  }

  if (OLD_CONTRACT.test(content)) {
    errors.push("v5 不得残留本质核心、The One、结构迁移或 A -> B 旧合同");
  }
  return { definition, operation, recognition, guidance };
}

function validateV4(
  fileName: string,
  content: string,
  format: NoteFormat,
  identifier: string | undefined,
  title: string | undefined,
  tags: string[],
  headings: string[],
  errors: string[],
): string | undefined {
  const fileMatch = fileName.match(/^(\d{8}T\d{6})--动词-(.+)__is\.(org|md)$/u);
  if (!fileMatch || !fileMatch[2]?.trim()) {
    errors.push("v4 文件名必须符合 YYYYMMDDTHHMMSS--动词-<目标>__is.org 或 __is.md");
  } else if (identifier && identifier !== fileMatch[1]) {
    errors.push("identifier 必须与文件名时间戳一致");
  }
  if (!title?.startsWith("动词：") || title === "动词：") {
    errors.push("title 必须是非空的「动词：<目标>」");
  }
  if (!tags.includes("is") || !tags.includes("act")) {
    errors.push("v4 标签必须同时包含 is 与 act");
  }

  if (headings.length < 2 || headings.length > 4) {
    errors.push("v4 正文使用两到四个随内容生出的一级标题，篇幅随题目自然伸缩");
  }
  const genericHeading = /^(?:开场|展开|结尾|引入|分析|结论|说明|正文|第一部分|第二部分|第三部分)$/u;
  const headingsAreDistinct = new Set(headings).size === headings.length;
  if (!headingsAreDistinct || headings.some((heading) => [...heading].length < 4 || [...heading].length > 28 || V3_HEADINGS.includes(heading) || genericHeading.test(heading))) {
    errors.push("v4 标题必须具体、互不重复并由主题内容生出，不能沿用框架栏目或「开场 / 分析 / 结论」占位名");
  }

  const bodies = headings.map((heading) => sectionBody(content, heading, format) ?? "");
  if (bodies.some((body) => /^\s*(?:[-+] |\d+[.)]\s+)/mu.test(body))) {
    errors.push("v4 正文不能使用项目符号或编号清单；后台要素必须写进连续叙事");
  }
  if (bodies.some((body) => EXPOSED_FRAMEWORK_LABEL.test(body))) {
    errors.push("v4 正文不能暴露「规则 / 分配 / 反制 / 边界」等字段标签");
  }

  const paragraphsBySection = bodies.map(paragraphs);
  const paragraphCount = paragraphsBySection.reduce((sum, items) => sum + items.length, 0);
  if (paragraphsBySection.some((items) => items.length < 2) || paragraphCount < 5 || paragraphCount > 12) {
    errors.push("v4 每节至少两个自然段，全文保持五到十二段，让解释有展开也有收束");
  }

  const visibleBody = bodies.join("\n\n");
  const visibleChars = [...visibleBody.replace(/\s/gu, "")].length;
  if (visibleChars < 450) {
    errors.push("v4 正文过短，尚不足以让场景、选择、反制与未决问题自然展开");
  }
  const firstParagraph = paragraphsBySection[0]?.[0] ?? "";
  if (!/(?:你|我们|人们|一位|一个|一家|一辆|一场|一天|当.+时|早上|晚上|路边|办公室|手机|屏幕|会议|门口|车里|走进|打开|拿起|站在)/u.test(firstParagraph)) {
    errors.push("v4 第一段必须让读者先看见具体的人、场景或动作，再进入抽象判断");
  }

  const action = metadataValue(content, "action", format);
  if (!action) {
    errors.push("v4 必须用 action 元数据保存全文唯一的中心动作");
  } else {
    validateV4ActionContract(action, errors);
  }

  const basis = metadataValue(content, "basis", format);
  if (!basis) {
    errors.push("v4 必须用 basis 元数据记录事实基础");
  } else if (/(?:据说|听说|传闻|有人说|大概|也许|可能是|我觉得|我感觉)/u.test(basis)) {
    errors.push("v4 basis 不能用传闻、感觉或未标明的可能性冒充事实根据");
  }

  const falsifier = metadataValue(content, "falsifier", format);
  if (!falsifier) {
    errors.push("v4 必须用 falsifier 元数据记录什么事实会推翻当前解释");
  } else if (!/(?:如果|若).*(?:站不住|不成立|重写|推翻|需要改)/su.test(falsifier)) {
    errors.push("v4 falsifier 必须明确写出在什么事实下当前解释会不成立或需要重写");
  }

  const semicolons = visibleBody.match(/；/gu)?.length ?? 0;
  const listCommas = visibleBody.match(/、/gu)?.length ?? 0;
  if (semicolons > 4 || listCommas > 14) {
    errors.push("v4 正文仍有明显的要素罗列：减少分号和连续顿号，让一句话只推进一个主要变化");
  }
  const longSentence = visibleBody.split(/[。！？\n]/u).map((part) => part.trim()).find((part) => [...part].length > 100);
  if (longSentence) {
    errors.push("v4 存在超过 100 字的长句；拆开抽象名词链，让因果分步发生");
  }

  const finalBody = bodies.at(-1) ?? "";
  if (!finalBody.trim().endsWith("？")) {
    errors.push("v4 必须以一个由全文逼出的真问题结束");
  }

  if (OLD_CONTRACT.test(content)) {
    errors.push("v4 不得残留本质核心、The One、结构迁移或 A -> B 旧合同");
  }
  return action;
}

function validateV3(
  fileName: string,
  content: string,
  format: NoteFormat,
  identifier: string | undefined,
  title: string | undefined,
  tags: string[],
  headings: string[],
  errors: string[],
): string | undefined {
  const fileMatch = fileName.match(/^(\d{8}T\d{6})--动词-(.+)__is\.(org|md)$/u);
  if (!fileMatch || !fileMatch[2]?.trim()) {
    errors.push("v3 文件名必须符合 YYYYMMDDTHHMMSS--动词-<目标>__is.org 或 __is.md");
  } else if (identifier && identifier !== fileMatch[1]) {
    errors.push("identifier 必须与文件名时间戳一致");
  }
  if (!title?.startsWith("动词：") || title === "动词：") errors.push("title 必须是非空的「动词：<目标>」");
  if (!tags.includes("is") || !tags.includes("act")) errors.push("v3 标签必须同时包含 is 与 act");
  if (JSON.stringify(headings) !== JSON.stringify(V3_HEADINGS)) {
    errors.push(`v3 一级标题必须严格依次为：${V3_HEADINGS.join(" / ")}`);
  }

  const valuesBySection = new Map<string, Map<string, string>>();
  for (const [heading, labels] of Object.entries(V3_SECTION_LABELS)) {
    const body = sectionBody(content, heading, format) ?? "";
    const lines = nonEmptyLines(body);
    const entries = parseEmphasizedBullets(body, format);
    if (lines.length !== entries.length || !hasExactLabels(entries, labels)) {
      errors.push(`「${heading}」必须且只能依次使用：${labels.join(" / ")}`);
    }
    valuesBySection.set(heading, new Map(entries.map(({ label, value }) => [label, value])));
  }

  const judgment = valuesBySection.get("动词判断") ?? new Map<string, string>();
  const reframed = judgment.get("改问") ?? "";
  if (reframed && (!reframed.includes("凭什么") || !reframed.includes("而不是"))) {
    errors.push("「改问」必须同时保留「凭什么」与「而不是」");
  }
  const action = judgment.get("作");
  if (action) validateV3ActionContract(action, errors, "「作」");

  const possibility = valuesBySection.get("一个不") ?? new Map<string, string>();
  const given = possibility.get("给定") ?? "";
  const unchosen = possibility.get("未选") ?? "";
  if (unchosen && (/^(?:无|没有|其他可能|未知)$/u.test(unchosen) || unchosen === given)) {
    errors.push("「未选」必须是一种不同于给定现实的真实可理解安排");
  }

  const openQuestions = valuesBySection.get("未决问题") ?? new Map<string, string>();
  for (const label of ["凭什么", "接下来"]) {
    const value = openQuestions.get(label);
    if (value && !value.endsWith("？")) errors.push(`「未决问题」的「${label}」必须以全角问号结束`);
  }

  const reaction = valuesBySection.get("卷入与反制")?.get("反制") ?? "";
  const reactionHasAdoption = /(?:依赖|执行|采用|内化|固化|嵌入|成为.+(?:依据|标准|入口)|制度化)/u.test(reaction);
  const reactionHasBackPressure = /(?:反过来|也(?:会|将|必须)|迫使|要求|限制|规定|塑造|约束|支配|诱导|难以|不得|只能)/u.test(reaction);
  if (reaction && (!reactionHasAdoption || !reactionHasBackPressure)) {
    errors.push("「反制」必须说明创造物因被依赖、执行或内化，怎样反过来规定创造者；纯粹坏后果不合格");
  }

  const origin = valuesBySection.get("历史与未来")?.get("本源") ?? "";
  const originHasBacktrace = /(?:逆溯|回溯|追到|定位)/u.test(origin);
  const originHasCreationEvent = /(?:创建|创制|建立|制定|开始|事件|时刻|选择)/u.test(origin);
  const originHasPersistentProblem = /(?:持续|反复|不断|重来|不能删除|不可删除|未解决|尚未解决|问题)/u.test(origin);
  if (origin && (!originHasBacktrace || !originHasCreationEvent || !originHasPersistentProblem)) {
    errors.push("「本源」必须从当前困境逆溯到创建秩序事件，并指出由它持续生成、不能轻易删除的问题；不是寻找时间上最早的原点");
  }

  const basis = valuesBySection.get("根据与边界")?.get("根据") ?? "";
  if (basis && /(?:据说|听说|传闻|有人说|大概|也许|可能是|我觉得|我感觉)/u.test(basis)) {
    errors.push("「根据」不能用传闻、感觉或未标明的可能性冒充证据；不确定内容应放入「推断」或「尚缺」");
  }
  const falsifier = valuesBySection.get("根据与边界")?.get("反驳") ?? "";
  if (falsifier && !/(?:如果|若|一旦)/u.test(falsifier)) {
    errors.push("「反驳」必须用「如果 / 若 / 一旦」写出会推翻当前判断的新事实");
  }
  if (OLD_CONTRACT.test(content)) errors.push("v3 不得残留本质核心、The One、结构迁移或 A -> B 旧合同");
  return action;
}

function validateLegacy(
  fileName: string,
  content: string,
  format: NoteFormat,
  schema: NoteSchema,
  identifier: string | undefined,
  title: string | undefined,
  tags: string[],
  headings: string[],
  errors: string[],
): string | undefined {
  const fileMatch = fileName.match(/^(\d{8}T\d{6})--本质-(.+)__is\.(org|md)$/u);
  if (!fileMatch || !fileMatch[2]?.trim()) {
    errors.push("历史文件名必须符合 YYYYMMDDTHHMMSS--本质-<目标>__is.org 或 __is.md");
  } else if (identifier && identifier !== fileMatch[1]) {
    errors.push("identifier 必须与文件名时间戳一致");
  }
  if (!title?.startsWith("本质：") || title === "本质：") errors.push("历史 title 必须是非空的「本质：<目标>」");
  if (!tags.includes("is")) errors.push("历史标签必须包含 is");
  const required = schema === V2_SCHEMA ? V2_HEADINGS : LEGACY_HEADINGS;
  if (JSON.stringify(headings) !== JSON.stringify(required)) {
    errors.push(`历史一级标题必须严格依次为：${required.join(" / ")}`);
  }

  const essence = sectionBody(content, "本质", format) ?? "";
  const coreLines = nonEmptyLines(essence).filter((line) => line.startsWith("核心："));
  const core = coreLines.length === 1 ? coreLines[0]?.replace(/^核心：/u, "").trim() : undefined;
  if (!core) errors.push("历史笔记必须在「本质」中保留唯一非空核心");

  const complete = sectionBody(content, "完整表达", format) ?? "";
  const completeLines = nonEmptyLines(complete).filter((line) => line.startsWith("完整："));
  if (completeLines.length !== 1) {
    errors.push("历史笔记必须保留唯一「完整：...」");
  } else if (core && parseCompleteCore(completeLines[0] ?? "") !== core) {
    errors.push("历史完整表达的落脚核心必须与「核心：」一致");
  }

  if (schema === V2_SCHEMA) {
    const transfer = parseEmphasizedBullets(sectionBody(content, "结构迁移", format) ?? "", format);
    if (!hasExactLabels(transfer, ["结构式", "变量", "迁移", "边界"])) {
      errors.push("v2「结构迁移」必须依次保留：结构式 / 变量 / 迁移 / 边界");
    }
  }
  return core;
}

export function validateNoteText(filePath: string, content: string): ValidationResult {
  const errors: string[] = [];
  const fileName = basename(filePath);
  const extension = fileName.match(/\.(org|md)$/u)?.[1] as NoteFormat | undefined;
  const format = extension ?? "org";
  if (!extension) errors.push("文件扩展名必须是 .org 或 .md");

  const declaredSchema = metadataValue(content, "schema", format);
  const schema: NoteSchema | undefined = declaredSchema === V5_SCHEMA
    ? V5_SCHEMA
    : declaredSchema === V4_SCHEMA
    ? V4_SCHEMA
    : declaredSchema === V3_SCHEMA
    ? V3_SCHEMA
    : declaredSchema === V2_SCHEMA
    ? V2_SCHEMA
    : declaredSchema
    ? undefined
    : "legacy";
  if (!schema) errors.push(`schema 只支持 ${V5_SCHEMA}、${V4_SCHEMA}、${V3_SCHEMA}、${V2_SCHEMA} 或无 schema 的 legacy`);

  const title = metadataValue(content, "title", format);
  const date = metadataValue(content, "date", format);
  const identifier = metadataValue(content, "identifier", format);
  const rawTags = metadataValue(content, format === "org" ? "filetags" : "tags", format);
  const tags = rawTags?.replace(/[\[\],:]/gu, " ").split(/\s+/u).filter(Boolean) ?? [];
  const headingPattern = format === "org" ? /^\* ([^\n]+?)\s*$/gmu : /^# ([^\n]+?)\s*$/gmu;
  const headings = [...content.matchAll(headingPattern)].map((match) => match[1] ?? "");

  if (!date || (format === "org" && !/^\[[^\]]+\]$/u.test(date))) errors.push("date 缺失或格式不正确");
  if (!identifier || !/^\d{8}T\d{6}$/u.test(identifier)) errors.push("identifier 必须是 YYYYMMDDTHHMMSS");
  validateSyntax(content, format, errors);

  let definition: string | undefined;
  let operation: string | undefined;
  let recognition: string | undefined;
  let guidance: string | undefined;
  let action: string | undefined;
  let core: string | undefined;
  if (schema === V5_SCHEMA) {
    ({ definition, operation, recognition, guidance } = validateV5(fileName, content, format, identifier, title, tags, headings, errors));
  } else if (schema === V4_SCHEMA) {
    action = validateV4(fileName, content, format, identifier, title, tags, headings, errors);
  } else if (schema === V3_SCHEMA) {
    action = validateV3(fileName, content, format, identifier, title, tags, headings, errors);
  } else if (schema) {
    core = validateLegacy(fileName, content, format, schema, identifier, title, tags, headings, errors);
  }
  return { ok: errors.length === 0, errors, identifier, schema, definition, operation, recognition, guidance, action, core };
}

export async function validateNoteFile(filePath: string): Promise<ValidationResult> {
  const file = Bun.file(filePath);
  if (!(await file.exists())) return { ok: false, errors: [`文件不存在：${filePath}`] };
  return validateNoteText(filePath, await file.text());
}

if (import.meta.main) {
  const filePath = Bun.argv[2];
  if (filePath === "--help" || filePath === "-h") {
    console.log("用法：bun ValidateNote.ts <note-file>");
    console.log("校验 ljg-is-v5 可使用理解笔记，并兼容读取 ljg-is-v4、ljg-is-v3、ljg-is-v2 与 legacy 笔记。");
    process.exit(0);
  }
  if (!filePath) {
    console.error(JSON.stringify({ status: "error", errors: ["用法：bun ValidateNote.ts <note-file>"] }));
    process.exit(2);
  }
  const result = await validateNoteFile(filePath);
  if (!result.ok) {
    console.error(JSON.stringify({ status: "error", ...result }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ status: "ok", path: filePath, ...result }, null, 2));
}
