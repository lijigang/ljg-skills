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
2. *Detect*：对比 `~/.agents/skills/ljg-*` vs `repo/skills/ljg-*`，列出有差异的
3. *Master 推送*：
   - `git checkout master` + `git pull --rebase`
   - 对每个有差异的 skill：`rsync -a --delete --exclude='.git'`
   - bump patch version (plugin.json + marketplace.json)
   - `git add` + `git commit` + `git push origin master`
4. *Md 推送*：
   - `git checkout md` + `git pull --rebase`
   - 对每个有差异的 skill：rsync + 应用 markdown 化（`mdize_skill` 函数——含 org 文件本体转换：`orgfile_to_md` 转 YAML 头/`#` 标题后删 .org，引用全局改写）
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
  - ljg-xxx/SKILL.md  (正文 `*bold*` 标记——斜体歧义，脚本不动)

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
