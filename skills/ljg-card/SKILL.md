---
name: ljg-card
description: "Content caster (铸). Transforms content into PNG visuals. Seven molds: -l (default) long reading card, -i infograph, -m multi-card reading cards (1080x1440), -v editorial sketchnote (problem→failure→pivot→insight→naming, magazine + archive layout), -c comic (manga-style B&W), -w whiteboard (marker-style board layout), -b big-fonts attachment card (1080x1440, weathered 碑刻 style for 小红书). Output to ~/Downloads/. Use when user says '铸', 'cast', '做成图', '做成卡片', '做成信息图', '做成海报', '视觉笔记', 'sketchnote', '杂志', 'editorial', '漫画', 'comic', 'manga', '白板', 'whiteboard', '大字', '附件图', 'big fonts', '小红书卡片'. Replaces ljg-cards and ljg-infograph."
user_invocable: true
version: "3.0.0"
---

# ljg-card: 铸

内容进去，PNG 出来。模具决定形状。

## 参数

| 参数 | 模具 | 尺寸 | 说明 |
|------|------|------|------|
| `-l`（默认） | 长图 | 1080 x auto | 单张阅读卡，内容自动撑高 |
| `-i` | 信息图 | 1080 x auto | 布局跟着内容长，没有固定版式 |
| `-m` | 多卡 | 1080 x 1440 | 自动切成多张阅读卡片 |
| `-v` | 视觉笔记 | 1080 x auto | 像杂志专题讲一个概念：问题→失败→转折→顿悟→命名 |
| `-c` | 漫画 | 1080 x auto | 日式黑白漫画，按内容气质选漫画家 |
| `-w` | 白板 | 1080 x auto | 和紙底手写推理链，箭头串概念 |
| `-b` | 大字 | 1080 x 1440 | 碑刻大字 + 和紙 + 外阴影，小红书附件用（单句/短段） |

## 约束

输出是视觉文件（PNG），L0 里的 Markdown、Denote、ASCII-only 规范不适用。

## 通用规矩

### 获取内容

- URL：WebFetch 抓
- 粘贴文本：直接用
- 文件路径：Read 读

### 文件命名

从内容提取标题或核心思想作 `{name}`（中文直接用，去标点，≤ 20 字符）。

### 截图工具

```bash
node assets/capture.js <html> <png> <width> <height> [fullpage]
```

从 skill 根目录运行，依赖根目录 `node_modules/` 里的 playwright。报错时：

```bash
npm install playwright && npx playwright install chromium
```

### Footer

- 左侧：logo + 李继刚（模板已硬编码）
- 右侧：内容来源，可选。有明确来源（作者名、arxiv ID、网站名）就填 `{{SOURCE_LINE}}`：`<span class="info-source">来源文字</span>`；没有就留空字符串。适用于 `-l`、`-i`、`-v`、`-c`、`-w`（`-m` 多卡无 footer）。

### 交付

报告文件路径。

## 品味准则

不管走哪个模具，先 Read `references/taste.md`，全部模具共用的视觉底线：禁 Inter 字体、禁纯黑、禁三等分卡片、禁 AI 文案腔、禁假数据。

## 执行

按参数选模具，Read `references/taste.md` + 对应 mode 文件，照步骤走：

| 参数 | mode 文件 | 模板 |
|------|-----------|------|
| `-l` | `references/mode-long.md` | `assets/long_template.html` |
| `-i` | `references/mode-infograph.md` | `assets/infograph_template.html` |
| `-m` | `references/mode-poster.md` | `assets/poster_template.html` |
| `-v` | `references/mode-sketchnote.md` | `assets/sketchnote_template.html` |
| `-c` | `references/mode-comic.md` | `assets/comic_template.html` |
| `-w` | `references/mode-whiteboard.md` | `assets/whiteboard_template.html` |
| `-b` | `references/mode-big.md` | `assets/big_template.html` |
