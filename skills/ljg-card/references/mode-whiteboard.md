# 模具：白板（-w）

白板不是把文章压成一张概念图，而是把作者怎样一步步走到结论摊开。1080px 竖长卡片像下潜深水：问题在上，前提、证据、矛盾、转折与局部分支逐层变深，最后抵达结论和边界。读者只看成品，也应能复述「为什么下一步从上一步发生」。

自然流动来自前一步留下的压力，而不是旁白不断宣布「现在继续追问」。主干在账本里始终明确；前台只让真正改变论证方向的铰链出声，普通延续、解释和递进保持安静。

执行时先读取 `references/image-generation.md` 与 `assets/whiteboard_template.html`。共享协议决定资产身份和来源边界，本文件决定论证抽取、纵向主干与局部结构。

## 一、先建立论证账本

视觉母题之前，先按原文阅读顺序建立账本。不要从摘要直接进入排版；摘要会保留结论，却最容易删除作者抵达结论的过程。

先把锁定后的正文按原段落保存为精确来源快照；段落之间保留一个空行。用确定性工具生成独立来源清单：

```bash
bun assets/prepare-whiteboard-source.ts /tmp/<task>/source.txt /tmp/<task>/whiteboard-source-inventory.json
```

工具会锁定原文件 SHA-256，并按顺序给每个非空段落分配 `src-01`、`src-02`……及段落哈希。论证账本的 `source_sections` 必须与这份独立清单 ID、顺序完全一致，因此不能先漏掉原文，再让自写账本与 DOM 互相证明。

每个来源段落登记为 `source_sections`：

- `id`：稳定来源锚点，例如 `src-01`；
- `disposition: rendered`：它进入白板，并列出对应 `step_ids`；
- `disposition: omitted`：它不承重，同时写清 `omission_reason`；
- 每个源章节必须二选一，不能静默消失。

对候选步骤做删除测试：删掉它后，如果后面的判断失去前提、转折、证据或边界，它就是承重步骤，`must_render` 必须为 `true`。最终嵌入 HTML 的账本只保留承重步骤；非承重内容通过源章节的省略理由说明，不用凑固定节点数。

每个步骤登记：

| 字段 | 含义 |
|---|---|
| `id` | 稳定步骤 ID，与 DOM 的 `data-step-id` 一致 |
| `role` | `question` / `premise` / `evidence` / `tension` / `inference` / `turn` / `synthesis` / `conclusion` / `boundary` |
| `source_refs` | 一个或多个来源章节 ID |
| `claim` | 本步新增的判断，不重复总标题 |
| `support` | 原文给出的事实、解释或限定；没有时为空字符串 |
| `residue` | 本步自然留下、足以推动后文的未解压力；没有就为空字符串，不为凑深度制造问题 |
| `must_render` | 最终账本固定为 `true` |
| `presentation` | `text` / `typography` / `image` / `chain` / `branch` / `timeline` / `matrix` / `radial` |

关系另行登记为 `relations`，每条含 `id`、`from`、`to`、`kind`、`visibility`、`bridge`：

- `kind`：`continue` / `deepen` / `contrast` / `question` / `branch` / `return` / `boundary`；
- `visibility: implicit`：普通延续、解释、例证或自然递进。`bridge` 固定为空，视觉上只让纵向主干继续；
- `visibility: visible`：矛盾出现、问题被改写、条件变化、分支、回收或边界。`bridge` 写一条完整、具体的自然句，不再拆成关系标签与解释句。

同一条边只能有一个可见承载面：如果当前步骤已经用 `residue` 留下了压力，随后关系就使用 `implicit`；如果转折需要独立停顿，当前步骤的 `residue` 留空，由关系的 `bridge` 承担。不要同时写两遍。相邻不自动等于因果。

最终账本使用下面的结构，并写入模板的 `{{LOGIC_LEDGER_JSON}}`：

```json
{
  "version": 2,
  "source_sha256": "锁定原文的 64 位 SHA-256",
  "source_sections": [
    {"id": "src-01", "disposition": "rendered", "step_ids": ["step-01", "step-02"]},
    {"id": "src-02", "disposition": "omitted", "omission_reason": "作者信息，不参与论证"}
  ],
  "steps": [
    {
      "id": "step-01",
      "role": "question",
      "source_refs": ["src-01"],
      "claim": "原文真正试图回答的问题",
      "support": "问题出现的具体局面",
      "residue": "这只说明经验会消失，还没有说明它应该写到哪里。",
      "must_render": true,
      "presentation": "typography"
    }
  ],
  "relations": [
    {"id": "rel-01", "from": "step-01", "to": "step-02", "kind": "deepen", "visibility": "implicit", "bridge": ""}
  ]
}
```

把 JSON 中的 `<` 序列化为 `\u003c`，不要把原文 HTML 或可执行内容复制进 `<script type="application/json">`。

## 二、一条主干，局部变形

每张白板只有一个 `.reasoning-spine`。它是阅读方向，也是视觉上的下潜线。旧的整卡 `data-whiteboard-layout` 已停用：真实文章可以先链式递进，中段分叉，随后用矩阵比较，再汇入结论。

开头使用：

- `.whiteboard-title`：文章议题，不提前代替全部推导；
- `.whiteboard-question`：读者带着什么问题向下走；
- 可选 `.whiteboard-orientation`：交代来源场景，不写结论摘要。

每个承重步骤使用：

```html
<article class="logic-step"
         data-step-id="step-02"
         data-role="tension"
         data-source-refs="src-01 src-02">
  <div class="step-marker" aria-hidden="true">
    <span class="step-depth">02</span><span class="step-dot"></span>
  </div>
  <div class="step-panel">
    <span class="step-role">矛盾</span>
    <h2 class="step-claim">短期记住不等于长期学会</h2>
    <p class="step-support">上下文结束后，经验没有稳定进入下一次任务。</p>
    <p class="step-residue">这只说明经验会消失，还没有说明它应该写到哪里。</p>
  </div>
</article>
```

普通递进仍登记端点，但保持静默：

```html
<div class="logic-relation"
     data-relation-id="rel-02"
     data-from="step-02"
     data-to="step-03"
     data-kind="deepen"
     data-visibility="implicit"
     aria-hidden="true"></div>
```

真正改变方向时才使用可见转折；一句话同时承担关系与理由：

```html
<div class="logic-relation"
     data-relation-id="rel-03"
     data-from="step-03"
     data-to="step-04"
     data-kind="branch"
     data-visibility="visible"
     aria-label="单一记忆层无法同时满足快速更新与稳定保留，问题由此分成两条路线。">
  <span class="relation-rail" aria-hidden="true">
    <span class="relation-stem"></span><span class="relation-arrowhead"></span>
  </span>
  <div class="transition-copy">
    <p class="transition-sentence">单一记忆层无法同时满足快速更新与稳定保留，问题由此分成两条路线。</p>
  </div>
</div>
```

账本步骤、DOM 步骤、账本关系与 DOM 关系的 ID、顺序、类型、显隐和文字必须一致。第一步是 `question`，结论前至少有真实推导，最后一步是 `boundary`；不能让顶部一句核心判断替代整条路径。

### 流水式衔接的删除测试

先把标题、支撑文字和可选 `residue` 连起来朗读，再逐条检查关系：

- 删除这句转折，读者仍能顺着前一步进入下一步：改为 `implicit`；
- 删除后会丢失矛盾、问题改写、分叉、回收或边界：保留 `visible`；
- 过渡句只说「继续追问」「再向前一步」「因此展开」而没有指出原文中的具体未解对象：它只是报幕，重写或删除；
- 下一节点标题已经自然回答了前一步的余压：不要再加关系文案。

可见转折的数量由删除测试决定，不设比例。目标不是少写，而是只在逻辑真正换挡时写。

## 三、五种 topology 降为局部工具

局部结构使用 `data-logic-shape`，可以在同一主干内组合：

| 局部结构 | 适用时刻 | 必须出现的语义面 |
|---|---|---|
| `chain` | 一个节点内部还需展开短递进 | `.local-chain` 与有序子项 |
| `branch` | 同一问题分出不同条件、机制或路线 | `.local-branch`、两条以上 `.branch-path`、回流或开放说明 |
| `timeline` | 同一对象发生状态迁移 | `.local-timeline`、时间/状态标签 |
| `matrix` | 两条独立轴形成比较空间 | `.local-matrix`、两条轴与四区 |
| `radial` | 多个独立机制共同作用于一处 | `.local-radial`、中心与独立辐射项 |

分支必须说明去向：

```html
<section class="local-shape local-branch"
         data-logic-shape="branch"
         data-branch-state="converged"
         data-entry-step="step-04"
         data-return-step="step-07">
  <div class="branch-grid">
    <div class="branch-path" data-branch-id="route-a">...</div>
    <div class="branch-path" data-branch-id="route-b">...</div>
  </div>
  <p class="branch-return">两条路线在 step-07 重新汇合。</p>
</section>
```

`converged` 分支的每条路径都要通过关系抵达 `data-return-step`；暂时无法汇合时使用 `data-branch-state="open"` 并写可见的 `.branch-open`，不能画完两栏就遗忘它们。

## 四、图像只进入承重步骤

生成图预算为 `0–4` 幅。白板没有顶部 hero 图槽；图片只嵌入它解释的 `.logic-step`，并让 `data-source-claim` 等于该步骤 ID：

```html
<figure class="generated-art generated-art--whiteboard"
        data-asset-kind="generated"
        data-asset-id="g02"
        data-source-claim="step-05">
  <img src="/absolute/path.png" alt="阀门收紧后，流入容器的水明显变少">
</figure>
```

图片只画人、手、物件、容器、绳索、阀门、地形等可见动作。箭头、轴线、矩阵边界、标签、公式、标题和编号全部留给 HTML/CSS。提示词追加：

```text
minimal hand-drawn whiteboard vignette, warm paper-compatible flat background,
one object and one visible action, loose marker line, low detail, generous clean margin
```

专属负向约束：图中不要箭头、轴线、标签、纸纹、便签壳、阴影或新增高饱和色。透明背景不稳定时，平底色必须与 `--board` 完全一致。

## 五、竖长阅读节奏

- 1080px 宽度固定，高度由推理深度决定；不为接近某个模板高度删节点。
- 连续下潜线贯穿主干；每个步骤带深度编号、角色、判断与支撑，只有真实未解压力才增加 `residue`。
- 铺垫收紧，矛盾、转折、分支回流、结论放大；不要把所有节点做成等重卡片墙。
- 每经过一个真正的推理转折，增加纵向留白；同一层的证据与例子收紧在所属步骤附近。
- 手写体只用于真正的可见转折、深度标记和短批注；正文使用本地中文 Sans。
- 局部限定放在对应步骤的 `.logic-evidence` 或 `.step-support` 中；最终 `.whiteboard-boundary` 只收束全局边界。
- 整图缩小时应先看到一条连续向下的线、少数明显转折和最后的收束；原像素下正文必须轻松可读。

将最终账本写入 `{{LOGIC_LEDGER_JSON}}`，语义内容写入 `{{CONTENT_HTML}}`，只在必要时用 `{{CUSTOM_CSS}}` 做局部微调，并替换 `{{LOGO}}` 与 `{{SOURCE_LINE}}`。所有中间文件写入本任务独占的 `/tmp` 目录。

## 六、截图与验收

```bash
bun assets/capture.ts /tmp/<task>/whiteboard.html ~/Downloads/{name}.png 1080 1600 fullpage /tmp/<task>/whiteboard-source-inventory.json /tmp/<task>/source.txt
```

截图器会阻断：占位符残留、缺少来源清单或原文快照、原文哈希漂移、来源清单与论证账本段落不一致、缺少唯一主干、旧整卡 topology、账本 JSON 错误、源章节无去向、承重步骤遗漏或乱序、节点未绑定来源、关系端点悬空或文字漂移、静默关系仍带文案或箭头、可见关系缺少完整 bridge、同一条边同时使用 residue 与 bridge、分支不回流也不声明开放、生成图超过 4 幅或未绑定步骤、破图/空 alt、横向或隐藏溢出、超出支持高度。

最终验收分三层：

1. **来源覆盖**：逐项核对 `source_sections`，每个章节都有步骤或具体省略理由。
2. **论证复述**：只看 PNG，能够说出原文的问题、承重前提、后文怎样从前文自然发生、局部分支怎样回收、结论与边界；只能复述结论分类而不能解释推导时，判定失败。
3. **朗读流畅**：隐藏角色名、深度编号和关系数据后，顺读标题与正文；如果像提纲旁白反复报幕，或删除某条可见转折后毫无损失，判定失败。
4. **像素检查**：整图一次；长图再用有重叠的顶部/中段/底部切片覆盖全部高度，确认下潜线连续、关系方向正确、真正转折才形成停顿、文字无裁切、来源未漂移。
