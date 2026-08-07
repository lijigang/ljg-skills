# 模具：漫画（-c）

把内容铸成黑白漫画分镜。生成位图负责每个分格里的角色、场景和动作；HTML/CSS 负责格线、对白、旁白、音效字与页码。

## 1. 读取与分镜

Read `references/image-generation.md` 与 `assets/comic_template.html`。先把内容压成 3–8 个叙事拍点：建立处境、冲突升级、动作变化、反应、转折、收束。

每个分格只写一个可见动作。不能把三段解释硬塞进一个画面，也不能用旁白替代没设计出来的动作。

## 2. 漫画系列圣经

批量生成前锁定四类连续性：

1. **角色设定**：年龄、脸型、发型、服装、身高差、关键道具、左右手。
2. **线条与网点**：线宽、墨块比例、网点颗粒、背景简繁。
3. **镜头语法**：主景别、视平线、允许的透视强度、反应镜头规则。
4. **黑白关系**：纸白、墨黑、灰阶数量与高对比出现的时机。

不要指定模仿真实漫画家。按内容选择描述性风格族：

| 风格族 | 适合内容 | 视觉特征 |
|---|---|---|
| 精密机械线稿 | 技术、系统、装置 | 清楚结构、细线、克制网点 |
| 墨韵留白 | 哲学、内省、历史 | 大留白、毛笔感、安静景别 |
| 高对比暗黑 | 风险、权力、困境 | 大墨块、硬光、压迫构图 |
| 粗线动势 | 冲突、行动、速度 | 粗线、夸张透视、强运动方向 |
| 静谧电影线描 | 人物、关系、日常 | 中远景、环境叙事、低密度网点 |

## 3. 分格资产表

所有漫画主画面都必须是本地生成位图。建议每个叙事拍点一幅；重要拍点可加一个 detail/reaction，总量以叙事为准。

| panel_id | beat | role | shot | visible action | continuity anchors | ratio | safe zone |
|---|---|---|---|---|---|---|---|
| `p01` | 开场 | hero scene | wide | 角色进入处境 | 服装、道具、空间 | 16:9 | top |
| `p02` | 冲突 | action | medium | 力量直接相撞 | 同角色/物件 | 4:3 | left |
| `p03` | 反应 | reaction | close | 表情或手部回应 | 发型/手/道具 | 1:1 | right |

提示词追加：

```text
black-and-white manga panel art, clean paper background, coherent recurring character,
single readable action, intentional camera angle, controlled screentone and ink mass
```

专属负向约束：图片内不要对白泡、格线、旁白框、音效字、页码和彩色元素；不要照片感、光滑 3D 或多余角色。关键主体需完整，方便 CSS 裁切。

先用角色正面或最重要 hero panel 校准一致性，再生成余格。每次生成都把角色锚点写回提示词；不能只写「same character」。

## 4. 来源分流

- 原文照片、截图或图表属于 `source`，保真放入独立证据格并标来源。
- 新漫画画面属于 `generated`，不能写成「原图」或暗示出自原作者。
- 品牌 logo 只在 footer。
- 同一格不得把来源图与生成图无说明地拼成伪证据。

## 5. HTML/CSS 分工

图片写法：

```html
<figure class="generated-art generated-art--panel panel-wide" data-panel-id="p01">
  <img src="/absolute/path.png" alt="主人公推开沉重的门，门后机器仍在运转">
</figure>
```

用 HTML/CSS 叠加：

- `.panel` 格线与不等宽网格
- `.bubble` 对白泡与尾巴
- `.narration` 旁白框
- `.sfx` 音效字
- `.caption` 来源或时间

图片本身不得包含这些可读元素。图片 `object-fit` 可以是 `cover`，但眼睛、手、关键道具和冲突点必须留在安全区。

顶部图片槽使用 `.generated-visual--comic`，可作为封面 hero；不用时设为空。将版式 CSS 写入 `{{CUSTOM_CSS}}`，分格写入 `{{CONTENT_HTML}}`，替换 `{{LOGO}}`、`{{SOURCE_LINE}}` 与图片槽。写入 `/tmp/ljg_cast_comic_{name}.html`。

## 6. 截图

```bash
bun assets/capture.ts /tmp/ljg_cast_comic_{name}.html ~/Downloads/{name}.png 1080 1500 fullpage
```

## 7. 自检

- [ ] 每个分格一个可见动作，顺序能脱离解释读懂
- [ ] 所有漫画主画面来自生成位图；无空格、占位格或重复哈希
- [ ] 角色设定、线条、镜头和网点风格在全篇连续
- [ ] 格线、对白、旁白、音效与来源全部由 HTML/CSS 承担
- [ ] 图中无可读文字、泡框、格线、Logo、水印或彩色污染
- [ ] 来源原图与生成图标注清楚，不伪造归属
- [ ] 关键脸、手、道具和动作没有被 `object-fit` 裁掉
- [ ] PNG 宽 1080，整图与重叠分段检查通过
