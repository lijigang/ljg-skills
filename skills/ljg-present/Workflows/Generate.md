# Generate Workflow

把 Orgmode、Markdown 或纯文本铸成 outline-faithful 单文件 HTML 演示。

## 1. 说明本次使用 ljg-present

用一句话说明采用的视觉方向与保真边界。

## 2. Load the Contract

完整读取：

1. `DesignSystem.md`
2. `RenderingSpec.md`
3. `SloganTemplate.html`
4. 涉及图表时读取 `ChartSpec.md`

不要从记忆重写模板，也不要复制上一次生成的 HTML 当新模板。

## 3. Read and Inventory the Source

- 读取完整输入，不只读前几百行。
- 提取 title、subtitle/meta、filetags。
- 建立稳定 `SRC-NNN` source manifest。
- 统计 heading、paragraph、list item、quote、table、example、chart 数量。
- 记录每个源元素的原文与顺序；这是生成后的 fidelity oracle。

URL 输入先获取正文；本地文件优先直接读取。不能获取完整内容时停止并说明，不得凭摘要补写。

## 4. Resolve Theme

优先级：显式参数 > filetags > hacker-dark。

| User intent | Theme |
|---|---|
| `-r`, `--theme=red` | red |
| `-b`, `--theme=black` | black |
| `-y`, `--theme=yellow` | yellow |
| `--hacker`, Hacker style | hacker |
| `--cyber` | hacker（兼容别名） |
| 暗色 Hacker、dark Hacker | hacker-dark |
| `:share:`, `:talk:`, `:manifesto:`, `:keynote:` | red |
| `:critique:`, `:warn:`, `:rant:` | yellow |
| Unix、terminal、其他未指定主题 | hacker-dark |

若用户给出自定义视觉方向，先把它翻译成阅读策略（regular/cover/hl/结构线），再改主题变量；不要只堆效果词。

## 5. Parse into Slides

按 `RenderingSpec.md` 映射：

- Title cover 独立于 outline。
- 一级标题 → emphasis。
- 二级及更深标题 → title 页。
- 段落、列表、引用 → lines。
- table → `table`，显式写 `header: true|false`。
- example/普通 fenced code → `pre`。
- chart 块 → `chart`；源中的明确关系可补充为 chart，使用 `derivedFrom`，不替代原文。
- 新生成的字符图使用 Unicode 细线/箭头，走 `pre`，按 ChartSpec 引用 `derivedFrom`；源 ASCII/Unicode 图和代码原样保留。
- 原始内容页写 `sourceIds`；补充图只写 `derivedFrom`，不消费原文 ID。

同时建立 composition manifest（`page / sourceIds / role`）。role 不由模型自由选择，必须使用与模板一致的优先级：cover → `identity`；emphasis/title → `chapter`；chart → `chart`；table/pre → `evidence`；quote → `quotation`；2–4 行或 list-run → `sequence`；其余 → `statement`。模板会从同一组字段再次推导，并在最终 DOM 写出 `data-composition`。

分页先问「这一页是否只完成一个语义动作」。判断、比较、递进、引用和证据都可以是一个完整动作；一页包含两个无关动作时，必须在原有句界、行界或结构边界处分开。不能为满足一页一意而改写、摘要或把一个完整比较机械拆成一句一页。

分页时只切物理边界，不改文字。连续、同缩进的列表先作为一个语义 run：3–4 项整组同页；超过 4 项时按 3–4 项切页，并避免生成单项尾页。引用每页最多 2 个原始非空行。长段落优先按原有句界拆。同源拆分页写入 `sourceParts: [{id,index,total,joinBefore}]`，保持同一字号、主题和中轴。

生成单行文字页时，先于 CJK 加权长度分级识别「语义原子」：非列表、非整行公式、去空白后不超过 16 个 grapheme 的完整短句标为 `data-semantic-atom=true`。它必须单行进入高桥流，由 measured fit 整体缩放，不能被 quote/title/long 的通用换行规则覆盖。允许换行的中文长句，在渲染层以不改变可见文本的尾段 span 保护最后三个汉字及标点，避免单字孤行。

## 6. Build the HTML

从 `SloganTemplate.html` 替换四个占位符。必须使用函数式 replacer（例如 `.replace("{{SLIDES_JSON}}", () => safeJson)`），不能把内容直接作为 replacement string；后者会把公式里的 `$$` 解释成 `$`，也会解释 `$&`、``$` ``、`$'`：

| Placeholder | Value |
|---|---|
| `{{TITLE}}` | HTML-escaped document title |
| `{{SUBTITLE}}` | HTML-escaped meta，缺失则空 |
| `{{THEME}}` | black/red/yellow/hacker/hacker-dark |
| `{{SLIDES_JSON}}` | safe JSON serialization |

写到 `~/Downloads/{title}.html`。文件名去除路径字符，保留可读中文，控制在 40 字符内。

随后运行 `bun Tools/EmbedAssets.ts <deck.html>`。它将随技能提供的 IBM Plex Mono 两种字重及许可嵌入 HTML，也将 img 的本地 PNG/JPEG/WebP 引用转为 data URI。原生 Chart 本来就在 HTML 内。保真审计与 validator 必须检查这份最终文件。只交付这一个 HTML，不打 ZIP、不附依赖目录；生成图片也遵守同一契约。

## 7. Fidelity Audit

构建完整 HTML 后、写出前先从其中反解析最终 `RAW_SLIDES`，再立即检查：

1. slides 的首次 `sourceIds` 去重顺序与 source manifest 完全一致。
2. 每个 source ID 至少被引用一次。
3. 同源续页连续，`sourceParts` 严格为 `1..total`，按 `joinBefore` 重建后与源文本逐字一致。
4. 表格单元格、example 空白与公式原文保持不变。
5. Cover title 正确，原第一个节点仍存在。
6. 每个连续同缩进列表 run 的分页大小符合 `3–4` 优先且不产生人为单项尾页；生成页保留可审计的 `semanticGroup`。
7. chart 原生块按 ChartSpec 逐字段比对；新增 Unicode pre 按源文核对标签、连接和方向；补充图的 derivedFrom 指向紧邻的已保留源，数字、标签和方向均有原文依据。
8. composition manifest 中每页恰有一个角色，且与 cover/title/chart/table/pre/quote/line-count 的固定优先级一致。

审计对象必须是「最终 HTML 反解析出来的 slides」，不能只检查模板注入前的内存对象。否则 replacement string、HTML escaping 或 JSON 安全转义造成的漂移会被误报为保真。

任何漏项、重复消费或顺序漂移都先修解析器，不在输出末尾补页。

## 7.5 Minimalist Composition Audit

在静态 validator 前检查：

1. 每页只承担一个语义动作；若两个无关判断共页，回到源结构边界拆页。
2. 每页只有一个主视觉动作；Chart 的图题和关系主体共同完成一个动作。流程/比较可在图内分栏；不加装饰配图、图标或侧栏。
3. 普通文字主块保持 `≤82vw` 且左右对称；cover 上限 `84vw`。空间不足先分页，不扩大主块或降低投影字号门槛。
4. 同一 composition 的页面保持同一阅读轴；巨句居中，证据与 Chart 按内容左对齐。视觉变化来自内容长度、关系类型与分页节奏。

## 8. Static Validation

```bash
bun Tools/ValidateDeck.ts ~/Downloads/{title}.html --theme <theme>
```

失败即停止交付并修复。不要删掉 validator 不喜欢的规则来换 PASS；检查它指出的契约是否真的被破坏。

## 9. Visual Verification

用 Interceptor 隔离测试 profile 打开本地 HTML，执行 DOM、console、network、screenshot 四探针，并检查 `RenderingSpec.md` 列出的代表页。

- Interceptor gate 失败：停止浏览器流程，保留静态验证结果，报告「未浏览器复验」。
- 不触碰 Default profile。
- 不以 headless browser、系统截图或主浏览器替代。
- 检查全部七种 `data-composition` 是否与 composition manifest 一致；每种实际出现的角色至少抽查一页。
- 以 25% 缩略图或等效 contact sheet 检查整套层级：每页应只有一个立即可辨认的焦点，footer、装饰与次级内容不得形成第二焦点。
- 有 Unicode 字符图时，检查字体覆盖、线条接缝、中文列宽、箭头方向及文字原样复制；不得只以 code point 数量宣称对齐。
- 每种 chart 至少抽查一页：零基线、真实 x 间距、标签碰撞、有效字号、手机重排；用源数据比对可见值。
- 普通文字页主块宽度不超过 `82%W`、左右净空近似对称；cover 不超过 `84%W`。若要靠扩大内容区或降低字号才通过，返回分页。

## 10. Report

返回：

- HTML 的绝对路径。
- theme 与页数。
- source fidelity 结果。
- validator 结果。
- 浏览器视觉验证结果或 deferred 原因。
- 翻页键：`→ ← ↑ ↓ Space PageUp PageDown F Home End`。
