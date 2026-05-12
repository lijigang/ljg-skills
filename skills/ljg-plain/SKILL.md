---
name: ljg-plain
description: "Cognitive atom: Plain (白). Rewrites any content so a smart 12-year-old groks it. Structure-free — form follows content. Use when user says '白话说', '说人话', '解释一下', 'plain', 'grok'."
user_invocable: true
version: "5.0.0"
---

# ljg-plain: 白

让人 grok。

不规定怎么写。规定不能怎么写。下限锁死，上限放开。不同主题有不同的最佳写法——类比、故事、问答、递进的例子、一个长场景——由内容决定形式。

## 格式约束

### Org-mode 语法

- 加粗用 `*bold*`（单星号），禁止 `**bold**`
- 标题层级从 `*` 开始，不跳级

### ASCII Art

所有图表用纯 ASCII 字符。允许：`+ - | / \ > < v ^ * = ~ . : # [ ] ( ) _ , ; ! ' "` 和空格。禁止 Unicode 绘图符号。

### 文件输出

写入 `~/Downloads/plain-{简短标题}.html`。

## 红线（每条必须过，顺序即优先级）

1. *口语检验* — 最高法则。读出声来，你会这样跟一个聪明的朋友说话吗？不会→改到会。连词不是敌人——"但是""所以"是思维转弯的声音，只砍机械连词（"此外""值得注意的是"）
2. *零术语* — 聪明的 12 岁孩子能复述。专业词必须出现时，先用大白话把意思落地，再顺带提术语名
3. *短词优先* — 能用两个字说的不用四个字。「进行分析」→「看」。大词不让你显得聪明，只让人读得累
4. *一句一事* — 每句只推进一步。长句拆短
5. *具体* — 名词看得见，动词有力气。「有人觉得情况不太好」→「张三说项目要黄了」。形容词能砍就砍
6. *开头给理由* — 第一句话让人想读下一句。不铺垫、不背景、不「自古以来」
7. *不填充* — 删开场白、拐杖词、夸大象征。每句都在干活
8. *信任读者* — 跳过软化、辩解、手把手引导。说一遍够了
9. *诚实* — 想不清楚就说想不清楚。"大概 70%" 比"可能"诚实

## 工具箱（选用，不必全用）

写的时候可以从这里拿工具，没有哪个是必须的：

- *类比* — 找结构对得上的日常经验。好类比承重（去掉它文章塌），多层（挖一层还像），自明（不需要解释类比本身）。动词延伸到新对象时检查中文动宾搭配是否自然
- *好问题* — 找读者的卡点，变成问题。读者被卡住，才想往下读
- *裂缝* — 模型/类比在哪里不够？那个点往往最值钱。不宣布它，让读者自己感到
- *画面* — 闭眼能看到的场景。硬造的画面比没有更糟
- *故事* — 一个具体的人遇到一个具体的问题。读者跟着走
- *反问入链* — 遇到隐含前提，用问题打开，然后回答它
- *骨架图* — 概念涉及空间关系时，嵌入 ASCII 图（`#+begin_example` 块）

## 执行

### 1. 获取内容

URL → WebFetch | 文本 → 直接用 | 文件路径 → Read | 概念 → 直接解释 | 书名/论文名 → WebSearch

### 2. 写

形式自由。从工具箱里选最适合这个主题的方式，也可以不选——如果有更好的写法，用它。

输出是一篇从第一行流到最后一行的连贯文章。全文只有文件标题，正文无子标题。

禁止：
- 结构标签（`* 类比` / `* 裂缝` 等）
- 指向写作过程的元评论（「打个比方」「接下来我们讨论」）

### 3. 过红线

逐条扫红线清单。额外检查：

- 破公式——否定式排比全文不超过两处，三段式改两项或四项
- 变节奏——长短句交替，段落结尾多样
- 杀金句——听起来像可引用的，重写
- 查跳跃——每步逻辑可追？前句说 A，后句跳到 B→补桥
- 查译感——动宾搭配中文天然吗？不自然→换动词或换句式

扫完列修改清单（哪句触发什么，改前→改后）。清单不写入文件。

### 4. 生成 HTML 文件

生成自包含单 HTML 文件。结构见下方"HTML 输出"章节。

写入 `~/Downloads/plain-{简短标题}.html`。

## 验收

- *Grok*：读完能用自己的话复述核心
- *零术语*：12 岁孩子能跟上
- *记得住*：读完脑子里留下了什么——一个画面、一个问题、一个转折，什么都行
- *想读完*：从头到尾没有想跳过的段落

## HTML 输出

默认生成自包含单 HTML 文件。浏览器直接打开。

### 内嵌 CSS/JS 模式

以下代码直接嵌入生成的 HTML 文件的 `<style>` 和 `<script>` 中。

**左右对照栏**：

```css
.split-view { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 16px 0; }
.split-view .panel { padding: 16px; background: #fafaf8; border-radius: 4px; }
.split-view .panel h4 { margin-top: 0; color: #999; font-size: 12px; letter-spacing: 1px; }
@media (max-width: 768px) { .split-view { grid-template-columns: 1fr; } }
```

**标签页**：

```css
.tabs { display: flex; gap: 0; border-bottom: 2px solid #e0e0e0; margin-bottom: 20px; }
.tab-btn {
  padding: 8px 20px; border: none; background: none; cursor: pointer;
  font-size: 14px; color: #999; border-bottom: 2px solid transparent;
  margin-bottom: -2px;
}
.tab-btn.active { color: #2d2d2d; border-bottom-color: #2d2d2d; }
.tab-panel { display: none; }
.tab-panel.active { display: block; }
```

标签页切换 JS：

```javascript
function switchTab(i) {
  document.querySelectorAll('.tab-btn,.tab-panel').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn')[i].classList.add('active');
  document.querySelectorAll('.tab-panel')[i].classList.add('active');
}
```

**Margin Notes（旁注）**：

```css
.margin-note {
  float: right; width: 180px; margin-right: -200px; font-size: 13px;
  color: #888; padding: 8px; background: #f9f9f7; border-left: 2px solid #ddd;
}
@media (max-width: 900px) { .margin-note { float: none; width: auto; margin-right: 0; margin-bottom: 12px; } }
```

**改写策略标注**：

```css
.strategy-tag {
  display: inline-block; padding: 1px 6px; border-radius: 2px;
  font-size: 10px; background: #eee; color: #999; margin-left: 6px;
}
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
  let text = '';
  if (mode === 'plain') {
    text = document.querySelectorAll('#export-content .panel:last-child p').innerText || '';
    [...document.querySelectorAll('#export-content .panel:last-child p')].forEach(p => text += p.innerText + '\n\n');
  } else {
    text = document.getElementById('export-content').innerText;
  }
  navigator.clipboard.writeText(text).then(() => {
    const toast = document.getElementById('toast');
    toast.style.opacity = '1';
    setTimeout(() => toast.style.opacity = '0', 2000);
  });
}
```

**设计约束**：系统字体栈 `-apple-system, "Noto Serif SC", "PingFang SC", "Microsoft YaHei", sans-serif`；正文色 `#2d2d2d`；行高 ≥ 1.6；单 HTML 文件，零外部依赖。

### HTML 结构

1. **基础外壳**：使用 `references/html-patterns.md` 中的基础 HTML 外壳，标题为"白话: {简短标题}"
2. **模式切换标签**：顶部使用 Pattern 2 标签页，三个 tab：
   - "对照"——默认，左右对照栏（Pattern 3），左侧原文，右侧白话。逐段对齐
   - "白话"——仅显示白话版本，干净阅读
   - "原文"——仅显示原文，供参考
3. **原文/白话对照**：使用 Pattern 3 左右对照栏。每个段落一对 `<div class="split-view">`，原文和白话精确对齐。白话版本中替换掉的术语用 `<span class="margin-note">`（Pattern 4）标注原术语
4. **层级标注**：在白话文本中，用 subtle 的颜色标注改写策略（类比/故事/问答/场景/裂缝），类似于 ljg-card 的 taste 标注
5. **导出栏**：使用 Pattern 5，提供"复制白话版为 Org-mode"、"复制对照版为 Markdown"

### 文件输出

写入 `~/Downloads/plain-{简短标题}.html`。

### 设计约束

遵循 `references/html-patterns.md` 中的设计约束（系统字体栈、禁纯黑、行高≥1.6）。
