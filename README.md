# ljg-skills-md

LJG 的 Codex 自定义技能集。

此分支的技能默认输出 Markdown；源分支 `master` 默认输出 Org-mode。

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

使用 [skills CLI](https://github.com/vercel-labs/skills) 安装到 Codex：

```bash
# 安装全部技能（全局，org-mode 格式）
bunx skills add lijigang/ljg-skills -g -a codex --skill '*' -y

# 安装全部技能（Markdown 格式）
bunx skills add lijigang/ljg-skills#md -g -a codex --skill '*' -y

# 安装单个技能（org-mode）
bunx skills add lijigang/ljg-skills -g -a codex --skill ljg-card -y

# 安装单个技能（Markdown）
bunx skills add lijigang/ljg-skills#md -g -a codex --skill ljg-card -y

# 安装多个指定技能
bunx skills add lijigang/ljg-skills -g -a codex --skill ljg-card --skill ljg-learn -y

# 查看仓库中有哪些技能
bunx skills add lijigang/ljg-skills -l
```

**参数说明：**

| 参数 | 作用 |
|------|------|
| `-a codex` | 只安装给 Codex |
| `-g` | 全局安装到 `~/.agents/skills/`（推荐）；不加则安装到项目级 `.agents/skills/` |
| `--skill <name>` | 指定安装某个技能，可重复使用 |
| `--skill '*'` | 安装仓库内全部技能 |
| `#md` | 从 `md` branch 安装 Markdown 格式版本 |
| `-y` | 跳过交互确认 |
| `-l` | 仅列出可用技能，不安装 |

### ljg-card 依赖

`ljg-card` 依赖 Playwright 截图，安装后需额外执行：

```bash
cd ~/.agents/skills/ljg-card && bun install && bunx playwright install chromium
```

### 替代方式：git clone

仓库根目录不是技能目录，clone 后还要把 `skills/` 同步到 Codex。下面两种格式二选一：

```bash
# org-mode 版本（master）
git clone --branch master --depth 1 https://github.com/lijigang/ljg-skills.git "$HOME/code/ljg-skills"
mkdir -p "$HOME/.agents/skills"
rsync -a "$HOME/code/ljg-skills/skills/" "$HOME/.agents/skills/"

# Markdown 版本（md）
git clone --branch md --depth 1 https://github.com/lijigang/ljg-skills.git "$HOME/code/ljg-skills-md"
mkdir -p "$HOME/.agents/skills"
rsync -a "$HOME/code/ljg-skills-md/skills/" "$HOME/.agents/skills/"
```

## 技能

| 技能 | 说明 |
|------|------|
| **ljg-blind** | 盲区扫描 — 读取指定日期的 AI 对话，找出结构性思维盲区，并用微信读书章节精准补上 |
| **ljg-card** | 内容铸卡 — 将内容转为 PNG 视觉卡片（长图 `-l`、信息图 `-i`、多卡 `-m`、视觉笔记 `-v`、漫画 `-c`、白板 `-w`、大字 `-b`） |
| **ljg-learn** | 概念解剖 — 从八个方向切开一个概念（历史、辩证、现象、语言、形式、存在、美感、元反思），压成一句顿悟 |
| **ljg-paper** | 论文阅读 — 为非学术人士提取论文核心想法，重理解不重批判 |
| **ljg-book** | 拆书 — 用 `x → f → f(x)` 还原一本书：作者在处理什么问题（x）、用什么概念/框架/方法回答（f）、这个回答怎样改变理解与行动（f(x)）；正文用书内材料补全逻辑链，关系复杂时附一张 ASCII 图 |
| **ljg-library** | 取景框借书卡 — 一本书 → 一幅「取景框」意向画面 → 一张收藏卡（PNG）：真实封面 / 作者 / 书目 + 费曼式讲透画面；图解用 AI 生图、继刚作固定主角（从墨像参考生成），吉田诚治式绘本感风格（绘本感异世界日常、暖光斜射、治愈又精致） |
| **ljg-map** | 生态地形图卡 — 一个行业 → 一张可俯瞰的生态地形（PNG，AI 生图，默认 `-a` 动森 / 可选 `-c` cyber）：价值像河流过地貌，标出瓶颈（收窄的隘口/水坝）与价值捕获点（利润沉淀的宝藏堆），继刚作测量员俯瞰；配三个关键指标 base rate + 三个大问题 |
| **ljg-qa** | 信息提问机 — 把文章/论文/书的核心观点抽成 Q-A 链，Q 切要害，A 四段（结论 / 形式化 / 步骤 / 边界） |
| **ljg-plain** | 白话引擎 — 把任何内容改写到聪明的十二岁小孩也能懂 |
| **ljg-rank** | 降秩引擎 — 给一个领域，找出背后不可再少的独立生成器 |
| **ljg-constraint** | 约束引擎 — 给一个领域/专业/角色，找出框住它的那几条约束（硬/软/自设三层），揪出被当成硬约束的假墙、指出哪条能重新定义 |
| **ljg-think** | 追本之箭 — 给一个观点或现象，纵向深钻到不可再分的本质 |
| **ljg-word** | 单词精通 — 深度拆解一个英语单词的核心语义和顿悟时刻 |
| **ljg-writes** | 写作引擎 — 像手术刀剖开一个观点，一层层剥到底。1000-1500 字 |
| **ljg-invest** | 投资分析 — 核心判断项目是否是一台「秩序创造机器」 |
| **ljg-read** | 伴读 — 陪你读任何文本，英文三层翻译（信达雅）+ 结构标注 + 深度提问 + 跨领域旁逸 |
| **ljg-relationship** | 关系分析 — 五层结构诊断 + 精神分析，通过对话引导帮用户"看见"关系真实结构 |
| **ljg-roundtable** | 圆桌讨论 — 一个议题一场圆桌：真实人物逐轮交锋，每轮收一张 ASCII 结构图，散场全文存档 |
| **ljg-present** | 演讲铸造器 — 默认高桥流（一页一关键词、奶白底墨字）；`-s` 标语流（VACAT/BIG STUDIOS 风：黑红双色块、ultra-bold、完整断言句撑屏）|
| **ljg-push** | 推送引擎 — 把本地 `~/.agents/skills/ljg-*` 一键同步到 github repo（master + md 双分支）|
