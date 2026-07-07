---
name: ljg-push
description: 把 ~/.codex/skills/ljg-* 里所有更新过的 skills 同步到 github repo (ljg-skills)，先推 master 分支（markdown 输出风格），再切 md 分支（markdown 输出风格）做基础 markdown 化后推。Use when user says '/ljg-push', 'push skills', '推送 skills', '同步 skills', 'sync ljg', or whenever ljg-* skills get updated and need shipping. NOT FOR pushing non-ljg skills or arbitrary git repos.
user_invocable: true
---

# ljg-push: 推送 ljg-* skills

把本地 `~/.codex/skills/ljg-*` 里改过的 skills，一键同步到 github repo，覆盖 master 和 md 两个分支。

## 仓库路径（硬编码）

```
SKILLS_REPO="$HOME/code/ljg-skills"     # 本地工作 repo
SKILLS_LOCAL="$HOME/.codex/skills"      # 本地 skill 源
REPO_URL="git@github.com:lijigang/ljg-skills.git"
```

如果 `$SKILLS_REPO` 不存在，脚本会自动 clone。如果它存在但不是 ljg-skills 的 git repo，脚本会报错退出（不破坏现有目录）。

## 两条分支的差异

| 分支 | 输出格式 | 文件扩展 | 加粗 | 文件头 |
|------|---------|---------|------|--------|
| `master`（默认） | markdown | `.org` | `*bold*` | `#+title:` 等 |
| `md` | markdown | `.md` | `**bold**` | YAML frontmatter |

`~/.codex/skills/` 里的 skill 是 *master 风格*（源版本）。md 分支的差异由脚本自动转换 + 必要时手工补。

脚本推完 `md` 后会自动切回 `master`。本地 `$HOME/code/ljg-skills` 应该始终停在源分支，方便下次查看和安装。

## 工作流

按 `Workflows/Push.md` 步骤执行 → 调用 `Tools/Push.sh`。

## README 一致性（硬 gate）

每次 push 前，脚本强制做一件事：*把 README 跟 local skills 对一遍*。

- 列出 `~/.codex/skills/ljg-*` 全部 skill 名
- grep `$SKILLS_REPO/README.md` 里出现的 `ljg-xxx`
- 找出 local 有但 README 没有的——*几乎肯定意味着 README 漏更新*
- 命中 → push 中止，报告差异

每次 push 都是检视 README 的机会。问自己：

1. *新增 skill 了吗*？README 的 skill 清单 / 安装命令需要加一行
2. *删了 skill 吗*？README 对应行要删
3. *某个 skill 的描述大改了吗*？README 的简介可能要同步

确认 README 已审、确实不需要更新时，绕过 gate：

```bash
/ljg-push --skip-readme-check
```

## 自动转换的范围

md 分支同步时自动转换（2026-06-12 起含 org 文件本体）：

- *org 文件本体*：skill 内每个 `.org` 文件（assets/ 除外）转成同名 `.md` 并删除原件——org 头块→YAML frontmatter（含 `---` 围栏，`filetags`→`tags`）、`*` 标题→`#` 标题（层级保留）、`#+ATTR_*` 行删除、`[[file:x]]`→`![](x)`、`#+begin_src`→``` 围栏。其他 .md 文件里对被改名文件的引用同步全局改写
- 文件扩展引用：`__qa.md` → `__qa.md`、`__paper.md` → `__paper.md` 等（denote 命名约定）
- 关键词：`markdown` → `markdown`、`Markdown` → `Markdown`
- org 式格式指令：`加粗用 *bold*（单星号）…` → `加粗用 **bold**（双星号）`、`标题层级从 * 开始` → `从 # 开始`、`Markdown 文件头` → `Markdown 文件头`、行首 `#+title:` 等 8 个示例键 → YAML 键行

*仍不自动转换*（按需手工）：

- 正文里的 `*bold*` 标记：markdown 里 `*x*` 是斜体，盲替会破坏文档自身格式
- SKILL.md 示例块里转出的 YAML 键行不带 `---` 围栏（已知整容项，不影响语义）

## Voice Notification

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running Push in ljg-push"}' \
  > /dev/null 2>&1 &
```

输出文本：`Running **Push** in **ljg-push**...`

## Examples

*Example 1: 一键推送*

```
User: /ljg-push
→ 检测 ~/.codex/skills/ljg-* 中跟 repo 有差异的 skills
→ master: rsync + bump version + commit + push
→ md: rsync + mdize + bump version + commit + push
→ 切回 master
→ 报告：哪些 skills 推了，新版本号，剩余手工差异
```

*Example 2: 看会推什么但不真推*

```
User: /ljg-push --dry-run
→ 列出会被同步的 skills
→ 列出会做的 markdown 化转换
→ 不执行 rsync / commit / push
```

## Gotchas

- *README 漂移是最容易被忽略的*——加完新 skill 直接推，README 还停在老清单。脚本现在有硬 gate 拦这一刀；拦下来时不要无脑加 `--skip-readme-check`，先去看一下 README
- *脚本前提是 git credentials 已配好*（ssh key 或 PAT）—— ljg-push 不处理认证，认证失败时直接报错
- *master 必须先推*——md 分支的 markdown 化基于 master 的 org 版本做转换。反过来推会破坏顺序
- *untracked 杂物（如 `assets/measure.js`）会被 rsync 同步到 repo*——如果不想推，先在本地删掉，或加进 `.gitignore`
- *org 文件本体已自动转换（2026-06-12 起）*——template.md 等会被转成 .md 并删除原件，每次推送重新生成（rsync --delete 冲掉也无妨，幂等）。遗留手工项只剩正文里的 `*bold*` 标记。新增带复杂构件的 org reference 文件后，先 `--dry-run` 或沙盒跑一遍 mdize 看转换效果
- *脚本会自动 bump patch version 在 plugin.json + marketplace.json*——如果你想 bump minor / major，先手动改完再跑脚本，脚本只追加 patch
- *如果 md 分支的远端比本地新（继刚另一台机器推过）*，脚本会 `pull --rebase` 失败时尝试一次 `reset --hard origin/md` 重新应用——这会丢弃本地未推的 md 分支 commit。脚本前会提示
- *搬迁记录*：repo 历史曾在 `~/.claude.backup-20260502/ljg-skills-repo/`（路径名带 backup 是历史遗留），2026-05-02 搬到 `~/code/ljg-skills/`
