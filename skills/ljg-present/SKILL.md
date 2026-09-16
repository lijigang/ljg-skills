---
name: ljg-present
description: "Unix 气质的极简演讲铸造器。把 Org/Markdown outline 保真铸成单文件离线 HTML，以大字、留白与原生 Chart 清楚呈现判断和关系。默认 hacker-dark，保留 hacker、black/red/yellow；支持表格、Unicode 字符图、公式、自适应和翻页笔。USE WHEN 用户要求 present、做成演讲、slides、文加图表、Hacker/Unix 风格演示、按 outline 美化。NOT FOR 内容提炼、擅自改写或企业 PPT。"
user_invocable: true
version: "4.7.1"
---

# ljg-present：演讲铸造器

把 outline 铸成舞台。文字给出判断，Chart 让关系可见。内容由作者决定，skill 决定它如何被看见。

## 核心契约

**Outline 是真理，Skill 是渲染器。**

- 标题、段落、列表项和引用不改字；表格不改结构；代码和 example 不改空格与换行。
- 全部源元素按原顺序出现，不抽提、不浓缩、不重排。允许在源句界、行界和结构边界物理分页。
- 文档 title 先生成独立 cover，第一个 outline 节点保留；仅当两者文字完全相同时合并。
- 图表使用源中的数值、标签、关系。原生 chart 块直接渲染；从正文推导的补充图紧跟来源，以 `derivedFrom` 追踪，保留原文页。
- 没有数据就不画数值曲线，没有明确方向就不加因果箭头。普通文字也可以独立完成一页，不设图表配额。

## Workflow Routing

| Workflow | Trigger | File |
|---|---|---|
| **Generate** | 讲这个、present、slides、文 + Chart、按 outline 美化 | [Workflows/Generate.md](Workflows/Generate.md) |

生成前读取 [DesignSystem.md](DesignSystem.md)、[RenderingSpec.md](RenderingSpec.md)，并使用 [SloganTemplate.html](SloganTemplate.html)。涉及图表时再读 [ChartSpec.md](ChartSpec.md)。不要从记忆重造模板。

## 设计立场

**像一份可以投影的 Unix 手册：直接、精确、安静。**

- 深色平面、暖白文字、稀疏信号色。层级来自字号、字重、距离和对齐。
- 中文优先思源黑体；英文、代码与数值使用内嵌 IBM Plex Mono。数字等宽对齐，标注靠近对象。
- 巨句与章节保留稳定中轴；表格、代码和 Chart 按自身逻辑左对齐。只有比较和流程需要局部分栏。
- 每页一个语义动作、一个视觉焦点。少字放大，关系画清，留白保留。
- 新生成的字符图默认使用 Unicode 细线框与箭头（`─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼ → ↓`），保持轻而连续的线条；原生 SVG/HTML Chart 仍按关系类型使用。
- 硬边、细分隔线、平直折线、直接标注构成视觉语言。线条必须表示边界、方向、刻度或分隔。
- 不使用屏幕噪声、扫描线、发光、渐变氛围、伪命令提示符、窗口红黄绿按钮或无意义英文标签。

设计关系、字号尺度、配色 token、强调预算和整套节奏见 DesignSystem；具体字段和保真规则见 RenderingSpec / ChartSpec。

## Theme

优先级：显式参数 > `#+filetags:` > 默认 `hacker-dark`。

| 参数 / 意图 | theme | 阅读场景 |
|---|---|---|
| 默认、Unix、terminal、暗色 Hacker | hacker-dark | 石墨黑场、暖白文字、克制琥珀重点 |
| `--hacker`、Hacker style、`--theme=hacker` | hacker | 浅色实验纸；cover/章节深场 |
| `--cyber` | hacker | 兼容别名，沿用静态平面设计 |
| `-b` / `--theme=black` | black | 黑底正文、红色章节 |
| `-r` / `--theme=red` | red | 宣言、号召 |
| `-y` / `--theme=yellow` | yellow | 反讽、警觉 |

旧参数继续可用；未指定主题的新演示采用 hacker-dark。

## 内容决定构图

| Role | 来源 | 视觉动作 |
|---|---|---|
| `identity` | cover | 标题尺度与留白 |
| `chapter` | emphasis / title | 色场或局部短信号线 |
| `statement` | 一个判断 | 大字、单一焦点 |
| `sequence` | 2–4 行 / 同层列表 | 单列递进、细线分隔 |
| `quotation` | quote | 留白与轻边界 |
| `evidence` | table / pre | 内容自身结构 |
| `chart` | chart / 有依据的补充图 | 一种关系、直接标注 |

角色由源字段确定，写入 `data-composition`。不为换花样随机换构图。文字页宽度不超过 `82vw`，cover `84vw`，Chart 主块 `82vw`；左右净空对称。Chart 内部可左对齐或分栏，外部仍共享舞台边界。

## 可读性与保真

- 单行短句去空白后 `≤16` 个字形，先按「语义原子」处理，保持整句单行。
- 同层列表 3–4 项优先同页，较长列表按 3–4 项切页并避免单项尾页。引用每页最多两个原始行。
- 横屏基准 `1098×648`：普通长文/引用 `≥42px`，多行 `≥40px`，表格 `≥30px`，Chart 标签/数值 `≥26px`；标题和短句有更高门槛，见 RenderingSpec。
- 空间不足先拆页，fit guard 只做最后微调。`fits=true` 只证明不越界；普通文本 `fitScale <0.80` 必须返工，语义原子单独验收最终字号 `≥56px`。
- Unicode 字符图按物理行数和实际字形宽度验收。源文已有的 ASCII、Unicode 图和代码逐字符保留；只在用户明确要求转换旧图时改画，并保持标签、连接和方向。公式必须闭合 delimiter，价格不能误解析。
- 图表不能靠缩到小字通过。竖屏流程/比较纵排；趋势图改为同一数据的可读列表，横屏保留趋势形状。
- 从最终 HTML 反解析 `RAW_SLIDES` 再审计 source manifest、续页和原文。占位符使用函数式 replacer，避免 `$$` 等被替换语法改坏。

## 交付与验收

输出 `~/Downloads/{title}.html`，只交付一个可直接分享与演示的文件，不交付 ZIP 或依赖 assets 文件夹。图表是内联 SVG/HTML；生成图片使用内嵌 PNG/JPEG/WebP data URI；等宽字体随 HTML 内嵌。离线、零动效，无 CDN、远程图或外链字体。

组装模板后先运行 `bun Tools/EmbedAssets.ts <deck.html>`，内嵌随技能提供的字体和 HTML 中引用的本地图片，再做最终保真与静态验收。

```bash
bun Tools/ValidateDeck.ts ~/Downloads/<deck>.html --theme <theme>
```

静态 validator 检查模板、数据和资源契约；保真仍需与完整源文比对。视觉使用 **Interceptor 隔离测试 context** 检查真实页面，覆盖典型页、最密页、每种 Chart、横竖屏与 25% 总览。静态 PASS 不代表审美或可读性通过。

隔离 context 不可用时保留产物并报告「静态验证通过，尚未浏览器视觉复验」；不改用主浏览器或其他截图工具冒充验收。

翻页：`→ ↓ Space Enter j PageDown` / `← ↑ k PageUp`；`Home End` 首末页；`F` 全屏；触屏左右滑或点击左右半屏。保留上下键与 PageUp/PageDown 以兼容发送这些键值的蓝牙/USB 翻页笔。网页需获得焦点；浏览器按键测试不能代替具体硬件实测。

## Examples

### 保真默认演示

`把 talk.org 做成演讲` → 深色 Unix 舞台；原稿顺序不变，标题 cover、大字判断、分组列表和证据页形成节奏；不为每页补图。

### 文字与关系图

`Hacker style，文 + Chart 讲清流程和数据` → 浅纸 Hacker；原文中明示的流程可生成追踪来源的补充图，数值比较用零基线条形图，时间趋势用真实间距折线；没有依据的关系保留为文字。

### 指定旧主题

`--theme=red，按 outline 美化` → 保留红色主题；仍执行相同保真、分页、无动效和真实浏览器验收契约。

默认中文；源文语言保持原样，翻译需要用户另行授权。
