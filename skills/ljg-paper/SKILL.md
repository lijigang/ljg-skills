---
name: ljg-paper
description: "Paper reader for non-academics. Reconstructs a paper on three independent axes: the reader can identify its research problem and product, experience the evidence-driven change in understanding, and rebuild the mechanism, central experiment, and boundary. USE WHEN the user shares an arXiv link, paper URL, PDF, local paper, paper title, or asks to read, explain, analyze, or understand a paper. Defaults to a saved Markdown note. NOT FOR reproduction, formal peer review, benchmark tables, or literature surveys."
---

# ljg-paper：让一篇论文可辨认、可经历、可重建

具体案例负责让读者进入，不能替代论文身份。证据负责迫使理解改变，不能变成前台配额。最终成品既要读得进去，也要让陌生读者知道作者面对什么旧缺口、实际造了什么、为什么结果改变、证据停在哪里。

稳定的扶手不一定是同一个物件。它可以是一个研究问题、一段因果关系、一条组件链、一个不断受压的判断，或几个同时作用的变量。载体可以在前一个结果已经逼出下一问时更换；读者正在追问的事不能丢。

## Workflow Routing

| 输入 | 必读 | 输出 |
|---|---|---|
| arXiv、PDF、paper URL、本地论文 | `ReadingGuide.md`、`references/template.md`、`references/paper-map.md` | 保存一份由论文内容命名的 Markdown 与后台 paper-map |
| 只有论文标题 | 找到可靠原文后读同一组文件 | 保存 Markdown 与 paper-map |
| 用户明确只要口头解释 | `ReadingGuide.md` | 不写文件，仍兑现同一三重合同 |

Markdown 默认保存到 `~/Context/`。文件名沿用 Denote：`{YYYYMMDDTHHMMSS}--paper-{方法名或论文关键词}__paper.md`；时间戳由 `date +%Y%m%dT%H%M%S` 生成。

## 三重成品合同

- **论文身份。** 只读成品的人能说出研究对象、旧方法看不见什么、作者的产物或贡献类型、组件怎样从输入运行到输出、哪些研究主线不可省，以及最强证据边界。最迟读完前两个一级标题，这条方向必须已经出现。
- **认识更新。** 读者先在具体处境中形成自然理解，再亲眼看见论文证据为什么使它不够；新关系只在需要时出现，并立即改变原来的判断、动作或尺度。
- **解释重建。** 若论文存在能推出多个结果的机制、过程或测量关系，读者能用它解释至少两个相隔较远的发现、预测一个相邻条件，并指出失效边界。没有单一生成器时明确说明，不用公式伪造完整性。

任一边失败都不能交付。只有论文身份，会得到准确却费力的摘要；只有认识更新，会得到一篇流畅但可以移植到许多论文上的主题文章；解释无法重建时，案例再顺也仍把最难的归纳留给读者。

## Gotchas

- **局部因果顺畅，不等于整篇论文已经出现。** 一个例子、三句复述和若干数字可以全部正确，读者仍可能不知道论文研究什么、造了什么。真实读者出现这种反馈时，重建论文坐标，不润色句子。
- **扶手稳定，载体不必固定。** 强迫一个日常物件承载多研究问题，会把后半篇写成指标附录。多组件或多问题论文可以换场，前一个结果必须说明为什么现在非换不可。
- **作者的产物必须可辨认。** 方法、理论、评测、资源或系统不是背景标签；读者要知道作者实际增加了什么可运行对象、关系、尺子或可行范围。
- **突出中心不能删掉独立主线。** 论文若明确以多个研究问题组成同一产物，paper-map 要记录每条主线为何不可省、证据是否闭合；正文可以压缩，但不能让陌生读者误认论文只做了中心实验。
- **后台覆盖不能变成正文配额。** paper-map 可以保留全部实验；正文只留下中心证据，以及没有它就无法逼出下一次认识变化的必要证据。
- **数字没有实验坐标就只是噪声。** 数据进入前，读者应已知道它在回答什么、固定了什么、和谁比较；数据之后立刻说明它改变了什么判断。
- **把数字拆进短段，仍然是数字主导。** 单段不过载不能证明全文有叙事；默认正文只保留一个结果形状。只有论文的主产物本身是新尺子或评测、且少一层定量对照就无法看见产物时，paper-map 才能说明额外定量前台，完整表格和分支结果仍留在后台。
- **稳定主题不等于解释生成器。** “更可靠、更智能、更通用”不能推出具体结果。生成器必须固定输入、作用关系、结果方向与失效条件。
- **相邻标题可以换序，说明仍是平行摘要。** 每个新标题都要继承上一段尚未解决的问题；换序测试写进 paper-map。
- **边界不能把写作者带进镜头。** 来源身份、删留决定和核验状态留在 paper-map；正文只写眼前对象已经回答什么、再往前还需要什么条件。
- **机械通过不能证明理解。** validator 只拦截结构退化；论文身份五问与认识更新三句复述必须由未参与写作的新上下文完成。

## Quick Reference

- 用原始论文锁定研究对象、旧缺口、作者产物、组件链、中心发现与边界，再选择前台案例。
- 先在 `paper-map` 给证据分级：中心、必要、后台；级别不是数量配额。
- 开头让普通读者进入，前两个标题内让论文身份和必要的生成器开始运行。
- 一个中心主张只保留一个代表结果形状的证据单元；完整模型名、表格与分支结果留在后台。
- 陌生读者先不用数字讲回发生链，并说明标题为何不能换序；只会复述分数或实验清单即失败。
- 交付同时通过叙事主位门、五问论文身份门、三句认识更新门、Denote/consult-notes 与确定性 validator。

## Examples

**方法论文**

读者先让旧做法在一个小任务里得到结果。作者的产物随后以输入→组件→输出链出现；中心实验固定任务与预算，只改变关键动作。结尾说明新方法改善了哪一步，以及换掉哪个条件后仍未知。

**评测论文**

两份对象先被旧尺子判成相同。论文的新尺子让一个此前被压平的差异可见；代表性对照说明它能区分什么。成品停在“差异变得可测”，不把新 benchmark 冒充成现实因果解释。

## Completion

写作与取舍遵循 `ReadingGuide.md`；Markdown 使用 `references/template.md`；后台复制并填写 `references/paper-map.md`。

写入后运行：

```sh
bun {skill_dir}/scripts/validate_note.ts /absolute/path/to/note.md \
  --map /absolute/path/to/paper-map.md
```

随后用真实 Emacs 读回 Denote identifier、文件名、目录索引与 consult-notes。最后只给陌生读者成品：先不用阿拉伯数字讲回全文发生链、说出最先留下的机制，并用相邻标题换序说明因果依赖；得到 `NARRATIVE_PASS` 后，才回答研究问题、贡献／产物、组件链、实验坐标、最强边界五问，前两问任何一项含混即失败；再用三句普通话复述原理解、论文改写、结果与边界。叙事、身份与认识更新三张成绩单互不补分。
