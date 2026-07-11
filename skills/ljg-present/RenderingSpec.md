# Rendering Spec

`ljg-present` 的生成契约。`Workflows/Generate.md` 在处理任何演示前读取本文件；模板与 validator 以此为准。

## 1. Source Manifest First

解析时先建立 source manifest，再生成 slides。每个源元素获得稳定的 `SRC-NNN`，每张 slide 携带 `sourceIds`。

Manifest 顺序就是原稿顺序：

1. heading
2. paragraph
3. list item
4. quote
5. table caption / table
6. example / fenced code

生成后按 slides 的首次 `sourceIds` 引用去重，必须与 manifest 顺序一致。没有源元素可以静默消失。

这里的「生成后」指完整 HTML 已完成四个占位符注入，并从最终 `<script>` 反解析出 `RAW_SLIDES` 之后。模板注入统一使用函数式 replacer；禁止把包含用户文本的字符串直接作为 `String.replace` 的 replacement string，以免 `$$`、`$&`、``$` ``、`$'` 被 JavaScript 解释成替换模式。序列化前内存对象只能做预检，不能作为最终保真证据。

## 2. Metadata, Cover and Chrome

| Source | Output |
|---|---|
| `#+title:` / Markdown H1 metadata | `<title>` 与 cover 主内容 |
| `#+author:`、`#+date:` 或用户给出的 meta | subtitle/meta footer |
| `#+filetags:` | theme inference |

Cover 规则：

- `#+title:` 始终产生第 1 页 `cover:true`。
- 第一个 outline 节点保持为后续页面。
- 仅当第一个节点的纯文本与 title 完全相同，才把该节点升级为 cover，避免重复。
- Cover 不占 source manifest ID；合并时保留节点原 sourceId。
- Cover 显式使用 `flex-direction: column`、`align-items:center`、`justify-content:center`；不要依赖默认 row 轴。
- Cover `.fit-box` 的变换原点必须是 `center center`，长标题缩放后仍留在页面中轴。
- Hacker cover 的短标题参考区间：`centerX = 47–53%W`、`centerY = 42–56%H`；portrait 仍保持同一中轴。
- Cover 必须与 footer 保持至少 `max(24px, 4vh)` 的净空。

章节标题规则：

- 一级 heading 是深场 `emphasis`，与 cover 共享中轴，以字号和内容角色形成节奏差。
- 二级及以下 heading 是浅纸 `title`，保持水平、垂直居中，并使用宽度不超过视口 `18%` 的居中短信号线。
- title 页清除源 heading level 生成的视觉 indent；深度只控制字号，不改变中轴。
- title 页不使用横贯内容宽度的 top border，也不套用普通 2/3/4 行卡片 grid。
- 浏览器验收要求：cover/title/emphasis 的 `centerX = 47–53%W`、相邻文字页中心轴变化 `≤3%W`、`centerY = 40–58%H`、`fitScale ≥ 0.80`。
- 标题页的节拍变化来自色场、字号和信号线，不来自左右位置突变。

Chrome 规则：

- 不创建承载信息的 `<header>` 或顶部 guide。
- Footer pager 每页存在。
- Meta footer 仅 `index === 0` 可见；其余页面只显示 pager。

## 3. Page Types

```jsonc
{
  "cover": true,
  "emphasis": true,
  "title": true,
  "depth": 2,
  "quote": true,
  "semanticGroup": "list-run",
  "sourceIds": ["SRC-001"],
  "lines": [
    {"indent": 0, "chunks": [{"t": "文本"}, {"t": "重点", "hl": true}]}
  ]
}
```

```jsonc
{
  "preTitle": "optional",
  "pre": "ASCII / code，逐字符保留",
  "sourceIds": ["SRC-002"]
}
```

```jsonc
{
  "table": {
    "caption": "optional",
    "header": true,
    "rows": [["A", "B"], ["C", "D"]]
  },
  "sourceIds": ["SRC-003", "SRC-004"]
}
```

`table.header` 由 Org 横线语义或 Markdown separator row 推断。不要无条件把第一行当表头；那会改变无表头表格的含义。

物理分页同时保护语义完整与投影可读性：连续、同缩进、无结构边界的列表先形成一个 run。run 为 3–4 项时整组同页；超过 4 项时按 3–4 项切页，并避免制造单项尾页。整组页写入 `semanticGroup: "list-run"`，以便浏览器审计。只有真实有效字号低于 40px 或发生溢出时，才进一步人工拆分；不能回退到「一律两项一页」。引用每页最多保留 2 个原始非空行。一个 source 跨页时，每张续页携带：

```jsonc
{"sourceParts":[{"id":"SRC-061","index":2,"total":2,"joinBefore":"\n"}]}
```

审计按 sourceId 首次出现顺序比对 manifest，并用 `index / total / joinBefore` 重建原始可见文本。同源续页必须连续、编号完整；`allSourcesReferencedOnce` 只作统计，`allSourcesReferenced` 与 `continuationsValid` 才是门槛。

## 4. Theme Grammar

一篇演示只使用一个 theme。

| theme | regular | cover / emphasis | hl |
|---|---|---|---|
| black | 黑底白字 | 红底白字 | 红 |
| red | 红底白字 | 黑底白字 | 金 |
| yellow | 黄底黑字 | 黑底白字 | 红 |
| hacker | `#EAF4EC` 纸面 / `#07110D` 字 | `#07110D` 场 / `#EAF4EC` 字 | `#00C46A` |
| hacker-dark | `#06110D` 场 / `#CFE1D5` 字 | `#020806` 深场 / `#CFE1D5` 字 | `#25E981` |

Hacker 的生成语法：

- 居中横向信号轨建立结构；左右 padding、装饰和文字共用同一中轴。
- 静态细网格只作为纸面刻度，不做全屏 HUD。
- 硬边、居中短信号和表格标签可使用 signal green。
- ASCII/pre 使用深色硬边面板。
- 无阴影漂浮、无 Matrix 雨、无闪烁、无 glow 堆叠。

`hacker-dark` 追加约束：

- 所有页面都保持暗场；普通页 `#06110D`，cover/emphasis 使用更深的 `#020806`，不能退回浅色纸面。
- 正文使用柔和灰绿 `#CFE1D5`，与普通页背景对比度必须 `≥9:1`；不用纯白制造眩光。
- 2–4 行卡片使用 `#0A1A13` 面板；信号绿只用于卡片顶边、结构轨、强调与表头标签。
- 静态网格可以存在，但不得加入 glow、shadow、CRT、Matrix rain、闪烁光标或任何 animation/transition。

## 5. Text Length and Multi-line Density

CJK 字符按 `1.8`，其他字符按 `1` 计权。

单页长度分级：`≤2 single`、`≤6 short`、`≤10 medium`、`≤26 long`、其余 `xlong`。约 6 个中文字符应进入 long，避免 medium 的超大字号再被 fit guard 二次压缩。标题页仍受自己的空间契约覆盖。

长度分级之前先识别语义原子：

- 仅一条可见文本；
- 不是列表项，也不是整行 display math；
- 用 `Intl.Segmenter(..., {granularity:"grapheme"})` 计数，去空白后 `≤16` 个字形。

语义原子写入 `data-semantic-atom=true` 与 `data-takahashi=true`。其 `.lines` 使用 `width:max-content`，`.line` 最终覆盖为 `white-space:nowrap`，再由 measured fit 对整句等比缩放。该覆盖必须位于 quote、long/xlong 和 portrait 规则之后，保证「人 → 人 + Agents」「AI 为火药，人为点火者。」这类完整短句不会被通用换行重新拆开。

```js
const weights = slide.lines.map(lineLength);
const lineCount = slide.lines.length;
const maxWeight = Math.max(...weights);
const totalWeight = weights.reduce((sum, value) => sum + value, 0);

const density =
  maxWeight >= 45 || totalWeight >= 110 ? "dense" :
  maxWeight >= 24 || totalWeight >= 65 ? "medium" :
  "light";

const layout = lineCount >= 2 && lineCount <= 4 ? "rows" : "single";
```

写入：

- slide：`data-line-count`、`data-density`、`data-layout`
- line：`data-line-index`、`data-weight`

CSS 顺序：单行 `data-len` 规则在前，多行规则在后。多行 `.lines` 使用单列 grid；`.line` 保持普通 inline content 容器。

投影字号门槛（1098×648 横屏）：

- single / short / medium 高桥流：有效字号 `≥90px`。
- title / emphasis：`≥78px`。
- long / xlong / quote：`≥42px`。
- 2–4 行普通文本：`≥40px`。
- table：`≥30px`。

连续文字页的 `centerX` 变化不得超过 `3%W`。portrait 仍保持单列和中轴，只允许对称缩小左右 padding，随后重新执行 fit。

## 6. Pretty Wrapping

- single / short / medium 与语义原子优先 `nowrap`，构成高桥流主视觉；语义原子判断优先于 CJK 加权长度。
- `long`、`xlong`、quote、多行卡片允许换行；必须先建立明确内容宽度，避免 fit guard 把 max-content 整体缩小。
- 允许换行的纯文本片段把末尾连续三个汉字及其标点包在 `.keep-cjk-tail{white-space:nowrap}` 中；span 不添加字符，`textContent` 与源文保持一致。短语义原子已经整体 nowrap，不依赖该尾段保护。
- 使用 `overflow-wrap: break-word`、`word-break: normal`、`text-wrap: pretty`。
- 禁止 `overflow-wrap: anywhere` 作为默认，它会产生难看的中文/英文断裂。
- Grid item 必须 `min-width: 0; min-height: 0`。

## 7. Measured Fit

所有可见内容放在一个 `.fit-box` 中。每次显示页面时：

1. 清除旧 transform。
2. 从 slide computed style 取四边 padding。
3. 计算 `availableWidth/availableHeight`。
4. 读取 `.fit-box.scrollWidth/scrollHeight`。
5. `scale = min(1, availableWidth/contentWidth, availableHeight/contentHeight) * 0.975`。
6. 写入 `data-fit-scale` 与 `data-fits`。

重新测量触发：

- `resize`
- `fullscreenchange`
- `document.fonts.ready`
- `ResizeObserver`（能力检测后启用）
- portrait media query 改变布局后

普通非 table/pre 文本页 `fitScale < 0.80` 视为可读性失败：先拆页，再考虑缩字。语义原子的目标是保持完整单行，验收改看最终有效字号 `computed font-size × fitScale ≥56px`；此时低于 `0.80` 的比例本身不构成失败。`fits=true` 只代表不越界，不能代替投影字号门槛。

pre/ASCII 的有效字号按物理行数验收：`≤16` 行 `≥22px`、`17–24` 行 `≥18px`、`25–28` 行 `≥15.5px`。面板整体居中、字符内部左对齐；超过 28 行或低于门槛时人工拆图，不机械截断字符画。

## 8. Offline Math

只解析闭合 delimiter；inline 起始 `$` 后不能直接是数字或问号：

- display：完整的 `$$...$$` 或整行 `$...$`
- inline：句子中的闭合 `$...$`

最低支持：

- `\cdot`、`\times`、`\propto`
- `\alpha`、`\beta`、`\gamma`
- `^{...}` / `^x`
- `_{...}` / `_x`

不认识的命令原样保留。`$20/month`、`$200/month`、`$???/month` 必须保持普通文本，即使多个价格出现在同一行也不能彼此配成公式。数字开头的数学表达式使用 `$$...$$`。

## 9. Motion and Interaction

全篇硬切。禁止：

- CSS `animation*` / `transition*` / `view-transition*` / `@keyframes`
- `scroll-behavior: smooth`
- JS `.animate()` / `setInterval()`
- 闪烁 cursor 或自动播放

允许 `requestAnimationFrame` 仅用于布局测量与 paint 后 fit，不用于视觉运动。

键盘映射：

| Action | Keys |
|---|---|
| next | ArrowRight, ArrowDown, Space, Enter, j, PageDown |
| prev | ArrowLeft, ArrowUp, k, PageUp |
| first / last | Home / End |
| fullscreen | f / F |

若事件来自 `input`、`textarea`、`select` 或 `contenteditable=true`，翻页监听必须直接返回，避免演示被嵌入交互壳后抢走编辑按键。

## 10. Verification

静态验证同时拒绝资源标签、`@import`、CSS `url(...)` 与 `image-set(...)`，确保单文件真正离线：

```bash
bun Tools/ValidateDeck.ts <html> --theme <theme>
```

视觉验证：使用 Interceptor 的隔离测试 context，至少检查：

- cover
- 一级 emphasis 与二级 title 的空间节奏；三者保持同一水平中轴
- 普通单行页
- 所有 `data-semantic-atom=true` 页：每条 `.line` 的 Range rect 行数为 1，有效字号达到对应投影门槛
- 所有 `data-semantic-group=list-run` 页：3–4 项完整同页、顺序不变、有效字号 `≥40px`
- 最长单段页
- 2/3/4 行中密度最高的页面
- 最大表格
- 最大 ASCII/pre
- 每一种公式
- landscape 与 portrait 各一种尺寸

真实浏览器逐页采集 computed style 与边界：除 table/pre 内部外，文字必须 `text-align:center`；内容中心落在 `47–53%W`；普通非 table/pre 页 `fitScale ≥0.80` 且零越界；语义原子改验最终有效字号 `≥56px` 且视觉行数为 1；其余字号满足本规范的投影门槛。table/pre 以各自的结构与密度门槛验收。

Interceptor 不可用时，保留静态证据并明确标记 deferred；不要用其他浏览器自动化或主浏览器替代。
