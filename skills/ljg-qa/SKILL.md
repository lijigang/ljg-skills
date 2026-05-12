---
name: ljg-qa
description: 信息提问机。给一篇文章/论文/书，把核心观点抽成 Q-A 对——Question 切要害，不教科书；Answer 简洁清晰，有形式化收口，逻辑链完整。读者顺 Q 链走过，每个 A 砸下一枚钉子，复现作者整套推理。Use when user says '问答', 'Q&A', 'QA', '提问', '抽取问题', '/ljg-qa', or shares an article/paper/book and asks for Q-A extraction. Triggers when the user wants ideas extracted not as a summary but as a sequence of incisive questions with answered. NOT FOR FAQ generation, glossary creation, or comprehension quizzes — this is intellectual scaffolding, not study aids.
user_invocable: true
---

# ljg-qa: 问答提取

读一份东西，把它的思想拆成「为什么—怎么—边界」的问答链。

读者顺着 Q 走过去，每个 A 砸下来一枚钉子。

## 你不是

- 不是 FAQ 生成器（"什么是 X"——读者一看就跳过）
- 不是摘要换皮（把段落拆成"问/答"两半还是摘要）
- 不是知识点列表（孤立的事实碰撞不出洞察）
- 不是阅读理解题（提问不是为了考读者，是为了切中作者）

## 你是

把作者的论证骨架翻出来，每根骨头长成一个尖锐的问题。读者沿着 Q 链读，能复现作者的整套思路——而不是被告知结论。

## 三条铁律

1. *Q 切要害* —— 问的是「为什么这个解法成立」「它跟另一种做法差在哪」「它的代价是什么」「它在哪里失效」，不是「它定义是什么」。一个 Q 必须能让答案承重，不能被一句话敷衍过去。

2. *A 有形式化收口* —— 每个 A 严格四段：*结论*（一句话）+ *形式化*（用文字 + 简单符号把思想压成一行可视关系，如 `A = B + C`、`旧: X → 新: Y`）+ *论证步*（怎么想到的）+ *边界*（不成立的条件）。形式化是"思想的几何"，让读者一眼看出关系。

3. *Q 链有方向* —— Q 之间不是并列罗列，是「Q1 答完→Q2 自然冒出来」。读者读完整串 Q，相当于走了一遍作者的推理路径。

## 工作流

按 `Workflows/Extract.md` 的步骤执行。

## 设计参考

Q 怎么提、A 怎么收口的具体模式见 `References/QuestionDesign.md`。

## Voice Notification

执行 workflow 时：

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running Extract in ljg-qa"}' \
  > /dev/null 2>&1 &
```

输出文本：

```
Running **Extract** in **ljg-qa**...
```

## 输出

- 格式：org-mode（`*bold*`，禁 markdown 语法）
- 路径：`~/Documents/notes/`
- denote 文件名：`{YYYYMMDDTHHMMSS}--qa-{核心主题 5-10 字}__qa.org`

## Examples

*Example 1: URL*

```
User: /ljg-qa https://example.com/article
→ WebFetch 获取
→ 找观点骨架 → 设计 Q 链 → 写 A 三段
→ org-mode 输出到 ~/Downloads/
```

*Example 2: 论文 PDF*

```
User: /ljg-qa ~/Downloads/paper.pdf
→ Read PDF（注意 pages 参数）
→ Q 抽出方法的「为什么」「代价」「边界」
→ 输出 org-mode
```

*Example 3: 直接文本*

```
User: 把这段抽成 Q-A: [text]
→ 跳过获取，直接抽
→ 输出
```

## Gotchas

- *AI 默认会写「什么是 X」型问题* —— 教科书腔。生成后扫一遍，凡是 Q 能用一句定义打发的，重写
- *AI 默认会让 A 散掉* —— 没有结论句、没有边界、写成一段散文。每个 A 必须严格四段（结论 / 形式化 / 步骤 / 边界）
- *AI 默认会把「形式化」写成数学公式* —— 不是。形式化是用文字 + → = ≠ + × 这类符号压一行可视的关系，比如 `通才 = 协调，专才 = 干活`。是"思想的几何"，不是"数学的形式"
- *AI 默认按章节顺序提问* —— 这是抄目录，不是抽思想。Q 链应该按论证依赖关系排，不按出现顺序
- *AI 默认会把 Q-A 理解成「问答游戏」* —— 不是。这里 Q 是凿子，A 是钉子。装饰性的轻问题禁止
- *AI 默认会在 A 里堆术语保平安* —— 用术语不算回答。把术语翻译成具体动作和具体物件，否则 A 没承重

## HTML 输出模式（-h / --html）

当用户指定 `-h` 或 `--html` 参数，或说"做成网页""HTML 版""交互版"时，生成自包含单 HTML 文件替代 org-mode。

### 内嵌 CSS/JS 模式

以下代码直接嵌入生成的 HTML 文件的 `<style>` 和 `<script>` 中。

**可折叠区块**：

```css
.collapsible { border-bottom: 1px solid #e0e0e0; margin-bottom: 4px; }
.collapsible summary {
  cursor: pointer; padding: 12px 16px; font-weight: 600; list-style: none;
  display: flex; justify-content: space-between; align-items: center;
  background: #fafaf8; border-radius: 4px;
}
.collapsible summary::-webkit-details-marker { display: none; }
.collapsible summary::after { content: '+'; font-size: 1.2em; color: #999; }
.collapsible[open] summary::after { content: '\2212'; }
.collapsible .content { padding: 16px; }
```

**A 四段式内部样式**：

```css
.a-conclusion { font-weight: 600; margin-bottom: 8px; }
.a-formal { font-family: monospace; background: #f5f5f4; padding: 8px 12px; border-radius: 4px; font-size: 14px; margin-bottom: 8px; }
.a-steps { margin-bottom: 8px; }
.a-boundary { font-style: italic; color: #999; font-size: 13px; }
```

**Q 链依赖图（内联 SVG）**：

```css
.flow-svg { width: 100%; max-width: 800px; overflow-x: auto; margin: 24px auto; }
.flow-svg svg { width: 100%; }
.flow-node { cursor: pointer; }
.flow-node:hover rect { fill: #f0f0f0; stroke: #2d2d2d; }
.edge-highlight { stroke: #2d2d2d !important; stroke-width: 2 !important; }
```

SVG 箭头标记：

```html
<defs>
  <marker id="arrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
    <polygon points="0 0, 10 3.5, 0 7" fill="#999" />
  </marker>
</defs>
```

展开联动 JS（打开一个 A 时高亮指向下一个 Q 的边）：

```javascript
document.querySelectorAll('.collapsible').forEach(details => {
  details.addEventListener('toggle', () => {
    if (details.open) {
      const nextId = details.getAttribute('data-next');
      if (nextId) {
        const edge = document.getElementById('edge-' + nextId);
        if (edge) edge.classList.add('edge-highlight');
      }
    }
  });
});
```

**导出栏**：

```css
.export-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: #fafaf8; border-top: 1px solid #e0e0e0;
  padding: 12px 24px; display: flex; gap: 12px; justify-content: center; z-index: 100;
}
.export-btn {
  padding: 8px 20px; border: 1px solid #ccc; background: #fff;
  border-radius: 4px; cursor: pointer; font-size: 14px;
}
.export-btn:hover { background: #f0f0f0; }
.export-btn.primary { background: #2d2d2d; color: #fff; border-color: #2d2d2d; }
```

导出按钮 JS：

```javascript
function copyText() {
  const content = document.getElementById('export-content').innerText;
  navigator.clipboard.writeText(content).then(() => {
    const toast = document.getElementById('toast');
    toast.style.opacity = '1';
    setTimeout(() => toast.style.opacity = '0', 2000);
  });
}
```

**设计约束**：系统字体栈 `-apple-system, "Noto Serif SC", "PingFang SC", "Microsoft YaHei", sans-serif`；正文色 `#2d2d2d`；行高 ≥ 1.6；单 HTML 文件，零外部依赖。

### HTML 结构

1. **基础外壳**：使用 `references/html-patterns.md` 中的基础 HTML 外壳，标题为"QA: {核心主题}"
2. **顶部——Q 链依赖图**：使用 Pattern 6 内联 SVG，画出 Q 之间的逻辑依赖关系（哪些 Q 的答案自然引出下一个 Q）。这是一个有向无环图，让读者一眼看到整条推理链的结构
3. **中部——Q-A 列表**：每个 Q-A 对使用 Pattern 1 可折叠区块。summary 显示问题全文（始终可见），答案折叠在 `<details>` 内。答案内部按四段式排列：结论（加粗）+ 形式化（代码块样式）+ 论证步骤（有序列表）+ 边界（斜体灰字）
4. **特殊行为**：点击一个 Q 的答案后，自动高亮依赖图中指向下一个 Q 的边——暗示"这个答案自然会引出下一个问题"
5. **导出栏**：使用 Pattern 5 固定底部导出栏，提供"复制为 Org-mode"和"复制为 Markdown"按钮

### 文件输出

写入 `~/Downloads/qa-{核心主题}.html`。

### 设计约束

遵循 `references/html-patterns.md` 中的设计约束（系统字体栈、禁纯黑、行高≥1.6）。
