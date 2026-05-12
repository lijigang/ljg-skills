---
name: ljg-roundtable
description: >-
  Structured roundtable discussion framework with a truth-seeking moderator
  who invites representative figures for dialectical debate on any topic.
  Use when user says "圆桌讨论", "圆桌", "roundtable", "辩论",
  or wants to explore a topic through multi-perspective structured debate.
---

## Usage

<example>
User: 圆桌讨论 人工智能是否拥有真正的创造力？
Assistant: [Launches roundtable with moderator and representative figures]
</example>

<example>
User: 圆桌 自由意志是否存在？
Assistant: [Launches roundtable discussion on free will]
</example>

## Instructions

为了执行本项技能，请严格按照以下步骤操作：

1. **读取参考资料**
   读取 `references/original-prompt.org` 了解原始框架设计意图。

2. **解析议题**
   从用户输入中提取核心议题。如果用户只说"圆桌讨论"未给议题，询问议题。

3. **选人：提议代表人物**
   根据议题，选择 3-5 位**真实历史/当代人物**作为代表，覆盖尽可能多的立场维度。每位人物需要：
   - 姓名（真实人物，非虚构）
   - MBTI 人格类型
   - 核心立场（一句话）
   - 选择理由（为什么此人对此议题有独特视角）

   选人原则：
   - 立场必须形成**张力网络**（非简单正反方）
   - 优先选择在该领域有**经典著作或知名言论**的人物
   - 至少包含一位"意外视角"——来自议题本身领域之外的人

4. **开场：统一定义**
   以主持人身份开场，展示参会人物列表，然后提出**定义性问题**：
   > 「在深入探讨之前，我们应当如何定义 [议题核心概念]？它的核心要素是什么？」

   每位参会者依次发言，格式为：
   ```
   【人物名】【行动标签】：发言内容

   **简言之**：一句话总结
   ```

   行动标签包括：`陈述`、`质疑`、`补充`、`反驳`、`修正`、`综合`

5. **对话循环**
   每轮执行以下流程：

   **5a. 动态发言轮**
   - 不是每人固定说一次——根据讨论动态决定谁该发言
   - 每人发言必须是对**前面发言的回应**（质疑/补充/反驳），不许自说自话
   - 每段发言末尾必须有 `**简言之**：` 一句话压缩

   **5b. 主持人综述**
   发言结束后，主持人做三件事：
   - 提炼本轮**核心争议点**（不是面面俱到，而是找到最深的裂缝）
   - 生成**ASCII 思考框架图**（拓扑图/矩阵/光谱/树形——选最贴合本轮结构的形式）
   - 提出**下一层引导问题**（从核心争议中生长出来的更深问题）

   ASCII 图的设计原则：
   - 高度概括本轮讨论的**结构**，不是复述内容
   - 标出正/负反馈环、因果链、张力维度
   - 形式不固定：可以是 2x2 矩阵、光谱轴、因果环路、层级树——哪种最见骨用哪种

   **5c. 用户指令**
   综述后展示指令菜单：
   ```
   【主持】：(指令: 可 / 止 / 深入此节 / 引入新人物)
   ```

   指令含义：
   - `可`：接受下一层问题，继续推进
   - `止`：结束讨论，进入总结
   - `深入此节`：不推进新问题，继续围绕当前争议点深挖
   - `引入新人物`：用户指定一位新人物加入（主持人介绍并请其就当前话题表态）

6. **结束：生成知识网络**
   用户发出 `止` 指令后：
   - 主持人做**全局总结**
   - 生成**完整知识网络** ASCII 图：标出所有关键概念、立场、争议点及其关系
   - 列出**未解决的开放问题**（讨论中暴露但未穷尽的方向）

7. **写入 HTML 文件**
   生成自包含单 HTML 文件，浏览器直接打开。结构见下方"HTML 输出"章节。
   写入 `~/Downloads/roundtable-{议题关键词}.html`，向用户报告路径。

### 主持人行为准则

- **理性之锚**：冷静客观，不偏向任何一方
- **挖深不铺广**：每轮只追一条最深的裂缝，不面面俱到
- **求真 > 和谐**：鼓励尖锐但有建设性的交锋，拒绝表面共识
- **元认知**：在综述中暴露讨论的**结构**（假设、前提、推理链），不只复述内容

### 参会者行为准则

- 必须**忠于其真实思想体系**发言，不是泛泛而谈
- 引用/化用其**经典著作或知名观点**
- 发言有锋芒：质疑要见骨，补充要推进，不说正确的废话
- 每段结尾 `**简言之**` 一句话压到极致

## HTML 输出

### 内嵌 CSS/JS 模式

以下代码直接嵌入生成的 HTML 文件的 `<style>` 和 `<script>` 中。

**多栏并排视图**：

```css
.columns { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin: 16px 0; }
.column {
  padding: 16px; background: #fafaf8; border-top: 3px solid #2d2d2d; border-radius: 4px;
}
.column .speaker { font-weight: 600; margin-bottom: 4px; }
.column .stance { font-size: 12px; color: #999; margin-bottom: 12px; }
.column .mbti { font-size: 11px; color: #bbb; }
```

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

**发言标签**：

```css
.action-tag {
  display: inline-block; padding: 2px 8px; border-radius: 3px;
  font-size: 11px; font-weight: 600; margin-right: 8px;
  background: #eee; color: #666;
}
.action-tag.反驳 { background: #fde8e8; color: #c53030; }
.action-tag.质疑 { background: #fef3c7; color: #b7791f; }
.action-tag.综合 { background: #e6f0fa; color: #2b6cb0; }
.action-tag.补充 { background: #e8f5e9; color: #2e7d32; }
```

**ASCII 图容器**：

```css
pre.ascii { font-size: 11px; line-height: 1.3; color: #555; background: #fafaf8; padding: 16px; border-radius: 4px; overflow-x: auto; }
```

**内联 SVG**：

```css
.flow-svg { width: 100%; max-width: 800px; overflow-x: auto; margin: 16px 0; }
.flow-svg svg { width: 100%; }
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

1. **基础外壳**：使用 `references/html-patterns.md` 中的基础 HTML 外壳，标题为"圆桌：{议题}"
2. **顶部——参会者卡片**：使用 Pattern 9 多栏并排视图，每位参会者一栏。卡片内容：姓名、MBTI、核心立场、选择理由
3. **中部——讨论记录**：每轮讨论一个 `<details class="collapsible">` 块（Pattern 1），summary 显示"第 N 轮：{引导问题}"。展开后使用多栏布局并排显示各发言人的发言。每位发言人的发言带行动标签（陈述/质疑/补充/反驳等）和"简言之"总结
4. **主持人综述区**：每轮结束后，主持人综述（核心争议点 + ASCII 框架图 + 下一层问题）放在该轮折叠块底部。ASCII 图用 `<pre>` 标签保留格式。另外如果适合，用 Pattern 6 内联 SVG 画一个交互版框架图
5. **底部——知识网络**：全局 ASCII 知识网络图 + 内联 SVG 交互版。开放问题列表
6. **导出栏**：使用 Pattern 5。在讨论进行中，按钮为"导出当前讨论为 Org-mode"

### 文件输出

写入 `~/Downloads/roundtable-{议题关键词}.html`。

### 设计约束

遵循 `references/html-patterns.md` 中的设计约束（系统字体栈、禁纯黑、行高≥1.6）。
