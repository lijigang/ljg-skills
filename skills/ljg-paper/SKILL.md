---
name: ljg-paper
description: "Paper reader for non-academics. Turns one paper into one clear proposition: the problem, the paper's insight, and the judgment or action the reader can carry away. USE WHEN the user shares an arXiv link OR paper URL OR PDF OR local paper file OR paper title, or asks to read, explain, analyze, or understand a paper. Defaults to a saved org note. NOT FOR experiment reproduction, exhaustive method summaries, formal peer review, benchmark tables, or literature surveys."
---

# ljg-paper：读完只带走一件事

让一个不懂该领域、但愿意思考的人，在半分钟内知道：论文被什么问题逼出来，作者多看见了什么，这会改变读者的哪个判断或动作。

全文只服务于一个中心命题。章节是理解这句话的台阶，不是几张各自交差的表。

## Workflow Routing

| 输入 | 必读 | 输出 |
|---|---|---|
| arXiv、PDF、paper URL、本地论文 | `ReadingGuide.md` | 按四段结构生成 org 笔记 |
| 只有论文标题 | 找到可靠原文后读 `ReadingGuide.md` | 按四段结构生成 org 笔记 |
| 用户明确只要口头解释 | `ReadingGuide.md` | 不写文件，按同一理解路径讲 |

写 org 文件时再读 `references/template.md`。默认保存到 `~/Documents/notes/`。

文件名沿用 Denote：`{YYYYMMDDTHHMMSS}--paper-{方法名或论文关键词}__paper.md`；时间戳用 `date +%Y%m%dT%H%M%S` 生成。

## Gotchas

- *先填章节会制造碎片。* 正文前先写中心命题；命题没立住就继续读。
- *并非每篇论文都在反对旧观念。* 评测、数据集和工具论文常常只是暴露旧尺子的盲点；不要硬造稻草人。
- *评测贡献不等于科学发现。* 新 benchmark 让某个问题变得可测，不等于解释了现实世界。
- *证据和适用范围必须贴着主张。* 独立实验摘要和独立免责声明都会切断它们与洞见的关系。
- *启发不是应用清单。* 优先只留一个判断问题，最多展开两个真正相关的用法。
- *允许思想含量有限。* 工程增量就说是工程增量；没有直接用途时不要硬编。

## Quick Reference

1. 判主类型：解释、方法、测量、资源或理论。
2. 选一个外行能看见的具体困惑，贯穿全文。
3. 写命题脊柱：「面对什么；看见什么；以后怎么判断。」
4. 依次写问题、洞见、带走，最后压出速读。

顶层章节固定为：

1. `* 速读`
2. `* 它到底在解决什么`
3. `* 它真正看见了什么`
4. `* 我能带走什么`

## Examples

**评测论文**

不要把「给科研想法加谱系评测」说成「科学想法真的像基因一样演化」。应说清旧评测漏掉了机制继承，再留下一个问题：「这个 proposal 只是主题相关，还是接住并改动了某条机制线？」

**方法论文**

不要停在「提出新模型并提升指标」。若论文在训练模型判断何时收尾，应把洞见写成：「浪费 token 可能不是不会答，而是不知道何时停。」再追问系统缺的是更强推理，还是一个收尾反馈。

## Completion

生成笔记后读回确认：

- frontmatter 完整，文件确实保存成功。
- 顶层只有四个规定章节。
- 主文没有 LaTeX 公式或旧模板章节。
- 只读速读就能复述问题、洞见和带走。
