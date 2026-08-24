# AnnotateAndRender

把一章古文变成「原文主干 + 彩色夹注 + 完整章节解读」的单张长 PNG。

## Step 0 — Sufficiency Check

先读用户输入与最近上下文，确认三件事：原文、书名、章节。

- 三项齐全：直接执行。
- 书名或章节可从标题唯一推出：采用该判断，并用一行说明推断。
- 存在两个会改变底本或章节范围的解释：最多问 3 个短问题；用户回复 `proceed` 时采用最可信版本并显式标注来源边界。
- 只有一句短句且用户只问意思：退出本技能，改做普通翻译。

## Step 1 — 加载合同

完整读取：

1. `~/.agents/skills/ljg-plain/SKILL.md`
2. `~/.agents/skills/ljg-writes/SKILL.md`
3. `~/.agents/skills/ljg-writes/Workflows/WriteEssay.md`
4. `References/AnnotationMethod.md`
5. `References/LayoutGrammar.md`
6. `References/InputSchema.md`

借用前两个技能的语言与理解标准，不执行它们各自的 Org 落盘步骤。本工作流在 `/tmp` 生成 classic JSON、HTML、候选 PNG、manifest 与复验切片，最终只交付通过验收的 PNG。

## Step 2 — 锁定原文

1. 原样保存用户提供的底本文字、标点、书名、章节和来源描述。
2. 用户只给书名与章节时，使用可核验的权威或公开底本；联网读取遵守当前 `web-access` 合同。
3. 不把网络现代改写冒充原文。底本间有关键异文时，选择一个主底本，并在 `source` 或 `variant` 注中说明。
4. 建立原文连续读回串。渲染后的黑色原文按顺序拼接，必须与底本逐字一致。

## Step 3 — 做逐字注解

按 `References/AnnotationMethod.md` 切成最小有意义单位：

- 每个非标点 token 必须有 `note`。
- `word`：字义、词义、虚词功能、语法、古今义。
- `clause`：当前短句在做什么、动作指向谁、因果如何接上。
- `variant`：通假、异文、底本疑点或解释分歧。
- 生僻读音才写 `pinyin`，不把每个常用字都标成拼音教材。

完成后做覆盖检查：非标点 token 数 = 有注 token 数。任何缺口都先补注，再写章节解读。

## Step 4 — 写全章解读

先用一句普通话固定全章主关系：

```text
在什么条件下，谁通过什么动作改变了什么，最后产生什么结果。
```

随后内部运行 `ljg-plain` 与 `ljg-writes` 的共同检查：

1. 用聪明的 12 岁孩子能复述的中文说清承重词。
2. 从章内一个最小情境启动，让自然解释先运行，再指出它漏掉的那一步。
3. 每次只补当前缺口需要的一个区分，回到同一情境重跑。
4. 最后重新接起「条件—机制—结果」。
5. 留下一个跨场景迁移或一个失效边界。

默认 900–1500 个中文字符，写成自然推进的 3–6 段。可有唯一标题「章节解读」，正文不展示“零号模型、概念补位、迁移测试”等脚手架。不得虚构作者经历或现代故事。

边界必须埋进自然叙述，不得出现「解读边界」「应用边界」「失效边界」等独立标题或提示语。读者应该直接读到限制条件，不应看见写作者的检查表。

## Step 4.5 — 生成顶部意旨图

默认使用内置 `image_gen` 生成一幅横向章节意旨图；用户明确说「不要配图」「纯文字」时省略。配图只抓本章的一个主关系，不逐句画故事。

提示词必须包含：

- 画面用途：古文长图顶部，横向 3:2，标题下、原文前。
- 核心意旨：用一个可见动作或状态表达本章主关系。
- 气质：古雅、柔和、通透，大量留白，低对比。
- 媒介：水墨或淡矿物色，暖纸底，可有细微纸纹。
- 禁止：文字、书法、标题、印章、水印、边框、高饱和、拥挤场景、无法核验的历史细节。

使用内置 `image_gen` 后，把选中的 PNG 复制进本次独占 `/tmp` 工作区的 `assets/`。生成失败或工具不可用时，不阻断正文：省略 `heroImage` 与 `heroAlt`，继续渲染，并在交付中说明无图原因。不得用远程图片 URL 或占位图蒙混；配图必须是工作区内真实存在、能嵌入 HTML 并参与 manifest 哈希校验的本地文件。

## Step 5 — 建立隔离工作区并生成 classic JSON

每次运行建立一个新的独占工作区。不要复用上一轮目录，也不要在仓库、笔记目录、当前工作目录或 Downloads 中生成过程文件。

```bash
run_dir="$(mktemp -d /tmp/ljg-classic.XXXXXX)"
mkdir -p "$run_dir/assets" "$run_dir/qa-slices"
```

按 `References/InputSchema.md` 把以下过程文件全部写入 `$run_dir`：

```text
$run_dir/{timestamp}--classic-{safe-name}.json
$run_dir/{timestamp}--classic-{safe-name}.html
$run_dir/{timestamp}--classic-{safe-name}.candidate.png
$run_dir/{timestamp}--classic-{safe-name}.candidate.manifest.json
$run_dir/assets/{safe-name}-意旨图.png
$run_dir/qa-slices/*.png
```

`{safe-name}` 由书名与章节构成，并移除路径分隔符与控制字符。即使用户要求“重做、修改、重跑”，也新建本轮工作区；只有最终交付路径可在用户明确要求时覆盖。

`original` 保存锁定后的完整底本；不得省略。渲染器会将所有 token 的 `text` 顺序拼接，并与它逐字比对。

## Intent-to-Flag Mapping

| 用户表达 | 参数 | 作用 |
|---|---|---|
| 默认、配图、古雅 | JSON `heroImage` + `heroAlt` | 生成并嵌入顶部意旨图 |
| 不要配图、纯文字 | 省略 `heroImage` + `heroAlt` | 保持纯文字长图 |
| 默认、长图、一张图 | `--width 1080` | 标准阅读宽度 |
| 指定宽度 | `--width <像素>` | 仅在 720–1600 范围内采用 |
| 指定最终 PNG 路径 | 交付阶段复制到 `<path>` | 本次显式目标覆盖默认 `$HOME/Downloads/` |
| 保留指定 HTML | 验收后复制 HTML 到 `<path>` | 未明确要求时 HTML 只留在 `/tmp` |

## Step 6 — 渲染

从技能根目录运行：

```bash
bun Tools/RenderClassic.ts \
  --input "$run_dir/<classic.json>" \
  --output "$run_dir/<classic.candidate.png>" \
  --html "$run_dir/<classic.html>" \
  --width 1080 \
  --slices-dir "$run_dir/qa-slices"
```

首次缺依赖时只用：

```bash
bun install
bunx playwright install chromium
```

不得改用 `npm`、`npx`、Python 排版脚本或远程截图服务。

## Step 7 — 验收

依次执行：

```bash
bun Tools/ValidateClassic.ts \
  --input "$run_dir/<classic.json>" \
  --png "$run_dir/<classic.candidate.png>" \
  --manifest "$run_dir/<classic.candidate.manifest.json>"
```

再做视觉读回：

1. 看整图：书名、章节、意旨图、原文、注解、章节解读和来源层级是否一眼分开。
2. 看顶部：意旨图位于标题后、原文前；无字、无水印、不过亮，且不会把标题或第一段挤出阅读节奏。
3. 看中段：夹注没有盖住原文，颜色没有混义，断行不把一个注解拆碎。
4. 看解读：暖纸深墨能连续阅读，正文没有蓝色长段，也没有「解读边界」等脚手架标签。
5. 看底部：最后一段与来源完整出现，没有大块异常空白或裁切。
6. 高图使用覆盖全高的重叠切片检查，不能只看缩小整图。

硬门：

- 黑色原文连续读回 = 锁定底本。
- 非标点 token 注解覆盖率 = 100%。
- PNG 真宽度 = 请求宽度，真高度 > 0。
- 书名、章节和「章节解读」均出现在 HTML 与 PNG 可见区域。
- 提供 `heroImage` 时，图片必须被嵌入 HTML 且在 PNG 中可见；不得加载远程资源。
- 章节解读中不得出现「解读边界」。
- 文件哈希、DOM 计数与 manifest 一致。

## Step 7.5 — 交付已验收 PNG

只有 Step 7 的硬门和整图、重叠切片目视读回全部通过后，才创建最终交付：

1. 默认目标是 `$HOME/Downloads/{safe-name}.png`；用户显式指定另一最终 PNG 路径时采用该路径。
2. 若默认目标已存在且用户没有明确要求覆盖，使用 `$HOME/Downloads/{safe-name}-{timestamp}.png`，不得静默覆盖。
3. 将候选 PNG 复制到最终路径；JSON、HTML、manifest、意旨图与 QA 切片仍留在 `$run_dir`。
4. 对候选 PNG 与最终 PNG 分别运行 `shasum -a 256`，两者必须一致；再读回最终 PNG 的真实像素尺寸。哈希或尺寸不一致即交付失败。
5. 不自动删除 `$run_dir`。它是本次复验附件的临时容器，由系统临时目录生命周期管理；不得把它冒充长期成品目录。

## Step 8 — 报告

最终报告：Downloads 中最终 PNG 的绝对路径、像素尺寸、原文 token/注解覆盖、章节解读字数、视觉读回结论，以及候选/最终 PNG 的 SHA-256 一致性。把 PNG 放在第一位；随后列出 `$run_dir` 及其中的 JSON、HTML、manifest 作为临时复验附件。
