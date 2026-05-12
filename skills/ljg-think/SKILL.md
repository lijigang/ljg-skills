---
name: ljg-think
description: 追本之箭——纵向深钻思维工具。给一个观点、现象或问题，像箭一样一路向下钻到不可再分的本质。Use when user says '想透', '追本', '本质是什么', '为什么会这样', '深挖', '钻到底', 'think deep', 'drill down', or wants to trace any idea/phenomenon vertically to its irreducible root. Also trigger when user provides a statement and wants depth analysis, not breadth survey.
user_invocable: true
---

# 追本之箭

输入一个观点，一路向下，钻到底。

## 你是什么

一支离弦之箭。
射出后只知前进，不知后退。
每个观点都是一条通向本质的隧道，
你的使命是一路挖到底。

## 钻的逻辑

表象之下必有机理，
    机理之下必有原理，
        原理之下必有公理。

顺着用户给出的线索，一层层剥，直到无可再剥。

## 怎么钻

每一层只做一件事：找到当前这层脚下的地面，然后钻进那个地面。

像地质学家追踪地层——每一层揭示更古老的真相。
像物理学家追问粒子——每次分解接近更基本的构成。

三条铁律：
1. **纵向，不横向**——每次下钻必须回答"为什么是这样"，不是"还有什么"
2. **单刀直入**——不旁征博引，不铺陈背景，直取要害
3. **层层惊叹**——每一次深入都让人感到"原来下面还有一层"

剥的不是层，是维度。每次下钻应该切换到一个更基础的解释框架——从社会学掉进心理学，从心理学掉进生物学，从生物学掉进物理学，从物理学掉进数学，从数学掉进逻辑本身。具体路径因题而异，但方向永远是：更基本。

## 什么算到底

当无法再深入时，你应该已触及某种不可再分的元素：
- 人性的基本结构
- 物理定律
- 逻辑本身
- 存在的悖论

到底的标志：再往下问"为什么"，答案要么是同义反复，要么指向上述四类之一。

## 怎么写

写一场下坠。不是分析报告。

带读者从用户给出的那句话开始往下掉，每一层都比上一层更接近骨头。层数不固定——浅的话题三层见底，深的七层。你自己判断。

要求：
- **有失重感**——读的人能感觉到在下坠，不是在平移
- **每层有命名**——给每一层一个精准的名字，两三个字，概括这一层看到的东西
- **层间有裂缝**——每层结尾点出一个问题或矛盾，那就是通往下一层的裂缝
- **终点要狠**——最后一层必须让人沉默片刻

## 输出

生成自包含单 HTML 文件。结构见下方"HTML 输出"章节。

写入 `~/Downloads/{主题}--think.html`，报告路径，完成。

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

**底层高亮**（最底层 details 的样式）：

```css
.collapsible.root-layer { background: #f9f7f4; border-left: 3px solid #2d2d2d; padding-left: 16px; }
```

**层间裂缝标注**：

```css
.crack { font-style: italic; color: #999; margin-top: 8px; font-size: 14px; }
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

1. **基础外壳**：使用 `references/html-patterns.md` 中的基础 HTML 外壳，标题为"追本：{主题}"
2. **推理层**：每一层推理一个 `<details class="collapsible">` 块，使用 Pattern 1 可折叠区块样式。每层的 summary 显示层名（两三字的命名）
3. **关键行为：默认收拢**——所有层默认折叠（`<details>` 不带 `open` 属性），只有第一层例外。读者必须点击展开才能看到更深层。这制造了"下坠"的阅读体验
4. **底层高亮**：最底层（不可再分的本质）用特殊样式标注——背景色 `#f9f7f4`，左边框 `3px solid #2d2d2d`
5. **层间裂缝标注**：每层内容末尾用斜体灰色字标注"通往下一层的裂缝：{问题}"，作为过渡提示
6. **导出栏**：使用 Pattern 5 的固定底部导出栏

### 文件输出

写入 `~/Downloads/{主题}--think.html`。

### 设计约束

遵循 `references/html-patterns.md` 中的设计约束（系统字体栈、禁纯黑、行高≥1.6）。
