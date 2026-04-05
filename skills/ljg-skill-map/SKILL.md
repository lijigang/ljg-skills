---
name: ljg-skill-map
description: "Skill map viewer. Scans all installed skills and renders a visual overview — name, version, description, category at a glance. Use when user says 'skills', '技能', '技能地图', 'skill map', '我有哪些技能', '看看技能', '列出技能', 'list skills'. Also trigger when user asks what skills are available or installed."
user_invocable: true
version: "1.0.0"
---

# ljg-skill-map: 技能地图

扫描 `~/.openclaw/workspace/skills/ljg-skills/skills/` 下所有已安装技能，生成一目了然的可视化地图。

## 执行

### 1. 扫描

运行 `scripts/scan.sh`，获取所有技能的 JSON 数据（name, version, invocable, desc）。

### 2. 分类

根据技能名称和描述，将技能自动归入以下类别：

| 类别 | 图标 | 含义 | 典型成员 |
|------|------|------|----------|
| 认知原子 | ◆ | 内容处理的原子操作 | ljg-plain, ljg-word, ljg-writes, ljg-paper |
| 输出铸造 | ▲ | 将内容转化为可交付物 | ljg-card |
| 联网触达 | ● | 与外部世界交互 | agent-reach |
| 系统运维 | ■ | Agent 自身的维护和管理 | datetime-check, memory-review, save-conversation, skill-creator, ljg-skill-map |
| 环境部署 | ★ | 一次性安装和配置 | Her-init |

归类依据名称前缀和描述关键词判断。遇到新技能无法归类时，放入「未分类」。

### 3. 渲染

用 ASCII 方框图呈现，格式如下：

```
╔══════════════════════════════════════════════════════════╗
║              SKILL MAP  ·  {N} skills installed         ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  ◆ 认知原子                                              ║
║  +-----------------+----------------------------------+  ║
║  | ljg-plain v4.0  | 白 — 好问题+类比让人 grok        |  ║
║  | ljg-word  v1.0  | 英文单词深度拆解                  |  ║
║  | ljg-writes v4.0 | 写作引擎                          |  ║
║  | ljg-paper v2.0  | 论文阅读与分析                    |  ║
║  +-----------------+----------------------------------+  ║
║                                                          ║
║  ▲ 输出铸造                                              ║
║  +-----------------+----------------------------------+  ║
║  | ljg-card  v1.5  | 铸 — 内容转 PNG 可视化           |  ║
║  +-----------------+----------------------------------+  ║
║                                                          ║
║  ...                                                     ║
╚══════════════════════════════════════════════════════════╝
```

规则：
- 每个类别一个区块，类别图标 + 中文名做标题
- 技能名左对齐，版本号紧跟（无版本显示 `-`）
- 描述截断到一行，保留核心语义
- user_invocable 为 true 的技能名后加 `/` 标记（表示可直接 `/技能名` 调用）
- 底部统计行：总数、可调用数、分类数

### 4. 输出

直接在对话中渲染 ASCII 地图。不生成文件，不写入磁盘。
