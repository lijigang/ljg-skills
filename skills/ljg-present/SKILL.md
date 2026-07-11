---
name: ljg-present
description: "演讲铸造器（Outline-Faithful）。把 orgmode/markdown outline 1:1 铸成单文件离线 HTML；支持 black/red/yellow、浅色 hacker 与暗色 hacker-dark，自动处理标题封面、多行密度布局、表格、ASCII、LaTeX、自适应与翻页笔。USE WHEN 用户要求讲这个、present、做成演讲、slides、标语流、宣言体、slogan、manifesto、按 outline 美化。NOT FOR 内容提炼、改写或企业 PPT。"
user_invocable: true
version: "4.4.0"
---

# ljg-present：演讲铸造器

把 outline 铸成舞台。内容由作者决定，skill 只决定它如何被看见。

## 核心契约

**Outline 是真理，Skill 是渲染器。**

- 标题、段落、列表项、引用不改字。
- 表格不改结构，example/代码块不改空格与换行。
- 所有源元素按原顺序出现；不抽提、不浓缩、不重排。
- 唯一允许改变的是物理分页与视觉构图。
- `#+title:` 是文档标题，必须先生成独立 cover；第一个 outline 节点仍在下一页。若两者文字完全相同，可合并为 cover，不能重复。

## Workflow Routing

| Workflow | Trigger | File |
|---|---|---|
| **Generate** | 讲这个、present、做成演讲、slides、按 outline 美化、生成 HTML 演示 | `Workflows/Generate.md` |

生成时先读 `RenderingSpec.md`，再使用根目录 `SloganTemplate.html`。不要根据记忆重造模板。

## Quick Reference

### 输入与输出

- 输入：Orgmode、Markdown 或纯文本。
- 输出：`~/Downloads/{title}.html`，单文件、离线、无外链资源。
- 首屏：文档标题 cover。
- 空间节奏：所有文字页共享稳定中轴；cover 与章节页靠深浅色场、字号和居中短信号线区分。
- Header：不承载任何信息。
- Footer：首页显示页码与 subtitle/meta；其他页只显示页码。

### Theme

优先级：显式参数 > `#+filetags:` > 默认 `black`。

| 参数 | theme | 调性 |
|---|---|---|
| `-b` / `--theme=black` | black | 沉思、论证 |
| `-r` / `--theme=red` | red | 宣言、号召 |
| `-y` / `--theme=yellow` | yellow | 反讽、警觉 |
| `--hacker` | hacker | 逆向工程实验纸 |
| `--cyber` | hacker | 兼容别名；不再生成 CRT/HUD |
| `--theme=hacker-dark` | hacker-dark | 低眩光深色终端；全页暗场、柔和灰绿正文 |

Hacker 有两个静态阅读变体。二者都拒绝荧光特效堆叠：

```css
--hacker-void:   #07110D;
--hacker-paper:  #EAF4EC;
--hacker-signal: #00C46A;

--hacker-dark-bg:     #06110D;
--hacker-dark-deep:   #020806;
--hacker-dark-panel:  #0A1A13;
--hacker-dark-fg:     #CFE1D5;
--hacker-dark-signal: #25E981;
```

`hacker` 的普通页使用浅色实验纸；`hacker-dark` 的所有页面使用深色场，cover 与一级章节再压深一档。暗色正文不是纯白，而是柔和灰绿；信号绿只承担居中信号轨、重点和表格标签。不要矩阵雨、发光描边、伪 HUD 或闪烁光标。

### Outline 映射

| Source | Page |
|---|---|
| `* 一级标题` | 独占 emphasis 章节页 |
| `**` 及更深标题 | 独占 title 页；深度越高字号越低 |
| 段落 | theme 文本页；仅在必要时物理拆页 |
| 列表 | 同层级连续 3–4 项优先整组同页；更长列表切成 3–4 项一页且避免单项尾页 |
| 表格 | table 页；超过 6 行分页并重复表头 |
| 引用 | quote 页；超过 2 个原始行时续页并记录 sourceParts |
| `#+begin_example` / fenced code | pre 页，逐字符保留 |
| `*强调*` / `~code~` / `=verbatim=` | `hl: true`；emphasis 页忽略 inline hl |

### 多行不是统一降字号

多行页同时看「行数」和「文本密度」，但始终使用单列 `rows`：

- 2、3、4 行全部沿页面中轴纵向排列，不在翻页时切换左右阅读路径。
- 字号由「行数 + light/medium/dense」复合规则决定；先拆页、再放大，最后才由 fit guard 微调。
- 单行、非列表、非整行公式且去空白后 `≤16` 个字形的内容先判为「语义原子」：即使 CJK 权重落入 long，也整句单行并进入高桥流。
- 连续同层级列表先保语义块：3–4 项整组同页；超过 4 项时切成 3–4 项，并避免把最后一项单独遗留。
- 网格项必须 `min-width: 0`，正文自然换行；不要把 `.line` 设成 flex/grid，以免拆散高亮与公式。
- 单行 single/short/medium 使用「高桥流」：少字就是主视觉，横屏有效字号以 `≥90px` 为目标。

阈值和 DOM 字段以 `RenderingSpec.md` 为准。

### 公式、ASCII 与尺寸

- 只把闭合的 `$...$` / `$$...$$` 当作公式；`$20/month` 这类价格不是公式。
- 离线渲染常用符号、上下标，不依赖 MathJax/CDN。
- ASCII/pre 按物理行数分级：`≤16` 行从 22px、`17–24` 行从 18px、`25–28` 行从 15.5px 起；面板居中、字符内部左对齐。
- 普通长文本/引用目标有效字号 `≥42px`，2–4 行文本 `≥40px`，表格 `≥30px`；达不到时优先分页。
- 每页都测量真实可用宽高；监听 resize、fullscreen、字体就绪和 ResizeObserver。
- `data-fits=true` 只证明没有越界；普通非 table/pre 文本页若 `fitScale < 0.80`，必须重新拆页。语义原子为了保持完整单行，以最终有效字号 `≥56px` 为门槛，不再用原始字号比例误判。

## 通用交互

- `→` `↓` `Space` `Enter` `j` `PageDown`：下一页。
- `←` `↑` `k` `PageUp`：上一页。
- `Home` / `End`：首末页。
- `f` / `F`：全屏。
- 触屏左右滑、点击左右半屏：翻页。

上下键与 PageUp/PageDown 同时保留，因为不同蓝牙翻页笔发送的键值不同。

## 验收门槛

写出 HTML 后运行：

```bash
bun Tools/ValidateDeck.ts ~/Downloads/<deck>.html --theme <theme>
```

Validator 负责静态契约：模板版本、JS 语法、标题 cover、header/footer、零动效、公式保护、多行布局、fit guard、页面类型、翻页键和外链资源。

视觉判断必须用 Interceptor 在隔离浏览器中复验典型页与高密度页。若隔离 context 不可用，报告「静态验证通过，尚未浏览器视觉复验」；不能改用主浏览器或其他截图工具，也不能宣称视觉已验证。

## Gotchas

- **视觉居中不等于只写 `text-align:center`。** 文字对齐、左右 padding、装饰轨道和 transform origin 必须共同使用同一中轴，否则翻页仍会漂移。
- **Cover、emphasis、title 是同轴的三种空间角色。** 它们用字号、深浅色场和短信号线形成节奏，不再更换左右锚点。
- **缩放原点也是构图。** 文字页统一用 `center center`；否则 fit 后会把原本居中的内容重新拉偏。
- **Theme 不是配色别名。** 纯黑配纯白会让长演示疲劳；暗色 Hacker 使用深绿黑、柔和灰绿文字与两档暗场，信息层级来自结构线和明度差，不来自荧光特效数量。
- **「放得下」不是「后排看得清」。** 多行页不能只按最长字符降字号；列表优先保持 3–4 项语义块，引用最多两行，低于投影字号门槛再续页。
- **语法长度不等于语义长度。** 「AI 为火药，人为点火者。」这类短句即使 CJK 加权后进入 long，也必须先按完整语义原子处理，不能让通用换行规则把尾字甩到下一行。
- **分页单位不是固定两项。** 同标题、同层级、连续 3–4 项往往构成一个比较或推演；先整组同页，再以真实有效字号和溢出决定是否需要人工拆分。
- **中文句尾要防孤字。** 允许换行的长句用不改变 `textContent` 的尾段 span 保住最后三个汉字及标点；不要插隐藏字符污染复制结果。
- **`vmin` 不是响应式。** 固定字号只能估算；真实边界必须由 `scrollWidth/scrollHeight` 与可用宽高共同计算。
- **`fits` 不等于可读。** 极端缩小仍可能得到 `fits=true`；普通文本页 `fitScale < 0.80` 或低于投影字号门槛都应重新分页。语义原子单独验收最终有效字号，因为它的目标就是整句等比缩放成一行。
- **ASCII 的上限由行数决定。** 28 行字符图在 648px 高的屏幕上不可能同时达到 22px；必须使用按密度分级的物理下限，必要时人工拆图。
- **公式识别必须要求闭合 delimiter。** 否则价格、货币或路径中的 `$` 会被误判。
- **多行网格要设 `min-width: 0`。** 缺少它时，长词或公式会把列撑出 viewport。
- **`.line` 保持行内容器。** 将其设成 flex/grid 会拆开 chunks、inline math 与高亮；布局应作用于 `.lines`。
- **Header 与 footer 是不同契约。** Header 不放信息；meta 只在 cover footer，pager 每页都有。
- **禁止所有视觉动效。** 不只检查 shorthand，还要覆盖 `animation-*`、`transition-*`、`view-transition-*`、smooth scroll、`.animate()` 与定时器。
- **离线不能只扫 `<img>` 和 `https://`。** CSS 相对 `url(...)`、`@import`、`image-set(...)` 同样会让单文件在别的机器上缺资源。
- **真实浏览器证据不可替代。** 静态 validator 能阻止结构回归，但不能证明字体、换行和视觉节奏在真实 Chrome 中成立。
- **占位符注入必须使用函数式 replacer。** `String.replace(pattern, replacementString)` 会解释 `$$`、`$&`、``$` ``、`$'` 等替换模式，可能静默改坏 LaTeX 或正文；四个模板占位符都用 `() => value` 注入。
- **保真审计必须覆盖最终 HTML。** 只审计序列化前的内存 slides 会漏掉注入层漂移；写出前先从完整 HTML 反解析 `RAW_SLIDES`，再对 source manifest、可见文本、continuation 与 example 重新跑同一套审计。

## Examples

### Example 1：常规 outline 演示

```text
User: 用 ljg-present 讲这个 ~/Documents/notes/talk.org
→ 读取 Generate workflow、RenderingSpec 与 SloganTemplate
→ 保留全部 outline，生成标题 cover 与 black/red/yellow 主题页面
→ 运行 ValidateDeck，再输出 ~/Downloads/<title>.html
```

### Example 2：静态 Hacker 演示

```text
User: 把这篇 org 做成 Hacker style，不要动效
→ 选择 --hacker，普通页浅底、章节页深底
→ 所有文字页保持中轴；短句走高桥流，多行统一 rows 并先拆页
→ 验证零动效、公式、footer、自适应与翻页笔
```

### Example 3：静态暗色 Hacker 演示

```text
User: 整体改成暗色 Hacker style，不要任何动效
→ 选择 --theme=hacker-dark，全页使用深绿黑场与柔和灰绿正文
→ cover/emphasis 再压深一档，信号绿仅用于结构线、重点和标签
→ 验证正文对比度 ≥9:1、零阴影/动效、双尺寸零越界
```

## 中文默认

默认输出中文；原文是英文且用户要求保留时，不翻译。
