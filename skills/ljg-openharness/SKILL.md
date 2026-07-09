---
name: ljg-openharness
version: 0.1.0
description: "OpenHarness (HKUDS) bridge skill —— 0 依赖 Python 客户端包装 HKUDS/OpenHarness 的 `oh` CLI。提供 dry-run 预览、单 prompt 调用 (text/json/stream-json)、skill/command/tool 清单查询、ohmo gateway 状态查询。当用户说 'OpenHarness 跑一下' / '用 oh 调下' / 'ohmo 状态' / 'OpenHarness dry-run' / 'HKUDS harness' 时触发。**前提**: `~/.local/bin/oh` 符号链接存在,指 `~/.openharness-venv/bin/oh`(openharness-ai 包)。"
metadata:
  requires:
    bins: ["python3", "oh"]
    python: ">=3.10"
  cliHelp: "python3 -c 'from ljg_openharness import dry_run, prompt, list_skills, ohmo_status; print(list_skills()[:5]); print(ohmo_status())'"
---

# ljg-openharness

**身份:OpenHarness (HKUDS) 的 0 依赖 Python 客户端**。把 `oh` / `ohmo` CLI 包成 Python 函数,产出可消费的 dict / str。

---

## 触发条件 (何时调我)

| 用户说 | 你要做的 |
|---|---|
| "OpenHarness 跑一下 X" / "用 oh 调下" | `prompt(p, output_format="text")` |
| "用 OpenHarness 出 json" / "stream 一下" | `prompt(p, output_format="json")` 或 `"stream-json"` |
| "OpenHarness dry-run 看看" | `dry_run(prompt="...")` |
| "oh 现在装了什么 skill" | `list_skills()` |
| "ohmo gateway 跑着没" / "ohmo 状态" | `ohmo_status()` |
| "OpenHarness 调 LLM 写一篇" / "用 harness 出..." | `prompt(p, model="sonnet")` |

**不要**:
- ❌ 用户说"交互式开 oh" → 那是直接 `oh` 命令,本 skill 是编程接口
- ❌ 用户说"做 skill 给 oh 加载" → 那是写 .md 文件到 `~/.openharness/skills/`(本 skill 不管落盘)
- ❌ 主人没装 openharness-ai 时硬调 → 触发 `OpenHarnessNotFound` 异常,提示装法

---

## API 速查

```python
from ljg_openharness import (
    dry_run,           # 静态预览 --dry-run,不动模型
    prompt,            # -p "..." 一次性跑
    list_skills,       # 列出 oh 加载的 .md skills
    list_commands,     # 列出 slash commands
    list_tools,        # 列出可用工具
    ohmo_status,       # ohmo gateway 状态
    OpenHarnessError,  # 自定义异常基类
)

# 1. dry-run
result = dry_run(prompt="Review this bug fix", output_format="json")
# → dict {ready, warnings, next_actions, ...}

# 2. 单 prompt
text = prompt("Explain this codebase", output_format="text")
data = prompt("List all functions", output_format="json")  # → dict
events = prompt("Fix bug", output_format="stream-json")   # → list[dict]

# 3. 元数据查询
skills = list_skills()       # list[dict] name/path/description
commands = list_commands()   # list[dict]
tools = list_tools()         # list[dict] name/description

# 4. ohmo gateway
status = ohmo_status()  # {running: bool, workspace: str, channels: [...]}
```

---

## 安装前置 (在主人机器上已经做了)

```bash
# 1. 用 uv 拉 Python 3.12 venv
~/.local/bin/uv venv ~/.openharness-venv --python 3.12
~/.local/bin/uv pip install --python ~/.openharness-venv/bin/python pip
~/.openharness-venv/bin/pip install openharness-ai

# 2. 符号链接到 ~/.local/bin/
ln -sf ~/.openharness-venv/bin/oh ~/.local/bin/oh
ln -sf ~/.openharness-venv/bin/ohmo ~/.local/bin/ohmo
ln -sf ~/.openharness-venv/bin/openharness ~/.local/bin/openharness

# 3. 验证
~/.local/bin/oh --version  # → openharness 0.1.9
```

⚠️ **注意**:`~/.zshrc` 里如果有 `oh` 别名(目前没有)会被覆盖。

---

## 跟主人现有栈的联动

### A. ljg-openharness → ljg-* (skill 内调 skill)
`prompt()` 输出的 text 可以喂给:
- `ljg-writes` —— 改写/扩写
- `ljg-card` —— 出图
- `ljg-ppt-design` —— 出 PPT
- `ljg-paper` —— 读论文
- `ljg-invest` —— 投资分析

### B. ljg-* → OpenHarness (skill 注册给 oh)
把 ljg-* 的 SKILL.md 软链/复制到 `~/.openharness/skills/`(如果 oh 启动时扫描) —— **待验证 OpenHarness 的 skill loader 路径**

### C. ohmo ↔ OpenClaw gateway
- OpenClaw gateway: `~/Library/LaunchAgents/ai.openclaw.gateway.plist`
- ohmo gateway: `ohmo gateway start` (默认端口待确认)
- 双轨运行,通道配置互不干扰

---

## 设计原则

1. **0 依赖** —— 只用 stdlib `subprocess` + `json`,不直接 import openharness 包
2. **subprocess 调 oh CLI** —— 用 `-p` 一次性模式,不走交互 TUI
3. **失败明确** —— oh 不在 / 装错 / 调失败 都抛 `OpenHarnessError` 带可读消息
4. **JSON 友好** —— `output_format="json"` 返回 dict 而不是字符串
5. **stream-json 解析** —— 增量输出按行 NDJSON 解析,产出 `list[dict]`

---

## v0.1.0 范围

✅ `dry_run` · `prompt` · `list_skills` · `list_commands` · `list_tools` · `ohmo_status`
❌ 不做:交互 TUI / ohmo gateway 启停(那是 `ohmo` CLI 自己)
❌ 不做:Provider auth 配置(那是 `oh setup`)
❌ 不做:写 .md skill 落盘(那是 OpenHarness 自家 skill loader 范畴)

---

_ljg-openharness · 0 依赖 OpenHarness 客户端 · 2026-06-19_
_对接 HKUDS/OpenHarness 14k star harness 主线 · 跟 ljg-ppt-design-hku 同思路_