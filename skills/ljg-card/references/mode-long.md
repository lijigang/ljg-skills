# 模具：长图（-l，默认）

把一篇内容铸成一张可连续阅读的长卡。文字仍是主体，生成图只在真正承载结构的位置出现。

## 1. 读取

Read `references/image-generation.md` 与 `assets/long_template.html`。确认标题、正文、来源和事实边界；若来自已验收 Org，先记录路径与 SHA-256。

## 2. 提炼阅读结构

先写一句总判断，再把正文压成 3–7 个递进单元。每单元只保留一个动作：提出、拆开、反转、证明或收束。

标题不超过 16 个汉字。正文可使用：

- 普通段落 `<p>`
- 小标题 `<h2>`
- 关键判断 `<p class="highlight">`
- 可复制提示 `<div class="prompt">`
- 列表 `<ul>`
- 分隔 `<div class="divider"></div>`
- 首段下沉 `<p class="dropcap">`

## 3. 选择 1–3 个视觉锚点

只选删掉后会损伤理解的段落。优先级：核心机制 > 关键转折 > 结论余韵。未选中的段落保持纯文本，不做逐段配图。

为每个锚点在共享母题表里补充：

| role | 用途 | 构图 | 安全区 |
|---|---|---|---|
| `lead` | 标题后的总隐喻 | 宽幅，主体偏一侧 | 与标题相反的一侧 |
| `inline` | 解释一个机制 | 4:3 或 3:2，单一动作 | caption 下方或空侧 |
| `closing` | 收束判断 | 更安静、对象更少 | 上方或 `none` |

同一张长卡最多 3 幅；内容短或没有合适隐喻时可只用 1 幅。图片不能成为段落之间的装饰隔断。

## 4. 生成与校准

先生成最重要的视觉锚点，核对语义、文字安全区、纯色/透明背景与无字，再扩展其他锚点。提示词追加：

```text
editorial reading-card illustration, one clear action, restrained detail,
quiet composition that supports long-form reading, no poster typography
```

## 5. 写入模板

替换：`{{BG_COLOR}}`、`{{ACCENT_COLOR}}`、`{{TITLE_BLOCK}}`、`{{BODY_HTML}}`、`{{SOURCE_LINE}}`、`{{LOGO}}` 与顶部图片槽。

有 lead 图时：

```html
<figure class="generated-visual generated-visual--long" data-state="ready">
  <img src="/absolute/path.png" alt="具体动作及其对应的核心判断">
</figure>
```

无 lead 图时把槽设为 `data-state="empty"`，并清空 `src` 与 `alt`。inline/closing 图放进 `{{BODY_HTML}}`，使用 `.generated-art--inline` 或 `.generated-art--closing`。

写入 `/tmp/ljg_cast_long_{name}.html`。

## 6. 截图

```bash
bun assets/capture.ts /tmp/ljg_cast_long_{name}.html ~/Downloads/{name}.png 1080 1600 fullpage
```

## 7. 自检

- [ ] 1–3 个视觉锚点分别回指一个源判断
- [ ] 未选段落保持纯文本，没有机械配图
- [ ] 每图有角色、比例、安全区、本地路径和语义化 alt
- [ ] 图中无可读文字、Logo、水印或伪标签
- [ ] 标题、正文、来源和数值全部由 HTML 承担
- [ ] 长图宽度 1080，无溢出、破图、裁切和重复资产
- [ ] 整图检查后，顶部/中段/底部重叠切片覆盖全部高度
- [ ] 若绑定 Org，交付后源文件 SHA-256 未变化
