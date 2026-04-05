---
name: ljg-card
description: "Content caster (铸). Transforms content into PNG visuals. Six molds: -l (default) long reading card, -i infograph, -m multi-card reading cards (1080x1440), -v visual sketchnote, -c comic (manga-style B&W), -w whiteboard (marker-style board layout). Output to ~/Downloads/. Use when user says '铸', 'cast', '做成图', '做成卡片', '做成信息图', '做成海报', '视觉笔记', 'sketchnote', '漫画', 'comic', 'manga', '白板', 'whiteboard'. Replaces ljg-cards and ljg-infograph."
user_invocable: true
version: "1.7.0"
---

# ljg-card: 铸

将内容铸成可见的形态。内容进去，PNG 出来。模具决定形状。

## 参数

| 参数 | 模具 | 尺寸 | 说明 |
|------|------|------|------|
| `-l`（默认） | 长图 | 1080 x auto | 单张阅读卡，内容自动撑高 |
| `-i` | 信息图 | 1080 x auto | 内容驱动的自适应视觉布局 |
| `-m` | 多卡 | 1080 x 1440 | 自动切分为多张阅读卡片 |
| `-v` | 视觉笔记 | 1080 x auto | 手绘风格 sketchnote，动态选择风格路线 |
| `-c` | 漫画 | 1080 x auto | 日式黑白漫画风格，动态选择漫画家视觉语言 |
| `-w` | 白板 | 1080 x auto | 白板马克笔风格，结构化框图+箭头+彩色标记 |

## 约束

本 skill 输出为视觉文件（PNG），不适用 L0 中的 Org-mode、Denote 和 ASCII-only 规范。

## 共享基础

### 获取内容

- URL --> WebFetch 获取
- 粘贴文本 --> 直接使用
- 文件路径 --> Read 获取

### 文件命名

从内容提取标题或核心思想作为 `{name}`（中文直接用，去标点，≤ 20 字符）。

### 截图工具

```bash
node ~/.openclaw/workspace/skills/skills/ljg-card/assets/capture.js <html> <png> <width> <height> [fullpage]
```

依赖：`~/.openclaw/workspace/skills/skills/ljg-card/node_modules/` 中的 playwright。如报错：

```bash
cd ~/.openclaw/workspace/skills/skills/ljg-card && npm install playwright && npx playwright install chromium
```

### Footer

- 左侧：logo + 李继刚（已硬编码在模板中）
- 右侧：内容来源（可选）——有明确来源时显示（如作者名、arxiv ID、网站名等），无来源时留空。使用 `{{SOURCE_LINE}}` 变量：有来源时填 `<span class="info-source">来源文字</span>`，否则空字符串。适用于 `-l`、`-i`、`-v`、`-c`、`-w` 模具（`-m` 多卡无 footer，不适用）。

### 交付

1. 报告文件路径

## 品味准则

**所有模具共享**。执行任何模具前，先 Read `references/taste.md`，作为视觉质量底线贯穿全流程。

核心：反 AI 生成痕迹——禁 Inter 字体、禁纯黑、禁三等分卡片、禁居中 Hero、禁 AI 文案腔、禁假数据。

## 执行

根据参数选择模具，Read `references/taste.md` + 对应的 mode 文件，按步骤执行：

### -l（默认）：长图

Read `references/mode-long.md`，按其步骤执行。

模板：`assets/long_template.html`

### -i：信息图

Read `references/mode-infograph.md`，按其步骤执行。

模板：`assets/infograph_template.html`

### -m：多卡

Read `references/mode-poster.md`，按其步骤执行。

模板：`assets/poster_template.html`

### -v：视觉笔记

Read `references/mode-sketchnote.md`，按其步骤执行。

模板：`assets/sketchnote_template.html`

### -c：漫画

Read `references/mode-comic.md`，按其步骤执行。

模板：`assets/comic_template.html`

### -w：白板

Read `references/mode-whiteboard.md`，按其步骤执行。

模板：`assets/whiteboard_template.html`
