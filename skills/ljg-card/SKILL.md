---
name: ljg-card
description: "Content caster (铸). Transforms text into PNG visuals through generated raster imagery plus precise HTML typography. Three molds: -l (default) long reading card, -c comic, -w whiteboard. USE WHEN user says '铸', 'cast', '做成图', '做成卡片', '做成海报', '漫画', or '白板'."
user_invocable: true
version: "7.0.0"
---

# ljg-card：铸

内容进去，PNG 出来。生成图负责把思想变成可见动作，HTML 负责把话说准确；模具只决定两者怎样相遇。

## 参数

| 参数 | 模具 | 尺寸 | 图像角色 |
|---|---|---|---|
| `-l`（默认） | 长图 | 1080 × auto | 1–3 个结构性视觉锚点 |
| `-c` | 漫画 | 1080 × auto | 缺口驱动、同案重跑的漫画分镜 |
| `-w` | 白板 | 1080 × auto | 概念隐喻与局部手绘物件 |

未给参数时使用 `-l`。

## 必读顺序

每次执行都必须依次 Read：

1. `references/taste.md`
2. `references/image-generation.md`
3. 当前 mode 文件
4. 当前 HTML 模板

不得跳过共享图像协议直接写提示词，也不得把一种 mode 的图像语法套给另一种。

## 全局临时目录约束

无论从哪个目录启动，制卡前都必须在 `/tmp` 下建立本任务独占的临时目录。生成图候选稿、用于组版的源图、HTML、CSS、矢量草稿、渲染输入、截图草稿、QA 切片、缓存与日志等所有中间产物，全部只能写入该目录。

只有用户明确要求交付的最终文件可以写入 `/tmp` 之外。候选 PNG 和未通过验收的渲染结果仍属于中间产物。完成前检查当前目录和仓库没有遗留中间文件，最终交付物验收后清理本任务的临时目录。

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

- `-l`、`-c`、`-w`：左侧保留 logo + 李继刚；右侧用 `{{SOURCE_LINE}}` 写明确来源，没有来源则替换为空字符串。
- logo 是既有品牌位图，不属于生成图，也不能拿来充当测试外的内容插图。

## mode 路由

| 参数 | mode 文件 | 模板 |
|---|---|---|
| `-l` | `references/mode-long.md` | `assets/long_template.html` |
| `-c` | `references/mode-comic.md` | `assets/comic_template.html` |
| `-w` | `references/mode-whiteboard.md` | `assets/whiteboard_template.html` |

## Gotchas

- `-c` 的格数由认知因果拍点决定，不设固定范围。短内容不凑格，长内容不因模板删掉承重关系。
- 漫画主画面负责让动作与结果可见；概念名、对白、旁白和证据分寸仍由 HTML/CSS 写准，不能让图片模型代写解释。
- 同案重跑要求角色、道具与空间连续。每格换一套隐喻会切断前后比较，即使单格都好看也不成立。
- `object-fit: cover` 可能只裁坏一格。逐资产检查后仍要扫描所有分格的脸、手、关键道具与动作点，再检查最终 DOM、整图和重叠切片。

## Examples

**Example 1：把技术概念铸成漫画**

```text
User: 「把这篇技术解释做成漫画 -c」
→ 固定一个最小案例，让零号模型先运行并暴露失败
→ 每次只用一格引入当前缺口需要的概念，再回到同案重跑
→ 最后从头运行完整模型，并留一个边界拍点
```

**Example 2：把完整长文铸成漫画**

```text
User: 「把这份已验收的完整笔记做成漫画 -c，不限格数」
→ 先锁定 Org 路径与 SHA-256，再从全文因果主线选择认知拍点
→ 格数服从承重关系与删除测试，不继承旧五格或固定页数
→ 生成分格、组装 HTML，完成逐图、整图与重叠切片 QA
```

## 交付合同

最终回复至少报告：PNG 绝对路径、像素尺寸、内容来源、使用的 mode、生成图数量，以及整图/分段视觉 QA 结果。若输入来自已验收 Org，先记录其路径与 SHA-256，制卡后再确认源文件哈希未变。

## 维护自检

升级模板或 mode 后运行：

```bash
bun run audit
bun run fixtures
```

第一条检查共享协议、三路引用、位图槽、空槽与禁用项；第二条在 `/tmp/ljg-card-v7-fixtures/` 生成三份最小代表 HTML，随后用 `capture.ts` 实际截图并读回 PNG。
