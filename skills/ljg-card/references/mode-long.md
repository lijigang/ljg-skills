# 模具：长图（-l，默认）

`-l` 的默认母风格是「静线叙事｜Quiet Narrative Line」：极简单线的安静、漫画语法里的可见变化、编辑设计里的证据结构。文字仍是主体，生成图只在删掉后会损伤理解的位置出现。

执行时 Read `references/image-generation.md` 与 `assets/long_template.html`。若输入来自已验收 Org，先锁定路径与 SHA-256；卡片不能替代或改写来源。

## 读者承诺

- **3 秒：**看见一个具体处境和唯一主视觉焦点。
- **15 秒：**看懂人物或物件发生了什么变化。
- **60 秒：**理解机制、证据分寸和适用边界。

三个尺度缺一不可。只有漂亮气质、没有动作变化，是装饰；只有连续情节、没有证据结构，是另一种漫画；只有文字压缩、没有可见处境，是摘要截图。

## 视觉母语

- 背景使用暖纸色，默认 `#FAF6EC`；正文为暖黑 `#292621`，辅助文字 `#746F68`，细线 `#DED7CC`。
- 全卡只保留一种暗朱红强调色，默认 `#B6533F`。它标记转折、控制权或承重数字，不平均分配给模块。
- 生成图使用稀疏、略带手感的黑色单线，人物比例可以朴拙，表情保持克制；让姿态、距离和物件变化承担情绪。
- 主图保留占主导的干净留白，不加装饰背景、纹理填充、密集阴影或第二套色彩系统。
- 线重必须在整张长卡缩小后仍能看见动作。局部清楚、整卡消失，仍然失败。

这套属性是一套可复用的视觉系统。用户给出的艺术家或作品名只用于识别审美方向；无论参照对象身份，都先翻译成媒介、线条、色彩、留白、人物比例、表情强度、叙事距离与细节密度等非专属视觉属性。生成提示词只写这些属性，不写创作者姓名，也不要求复制签名式笔触或构图。

## 叙事路由

整张卡固定一个人物、物件或空间关系，让它携带前后变化。视觉数量服从认知拍点：

| 内容形状 | 视觉结构 | 不应发生 |
|---|---|---|
| 一个核心判断 | 1 幅主场景 | 为凑数量追加同义配图 |
| 一条因果或机制变化 | 同一对象的 2–3 个连续视觉拍点 | 每个拍点换一套隐喻或角色 |
| 一本书 | 原状 → 压力 → 变化 → 余波；用同一对象贯穿 | 把章节目录逐段插图 |
| 一篇论文 | 问题 → 机制 → 证据 → 边界 → 决策；图片只画可见动作 | 把框架、数字或结论交给图片模型拼字 |
| 哲思或单一观念 | 1 个安静隐喻 + 1 个边界收束 | 强迫它变成剧情漫画 |

漫画语法在这里指「动作连续、对象连续、前后可比较」，不指对白框、夸张表情、密集格线或卡通装饰。超过三个独立画面且故事本身成为主要阅读方式时，改用 `-c`。

## 阅读结构

先写一句总判断，再把正文压成 3–7 个递进单元。每个单元只承担一种认知动作：提出、拆开、反转、证明、限定或收束。

推荐的长卡骨架：

1. `eyebrow + title + deck`：交代领域、判断与阅读问题。
2. `lead`：一个可见处境，把抽象问题落到人和物。
3. `narrative-beat`：让同一对象继续变化，解释机制。
4. `metric-row`：把承重数字与比较交给 HTML/CSS。
5. `evidence-boundary`：明确材料能证明什么、不能推出什么。
6. `closing-judgment`：把结论还给读者的下一次判断。

短内容可以删掉任何非承重单元；骨架是可用表面，不是必须填满的栏目。

## 视觉锚点

同一张长卡使用 1–3 幅本地语义位图：

| role | 工作 | 构图 | 连续性 |
|---|---|---|---|
| `lead` | 标题后的总处境 | 宽幅、单一动作、主体完整、大留白 | 固定人物/物件的初始状态 |
| `inline` | 解释一个机制或转折 | 4:3 或 3:2，仍只画一个动作 | 延续 lead 的人、物与空间规则 |
| `closing` | 收束余波；没有新信息就省略 | 对象更少、姿态更安静 | 显示变化后的状态，不另起隐喻 |

未选中的段落保持纯文本。图片不能成为段落间的装饰隔断。

## 生成提示词追加

在共享母题表和提示词骨架之后，追加可观察的 `-l` 属性：

```text
contemporary minimalist editorial monoline illustration on a warm off-white paper ground;
one stable person or object performing one clear action;
sparse slightly uneven black contour lines, restrained expression, mildly naïve proportions;
dominant clean negative space, flat shapes only where structurally necessary;
one tiny muted-vermilion accent on the load-bearing turn or control point;
line weight strong enough to remain legible in a reduced full-card thumbnail;
no decorative background, no shading, no hatching, no dense texture, no poster typography.
```

样图通过的标准是语义、人物与道具完整、背景色匹配、无字，以及局部和整卡两个尺度都成立。若缩略后线稿消失，只修正轮廓线重或主体占比，不同时更换隐喻、镜头与构图。

## HTML/CSS 表面

模板保留这些可组合原语：

- `.eyebrow`：小号领域或来源线索。
- `.deck`：标题下的一句阅读问题。
- `.narrative-beat` 与 `.beat-index`：连续动作的文字解释。
- `.metric-row` 与 `.metric`：承重数字和对比。
- `.evidence-boundary`：证据身份、限制与反例。
- `.closing-judgment`：最后一句可迁移判断。

普通段落、`h2`、`.highlight`、`.prompt`、列表、引用与 `.divider` 继续可用。所有标题、正文、数字、公式、标签、箭头和来源由 HTML/CSS 写准。

有 lead 图时使用本地路径和具体动作 `alt`；无图时将顶部槽设为 `data-state="empty"` 并清空 `src` 与 `alt`。inline/closing 图放入正文，使用 `.generated-art--inline` 或 `.generated-art--closing`。

## 截图工具合同

HTML、CSS、候选图和 QA 产物留在本任务独占 `/tmp` 目录，只有验收后的 PNG 离开。截图命令保持：

```bash
bun assets/capture.ts <html> <png> 1080 1600 fullpage
```

## 验收

- 1–3 个视觉锚点分别回指一个源判断；没有同义图或装饰图。
- 同一人物或物件在多拍结构中连续，动作前后可比较。
- 图中没有可读文字、Logo、水印、伪标签或品牌污染。
- DOM 中没有占位符、远程图、破图、缺失 `alt` 或横向溢出。
- 成品是 1080px、8-bit RGB PNG；标题、正文、数字、证据边界与来源均由 HTML/CSS 承担。只有实际嵌入 ICC profile 后，才声称文件带有 sRGB profile。
- 主视觉同时通过局部检查与整卡缩略检查；关键动作、手、脚和道具没有被裁切。
- 整图检查后，用重叠切片覆盖全部高度，不只抽查顶部、中段和底部三个点。
- 若绑定 Org，交付后源文件 SHA-256 与渲染前完全一致。
