# 视觉规格 + 地图构造 + 踩坑

生成 HTML 前过一遍。这是 ljg-map 的视觉质量底线。卡与 ljg-* 卡家族同源（浅色光学玻璃），地图板走 cartographic（地图/海图）质感。

## 卡身：浅色光学玻璃（与 ljg-library 同源，写死在 template）

| 角色 | 值 |
|------|-----|
| 背景渐变 | `#eef1f7 → #e3e8f2` 冷调雾白 |
| 玻璃卡面 | `rgba(255,255,255,0.55)` + `backdrop-filter:blur(40px)` |
| 高光边 | `1px solid rgba(255,255,255,0.85)` |
| 柔投影 | `0 8px 32px rgba(31,41,72,0.12)` |
| 正文 | `#1a1f2e` 近黑不死黑 |
| 次要 | `#5b6472` 中性灰蓝 |

## 三套色：accent 动态 + cartographic 墨 + 两类节点语义色

**1. accent（按行业温度选，注入 `{{ACCENT}}`）**——无封面可提，从下表按行业「温度」挑：

| 行业类型 | accent | hex |
|----------|--------|-----|
| AI / 科技 / 数字 | 电光靛蓝 | `#4a55c7` |
| 能源 / 制造 / 重工 | 琥珀 | `#c47a1a` |
| 金融 / 资本 | 深绿 | `#2f7d4f` |
| 医药 / 生物 | 青 teal | `#1f8a8a` |
| 消费 / 零售 / 食品 | 赤陶 | `#c2603d` |
| 文娱 / 内容 / 社交 | 品红紫 | `#9b3fa0` |

accent 用于：tags、EN 行、thesis 关键词高亮、地图流向箭头、署名印。`--accent-soft/line` 由 `color-mix` 自动派生。

**2. cartographic 墨（地图板，固定）**：地图板底 `#fbfaf6`（羊皮/海图米白）+ 网格与节点线 `--ink:#2a2622`。不随行业变。

**3. 两类节点语义色（固定，永不随行业变）**：
- 🔴 **瓶颈** `--block:#c1392b`（警示红）——流量在此收窄。
- 🟡 **价值捕获** `--gold:#b8860b`（暗金，落白底可读）——利润在此沉淀。

> 三套别串：accent 按行业选、注入；cartographic 墨写死；红/金语义色写死。红金是「全人类都懂」的卡点与金子，不动。

## 字体

| 用途 | 字体 |
|------|------|
| 行业名 / thesis / 大问题 | Noto Serif SC |
| tags / EN / block-label / 节点公司名 | JetBrains Mono |
| 地图板手写批注（`.hand`）/ 节点功能位标签 / 图例 | Long Cang（手写体） |

## 结构（身份区 + thesis + 地图板 + 基准率 + 三大问题 + 署名）

参考系三件套各占一段：**地图=结构、base rate=刻度、大问题=前沿**。顺序照此——先结构、再刻度校准、最后前沿。

```
身份区：产业地图 Nº 标签 | 行业名 + EN + tags          ← 无封面无头像，标题区填满
─────
thesis：{{THESIS}} 一句话立框（参考系 payload，justify，关键词染 accent）
─────
地图 block：cartographic 地图板 {{MAP_SVG}}（节点 placed + 🔴🟡 双 markers + 错位连线 + 图例 + 可选「你在这」墨像）
            {{MAP_CAPTION}} 板下一行小注，点破错位/权力结构
─────
基准率 block：{{BASE_RATES}} 三栏（指标 / 大字数值 / 这意味着）—— 地图的刻度，校准前沿
─────
大问题 block：三个大问题 {{Q1}}{{Q2}}{{Q3}}，①②③ 编号，serif，justify
─────
极简署名：印 李继刚
```

无 header、无 footer 日期。Tufte 最大化信息墨水比。

## 基准率 block（base rate）—— 地图的刻度

三栏并排（`.brates` flex），每栏 `.brate` 三行：
- `.blabel`（JetBrains Mono，13px，灰）：指标名。
- `.bval`（JetBrains Mono，38px，accent）：基准数值——区间/百分比，大字醒目（如 `1–3%`、`~10×/年`、`$1亿+`）。这是 block 的主角。
- `.bmean`（Noto Serif SC，15px，txt2）：一句「这意味着」，点破个案幻觉。
栏间 1px 细分隔线（`.brate + .brate` border-left）。CSS 已写死在 template，填 `{{BASE_RATES}}` 即可。

## 头像「你在这里」入图（参照 ljg-library，条件性）

行业地图默认是鸟瞰、无「你」。但当**看图人本身是这张地图上的玩家**（占某个功能位），头像就成了所有真实地图都有的「你在这里 / You are here」定位针。

- **判据**（照搬 ljg-library 纪律换尺度）：**这张地图里，看图的人有没有一个明确的位置？** 有→放；无→别放。默认 off，绝不当装饰。
- **资产**：`assets/ljg-portrait.png`（继刚真头像抠底墨像，已复用自 ljg-library；非手绘）。
- **画法**：`<image href="file://…/assets/ljg-portrait.png" width="100" height="100">` 立在所属节点旁（视线朝节点），一根短指针（`#flow` 或细线）指进该节点，手写「你在这」（Long Cang）。墨像约 90–110px。
- **铁律**：墨像与「你在这」标签**绝不套 `filter="url(#rough)"`**（糊）；只有它所指的节点框/指针可套 rough。无「你」位置时整块省略，不留痕迹。

```html
<!-- 可选「你在这里」定位针：仅当看图人在图上有位置 -->
<image href="file:///Users/lijigang/.claude/skills/ljg-map/assets/ljg-portrait.png" x="640" y="92" width="104" height="104"/>
<path d="M648,150 C620,150 600,150 580,150" fill="none" stroke="{{ACCENT}}" stroke-width="1.6" marker-end="url(#flow)"/>
<text class="hand" x="694" y="210" font-size="20" fill="{{ACCENT}}" text-anchor="middle">你在这</text>
```

## 地图板（block 核心）—— cartographic，精确呈现行业结构

地图板 `.mapplate`（`#fbfaf6` + 极淡网格）嵌在玻璃卡里，像一页夹进去的海图。**主角是行业结构本身**——价值怎么流、卡在哪、钱沉在哪，一眼可见。**不嵌继刚墨像**（行业地图里本来没有「你」）。

### 视觉语法（写死，照搬）

- **羊皮底** `#fbfaf6`，淡网格 `rgba(42,38,34,0.06)`（cartographic 坐标纸感），大留白。
- **墨线** `#2a2622`，stroke 1.8-2.1，线条/网格/节点框套 `filter="url(#rough)"` 出海图手绘抖动。**文字 / 节点标签 / marker 标签 / 图例绝不 roughen**（糊）。
- **节点 = 功能位**：圆角矩形（roughened），内写功能位名（Long Cang），下方小字写当下占位公司（JetBrains Mono）。**节点大小/高度编码利润占比**——越赚的环节画得越大。
- **流向箭头**：accent 色，`marker-end="url(#flow)"`，画价值/产品流动方向。
- **🔴 瓶颈 marker**：红色收窄环（双弧向内夹 + 红环），贴在瓶颈节点上，旁标手写「卡点」。
- **🟡 价值捕获 marker**：暗金菱形/钱币（带一点高光），贴在价值捕获节点上，旁标手写「利润池」。
- **错位连线**：🔴 与 🟡 不在同一节点时，二者间画一条 accent 虚线，中点标手写「价值在这创造 → 钱在那捕获」。
- **图例（legend）**：板右下角，两行——🔴 瓶颈（流量在此收窄）/ 🟡 价值捕获（利润在此沉淀）。
- **构图骨架**：viewBox `0 0 880 520` 配 `.mapplate` 刚好。

### 三种拓扑的画法

- **价值流（默认，左→右）**：节点沿横轴上游→下游排开，箭头向右串成链；纵向高度编码利润。瓶颈环套在卡点节点，金菱标在利润节点。轴名标两端（如「上游 原料」「下游 终端」）。
  - **底边对齐（关键）**：横向流里节点高度不一时，**所有节点底边压在同一条 baseline 上**（如 y≈460），高度往上长——这样「越高越赚」才读得出。别让节点垂直居中，否则柱状对比作废。
  - **批注分层优先级**（横向 viewBox 880×520 三层易抢空间）：顶部留给图例（y≈30）；错位批注弧线走中上区（y≈150-220）；轴名/节点占位公司压到贴底边（y≈505-512）。三层错开，别堆在同一高度。
- **分层技术栈（下→上）**：节点堆成横条层，从底层基建到顶层应用；箭头向上表示「叠加在…之上」；瓶颈套在关键底层，金菱标在高毛利层。层名标左侧。
- **生态网络（中心+多边）**：中心放平台节点，多边角色环绕用边连到中心；箭头双向（多边交互）；瓶颈套在最关键的连接卡口，金菱标在收租的中心。

> 换行业换拓扑：**复用下方 `<defs>` 的 `#rough / #flow / #pin-block / #pin-value`**（工具箱）。节点是手画的圆角矩形 + 标签，按拓扑排位。

### 可复用 `<defs>` 组件（照搬）

```html
<defs>
  <filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="2" seed="11" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <!-- 价值流向箭头（accent 色，渲染时把 #4a55c7 换成 {{ACCENT}}） -->
  <marker id="flow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0,1 L9,5 L0,9" fill="none" stroke="{{ACCENT}}" stroke-width="1.8"/>
  </marker>
  <!-- 🔴 瓶颈 marker：红色收窄环 -->
  <g id="pin-block">
    <circle r="17" fill="none" stroke="#c1392b" stroke-width="2.6"/>
    <path d="M-9,-9 L-3,0 L-9,9 M9,-9 L3,0 L9,9" fill="none" stroke="#c1392b" stroke-width="2.4" stroke-linecap="round"/>
  </g>
  <!-- 🟡 价值捕获 marker：暗金菱形钱币 -->
  <g id="pin-value">
    <path d="M0,-15 L13,0 L0,15 L-13,0 Z" fill="#b8860b" stroke="#8a6608" stroke-width="1.4"/>
    <path d="M-5,-5 L2,-9" fill="none" stroke="#f4e3a1" stroke-width="1.6" stroke-linecap="round"/>
  </g>
</defs>
```

### 节点画法（手画圆角矩形 + 标签，照此模式）

```html
<!-- 一个节点：roughened 框（套 rough），内功能位名 + 下方占位公司；高度编码利润 -->
<g filter="url(#rough)" fill="#fbfaf6" stroke="#2a2622" stroke-width="2"><rect x="X" y="Y" width="W" height="H" rx="8"/></g>
<text class="hand" x="CX" y="CY" font-size="22" text-anchor="middle" fill="#2a2622">功能位名</text>
<text class="mono" x="CX" y="CY2" font-size="12" text-anchor="middle" fill="#5b6472">占位公司</text>
<!-- 在瓶颈节点上贴：<use href="#pin-block" x=".." y=".."/> + 手写「卡点」 -->
<!-- 在价值节点上贴：<use href="#pin-value" x=".." y=".."/> + 手写「利润池」 -->
```

## 自适应 + 两端对齐

- 卡片 `flow + height:auto`，渲染必须 `fullpage`。
- thesis / 大问题 `text-align:justify; text-justify:inter-ideograph`，右侧齐平。
- SVG `width:100%`，viewBox `0 0 880 520`。

## 出厂自检

- [ ] 是地图不是流程图：节点位置说得出几何理由（上下游/层级/中心-边缘）？
- [ ] 价值流向清晰（箭头方向对）？
- [ ] 🔴 瓶颈与 🟡 价值捕获两类 marker 一眼分得开？
- [ ] 错位则有 accent 虚线连线 + caption 点破？
- [ ] 图例清晰，两类节点各一行？
- [ ] base rate 三栏：指标/大字数值/这意味着齐，数值醒目、带「这意味着」不留枯燥数字墙？
- [ ] 头像若入图：看图人确在图上有位置、作「你在这里」指向节点、清晰不糊、未套 rough？无「你」则未滥放？
- [ ] 三个大问题在卡上，①②③，锋利？
- [ ] accent 按行业温度选、与内容协调、只点缀（红金语义色不串）？
- [ ] 地图板羊皮底 + 淡网格 + 墨线手绘抖、文字/marker标签不糊？
- [ ] 不含继刚墨像（grep 模板无 portrait.png）？
- [ ] thesis/caption/问题两端对齐、右侧无豁口、反翻译腔过关？
- [ ] 高度自适应、底部无留白（fullpage）？

## 踩坑清单

1. **退化成流程图**：节点没位置关系 = 没建参考系。每个节点问「它在谁上游/哪层/中心还是边」。
2. **两类 marker 串色**：🔴 红写死 `#c1392b`、🟡 金写死 `#b8860b`，不随 accent 变。
3. **节点画成公司**：节点=功能位，公司是占位者（小字标注）。
4. **roughen 套到文字上**：线条/框/网格才套 `#rough`；文字/标签/图例绝不套（糊）。
5. **/tmp 竞争**：并行铸卡 HTML 用唯一名（带行业 slug），别共享固定名。
6. **accent token 约定（重要）**：MAP_SVG 里**所有 accent 描边一律写字面量 `{{ACCENT}}`**——`#flow` marker 的 stroke、流向箭头、错位虚线、accent 批注文字，全用 `{{ACCENT}}`。这样模板 python 的 `.replace("{{ACCENT}}", accent)` 一次性全替换，**不要在 SVG 里硬编码 accent hex**（手改易漏 marker 内的那处）。只有 🔴 红 `#c1392b` / 🟡 金 `#b8860b` 是语义固定色、硬编码、不替换。**替换顺序坑**：`{{ACCENT}}` 必须**最后替换**（在插入 `{{MAP_SVG}}` 之后），否则 SVG 内的 accent token 会漏替——`tpl.replace(各变量).replace("{{MAP_SVG}}",svg).replace("{{ACCENT}}",accent)`。
7. **地图太挤**：viewBox 880×520 给足留白；节点别堆满，主体占 ~70%。
