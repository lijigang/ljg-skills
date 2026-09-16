# ValidateDeck

确定性检查 `ljg-present` v4.7.1 生成的单文件 HTML 是否仍满足演示契约。

## Usage

```bash
bun Tools/ValidateDeck.ts <deck.html> --theme hacker
bun Tools/ValidateDeck.ts SloganTemplate.html --template --theme hacker
bun Tools/ValidateDeck.ts --self-test
bun Tools/ValidateDeck.ts --help
```

## Options

| Option | Meaning |
|---|---|
| `--theme <name>` | 对 active theme 运行额外检查；Hacker 验证石墨黑、暖白与琥珀配色、纯色场及浅/深阅读策略 |
| `--template` | 将四个模板占位符替换为内置 fixture 后检查，同时确认占位符仍存在 |
| `--json` | 输出机器可读结果 |
| `--self-test` | 验证合规模板、动效/资源/空间反例、chart 数据与来源边界，并执行模板 chart renderer 的几何和文本安全测试 |
| `--help` | 显示帮助 |

## Exit Codes

| Code | Meaning |
|---:|---|
| 0 | 所有检查通过 |
| 1 | 至少一个契约失败 |
| 2 | 参数错误或缺少输入文件 |

## What It Checks

- 模板版本与 JavaScript 语法。
- 文档标题 cover 与无重复合并路径。
- Cover 显式采用 column 轴的水平/垂直居中，并以中心为缩放原点。
- 七种 composition role 只由源语义字段确定性推导，并暴露为 `data-composition`；chart 加入已有六种角色，没有随机模板入口。
- 普通文字主块保持 `≤82vw` 与对称 stage padding，留白不能被扩宽内容区偷偷吃掉。
- 所有 line-based 页面共享居中文字契约；二级及以下 title 使用居中短信号线。
- 中等文本分级止于计权长度 10，防止约 6 个中文字符或更长标题先过度放大、再被 fit guard 极端缩小。
- 无信息 header；meta footer 仅 cover，pager 每页存在。
- lines、table、pre、chart renderer；table 仅在 `header:true` 时生成表头。
- 从最终 HTML 的 `RAW_SLIDES` 重新解析 chart：bar/line 为 2–6 项，flow 为 2–4 项，compare 恰好两项，最多一项高亮；值必须有限，line 的 x 必须严格递增。
- Chart 与其他内容类型和续页字段互斥；原生 chart 必须有非空 `sourceIds`，补充 chart 必须有非空 `derivedFrom`，二者互斥。补充图只能紧跟单个原文页，引用的全部 source ID 必须出现在该页；每个源页最多一张补充图，不允许跨页汇总或连续追加多张补充图。
- Chart 的标题、标签、正文及可选字段类型；拒绝未支持字段，避免数据被悄悄忽略。`xLabel/yLabel` 只用于 line，`unit` 只用于 bar/line。
- Chart 来源和图形种类的运行时审计字段；line 的竖屏数据阅读视图。
- 2–4 行统一 rows、密度复合字号与竖屏中心轴。
- 高桥流标记、xlong 换行字号、`min-width:0`、留白预算和 measured fit guard。
- 离线公式、价格字符串保护、Unicode / 源 ASCII 字符图行数分级与表格投影字号。
- sourceParts 续页 provenance 的运行时暴露。
- 蓝牙翻页笔常见的方向键、PageUp/PageDown，以及输入/编辑态按键保护。
- CSS/JS/SVG 零动效（含属性族、计时器、smooth scroll 和 SVG animate/set）。
- 单一内联运行脚本、零外部资源依赖：允许原生内联 SVG、标准 namespace 和 `<use href="#id">`；拒绝外部脚本、foreignObject、相对/远程资源、CSS import/image-set 及网络调用。
- HTML `<img>` 与 SVG `<image>` 必须把 PNG/JPEG/WEBP 内嵌为 `data:image/...;base64,...`；检查 base64 格式、MIME 白名单与文件签名字节，拒绝 GIF、SVG data payload、类型伪装及 srcset 外部候选。
- CSS `url(...)` 只允许 `@font-face` 的 `src` 引用内嵌 TTF/OTF/WOFF/WOFF2，并核对 `data:font/...;base64,...` 与签名字节；其它 CSS URL（包括背景图与局部引用）不允许。所有 style 块和内联 style 都会扫描。
- 原文中的字面 `<svg>`、`<script>`、网址和代码文本不视为正在加载的资源。
- Hacker 使用石墨黑 `#18191C`、暖白 `#E8E5DF` 与琥珀 `#D7AF74`；浅色阅读纸为 `#F2F0EB`，浅底强调为 `#825B25`。保留浅色正文/深色章节策略与对称边距；拒绝纹理、全页伪元素信号轨、发光、阴影和滤镜。

## Self-Test Behavior

自测会执行模板中实际的 `renderChart`，在最小 DOM fixture 上检查正负条形的共同零基线、全零输入、line 的真实 x 间距与原始点数、竖屏数据的顺序和数值坐标、compare 顺序，以及作者文字始终走 `textContent`。调色板桩还检查 SVG 线条、节点、文字的显式颜色与字体属性，避免依赖截图器未保留的 CSS。同时以正反数据验证 chart 契约和内嵌资源白名单，确认错误 chart、外链、非许可 data MIME 及签名伪装会被拒绝。

## Boundary

本工具验证静态结构和有限 renderer 行为，不替代真实浏览器，也不是通用 HTML 安全审计器。资源签名检查不等于完整解码验证。IBM Plex Mono 以 `Deck Mono` 嵌入 HTML 的存在性和许可证由 `EmbedAssets.ts` 验证；未嵌入字体的模板 fixture 不因此失败。字体实际载入、Source Han Sans CN 中文 fallback、图片解码、实际换行、图表标注碰撞、视觉节奏和每页最终 `fitScale` 仍需在 Interceptor 隔离浏览器中检查。数据结构通过仅说明来源标记完整；箭头关系和数值是否真实来自原文，还需内容保真审计。
