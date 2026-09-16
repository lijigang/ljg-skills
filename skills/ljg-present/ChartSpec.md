# Chart Contract

模板内建四种静态关系图：`bar`、`line`、`flow`、`compare`。文字用 DOM `textContent`；折线使用原生 SVG；不接外链库，不接受模型自造任意 HTML/SVG。超出这四类的关系可用下述 Unicode 字符图补充表达，复杂到无法清晰呈现时保留原文或源表格，不强塞进近似图型。

## 来源与保真

两种入口，互斥：

1. **作者的 chart 块**：Org `#+begin_chart … #+end_chart` 或 Markdown fenced `chart`，块体为下述 chart 对象 JSON。解析为一个源元素，slide 携带非空 `sourceIds`。源数据逐字段保留，图形渲染不需要展示 JSON 的括号。
2. **源内容的补充图**：原文仍按正常页面渲染；图紧跟它所解释的原文页，slide 使用非空 `derivedFrom`，不使用 `sourceIds`。每张原文页最多紧跟一张补充图；derivedFrom 只引用该页已有 sourceIds。审计图的标签、数值、方向与源一致，图中不能新增结论。

默认只在原文已有明确数值或关系、图确实减少理解成本时加补充图。source manifest 的消费顺序只计算原始 sourceIds；derivedFrom 不是新源、不能抵消原文缺失。title / label / text / note 都取原文；可将来源原句完整用作图题。原句太长则继续保留原文页，用其中连续的原短语作图题，不创作新论点。

普通 fenced code 仍走 pre；原文中的 ASCII/Unicode 图与代码均不自动转绘。图表不与 `lines/table/pre/cover/title/emphasis/quote/sourceParts` 混用，防止 renderer 静默丢弃其中一类。

## Slide Schema

```json
{
  "derivedFrom": ["SRC-003"],
  "chart": {
    "kind": "bar",
    "title": "等待时间",
    "unit": "分钟",
    "items": [
      {"label": "串行", "value": 12},
      {"label": "并行", "value": 5, "emphasis": true}
    ]
  }
}
```

例中数值仅展示 schema，不可当现实数据使用。

| 字段 | 规则 |
|---|---|
| `kind` | bar / line / flow / compare |
| `title` | 非空；来源原句或连续原短语 |
| `items` | 源顺序；不得为美观排序 |
| `label` | 非空、原始显示文字 |
| `emphasis` | 可选 boolean；整图至多一个 true |
| `note` | 可选来源注记；不能拿微小脚注藏关键限制 |
| `unit` | 仅 bar / line；源已给出的单位，不猜单位 |
| `xLabel/yLabel` | 仅 line；原轴名 |

未知 kind 或不支持的字段报错；不要静默退化为别的图。数字必须有限，不接受数字字符串、null、NaN/Infinity 或缺值；数据缺失时保留表格并明示缺失，不补零。

### bar：共同尺度的数量比较

2–6 个 `{label, value, emphasis?}`。原顺序、共同零基线，允许正负与零。长度按全图的 `min(0,values)` 到 `max(0,values)` 比例映射；全零画零点而非虚构长度。数值直接标注，文字和条形同组，没有远离图形的图例。

不同单位、不同统计口径不能放同一尺度。不截断零基线夸大差异；比例和差额只有源文给出才标注。小于视觉分辨率的数仍保留确切标签，不把细条补成任意最小长度。

### line：真实坐标下的变化

2–6 个 `{label, x, value, emphasis?}`；`x` 数值严格递增，相邻点的距离必须按真实 x 差映射。`label` 是该坐标的源显示文字，例如 x=2024、label=「2024年」。一张图一条序列，用直线连接观测点；不平滑，不补未知点，不做预测延长。

纵轴包含零点；可见数值贴近各点，标签或数值碰撞时降低每图点数或保留表格。拆图保留来源分段说明，不把不同尺度的两个小图伪装成连续同尺度曲线。

横屏 SVG 显示趋势；竖屏显示相同顺序的 label / x / value 数据列表。label 已等于 x 字符串时不重复 x。竖屏数据列表保证可读，趋势形状以横屏查看。

### flow：原文明示的方向

2–4 个 `{label, text?, emphasis?}`，源顺序；横屏从左向右，竖屏从上向下。`text` 可选，用原文解释节点。连接箭头只表示原文明示的顺序或流向。并列概念不给箭头；相关性不自动升级为因果关系。分支/循环超出本版原生 flow 的表达范围；简单且源文明示的关系可按下节补充 Unicode 字符图，否则保留原文。

### compare：两个对象的同维度并置

恰好两个 `{label, text, emphasis?}`。沿相同起点、相同字体和共同维度对齐，靠分隔线与留白区分；不画两张厚框卡片。竖屏按原顺序堆叠。无可比维度时继续使用普通文字页。

## Unicode 字符图

新画的树、分支、循环或紧凑结构图优先使用 Unicode 细线与箭头，走已有 `pre` 渲染器，composition 仍为 evidence；它不新增 `chart.kind`。原生数值 Chart 保持 SVG/HTML。

```text
┌────────┐    ┌────────┐
│ input  │───→│ output │
└────────┘    └────────┘
```

这是线条示例，不是必须套用的框。带中文标签时以实际渲染宽度调整，不按一个 Unicode code point 等于一列计算。

- 作者提供的字符图：`{pre, sourceIds}`，逐字符保留。
- 根据原文新增的 Unicode 图：`{pre, preTitle?, derivedFrom}`，不同时填写 sourceIds；紧跟单个来源页，每页至多一张补充图。标签、关系、方向与原文一致，保留原文页。
- 原文 ASCII 的转换需要明确授权；只重绘线条，不增删节点，不修改标签，不把并列改为有向关系。
- 模板自动识别 Unicode 线框字符并标记 `data-pre-kind="unicode-diagram"`，只调整排版，不替换任何字符。单纯代码或源 ASCII 保持原排版路径。
- 确认线框、转角、交点与箭头的字体覆盖；横竖屏检查接缝、列对齐、缺字、溢出和有效字号。preCols 仅是字符计数诊断，不能当作显示列数。

## 图形语言与验收

- Chart 标题与主体左对齐，整个主块仍在舞台中间且 ≤82vw。分栏仅发生在图内。
- 信号色至多强调一个对象，其余用正文色；折线只保留必要基线、点和直线。
- 横屏基准 `1098×648`：图题 ≥40px，标签/数值/解释 ≥26px，注记 ≥20px；竖屏 ≤480px：标签 ≥16px、图题 ≥24px。有效字号计入 SVG viewBox 缩放与 fitScale。
- 单页一个关系；超密、标签撞线、注记挤出舞台、读不清数值都要返工，不能缩到 fits=true 就交付。
- SVG 有 title / desc；手机数据列表与 SVG 同一数据源。DOM 暴露 `data-chart-kind`、`data-derived-from`，供视觉和保真审计。
- 静态校验可以证明 schema、来源引用与代码契约。方向是否有原文依据、标题是否忠实、数值标签是否碰撞，仍需完整源文审计和实际浏览器观察。
