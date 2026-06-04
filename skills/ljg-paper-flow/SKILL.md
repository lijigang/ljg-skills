---
name: ljg-paper-flow
description: "Paper workflow: read papers + cast cards in one go. Takes one or more arxiv links, paper URLs, PDFs, or paper names. For each paper, runs ljg-paper (generates org analysis) then ljg-card -v (generates visual sketchnote PNG). Use when user says '论文流', 'paper flow', '读论文并做卡片', '论文卡片', or provides multiple papers wanting both analysis and cards."
user_invocable: true
version: "1.0.2"
---

# ljg-paper-flow: 论文流

一条命令完成：读论文 → 生成解读 → 铸成卡片。支持多篇并行。

## 模式

**强制 NATIVE 模式。** 本 workflow 是纯 skill 管道（ljg-paper → ljg-card），不需要 Algorithm 的七步流程。直接按下方执行步骤调用 skill，不走 OBSERVE/THINK/PLAN/BUILD/EXECUTE/VERIFY/LEARN。

## 参数

| 参数 | 说明 |
|------|------|
| 无参数 | 对话中已提供的论文链接/文件 |
| `-l` | 卡片模具改用长图模式（默认 `-v` 视觉笔记） |
| `-i` | 卡片模具改用信息图模式 |
| `-c` | 卡片模具改用漫画模式 |

## 执行

### 1. 收集论文列表

从用户消息中提取所有论文来源（arxiv URL、PDF 路径、论文名称等）。

### 2. 并行处理每篇论文

对每篇论文，启动一个 Agent subagent，每个 subagent 按顺序执行两步：

**步骤 A — 读论文（ljg-paper）：**

调用 Skill tool 执行 `ljg-paper`，传入该论文的来源。等待完成，获得生成的 markdown 文件路径。

**步骤 B — 铸卡片（ljg-card）：**

读取步骤 A 生成的 markdown 文件，调用 Skill tool 执行 `ljg-card`（默认 `-v`，或按用户指定的模具参数），以 markdown 文件内容为输入。等待完成，获得 PNG 文件路径。

### 3. 汇总报告

所有论文处理完成后，汇总输出：

```
════ 论文流完成 ═══════════════════════
📄 {论文标题1}
   📝 解读: {markdown 文件路径}
   🖼️ 卡片: {PNG 文件路径}

📄 {论文标题2}
   📝 解读: {markdown 文件路径}
   🖼️ 卡片: {PNG 文件路径}
...
```

## 关键约束

- 每篇论文的两步必须串行（先 paper 后 card），但多篇论文之间并行
- ljg-paper 和 ljg-card 各自的质量标准、红线、品味准则不变
- 卡片内容来自生成的 markdown 文件，不是原始论文
