#!/usr/bin/env bun

import { basename } from "node:path";
import { readFileSync } from "node:fs";
import { normalizeLegacyMap } from "./paper_map_compat";

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
  "贡献类型", "研究对象", "已有方法的不足", "主要贡献", "输入、处理与输出",
  "不可省略的研究问题或主线", "主线为什么属于同一篇论文", "各主线的证据支持程度",
  "论文未作出的主张", "正文中的论文具体表述", "前两节的问题与贡献表述", "论文简述", "与其他论文的区别",
];

const understandingFields = [
  "从哪个具体问题开始", "原先会怎样理解或处理", "什么证据需要补充或修正原有理解",
  "作者补充了什么关系、做法或判断依据", "回到原问题，判断发生了什么变化", "还需要回答什么问题",
  "贯穿全文的问题或关系", "案例如何选择与衔接", "结尾回到哪里", "陌生读者三句复述",
  "示例的原文依据与简化限制",
];

const generatorFields = [
  "统一机制", "输入、起点或当前状态", "关键作用关系", "结果方向或终点",
  "如何解释两个不同发现", "改变相关条件后的预测及依据", "失效边界", "正文中的机制表述",
  "是否需要在前两节解释机制", "是否需要图示", "图后用什么例子解释",
];

const experimentFields = [
  "实验在问什么", "固定了什么", "改变了什么", "与谁比较", "主要结果及例外",
  "结果的实际意义", "这个结果改变什么判断", "这个结果不能推出什么", "正文中的核心证据表述",
];

const evidenceFields = [
  "名称", "角色", "位置", "论文直接结果", "支持判断", "正文对应表述", "决定", "取舍理由",
];

const frontstageFields = [
  "名称", "主要作用", "设置或起点", "结果或后果", "帮助理解什么", "与后文的联系",
];

const continuityFields = [
  "开头要回答的问题", "全文解释顺序", "案例之间的联系",
  "章节换序检查", "略去数字后的解释", "只保留结论会遗漏什么",
];

const finalFields = [
  "论文最终补充或修正了什么认识", "结尾依据前文哪些发现",
  "正文结尾的对应表述", "结尾与本论文的联系", "结尾是否新增证据、术语或建议",
];

const readerFields = [
  "不依赖分数的全文复述", "读者首先记住的解释", "读者对章节联系的解释",
  "研究问题", "作者的主要贡献", "输入→组件／关系→输出",
  "中心实验问题／固定项／比较者／结果／意义", "证据的适用范围与限制",
  "三句认识变化复述", "结果解释",
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
  if (paperMap) paperMap = normalizeLegacyMap(paperMap);
  const currentFormat = paperMap ? lineField(paperMap, "格式版本") === "3" : false;
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
  if (genericHits.length) errors.push(`一级标题不能使用通用栏目或空泛标签：${[...new Set(genericHits)].join("、")}`);

  const bodyStart = headingMatches[0]?.index ?? content.length;
  const body = content.slice(bodyStart);
  const thirdHeadingStart = headingMatches[2]?.index ?? content.length;
  const earlyBody = content.slice(bodyStart, thirdHeadingStart);
  const lastHeadingStart = headingMatches.at(-1)?.index ?? bodyStart;
  const finalBody = content.slice(lastHeadingStart);

  if (/(?:零号模型|FX\s*回流|x\s*\/\s*R\s*\/\s*f\s*\/\s*E|\{\{[^}]+\}\}|\b(?:TODO|TBD|PLACEHOLDER)\b)/i.test(body)) {
    errors.push("正文含内部分析标签、模板占位或未完成标记");
  }

  const backstagePattern = /(?:paper-map|证据台账|本轮核验|未参与写作|讲解者构造|旧稿依据|核验状态|决定：进入正文|决定：仅供备查)/g;
  const backstageHits = [...body.matchAll(backstagePattern)].map((match) => match[0]);
  if (backstageHits.length) {
    errors.push(`正文泄漏研究记录或核验语言：${[...new Set(backstageHits)].join("、")}`);
  }

  const paragraphs = paragraphList(body);
  const denseParagraphs = paragraphs.filter((paragraph) => [...paragraph.replace(/\s/g, "")].length > 240).length;
  if (denseParagraphs) warnings.push(`正文有 ${denseParagraphs} 段超过 240 字；检查是否一次塞入多个重要关系`);
  const numericCounts = paragraphs.map((paragraph) => (paragraph.match(/\d+(?:\.\d+)?%?/g) ?? []).length);
  const numericTokenCount = numericCounts.reduce((sum, count) => sum + count, 0);
  const numericParagraphCount = numericCounts.filter((count) => count > 0).length;
  const severeNumericPileParagraphs = numericCounts.filter((count) => count >= 7).length;
  const numericPileParagraphs = numericCounts.filter((count) => count >= 5 && count < 7).length;
  if (severeNumericPileParagraphs) {
    const message = `正文有 ${severeNumericPileParagraphs} 段包含至少 7 个数字；检查每项比较是否有明确作用和解释`;
    (currentFormat ? warnings : errors).push(message);
  }
  if (numericPileParagraphs) warnings.push(`正文有 ${numericPileParagraphs} 段包含 5–6 个数字；检查各项比较是否必要，保留影响结论的区间与不确定性`);

  const exampleBlocks = [...content.matchAll(/#\+begin_example\s*\n([\s\S]*?)#\+end_example/gim)];
  if (!currentFormat && exampleBlocks.length > 1) errors.push("最多保留一个 Markdown 围栏图块");
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
    errors.push("所有论文笔记都必须提供 --map paper-map 研究记录");
  } else {
    const version = lineField(paperMap, "格式版本");
    paperMapVersion = version;
    if (!/^(?:1|2|3)$/.test(version)) errors.push(`paper-map 格式版本必须是 1、2 或 3，当前为 ${version || "为空"}`);
    if (version === "1" || version === "2") warnings.push(`paper-map 格式版本 ${version} 使用兼容模式及原有检查规则；新笔记请使用版本 3`);

    for (const field of ["原文位置", "论文信息", "原文哈希", "材料能支持到", "外部指令扫描"]) {
      if (!substantive(lineField(paperMap, field))) errors.push(`paper-map 缺少材料字段：${field}`);
    }
    if (currentFormat) {
      const noteSource = content.match(/^#\+source:[ \t]*(.*)$/im)?.[1]?.trim() ?? "";
      if (noteSource !== lineField(paperMap, "原文位置")) errors.push("笔记 #+source 与研究记录的原文位置不一致");
    }
    const injectionScan = lineField(paperMap, "外部指令扫描");
    if (substantive(injectionScan) && !/^(?:未发现|已停止)/.test(injectionScan)) {
      errors.push("“外部指令扫描”必须以“未发现”或“已停止”开头");
    }

    if (currentFormat && /^已停止/.test(injectionScan)) errors.push("材料处理已停止，不能标记为可交付");

    for (const field of identityFields) {
      if (!substantive(lineField(paperMap, field))) errors.push(`研究问题与贡献未填：${field}`);
    }
    const contributionType = lineField(paperMap, "贡献类型");
    if (substantive(contributionType) && !/^(?:方法|干预|解释|理论|测量|评测|资源|系统)/.test(contributionType)) {
      errors.push("贡献类型必须从方法／干预、解释／理论、测量／评测、资源／系统中选择主类型");
    }

    const uniqueResultShape = lineField(paperMap, "正文主要结果表述");
    const extraQuantitativeForeground = lineField(paperMap, "是否补充定量比较");
    if (version === "2" || currentFormat) {
      if (!substantive(uniqueResultShape)) errors.push("中心实验或论证未填：正文主要结果表述");
      else if (!body.includes(uniqueResultShape)) errors.push(`正文主要结果表述“${uniqueResultShape}”没有出现在正文`);
      if (!yesNoDecision(extraQuantitativeForeground)) errors.push("“是否补充定量比较”必须明确写是或否并说明理由");
    }
    quantitativeException = /^是/.test(extraQuantitativeForeground);
    if (!currentFormat && quantitativeException && !/^(?:测量|评测)/.test(contributionType)) {
      errors.push("旧版本的是否补充定量比较例外只适用于测量／评测论文；新版按比较的实际作用取舍");
    }
    const numericTokenLimit = quantitativeException ? 8 : 4;
    const numericParagraphLimit = quantitativeException ? 2 : 1;
    if (currentFormat && !substantive(lineField(paperMap, "补充比较的作用"))) {
      errors.push("中心实验或论证未填：补充比较的作用");
    }
    if (numericTokenCount > numericTokenLimit || numericParagraphCount > numericParagraphLimit) {
      if (currentFormat) warnings.push(`正文有 ${numericTokenCount} 个数字，分布在 ${numericParagraphCount} 段；请结合证据记录与独立阅读检查确认这些比较各有作用`);
      else errors.push(
        `旧版本数字数量限制：正文共有 ${numericTokenCount} 个数字、分散在 ${numericParagraphCount} 段；` +
        `${quantitativeException ? "评测例外" : "旧版本默认规则"}最多允许 ${numericTokenLimit} 个数字、${numericParagraphLimit} 个定量段落。` +
        "段落拆分不能把证据清单变成叙事，其余精确量移回 paper-map",
      );
    }

    const identityAnchors = parseAnchors(lineField(paperMap, "正文中的论文具体表述"));
    identityAnchorCount = identityAnchors.length;
    if (identityAnchors.length < 2) errors.push(`正文中的论文具体表述至少 2 个，当前为 ${identityAnchors.length}`);
    const genericIdentityAnchors = identityAnchors.filter((anchor) => genericAnchors.has(anchor));
    if (genericIdentityAnchors.length) errors.push(`论文具体表述过于通用：${genericIdentityAnchors.join("、")}`);
    const missingIdentityAnchors = identityAnchors.filter((anchor) => !body.includes(anchor));
    if (missingIdentityAnchors.length) errors.push(`这些论文具体表述没有出现在正文：${missingIdentityAnchors.join("、")}`);

    const orientationAnchors = parseAnchors(lineField(paperMap, "前两节的问题与贡献表述"));
    orientationAnchorCount = orientationAnchors.length;
    if (orientationAnchors.length < 2) errors.push(`前两节的问题与贡献表述至少 2 个，当前为 ${orientationAnchors.length}`);
    const lateOrientationAnchors = orientationAnchors.filter((anchor) => !earlyBody.includes(anchor));
    if (lateOrientationAnchors.length) errors.push(`这些研究问题与贡献表述没有在前两个一级标题内出现：${lateOrientationAnchors.join("、")}`);

    for (const field of understandingFields) {
      if (!substantive(lineField(paperMap, field))) errors.push(`读者的认识变化未填：${field}`);
    }

    generatorExists = lineField(paperMap, "是否存在统一机制");
    if (!yesNoDecision(generatorExists)) {
      errors.push("“是否存在统一机制”必须明确写是或否并说明理由");
    } else if (/^是/.test(generatorExists)) {
      for (const field of generatorFields) {
        if (!substantive(lineField(paperMap, field))) errors.push(`机制与结果解释未填：${field}`);
      }
      const generatorAnchors = parseAnchors(lineField(paperMap, "正文中的机制表述"));
      if (!generatorAnchors.length) errors.push("声明存在机制时至少需要 1 个正文中的机制表述");
      const missingGeneratorAnchors = generatorAnchors.filter((anchor) => !body.includes(anchor));
      if (missingGeneratorAnchors.length) errors.push(`这些机制表述没有出现在正文：${missingGeneratorAnchors.join("、")}`);
      const earlyDecision = lineField(paperMap, "是否需要在前两节解释机制");
      if (!yesNoDecision(earlyDecision)) errors.push("“是否需要在前两节解释机制”必须明确写是或否并说明理由");
      if (/^是/.test(earlyDecision)) {
        const lateGeneratorAnchors = generatorAnchors.filter((anchor) => !earlyBody.includes(anchor));
        if (lateGeneratorAnchors.length) errors.push(`机制要求前置，但这些表述出现过晚：${lateGeneratorAnchors.join("、")}`);
      }
    } else if (/^否/.test(generatorExists)) {
      const generator = lineField(paperMap, "统一机制");
      if (!/未找到|不存在/.test(generator)) errors.push("声明没有统一机制时，“统一机制”应明确写未找到或不存在");
    }

    const visualDecision = lineField(paperMap, "是否需要图示");
    if (!yesNoDecision(visualDecision)) errors.push("“是否需要图示”必须明确写是或否并说明理由");
    if (/^是/.test(visualDecision)) {
      if (!exampleBlocks.length || (!currentFormat && exampleBlocks.length !== 1)) {
        errors.push(currentFormat ? "声明需要图示，但正文没有 example 图块" : "旧版本声明需要图示时，正文必须恰好有 1 个 example 图块");
      }
      const carriers = parseAnchors(lineField(paperMap, "图后用什么例子解释"));
      if (currentFormat && carriers.length !== exampleBlocks.length) errors.push("每张图都需要按顺序记录图后解释所用的例子");
      for (let index = 0; index < exampleBlocks.length; index++) {
        const block = exampleBlocks[index];
        const carrier = carriers[index];
        const afterDiagram = content.slice((block.index ?? 0) + block[0].length, exampleBlocks[index + 1]?.index);
        if (!carrier || !afterDiagram.includes(carrier)) errors.push(`图后未找到对应例子：${carrier || "未填写"}`);
      }
    } else if (/^否/.test(visualDecision) && exampleBlocks.length) {
      warnings.push("记录声明不需要图示，但正文含 example 图块；请核对图示决定");
    }

    for (const field of experimentFields) {
      if (!substantive(lineField(paperMap, field))) errors.push(`中心实验或论证未填：${field}`);
    }
    const centralAnchor = lineField(paperMap, "正文中的核心证据表述");
    if (substantive(centralAnchor) && !body.includes(centralAnchor)) errors.push(`正文中的核心证据表述“${centralAnchor}”没有出现在正文`);

    const evidenceLines = [...paperMap.matchAll(/^- \[evidence\]\s+.+$/gm)].map((match) => match[0]);
    evidenceCount = evidenceLines.length;
    for (const line of evidenceLines) {
      const missing = evidenceFields.filter((field) => {
        if (currentFormat && field === "正文对应表述" && segmentField(line, "角色") === "备查") return false;
        return !substantive(segmentField(line, field));
      });
      if (missing.length) errors.push(`证据条目缺少字段：${missing.join("、")}；条目=${line}`);
      const role = segmentField(line, "角色");
      const decision = segmentField(line, "决定");
      if (!/^(?:核心|补充|备查)$/.test(role)) errors.push(`证据角色只能是核心／补充／备查：${role || "为空"}`);
      if (!/^(?:进入正文|合并|仅供备查)$/.test(decision)) errors.push(`证据决定只能是进入正文／合并／仅供备查：${decision || "为空"}`);
      if (role === "核心") centralEvidenceCount++;
      if (role === "补充") necessaryEvidenceCount++;
      if (role === "备查") backgroundEvidenceCount++;
      if (role === "备查" && decision !== "仅供备查") errors.push("备查证据必须决定为“仅供备查”");
      if (decision !== "仅供备查") {
        const anchor = segmentField(line, "正文对应表述");
        if (/^(?:无|未找到)$/.test(anchor) || !body.includes(anchor)) errors.push(`进入正文或合并的证据对应表述没有出现在正文：${anchor || "为空"}`);
      }
    }
    if (!centralEvidenceCount) errors.push("证据分级至少需要 1 条核心证据");
    if (!currentFormat && !necessaryEvidenceCount) errors.push("证据分级至少需要 1 条补充证据");
    if (!currentFormat && !backgroundEvidenceCount) errors.push("证据分级至少需要 1 条备查证据，这是版本 1、2 保留的类别要求");

    const frontstageLines = [...paperMap.matchAll(/^- \[frontstage\]\s+.+$/gm)].map((match) => match[0]);
    frontstageCount = frontstageLines.length;
    if (!frontstageCount) errors.push("paper-map 至少需要 1 个正文案例");
    const responsibilities: string[] = [];
    for (const line of frontstageLines) {
      const missing = frontstageFields.filter((field) => !substantive(segmentField(line, field)));
      if (missing.length) errors.push(`正文案例缺少字段：${missing.join("、")}；条目=${line}`);
      const name = segmentField(line, "名称");
      const responsibility = segmentField(line, "主要作用");
      if (substantive(name) && !body.includes(name)) errors.push(`正文案例“${name}”没有出现在正文`);
      if (substantive(responsibility)) responsibilities.push(responsibility);
    }
    const duplicateResponsibilities = [...new Set(responsibilities.filter((item, index, all) => all.indexOf(item) !== index))];
    if (duplicateResponsibilities.length) {
      const message = `案例的主要作用重复：${duplicateResponsibilities.join("、")}；检查是否提供了不同信息`;
      (currentFormat ? warnings : errors).push(message);
    }

    for (const field of continuityFields) {
      if (!substantive(lineField(paperMap, field))) errors.push(`章节组织与联系未填：${field}`);
    }

    for (const field of finalFields) {
      if (!substantive(lineField(paperMap, field))) errors.push(`结尾检查未填：${field}`);
    }
    const finalAnchor = lineField(paperMap, "正文结尾的对应表述");
    if (substantive(finalAnchor) && !finalBody.includes(finalAnchor)) errors.push(`结尾对应表述“${finalAnchor}”没有出现在最后一个内容标题下`);
    const newMaterialDecision = lineField(paperMap, "结尾是否新增证据、术语或建议");
    if (substantive(newMaterialDecision) && !/^否/.test(newMaterialDecision)) errors.push("结尾不能新增新证据、术语或建议；该字段必须以“否”开头");

    for (const field of readerFields) {
      if (version === "2" || currentFormat || !["不依赖分数的全文复述", "读者首先记住的解释", "读者对章节联系的解释"].includes(field)) {
        if (!substantive(lineField(paperMap, field))) errors.push(`陌生读者验收未填：${field}`);
      }
    }
    if (version === "2" || currentFormat) {
      const noNumberRetell = lineField(paperMap, "不依赖分数的全文复述");
      if (!currentFormat && /\d+(?:\.\d+)?%?/.test(noNumberRetell)) errors.push("不依赖分数的全文复述仍含阿拉伯数字；先说明过程，再回答实验数值");
      if (lineField(paperMap, "全文理解判定") !== "NARRATIVE_PASS") errors.push("全文理解检查必须记录 NARRATIVE_PASS");
    }
    if (lineField(paperMap, "问题与贡献判定") !== "PAPER_IDENTITY_PASS") errors.push("陌生读者五问必须得到 PAPER_IDENTITY_PASS");
    if (lineField(paperMap, "认识变化判定") !== "UNDERSTANDING_PASS") errors.push("三句认识更新必须得到 UNDERSTANDING_PASS");
    if (lineField(paperMap, "结果解释判定") !== "RECONSTRUCTION_PASS") errors.push("结果解释必须得到 RECONSTRUCTION_PASS");
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
