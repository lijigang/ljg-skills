---
name: ljg-present
description: "Unix 气质的演讲设计与保真排版。把 Org/Markdown 提纲或经授权提炼的讲稿制成单文件离线 HTML；以语义角色选择巨句、对照、Unicode 关系图、证据与章节版式。默认深色，支持讲稿层、原生图表与翻页笔。USE WHEN present、做演讲、slides、按 outline 美化、把讲述精髓放上屏幕。NOT FOR 未经授权改写作者内容或生成企业 PPT。"
user_invocable: true
version: "4.8.0"
---

# ljg-present：演讲铸造器

让观众一眼找到这一页的主角，让讲者有足够的提示继续展开。Unix 气质来自精确的关系、自然的文字、清楚的主次和有意保留的空白。

## Workflow Routing

| 工作 | 入口 |
|---|---|
| 生成、重排或改进演示 | [Workflows/Generate.md](Workflows/Generate.md) |

## Gotchas

- share、talk 等用途标签不决定颜色。未指定视觉主题时使用 hacker-dark。
- 两行可以是一个判断。role 由讲述功能决定；行数只参与字号与分页。
- 标题、主体、提示句不是必填三件套。主句已经完成表达时，让它独立站住。
- Unicode 连接线使用等宽网格，中文节点独立排版。不要把中文逐字塞进固定字符格。
- 静态通过不等于画面成立。构建工具固定模板；浏览器探针核对实际绘制的页面，截图另检视觉主次。

## 两种内容契约

| 模式 | 何时使用 | 保真对象 |
|---|---|---|
| faithful 保真排版 | 已有投影提纲；未授权改写 | 原文字句、顺序、表格、代码和源图 |
| editorial 演讲编排 | 用户已要求提炼讲稿、重组展示或重绘图 | 观点、证据、限定条件、数值和关系；上屏文字可在授权范围内改写 |

当前请求已授权的提炼或重绘直接执行，不重复询问。演讲编排记录 editingBasis，上屏内容以 sourceIds 回到完整来源；完整讲述放入 notes，按 N 查看。仅有「做成演示」不自动授权删改作者内容。

## 设计与实现

- 先读 [DesignSystem.md](DesignSystem.md)，按相关版式查看 [CompositionReference.md](CompositionReference.md) 的实际样张。
- 数据契约见 [RenderingSpec.md](RenderingSpec.md)；关系图、原生图表与源代码的边界见 [ChartSpec.md](ChartSpec.md)。
- 使用 Tools/BuildDeck.ts 把数据装入 SloganTemplate.html；不在产物末尾补 CSS，不另写渲染分支。
- 保留源中的章节转折与停顿。内容节点数、页数和图数都不是质量目标。
- 核心观点、重要限制和数据按投影距离保持可读；辅助信息退后或进入讲稿，不能缩小核心信息来制造留白。

## 主题

显式选择 > 明确的 theme_* 视觉标签 > hacker-dark。普通话题、用途标签不参与主题选择。

| 意图或参数 | theme |
|---|---|
| 默认、Unix、terminal、暗色 | hacker-dark |
| 浅色 Hacker、--hacker、兼容 --cyber | hacker |
| -b / --theme=black | black |
| -r / --theme=red | red |
| -y / --theme=yellow | yellow |

## 交付

一个 ~/Downloads/{title}.html，字体内嵌，图表内联，离线、零动效。→ ↓ Space Enter j PageDown 前进；← ↑ k PageUp 后退；Home/End 首末页；F 全屏；N 讲稿。滚动图形和讲稿时不触发翻页。

静态验证检查当前模板与源数据；使用 Interceptor 隔离浏览器加载 Tools/ProbeDeck.js，再看整套缩略图与代表页。隔离浏览器不可用时保留产物并如实报告未完成视觉复验，不改用主浏览器冒充验收。

## Examples

- 「按原提纲做演示，别改字」→ faithful，根据语义选版式，必要时沿源边界续页。
- 「把讲述精髓放进展示，供我现场展开」→ editorial，提炼主张、对照或关系，完整讲稿进入 notes。
- 「把旧 ASCII 图改成 Unicode」→ 记录重绘授权，以节点、连接和方向核对新图；真实代码仍逐字符保留。
