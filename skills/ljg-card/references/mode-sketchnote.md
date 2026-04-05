# 模具：视觉笔记（-v）

## 核心信条

**像人手画出来的，不是排版出来的。**

Sketchnote 的灵魂是"一边想一边画"的痕迹感。不是整齐的排版加了手写字体——是概念之间用箭头连起来、关键词被圈出来、旁边有小简笔画的那种东西。

## 步骤 1：读取模板

Read `~/.openclaw/workspace/skills/skills/ljg-card/assets/sketchnote_template.html`

模板提供：
- 手写字体加载（Caveat + Architects Daughter + Patrick Hand）
- CSS 变量（`--bg`, `--ink`, `--accent`, `--marker`, `--block`, `--hand`, `--hand-alt`）
- 点阵笔记本底纹
- SVG 噪点纹理（纸张质感）
- SVG 箭头 marker 定义
- `.colophon` 署名栏
- `{{CUSTOM_CSS}}` 和 `{{CONTENT_HTML}}` 插槽

## 步骤 2：理解内容，选择风格

### 2.1 提取关键概念

从内容中提取：
- **核心命题**：一句话说清这段内容在讲什么
- **3-7 个关键概念**：可以画成"节点"的东西
- **概念关系**：哪些概念之间有因果/对比/递进/包含关系
- **一个视觉锚点**：最适合用简笔画表达的那个概念

### 2.2 选择风格路线

根据内容类型匹配风格。不是模仿某个人，是借用他们的视觉语言。

| 风格 | 视觉特征 | 触发信号 | 色调 |
|------|---------|---------|------|
| **火柴人叙事** (Tim Urban 路线) | 大号手写标题 + 火柴人 SVG + 大色块分区 + 幽默标注 | 抽象概念需要拟人化、有故事线、有情绪转折 | `--bg: #FFFEF9` `--accent: #E85D3A` `--marker: #FFE066` |
| **概念地图** (Mike Rohde 路线) | 混合字号手写 + 图标化概念 + 箭头/连线网络 + 编号 | 多概念并行、有结构关系、知识整理型 | `--bg: #FAFAF5` `--accent: #2D6A4F` `--marker: #D4EDDA` |
| **餐巾纸草图** (Dan Roam 路线) | 极简线条 + 大量留白 + 一个核心图解 + 最少文字 | 一个核心洞见、商业/策略类、可以用一张图说清 | `--bg: #FFFFFF` `--accent: #3D5A80` `--marker: #DBEAFE` |
| **概念拼贴** (Christoph Niemann 路线) | 一个主视觉占半幅 + 文字围绕 + 意想不到的视觉隐喻 | 有强烈视觉隐喻可能、艺术/设计/创意类 | `--bg: #F8F6F2` `--accent: #8B4513` `--marker: #FDE8D0` |

**选择原则**：
- 默认用「概念地图」——最通用的 sketchnote 风格
- 内容有明确故事线/角色 → 火柴人叙事
- 内容可以浓缩成一张图 → 餐巾纸草图
- 内容有强视觉隐喻 → 概念拼贴

## 步骤 3：设计画面

### 3.1 手绘元素工具箱

**所有视觉元素用 CSS + SVG 实现，不用外部图片。**

#### 手写文字层级

| 层级 | 字体 | 字号 | 用途 |
|------|------|------|------|
| 大标题 | `--hand` (Caveat) 700 | 72-96px | 页面主标题，可以微微旋转 (transform: rotate(-1deg ~ 2deg)) |
| 概念标签 | `--hand` (Caveat) 600 | 44-56px | 关键概念词，被圈/框/高亮 |
| 正文注释 | `--hand` (Caveat) 400 | 32-40px | 解释性文字 |
| 小标注 | `--hand-alt` (Architects Daughter) | 24-28px | 旁注、补充、数据 |

**中文回退**：手写字体对中文无效时自动回退到 PingFang SC。中文标题可用 Caveat 数字/英文 + PingFang SC 中文混排。纯中文标题用 PingFang SC 但加上手绘装饰（下划线波浪、圈、箭头）来保持手绘感。

#### 连接元素（CSS 实现）

```css
/* 手绘风格下划线 */
.underline-hand {
  text-decoration: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='8'%3E%3Cpath d='M0,5 Q50,0 100,5 T200,5' stroke='%23E85D3A' fill='none' stroke-width='2'/%3E%3C/svg%3E");
  background-repeat: repeat-x;
  background-position: bottom;
  background-size: 200px 8px;
  padding-bottom: 6px;
}

/* 手绘圆圈（强调某个词） */
.circled {
  border: 2.5px solid var(--accent);
  border-radius: 50% 45% 55% 48%;
  padding: 4px 14px;
  display: inline-block;
  transform: rotate(-1deg);
}

/* 荧光笔标记 */
.marked {
  background: linear-gradient(transparent 55%, var(--marker) 55%, var(--marker) 90%, transparent 90%);
  padding: 0 4px;
}

/* 手绘箭头（用 SVG inline） */
/* <svg width="120" height="40"><path d="M5,20 Q60,5 115,20" stroke="#2B2B2B" fill="none" stroke-width="2" marker-end="url(#arrowhead)"/></svg> */

/* 色块便签 */
.sticky {
  background: var(--marker);
  padding: 18px 22px;
  transform: rotate(-1.5deg);
  box-shadow: 2px 3px 6px rgba(0,0,0,0.08);
  font: 500 36px/1.5 var(--hand);
}

/* 虚线连接框 */
.dashed-box {
  border: 2px dashed var(--ink-light);
  border-radius: 8px;
  padding: 20px 24px;
}

/* 编号圆点 */
.num-circle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px; height: 40px;
  border-radius: 50%;
  background: var(--accent);
  color: white;
  font: 700 22px var(--hand);
}
```

#### 简笔图标（SVG inline）

用简单的 SVG path 画概念图标。每个图标控制在 3-5 个 path 以内，线宽 2-3px，只用 stroke 不用 fill（线条画风格）。

常用图标参考：
- 灯泡（洞见）：圆 + 底座 + 三条放射线
- 箭头（流程）：弯曲 path + arrowhead marker
- 人（角色）：圆头 + 线身体 + 两条腿
- 大脑（思考）：半圆 + 波浪线
- 书本（知识）：两个长方形微张开
- 齿轮（机制）：圆 + 齿纹
- 放大镜（分析）：圆 + 斜线把手
- 闪电（突变/能量）：Z 字形

**不需要画得精细。线条微微抖动更好——用 CSS filter 或微小的 path 不规则来实现。**

### 3.2 布局原则

**Sketchnote 不是网格排版。** 它是概念在一张纸上"生长"出来的样子。

- **概念节点**散布在画面上，位置由关系决定，不由网格决定
- **箭头/连线**连接有关系的节点
- **大小**代表重要性：核心概念大，衍生概念小
- **留白**是呼吸，不是浪费——但不是均匀留白，是"有些地方密、有些地方空"
- **微旋转**：标题、便签、图标都可以有 -3deg 到 3deg 的旋转，制造"手放上去的"感觉

### 3.3 画面构成（按风格）

#### 火柴人叙事
```
标题（大号手写，顶部偏左，微旋转）
|
v
[场景1: 火柴人SVG + 对话泡泡] --箭头--> [场景2] --箭头--> [场景3]
                                                              |
                                                              v
                                                        [结论色块]
旁边散落小标注和关键词圈
```

#### 概念地图
```
         [核心概念]  <-- 大号、被圈出
        /    |     \
      /      |      \
 [概念A]  [概念B]  [概念C]  <-- 中号、色块背景
    |        |        |
 注释...   注释...   注释...  <-- 小号手写
    \        |       /
     \       |      /
      --> [总结] <--  <-- 底部便签色块
```

#### 餐巾纸草图
```
  [一个大图解占据 60% 画面]

  旁边 3-5 行手写注释

  底部一句话总结
```

#### 概念拼贴
```
  [主视觉隐喻 SVG，占据上半幅]

  ---- 分隔 ----

  文字区：2-3 个关键点
  每个点有小图标 + 手写说明
```

## 步骤 4：写 CSS + HTML

所有 CSS 写入 `{{CUSTOM_CSS}}`。所有 HTML 写入 `{{CONTENT_HTML}}`。

**CSS 从零写**——class 名反映内容（`.phase-warmup`、`.core-insight`），不是通用名。

**手绘感 CSS 技巧清单**：
- `transform: rotate(Xdeg)` 微旋转，X 在 -3 到 3 之间随机
- `border-radius: 50% 45% 55% 48%` 不规则圆角
- `font-family: var(--hand)` 手写字体
- 波浪下划线用 SVG background-image
- 箭头用 inline SVG + marker-end
- 色块用 `var(--marker)` 半透明叠加
- 线条用 `border: 2px solid var(--ink)` 而非 1px，模拟笔触

替换变量：

| 变量 | 内容 |
|------|------|
| `{{CUSTOM_CSS}}` | 这张图的全部 CSS（包括覆盖 :root 变量） |
| `{{CONTENT_HTML}}` | 这张图的全部 HTML |
| `{{SOURCE_LINE}}` | 内容来源（可选）：`<span class="info-source">来源文字</span>`，无来源时空字符串 |

写入：`/tmp/ljg_cast_sketchnote_{name}.html`

## 步骤 5：自检

- [ ] 一眼看上去像手绘的吗？如果看着像"普通排版 + 手写字体"，重做
- [ ] 有没有箭头/连线连接概念？Sketchnote 没有连线就不是 sketchnote
- [ ] 有没有至少 2 个手绘元素（圈、箭头、简笔画、便签、荧光笔标记）？
- [ ] 标题和概念标签有微旋转吗？
- [ ] 点阵底纹可见吗？（笔记本感）
- [ ] 色块 ≤ 3 种颜色（ink + accent + marker）？
- [ ] 正文手写字体 ≥ 32px？标注 ≥ 24px？
- [ ] 有没有一个元素让人第一眼被抓住？
- [ ] 是否避免了三等分、居中对称、等间距等"排版感"布局？

## 步骤 6：截图

```bash
node ~/.openclaw/workspace/skills/skills/ljg-card/assets/capture.js /tmp/ljg_cast_sketchnote_{name}.html ~/Downloads/{name}.png 1080 800 fullpage
```
