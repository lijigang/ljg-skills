# 模具：白板（-w）

把推理过程写成看得见的样子：概念用箭头串成链，关键词标出来，旁边配简笔图标。推进但不急，每行走一步推理，留白处喘口气。板上留住的是思考怎么一步步走出来的，结论只是最后一格。

三个字定调：

- 「余白」：空间自己就是主角。内容四周、段落之间的空，本身就是设计
- 「枯」：用色克制，靠亮度差和微温差说话。全局暖灰调，一抹微朱点睛
- 「素」：无装饰。无边框堆砌、无噪点纹理、无拟物质感。干净到只剩内容和空气

## 步骤 1：读取模板

Read `assets/whiteboard_template.html`

模板提供：

- 书写字体加载（Permanent Marker + Kalam，对应 `--marker` / `--hand`）
- CSS 变量：`--bg`（外层暖灰底 `#EBE5DA`）、`--board`（和紙奶白板面 `#F7F3EC`）、`--ink`（墨）、`--ink-light`（灰墨）、`--yellow`（焙茶高亮）、`--red`（石灰箭头）、`--shu`（朱砂）、`--blue` / `--green` / `--orange`（备用色）、`--marker-bg`
- `.board-frame` 画框：极淡暖灰线，几乎隐入背景
- SVG 箭头 marker 五色（`arrow-r` / `arrow-w` / `arrow-b` / `arrow-g` / `arrow-y`）
- `.colophon` 署名栏
- `{{CUSTOM_CSS}}` 和 `{{CONTENT_HTML}}` 插槽

## 步骤 2：理解内容，选择风格

### 2.1 提取结构

从内容中提取：

- 核心论点：一句话总结
- 推理链：论点怎么一步步推出来的？识别 A → B → C 结构
- 3-8 个关键概念：可作链条节点
- 分支点：推理在哪里分岔、汇合、转折
- 可画的概念：哪些能用简笔画快速表达

### 2.2 选择风格路线

| 风格 | 视觉特征 | 触发信号 | 主色 |
|------|---------|---------|------|
| 逻辑链（默认） | 横向推理链（→ 连接）+ 纵向层级 + 焙茶关键词 + 内嵌简笔画 | 有因果/推理/论证/阐释结构 | `--red` 箭头 + `--yellow` 高亮 |
| 脑暴墙 | 核心词居中 + 放射状分支 + 色块便签 + 关键词散落 | 发散型/多观点/创意/头脑风暴 | `--yellow` 主导 |
| 时间线 | 纵向时间轴 + 节点 + 旁注 + 对比色 | 时间/阶段/进程/回顾类 | `--green` 主导 |
| 矩阵分析 | 2x2 或多格矩阵 + 象限标签 + 要素散布 | 分类/对比/评估/决策框架 | `--blue` 主导 |

选择原则：

- 默认逻辑链——最见推演过程
- 多个并列观点 → 脑暴墙
- 有时间/阶段维度 → 时间线
- 涉及分类/象限 → 矩阵分析

### 2.3 色调：和紙奶白 + 朱砂

日式极简。奶白底如手漉和紙，墨色文字如书道落笔，朱砂红如方印点睛。用结构和字重说话，不用颜色喊。

| 变量 | 色值 | 角色 |
|------|------|------|
| `--board` | `#F7F3EC` 和紙 | 奶白底，温暖的手漉和紙 |
| `--ink` | `#2C2826` 墨 | 正文，温暖的近黑色如墨汁 |
| `--ink-light` | `#8A8478` 灰墨 | 标注、旁白 |
| `--yellow` | `#7A6B4E` 焙茶 | 高亮文字——在奶白底上沉稳可读 |
| `--red` | `#A09888` 石 | 箭头：安静的石灰色，只引路 |
| `--shu` | `#C03C28` 朱砂 | 点睛——真正的朱砂红，每张板 ≤ 3 处 |

画框：`rgba(180,170,155,0.15)` 极淡暖灰线，几乎隐入背景。

原则：

- 奶白底上靠字重和焙茶色立层级
- 墨落在和紙上，这层对比是全板的底子
- 圈标、下划线统一用 `--yellow`（焙茶）
- 箭头用 `--red`（石灰），安静引路，不抢戏
- `--shu`（朱砂）只用于：结论框边线、核心论点圈标、署名旁的印章。每张板 ≤ 3 处
- 朱砂是唯一的高饱和色，正因为少，才打眼

#### 内容驱动色温偏移

默认保持侘寂灰调。内容主题不同，底色和高亮可以微微偏冷或偏暖；不加新色相。

检测：扫内容关键词，匹配主导类型。跨类时取篇幅最大的主题。

| 类型 | 触发词 | `--board` | `--yellow` | 光暈色调 |
|------|--------|-----------|------------|---------|
| 默认（和紙） | 无匹配 | `#F7F3EC` | `#7A6B4E` | 暖朱 |
| 技术 | AI、算法、模型、代码、架构、系统、API、数据、工程、网络 | `#F3F4F7` | `#5A6878` | 冷蓝 |
| 人文 | 哲学、认知、意义、伦理、存在、美学、叙事、历史、文学、心理 | `#F7F0E5` | `#8A6A3E` | 深暖 |
| 商业 | 投资、商业、增长、市场、估值、融资、战略、竞争、利润、ROI | `#F4F5F0` | `#5A7054` | 中性绿 |

实现：匹配到非默认类型时，在 `{{CUSTOM_CSS}}` 顶部加变量覆盖 + 表面光暈覆盖。默认类型不覆盖。

技术：
```css
:root { --board: #F3F4F7; --yellow: #5A6878; }
.board > .surface { background: radial-gradient(ellipse at 25% 20%, rgba(120,140,170,0.05) 0%, transparent 50%), radial-gradient(ellipse at 75% 55%, rgba(150,165,190,0.03) 0%, transparent 45%); }
```

人文：
```css
:root { --board: #F7F0E5; --yellow: #8A6A3E; }
.board > .surface { background: radial-gradient(ellipse at 25% 20%, rgba(190,160,120,0.05) 0%, transparent 50%), radial-gradient(ellipse at 75% 55%, rgba(210,180,140,0.03) 0%, transparent 45%); }
```

商业：
```css
:root { --board: #F4F5F0; --yellow: #5A7054; }
.board > .surface { background: radial-gradient(ellipse at 25% 20%, rgba(130,160,130,0.05) 0%, transparent 50%), radial-gradient(ellipse at 75% 55%, rgba(160,185,155,0.03) 0%, transparent 45%); }
```

原则：

- 只覆盖 `--board`、`--yellow` 和表面光暈，其他变量一律不动
- 偏移要轻，轻到不并排对比看不出，但整体氛围不同
- `--ink`、`--red`、`--shu` 不随内容变化，微朱始终是全板唯一不动的颜色

### 2.4 标题设计

标题是整张板的第一眼。

必须做到：

- 标题是一句完整的判断/结论，不是一个词。原文标题只是概念名时，从内容里提炼核心论断作主标题，概念名作副标题
- 主标题中 1-2 个关键词用 `--yellow`（焙茶）标出，其余墨色
- 主标题下方用手写波浪横线收束（SVG wavy path，opacity 0.3）

标题结构：
```html
<div class="board-title">
  <div class="board-title-sub">副标题或引导语（较小，ink-light）</div>
  <h1 class="board-title-main">墨色文字<span class="y">焙茶关键词</span>墨色文字</h1>
  <svg class="title-line" width="600" height="8">
    <path d="M0,4 Q150,0 300,4 T600,4" stroke="var(--yellow)" fill="none" stroke-width="2" opacity="0.3"/>
  </svg>
</div>
```

标题 CSS 参考：
```css
.board-title { text-align: center; padding: 56px 48px 16px; }
.board-title-sub { font: 500 34px/1.4 var(--hand); color: var(--ink-light); margin-bottom: 4px; }
.board-title-main { font: 700 64px/1.2 var(--marker); color: var(--ink); margin-bottom: 8px; }
.board-title-main .y { color: var(--yellow); }
.title-line { display: block; margin: 0 auto; }
```

## 步骤 3：设计画面

### 3.1 板面元素工具箱

所有视觉元素用 CSS + SVG 实现，不用外部图片。

#### 文字层级

| 层级 | 字体 | 字号 | 颜色 | 用途 |
|------|------|------|------|------|
| 主标题 | `--marker` | 64-80px | `--ink` 墨 | 板面顶部大标题，关键词嵌焙茶 |
| 链条文字 | `--hand` 700 | 34-40px | `--ink` 墨 | 逻辑链中的概念和说明 |
| 关键词 | `--hand` 700 | 34-42px | `--yellow` | 链条中要强调的概念 |
| 标注 | `--hand` 400 | 24-28px | `--ink-light` | 旁注、补充、小字 |
| 大号数字 | `--marker` | 72-120px | `--yellow` 或 `--red` | 数据亮点 |

中文处理：Permanent Marker 和 Kalam 对中文无效，回退到 PingFang SC。中文靠颜色（焙茶/朱砂）和装饰（下划线、圈标）维持手写感。

#### 手写标记效果（CSS）

```css
/* 链条箭头 — 逻辑推进的视觉线索 */
.chain-arrow {
  color: var(--red);
  font: 700 34px var(--hand);
  margin: 0 6px;
  display: inline;
}

/* 焙茶高亮 */
.chalk-yellow {
  color: var(--yellow);
  font-weight: 700;
}

/* 手写圈标 */
.chalk-circled {
  border: 2.5px solid var(--yellow);
  border-radius: 45% 55% 50% 48%;
  padding: 2px 14px;
  display: inline-block;
}

/* 下划线 */
.chalk-underline {
  border-bottom: 3px solid var(--red);
  padding-bottom: 2px;
}

/* 方框（重要结论） */
.chalk-box {
  border: 2.5px solid var(--ink);
  border-radius: 3px;
  padding: 14px 18px;
}

.chalk-box-red { border-color: var(--red); }
.chalk-box-yellow { border-color: var(--yellow); }
.chalk-box-shu { border-color: var(--shu); }

/* 虚线框 */
.chalk-dashed {
  border: 2px dashed var(--ink-light);
  border-radius: 3px;
  padding: 14px 18px;
}

/* 编号标记 */
.chalk-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px; height: 36px;
  border-radius: 50%;
  border: 2.5px solid var(--red);
  color: var(--red);
  font: 700 22px var(--hand);
  margin-right: 8px;
}

/* 问号/感叹号标记 */
.chalk-question {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px; height: 44px;
  border: 2.5px solid var(--yellow);
  border-radius: 50%;
  color: var(--yellow);
  font: 700 28px var(--hand);
}

/* 微朱点睛 — 极少量使用，每张板 ≤ 3 处 */
.shu-circle {
  border: 2.5px solid var(--shu);
  border-radius: 45% 55% 50% 48%;
  padding: 2px 14px;
  display: inline-block;
}

/* 朱印 — 结论旁的方印，侘寂点睛 */
.shu-stamp {
  display: inline-block;
  border: 2px solid var(--shu);
  padding: 4px 10px;
  font: 700 18px var(--hand);
  color: var(--shu);
  transform: rotate(-3deg);
  opacity: 0.7;
}
```

#### 简笔画（SVG inline）

用简单 SVG path 画概念图标。stroke 用 `var(--ink)` 或 `var(--yellow)`，stroke-width: 2-3px，只用 stroke 不用 fill（手写线条风格）。每个图标 3-5 个 path。

常用：人（圆头+线身+四肢）、问号、趋势图（折线）、房子（三角+方）、动物（极简轮廓）、灯泡、闪电。

手写质感：线条不要完美平直，path 可以有微小抖动。

### 3.2 布局原则

板面是链式的：主体是横向逻辑链，纵向分层递进。

核心规则：

- 链式流动：每行一条推理链，概念用 → 连接，从左到右
- 纵向层级：每层是推理的下一步，上下层用缩进或间距关联
- 内嵌图标：简笔画和文字混排同一行，不单独占区
- 焙茶高亮：重要概念用 `--yellow`，在墨色文字里一眼可见
- 箭头统一 `--red`（石灰），是逻辑推进的视觉节拍
- 疏密有致：核心推理链紧凑（行间距 1.8 倍），话题转换处留出呼吸（間）
- 留白即内容：不求写满。关键转折前后留大间距，让读者的思维有落脚处
- 自然不对齐：链条不需要严格左对齐，像真手写时的自然缩进

#### 间距层级（区域分隔）

用间距说话，不用线说话。板面上不画分隔线，只有写得紧和写得松。

| 层级 | 间距 | 用途 | CSS |
|------|------|------|-----|
| 零距 | 0-4px | 同一条链的续行 | `.cl + .cl { margin-top: 2px; }` |
| 小距 | 14-20px | 同一话题内的不同链 | `margin-top: 16px` |
| 中距 | 32-44px | 不同话题之间（間） | `margin-top: 36px` |
| 大距 | 52-72px | 大转折/新章节（大間） | `margin-top: 60px`，可加手写波浪线 |

禁止：

- `border-top` 直线分隔——板面上不画直线分区
- ↓ 箭头泛滥——只在明确的"因此/所以"递进时用，每张板 ≤ 3 个
- 等间距排布——间距不等才像手写

手写波浪线（只用于大距分隔，可选）：
```html
<svg width="800" height="8" style="display:block;margin:0 auto;opacity:0.15;">
  <path d="M0,4 Q100,0 200,4 T400,4 T600,4 T800,4" stroke="var(--ink)" fill="none" stroke-width="1.5"/>
</svg>
```

### 3.3 画面构成（按风格）

#### 逻辑链（默认）
```
[大标题 — 墨色, 居中, 关键词嵌焙茶]

→ 概念A → 观察X → 排除Y → 推出Z → 结论1
                                                  ↓
→ 展开结论1 → [简笔画] → 补充说明 → 推出概念B
                                                  ↓
    概念B → 举例... → 但有一个问题 → [?]
                                                  ↓
→ 解答... → 因此 → [最终结论 — 朱砂框]
```
- 每行一条推理链，行与行之间用 ↓ 连接
- 行首带 → 的是主干推理，不带的是补充
- 链条自然流动，像在板上从左往右写
- 适当穿插简笔画，破掉纯文字的单调

#### 脑暴墙
```
       [色块1]   [色块2]
            \     /
     [色块3] → [核心词] ← [色块4]
            /     \
       [色块5]   [色块6]

  底部：关键结论，下划线
```

#### 时间线
```
  [标题]

  ●──────●──────●──────●──────●
  阶段1   阶段2   阶段3   阶段4   阶段5
  │       │       │       │       │
  注释    注释    注释    注释    注释
```

#### 矩阵分析
```
  [标题]
            │ 维度A高
    ────────┼────────
    象限1   │ 象限2
            │
    ────────┼────────
    象限3   │ 象限4
            │ 维度A低
   维度B低       维度B高
```

## 步骤 4：写 CSS + HTML

所有 CSS 写入 `{{CUSTOM_CSS}}`，所有 HTML 写入 `{{CONTENT_HTML}}`。

CSS 从零写，class 名反映内容语义（`.premise-chain`、`.conclusion-box`），不用通用名。

色调变量：默认侘寂色调直接用模板值。内容匹配技术/人文/商业类型时（见「内容驱动色温偏移」），在 CUSTOM_CSS 顶部覆盖 `--board`、`--yellow` 和 `.board > .surface`。

逻辑链布局技巧：

- 每条链用 `display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 6px;` 实现自然换行
- 箭头用 `<span class="chain-arrow">→</span>` 内嵌文字流
- 焙茶关键词用 `<span class="chalk-yellow">关键词</span>`
- 简笔画 SVG 用 `display: inline-block; vertical-align: middle;` 嵌入行内
- 行间距不等——同一论点的行紧凑（`margin-top: 12px`），新话题换大间距（`margin-top: 28px`）
- 带 → 开头的行可加 `padding-left` 缩进，形成层次

替换变量：

| 变量 | 内容 |
|------|------|
| `{{CUSTOM_CSS}}` | 全部自定义 CSS |
| `{{CONTENT_HTML}}` | 全部内容 HTML |
| `{{SOURCE_LINE}}` | 内容来源（可选）：`<span class="info-source">来源文字</span>`，无来源时空字符串 |

写入：`/tmp/ljg_cast_whiteboard_{name}.html`

## 步骤 5：自检

- [ ] 和紙底 + 墨色文字，看着舒适不刺眼？
- [ ] 内容匹配技术/人文/商业类型时，色温偏移（--board、--yellow、光暈）应用了？
- [ ] 灰调为主，微朱（--shu）≤ 3 处？
- [ ] 标题是完整判断句？高亮词用焙茶（--yellow）？
- [ ] 标题够大够粗（≥ 64px）？
- [ ] 余白充足——四周留白 ≥ 72px，段间留白有呼吸感？
- [ ] 链条文字 ≥ 34px？标注 ≥ 24px？
- [ ] 区域分隔用间距层级，无 border-top 直线？
- [ ] 至少 2 个简笔图标（SVG），线条用 ink 色？
- [ ] 无拟物装饰（无噪点纹理、无厚重画框、无质感滤镜）？
- [ ] 整体干净、安静、暖？

## 步骤 6：截图

```bash
node assets/capture.js /tmp/ljg_cast_whiteboard_{name}.html ~/Downloads/{name}.png 1080 800 fullpage
```
