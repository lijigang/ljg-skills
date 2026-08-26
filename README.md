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
| **ljg-card** | 内容铸卡 — 将文本铸成长图 `-l`、原文保真全文卡 `-f`、漫画 `-c`、白板 `-w` 四种 PNG；`-f` 不生成新图，只呈现原稿自带图片，其余模式按各自图像合同生成位图 |
| **ljg-classic** | 古文精读 — 将原文、逐字注解、句义、章节意旨图与全章解读排成一张可连续阅读的长 PNG |
| **ljg-learn** | 概念解剖 — 从八个方向切开一个概念（历史、辩证、现象、语言、形式、存在、美感、元反思），压成一句顿悟 |
| **ljg-paper** | 论文阅读 — 从一个具体案例开始，让证据暴露旧解释的缺口，再看论文怎样改写框架、操作、证据或可行范围 |
| **ljg-book** | 拆书 — 用一条贯穿张力串起若干具体场景：让旧理解先运行，再由书内证据逐层改写判断与行动，最后回到开头 |
| **ljg-qa** | 信息提问机 — 把文章/论文/书的核心观点抽成 Q-A 链，Q 切要害，A 四段（结论 / 形式化 / 步骤 / 边界） |
| **ljg-plain** | 白话引擎 — 把任何内容改写到聪明的十二岁小孩也能懂 |
| **ljg-rank** | 降秩引擎 — 给一个领域，找出背后不可再少的独立生成器 |
| **ljg-constraint** | 约束引擎 — 给一个领域/专业/角色，找出框住它的那几条约束（硬/软/自设三层），揪出被当成硬约束的假墙、指出哪条能重新定义 |
| **ljg-is** | 理解引擎 — 把名词的「是什么」与动词的「怎样运作」接起来，再推出认知修正与可执行判断 |
| **ljg-think** | 追本之箭 — 给一个观点或现象，纵向深钻到不可再分的本质 |
| **ljg-word** | 单词精通 — 深度拆解一个英语单词的核心语义和顿悟时刻 |
| **ljg-writes** | 写作引擎 — 把一个观点写成可理解、可迁移、经得住反例的中文文章 |
| **ljg-teach** | 体验式教学 — 先让学习者作出选择，用公平的意外显化认知缺口，命名后再以迁移局面复测 |
| **ljg-invest** | 投资分析 — 核心判断项目是否是一台「秩序创造机器」 |
| **ljg-read** | 伴读 — 陪你读任何文本，英文三层翻译（信达雅）+ 结构标注 + 深度提问 + 跨领域旁逸 |
| **ljg-relationship** | 关系分析 — 五层结构诊断 + 精神分析，通过对话引导帮用户"看见"关系真实结构 |
| **ljg-roundtable** | 圆桌讨论 — 一个议题一场圆桌：真实人物逐轮交锋，每轮收一张 ASCII 结构图，散场全文存档 |
| **ljg-structure** | 母题结构风洞 — 从表层问题找到反复出现的母题，提炼可迁移结构，用 ASCII 图说明关系并设计最小可逆实验 |
| **ljg-present** | 演讲铸造器 — 默认高桥流（一页一关键词、奶白底墨字）；`-s` 标语流（VACAT/BIG STUDIOS 风：黑红双色块、ultra-bold、完整断言句撑屏）|
| **ljg-push** | 推送引擎 — 把本地 `~/.agents/skills/ljg-*` 一键同步到 github repo（master + md 双分支）|
