#!/usr/bin/env bun

import { basename } from "node:path";
import { readFileSync } from "node:fs";

export interface Result {
  ok: boolean;
  errors: string[];
  warnings: string[];
  stats: Record<string, string | number | boolean>;
}

const requiredHeaders = [
  "title", "subtitle", "description", "date", "filetags",
  "identifier", "source", "authors", "venue",
];

const genericHeadings = new Set([
  "摘要", "背景", "问题", "研究问题", "方法", "实验", "实验结果",
  "结果", "发现", "核心发现", "局限", "局限性", "结论", "启示",
  "人生启示", "金句", "我能带走什么", "它到底在解决什么", "它真正看见了什么",
]);

const genericAnchors = new Set([
  "问题", "方法", "模型", "系统", "实验", "结果", "发现", "关系", "变化", "结论", "边界",
]);

const identityFields = [
  "贡献类型", "研究对象", "旧缺口", "作者产物", "产物输入→处理→输出",
  "不可省略的研究问题或主线", "主线为什么属于同一篇论文", "各主线证据状态",
  "这篇没有声称什么", "正文论文锚点", "前两标题定向锚点", "三十秒论文复述", "可迁移性反测",
];

const understandingFields = [
  "读者进入什么具体处境", "最初最自然会怎样理解或处理", "哪个论文事实、结果或反例让它不够",
  "作者增加了什么关系、动作或判断尺度", "回看原处境，什么已经改变", "新结果自然带出什么问题",
  "贯穿全文的扶手", "载体为什么可以保持或必须更换", "结尾回到哪里", "陌生读者三句复述",
  "原文依据与简化边界",
];

const generatorFields = [
  "中心生成器", "输入、起点或当前状态", "关键作用关系", "结果方向或终点",
  "怎样推出两个远距发现", "能预测的相邻条件", "失效边界", "正文生成器锚点",
  "是否需要在前两个一级标题内运行", "是否需要视觉表示", "图后由哪个载体运行",
];

const experimentFields = [
  "实验在问什么", "固定了什么", "改变了什么", "与谁比较", "代表结果形状",
  "可感尺度翻译", "这个结果改变什么判断", "这个结果不能推出什么", "正文中心证据锚点",
];

const evidenceFields = [
  "名称", "角色", "位置", "论文直接结果", "支持判断", "正文锚点", "决定", "删除测试",
];

const frontstageFields = [
  "名称", "唯一职责", "设置或起点", "结果或后果", "改变的关系", "下一问",
];

const continuityFields = [
  "开篇留下的真实问题", "转折链", "每次换载体为什么不可提前",
  "换序测试", "指标堆反测", "摘句拼接反测",
];

const finalFields = [
  "作者最终纠正的自然误解", "正文哪两个相隔较远的转折共同托住它",
  "最后收束正文锚点", "可替换性反测", "是否混入新证据、术语或建议",
];

const readerFields = [
  "无数字叙事复述", "叙事主位", "标题换序验收",
  "研究问题", "作者产物／贡献", "输入→组件／关系→输出",
  "中心实验问题／固定项／比较者／结果／意义", "最强边界",
  "三句认识更新复述", "解释重建",
];

function substantive(value: string): boolean {
  const cleaned = value.trim();
  return cleaned.length >= 1 && !/^\{.*\}$/.test(cleaned) && !/^[:：|｜\s-]+$/.test(cleaned);
}

function yesNoDecision(value: string): boolean {
  return /^(?:是|否)(?:\b|[—：:，,。\s]|$)/.test(value.trim());
}

function lineField(content: string, field: string): string {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return content.match(new RegExp(`^- ${escaped}[：:][ \\t]*(.*)$`, "m"))?.[1]?.trim() ?? "";
}

function segmentField(line: string, field: string): string {
  const normalized = line.replace(/^- \[[^\]]+\]\s*/, "");
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return normalized.match(new RegExp(`(?:^|[｜|])\\s*${escaped}[：:]\\s*([^｜|]*)`))?.[1]?.trim() ?? "";
}

function parseAnchors(value: string): string[] {
  return value.split(/[｜|]/).map((item) => item.trim()).filter(substantive);
}

function displayWidth(line: string): number {
  return [...line].reduce((sum, char) => sum + (/[^\u0000-\u00ff]/.test(char) ? 2 : 1), 0);
}

function paragraphList(body: string): string[] {
  return body
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph && !/^(?:#\+|\*)/.test(paragraph));
}

export function validate(content: string, file: string, paperMap?: string): Result {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const header of requiredHeaders) {
    if (!new RegExp(`^#\\+${header}:\\s+\\S`, "im").test(content)) {
      errors.push(`缺少或为空的 #+${header}`);
    }
  }

  const filenameIdentifier = basename(file).match(/^(\d{8}T\d{6})--paper-/)?.[1] ?? "";
  const identifier = content.match(/^#\+identifier:\s*(\d{8}T\d{6})\s*$/im)?.[1] ?? "";
  if (!filenameIdentifier) errors.push("文件名不是 Denote paper 时间戳格式");
  if (!identifier || identifier !== filenameIdentifier) {
    errors.push(`IDENTIFIER ${identifier || "为空"} 与文件名 ${filenameIdentifier || basename(file)} 不一致`);
  }

  const sourceLines = content.match(/^#\+source:.*$/gim) ?? [];
  if (sourceLines.length !== 1) errors.push(`#+source 必须且只能出现一次，当前为 ${sourceLines.length}`);
  if (sourceLines.length === 1 && !/^#\+source:\s+(?:https?:\/\/\S+|\/[^\r\n]+?)\s*$/i.test(sourceLines[0])) {
    errors.push("#+source 只放一个裸原始 URL 或绝对本地原文路径，不加描述或参考资料列表");
  }

  const headingMatches = [...content.matchAll(/^\* ([^*\n].*)$/gm)];
  const headings = headingMatches.map((match) => match[1].trim());
  if (headings.length < 2) errors.push(`至少需要 2 个由事件、变化或条件命名的一级标题，当前为 ${headings.length}`);
  const genericHits = headings.filter((heading) => genericHeadings.has(heading.replace(/\s+/g, "")));
  if (genericHits.length) errors.push(`一级标题不能使用后台栏目或空泛标签：${[...new Set(genericHits)].join("、")}`);

  const bodyStart = headingMatches[0]?.index ?? content.length;
  const body = content.slice(bodyStart);
  const thirdHeadingStart = headingMatches[2]?.index ?? content.length;
  const earlyBody = content.slice(bodyStart, thirdHeadingStart);
  const lastHeadingStart = headingMatches.at(-1)?.index ?? bodyStart;
  const finalBody = content.slice(lastHeadingStart);

  if (/(?:零号模型|FX\s*回流|x\s*\/\s*R\s*\/\s*f\s*\/\s*E|\{\{[^}]+\}\}|\b(?:TODO|TBD|PLACEHOLDER)\b)/i.test(body)) {
    errors.push("正文含内部分析标签、模板占位或未完成标记");
  }

  const backstagePattern = /(?:paper-map|证据台账|本轮核验|未参与写作|讲解者构造|旧稿依据|核验状态|决定：进入正文|决定：留在后台)/g;
  const backstageHits = [...body.matchAll(backstagePattern)].map((match) => match[0]);
  if (backstageHits.length) {
    errors.push(`正文泄漏后台研究或核验语言：${[...new Set(backstageHits)].join("、")}`);
  }

  const paragraphs = paragraphList(body);
  const denseParagraphs = paragraphs.filter((paragraph) => [...paragraph.replace(/\s/g, "")].length > 240).length;
  if (denseParagraphs) warnings.push(`正文有 ${denseParagraphs} 段超过 240 字；检查是否一次塞入多个承重关系`);
  const numericCounts = paragraphs.map((paragraph) => (paragraph.match(/\d+(?:\.\d+)?%?/g) ?? []).length);
  const numericTokenCount = numericCounts.reduce((sum, count) => sum + count, 0);
  const numericParagraphCount = numericCounts.filter((count) => count > 0).length;
  const severeNumericPileParagraphs = numericCounts.filter((count) => count >= 7).length;
  const numericPileParagraphs = numericCounts.filter((count) => count >= 5 && count < 7).length;
  if (severeNumericPileParagraphs) errors.push(`正文有 ${severeNumericPileParagraphs} 段包含至少 7 个数字，已退化成指标堆；每段只保留一个比较形状，其余移回 paper-map`);
  if (numericPileParagraphs) warnings.push(`正文有 ${numericPileParagraphs} 段包含 5–6 个数字；确认它仍是一个比较形状，并删除重复百分比或区间细节`);

  const exampleBlocks = [...content.matchAll(/#\+begin_example\s*\n([\s\S]*?)#\+end_example/gim)];
  if (exampleBlocks.length > 1) errors.push("最多保留一个 Markdown 围栏图块");
  const maxDiagramWidth = exampleBlocks.reduce((max, block) => {
    const width = block[1].split(/\r?\n/).reduce((lineMax, line) => Math.max(lineMax, displayWidth(line)), 0);
    return Math.max(max, width);
  }, 0);
  if (maxDiagramWidth > 80) errors.push(`ASCII 图宽度 ${maxDiagramWidth}，超过 80 显示列`);

  let identityAnchorCount = 0;
  let orientationAnchorCount = 0;
  let evidenceCount = 0;
  let centralEvidenceCount = 0;
  let necessaryEvidenceCount = 0;
  let backgroundEvidenceCount = 0;
  let frontstageCount = 0;
  let generatorExists = "";
  let quantitativeException = false;
  let paperMapVersion = "";

  if (!paperMap) {
    errors.push("所有论文笔记都必须提供 --map 后台 paper-map");
  } else {
    const version = lineField(paperMap, "合同版本");
    paperMapVersion = version;
    if (!/^(?:1|2)$/.test(version)) errors.push(`paper-map 合同版本必须是 1 或 2，当前为 ${version || "为空"}`);
    if (version === "1") warnings.push("paper-map 合同版本 1 为兼容模式；新笔记应使用版本 2 的全文叙事门");

    for (const field of ["规范原文", "论文身份", "原文哈希", "材料能支持到", "外部指令扫描"]) {
      if (!substantive(lineField(paperMap, field))) errors.push(`paper-map 缺少材料字段：${field}`);
    }
    const injectionScan = lineField(paperMap, "外部指令扫描");
    if (substantive(injectionScan) && !/^(?:未发现|已停止)/.test(injectionScan)) {
      errors.push("“外部指令扫描”必须以“未发现”或“已停止”开头");
    }

    for (const field of identityFields) {
      if (!substantive(lineField(paperMap, field))) errors.push(`论文身份门未填：${field}`);
    }
    const contributionType = lineField(paperMap, "贡献类型");
    if (substantive(contributionType) && !/^(?:方法|干预|解释|理论|测量|评测|资源|系统)/.test(contributionType)) {
      errors.push("贡献类型必须从方法／干预、解释／理论、测量／评测、资源／系统中选择主类型");
    }

    const uniqueResultShape = lineField(paperMap, "正文唯一结果形状");
    const extraQuantitativeForeground = lineField(paperMap, "额外定量前台");
    if (version === "2") {
      if (!substantive(uniqueResultShape)) errors.push("中心实验坐标未填：正文唯一结果形状");
      else if (!body.includes(uniqueResultShape)) errors.push(`正文唯一结果形状“${uniqueResultShape}”没有出现在正文`);
      if (!yesNoDecision(extraQuantitativeForeground)) errors.push("“额外定量前台”必须明确写是或否并说明理由");
    }
    quantitativeException = /^是/.test(extraQuantitativeForeground);
    if (quantitativeException && !/^(?:测量|评测)/.test(contributionType)) {
      errors.push("额外定量前台只适用于主贡献为测量／评测且无法用一个结果形状讲清新尺子的论文");
    }
    const numericTokenLimit = quantitativeException ? 8 : 4;
    const numericParagraphLimit = quantitativeException ? 2 : 1;
    if (numericTokenCount > numericTokenLimit || numericParagraphCount > numericParagraphLimit) {
      errors.push(
        `全文数字主位：正文共有 ${numericTokenCount} 个数字、分散在 ${numericParagraphCount} 段；` +
        `${quantitativeException ? "评测例外" : "默认合同"}最多允许 ${numericTokenLimit} 个数字、${numericParagraphLimit} 个定量段落。` +
        "段落拆分不能把证据清单变成叙事，其余精确量移回 paper-map",
      );
    }

    const identityAnchors = parseAnchors(lineField(paperMap, "正文论文锚点"));
    identityAnchorCount = identityAnchors.length;
    if (identityAnchors.length < 2) errors.push(`正文论文锚点至少 2 个，当前为 ${identityAnchors.length}`);
    const genericIdentityAnchors = identityAnchors.filter((anchor) => genericAnchors.has(anchor));
    if (genericIdentityAnchors.length) errors.push(`论文锚点过于通用：${genericIdentityAnchors.join("、")}`);
    const missingIdentityAnchors = identityAnchors.filter((anchor) => !body.includes(anchor));
    if (missingIdentityAnchors.length) errors.push(`这些论文锚点没有出现在正文：${missingIdentityAnchors.join("、")}`);

    const orientationAnchors = parseAnchors(lineField(paperMap, "前两标题定向锚点"));
    orientationAnchorCount = orientationAnchors.length;
    if (orientationAnchors.length < 2) errors.push(`前两标题定向锚点至少 2 个，当前为 ${orientationAnchors.length}`);
    const lateOrientationAnchors = orientationAnchors.filter((anchor) => !earlyBody.includes(anchor));
    if (lateOrientationAnchors.length) errors.push(`这些定向锚点没有在前两个一级标题内出现：${lateOrientationAnchors.join("、")}`);

    for (const field of understandingFields) {
      if (!substantive(lineField(paperMap, field))) errors.push(`认识更新门未填：${field}`);
    }

    generatorExists = lineField(paperMap, "是否存在中心生成器");
    if (!yesNoDecision(generatorExists)) {
      errors.push("“是否存在中心生成器”必须明确写是或否并说明理由");
    } else if (/^是/.test(generatorExists)) {
      for (const field of generatorFields) {
        if (!substantive(lineField(paperMap, field))) errors.push(`解释生成器门未填：${field}`);
      }
      const generatorAnchors = parseAnchors(lineField(paperMap, "正文生成器锚点"));
      if (!generatorAnchors.length) errors.push("声明存在生成器时至少需要 1 个正文生成器锚点");
      const missingGeneratorAnchors = generatorAnchors.filter((anchor) => !body.includes(anchor));
      if (missingGeneratorAnchors.length) errors.push(`这些生成器锚点没有出现在正文：${missingGeneratorAnchors.join("、")}`);
      const earlyDecision = lineField(paperMap, "是否需要在前两个一级标题内运行");
      if (!yesNoDecision(earlyDecision)) errors.push("“是否需要在前两个一级标题内运行”必须明确写是或否并说明理由");
      if (/^是/.test(earlyDecision)) {
        const lateGeneratorAnchors = generatorAnchors.filter((anchor) => !earlyBody.includes(anchor));
        if (lateGeneratorAnchors.length) errors.push(`生成器要求前置，但这些锚点出现过晚：${lateGeneratorAnchors.join("、")}`);
      }
    } else if (/^否/.test(generatorExists)) {
      const generator = lineField(paperMap, "中心生成器");
      if (!/未找到|不存在/.test(generator)) errors.push("声明没有中心生成器时，“中心生成器”应明确写未找到或不存在");
    }

    const visualDecision = lineField(paperMap, "是否需要视觉表示");
    if (!yesNoDecision(visualDecision)) errors.push("“是否需要视觉表示”必须明确写是或否并说明理由");
    if (/^是/.test(visualDecision)) {
      if (exampleBlocks.length !== 1) errors.push(`声明需要视觉表示时，正文必须恰好有 1 个 example 图块，当前为 ${exampleBlocks.length}`);
      const carrier = lineField(paperMap, "图后由哪个载体运行");
      if (!substantive(carrier)) errors.push("声明需要视觉表示时必须写明图后运行载体");
      if (substantive(carrier) && exampleBlocks.length === 1) {
        const afterDiagram = content.slice((exampleBlocks[0].index ?? 0) + exampleBlocks[0][0].length);
        if (!afterDiagram.includes(carrier)) errors.push(`图后运行载体“${carrier}”没有出现在图块之后`);
      }
    } else if (/^否/.test(visualDecision) && exampleBlocks.length) {
      warnings.push("paper-map 声明不需要视觉表示，但正文含 example 图块；确认它是否真正减少关系负担");
    }

    for (const field of experimentFields) {
      if (!substantive(lineField(paperMap, field))) errors.push(`中心实验坐标未填：${field}`);
    }
    const centralAnchor = lineField(paperMap, "正文中心证据锚点");
    if (substantive(centralAnchor) && !body.includes(centralAnchor)) errors.push(`正文中心证据锚点“${centralAnchor}”没有出现在正文`);

    const evidenceLines = [...paperMap.matchAll(/^- \[evidence\]\s+.+$/gm)].map((match) => match[0]);
    evidenceCount = evidenceLines.length;
    for (const line of evidenceLines) {
      const missing = evidenceFields.filter((field) => !substantive(segmentField(line, field)));
      if (missing.length) errors.push(`证据条目缺少字段：${missing.join("、")}；条目=${line}`);
      const role = segmentField(line, "角色");
      const decision = segmentField(line, "决定");
      if (!/^(?:中心|必要|后台)$/.test(role)) errors.push(`证据角色只能是中心／必要／后台：${role || "为空"}`);
      if (!/^(?:进入正文|合并|留在后台)$/.test(decision)) errors.push(`证据决定只能是进入正文／合并／留在后台：${decision || "为空"}`);
      if (role === "中心") centralEvidenceCount++;
      if (role === "必要") necessaryEvidenceCount++;
      if (role === "后台") backgroundEvidenceCount++;
      if (role === "后台" && decision !== "留在后台") errors.push("后台证据必须决定为“留在后台”");
      if (decision !== "留在后台") {
        const anchor = segmentField(line, "正文锚点");
        if (/^(?:无|未找到)$/.test(anchor) || !body.includes(anchor)) errors.push(`进入正文或合并的证据锚点没有出现在正文：${anchor || "为空"}`);
      }
    }
    if (!centralEvidenceCount) errors.push("证据分级至少需要 1 条中心证据");
    if (!necessaryEvidenceCount) errors.push("证据分级至少需要 1 条必要证据");
    if (!backgroundEvidenceCount) errors.push("证据分级至少需要 1 条后台证据，证明覆盖没有变成正文配额");

    const frontstageLines = [...paperMap.matchAll(/^- \[frontstage\]\s+.+$/gm)].map((match) => match[0]);
    frontstageCount = frontstageLines.length;
    if (!frontstageCount) errors.push("paper-map 至少需要 1 个前台载体");
    const responsibilities: string[] = [];
    for (const line of frontstageLines) {
      const missing = frontstageFields.filter((field) => !substantive(segmentField(line, field)));
      if (missing.length) errors.push(`前台载体缺少字段：${missing.join("、")}；条目=${line}`);
      const name = segmentField(line, "名称");
      const responsibility = segmentField(line, "唯一职责");
      if (substantive(name) && !body.includes(name)) errors.push(`前台载体“${name}”没有出现在正文`);
      if (substantive(responsibility)) responsibilities.push(responsibility);
    }
    const duplicateResponsibilities = [...new Set(responsibilities.filter((item, index, all) => all.indexOf(item) !== index))];
    if (duplicateResponsibilities.length) errors.push(`前台载体职责不能重复：${duplicateResponsibilities.join("、")}`);

    for (const field of continuityFields) {
      if (!substantive(lineField(paperMap, field))) errors.push(`叙事连续性门未填：${field}`);
    }

    for (const field of finalFields) {
      if (!substantive(lineField(paperMap, field))) errors.push(`最后收束门未填：${field}`);
    }
    const finalAnchor = lineField(paperMap, "最后收束正文锚点");
    if (substantive(finalAnchor) && !finalBody.includes(finalAnchor)) errors.push(`最后收束锚点“${finalAnchor}”没有出现在最后一个内容标题下`);
    const newMaterialDecision = lineField(paperMap, "是否混入新证据、术语或建议");
    if (substantive(newMaterialDecision) && !/^否/.test(newMaterialDecision)) errors.push("最后收束不能混入新证据、术语或建议；该字段必须以“否”开头");

    for (const field of readerFields) {
      if (version === "2" || !["无数字叙事复述", "叙事主位", "标题换序验收"].includes(field)) {
        if (!substantive(lineField(paperMap, field))) errors.push(`陌生读者验收未填：${field}`);
      }
    }
    if (version === "2") {
      const noNumberRetell = lineField(paperMap, "无数字叙事复述");
      if (/\d+(?:\.\d+)?%?/.test(noNumberRetell)) errors.push("无数字叙事复述仍含阿拉伯数字；先讲发生链，再回答实验数值");
      if (lineField(paperMap, "叙事判定") !== "NARRATIVE_PASS") errors.push("陌生读者必须先得到 NARRATIVE_PASS");
    }
    if (lineField(paperMap, "五问判定") !== "PAPER_IDENTITY_PASS") errors.push("陌生读者五问必须得到 PAPER_IDENTITY_PASS");
    if (lineField(paperMap, "三句判定") !== "UNDERSTANDING_PASS") errors.push("三句认识更新必须得到 UNDERSTANDING_PASS");
    if (lineField(paperMap, "解释重建判定") !== "RECONSTRUCTION_PASS") errors.push("解释重建必须得到 RECONSTRUCTION_PASS");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stats: {
      top_headings: headings.length,
      body_chars: [...body.replace(/\s/g, "")].length,
      identity_anchor_count: identityAnchorCount,
      orientation_anchor_count: orientationAnchorCount,
      evidence_count: evidenceCount,
      central_evidence_count: centralEvidenceCount,
      necessary_evidence_count: necessaryEvidenceCount,
      background_evidence_count: backgroundEvidenceCount,
      frontstage_count: frontstageCount,
      generator_exists: generatorExists,
      example_blocks: exampleBlocks.length,
      max_diagram_width: maxDiagramWidth,
      dense_paragraphs: denseParagraphs,
      numeric_pile_paragraphs: numericPileParagraphs,
      severe_numeric_pile_paragraphs: severeNumericPileParagraphs,
      numeric_tokens: numericTokenCount,
      numeric_paragraphs: numericParagraphCount,
      quantitative_exception: quantitativeException,
      paper_map_version: paperMapVersion,
      map_supplied: Boolean(paperMap),
    },
  };
}

function main(): never {
  const args = Bun.argv.slice(2);
  const mapFlag = args.indexOf("--map");
  const mapPath = mapFlag >= 0 ? args[mapFlag + 1] : undefined;
  const stdinMode = args.includes("--stdin");
  const positional = args.filter((arg, index) => arg !== "--stdin" && arg !== "--map" && index !== mapFlag + 1);
  const file = positional[0];

  if (!file || (mapFlag >= 0 && !mapPath)) {
    console.error("用法：bun scripts/validate_note.ts <note.md> --map <paper-map.md>");
    console.error("或：  bun scripts/validate_note.ts --stdin <denote-filename> --map <paper-map.md>");
    process.exit(2);
  }

  const content = stdinMode ? readFileSync(0, "utf8") : readFileSync(file, "utf8");
  const paperMap = mapPath ? readFileSync(mapPath, "utf8") : undefined;
  const result = validate(content, file, paperMap);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(result.ok ? 0 : 1);
}

if (import.meta.main) main();
