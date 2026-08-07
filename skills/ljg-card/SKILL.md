---
name: ljg-card
description: "Content caster (铸). Transforms text into PNG visuals through generated raster imagery plus precise HTML typography. Five molds: -l (default) long reading card, -m multi-card series, -v editorial sketchnote, -c comic, -w whiteboard. USE WHEN user says '铸', 'cast', '做成图', '做成卡片', '做成海报', '视觉笔记', '漫画', or '白板'."
user_invocable: true
version: "5.0.0"
---

# ljg-card：铸

内容进去，PNG 出来。生成图负责把思想变成可见动作，HTML 负责把话说准确；模具只决定两者怎样相遇。

## 参数

| 参数 | 模具 | 尺寸 | 图像角色 |
|---|---|---|---|
| `-l`（默认） | 长图 | 1080 × auto | 1–3 个结构性视觉锚点 |
| `-m` | 多卡 | 1080 × 1440 | 同系列母题；每卡最多一幅主图 |
| `-v` | 视觉笔记 | 1080 × auto | 六站叙事中的场景、失败与顿悟 |
| `-c` | 漫画 | 1080 × auto | 所有分格的漫画主画面 |
| `-w` | 白板 | 1080 × auto | 概念隐喻与局部手绘物件 |

未给参数时使用 `-l`。

## 必读顺序

每次执行都必须依次 Read：

1. `references/taste.md`
2. `references/image-generation.md`
3. 当前 mode 文件
4. 当前 HTML 模板

不得跳过共享图像协议直接写提示词，也不得把一种 mode 的图像语法套给另一种。

## 共同生产线

1. 读取 URL、粘贴文本或本地文件，确认标题、作者、来源与事实边界。
2. 提炼内容判断，建立视觉母题表：判断 → 冲突 → 视觉动词 → 承载物 → 安全区。
3. 调用当前环境的 image generation 工具，先生成一张代表图校准语义与系列风格；通过后才扩展其余图片。
4. 将图片保存为本地 PNG/JPG，逐一核对文件、尺寸、构图、无字与来源属性。
5. 将所有可读文字、数字、公式、标签、箭头和来源放入 HTML/CSS；图片只承担场景与隐喻。
6. 读取对应模板，替换全部占位符。无图槽必须显式设为 `data-state="empty"`；有图槽必须提供本地路径和语义化 `alt`。
7. 截图前等待字体与全部图片加载成功；任一图片损坏就停止。
8. 交付前检查整图；长图再按顶部、中段、底部做重叠分段检查。

关键生成图失败时最多做两次定向重生。仍失败就说明阻断原因，不得改用远程占位图、伪图标或矢量图悄悄兜底。

## 输入与命名

- URL：用当前可用的网页读取工具获取正文，并保存明确来源。
- 粘贴文本：直接使用，不补写原文没有的事实。
- 文件路径：Read 本地文件。
- `{name}`：从标题或核心判断提取，中文可保留，去标点，最多 20 个字符。

## 截图工具

从 skill 根目录运行：

```bash
bun assets/capture.ts <html> <png> <width> <height> [fullpage]
```

依赖缺失时：

```bash
bun install
bunx playwright install chromium
```

截图脚本会等待字体与本地图片。不要绕过它的加载门禁。

## Footer

- `-l`、`-v`、`-c`、`-w`：左侧保留 logo + 李继刚；右侧用 `{{SOURCE_LINE}}` 写明确来源，没有来源则替换为空字符串。
- `-m`：保留页码信息，不新增来源推断。
- logo 是既有品牌位图，不属于生成图，也不能拿来充当测试外的内容插图。

## mode 路由

| 参数 | mode 文件 | 模板 |
|---|---|---|
| `-l` | `references/mode-long.md` | `assets/long_template.html` |
| `-m` | `references/mode-poster.md` | `assets/poster_template.html` |
| `-v` | `references/mode-sketchnote.md` | `assets/sketchnote_template.html` |
| `-c` | `references/mode-comic.md` | `assets/comic_template.html` |
| `-w` | `references/mode-whiteboard.md` | `assets/whiteboard_template.html` |

## 交付合同

最终回复至少报告：PNG 绝对路径、像素尺寸、内容来源、使用的 mode、生成图数量，以及整图/分段视觉 QA 结果。若输入来自已验收 Org，先记录其路径与 SHA-256，制卡后再确认源文件哈希未变。

## 维护自检

升级模板或 mode 后运行：

```bash
bun run audit
bun run fixtures
```

第一条检查共享协议、五路引用、位图槽、空槽与禁用项；第二条在 `/tmp/ljg-card-v5-fixtures/` 生成五份最小代表 HTML，随后用 `capture.ts` 实际截图并读回 PNG。
