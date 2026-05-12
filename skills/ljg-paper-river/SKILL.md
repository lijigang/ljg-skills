---
name: ljg-paper-river
description: "论文倒读法：给一篇论文，递归找出它批判和改进的前序论文（最多5层），再找它之后的最新进展，从源头正向讲述问题演化史。以问题为轴，费曼式讲解每篇论文看到的问题和解法创新。Use when user shares a paper and wants to understand its intellectual lineage, citation chain, problem evolution, or says '倒读', '论文溯源', '论文脉络', 'paper river', 'paper connects', 'trace back', '这篇论文的来龙去脉', '论文演化'. Also trigger when user wants to understand how a research problem evolved across multiple papers."
user_invocable: true
version: "1.0.0"
---

# ljg-paper-connects: 倒读法

一篇论文不是孤岛。它站在前人的肩上，也踩着前人的伤疤。倒着挖到根，再正着看过来——问题怎么长出来的，每个人看到了什么别人没看到的，解法怎么一步步逼近真相。

## 核心逻辑

读论文最常见的错：只看眼前这一篇，不知道它从哪来。倒读法反过来——先找到这篇论文在批判谁、改进谁，再找那篇论文又在批判谁，递归五层，挖到源头。然后掉头，从源头正向读回来。

这样读完，你拿到的不是一篇论文的知识，是一整条问题演化线的理解。

## 格式约束

### ASCII Art

所有图表用纯 ASCII 字符。允许：`+ - | / \ > < v ^ * = ~ . : # [ ] ( ) _ , ; ! ' "` 和空格。禁止 Unicode 绘图符号。


### 文件输出

写入 `~/Downloads/paper-river-{简短标题}.html`。

## 红线

1. *问题为轴* — 整篇文章的主线是"问题怎么演化的"，不是"论文怎么排列的"。论文是配角，问题是主角
2. *口语检验* — 你会这样跟朋友讲一个领域的发展史吗？不会就改
3. *差异为核* — 每篇论文的讲解重心是"它和前一篇的差异在哪"，不是独立地介绍每篇论文
4. *零术语* — 先用大白话落地，再顺带提术语名
5. *逻辑不断链* — 从第一篇到最后一篇，因果链条不能断。读者能感受到"所以他们才会这样做"
6. *诚实* — 找不到五层就说找到几层。论文之间的关系不确定就说不确定。不编造引用关系

## 写作原则

1. *差异驱动叙事* — 不要给每篇论文写独立摘要再拼起来。以"这篇看到了前一篇的什么问题"作为每段的开头，让差异本身推动叙事往前走
2. *变形替代定义* — 讲两个方案的区别时，把方案A连续变形成方案B。"如果你把X去掉，再加上Y，你就得到了Z"——比"Z和X的区别是..."有力十倍
3. *推理外显* — 每个解法出现前，先让读者感受到"不这么做不行了"的压力。模拟发现的过程，不是汇报发现的结果
4. *一张图胜千言* — 在演化叙事之前画溯源地图，在叙事之后画压缩总览图。让读者先有全景再入细节，细节看完再回全景

## 执行

### 1. 获取目标论文

- arxiv URL → WebFetch
- PDF → Read（注意 pages 参数限制）
- 论文名称 → WebSearch 找到全文

确保拿到：标题、作者、摘要、引言（尤其是 related work / introduction 中对前人工作的批判）。

### 2. 提取批判链线索

仔细读目标论文的引言和相关工作部分。找出：

- 它明确说"前人方法 X 有问题 Y"的地方
- 它声称自己改进了哪篇/哪几篇论文
- 它对比的 baseline 是谁

从中锁定 *被批判/被改进的核心论文*（通常 1-3 篇，选最直接的那条线）。

### 3. 递归溯源（深度研究）

对第 2 步找到的核心前序论文，重复同样的过程：它又在批判谁？改进谁？

递归规则：
- 最多递归 5 层（到第 5 层或到该领域的奠基论文为止）
- 每层只追 *问题最相关的那条线*，不发散
- 如果某层找不到明确的被批判对象，停在那里

使用 Research skill（deep research 模式）获取每层论文的关键信息。每篇论文至少拿到：标题、作者、年份、核心问题、核心解法、对前人的批判点。

### 4. 前沿延伸

反方向：目标论文之后，有没有新论文在批判/改进它？

同样用 Research skill 搜索：
- 引用了目标论文的后续工作
- 同一问题上的最新进展

找到最相关的 1-3 篇后续论文，获取同样的信息。

### 5. 构建演化线

把第 3、4 步的结果整理成时间线：

```
[最老] Paper_0 → Paper_1 → ... → [目标论文] → [后续论文]
```

每条箭头标注：后者看到了前者的什么问题。

### 6. 正向费曼叙事

从最老的论文开始，正向讲述。关键：不是逐篇独立介绍，而是以问题演化为线索串联。

每篇论文讲三件事（以差异为重心）：
1. 它看到了前人方案的什么具体问题（用例子或场景说明）
2. 它的解法核心思路（用类比讲清楚）
3. 这个解法又留下了什么新的问题（自然过渡到下一篇）

### 7. 画图

两张图：
- *溯源地图*：放在演化叙事之前，展示论文间的引用/批判关系
- *问题-解法总览*：放在叙事之后，把整条线压缩到一屏。让人扫一眼就知道这条线怎么长出来的

### 8. 提炼洞见

读完整条线，回答：
- 这条演化线背后真正在发生什么变化？（不是表面的技术迭代，是更深层的认知转变）
- 下一步最可能往哪走？

### 9. 过红线 + 生成文件

逐条扫红线。额外检查：
- 因果链条是否连贯——把所有"它看到了什么问题"串起来读，逻辑通不通
- 差异是否突出——每篇论文的重点是不是在讲"和前面有什么不同"

生成自包含单 HTML 文件，写入 `~/Downloads/paper-river-{简短标题}.html`，报告路径。

## 验收

- *问题是主角*：读完后记住的是"问题怎么演化的"，不是"有哪些论文"
- *因果不断*：从第一篇到最后一篇，每个转折都有"所以"
- *差异清晰*：每篇论文的独特贡献一句话能说清
- *外行能跟*：不懂这个领域的聪明人读完能复述这条演化线
- *两张图能独立看*：不读正文，只看图也能抓住大意
- *诚实标注*：哪些是确认的引用关系，哪些是推测的，标清楚

## HTML 输出

默认生成自包含单 HTML 文件。浏览器直接打开。

### 内嵌 CSS/JS 模式

以下代码直接嵌入生成的 HTML 文件的 `<style>` 和 `<script>` 中。

**内联 SVG 流程图**：

```css
.flow-svg { width: 100%; max-width: 900px; overflow-x: auto; margin: 24px auto; }
.flow-svg svg { width: 100%; }
.flow-node { cursor: pointer; }
.flow-node:hover rect { fill: #f0f0f0; stroke: #2d2d2d; }
```

SVG 箭头标记：

```html
<defs>
  <marker id="arrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
    <polygon points="0 0, 10 3.5, 0 7" fill="#999" />
  </marker>
</defs>
```

节点点击滚动 JS：

```javascript
document.querySelectorAll('.flow-node').forEach(node => {
  node.addEventListener('click', () => {
    const id = node.getAttribute('data-target');
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});
```

**垂直时间线**：

```css
.timeline { position: relative; padding-left: 32px; }
.timeline::before {
  content: ''; position: absolute; left: 8px; top: 0; bottom: 0;
  width: 2px; background: #e0e0e0;
}
.timeline-item { position: relative; margin-bottom: 24px; }
.timeline-item::before {
  content: ''; position: absolute; left: -28px; top: 6px;
  width: 10px; height: 10px; border-radius: 50%;
  background: #2d2d2d; border: 2px solid #fff;
}
.timeline-item .year { font-size: 12px; color: #999; }
.timeline-item .title { font-weight: 600; margin: 4px 0; cursor: pointer; }
```

**可折叠区块**：

```css
.collapsible { border-bottom: 1px solid #e0e0e0; margin-top: 8px; }
.collapsible summary {
  cursor: pointer; padding: 8px 0; font-weight: 600; list-style: none;
  display: flex; justify-content: space-between; align-items: center;
}
.collapsible summary::-webkit-details-marker { display: none; }
.collapsible summary::after { content: '+'; font-size: 1.1em; color: #999; }
.collapsible[open] summary::after { content: '\2212'; }
.collapsible .content { padding: 8px 0 16px 0; }
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

1. **基础外壳**：使用 `references/html-patterns.md` 中的基础 HTML 外壳，标题为"paper-river: {简短标题}"
2. **顶部——溯源地图**：使用 Pattern 6 内联 SVG 画出论文引用/批判关系有向图。节点为论文简称，边标注"批判/改进了 X 问题"。节点可点击——点击后下方内容区滚动到该论文的详情
3. **中部——演化叙事**：使用 Pattern 8 垂直时间线。每篇论文一个时间线节点，包含年份、标题、核心贡献。每个节点可展开（使用 Pattern 1 可折叠区块），展开后显示：它看到了前人的什么问题 + 解法核心思路 + 留下了什么新问题
4. **底部——洞见**：问题演化趋势总结 + 下一步预测
5. **导出栏**：使用 Pattern 5 固定底部导出栏

### 文件输出

写入 `~/Downloads/paper-river-{简短标题}.html`。

### 设计约束

遵循 `references/html-patterns.md` 中的设计约束（系统字体栈、禁纯黑、行高≥1.6）。
