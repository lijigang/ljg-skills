# Worked 范例：AI 影视生态地形图

一个可以照着改的完整例子。frame 只写这个行业的地形怎么布（价值之河、各环节地貌、隘口、宝藏、地名）；风格、红牌金牌、继刚测量员由 `gen_illustration.py` 内置，不用写。

## 研究 → 地形

deep research 出的结构（双头抽租）：价值链 算力→基础视频模型→工具→内容制作（创作者）→分发平台→观众；瓶颈 = 基础视频模型（产能和算力的闸，烧钱）；价值捕获 = 算力（英伟达）+ 分发平台（抖音/快手）两端；错位 = 创作者在中游创造价值却守薄田，钱被两端抽走。

译成地形：上游算力雪山加大坝（宝藏）；中游绿谷创作者村庄加内容田（薄田）；中游上方峡谷隘口 = 瓶颈；下游平台港镇加宝藏；外海 = 观众。

## mold -a（吉田诚治绘本地图，默认）

```bash
python3 assets/gen_illustration.py --mold a \
  --frame "A value-river flows left-to-right through an island valley. LEFT/upstream: tall compute mountains with a big wooden dam-tollgate (a major profit pool). MIDDLE: a lush green valley where small creator-villagers grow content crops by the river — value is created here but the villagers are modest. A narrow rocky canyon pass sits just upstream of the middle (a scarce, smoking foundry-hut zone = the base-model layer) constricting the river. RIGHT/downstream: a busy harbor town with a tollgate where boats pay before reaching the open sea (the audience) — another profit pool. So the bottleneck pass is the canyon; the value-capture treasure piles are the upstream dam and the downstream harbor. A few wooden place labels: 算力; 创作者; 平台; 观众." \
  --out /tmp/ljg_map_aifilm_terrain.png
```

出图：算力雪山和坝上金宝藏、中游创作者村庄和内容田、峡谷红牌瓶颈、平台港镇宝藏、外海观众，继刚作测量员立山头举地图俯瞰。此图实际生成并渲染验收过。

## mold -c（pixel + cyber-hacker）

同一段 frame，换 `--mold c` 即出暗黑霓虹像素版（峡谷隘口变故障收窄、宝藏变发光数据堆、河变数据流）。frame 不动，风格交给 mold。

## 复用要点

- 先有研究再译地形：瓶颈在哪环、价值捕获在哪环、错位还是重合，定准了再动笔。
- 价值之河上游到下游；各环节译成山、谷、港、海。
- 瓶颈画成收窄隘口或坝，价值捕获画成宝藏堆；错位就让宝藏远离创造它的薄田。
- 地名 3-6 个，每个 2-5 字，用分号或顿号分隔（` / ` 会被安全钩子拦）。
- 数字和问题不进图：base rate 数字、三大问题写进卡的文字块。
- 生图后必 Read 验：两处标清、地名不糊、继刚认得出；不行调 frame 重生，重生前先存住当前这张。
