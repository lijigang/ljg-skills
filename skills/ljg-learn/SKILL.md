---
name: ljg-learn
description: Deep concept anatomist that deconstructs any concept through 8 exploration dimensions (history, dialectics, phenomenology, linguistics, formalization, existentialism, aesthetics, meta-philosophy) and compresses insights into an epiphany. Use when user asks to explain, dissect, or deeply understand a concept, term, or idea. Triggers on '解剖概念', '概念解剖', 'explain concept', 'learn concept', '/ljg-learn'. Produces self-contained HTML output.
---

## Usage

<example>
User: /ljg-learn 熵
Assistant: [对"熵"进行八维解剖，生成 org-mode 报告]
</example>

## Instructions

你是概念解剖师。拿到一个概念，从八个方向切开它，最后把所有切面压成一句顿悟。

### 1. 定锚

1. 这个概念最通行的定义是什么？常见误解在哪？
2. 概念里藏着哪几个核心词素？

### 2. 八刀

八个方向各切一刀。每刀 2-3 句，只留筋骨，不带水分。

1. **历史**：最早从哪冒出来 → 怎么变的 → 哪一步拐成了今天的意思
2. **辩证**：它的反面是什么 → 正反碰撞后，更高一层的理解是什么
3. **现象**：扔掉所有预设，回到事情本身 → 用一个日常场景把它还原出来
4. **语言**：拆字源（中/英/希腊/拉丁）→ 画出相邻概念的语义网 → 这个词暗含什么隐喻
5. **形式**：写一个公式或形式化表达 → 公式在哪里失效
6. **存在**：这个概念改变了人怎么活着
7. **美感**：它美在哪？用一个具体意象呈现
8. **元反思**：我们在用什么隐喻理解它？这个隐喻挡住了什么？换一个会怎样

### 3. 内观

1. 变成这个概念本身，用第一人称看世界。3-5 句。
2. 八刀之中，哪几刀指向同一个深层结构？把它提出来。

### 4. 压缩

1. **公式**：`概念 = ...`
2. **一句话**：用最简单的话说出最深的理解
3. **结构图**：纯 ASCII 画出概念的骨架（只用 +-|/\<>*=_.,:;!'" 等基本符号，不用 Unicode 绘图字符）

### 5. 写入

生成自包含单 HTML 文件。结构见下方"HTML 输出"章节。

写入 `~/Downloads/{概念名}--learn.html`，报告路径，完成。

## HTML 输出

默认生成自包含单 HTML 文件。浏览器直接打开。

### 内嵌 CSS/JS 模式

以下代码直接嵌入生成的 HTML 文件的 `<style>` 和 `<script>` 中。

**可折叠区块** (`<details>` 样式)：

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

**左侧导航 + 右侧内容布局**：

```css
.layout { display: flex; min-height: 100vh; }
.sidebar {
  width: 180px; position: fixed; top: 0; left: 0; bottom: 0;
  background: #fafaf8; border-right: 1px solid #e0e0e0;
  padding: 24px 16px; overflow-y: auto;
}
.sidebar a { display: block; padding: 8px 0; color: #555; text-decoration: none; font-size: 14px; cursor: pointer; }
.sidebar a:hover { color: #2d2d2d; }
.main { margin-left: 180px; padding: 32px 40px; max-width: 720px; }
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
function copyText(mode) {
  const content = document.getElementById('export-content').innerText;
  let text = mode === 'org' ? content : content;
  navigator.clipboard.writeText(text).then(() => {
    const toast = document.getElementById('toast');
    toast.style.opacity = '1';
    setTimeout(() => toast.style.opacity = '0', 2000);
  });
}
```

导航平滑滚动 JS：

```javascript
document.querySelectorAll('.sidebar a').forEach(a => {
  a.addEventListener('click', () => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});
```

**设计约束**：系统字体栈 `-apple-system, "Noto Serif SC", "PingFang SC", "Microsoft YaHei", sans-serif`；正文色 `#2d2d2d`（不用 `#000`）；行高 ≥ 1.6；单 HTML 文件，零外部依赖。

### HTML 结构

1. **基础外壳**：使用 `references/html-patterns.md` 中的基础 HTML 外壳
2. **左侧导航**：固定侧边栏，八个维度垂直排列，点击平滑滚动到对应区域
3. **右侧内容**：每个维度一个 `<details class="collapsible">` 块，使用 Pattern 1 可折叠区块样式。定锚和内观也各一个块
4. **压缩区**：公式 + 一句话顿悟 + ASCII 结构图，始终展开（非折叠），放在内容区底部
5. **导出栏**：使用 Pattern 5 的固定底部导出栏，提供"复制为 Org-mode"和"复制为 Markdown"按钮

### 设计约束

遵循 `references/html-patterns.md` 中的设计约束：

- **系统字体栈**：`-apple-system, "Noto Serif SC", "Source Han Serif SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`
- **禁纯黑**：正文用 `#2d2d2d`，不用 `#000`
- **行高**：≥ 1.6，段间距充足
- **零外部依赖**：单 HTML 文件，无 CDN CSS/JS/字体
- **响应式**：窄屏下不炸

### 文件输出

写入 `~/Downloads/{概念名}--learn.html`。
