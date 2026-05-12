# HTML Effectiveness 交互模式参考

零依赖、自包含单 HTML 文件的交互模式集。供所有 ljg-* 技能的 HTML 输出模式引用。

## 核心哲学

- **交互胜过描述** — 可操作界面比纯文本段落传达更多
- **空间并置胜过线性顺序** — 把选项平铺开，一眼比较，不用在记忆中来回翻
- **脚手架胜过倾倒** — 构建可导航的结构（折叠/标签页/跳转），不是一次性倾倒大段文字
- **导出闭环** — 每个交互界面必须有导出按钮，把产物导回纯文本，回到 agent 工作流
- **零构建步骤** — 单 HTML 文件，浏览器直接打开即用
- **低保真决策** — 足够判断交互是否正确，不追求精美

## 基础 HTML 外壳

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{TITLE}}</title>
<style>
  /* 所有 CSS 内联在此 */
</style>
</head>
<body>
  <!-- 内容 -->
  <script>
    // 所有 JS 内联在此
  </script>
</body>
</html>
```

## 设计约束

参考 ljg-card 的 taste 准则（`ljg-card/references/taste.md`），HTML 输出同样适用：

- **禁 Inter 字体** — 用系统字体栈：`-apple-system, "Noto Serif SC", "Source Han Serif SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`
- **禁纯黑** — 正文用 `#2d2d2d` 或 `#1a1a1a`，不用 `#000`
- **禁 AI 文案腔** — 标签文字干净利落
- **留白呼吸** — 行高 ≥ 1.7，段间距充足

## 模式目录

### 1. 可折叠区块 (Collapsible Sections)

适用：层级信息、推理链、Q-A 链、讨论轮次

```html
<style>
.collapsible { border-bottom: 1px solid #e0e0e0; }
.collapsible summary {
  cursor: pointer;
  padding: 12px 0;
  font-weight: 600;
  list-style: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.collapsible summary::-webkit-details-marker { display: none; }
.collapsible summary::after {
  content: '+';
  font-size: 1.2em;
  color: #999;
  transition: transform 0.2s;
}
.collapsible[open] summary::after { content: '\2212'; }
.collapsible .content { padding: 0 0 16px 0; }
</style>

<details class="collapsible">
  <summary>问题 / 层级标题</summary>
  <div class="content">答案 / 内容</div>
</details>
```

**ljg-learn 用法**：八个维度各一个折叠块，默认全部展开或全部收拢
**ljg-think 用法**：每层推理一个折叠块，默认收拢，底层高亮
**ljg-qa 用法**：每个 Q 可见，A 默认折叠

### 2. 标签页 (Tab Panels)

适用：多视角切换、论文各部分、翻译层级

```html
<style>
.tabs { display: flex; gap: 0; border-bottom: 2px solid #e0e0e0; margin-bottom: 20px; }
.tab-btn {
  padding: 8px 20px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: #999;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: color 0.2s, border-color 0.2s;
}
.tab-btn.active { color: #2d2d2d; border-bottom-color: #2d2d2d; }
.tab-panel { display: none; }
.tab-panel.active { display: block; }
</style>

<div class="tabs">
  <button class="tab-btn active" onclick="switchTab(0)">标签一</button>
  <button class="tab-btn" onclick="switchTab(1)">标签二</button>
</div>
<div class="tab-panel active">内容一</div>
<div class="tab-panel">内容二</div>

<script>
function switchTab(i) {
  document.querySelectorAll('.tab-btn,.tab-panel').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn')[i].classList.add('active');
  document.querySelectorAll('.tab-panel')[i].classList.add('active');
}
</script>
```

**ljg-paper 用法**：摘要/方法/结果/局限各一个 tab
**ljg-read 用法**：原文/信/达/雅三层翻译各一个 tab
**ljg-plain 用法**：12岁/成人/专业三个阅读层级各一个 tab

### 3. 左右对照栏 (Side-by-Side Comparison)

适用：原文 vs 白话、多方观点并排、Diff 对比

```html
<style>
.split-view { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.split-view .panel { padding: 16px; background: #fafaf8; border-radius: 4px; }
.split-view .panel h4 { margin-top: 0; color: #999; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
@media (max-width: 768px) { .split-view { grid-template-columns: 1fr; } }
</style>

<div class="split-view">
  <div class="panel">
    <h4>原文</h4>
    <p>原文内容...</p>
  </div>
  <div class="panel">
    <h4>白话</h4>
    <p>白话内容...</p>
  </div>
</div>
```

**ljg-plain 用法**：左原文，右白话，一目了然
**ljg-roundtable 用法**：多栏并排发言人观点

### 4. Margin Notes (旁注)

适用：阅读伴读、术语解释、评论标注

```html
<style>
.margin-note { float: right; width: 200px; margin-right: -220px; font-size: 13px; color: #666; padding: 8px; background: #f9f9f7; border-left: 2px solid #ddd; }
@media (max-width: 900px) { .margin-note { float: none; width: auto; margin-right: 0; margin-bottom: 12px; } }
</style>

<p>正文段落...<span class="margin-note">旁注：这里隐含了一个假设——...</span></p>
```

**ljg-read 用法**：翻译中的文化注释、结构标注
**ljg-paper 用法**：术语解释、关联论文提示

### 5. 导出按钮 (Export Button)

所有交互界面必须有的闭环出口。

```html
<style>
.export-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: #fafaf8; border-top: 1px solid #e0e0e0;
  padding: 12px 24px;
  display: flex; gap: 12px; justify-content: center;
  z-index: 100;
}
.export-btn {
  padding: 8px 20px;
  border: 1px solid #ccc;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.15s;
}
.export-btn:hover { background: #f0f0f0; }
.export-btn.primary { background: #2d2d2d; color: #fff; border-color: #2d2d2d; }
.export-toast {
  position: fixed; bottom: 60px; left: 50%; transform: translateX(-50%);
  background: #2d2d2d; color: #fff; padding: 8px 20px; border-radius: 4px;
  font-size: 13px; opacity: 0; transition: opacity 0.3s;
}
.export-toast.show { opacity: 1; }
</style>

<div class="export-bar">
  <button class="export-btn primary" onclick="copyOrgMode()">复制为 Org-mode</button>
  <button class="export-btn" onclick="copyMarkdown()">复制为 Markdown</button>
</div>
<div class="export-toast" id="toast">已复制到剪贴板</div>

<script>
function copyOrgMode() {
  const text = document.getElementById('export-content').innerText;
  navigator.clipboard.writeText(text).then(() => {
    const toast = document.getElementById('toast');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  });
}
function copyMarkdown() {
  const text = document.getElementById('export-content').innerText;
  navigator.clipboard.writeText(text).then(() => {
    const toast = document.getElementById('toast');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  });
}
</script>
```

### 6. 内联 SVG 流程图

适用：论文引用链、概念关系图、时间线

```html
<style>
.flow-svg { width: 100%; max-width: 800px; overflow-x: auto; }
.flow-svg svg { width: 100%; }
.flow-node { cursor: pointer; }
.flow-node:hover rect { fill: #f0f0f0; }
</style>

<div class="flow-svg">
<svg viewBox="0 0 800 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#999" />
    </marker>
  </defs>
  <line x1="80" y1="100" x2="230" y2="100" stroke="#999" stroke-width="1.5" marker-end="url(#arrow)" />
  <g class="flow-node" onclick="alert('details')">
    <rect x="20" y="80" width="60" height="40" rx="4" fill="#fafaf8" stroke="#ccc" />
    <text x="50" y="105" text-anchor="middle" font-size="12" fill="#2d2d2d">Paper A</text>
  </g>
  <text x="155" y="94" text-anchor="middle" font-size="10" fill="#999">critique: X problem</text>
</svg>
</div>
```

**ljg-paper-river 用法**：论文引用演化时间线，节点可点击展开详情
**ljg-learn 用法**：八维关系图
**ljg-rank 用法**：生成器关系骨架图

### 7. 拖拽排序 (Drag-Sort Cards)

适用：优先级排序、生成器权重调节

```html
<style>
.card-list { list-style: none; padding: 0; max-width: 600px; }
.card-item {
  padding: 12px 16px;
  margin-bottom: 8px;
  background: #fafaf8;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: grab;
  user-select: none;
  display: flex; align-items: center; gap: 12px;
}
.card-item:active { cursor: grabbing; }
.card-item.dragging { opacity: 0.5; }
.card-item .drag-handle { color: #ccc; font-size: 16px; }
.card-item .index { font-size: 12px; color: #999; min-width: 20px; }
</style>

<ul class="card-list" id="cardList">
  <li class="card-item" draggable="true"><span class="drag-handle">::</span><span class="index">1</span>generator A</li>
  <li class="card-item" draggable="true"><span class="drag-handle">::</span><span class="index">2</span>generator B</li>
</ul>

<script>
const list = document.getElementById('cardList');
let draggedItem = null;

list.addEventListener('dragstart', e => {
  draggedItem = e.target.closest('.card-item');
  if (!draggedItem) return;
  draggedItem.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
});

list.addEventListener('dragover', e => {
  e.preventDefault();
  const after = getDragAfter(list, e.clientY);
  const current = document.querySelector('.dragging');
  if (!current) return;
  if (after) list.insertBefore(current, after);
  else list.appendChild(current);
});

list.addEventListener('dragend', () => {
  if (draggedItem) draggedItem.classList.remove('dragging');
  draggedItem = null;
  updateIndices();
});

function getDragAfter(container, y) {
  const items = [...container.querySelectorAll('.card-item:not(.dragging)')];
  return items.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: child };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function updateIndices() {
  document.querySelectorAll('.card-item .index').forEach((el, i) => { el.textContent = i + 1; });
}
</script>
```

**ljg-rank 用法**：拖拽重排生成器优先级

### 8. 垂直时间线 (Vertical Timeline)

适用：历史演进、论文演化线、阶段链

```html
<style>
.timeline { position: relative; padding-left: 32px; }
.timeline::before {
  content: '';
  position: absolute;
  left: 8px; top: 0; bottom: 0;
  width: 2px; background: #e0e0e0;
}
.timeline-item { position: relative; margin-bottom: 24px; }
.timeline-item::before {
  content: '';
  position: absolute;
  left: -28px; top: 6px;
  width: 10px; height: 10px;
  border-radius: 50%;
  background: #2d2d2d;
  border: 2px solid #fff;
}
.timeline-item .year { font-size: 12px; color: #999; }
.timeline-item .title { font-weight: 600; margin: 4px 0; }
.timeline-item .detail { font-size: 14px; color: #555; display: none; }
.timeline-item.active .detail { display: block; }
</style>
```

**ljg-paper-river 用法**：论文演化时间线

### 9. 多栏并排视图

适用：圆桌讨论、多方观点并置

```html
<style>
.columns { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; }
.column {
  padding: 16px;
  background: #fafaf8;
  border-top: 3px solid #2d2d2d;
}
.column .speaker { font-weight: 600; margin-bottom: 8px; }
.column .stance { font-size: 12px; color: #999; margin-bottom: 12px; }
</style>
```

**ljg-roundtable 用法**：每个发言人一栏

## 写 HTML 时的检查清单

- [ ] 单文件，零外部依赖（无 CDN CSS/JS/font）
- [ ] 导出按钮可用（能复制为 org-mode 或 markdown）
- [ ] 响应式：窄屏下不炸
- [ ] 字体：系统字体栈，不用 Inter
- [ ] 颜色：禁纯黑 `#000`，正文 `#2d2d2d`
- [ ] 留白：行高 >= 1.6，段间距充足
- [ ] 交互：折叠/标签页/拖拽必须有视觉反馈
- [ ] 打印友好：`@media print` 隐藏导出栏等 UI 元素
