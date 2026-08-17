---
name: ljg-push
description: 把 ~/.agents/skills/ljg-* 里所有更新过的 skills 同步到 github repo (ljg-skills)，先推 master 分支（org-mode 输出风格），再切 md 分支（markdown 输出风格）做基础 markdown 化后推。Use when user says '/ljg-push', 'push skills', '推送 skills', '同步 skills', 'sync ljg', or whenever ljg-* skills get updated and need shipping. NOT FOR pushing non-ljg skills or arbitrary git repos.
user_invocable: true
---

# ljg-push: 推送 ljg-* skills

把本地 `~/.agents/skills/ljg-*` 里改过的 skills，一键同步到 github repo，覆盖 master 和 md 两个分支。

## 仓库路径（硬编码）

```
SKILLS_REPO="$HOME/code/ljg-skills"     # 本地工作 repo
SKILLS_LOCAL="$HOME/.agents/skills"      # 本地 skill 源
REPO_URL="git@github.com:lijigang/ljg-skills.git"
```

如果 `$SKILLS_REPO` 不存在，脚本会自动 clone。如果它存在但不是 ljg-skills 的 git repo，脚本会报错退出（不破坏现有目录）。

## 两条分支的差异

| 分支 | 输出格式 | 文件扩展 | 加粗 | 文件头 |
|------|---------|---------|------|--------|
| `master`（默认） | org-mode | `.org` | `*bold*` | `#+title:` 等 |
| `md` | markdown | `.md` | `**bold**` | YAML frontmatter |

`~/.agents/skills/` 里的 skill 是 *master 风格*（源版本）。md 分支的差异由脚本自动转换 + 必要时手工补。

脚本推完 `md` 后会自动切回 `master`。本地 `$HOME/code/ljg-skills` 应该始终停在源分支，方便下次查看和安装。

## 工作流

按 `Workflows/Push.md` 步骤执行 → 调用 `Tools/Push.sh`。

## README 一致性（硬 gate）

每次 push 前，脚本强制做一件事：*把 README 跟 local skills 对一遍*。

- 列出 `~/.agents/skills/ljg-*` 全部 skill 名
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

- *org 文件本体*：skill 内每个 `.org` 文件（assets/ 除外）转成同名 `.md` 并删除原件——org 头块→YAML frontmatter（含 `---` 围栏，`filetags`→`tags`）、`*` 标题→`#` 标题（层级保留）、`#+ATTR_*` 行删除、`[[file:x]]`→`![](x)`、`#+begin_src`→``` 围栏。Markdown 与运行时文本文件（如 `.ts` / `.js` / `.json` / `.sh`）里对实际被改名文件的引用同步改写
- *Markdown 内嵌的完整 Org 示例*：` ```org ` 模板，以及首行就是 `#+key:` 的无语言围栏模板，都会转为 ` ```markdown `；连续头块变为带 `---` 的 YAML frontmatter，标题、链接、强调、等宽文本与分隔线随模板一起转换；原文件使用纯 CRLF 时保留其换行风格
- 文件扩展引用：`__qa.org` → `__qa.md`、`__paper.org` → `__paper.md` 等（denote 命名约定）
- 关键词：`org-mode` → `markdown`、`Org-mode` → `Markdown`
- org 式格式指令：`加粗用 *bold*（单星号）…` → `加粗用 **bold**（双星号）`、`标题层级从 * 开始` → `从 # 开始`、`Org 文件头` → `Markdown 文件头`、行首 `#+title:` 等 8 个示例键 → YAML 键行
- 结构化强调标签：行首 `- *标签*：` → `- **标签**：`；紧邻这类标签的 `org` 围栏同步改为 `markdown`
- 输出契约与运行时默认值：`evals/*.json` 中明确要求保存 Org 的提示与期望改为 Markdown；`stdin__*.org` 默认值改为 `.md`，同时保留显式 Org 输入与测试夹具
- `ljg-is` 的双格式验收句：整句折叠为 Markdown/YAML + Denote 验收，并删除两种 Org 专用 lint 阻断表述；提交前残留审计仍拒绝任何未转换的 Org 专用 lint 调用

检测与同步共用同一文件边界：按校验和比较内容，可靠识别文件新增、删除、内容和可执行位变化；纯时间戳、目录元数据、空目录不会单独触发发布，任意层级的 `.git/`、`node_modules/`、`.DS_Store` 不进入同步。忽略清单只含这三类明确杂物，`.bak`、`.backup` 等真实备份仍会触发同步和发布审查。

*仍不自动转换*（按需手工）：

- 正文里的 `*bold*` 标记：markdown 里 `*x*` 是斜体，盲替会破坏文档自身格式；只有「行首 bullet + 全角冒号」标签会安全转换

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
→ 检测 ~/.agents/skills/ljg-* 中跟 repo 有差异的 skills
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
- *同步忽略项必须窄而一致*——`.git/`、`node_modules/`、`.DS_Store` 不进入同步；纯时间戳、目录元数据和空目录不会单独触发发布，也不会进入 Git 结果。普通备份文件不在忽略清单里，仍会被检测出来，避免把可能公开的真实内容藏掉
- *org 文件本体已自动转换（2026-06-12 起）*——template.org 等会被转成 .md 并删除原件，每次推送重新生成（rsync --delete 冲掉也无妨，幂等）。遗留手工项只剩正文里的 `*bold*` 标记。新增带复杂构件的 org reference 文件后，先 `--dry-run` 或沙盒跑一遍 mdize 看转换效果
- *重命名引用可能藏在运行时代码里*——例如测试用 `new URL("../Template.org", import.meta.url)` 读取模板；只改 Markdown 文档会让 md 分支缺文件。转换器会按本次实际转出的 basename 精确改写 `.ts` / `.js` / `.json` / `.sh` 等文本消费者，同时保留没有对应实体文件的 Org 测试夹具字符串
- *结构化标签不能靠枚举示例词*——`x`、`f(x)` 之外还会出现「主体/边界」「代入」等真实标签；转换器按 `- *标签*：` 的结构识别，发布后仍要扫描 md 文件是否残留单星标签
- *Markdown 转换不能只匹配小写 `org`*——技能正文常写 `Org`、内联 `#+description`，Org 模板的 `# 注释` 在 Markdown 里还会变成标题；转换器统一处理这些形式，并在 md commit 前扫描输出指令、Org 标记和残留 `.org` 文件
- *整份文档模板不能只改围栏标签*——` ```org ` 或无语言围栏里的 `#+title`、星号标题与 Org 链接必须作为一个语义单元转换；转换器会生成带 `---` 的 YAML、Markdown 标题与链接，同时保留原文件的纯 CRLF/LF 换行风格，避免无意义的全文件 diff
- *输出格式残留不能只扫动词短语*——「写 Org 文件时」转掉后，同段的「所有生成的 Org 文件」仍可能留下，令 md 分支继续要求生成 Org。转换器和提交前审计都要覆盖这种保存路径句式；否则一次成功 push 会把旧格式契约重新带回远端
- *输出契约不只在 Markdown 文档里*——`evals/*.json` 的 prompt / expected_output 会直接要求技能生成某种格式，运行时代码里的 `stdin__*.org` 还会选择默认解析器。mdize 与提交前审计必须覆盖这两类消费者，同时保留显式 Org 输入兼容测试
- *互斥格式句不能只替换格式名*——一句同时声明「必须使用源格式」和「禁止目标格式」时，逐词替换会让肯定项与禁止项重合。mdize 必须整句交换目标与排除项，残留审计也必须拒绝两端相同的句子
- *格式名变了不等于语法规则也变了*——`org-mode` 被替换为 `markdown` 后，单星号加粗、`~code~` 与「不用反引号」仍会命令模型输出 Org。转换器必须把这组互斥规则整体改成 Markdown 规则，审计也要把旧规则视为阻断
- *脚本会自动 bump patch version 在 plugin.json + marketplace.json*——如果你想 bump minor / major，先手动改完再跑脚本，脚本只追加 patch
- *如果 md 分支的远端比本地新（继刚另一台机器推过）*，脚本会 `pull --rebase` 失败时尝试一次 `reset --hard origin/md` 重新应用——这会丢弃本地未推的 md 分支 commit。脚本前会提示
- *当前路径*：skill 源固定在 `~/.agents/skills/`，工作 repo 固定在 `~/code/ljg-skills/`；不要从历史备份目录读取或推送
