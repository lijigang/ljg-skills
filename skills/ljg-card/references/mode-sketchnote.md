# 模具：视觉笔记（-v）

把一个概念铸成期刊专题式的探索路径：真问题 → 失败 → 再失败 → 视角翻面 → 顿悟 → 命名。读者先看见，再得到名字。

## 六条叙事底线

1. **有真问题在前**：开头是摸得着的约束，不写「什么是 X」。
2. **至少一次真实失败**：已有工具为什么不够必须具体。
3. **顿悟在前、命名在后**：标题和前五站不泄露最终概念名。
4. **当时视角**：每站只写当事人那一刻能看到的东西。
5. **文字克制**：不说「你刚才亲自发明了它」等元自指句。
6. **中文母语表达**：动词与具体物件优先，删翻译腔、学术腔和工业短句堆砌。

## 1. 读取

Read `references/image-generation.md` 与 `assets/sketchnote_template.html`。从原文找出六个站点；答不上「这个概念从哪个真问题里长出来」，就不要设计画面。

## 2. 六站与生成图角色

六站共享系列圣经，但动作、景别与隐喻必须区分：

| 站点 | layout | 图像角色 | 必须看见 | 构图 |
|---|---|---|---|---|
| 1 起点 | `.feature` | `origin-scene` | 人/物被具体约束卡住 | 4:3，大场景，文字侧留白 |
| 2 失败一 | `.note` | `failed-tool`（可选） | 工具在对象面前失效 | 1:1，小物件，便签旁留白 |
| 3 失败二 | `.archive` | `failed-result` | 另一条路留下的失败结果 | 3:1 或 16:9，横幅证据感 |
| 4 转折 | `.cross` | `reversal-action` | 同一约束被主动翻过来使用 | 4:3，动作方向明确 |
| 5 顿悟 | `.hero` | `insight-world` | 新视角让隐藏关系突然可见 | 7:5，最大视觉焦点 |
| 6 命名 | `.closing` | `named-object`（可选） | 已经看见的对象安静落定 | 4:3，对称或大留白 |

`origin-scene`、`failed-result`、`reversal-action`、`insight-world` 是四个优先资产。站点 2 与 6 只有在增加理解时才生成；不因六站齐全而机械配六图。

同系列规则：同一主物件或角色贯穿，失败图收紧，转折图改变动作方向，顿悟图扩大空间，命名图静下来。禁止用相同构图重复四次。

## 3. 文字结构

- Feature：具体问题 + lead + 开放设问。
- Note：第一次尝试；删除线、手写批注、公式由 HTML/CSS 写。
- Archive：第二次尝试；黑色失败印章 + 红色 verdict。
- Cross：与内容扣紧的 1–3 字转折爆点，不默认套「等等」。
- Hero：不出现概念名的洞察姿态 + pull quote。
- Closing：中文概念名、英文名、人物/年份/机构/文献与 2–3 段收束。

所有箭头、公式、caption、删除线、印章和可读批注都属于结构层，用 HTML/CSS；生成图里不画这些字与符号。

## 4. 视觉节奏

节奏：开阔 → 紧 → 紧 → 爆 → 开阔 → 静。六节的间距不能平均。

- Serif：主标题、命名、lead、pull quote。
- Sans：正文与失败站点标题。
- Mono：编号、kicker、byline、档案标签。
- Hand：批注、设问和 caption。
- 色彩不超过红、蓝、amber 与中性；不用纯黑。

提示词追加：

```text
editorial investigative illustration, tactile object and visible action,
magazine feature sequence, same subject continuity, no archive labels inside image
```

## 5. HTML 图片写法

顶部可选槽使用 `.generated-visual--sketchnote`。站点图写在 `{{CONTENT_HTML}}`：

```html
<figure class="generated-art generated-art--insight" data-asset-id="g05">
  <img src="/absolute/path.png" alt="主体换了观察方向后，原先隐藏的关系显现出来">
  <figcaption>准确说明由 HTML 排版。</figcaption>
</figure>
```

`feature`、`archive`、`cross`、`hero` 分别使用 mode class，便于控制 `object-fit` 与比例。不得把模型生成的伪档案、伪便签或伪标签塞入图片。

将全部 CSS 写入 `{{CUSTOM_CSS}}`，全部站点写入 `{{CONTENT_HTML}}`，并替换图片槽、`{{LOGO}}` 与 `{{SOURCE_LINE}}`。写入 `/tmp/ljg_cast_sketchnote_{name}.html`。

## 6. 截图

```bash
bun assets/capture.ts /tmp/ljg_cast_sketchnote_{name}.html ~/Downloads/{name}.png 1080 1500 fullpage
```

## 7. 自检

- [ ] 六站弧线成立，失败形态不同，命名最后出现
- [ ] 四个优先图像角色齐全或有明确的纯文字理由
- [ ] 同一主物件连续，但失败、转折、顿悟动作互不重复
- [ ] 批注、公式、箭头、印章、caption 全由 HTML/CSS 承担
- [ ] 图中无文字、字母、数字、Logo、水印、便签壳或界面
- [ ] 四字族齐全，色彩克制，间距有开阔/收紧/爆发/静止的节奏
- [ ] closing 无元自指，整卡中文逐句默念通过
- [ ] PNG 宽 1080，整图与重叠分段检查无裁切、破图、遮挡
