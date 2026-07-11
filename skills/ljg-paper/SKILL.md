---
name: ljg-paper
description: "Paper reader for non-academics that reconstructs one paper as x -> f -> f(x): the research problem, the paper's method or explanatory move, and the evidence-bounded result plus judgment update. USE WHEN the user shares an arXiv link OR paper URL OR PDF OR local paper file OR paper title, or asks to read, explain, analyze, or understand a paper. Defaults to a saved markdown note. NOT FOR experiment reproduction, formal peer review, exhaustive benchmark tables, or literature surveys."
---

# ljg-paper：读懂论文的 x → f → f(x)

把一篇论文还原成一条完整的研究逻辑：

- **x**：作者要解决什么具体问题，旧方案为什么在这里不够。
- **f**：作者提出什么方法、机制、测量方式或理论关系来处理 x。
- **f(x)**：把 f 用在 x 上得到什么结果；证据允许我们怎样更新判断或行动。

给不熟悉该领域但愿意思考的人看。读完后既知道「论文做了什么」，也知道「为什么可能有效、结果能说明到哪里」。

## Workflow Routing

| 输入 | 必读 | 输出 |
|---|---|---|
| arXiv、PDF、paper URL、本地论文 | `ReadingGuide.md` | 保存 markdown 笔记 |
| 只有论文标题 | 找到可靠原文后读 `ReadingGuide.md` | 保存 markdown 笔记 |
| 用户明确只要口头解释 | `ReadingGuide.md` | 不写文件，按同一路径讲 |

写 markdown 文件时再读 `references/template.md`。默认保存到 `~/Documents/notes/`。

文件名沿用 Denote：`{YYYYMMDDTHHMMSS}--paper-{方法名或论文关键词}__paper.md`；时间戳用 `date +%Y%m%dT%H%M%S` 生成。

## Completion Target

开头先给三行极简结论：

```markdown
- **x**：{论文被什么研究问题逼出来}
- **f**：{作者提出的核心方法、机制或新尺子}
- **f(x)**：{关键结果 + 这个结果应怎样改变判断}
```

三行必须能连读：因为 x 上的旧方案失灵，作者提出 f；f 在论文条件下作用于 x，产生 f(x)。如果 f(x) 不含证据约束，它只是启发；如果没有判断更新，它只是实验摘要。

正文通常 1000 到 1800 个汉字，不含文件头与资料校准。机制复杂时可以略长，但不沿 Abstract / Method / Experiments 顺序复述。

## ASCII Chart

方法结构和方案比较优先放进一张 ASCII chart。图的任务不是展示所有实验数字，而是让外行一眼看见「论文到底改了哪一步」。

根据论文选择一种主图：

- **方法流**：输入经过哪些关键步骤，f 在哪里改变旧流程。
- **方案对比**：baseline 与 f 使用什么信息、采取什么动作、解决什么失败。
- **因果机制**：变量怎样相互作用，为什么结果会改变。
- **测量框架**：旧尺子看见什么、漏掉什么，新尺子新增什么维度。

规则：

- 放进 Markdown fenced code block。
- 宽度不超过 80 字符。
- 通常只画一张；方法与比较能合在一张图里就不要拆开。
- baseline 最多保留 2 到 3 个真正解释 f 的对照。
- 比较维度只留能说明「为什么 f 不同」的部分，不复制 benchmark 表。
- 纯理论或解释论文没有合适图形时可以不画。

## Gotchas

- **x 不是领域背景。** 「大模型推理成本很高」太宽；「模型已经答对却无法判断何时停止」才是可研究的问题。
- **f 不是论文名或模型名。** 要说明作者改变了哪个信息、步骤、假设或测量维度，以及它为何可能处理 x。
- **f(x) 包含两层。** 先写论文内结果，再写结果带来的判断更新；不要从方法直接跳到人生启发。
- **结果必须挂回 x。** 数字只有在说明旧问题改善多少时才保留，通常 1 到 3 个关键数字足够。
- **比较不等于排行榜。** ASCII 图展示结构差异，不抄全量指标和所有 baseline。
- **评测贡献不等于科学发现。** 新 benchmark 让问题可测，不等于解释了现实世界。
- **资源论文不一定有新机制。** 它可能只是把成本、规模或可访问性推进了一步，照实写。
- **证据与范围贴着主张。** 写清结果在哪些任务、数据、模型或假设下成立，不另设一章免责声明。
- **不做审稿报告。** 不给 strong accept / reject，不展开写作评价、作者动机或完整相关工作，除非用户明确要求。
- **允许思想含量有限。** 工程增量就说是工程增量；没有直接行动启发时，f(x) 可以只更新一个研究判断。

## Quick Reference

1. 判论文主类型：解释、方法、测量、资源或理论。
2. 把领域话题收成一个具体 x，并指出旧方案失灵处。
3. 把 f 写成会运转的机制，而不是方法名。
4. 选择方法流或方案对比 ASCII 图，展示 f 改了哪里。
5. 用 2 到 4 个关键证据计算 f(x)，同时标出适用条件。
6. 从 f(x) 推出一个判断或动作，不另造应用清单。

顶层章节固定为：

1. `# x：论文要解决什么问题`
2. `# f：作者提出了什么解法`
3. `# f(x)：结果改变了什么判断`
4. `# 资料校准`

## Examples

**方法论文**

- **x**：模型已能答对，却常因不知道何时停止而浪费推理 token。
- **f**：训练一个剩余推理价值信号，在每一步判断继续推理是否仍值得。
- **f(x)**：若测试中准确率不降而推理长度缩短，系统缺的可能不是更强推理，而是收尾反馈。

```text
旧方案：问题 ──> 持续推理 ──> 固定预算耗尽 ──> 答案

新方案：问题 ──> 推理一步 ──> 估计剩余价值
                              ├─ 高：继续
                              └─ 低：停止 ──> 答案
```

**评测论文**

- **x**：主题相似度能找到相关论文，却看不出一个方案是否继承并修改了前作机制。
- **f**：增加机制谱系维度，分别检查继承关系与实质改动。
- **f(x)**：评价研究想法时，不只问「主题是否相关」，还要问「接住并改变了哪条机制线」。

## Completion

生成后读回确认：

- frontmatter 完整，文件确实保存。
- 开头恰好有 `x / f / f(x)` 三行。
- x 是研究问题与旧方案缺口，f 是可运转的解法，f(x) 是证据约束下的结果与判断更新。
- 正文四节齐全，并共同完成同一条研究逻辑。
- f 节让外行看懂方法为什么可能有效，没有退化成组件清单。
- f(x) 至少有 2 个关键证据或一个足够强的核心结果，并写明适用条件。
- 方法或比较适合可视化时有一张 ASCII 图；宽度与 Markdown fence 格式合格。
- 图没有复制全量 benchmark，也没有塞进无关 baseline。
- 主文没有 LaTeX 公式、正式审稿判决或章节式论文摘要。
- 只读开头三行，就能回答：「问题是什么、论文怎么解、结果让我们改判什么？」
