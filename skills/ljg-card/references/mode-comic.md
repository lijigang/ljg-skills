# 模具：漫画（-c）

## 核心信条

**黑与白之间的张力，就是全部。**

漫画模具用日式黑白漫画的视觉语言讲故事。不是加了漫画边框的排版——是用分格节奏、黑白对比、集中线和留白来制造戏剧性。颜色几乎不用，最多一个灰色调（网点灰）。力量来自墨色的浓淡和构图的紧张感。

## 步骤 1：读取模板

Read `~/.openclaw/workspace/skills/ljg-skills/skills/ljg-card/assets/comic_template.html`

模板提供：
- 字体加载（Noto Serif SC + DM Sans）
- CSS 变量（`--bg`, `--ink`, `--ink-mid`, `--ink-light`, `--white`, `--accent`, `--tone`）
- SVG 滤镜：`#inkgrain`（墨迹纹理）、`#halftone`（网点）、`#roughen`（毛边）
- `.colophon` 署名栏
- `{{CUSTOM_CSS}}` 和 `{{CONTENT_HTML}}` 插槽

## 步骤 2：理解内容，选择风格

### 2.1 提取叙事要素

从内容中提取：
- **核心冲突/张力**：这段内容里什么和什么在对抗？
- **3-5 个关键时刻**：可以变成"格子"的场景或概念
- **情绪弧线**：从什么状态到什么状态？
- **视觉锚点**：最有画面感的那个概念

### 2.2 选择漫画风格

| 风格 | 视觉特征 | 触发信号 | CSS 变量覆盖 |
|------|---------|---------|-------------|
| **大友克洋 — 精密废墟** | 极细线条密集排列、机械/建筑细节、灰阶丰富、透视精确 | 技术/系统/架构/复杂机制、信息密度高 | `--tone: #D0D0D0` |
| **井上雄彦 — 水墨留白** | 大面积留白、墨色浓淡渐变、笔触可见、极简构图 | 哲学/沉思/美学/人文、需要呼吸感 | `--tone: #E8E0D8` |
| **三浦建太郎 — 暗黑压迫** | 大面积纯黑、极高对比、密集纹理、压迫感强 | 冲突/困境/黑暗面/挣扎、情绪强烈 | `--bg: #F0F0F0; --tone: #C0C0C0` |
| **松本大洋 — 生猛粗线** | 粗细不均的线条、不规则构图、能量感、看似粗糙实则精确 | 运动/能量/创意/突破、有冲击力 | `--tone: #E0E0E0` |
| **谷口治郎 — 静谧精描** | 建筑级精细线条、克制表情、银盐照片般的灰阶、安静 | 日常/观察/细节/安静的力量 | `--tone: #E5E5E5` |

**选择原则**：
- 默认用「井上雄彦」——最通用的黑白美学
- 内容有技术/系统复杂度 → 大友克洋
- 内容有强烈冲突或黑暗面 → 三浦建太郎
- 内容有能量/突破/运动感 → 松本大洋
- 内容是安静的观察/日常 → 谷口治郎

**系列一致性规则（同源多卡）**：当从同一个文本源（同一篇文章、同一本书、同一份报告）生成多张漫画卡片时，必须对整个文本源做一次整体判断，选定一个风格，所有卡片统一使用。不要按单个概念逐张选风格——风格跳跃会破坏阅读连续感。判断依据是文本源的整体气质，不是某个局部章节的情绪。

## 步骤 3：设计画面

### 3.1 漫画视觉元素工具箱

**所有元素用 CSS + SVG 实现。黑白为主，灰色网点为辅，不用彩色。**

#### 分格系统（Panel Layout）

漫画的核心是分格。用 CSS Grid 实现不规则分格：

```css
/* 基础分格 */
.panel {
  border: 3px solid var(--ink);
  background: var(--white);
  position: relative;
  overflow: hidden;
  padding: 28px 32px;
}

/* 出血格（内容冲破边框） */
.panel-bleed {
  border: none;
  margin: -3px;
  z-index: 2;
}

/* 斜切分格 */
.panel-slanted {
  clip-path: polygon(0 0, 100% 8%, 100% 100%, 0 92%);
}
```

#### 集中线（Focus Lines）

用于强调关键概念，制造"震撼"感：

```css
.focus-lines {
  position: relative;
}
.focus-lines::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-conic-gradient(
    var(--ink) 0deg 0.5deg,
    transparent 0.5deg 5deg
  ) center/100% 100%;
  opacity: 0.06;
  pointer-events: none;
}
```

#### 速度线（Speed Lines）

表现动态、变化、冲击：

```css
.speed-lines {
  background-image: repeating-linear-gradient(
    90deg,
    transparent,
    transparent 4px,
    var(--ink) 4px,
    var(--ink) 4.5px
  );
  opacity: 0.08;
}
```

#### 对话泡 / 思想泡

```css
.speech-bubble {
  background: var(--white);
  border: 2.5px solid var(--ink);
  border-radius: 20px;
  padding: 16px 22px;
  position: relative;
  font: 700 32px/1.4 var(--serif);
}
.speech-bubble::after {
  content: '';
  position: absolute;
  bottom: -16px;
  left: 40px;
  border: 8px solid transparent;
  border-top-color: var(--ink);
}

/* 思想泡（圆形尾巴） */
.thought-bubble {
  border-radius: 50% 50% 50% 50% / 40% 40% 60% 60%;
}
.thought-bubble::after {
  width: 12px; height: 12px;
  border-radius: 50%;
  background: var(--ink);
  border: none;
  bottom: -20px;
}

/* 吼叫泡（锯齿边缘） */
.shout-bubble {
  clip-path: polygon(
    0% 20%, 5% 0%, 15% 15%, 25% 0%, 35% 10%,
    50% 0%, 65% 10%, 75% 0%, 85% 15%, 95% 0%,
    100% 20%, 95% 35%, 100% 50%, 95% 65%, 100% 80%,
    95% 100%, 85% 85%, 75% 100%, 65% 90%, 50% 100%,
    35% 90%, 25% 100%, 15% 85%, 5% 100%, 0% 80%,
    5% 65%, 0% 50%, 5% 35%
  );
  background: var(--white);
  padding: 28px 36px;
  font: 900 38px/1.3 var(--serif);
}
```

#### 网点灰（Screentone）

漫画中灰色不是灰色，是网点：

```css
.screentone {
  background-image: radial-gradient(circle, var(--ink) 1px, transparent 1px);
  background-size: 5px 5px;
  opacity: 0.15;
}

/* 渐变网点 */
.screentone-gradient {
  background-image: radial-gradient(circle, var(--ink) 1px, transparent 1px);
  background-size: 5px 5px;
  -webkit-mask-image: linear-gradient(to bottom, black, transparent);
  mask-image: linear-gradient(to bottom, black, transparent);
  opacity: 0.2;
}
```

#### 拟声词 / 效果字（Onomatopoeia）

大号倾斜的效果字，漫画的灵魂：

```css
.sfx {
  font: 900 80px/1 var(--serif);
  color: var(--ink);
  transform: rotate(-8deg) skewX(-5deg);
  letter-spacing: -3px;
  text-shadow: 3px 3px 0 var(--tone);
  -webkit-text-stroke: 1px var(--ink);
}
```

#### 墨色浓淡（Ink Wash）

井上雄彦路线的核心——用 CSS gradient 模拟水墨：

```css
.ink-wash {
  background: linear-gradient(
    135deg,
    var(--ink) 0%,
    rgba(26,26,26,0.6) 20%,
    rgba(26,26,26,0.15) 50%,
    transparent 70%
  );
}
```

### 3.2 排版原则

**漫画排版不是文章排版。**

- **文字竖排可选**：日式漫画原本竖排阅读。关键文字可以用 `writing-mode: vertical-rl` 制造漫画感
- **字号对比极端**：标题 120px+、正文 32px、旁注 20px，比例 ≥ 6:1
- **粗体 = 重音**：漫画中加粗是"说话声音变大了"
- **留白 = 沉默**：大面积空白不是没画完，是刻意的停顿
- **黑色块 = 重压**：纯黑区域制造压迫感和戏剧性

### 3.3 分格构图（按风格）

#### 大友克洋 — 精密废墟
```
+------------------+--------+
|                  |  细节   |
|   全景大格       |  小格   |
|   (技术架构图)   +--------+
|                  |  数据   |
+--------+---------+  小格   |
| 文字格 | 文字格  |        |
+--------+---------+--------+
```
特征：格子方正、线条精密、信息密度高

#### 井上雄彦 — 水墨留白
```
+-------------------------+
|                         |
|    大面积留白            |
|         核心概念         |
|    (墨色渐变背景)        |
|                         |
+------------+------------+
|  窄长格    |   窄长格    |
|  观点 A    |   观点 B    |
+------------+------------+
```
特征：大量留白、格子少、每格信息少但重

#### 三浦建太郎 — 暗黑压迫
```
+--+--------------------+--+
|黑|                    |黑|
|边|   核心冲突大格      |边|
|  |   (大量纯黑+白字)  |  |
+--+---------+----------+--+
|   密集格   |  密集格   |
|   (网点灰) |  (纯黑白) |
+------------+-----------+
```
特征：大面积纯黑、白字反转、压迫感

#### 松本大洋 — 生猛粗线
```
  +-------+
  | 歪斜格 \
 /          +--------+
+   核心概念          |
|   (大号粗字)        |
+-----+       +------+
      |  不规则 |
      |  小格   |
      +---------+
```
特征：格子歪斜、边框粗细不均、充满动能

#### 谷口治郎 — 静谧精描
```
+-------------------------+
|   精细场景描写格         |
|   (长横格，电影宽银幕)   |
+------------+------------+
|            |            |
| 正方格     | 正方格     |
| 细节 A     | 细节 B     |
|            |            |
+------------+------------+
|   底部叙事格             |
+-------------------------+
```
特征：规整格子、宽银幕横格、安静均匀

## 步骤 4：写 CSS + HTML

所有 CSS 写入 `{{CUSTOM_CSS}}`。所有 HTML 写入 `{{CONTENT_HTML}}`。

**CSS 从零写**——class 名反映内容，不是通用名。

**核心约束**：
- 配色限于黑(`--ink`)、白(`--white/--bg`)、灰(`--tone`)三值，偶尔用 `--ink-mid`
- 如需强调，用纯黑反白（白字黑底），不用彩色
- 边框统一 2.5-3px，模拟笔触
- 至少一个格子要"出血"（内容冲破常规边距）制造漫画感

替换变量：

| 变量 | 内容 |
|------|------|
| `{{CUSTOM_CSS}}` | 全部 CSS（包括 :root 覆盖） |
| `{{CONTENT_HTML}}` | 全部 HTML |
| `{{SOURCE_LINE}}` | 内容来源（可选）：`<span class="info-source">来源文字</span>`，无来源时空字符串 |

写入：`/tmp/ljg_cast_comic_{name}.html`

## 步骤 5：自检

- [ ] 一眼看上去像漫画页面吗？如果看着像"加了边框的普通排版"，重做
- [ ] 有没有至少 3 个分格？漫画没有分格就不是漫画
- [ ] 黑白对比是否强烈？有没有纯黑区域？
- [ ] 有没有至少 1 个漫画特有元素（集中线/速度线/对话泡/效果字/网点灰）？
- [ ] 格子大小是否有对比？（一个大格 + 几个小格，不是全部等大）
- [ ] 是否避免了彩色？灰色只用网点灰 `--tone`
- [ ] 正文字号 ≥ 32px？标题 ≥ 72px？
- [ ] 有没有一个格子让人第一眼被吸进去？
- [ ] 是否避免了等分、对称、均匀间距？

## 步骤 6：截图

```bash
node ~/.openclaw/workspace/skills/ljg-skills/skills/ljg-card/assets/capture.js /tmp/ljg_cast_comic_{name}.html ~/Downloads/{name}.png 1080 800 fullpage
```
