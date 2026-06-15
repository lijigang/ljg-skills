# ljg-skills-md

LJG's [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 自定义技能集。

此修改版本全部为.MD格式输出（源skill全部为.org格式）

## 输出格式

技能提供两种输出格式，通过不同 branch 安装，功能完全相同：

| Branch | 格式 | 适用场景 |
|--------|------|----------|
| `master`（默认） | Org-mode（`.org`） | Emacs / Denote 用户 |
| `md` | Markdown（`.md`） | Obsidian / VSCode / Notion 等 Markdown 生态用户 |

| 特性 | org-mode (`master`) | Markdown (`md`) |
|------|---------------------|-----------------|
| 文件头 | `#+title:` / `#+date:` / `#+filetags:` | YAML frontmatter (`---`) |
| 标题 | `* H1` / `** H2` | `# H1` / `## H2` |
| 加粗 | `*bold*` | `**bold**` |
| 输出文件 | `.org` | `.md` |

## 安装

使用 [skills CLI](https://github.com/vercel-labs/skills)（基于 `npx`）一行安装：

```bash
# 安装全部技能（全局，org-mode 格式）
npx skills add lijigang/ljg-skills -g --all

# 安装全部技能（Markdown 格式）
npx skills add lijigang/ljg-skills#md -g --all

# 安装单个技能（org-mode）
npx skills add lijigang/ljg-skills -g --skill ljg-card

# 安装单个技能（Markdown）
npx skills add lijigang/ljg-skills#md -g --skill ljg-card

# 安装多个指定技能
npx skills add lijigang/ljg-skills -g --skill ljg-card --skill ljg-learn

# 查看仓库中有哪些技能
npx skills add lijigang/ljg-skills -l
```

**参数说明：**

| 参数 | 作用 |
|------|------|
| `-g` | 全局安装到 `~/.claude/skills/`（推荐）。不加则装到当前项目 `.claude/skills/` |
| `--skill <name>` | 指定安装某个技能，可重复使用 |
| `--all` | 安装仓库内全部技能 |
| `#md` | 从 `md` branch 安装 Markdown 格式版本 |
| `-l` | 仅列出可用技能，不安装 |

### ljg-card 依赖

`ljg-card` 依赖 Playwright 截图，安装后需额外执行：

```bash
cd ~/.claude/skills/ljg-card && npm install && npx playwright install chromium
```

### 替代方式：git clone

```bash
# org-mode 版本
git clone https://github.com/lijigang/ljg-skills.git ~/.claude/plugins/ljg-skills

# Markdown 版本
git clone -b md https://github.com/lijigang/ljg-skills.git ~/.claude/plugins/ljg-skills
```

## 技能

| 技能 | 说明 |
|------|------|
| **ljg-card** | 内容铸卡 — 将内容转为 PNG 视觉卡片（长图 `-l`、信息图 `-i`、多卡 `-m`、视觉笔记 `-v`、漫画 `-c`、白板 `-w`、大字 `-b`） |
| **ljg-learn** | 概念解剖 — 从八个方向切开一个概念（历史、辩证、现象、语言、形式、存在、美感、元反思），压成一句顿悟 |
| **ljg-paper** | 论文阅读 — 为非学术人士提取论文核心想法，重理解不重批判 |
| **ljg-paper-river** | 论文溯源 — 倒读法，递归挖前序论文（最多5层）+ 最新进展，从源头讲述问题演化史 |
| **ljg-book** | 拆书 — 以「问题」为轴心一条线：作者答什么问题 / 之前共识怎么答 / 挪动了什么（delta）/ 结论 / 精神内核，收尾一张 ASCII 参考系图，各流派与作者钉进同一张图 |
| **ljg-library** | 取景框借书卡 — 一本书提炼成一句「取景框」+ 一张 2050 图书馆借书卡（PNG）：真实封面 / 作者头像 / 书目，配一张作者核心思想 ASCII 图，强调色从封面动态提取 |
| **ljg-qa** | 信息提问机 — 把文章/论文/书的核心观点抽成 Q-A 链，Q 切要害，A 四段（结论 / 形式化 / 步骤 / 边界） |
| **ljg-plain** | 白话引擎 — 把任何内容改写到聪明的十二岁小孩也能懂 |
| **ljg-rank** | 降秩引擎 — 给一个领域，找出背后不可再少的独立生成器 |
| **ljg-think** | 追本之箭 — 给一个观点或现象，纵向深钻到不可再分的本质 |
| **ljg-word** | 单词精通 — 深度拆解一个英语单词的核心语义和顿悟时刻 |
| **ljg-writes** | 写作引擎 — 像手术刀剖开一个观点，一层层剥到底。1000-1500 字 |
| **ljg-invest** | 投资分析 — 核心判断项目是否是一台「秩序创造机器」 |
| **ljg-read** | 伴读 — 陪你读任何文本，英文三层翻译（信达雅）+ 结构标注 + 深度提问 + 跨领域旁逸 |
| **ljg-relationship** | 关系分析 — 五层结构诊断 + 精神分析，通过对话引导帮用户"看见"关系真实结构 |
| **ljg-roundtable** | 圆桌讨论 — 求真导向的结构化多人辩证对话，每轮生成 ASCII 思考框架图 |
| **ljg-travel** | 旅行研究 — 输入城市名，生成深度文化研究文档 + 便携卡片（PNG） |
| **ljg-skill-map** | 技能地图 — 扫描所有已安装技能，渲染可视化总览 |
| **ljg-present** | 演讲铸造器 — 默认高桥流（一页一关键词、奶白底墨字）；`-s` 标语流（VACAT/BIG STUDIOS 风：黑红双色块、ultra-bold、完整断言句撑屏）|
| **ljg-push** | 推送引擎 — 把本地 `~/.claude/skills/ljg-*` 一键同步到 github repo（master + md 双分支）|


## 工作流

工作流将多个技能串联为一个命令。

| 工作流 | 技能链 | 说明 |
|--------|--------|------|
| **ljg-paper-flow** | ljg-paper → ljg-card -c | 读论文 + 做漫画卡片一气呵成 |
| **ljg-word-flow** | ljg-word → ljg-card -i | 单词深度分析 + 信息图卡片一气呵成 |
