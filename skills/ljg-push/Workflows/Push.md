# Push Workflow

一键同步 ljg-* skills 到 github repo（master + md 双分支）。

## Voice Notification

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running Push in ljg-push"}' \
  > /dev/null 2>&1 &
```

输出文本：`Running **Push** in **ljg-push**...`

## Step 0: Pre-push README check（硬 gate）

每次 push 都要先问自己一句：

> README 还跟实际的 skill 集合对得上吗？

具体三件事：

1. *新增 skill 了吗*？ → README 的 skill 清单 / 安装命令需要加一行
2. *删了 skill 吗*？ → README 对应行要删
3. *某个 skill 的描述大改了吗*？ → README 的简介可能要同步

脚本会自动 grep README 里所有 `ljg-xxx` 名字，跟 `~/.agents/skills/ljg-*` 对比。如果有 skill 在 local 但不在 README，*push 直接中止*。

绕过办法（仅当你确认 README 已经审过、不需要更新）：

```bash
bash Push.sh --skip-readme-check
```

## Step 1: 解析参数

| 用户说 | 标志 | 效果 |
|--------|------|------|
| 默认 | （无标志）| README check + 检测变更 + 双分支推送 |
| "dry-run", "看一下" | `--dry-run` | 只列出会做什么，不真推（README check 跳过）|
| "force", "强推" | `--force` | 跳过 detect，强制 rsync 所有 ljg-* |
| "README 已审" | `--skip-readme-check` | 跳过 README 一致性 gate（其他 check 仍跑）|

## Step 2: 执行脚本

```bash
bash ~/.agents/skills/ljg-push/Tools/Push.sh [--dry-run|--force]
```

脚本逻辑：

1. *Setup*：检查 `$HOME/code/ljg-skills` 是否存在，不存在则 clone
2. *Detect*：以与同步完全相同的文件边界对比 `~/.agents/skills/ljg-*` vs `repo/skills/ljg-*`——按校验和识别新增、删除、内容和可执行位变化；纯时间戳、目录元数据和空目录不会单独触发发布，`.git/`、`node_modules/`、`.DS_Store` 被忽略，但普通备份文件不会被忽略
3. *Master 推送*：
   - `git checkout master` + `git pull --rebase`
   - 对每个有差异的 skill：按上述共同边界 rsync（删除目标端多出的真实文件、保留权限，不传播时间戳/所有者/群组；目录本身不进入 Git 结果）
   - bump patch version (plugin.json + marketplace.json)
   - `git add` + `git commit` + `git push origin master`
4. *Md 推送*：
   - `git checkout md` + `git pull --rebase`
   - 对每个有差异的 skill：rsync + 应用 markdown 化（`mdize_skill` 函数——含 org 文件本体转换：`orgfile_to_md` 转 YAML 头/`#` 标题后删 .org，Markdown 与运行时代码中的实际文件引用全局改写；Markdown 内嵌的完整 Org 模板，以及首行就是 Org 头的无语言围栏模板，由 `MdizeEmbeddedOrg.ts` 转成带 YAML frontmatter 的 Markdown 模板，并保留原文件换行风格；结构化 `- *标签*：` 转成 `- **标签**：`；eval 输出契约与 stdin 默认格式同步切到 Markdown；`ljg-is` 的输出标题、路径称谓、元数据名、tags 与验收合同同步切到 Markdown/YAML + Denote）
   - commit 前运行残留审计：拒绝未转换的输出指令、Org 专用 lint 调用、Org 头标记、单星号加粗/Org 等宽文本等旧语法规则、非 assets `.org` 文件、eval JSON 的 Org 输出要求和运行时 Org 默认值
   - bump patch version
   - `git add` + `git commit` + `git push origin md`
5. *收尾*：切回 `master`，让本地工作 repo 留在源分支
6. *Report*：列出推送结果 + 仍需手工 review 的差异清单

## Step 3: 报告

输出格式：

```
═══ ljg-push 报告 ═══════════════
更新的 skills:
  - ljg-qa
  - ljg-card

master @ v1.17.13 → pushed
md     @ v1.0.8   → pushed

仍需手工 review（自动转换不覆盖的差异）:
  - ljg-xxx/SKILL.md  (正文 `*bold*` 标记——斜体歧义，脚本不动；结构化 bullet 标签除外)

══════════════════════════════════
```

## Step 4: 异常处理

| 异常 | 处理 |
|------|------|
| repo 路径不存在 | 自动 clone，告知用户 |
| 路径存在但不是 ljg-skills repo | 报错，不破坏现有目录 |
| `git push` 被远端拒（远端有新 commit）| 尝试 `pull --rebase`，再推；冲突时报错让用户处理 |
| `git pull --rebase` 冲突 | 报错，列出冲突文件，提示 `rebase --abort` 或手工解决 |
| `~/.agents/skills/ljg-*` 没有任何变更 | 输出 "Nothing to push." 退出 |

## 验收

- 两个分支都有新 commit（除非检测到无变更）
- 远端 origin/master 和 origin/md 都更新
- 本地 `$HOME/code/ljg-skills` 最后停在 `master`
- 报告里列出版本号和推送的 skills
- 任何 markdown 化未覆盖的差异都列在 review checklist 里
