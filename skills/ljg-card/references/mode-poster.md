# 模具：多卡（-m）

把长内容切成一组 1080 × 1440 的阅读卡。每卡一个判断，全组共享一套视觉世界，但不是每卡都必须有图。

## 1. 读取与切分

Read `references/image-generation.md` 与 `assets/poster_template.html`。先列出内容的判断链，再按阅读动作切成 2–8 张：开题、机制、反例、转折、结论等。

切分规则：

- 每卡只有一个可复述判断。
- 标题卡可用完整标题；续卡使用短 running title。
- 每卡正文应在固定画布内留出 footer，不靠缩成小字硬塞。
- 事实与引语不跨卡改写成新结论。

## 2. 建立跨卡系列母题

在共享母题表之前写一份系列圣经：媒介、主物件、线条/材质、色彩、镜头范围、共同留白方向。再给每张卡标记：

```text
image_role = hero | mechanism | contrast | closing | none
```

规则：

- 每卡最多一幅主图。
- 全组至少有一幅关键生成图；没有语义任务的卡标 `none`。
- 同一主体可以连续出现，但动作、景别或冲突必须推进。
- 不允许每卡换一个通用隐喻，也不允许复制同一图换文案。

## 3. 固定画布构图

生成前先在 1080 × 1440 中标出标题、正文和 footer 安全区。图片推荐：

| role | 建议比例 | 放置 | 裁切约束 |
|---|---|---|---|
| hero | 4:3 | 标题下方 | 关键主体离边缘至少 10% |
| mechanism | 3:2 | 正文中段 | 主要动作完整可见 |
| contrast | 16:9 | 两段文字之间 | 冲突双方都在安全区 |
| closing | 4:3 | 结论前 | 对象少、留白大 |

提示词追加：

```text
single-card editorial image, one semantic focal point, fixed portrait-card crop,
series-consistent subject and material, generous clean safe zone
```

先用最难裁切的一卡校准，再生成余图。

## 4. 文案与模板

正文可用 `<p>`、`<h2>`、`.highlight`、`.item`、`blockquote`、`ul`。不要为了图片把同一判断拆成两张。

每张卡替换：`{{HEADER_BLOCK}}`、`{{TITLE_BLOCK}}`、`{{BODY_HTML}}`、`{{PAGE_INFO}}`、`{{LOGO}}`、颜色与图片槽。

有图：

```html
<figure class="generated-visual generated-visual--poster" data-state="ready">
  <img src="/absolute/path.png" alt="这张卡中主体正在发生的具体动作">
</figure>
```

无图：`data-state="empty"`，并清空 `src` 与 `alt`。

写入 `/tmp/ljg_cast_poster_{name}_{NN}.html`。

## 5. 截图

```bash
bun assets/capture.ts /tmp/ljg_cast_poster_{name}_{NN}.html ~/Downloads/{name}_{NN}.png 1080 1440
```

## 6. 自检

- [ ] 判断链完整，每卡一个判断
- [ ] 系列圣经已锁定，角色/物件/媒介/色彩连续
- [ ] 每卡最多一图，没有空白驱动的机械配图
- [ ] 图片主体适配固定画布，标题与 footer 安全区未被侵占
- [ ] 图片无字、无水印、无伪界面；所有可读信息在 HTML
- [ ] 续卡 running title 与页码准确
- [ ] 每张 PNG 恰为 1080 × 1440，无溢出、破图或截断
- [ ] 全组资产哈希不重复，卡片顺序与来源绑定
