# Worked 范例（两种拓扑各一张，真渲染验过图）

两张都可作 few-shot 直接复用：换行业时改名/公司/pins/错位连线，骨架与 `<defs>` 照搬。

**accent token 约定（两张都遵守）**：SVG 里**所有 accent 描边写字面量 `{{ACCENT}}`**（marker stroke、流向箭头、错位线、accent 批注），靠模板 python 的 `.replace("{{ACCENT}}", accent)` 一次替换。只有 🔴 红 `#c1392b` / 🟡 金 `#b8860b` 硬编码（语义固定色）。

---

## 范例 A：AI 大模型（分层技术栈拓扑，下→上）

展示：分层栈 + 瓶颈与价值捕获**重合**在底层（算力）+ 应用层**价值创造未捕获**的错位。

**文字变量**：ACCENT=`#4a55c7`（AI 靛蓝）；INDUSTRY=`AI 大模型`/EN=`Large Language Models`
- THESIS：把 AI 大模型这行摊成一摞**地层**，你才看得见——**算力**在最底下卡着所有人的脖子，钱也沉在那；上头**应用层**忙着创造价值，却还没把钱赚到手里。
- MAP_CAPTION：最扎眼的一处**错位**：价值在顶层创造，利润却在底层沉淀。而 AI 这行又有一处重合——**底层算力既是瓶颈又是金矿**。
- Q1：算力这道瓶颈，会被新架构（光芯片、稀疏化、端侧推理）绕过，还是越卡越紧？
- Q2：利润会不会从底层算力，迁到握着场景与数据的应用层——何时、被谁触发？
- Q3：基础模型会跌成不赚钱的「电力」，还是少数几家凭规模继续收税？
- BASE_RATES（三项，指标 / 数值 / 这意味着）：
  - 训练前沿大模型成本 / `$1亿+` / 入场券就是天文数字，车库创业玩不起
  - 推理成本年降幅 / `~10×/年` / 今天贵的明天白菜价，别按今天成本定战略
  - 大模型收回训练成本比例 / `极少数` / 多数模型烧的是融资不是利润
- 头像入图（演示条件性）：继刚是 AI **应用层**的玩家（做知识/内容应用），故在应用层节点嵌「你在这里」墨像；换陌生行业则省略。

```html
<svg viewBox="0 0 880 520" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="2" seed="11" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <marker id="flow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,1 L9,5 L0,9" fill="none" stroke="{{ACCENT}}" stroke-width="1.8"/>
    </marker>
    <g id="pin-block"><circle r="17" fill="none" stroke="#c1392b" stroke-width="2.6"/>
      <path d="M-9,-9 L-3,0 L-9,9 M9,-9 L3,0 L9,9" fill="none" stroke="#c1392b" stroke-width="2.4" stroke-linecap="round"/></g>
    <g id="pin-value"><path d="M0,-15 L13,0 L0,15 L-13,0 Z" fill="#b8860b" stroke="#8a6608" stroke-width="1.4"/>
      <path d="M-5,-5 L2,-9" fill="none" stroke="#f4e3a1" stroke-width="1.6" stroke-linecap="round"/></g>
  </defs>
  <circle cx="108" cy="30" r="9" fill="none" stroke="#c1392b" stroke-width="2.4"/>
  <text class="hand" x="124" y="36" font-size="18" fill="#2a2622">瓶颈 · 流量在此收窄</text>
  <path d="M392,30 L402,40 L392,50 L382,40 Z" fill="#b8860b" stroke="#8a6608" stroke-width="1.2"/>
  <text class="hand" x="410" y="46" font-size="18" fill="#2a2622">价值捕获 · 利润在此沉淀</text>
  <path d="M56,500 L56,108" fill="none" stroke="#2a2622" stroke-width="1.6" marker-end="url(#flow)" filter="url(#rough)"/>
  <text class="hand" x="40" y="310" font-size="18" fill="#5b6472" transform="rotate(-90 40 310)" text-anchor="middle">越上层 越靠近用户</text>
  <g filter="url(#rough)" fill="#fbfaf6" stroke="#2a2622" stroke-width="2">
    <rect x="80" y="420" width="500" height="82" rx="8"/><rect x="80" y="346" width="500" height="56" rx="8"/>
    <rect x="80" y="272" width="500" height="56" rx="8"/><rect x="80" y="198" width="500" height="56" rx="8"/>
    <rect x="80" y="104" width="500" height="78" rx="8"/>
  </g>
  <g fill="none" stroke="{{ACCENT}}" stroke-width="1.6">
    <path d="M130,418 L130,406" marker-end="url(#flow)"/><path d="M130,344 L130,332" marker-end="url(#flow)"/>
    <path d="M130,270 L130,258" marker-end="url(#flow)"/><path d="M130,196 L130,186" marker-end="url(#flow)"/>
  </g>
  <text class="hand" x="330" y="138" font-size="26" text-anchor="middle" fill="#2a2622">应用层</text>
  <text class="mono" x="330" y="162" font-size="13" text-anchor="middle" fill="#5b6472">各行业 AI 应用</text>
  <text class="hand" x="470" y="150" font-size="17" text-anchor="middle" fill="#2a2622">价值在此创造</text>
  <!-- 「你在这里」定位针：继刚是应用层玩家，条件性嵌真墨像（绝不套 rough） -->
  <image href="file:///Users/lijigang/.claude/skills/ljg-map/assets/ljg-portrait.png" x="600" y="92" width="100" height="100"/>
  <path d="M598,146 C588,146 583,146 577,146" fill="none" stroke="{{ACCENT}}" stroke-width="1.6" marker-end="url(#flow)"/>
  <text class="hand" x="650" y="212" font-size="19" fill="{{ACCENT}}" text-anchor="middle">你在这</text>
  <g fill="#2a2622">
    <text class="hand" x="104" y="234" font-size="22">中间件 / API</text>
    <text class="hand" x="104" y="308" font-size="22">基础模型训练</text>
    <text class="hand" x="104" y="382" font-size="22">数据</text>
  </g>
  <g class="mono" fill="#5b6472">
    <text x="566" y="232" font-size="12" text-anchor="end">云厂商 · 向量库 · Agent</text>
    <text x="566" y="306" font-size="12" text-anchor="end">OpenAI · Anthropic · DeepSeek</text>
    <text x="566" y="380" font-size="12" text-anchor="end">公开语料 · 专有数据</text>
  </g>
  <text class="hand" x="200" y="455" font-size="25" text-anchor="middle" fill="#2a2622">算力 / 先进制程</text>
  <text class="mono" x="200" y="480" font-size="12" text-anchor="middle" fill="#5b6472">ASML · 台积电 · 英伟达 · HBM</text>
  <use href="#pin-block" x="430" y="461"/><use href="#pin-value" x="520" y="461"/>
  <text class="hand" x="430" y="433" font-size="18" text-anchor="middle" fill="#c1392b">卡点</text>
  <text class="hand" x="520" y="433" font-size="18" text-anchor="middle" fill="#8a6608">利润池</text>
  <path d="M500,182 C560,290 560,400 524,442" fill="none" stroke="{{ACCENT}}" stroke-width="2" stroke-dasharray="3 6"/>
  <text class="hand" x="650" y="300" font-size="20" fill="{{ACCENT}}">价值在顶层创造</text>
  <text class="hand" x="650" y="326" font-size="20" fill="{{ACCENT}}">钱却在底层捕获</text>
  <path d="M642,310 C610,320 585,330 560,345" fill="none" stroke="{{ACCENT}}" stroke-width="1.5" stroke-dasharray="2 5" marker-end="url(#flow)"/>
</svg>
```

---

## 范例 B：咖啡产业（价值流拓扑，左→右，默认拓扑）

展示：横向价值流 + **底边对齐**（节点底边压同一条 baseline，高度往上长=利润越多）+ 瓶颈与价值捕获**三处分家**的错位（价值在种植创造、流量被中游贸易卡、利润在下游品牌捕获）。

**文字变量**：ACCENT=`#c2603d`（消费/食品 赤陶）；INDUSTRY=`咖啡产业`/EN=`Coffee Industry`
- THESIS：把咖啡这行摊成一条**价值流**，你才看得见——豆子从地里走到杯里，价值是**豆农**种出来的，可流量卡在中游的**生豆贸易**，钱最后沉在下游的**品牌与咖啡馆**。
- MAP_CAPTION：卡流量的，从来不是赚走钱的那一环。价值在田间地头由豆农种出（利润极薄），钱却跑到下游品牌端被收走——**创造、卡点、捕获，三处分家**。
- Q1：生豆贸易这道卡点，会被产地直采与区块链溯源绕过，还是几家巨头借规模越攥越紧？
- Q2：当「可追溯到这块地」成卖点，利润会不会第一次往种植端回流——谁愿为一颗豆子的来历付钱？
- Q3：瑞幸式低价规模与星巴克式空间溢价，哪种捕获模型能在下一代消费者那守住利润池？
- BASE_RATES（三项）：
  - 豆农分到零售价 / `1–3%` / 你这杯咖啡，种豆的人几乎没分到
  - 独立咖啡馆 3 年存活率 / `~40%` / 开店浪漫，活过三年是少数
  - 一杯咖啡的生豆成本占比 / `<10%` / 钱在品牌和空间，不在豆子
- 头像：继刚不是咖啡产业玩家、纯鸟瞰 → **不放**（演示条件纪律：无「你」位置就不嵌）。

要点：6 节点 **底边对齐 baseline y=470**，高度编码利润（种植最矮、品牌零售最高）；流向箭头沿 baseline 右串；🔴 套生豆贸易、🟡 标品牌零售；错位虚线从种植拉到品牌零售。

```html
<svg viewBox="0 0 880 520" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="2" seed="11" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <marker id="flow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,1 L9,5 L0,9" fill="none" stroke="{{ACCENT}}" stroke-width="1.8"/>
    </marker>
    <g id="pin-block"><circle r="16" fill="none" stroke="#c1392b" stroke-width="2.6"/>
      <path d="M-8,-8 L-3,0 L-8,8 M8,-8 L3,0 L8,8" fill="none" stroke="#c1392b" stroke-width="2.4" stroke-linecap="round"/></g>
    <g id="pin-value"><path d="M0,-14 L12,0 L0,14 L-12,0 Z" fill="#b8860b" stroke="#8a6608" stroke-width="1.4"/>
      <path d="M-4,-4 L2,-8" fill="none" stroke="#f4e3a1" stroke-width="1.6" stroke-linecap="round"/></g>
  </defs>
  <!-- 顶部图例 -->
  <circle cx="108" cy="28" r="9" fill="none" stroke="#c1392b" stroke-width="2.4"/>
  <text class="hand" x="124" y="34" font-size="18" fill="#2a2622">瓶颈 · 流量在此收窄</text>
  <path d="M392,28 L402,38 L392,48 L382,38 Z" fill="#b8860b" stroke="#8a6608" stroke-width="1.2"/>
  <text class="hand" x="410" y="44" font-size="18" fill="#2a2622">价值捕获 · 利润在此沉淀</text>
  <!-- baseline 上 6 个节点，底边对齐 y=470，高度编码利润 -->
  <g filter="url(#rough)" fill="#fbfaf6" stroke="#2a2622" stroke-width="2">
    <rect x="60"  y="424" width="92"  height="46" rx="8"/>
    <rect x="172" y="412" width="92"  height="58" rx="8"/>
    <rect x="284" y="400" width="100" height="70" rx="8"/>
    <rect x="404" y="378" width="92"  height="92" rx="8"/>
    <rect x="516" y="322" width="128" height="148" rx="8"/>
    <rect x="664" y="410" width="96"  height="60" rx="8" stroke-dasharray="4 5"/>
  </g>
  <!-- 流向箭头（沿 baseline 右串） -->
  <g fill="none" stroke="{{ACCENT}}" stroke-width="1.7">
    <path d="M152,447 L172,447" marker-end="url(#flow)"/>
    <path d="M264,447 L284,447" marker-end="url(#flow)"/>
    <path d="M384,447 L404,447" marker-end="url(#flow)"/>
    <path d="M496,447 L516,447" marker-end="url(#flow)"/>
    <path d="M644,447 L664,447" marker-end="url(#flow)"/>
  </g>
  <!-- 节点名（近 baseline）+ 占位公司（baseline 下方，批注分层） -->
  <g fill="#2a2622" text-anchor="middle">
    <text class="hand" x="106" y="455" font-size="19">种植</text>
    <text class="hand" x="218" y="455" font-size="18">处理·出口</text>
    <text class="hand" x="334" y="455" font-size="18">生豆贸易</text>
    <text class="hand" x="450" y="455" font-size="19">烘焙</text>
    <text class="hand" x="580" y="452" font-size="20">品牌零售·咖啡馆</text>
    <text class="hand" x="712" y="447" font-size="18" fill="#5b6472">消费者</text>
  </g>
  <g class="mono" fill="#5b6472" text-anchor="middle" font-size="11">
    <text x="106" y="488">豆农</text>
    <text x="218" y="488">产地合作社</text>
    <text x="334" y="488">Neumann·ECOM</text>
    <text x="450" y="488">雀巢·illy</text>
    <text x="580" y="488">星巴克·瑞幸</text>
  </g>
  <!-- 🔴 生豆贸易 / 🟡 品牌零售 -->
  <use href="#pin-block" x="334" y="392"/>
  <text class="hand" x="334" y="372" font-size="17" text-anchor="middle" fill="#c1392b">卡点</text>
  <use href="#pin-value" x="580" y="316"/>
  <text class="hand" x="580" y="296" font-size="17" text-anchor="middle" fill="#8a6608">利润池</text>
  <!-- 错位虚线：种植（创造）↗ 品牌零售（捕获），走中上区 -->
  <path d="M106,420 C200,210 420,180 566,302" fill="none" stroke="{{ACCENT}}" stroke-width="2" stroke-dasharray="3 6"/>
  <text class="hand" x="300" y="196" font-size="20" fill="{{ACCENT}}" text-anchor="middle">价值种在上游，钱却被下游收走</text>
  <!-- 轴名（贴底边） -->
  <text class="hand" x="80"  y="510" font-size="16" fill="#8a93a1">上游 · 一颗豆</text>
  <text class="hand" x="760" y="510" font-size="16" fill="#8a93a1" text-anchor="end">下游 · 一杯咖啡</text>
</svg>
```

> 渲染：`python3` 填模板 → `node ~/.claude/skills/ljg-card/assets/capture.js <html> <png> 1080 1440 fullpage`。
>
> **替换顺序（坑）**：先插 `{{MAP_SVG}}`/`{{THESIS}}` 等，**`{{ACCENT}}` 放最后替换**——因为 MAP_SVG 里也含 `{{ACCENT}}` token，若先替换 accent 再插 SVG，SVG 内的 token 会漏掉。一句话：`out = tpl.replace(各变量...).replace("{{MAP_SVG}}", svg).replace("{{ACCENT}}", accent)`，accent 收尾。
