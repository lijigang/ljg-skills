---
name: ljg-paper
description: "Paper reader for non-academics. Takes a paper (URL, PDF, or file) and extracts its ideas through a 4-step pipeline: 定位(find the itch) → 翻译(Feynman explain with analogies) → 提纯(distill one insight) → 接线(connect to your world). Focuses on understanding ideas and discoveries, not academic critique. Use when user shares an arxiv link, paper URL, PDF, or asks to analyze a research paper. Trigger words: '读论文', '分析论文', 'paper', or when user shares an academic paper."
user_invocable: true
version: "3.0.0"
---

# ljg-paper: 读论文

读论文不是做学术，是猎取思想。目标：把别人的发现拆解成自己能用的认知。

## 约束

### Org-mode 语法

- 加粗用 `*bold*`（单星号），禁止 `**bold**`
- 标题层级从 `*` 开始，不跳级

### ASCII Art

所有图表用纯 ASCII 字符。允许：`+ - | / \ > < v ^ * = ~ . : # [ ] ( ) _ , ; ! ' "` 和空格。禁止 Unicode 绘图符号。

### Denote 文件规范

- 时间戳：`date +%Y%m%dT%H%M%S`
- 可读时间：`date "+%Y-%m-%d %a %H:%M"`
- 文件名：`{时间戳}--paper-{简短标题}__paper.org`
- 输出目录：`~/Documents/notes/`

### Org 文件头

```
#+title:      paper-{简短标题}
#+date:       [{YYYY-MM-DD Day HH:MM}]
#+filetags:   :paper:
#+identifier: {YYYYMMDDTHHMMSS}
#+source:     {URL 或来源描述}
#+authors:    {作者列表}
#+venue:      {发表场所/年份}
```

文件写入后报告路径。

## 执行

### 1. 获取内容

- arxiv URL → WebFetch
- PDF → Read（注意 pages 参数限制）
- 本地文件 → Read
- 论文名称 → WebSearch

确保拿到：标题、作者、摘要、引言、方法、实验/结果、结论。

### 2. 定位：它在挠什么痒？

论文解决的不是什么 "research gap"，是一个真实的困境——某件事做不到、某个现象解释不通、某条路走不下去。

- 找到那个困境，用一个*好问题*框住它
- 好问题的标准：让一个不懂这个领域的聪明人也想知道答案
- 用一段话讲清来龙去脉：从什么问题出发，之前的人试了什么，卡在了哪里

比如读一篇 RAG 论文，问题不是"本文提出了一种新的检索增强生成框架"，而是"大模型明明很聪明，为什么一问具体事实就开始胡说？"

### 3. 翻译：费曼讲解

核心规则：*如果需要用原文术语才能解释，说明还没懂。*

#### 核心机制

按这个顺序，不能反：

1. *一句话动词结构*：什么作用于什么？什么流向什么？输出什么？
2. *日常类比*：在日常经验中找一个结构匹配的东西。类比必须承重——方法的每个关键组件都能映射到类比中的一个部分。沿着类比把方法从头到尾走一遍，让读者先建立概念脚手架。
3. *ASCII 图*：读者有了脚手架之后，画出内部结构。符号在这里出现才是安全的。

#### 关键概念

论文中 1-3 个理解全文的钥匙概念。用费曼技巧讲：

- 假设读者完全不懂，从最基础的地方开始
- 每个概念给一个具体例子
- 讲完读者能用自己的话复述

#### 餐巾纸速写

在咖啡馆拿起餐巾纸给朋友画：「以前大家这么想，这篇论文说应该这么想。」

- 用 ASCII 图并排或上下放，标注关键结构差异
- 图下一句话点出：从 X 到 Y，核心变化是什么

### 4. 提纯：一个洞见

整篇论文可能有很多技术细节，但真正改变认知的往往只有一个点。把它找出来，用一句话说清楚：

> "哦，原来……"

这句话就是从这篇论文里带走的东西。说不出来，值得重读第三步。

追问两个子问题帮助提纯：
- 这个洞见为什么不显然？之前的人为什么没想到？
- 它改变了你对这个问题的哪个认知？

### 5. 接线：和我的世界连上

一个孤立的洞见很快会被遗忘。问三个问题试探连接：

- *迁移*：论文的某个机制/视角，能直接移植升级我体系里的某个零件吗？
- *混搭*：论文的某个组件和我已有的东西组合，能产生两者单独都没有的新东西吗？
- *反转*：论文的做法和我的默认假设相反吗？照出了什么盲区？

命中的标注类型并展开。没命中的跳过。三个都没命中，说「没有」。

### 6. 缝合与卫生

按 `references/template.org` 的结构，将以上结果编织成一篇连贯的解读。

写完扫一遍：
1. 否定式排比全文不超过两处
2. 三段式改两项或四项
3. 同一段落破折号不超过两个

列修改清单确认后生成文件。

### 7. 生成 Org 文件

按 Denote 规范获取时间戳，读 `references/template.org`，写入 `~/Documents/notes/`。

## 质量标准

- *问题要勾人*：定位环节的问题，让不懂的人也想知道答案。
- *类比要承重*：不是点缀，是理解的脚手架。方法的关键组件都能映射上去。
- *洞见要扎心*：一句"哦，原来……"，说不出就是没找到。
- *速写要一眼*：不看正文也能大致理解变化方向。
- *零割裂感*：读完像一个人在跟你说「我读了篇论文，它发现了啥、对我有什么用」。
