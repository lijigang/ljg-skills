# 模具：长图（-l / 默认）

## 步骤 1：读取模板

Read `~/.openclaw/workspace/skills/ljg-skills/skills/ljg-skills/skills/ljg-card/assets/long_template.html`

## 步骤 2：内容预处理

- 识别标题行（`#`/`##`/`###` 开头，或独立短行）
- 识别引用块（`>` 开头）
- 识别加粗（`**text**`）
- **识别金句**：独立成段的短句（通常 < 25 字），承载核心洞察，用 `.highlight` 渲染
- 按空行分割为段落列表
- **不做切分**：所有内容放在一张卡内

## 步骤 2.5：色调感知

根据内容气质选择一组背景底色 + 强调色，让每张卡片和内容产生共振：

| 内容气质 | `{{BG_COLOR}}` | `{{ACCENT_COLOR}}` | 触发信号 |
|----------|---------------|-------------------|----------|
| 思辨/哲学 | `#FAF8F4` | `#7C6853` | 认知、思维、本质、意义、哲学 |
| 技术/工程 | `#F5F7FA` | `#3D5A80` | 架构、模型、算法、系统、代码 |
| 文学/叙事 | `#FBF9F1` | `#6B4E3D` | 故事、人物、写作、文字、诗 |
| 科学/研究 | `#F4F8F6` | `#2D6A4F` | 实验、数据、发现、论文、研究 |
| 默认 | `#FAFAF8` | `#4A4A4A` | 无法归类时 |

判断依据：扫描内容中的高频关键词和主题，匹配最贴近的一组。不需要精确——宁可用默认也不要错配。

## 步骤 3：格式化为 HTML

**基础元素：**
- 普通段落 → `<p>文本</p>`
- 章节标题（##/### 级别） → `<h2>标题</h2>`
- 引用 → `<blockquote><p>引用</p></blockquote>`
- 加粗 → `<strong>文本</strong>`
- 列表 → `<ul><li>...</li></ul>`

**金句（独立成段的核心洞察短句，视觉突出）：**
```html
<p class="highlight">金句文本</p>
```
判断标准：独立成段、< 25 字、承载关键洞察。用 `.highlight` 而非 `<p><strong>`。

**首字下沉（第一个正文段落）：**
第一个普通段落（非 `.subtitle`、`.highlight`、`.item`）添加 `dropcap` 类：
```html
<p class="dropcap">段落正文...</p>
```
仅首个正文段落使用，营造经典编辑排版的开篇仪式感。

**条目组（有标题+正文的并列条目）：**
```html
<div class="item">
  <p class="label">条目标题</p>
  <p>条目正文</p>
</div>
```

**副标题标签：**
```html
<p class="subtitle">标签文字</p>
```

**分割线（章节之间）：**
```html
<div class="divider"></div>
```

## 步骤 4：渲染模板

替换模板变量：

| 变量 | 规则 |
|------|------|
| `{{BG_COLOR}}` | 步骤 2.5 确定的背景底色 |
| `{{ACCENT_COLOR}}` | 步骤 2.5 确定的强调色 |
| `{{TITLE_BLOCK}}` | 有标题时：`<div class="title-area"><h1>标题</h1></div>`；无标题时：空字符串 |
| `{{BODY_HTML}}` | 步骤 3 生成的全部 HTML |
| `{{SOURCE_LINE}}` | 内容来源（可选）：`<span class="info-source">来源文字</span>`，无来源时空字符串 |

写入：`/tmp/ljg_cast_long_{name}.html`

## 步骤 5：截图

```bash
node ~/.openclaw/workspace/skills/ljg-skills/skills/ljg-skills/skills/ljg-card/assets/capture.js /tmp/ljg_cast_long_{name}.html ~/Downloads/{name}.png 1080 800 fullpage
```
