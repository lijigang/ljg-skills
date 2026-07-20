---
name: fix-ljg-org-to-md
description: 初始化 skill——扫描 skills 目录，把 org 输出格式改为 markdown，替换 md 保存目录，替换作者署名与 logo，提交代码，同步到全局。Use when user says '/fix-ljg-org-to-md', 'fix org format', 'org 转 md', '把 org 改成 md', '修正输出格式', '初始化 skills'.
user_invocable: true
version: "1.2.0"
---

# fix-ljg-org-to-md: skills 初始化

一次跑通 skills 仓库的个性化初始化：

1. 输出格式：org → markdown
2. md 保存目录：替换成用户 obsidian 库
3. 作者署名 / logo：把内置的「李继刚 + logo」换成当前用户的，或留空
4. 提交并同步到全局

## 硬编码路径

```
SKILLS_DIR="$HOME/learning/code/github/ljg-skills/skills"
GLOBAL_SKILLS="$HOME/.claude/skills"
```

## Step 1 — 询问 md 保存目录

问用户：**md 文件保存目录是哪个？（一般是 obsidian 库路径）**

拿到路径后存为变量：

```
MD_SAVE_DIR="<用户告知的路径>"   # 例：~/Documents/ObsidianVault/notes/ 或 /Users/xxx/Obsidian/
```

要求：
- 路径必须以 `/` 结尾
- 保留用户原始写法（`~` 或绝对路径都可）
- 用户不给就停，不要瞎猜

## Step 2 — 询问作者署名与 logo

分两问，一次一个：

**Q2.1**：**卡片/地图/图书馆卡等输出的作者署名要用什么？**（留空则不显示署名）

```
AUTHOR_NAME="<用户告知的名字>"   # 空字符串 "" 表示不显示
```

**Q2.2**：**logo 图片路径是什么？**（留空则不显示 logo）

```
LOGO_PATH="<用户告知的 logo 绝对路径或 URL>"   # 空字符串 "" 表示不显示
```

要求：
- 两问都必须问到，用户答"没有 / 空 / 不用"即视为空字符串
- `AUTHOR_NAME` 空 → 模板里所有 `李继刚` 位置替换为空字符串（保留 HTML 结构，只是文本为空）
- `LOGO_PATH` 空 → 保留 `{{LOGO}}` 占位由 capture.js 处理，或直接把 `logo.png` 引用清空；改动方式见 Step 3-C

## Step 3 — 扫描并替换

### 3-A 定位命中文件

```bash
grep -rl \
  -e '\.org\b' \
  -e '#+title' \
  -e '#+date' \
  -e '#+filetags' \
  -e '__.*\.org' \
  -e 'org 格式\|org格式\|以 org 输出\|输出.*\.org' \
  -e '~/Documents/notes/' \
  -e '李继刚' \
  -e 'logo\.png' \
  $SKILLS_DIR
```

命中范围：所有 SKILL.md、模板 HTML、references/、Workflows/、assets/ 等。对每个命中文件，用 Read 工具读取全文，然后按下表逐条替换。

### 3-B 替换规则表（格式类）

| 场景 | 查找 | 替换 |
|------|------|------|
| 文件名扩展名 | `__paper.org` | `__paper.md` |
| 文件名扩展名 | `__qa.org` | `__qa.md` |
| 文件名扩展名 | `__plain.org` | `__plain.md` |
| 文件名扩展名 | `__writes.org` | `__writes.md` |
| 通用 denote 扩展名 | `__{type}.org` 模式 | `__{type}.md` |
| org 头：title | `#+title:` | `title:` (置于 `---` YAML 块内) |
| org 头：date | `#+date:` | `date:` (置于 `---` YAML 块内) |
| org 头：filetags | `#+filetags:` | `tags:` (置于 `---` YAML 块内) |
| org 头块整体 | `#+title: X\n#+date: Y\n...` | `---\ntitle: X\ndate: Y\n...\n---` |
| 输出格式声明 | `org 格式` / `org格式` | `markdown 格式` |
| 输出格式声明 | `以 org 输出` / `输出 org` | `以 markdown 输出` / `输出 markdown` |
| 输出文件扩展 | `.org` (非 URL 上下文) | `.md` |
| **md 保存目录** | `~/Documents/notes/` | `$MD_SAVE_DIR`（用户告知值） |
| **md 保存目录变体** | `~/Documents/notes/images/` | `${MD_SAVE_DIR}images/` |

### 3-C 替换规则表（署名 / logo）

**李继刚 → `$AUTHOR_NAME`**

命中文件（已知清单，仍需以 3-A grep 为准）：

| 文件 | 位置 |
|------|------|
| `skills/ljg-writes/SKILL.md` | `author: 李继刚` |
| `skills/ljg-card/SKILL.md` | 说明文本 `logo + 李继刚` |
| `skills/ljg-card/references/mode-big.md` | 说明文本 |
| `skills/ljg-card/assets/big_template.html` | `<span class="name">李继刚</span>` |
| `skills/ljg-card/assets/comic_template.html` | `<span>李继刚</span>` |
| `skills/ljg-card/assets/infograph_template.html` | `<span>李继刚</span>` |
| `skills/ljg-card/assets/long_template.html` | `<span class="author-name">李继刚</span>` |
| `skills/ljg-card/assets/poster_template.html` | `<span class="author-name">李继刚</span>` |
| `skills/ljg-card/assets/whiteboard_template.html` | `<span>李继刚</span>` |
| `skills/ljg-card/assets/sketchnote_template.html` | `<span>李继刚</span>` |
| `skills/ljg-map/assets/map_template.html` | `<span>李继刚</span>` |
| `skills/ljg-map/references/visual.md` | `署名：印 李继刚` |
| `skills/ljg-library/assets/library_template.html` | `<span>李继刚</span>` |
| `skills/ljg-library/references/visual.md` | `署名：印 李继刚` |

替换规则：
- `AUTHOR_NAME` 非空 → 所有 `李继刚` 字面全量替换为 `$AUTHOR_NAME`
- `AUTHOR_NAME` 为空 → 所有 `李继刚` 替换为空字符串（HTML 标签内文本清空，说明性 `logo + 李继刚` 改成 `logo`，`署名：印 李继刚` 改成 `署名：印`）

**不要动的地方**：
- `skills/ljg-roundtable/references/original-prompt.md:10` 的 `;; 作者: 李继刚` 是历史 prompt 归档，保持原样
- 各 skill 正文里的「作者」二字（指被分析文本的作者，如"作者提出的核心命题"），不动
- `.bak-v6.1.0` 备份文件，不动

**logo → `$LOGO_PATH`**

logo 的注入实际由 `skills/ljg-card/assets/capture.js` 完成：

```javascript
const logoUrl = 'file://' + path.resolve(__dirname, 'logo.png');
```

替换策略：

- `LOGO_PATH` 非空 → 修改 `capture.js`：
  ```javascript
  const logoUrl = '<LOGO_PATH>';   // 支持 file:// 绝对路径或 http(s) URL
  ```
- `LOGO_PATH` 为空 → 修改 `capture.js` 让 `{{LOGO}}` 替换为空字符串，或在 HTML 中删掉 `<img src="{{LOGO}}">` 的整个 `<img>` 标签，实现无 logo：
  ```javascript
  const logoUrl = '';
  ```
  这样 `<img src="">` 视觉上无图；如果用户嫌 alt 占位丑，再逐个模板删 `<img>` 行

同样检查 `skills/ljg-map/assets/`、`skills/ljg-library/assets/` 目录下是否有独立 logo 引用，命中就同步处理。

### 3-D org 头块重构示例

原始：
```
#+title:      论文核心思想
#+date:       {date}
#+filetags:   :paper:
```

改为：
```
---
title: 论文核心思想
created: {{date}}
tags: [paper]
---
```

### 3-E 验证

替换完后确认无遗漏：

```bash
grep -rn "#+title\|#+date\|#+filetags\|__.*\.org\b\|~/Documents/notes/" $SKILLS_DIR
# 预期：无输出（arxiv.org 等 URL 中的 .org 不计）

grep -rn "李继刚" $SKILLS_DIR
# 预期：只剩 original-prompt.md 里的历史归档一处
```

如仍有命中，逐一判断是否需要修改。

## Step 4 — 提交代码

```bash
cd $(dirname $SKILLS_DIR)
git add -A
git status   # 展示变更文件列表
git commit -m "chore: init skills — org→md, md dir, author & logo"
```

如果 Step 3 无任何文件被修改，报告"无需初始化，工作目录已符合目标状态"，不提交空 commit。

## Step 5 — 同步到全局

```bash
rsync -av --delete $SKILLS_DIR/ $GLOBAL_SKILLS/
```

同步后抽查改动最多的 skill：

```bash
grep -n "#+title\|\.org\b\|~/Documents/notes/\|李继刚" $GLOBAL_SKILLS/ljg-paper/SKILL.md | head -5
# 预期：仅 URL 中的 arxiv.org
```

## 完成报告

```
fix-ljg-org-to-md 初始化完成
- md 保存目录：<MD_SAVE_DIR>
- 作者署名：<AUTHOR_NAME 或 "(空)">
- logo 路径：<LOGO_PATH 或 "(空)">
- 扫描文件：X 个
- 修改文件：X 个（或"无需修改"）
- Commit：<sha> chore: init skills — org→md, md dir, author & logo
- 全局同步：X 个 skills 已更新
```

## Gotchas

- **URL 里的 `.org` 不改**——`arxiv.org`、`gnu.org` 等域名保持原样；替换前用 Read 看上下文
- **org 头块必须整体转为 YAML frontmatter**——逐行替换 `#+title:` 会留下散乱的裸字段，需要把整个头块包进 `---` / `---`
- **`*bold*` 仅改输出模板**——SKILL.md 正文里的 `*text*` 是合法斜体，不要动；只改代码块内"模型输出示例"里的 `*bold*`
- **md 保存目录必须先问用户**——不给默认值，不猜路径；用户不回答就停在 Step 1
- **保留末尾斜杠**——`~/Documents/notes/` → `<新路径>/`，子路径拼接一致，别丢 `/`
- **署名不要误伤"作者"二字**——只替换字面 `李继刚`，正文里作为普通词的"作者"（指被分析文本的作者）不动
- **`original-prompt.md` 历史归档不动**——`ljg-roundtable/references/original-prompt.md` 里的 `;; 作者: 李继刚` 保持原样
- **logo 空值处理**——`capture.js` 里 `logoUrl = ''` 后模板 `<img src="">` 视觉无图；若用户在意，逐模板删 `<img>` 行
- **rsync --delete 会删除 global 里 repo 没有的文件**——如果 global skills 有本地实验文件，先告知用户
