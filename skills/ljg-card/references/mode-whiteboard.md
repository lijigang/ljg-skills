# 模具：白板（-w）

把一段推理展开成和纸白板：标题 → 核心判断 → 机制链 → 边界。生成图只画概念隐喻和局部物件；逻辑关系必须由 HTML/CSS 精确表达。

## 1. 读取与结构化

Read `references/image-generation.md` 与 `assets/whiteboard_template.html`。先确定白板类型：

- 逻辑链：A → B → C
- 分支树：一个前提分出多条后果
- 时间线：状态随时间变化
- 矩阵：两条明确轴形成四区
- 中心辐射：一个母题连接若干独立机制

一张白板只选一种主结构。先用文字列出节点和关系动词，再设计画面；不把排版后的相邻误当因果。

## 2. 图像角色与预算

每张白板选择 2–4 个 `generated` doodle/vignette：

| role | 用途 | 推荐比例 | 显示尺寸 | 背景 |
|---|---|---|---|---|
| `anchor` | 核心判断的主物件 | 4:3 | 260–420px | 透明或板面纯色 |
| `mechanism` | 链条中的具体动作 | 1:1 | 180–260px | 透明或板面纯色 |
| `contrast` | 展示边界/反例 | 4:3 | 220–320px | 透明或板面纯色 |
| `closing` | 结论旁的小余韵 | 1:1 | 140–220px | 透明或板面纯色 |

图片只画人、手、物件、容器、绳索、阀门、地形等可见动作。箭头、轴线、矩阵边界、标签、公式、标题和编号属于 `structural`，全部留给 HTML/CSS。

提示词追加：

```text
minimal hand-drawn whiteboard vignette, warm paper-compatible flat background,
one object and one visible action, loose marker line, low detail, generous clean margin
```

专属负向约束：图中不要箭头、轴线、标签、纸纹、便签壳、阴影或新增高饱和色。色彩以墨色、焙茶红与一处低饱和强调为限。

先生成核心 anchor 校准线条与板面背景，再批量生成其他小图。透明背景不稳定时，背景色必须与 `--board` 完全一致。

## 3. HTML/CSS 逻辑层

节点用语义化结构：

```html
<section class="reasoning-chain">
  <article class="node">
    <span class="node-index">01</span>
    <h2>条件</h2>
    <p>具体判断</p>
  </article>
  <div class="connector" aria-label="因此"><span>因此</span></div>
  <article class="node">...</article>
</section>
```

连接线用 CSS border/pseudo-element；箭头头部用 CSS 边框三角。弯曲关系可用分段折线、圆角边框或布局转向，不能用装饰性自由曲线替代准确关系。关系标签必须写成动词，如「导致」「限制」「反过来加强」。

生成图写法：

```html
<figure class="generated-art generated-art--whiteboard" data-asset-id="g02">
  <img src="/absolute/path.png" alt="阀门收紧后，流入容器的水明显变少">
</figure>
```

图与节点混排时要避开标题、公式和连接线安全区。不要把图压在可读文字下面。

## 4. 版式与文字

- 标题区直接给判断，不写「关于 X 的一些思考」。
- 节点标题 2–6 字，正文 1–3 句。
- 手写体只用于关系词和短批注；长正文用清楚的 Sans。
- 白板不是均匀卡片墙：核心节点最大，支线收紧，边界区留白。
- 二维矩阵必须先定义两条独立轴、方向和四区含义；区内生成图不能代替轴标签。

顶部可选图片槽使用 `.generated-visual--whiteboard`。将布局 CSS 写入 `{{CUSTOM_CSS}}`，全部节点与图写入 `{{CONTENT_HTML}}`，替换 `{{LOGO}}`、`{{SOURCE_LINE}}` 与图片槽。写入 `/tmp/ljg_cast_whiteboard_{name}.html`。

## 5. 截图

```bash
bun assets/capture.ts /tmp/ljg_cast_whiteboard_{name}.html ~/Downloads/{name}.png 1080 1500 fullpage
```

## 6. 自检

- [ ] 主结构只有一种，节点与关系动词准确
- [ ] 2–4 幅生成图各自回指一个源判断，没有装饰性补图
- [ ] 推理链、箭头、轴、标签、公式、矩阵边界全部由 HTML/CSS 实现
- [ ] 图片是透明或板面纯色，避开文字与连接线安全区
- [ ] 图中无字、数字、Logo、水印、箭头、坐标轴、便签壳或伪纸纹
- [ ] 核心节点层级最高，版面不是均匀卡片墙
- [ ] PNG 宽 1080，整图与重叠分段检查无破图、遮挡、错误连线
