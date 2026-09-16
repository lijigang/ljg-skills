# Chart Contract

图让关系直接可见。源中有数据、顺序或关系才画；不补数值曲线，不把并列或相关性擅自升级为因果箭头。

## 表达选择

| 材料 | 主体 |
|---|---|
| 数量、趋势、简单流程、双向对照 | chart |
| 回路、分支、非线性节点关系 | diagram：Unicode 连接 + 自然文字标签 |
| 真代码、需逐字符保留的源 ASCII/Unicode | pre |

faithful 的补充图紧跟原文页，用 derivedFrom；原文仍保留。用户授权重绘或演讲编排后，可以新图承载同一关系，以 sourceIds 追踪原文。表示可以改变，标签所指、连接方向、数值和结论强度保持有据。

## 原生 chart

    {"role":"chart","sourceIds":["SRC-001"],"chart":{"kind":"compare","title":"两种工作","items":[{"label":"生成","text":"形成候选"},{"label":"验证","text":"检查依据"}]}}

- bar：2–6 个 {label,value}，共用零基线和源单位，可有负值；全零保留零点。
- line：2–6 个 {label,x,value}，x 严格递增、间距真实，纵轴含零；直线连接原始点，不补点、平滑或外推。
- flow：2–4 个 {label,text?}，只表示源文明示的先后；竖屏纵排。
- compare：两个 {label,text}，共享维度和基线；竖屏按源顺序。

公共字段：非空 title、items、可选 note；最多一个 item 使用 emphasis:true。bar/line 可带 unit，line 可带 xLabel/yLabel。数值必须有限，不用字符串、null 或补零代表缺失。数字与标签保持源顺序。

## Unicode 关系图

    {
      "role":"chart",
      "headline":"反馈回到输入",
      "sourceIds":["SRC-002"],
      "diagram":{
        "columns":25,"rows":7,
        "nodes":[
          {"id":"input","label":"输入","caption":"x","col":3,"row":1},
          {"id":"result","label":"结果","caption":"f(x)","col":20,"row":1}
        ],
        "edges":[
          {"from":"input","to":"result"},
          {"from":"result","to":"input","via":[[20,5],[3,5]],"label":"反馈","at":[12,5]}
        ]
      }
    }

节点按 id 连接；label 使用自然文字，caption 是就近的可选释义。col/row 只是布局锚点，不是数据值。节点不强制加框。

edges 的 from/to 决定语义方向，via 指定路径拐点。未对齐的相邻点以水平再垂直的直角路径连接。label 标注过程，at 可指定位置。共享路径形成交点，在目标前的可见位置绘制箭头。

连接层使用 ─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼ → ← ↑ ↓。文字与线条分层；节点保持自然中文字距，遮让线条，不把中文拉到两个字符单元。需要连续对比的图使用相同 rows/columns、节点锚点和标签规格。

实际浏览器检查：节点不重叠，回路闭合，箭头完整且方向正确，线段连续，标签和释义相邻。路由穿过无关节点时调整 via 或位置。节点太多、说明太长时拆分语义，不能靠小字处理。

## 边界

一图一个主要关系，chart/diagram 不与 lines/table/pre 混作多个主体。图题和辅助说明可以省，但理解图所需的信息必须保留。

Unicode 是关系图的呈现方式，不成为所有页面的配额或装饰。数据契约、浏览器测量和源文核对分别证明其覆盖的部分；箭头是否有来源仍需完整原文审计。
