# ValidateDeck

确定性检查 `ljg-present` 生成的单文件 HTML 是否仍满足演示契约。

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
| `--theme <name>` | 对 active theme 运行额外检查；hacker 会验证三色与浅/深阅读策略 |
| `--template` | 将四个模板占位符替换为内置 fixture 后检查，同时确认占位符仍存在 |
| `--json` | 输出机器可读结果 |
| `--self-test` | 验证合规模板、拒绝动效/中轴空间回归 fixture，并覆盖 rows 布局与公式/价格边界 |
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
- 所有 line-based 页面共享居中文字契约；二级及以下 title 使用居中短信号线。
- 中等文本分级止于计权长度 10，防止约 6 个中文字符或更长标题先过度放大、再被 fit guard 极端缩小。
- 无信息 header；meta footer 仅 cover，pager 每页存在。
- lines、table、pre 三种 renderer；table 仅在 `header:true` 时生成表头。
- 2–4 行统一 rows、密度复合字号与竖屏中心轴。
- 高桥流标记、xlong 换行字号、`min-width:0` 和 measured fit guard。
- 离线公式、价格字符串保护、ASCII 行数分级与表格投影字号。
- sourceParts 续页 provenance 的运行时暴露。
- 蓝牙翻页笔常见的方向键、PageUp/PageDown，以及输入/编辑态按键保护。
- CSS/JS 零动效（含属性族与 smooth scroll）以及零资源标签、`@import`、`url(...)`、`image-set(...)`。
- Hacker 三色、浅色正文/深色章节策略与中轴对称装饰。

## Boundary

本工具验证静态结构，不替代真实浏览器。字体 fallback、实际换行、视觉节奏和每页最终 `fitScale` 仍需在 Interceptor 隔离浏览器中检查。
