# 构图参考

这里的五类样张使用同一组构造内容，展示同一种视觉语言怎样服务不同讲述功能。它们是对照依据，不是需要轮流套用的版式配额。

完整数据：[CompositionDeck.json](References/CompositionDeck.json)。复现：

    bun Tools/BuildDeck.ts References/CompositionDeck.json /tmp/composition-reference.html

封面由文档 title 生成；后续五页依次是章节、巨句、对照、闭环、证据。

## 巨句

![巨句样张](References/Statement.png)

主张自己承担标题。两行仍是同一个判断，尺寸、停顿和四周空白共同形成焦点；不补同义图注。

## 对照

![对照样张](References/Compare.png)

两边共享基线、字号和比较维度。分类与说明形成两级关系，局部细线承担分隔；没有独立外框或第三个总结块。

## 关系

![关系样张](References/Diagram.png)

Unicode 回路把反馈送回输入与处理。中文节点自然排版，变量贴近节点。检查箭头是否完整、回路是否闭合、线条是否穿过无关标签。

## 证据

![证据样张](References/Evidence.png)

表格承担信息结构，页内主张与证据同轴。只留有用途的横线，避免逐格边框和窗口外壳。示例为构造的定性材料，不是现实业务记录。

## 章节

![章节样张](References/Chapter.png)

一个新问题获得停顿。章节定位、主句和空白的比例区别于正文；装饰图和长导语都不是必需品。

## 怎样使用

先按本页讲述功能选择对应样张，再检查主角、阅读顺序、比例和空白。内容不同可以换行、分页或调整节点位置，但不要把所有页面重新退化为「标题＋主体＋说明」。

样张的来源、布局和脚本都可由 JSON 与当前模板复现；仅复制截图或旧 HTML 会丢失可验证的内容契约。字号与边界用 ProbeDeck 检查，视觉关系以实际截图判断。
