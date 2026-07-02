# Frame 范例

两个可以照着改的完整命令。frame 只写画什么——继刚作主角的构图、隐喻物件、中文标注；风格词不写，`gen_illustration.py` 已内置吉田诚治风格，写了会打架。

## 范例一 ·《非对称风险》遍历性

意向画面（提炼过程见 extraction.md 示例 A）：人群各玩一次平均 +5%；「你」独自沿一条时间线走，路上一道吸收壁，进去出不来，正期望也通向归零。继刚就是那个走时间线的「你」。

```bash
python3 assets/gen_illustration.py \
  --frame "In the FOREGROUND the protagonist walks alone along a single narrow wooden boardwalk lit by low amber sunlight, heading toward a dark swirling whirlpool that swallows everything at the end of the planks (an absorbing trap, fall in and never climb out). In the BACKGROUND, on safe flat ground beside warm cottages, a crowd of small figures strolls calmly on a wide level path. Labels: 玩很久 (near the man on the boardwalk); 各玩一次 (near the crowd); 吸收壁 (small sign by the whirlpool); 出不来 (under the whirlpool)." \
  --out /tmp/ljg_lib_ergodicity_sketch.png
```

出图：继刚走暖光木栈道奔向吞噬一切的漩涡，远处人群在安全平路，木牌写着标注。

## 范例二 ·《千脑智能》参考系投票

意向画面：一个大脑不是一个观察者，而是上千根皮质柱各画一张「参考系」地图给同一个物体建模型，你看见的「一个东西」是上千张地图投票出的共识。继刚 = 前景那根正在画地图的柱子。

```bash
python3 assets/gen_illustration.py \
  --frame "A warm circular library-hall, cozy and lived-in with wooden beams, bookshelves and plants. In the FOREGROUND the protagonist sits at a small wooden desk under a glowing brass lamp, carefully drawing a grid/coordinate MAP of a single coffee cup that stands on his desk. Behind and around him the SAME scene repeats into the distance — tier upon tier of hundreds of identical little lamplit desks, each with a small figure drawing his own map of the SAME coffee cup. Soft glowing lines rise from all the desks and converge upward onto ONE large clear coffee cup floating above the centre of the hall, as if all the maps are voting to agree on it. Warm low sunlight, honey and amber tones. Labels: 参考系 (on the map he is drawing); 千根柱子 (across the tiers of desks); 投票共识 (near the converging lines); 一个杯子 (under the floating cup)." \
  --out /tmp/ljg_lib_qiannao_sketch.png
```

出图：暖光圆形书馆，继刚在前景画参考系网格地图，身后层层叠叠小灯桌各画同一只杯子，光线汇聚到顶上悬浮的咖啡杯。此图实际生成并验收过：标注全对、继刚认得出、厅堂氛围到位。

## 复用要点

- 先定主角：继刚在哪、朝哪、做什么核心动作。他的角色由画面分配，未必是英雄（见 extraction.md 示例 B）。
- 隐喻落实：抽象命题换成可见物——木板、桥、漩涡、驾驶座、旧车。
- 写清对比和流向：谁在安全侧、谁在危险侧、线条朝哪汇聚。
- 标注 3-5 个，每个 ≤5 字，写明挂在哪个元素旁，之间用分号或顿号分隔（` / ` 会被安全钩子拦）。
- 风格词不写，已内置。
- 生图后必 Read 验：继刚认得出、画面读得懂、中文不糊；不行调 frame 重生，重生前先存住当前这张。
