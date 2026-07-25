---
name: fix-ljg-org-to-md
description: 初始化 skill——扫描 skills 目录，把 org 输出格式改为 markdown，替换 md 保存目录，替换作者署名与 logo，提交代码，同步到全局。Use when user says '/fix-ljg-org-to-md', 'fix org format', 'org 转 md', '把 org 改成 md', '修正输出格式', '初始化 skills'.
user_invocable: true
version: "1.3.0"
---

# fix-ljg-org-to-md: skills 初始化

一次跑通 skills 仓库的个性化初始化：

1. 输出格式：org → markdown
2. md 保存目录：替换成用户 obsidian 库
3. 作者署名 / logo：把内置的「李继刚 + logo」换成当前用户的，或留空
4. 提交并同步到全局

**架构**：确定性批处理走 `init.sh`；LLM 只做交互询问 + 残留语义判断。

## 硬编码路径

```
SKILLS_DIR="$HOME/learning/code/github/ljg-skills/skills"   # repo 目录
GLOBAL_SKILLS="$HOME/.claude/skills"                         # 全局同步目录
```

## Step 1 — 询问 md 保存目录

问用户：**md 文件保存目录是哪个？（一般是 obsidian 库路径）**

```
MD_SAVE_DIR="<用户告知的路径>"   # 例：~/Documents/ObsidianVault/notes/
```

要求：
- 路径必须以 `/` 结尾（Windows 用户改成正斜杠：`D:/xxx/yyy/`）
- 用户不给就停

## Step 2 — 询问作者署名与 logo

**Q2.1**：**卡片/地图/图书馆卡等输出的作者署名要用什么？**（留空则不显示）

```
AUTHOR_NAME="<名字>"   # 留空 → ""
```

**Q2.2**：**logo 图片路径是什么？**（留空则不显示）

```
LOGO_PATH="<绝对路径或 URL>"   # 留空 → ""
```

用户答"没有 / 空 / 不用"即视为空串。

## Step 3 — 跑批处理脚本

```bash
bash $SKILLS_DIR/fix-ljg-org-to-md/init.sh "$MD_SAVE_DIR" "$AUTHOR_NAME" "$LOGO_PATH"
```

脚本完成的**确定性替换**：

| # | 内容 | 命中范围 |
|---|------|---------|
| 1 | `~/Documents/notes/` 和 `D:/WorkFiles/obisdian_repo/RK'Ideaverse_Sync/+/` 等旧保存目录 → `$MD_SAVE_DIR` | 所有 `.md` / `.html` |
| 2 | `李继刚` → `$AUTHOR_NAME` | HTML 模板 `>李继刚<`；MD 里 `logo + 李继刚` / `署名：印 李继刚` / 单独李继刚 |
| 3 | `capture.js` 里 `logoUrl` 行 | `logoUrl = '$LOGO_PATH'` |
| 4 | `__xxx.org` → `__xxx.md` | denote 文件名扩展 |
| 5 | `org 格式` / `以 org 输出` / `输出 org` | 输出格式声明 |

脚本内置**跳过清单**：`.bak-v*`、`fix-ljg-org-to-md/` 自身、`ljg-roundtable/references/original-prompt.md`、`ljg-push/Tools/`、`package-lock.json`、`.git/`。

脚本末尾自动跑 **4 项残留检查**（见下）。

## Step 4 — LLM 处理残留（语义判断部分）

`init.sh` 输出结尾会打印四类需要人工判断的残留：

### [a] `~/Documents/notes/` 或旧 Windows 保存目录残留
脚本已内置替换 `~/Documents/notes/` 和 `D:/WorkFiles/obisdian_repo/RK'Ideaverse_Sync/+/` 两种旧目录。一般不会有残留——若有，逐条判断是否是特殊上下文（例如注释里的历史路径），或又出现了另一种新的旧目录写法（需手工替换并考虑加进 `OLD_SAVE_DIRS`）。

### [b] `李继刚` 残留
`AUTHOR_NAME` 空时脚本会兜底清空。仅当有奇怪上下文（如未预料的 markdown 语法）需 LLM 修补。

### [c] `#+title:` / `#+date:` / `#+filetags:` 等 org 头
逐行 `sed` 会留下散乱的裸字段，必须整体重构为 YAML frontmatter：

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

用 Read + Edit 逐个处理脚本报出的文件。

### [d] 独立 `.org` 文件
若脚本报出实体 `.org` 文件（非 `.bak`），参考 `skills/ljg-push/Tools/Push.sh` 里的 `orgfile_to_md` 函数：
- 头块 → YAML frontmatter（`filetags` → `tags`）
- `*` 标题 → `#` 标题（层级保留）
- `#+ATTR_*` 删除
- `[[file:x]]` → `![](x)`
- `#+begin_src` → 三反引号围栏
- 转完删原 `.org` 文件

### 其他 LLM 判断点

- **URL 里的 `.org` 不改**——`arxiv.org`、`gnu.org` 等域名保持原样
- **`*bold*` 仅改输出模板内**——正文里的 `*text*` 是合法斜体，不动；只改代码块 ` ``` ` 里"模型输出示例"里的 `*bold*`（→ `**bold**`）
- **`ljg-present` 的 org 头解析器不动**——`ljg-present/SKILL.md` 和 `RenderingSpec.md` 里的 `#+title:` 是**输入格式解析**说明，保留（用户可能还有旧 org 文件要渲染）
- **`ljg-push/SKILL.md` 描述 org→md 的转换行为，保留**

## Step 5 — 提交代码

```bash
cd $(dirname $SKILLS_DIR)
git add -A
git status
git commit -m "chore: init skills — org→md, md dir, author & logo"
```

Step 3 若无改动，跳过 commit。

## Step 6 — 同步到全局

**macOS / Linux**：
```bash
rsync -av --delete $SKILLS_DIR/ $GLOBAL_SKILLS/
```

**Windows (PowerShell 或 cmd)**：
```
robocopy "<repo>\skills" "<GLOBAL_SKILLS>" /MIR
```

`--delete` / `/MIR` 是镜像模式，会删除目标里 repo 没有的文件——若用户在全局有本地实验文件先告知。

抽查改动最多的 skill：

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
- 脚本改动：X 个文件
- LLM 残留修补：X 个文件
- Commit：<sha>
- 全局同步：X 个 skills
```

## Gotchas

- **`MD_SAVE_DIR` 必须以 `/` 结尾**——`init.sh` 会硬校验
- **Windows 路径用正斜杠**——`D:/xxx/yyy/`，反斜杠会跟 sed 转义打架
- **`AUTHOR_NAME` 空值兜底顺序**——脚本先清 `logo + 李继刚` / `署名：印 李继刚`（防残留 ` + ` 和空格），再清单独 `李继刚`；顺序不能颠倒
- **HTML span 内文本清空后是 `<span></span>`**——若用户嫌残留 span 丑，再手工删 `<span>` 行
- **`init.sh` 幂等**——重跑不会累积破坏，可安全再跑
- **`.bak-v*` 备份永远不动**
- **`ljg-push/Tools/Push.sh` 是转换工具本身**——脚本跳过，不要自我改写
- **`original-prompt.md` 历史归档不动**
- **URL 里的 `.org` 靠 `__xxx.org` 正则边界保护**——`arxiv.org` 不会被 `__[a-zA-Z]+\.org\b` 命中
- **rsync --delete / robocopy /MIR 会删除目标多余文件**——先告知用户
- **旧保存目录多源**——`init.sh` 的 `OLD_SAVE_DIRS` 数组集中管理所有待替换的旧目录（目前 `~/Documents/notes/` + `D:/WorkFiles/obisdian_repo/...`）；遇到新的旧目录只需往这个数组里加一行。路径含 `'` `+` 等字符，脚本用 python 做替换，不走 sed
