import { describe, expect, test } from "bun:test";
import { validate } from "./validate_note";

const filename = "20260820T091641--paper-技能留下动作关系__paper.org";

const validNote = `#+title: 技能留下动作关系
#+subtitle: Demystifying Skills
#+description: 旧评测只看总分；作者比较同一经验的不同表示，发现技能主要稳定动作关系，并受完整生命周期约束。
#+date: [2026-08-20 Thu 09:16]
#+filetags: :paper:
#+identifier: 20260820T091641
#+source: https://arxiv.org/abs/2608.14036
#+authors: A. Author, B. Author
#+venue: arXiv, 2026

* 结账请求为什么仍然失败

一个结账请求必须访问外部服务。没有旧经验时，代理绕过外部服务；拿到工作记录后，它补齐调用却排错顺序。最终标签都是失败，旧评测看不见原因差异。

* 同一段经验走出不同结果

作者固定任务与旧轨迹，只改变经验怎样交给代理。标准化技能把记录压成程序锚点；压缩—检索—适配—验证成为同一条作用链。中心比较显示，每一百次多完成六次，这支持表示方式改变了经验的可用性。

* 技能库扩大以后

技能库让检索进入链条。精确命中与完成任务不再是同一把尺子；卡片还要适配当前条件并接受真实运行。

技能保存动作关系，却不保存这些动作永远正确的权利。
`;

const validMap = `# ljg-paper paper-map 研究记录

## 原文与材料边界
- 格式版本：2
- 原文位置：https://arxiv.org/abs/2608.14036
- 论文信息：2608.14036｜Demystifying Skills｜A. Author｜v1
- 原文哈希：sha256:abcdef0123456789
- 材料能支持到：支持终端代理的技能机制，不能推广到所有代理
- 外部指令扫描：未发现可疑指令

## 研究问题与贡献
- 贡献类型：测量／评测——机制评测
- 研究对象：代理技能怎样改变执行行为
- 已有方法的不足：总成功率看不见失败与成功的行为路径
- 主要贡献：同源三路对照与轨迹分类框架
- 输入、处理与输出：同一旧轨迹→三种表示→配对执行→行为分叉
- 不可省略的研究问题或主线：经验表示｜结果标签｜跨工具迁移｜技能库检索
- 主线为什么属于同一篇论文：四条主线共同定位技能从旧经验到任务结果的断点
- 各主线的证据支持程度：经验表示：闭合——配对实验｜结果标签：部分闭合——结果混合｜跨工具迁移：部分闭合——只有图｜技能库检索：闭合——独立实验
- 论文未作出的主张：没有发明更强技能，也没有证明普遍能力提升
- 正文中的论文具体表述：结账请求｜程序锚点
- 前两节的问题与贡献表述：结账请求｜程序锚点
- 论文简述：总分看不见机制，作者用同源对照找到技能稳定动作关系的证据与边界
- 与其他论文的区别：换成普通记忆论文会缺少同源三路比较与轨迹分类

## 读者的认识变化
- 从哪个具体问题开始：结账请求需要真实调用并按时完成
- 原先会怎样理解或处理：只要最终通过就说明技能有用
- 什么证据需要补充或修正原有理解：相同失败标签来自绕过调用和顺序错误
- 作者补充了什么关系、做法或判断依据：比较执行分叉而非只看终点
- 回到原问题，判断发生了什么变化：开始寻找哪段行为被稳定
- 还需要回答什么问题：技能怎样从经验走到结果
- 贯穿全文的问题或关系：技能使用生命周期
- 案例如何选择与衔接：结账解释表示，技能库解释检索，因此由前一结果逼出换场
- 结尾回到哪里：回到如何判断技能是否有用
- 陌生读者三句复述：旧评测只看结果；作者比较行为路径；技能稳定动作但有生命周期边界
- 示例的原文依据与简化限制：结账来自附录轨迹；技能库来自独立检索实验，正文不把两者写成同一因果实验

## 机制与结果解释
- 是否存在统一机制：是——技能价值由完整生命周期共同生成
- 统一机制：压缩—检索—适配—验证
- 输入、起点或当前状态：带有成功与失败的旧执行轨迹
- 关键作用关系：压缩保留动作关系，当前情境决定是否适用
- 结果方向或终点：任务完成且真实验证通过
- 如何解释两个不同发现：推出技能优于工作记录，也推出正确技能仍可能被误用
- 改变相关条件后的预测及依据：相似技能增多时精确检索先下降
- 失效边界：算法错误或条件不兼容时程序锚点不能补救
- 正文中的机制表述：压缩—检索—适配—验证
- 是否需要在前两节解释机制：是——后续实验都由这条链组织
- 是否需要图示：否——一句组件链足以保持关系
- 图后用什么例子解释：正文直接用结账请求与技能库运行

## 中心实验或论证
- 实验在问什么：同一经验换表示是否改变执行
- 固定了什么：任务、代理、预算与旧轨迹
- 改变了什么：无经验、工作记录、标准化技能
- 与谁比较：技能与工作记录，并保留无经验基线
- 主要结果及例外：技能相对工作记录稳定提高，相对无经验提升较弱
- 结果的实际意义：每一百次比工作记录多完成约六次
- 这个结果改变什么判断：经验表示而非经验存在本身影响可用性
- 这个结果不能推出什么：不能证明技能普遍强于无经验
- 正文中的核心证据表述：每一百次多完成六次
- 正文主要结果表述：每一百次多完成六次
- 是否补充定量比较：否——中心比较已经足以改变判断，其余精确量仅供备查

## 证据分级
- [evidence] 名称：配对成功差｜角色：中心｜位置：表10｜论文直接结果：技能相对工作记录提高｜支持判断：经验压缩影响可用性｜正文对应表述：每一百次多完成六次｜决定：进入正文｜取舍理由：删掉就无法区分技能与工作记录
- [evidence] 名称：结账三路轨迹｜角色：必要｜位置：附录A3｜论文直接结果：三条路径从不同动作处分叉｜支持判断：总标签隐藏机制｜正文对应表述：绕过外部服务｜决定：进入正文｜取舍理由：删掉就没有旧盲区的可见压力
- [evidence] 名称：完整检索矩阵｜角色：研究记录｜位置：表15｜论文直接结果：不同池大小与干扰项的完整指标｜支持判断：检索是独立瓶颈｜正文对应表述：无｜决定：仅供备查｜取舍理由：不影响主线但影响核验完整性

## 正文中的案例与实验
- [frontstage] 名称：结账请求｜主要作用：暴露总分隐藏行为路径｜设置或起点：真实调用与时限｜结果或后果：三路执行得到不同原因｜帮助理解什么：从看终点改成看分叉｜与后文的联系：表示方式改变了什么
- [frontstage] 名称：技能库｜主要作用：暴露检索与适配边界｜设置或起点：候选技能增多｜结果或后果：命中与完成不再同步｜帮助理解什么：文件存在不等于作用成功｜与后文的联系：生命周期在哪里断裂

## 章节组织与联系
- 开头要回答的问题：相同失败标签为什么来自不同原因
- 全文解释顺序：总分隐藏路径→同源三路对照→动作关系被稳定→检索与适配成为新边界
- 案例之间的联系：先证明表示改变行为，才有理由进入技能库检索
- 章节换序检查：技能库若提前，读者还不知道为什么表示方式值得追踪
- 略去数字后的解释：删掉数字后，中心比较仍回答经验表示是否改变可用性
- 只保留结论会遗漏什么：只保留结账案例会丢失生命周期，只保留结论会丢失对照归因

## 结尾检查
- 论文最终补充或修正了什么认识：技能文件存在或总分上升不等于技能机制可靠
- 结尾依据前文哪些发现：结账三路分叉与技能库检索边界
- 正文结尾的对应表述：技能保存动作关系
- 结尾与本论文的联系：普通提示论文没有同源经验表示与技能库生命周期
- 结尾是否新增证据、术语或建议：否——只压缩正文已经运行的关系

## 陌生读者验收记录
- 不依赖分数的全文复述：旧评测只看终点，同源对照让行为分叉可见，技能稳定动作却仍受检索适配与验证约束
- 读者首先记住的解释：最先留下的是经验怎样经过压缩检索适配与验证变成行动
- 读者对章节联系的解释：技能库不能提前，因为读者还不知道表示为什么会改变行动
- 全文理解判定：NARRATIVE_PASS
- 研究问题：总成功率看不见技能何时怎样起作用
- 作者的主要贡献：同源配对实验与轨迹分类框架
- 输入→组件／关系→输出：旧轨迹→表示→检索→适配→验证→结果
- 中心实验问题／固定项／比较者／结果／意义：固定任务与轨迹，比较工作记录和技能，技能更易使用
- 证据的适用范围与限制：终端任务、有限模型与样本，不能证明普遍能力提升
- 问题与贡献判定：PAPER_IDENTITY_PASS
- 三句认识变化复述：旧评测只看终点；作者让路径可见；技能主要稳定动作且受生命周期约束
- 认识变化判定：UNDERSTANDING_PASS
- 结果解释：生命周期推出表示优势与误用失败，并预测相似技能增多先伤检索
- 结果解释判定：RECONSTRUCTION_PASS
`;

describe("validate ljg-paper note", () => {
  test("accepts the three-contract note with flexible carriers", () => {
    const result = validate(validNote, filename, validMap);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.stats.frontstage_count).toBe(2);
    expect(result.stats.background_evidence_count).toBe(1);
    expect(result.stats.numeric_tokens).toBe(0);
    expect(result.stats.numeric_paragraphs).toBe(0);
  });

  test("requires a backstage paper-map", () => {
    const result = validate(validNote, filename);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("--map");
  });

  test("rejects a polished case that lost whole-paper identity", () => {
    const broken = validMap
      .replace("- 主要贡献：同源三路对照与轨迹分类框架", "- 主要贡献：")
      .replace("- 论文简述：总分看不见机制，作者用同源对照找到技能稳定动作关系的证据与边界", "- 论文简述：成长与变化");
    const result = validate(validNote, filename, broken);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("主要贡献");
  });

  test("requires indispensable research strands and their evidence status", () => {
    const broken = validMap.replace("- 各主线的证据支持程度：经验表示：闭合——配对实验｜结果标签：部分闭合——结果混合｜跨工具迁移：部分闭合——只有图｜技能库检索：闭合——独立实验", "- 各主线的证据支持程度：");
    const result = validate(validNote, filename, broken);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("各主线的证据支持程度");
  });

  test("requires paper orientation by the end of the second heading", () => {
    const lateNote = validNote.replace("程序锚点；", "操作规则；").replace("程序锚点", "程序锚点");
    const result = validate(lateNote, filename, validMap);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("前两个一级标题");
  });

  test("accepts an explicit no-generator path without forcing a formula", () => {
    const noGenerator = validMap
      .replace("- 是否存在统一机制：是——技能价值由完整生命周期共同生成", "- 是否存在统一机制：否——论文只提供两条不可合并的测量关系")
      .replace("- 统一机制：压缩—检索—适配—验证", "- 统一机制：未找到")
      .replace("- 正文中的机制表述：压缩—检索—适配—验证", "- 正文中的机制表述：无")
      .replace("- 是否需要在前两节解释机制：是——后续实验都由这条链组织", "- 是否需要在前两节解释机制：否——没有单一机制");
    const result = validate(validNote, filename, noGenerator);
    expect(result.errors).toEqual([]);
  });

  test("rejects a declared generator that appears too late", () => {
    const lateNote = validNote
      .replace("压缩—检索—适配—验证成为同一条作用链。", "经验处理成为同一条作用链。")
      .replace("技能库让检索进入链条。", "技能库让压缩—检索—适配—验证进入链条。");
    const result = validate(lateNote, filename, validMap);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("出现过晚");
  });

  test("requires center, necessary, and backstage evidence roles", () => {
    const noBackground = validMap.replace(/^- \[evidence\] 名称：完整检索矩阵.*\n/m, "");
    const result = validate(validNote, filename, noBackground);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("备查证据");
  });

  test("rejects backstage language and generic headings in the visible note", () => {
    const broken = validNote.replace("* 技能库扩大以后", "* 实验结果").replace("技能保存动作关系", "证据台账决定进入正文");
    const result = validate(broken, filename, validMap);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("一级标题");
    expect(result.errors.join("\n")).toContain("研究记录");
  });

  test("warns when a paragraph becomes a metric pile", () => {
    const metricPile = validNote.replace(
      "中心比较显示，每一百次多完成六次",
      "中心比较显示 61.9%、55.9%、59.1%、65.7%、4.5% 与 23.5%",
    );
    const result = validate(metricPile, filename, validMap.replaceAll("每一百次多完成六次", "中心比较显示"));
    expect(result.warnings.join("\n")).toContain("5–6 个数字");
  });

  test("rejects a severe metric pile even when numbers are accurate", () => {
    const metricPile = validNote.replace(
      "中心比较显示，每一百次多完成六次",
      "中心比较显示 61.9%、55.9%、59.1%、65.7%、4.5%、23.5% 与 10.0%",
    );
    const result = validate(metricPile, filename, validMap.replaceAll("每一百次多完成六次", "中心比较显示"));
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("至少 7 个数字");
  });

  test("rejects numeric dominance distributed across locally light paragraphs", () => {
    const distributed = validNote.replace(
      "中心比较显示，每一百次多完成六次，这支持表示方式改变了经验的可用性。",
      `第一组比较显示 61.9% 对 55.9%，差值 6.0，区间下界 0.7。

第二组比较显示 59.1%、65.7%、4.5% 与 23.5%。

第三组比较显示 10.0%、10.6%、74.6% 与 40.0%。

第四组比较显示 29.6%、3.3%、5 与 100。`,
    );
    const map = validMap.replaceAll("每一百次多完成六次", "第一组比较");
    const result = validate(distributed, filename, map);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("旧版本数字数量限制");
    expect(result.stats.numeric_pile_paragraphs).toBe(0);
  });

  test("requires one foreground result shape declared in paper-map", () => {
    const broken = validMap.replace("- 正文主要结果表述：每一百次多完成六次\n", "");
    const result = validate(validNote, filename, broken);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("正文主要结果表述");
  });

  test("requires a narrative-first reader pass before paper identity", () => {
    const failed = validMap.replace("- 全文理解判定：NARRATIVE_PASS", "- 全文理解判定：FAIL");
    const result = validate(validNote, filename, failed);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("NARRATIVE_PASS");
  });

  test("rejects numeric recall in the narrative-first retell", () => {
    const failed = validMap.replace(
      "旧评测只看终点，同源对照让行为分叉可见，技能稳定动作却仍受检索适配与验证约束",
      "旧评测只看终点，61.9% 对 55.9% 证明技能更好",
    );
    const result = validate(validNote, filename, failed);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("不依赖分数的全文复述");
  });

  test("rejects an extra quantitative foreground exception for a method paper", () => {
    const methodMap = validMap
      .replace("- 贡献类型：测量／评测——机制评测", "- 贡献类型：方法／干预——训练方法")
      .replace("- 是否补充定量比较：否——中心比较已经足以改变判断，其余精确量仅供备查", "- 是否补充定量比较：是——需要更多对比");
    const result = validate(validNote, filename, methodMap);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("是否补充定量比较");
  });

  test("allows a bounded second quantitative paragraph for an evaluation paper", () => {
    const evaluated = validNote.replace(
      "技能保存动作关系，却不保存这些动作永远正确的权利。",
      `补充测量显示 61.9%、55.9%、6.0 与 0.7。

另一层尺子显示 29.6%、3.3%、5 与 100。

技能保存动作关系，却不保存这些动作永远正确的权利。`,
    );
    const map = validMap.replace(
      "- 是否补充定量比较：否——中心比较已经足以改变判断，其余精确量仅供备查",
      "- 是否补充定量比较：是——主产物是机制评测，第二层定量对照用于让新尺子本身可见",
    );
    const result = validate(evaluated, filename, map);
    expect(result.errors).toEqual([]);
    expect(result.stats.numeric_tokens).toBe(8);
    expect(result.stats.numeric_paragraphs).toBe(2);
    expect(result.stats.quantitative_exception).toBe(true);
  });

  test("keeps contract version one readable in compatibility mode", () => {
    const legacy = validMap
      .replace("- 格式版本：2", "- 格式版本：1")
      .replace(/^- 正文主要结果表述：.*\n/m, "")
      .replace(/^- 是否补充定量比较：.*\n/m, "")
      .replace(/^- 不依赖分数的全文复述：.*\n/m, "")
      .replace(/^- 读者首先记住的解释：.*\n/m, "")
      .replace(/^- 读者对章节联系的解释：.*\n/m, "")
      .replace(/^- 全文理解判定：.*\n/m, "");
    const result = validate(validNote, filename, legacy);
    expect(result.ok).toBe(true);
    expect(result.warnings.join("\n")).toContain("兼容模式");
  });

  test("requires independent reader passes", () => {
    const failed = validMap.replace("PAPER_IDENTITY_PASS", "FAIL");
    const result = validate(validNote, filename, failed);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("PAPER_IDENTITY_PASS");
  });

  test("requires a visual only when the map elects it", () => {
    const needsVisual = validMap
      .replace("- 是否需要图示：否——一句组件链足以保持关系", "- 是否需要图示：是——顺序需要图")
      .replace("- 图后用什么例子解释：正文直接用结账请求与技能库运行", "- 图后用什么例子解释：技能库");
    const result = validate(validNote, filename, needsVisual);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("恰好有 1 个");
  });

  test("rejects source and identifier drift", () => {
    const broken = validNote.replace("#+identifier: 20260820T091641", "#+identifier: 20260820T000000").replace("#+source: https://", "#+source: 原文 https://");
    const result = validate(broken, filename, validMap);
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("IDENTIFIER");
    expect(result.errors.join("\n")).toContain("裸原始 URL");
  });

  test("accepts one bare absolute local source path", () => {
    const local = validNote.replace("#+source: https://arxiv.org/abs/2608.14036", "#+source: /tmp/papers/source paper.pdf");
    const result = validate(local, filename, validMap);
    expect(result.errors).toEqual([]);
  });
});

// Version 1/2 checks above preserve their original policies. These cases cover version 3.
import { normalizeLegacyMap } from "./paper_map_compat";
import { readFileSync } from "node:fs";
const currentMap = normalizeLegacyMap(validMap)
  .replace("- 格式版本：2", "- 格式版本：3")
  .replace("## 证据分级", "- 补充比较的作用：没有补充定量比较；案例说明执行差异\n\n## 证据分级")
  .concat("\n- 缺失前提与处理：本夹具仅验证记录可填写，不声称经过真实阅读检查\n");

describe("version 3 evidence-based writing rules", () => {
  test("accepts a complete current record", () => {
    expect(validate(validNote, filename, currentMap).errors).toEqual([]);
  });
  test("does not force supplementary or reference-only evidence", () => {
    const map = currentMap.replace(/^- \[evidence\].*角色：(补充|备查).*\n/gm, "");
    expect(validate(validNote, filename, map).errors).toEqual([]);
    const noCore = map.replace(/^- \[evidence\].*\n/gm, "");
    expect(validate(validNote, filename, noCore).ok).toBe(false);
  });
  test("allows complementary quantitative results in a method paper", () => {
    const note = validNote.replace("技能库让检索进入链条。", "技能库让检索进入链条。\n\n固定任务时成功率从 50% 提高到 60%；固定预算时从 40% 提高到 48%。\n\n检索池从 10 扩大到 100 后，命中率从 80% 降到 65%。");
    const map = currentMap.replace("测量／评测——机制评测", "方法／干预——经验处理")
      .replace(/^- 是否补充定量比较：.*$/m, "- 是否补充定量比较：是——比较效果与检索规模限制")
      .replace(/^- 补充比较的作用：.*$/m, "- 补充比较的作用：任务比较说明效果，检索池比较说明规模限制");
    const result = validate(note, filename, map);
    expect(result.errors).toEqual([]);
    expect(result.stats.numeric_tokens).toBe(8);
  });
  test("requires reasons for retaining additional comparisons", () => {
    expect(validate(validNote, filename, currentMap.replace(/^- 补充比较的作用：.*\n/m, "")).ok).toBe(false);
  });
  test("flags dense numbers for review without pretending to judge meaning", () => {
    const note = validNote.replace("技能库让检索进入链条。", "技能库让检索进入链条。\n\n比较 10、20、30、40、50、60、70 个候选时发现限制。");
    const result = validate(note, filename, currentMap);
    expect(result.errors).toEqual([]);
    expect(result.warnings.join("\n")).toContain("至少 7 个数字");
  });
  test("accepts parallel sections and method names containing digits", () => {
    const map = currentMap
      .replace(/^- 读者对章节联系的解释：.*$/m, "- 读者对章节联系的解释：两项独立实验可换序，分别检验表示与检索")
      .replace(/^- 不依赖分数的全文复述：.*$/m, "- 不依赖分数的全文复述：Agent 2 使用旧经验组织动作，检索与适配决定能否完成任务");
    expect(validate(validNote, filename, map).errors).toEqual([]);
  });
  test("reader failure still blocks delivery regardless of numeric counts", () => {
    for (const pass of ["NARRATIVE_PASS", "PAPER_IDENTITY_PASS", "UNDERSTANDING_PASS", "RECONSTRUCTION_PASS"]) {
      expect(validate(validNote, filename, currentMap.replace(pass, "FAIL")).ok).toBe(false);
    }
  });
  test("allows distinct examples with a shared main purpose", () => {
    const result = validate(validNote, filename, currentMap.replace("暴露检索与适配边界", "暴露总分隐藏行为路径"));
    expect(result.errors).toEqual([]);
    expect(result.warnings.join("\n")).toContain("主要作用重复");
  });
  test("checks every diagram against its own following explanation", () => {
    const note = validNote.replace("技能库让检索进入链条。", "#+begin_example\n记录 -> 动作\n#+end_example\n\n结账请求说明第一张图。\n\n#+begin_example\n检索 -> 适配\n#+end_example\n\n技能库让检索进入链条。");
    const map = currentMap.replace(/^- 是否需要图示：.*$/m, "- 是否需要图示：是——两条不同关系")
      .replace(/^- 图后用什么例子解释：.*$/m, "- 图后用什么例子解释：结账请求｜技能库");
    expect(validate(note, filename, map).errors).toEqual([]);
    expect(validate(note, filename, map.replace("结账请求｜技能库", "技能库｜结账请求")).ok).toBe(false);
  });
  test("supports papers without a unified mechanism", () => {
    const map = currentMap.replace(/^- 是否存在统一机制：.*$/m, "- 是否存在统一机制：否——两项独立观察")
      .replace(/^- 统一机制：.*$/m, "- 统一机制：未找到；两项观察分别说明表示与检索");
    expect(validate(validNote, filename, map).errors).toEqual([]);
  });
  test("an interrupted source inspection cannot become a deliverable", () => {
    expect(validate(validNote, filename, currentMap.replace("未发现可疑指令", "已停止——发现嵌入指令")).ok).toBe(false);
  });
  test("accepts actual legacy field names and evidence roles", () => {
    const legacy = validMap.replace("格式版本", "合同版本").replace("原文位置", "规范原文")
      .replace("论文信息", "论文身份").replaceAll("正文对应表述", "正文锚点")
      .replaceAll("主要作用", "唯一职责").replaceAll("研究记录｜", "后台｜").replaceAll("仅供备查", "留在后台");
    expect(validate(validNote, filename, legacy).errors).toEqual([]);
  });
  test("unfilled shipped templates do not pass", () => {
    const map = readFileSync(new URL("../references/paper-map.md", import.meta.url), "utf8");
    const note = readFileSync(new URL("../references/template.md", import.meta.url), "utf8");
    expect(validate(note, filename, map).ok).toBe(false);
    expect(validate(validNote, filename, map).ok).toBe(false);
  });
});

describe("version 3 review regressions", () => {
  test("permits reference evidence without a body quote but requires quotes for included evidence", () => {
    const map = currentMap.replace("正文对应表述：无", "正文对应表述：");
    expect(validate(validNote, filename, map).errors).toEqual([]);
    expect(validate(validNote, filename, map.replace("正文对应表述：绕过外部服务", "正文对应表述：")).ok).toBe(false);
  });
  test("rejects mismatched source records", () => {
    const map = currentMap.replace("- 原文位置：https://arxiv.org/abs/2608.14036", "- 原文位置：https://example.org/unrelated-paper");
    expect(validate(validNote, filename, map).errors.join("\n")).toContain("原文位置不一致");
    const localNote = validNote.replace("https://arxiv.org/abs/2608.14036", "/tmp/source paper.pdf");
    const localMap = currentMap.replace("- 原文位置：https://arxiv.org/abs/2608.14036", "- 原文位置：/tmp/source paper.pdf");
    expect(validate(localNote, filename, localMap).errors).toEqual([]);
  });
  test("the shipped map fields form a complete usable record", () => {
    const template = readFileSync(new URL("../references/paper-map.md", import.meta.url), "utf8");
    const populated = template.replace(/^- ([^：\n]+)：.*$/gm, (line, key) => {
      if (key.startsWith("[")) return line;
      const source = currentMap.split("\n").find(row => row.startsWith(`- ${key}：`));
      if (!source) throw new Error(`Template field missing from fixture: ${key}`);
      return source;
    }).replace(/^- \[evidence\].*$/m, currentMap.match(/^- \[evidence\].*$/gm)!.join("\n"))
      .replace(/^- \[frontstage\].*$/m, currentMap.match(/^- \[frontstage\].*$/gm)!.join("\n"));
    expect(validate(validNote, filename, populated).errors).toEqual([]);
  });
});
