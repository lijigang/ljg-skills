# Rendering Spec · 4.8

## 数据入口

Tools/BuildDeck.ts 以数据填入当前 SloganTemplate.html。五个占位符由工具处理：TITLE、SUBTITLE、THEME、SLIDES_JSON、DECK_META_JSON。采用函数式替换，正文中的美元符号不参与替换语法。

最小完整输入（JSON）：

    {
      "title":"先核验，再使用",
      "mode":"faithful",
      "tags":["share"],
      "sources":[
        {"id":"SRC-001","content":{"lines":[{"chunks":[{"t":"生成结果，"}]},{"chunks":[{"t":"工作仍未结束。"}]}]}}
      ],
      "slides":[
        {"role":"statement","sourceIds":["SRC-001"],"lines":[{"chunks":[{"t":"生成结果，"}]},{"chunks":[{"t":"工作仍未结束。"}]}]}
      ]
    }

theme 省略时使用 hacker-dark。editorial 模式同时提供 editingBasis，说明当前用户允许的提炼、重组或重绘范围。

## 来源清单

sources 按原稿顺序，ID 稳定且唯一。content 是独立从源转录的可呈现内容，使用下方主体与可选文字字段；可附 kind、raw 等来源记录。生成者仍需把清单与完整原稿核对，输出文件自带清单不能独自证明保真。

- faithful：页面内容与对应源 content 逐字段一致；首次引用顺序与源清单一致。表格不改结构，pre 不改空白。
- editorial：按授权改写并引用 sourceIds；事实、数据、关系和重要限制回到原稿核验。原始 content 不随改写覆盖，完整讲述进入 notes。
- 每个源至少由一页引用。多个来源可汇入一页；未上屏但进入讲稿的来源仍要引用。源章节如何保留或整合，由讲述意图明确决定。
- 文档 title 独立产生封面；仅当首个内容节点文字完全相同且无额外标题或注记时合并。

## 显式角色

| role | 用途 | 主体 |
|---|---|---|
| identity | 封面，只在开头 | lines |
| chapter | 新问题、转折、阶段入口 | lines，可选 kicker |
| statement | 一个判断，允许分行 | lines |
| sequence | 多个同层条目的递进或并列 | lines |
| quotation | 引文 | lines |
| chart | 比较、数量、趋势或关系 | chart 或 diagram |
| evidence | 表格、代码、源字符块 | table 或 pre |

每页恰好一个主体。角色由讲述功能选择，不从 2–4 行或字数推断。模板保留旧字段的基础显示兼容；新构建输入必须显式给出 role。

公共可选字段：

- headline：确有定位用途的标题，不与主张重复。
- kicker：已有章节编号或少量定位信息。
- caption：辅助说明，重要论点与边界放入主体。
- notes：完整讲稿，仅按 N 展开。
- sourceIds：原始内容引用。
- derivedFrom：补充图引用，与 sourceIds 互斥；faithful 模式须紧邻原文页，editorial 可关联多处来源。

标题、主体、注记不是固定三段式。巨句可以只有 lines；图可没有独立图题；证据不需要外框和页签。

## 主体格式

    {"lines":[{"indent":0,"chunks":[{"t":"原文"},{"t":"重点","hl":true}]}]}

    {"table":{"header":true,"rows":[["观察","判断"],["文件存在","产物已保存"]]}}

    {"preTitle":"可选源标题","pre":"source code or original character diagram"}

table.header 依据源表格语义确定，不能无条件把第一行当表头。真实代码和未授权重绘的源图使用 pre。新关系图采用结构化 diagram，Unicode 连接与自然文字标签分开绘制，详见 ChartSpec。

## 物理续页

沿源句界或行界分开时，每张续页保持一个 source ID，并记录：

    {"sourceParts":[{"id":"SRC-001","index":2,"total":2,"joinBefore":"\n"}]}

续页连续、编号完整，按 joinBefore 重建原始可见文本。多来源同层列表可以合页，sources 中各自的 lines 依次连接后应等于该页 lines。共同含义决定分组，不用统一项数替代语义判断。

## 可读性

横屏逻辑画布 1920×1080，整体缩放；竖屏独立单列。有效字号乘舞台缩放与局部 fit，SVG 另计 viewBox 缩放。以 1098×648 验证：

| 内容 | 最低有效字号 |
|---|---|
| 主张 / 章节主句 | 56px；参考样张通常 80px 以上 |
| 主体文字 / 页内标题 | 40px |
| 表格 | 30px |
| 图内关键标签 / 数值 | 26px |
| 辅助注记 | 20px；不能藏关键限制 |
| 源代码 / 字符块 | 22px；密集块沿语义边界续页 |

手机关键文字至少 20px，辅助注记与表格至少 16px。复杂图保留标签尺寸并横向滚动；普通 flow、compare 纵排，趋势图使用同一数据的列表。

fit 只做最后微调，小于 0.80 时重新分页或构图。ProbeDeck 同时检查实际子内容，避免外框合规而内部裁切。语义换行与中文尾段保护不增加字符。

## 离线与交互

一个 HTML，字体与许可内嵌，表格、图表、Unicode 图和公式无网络依赖。模板没有任意作者 HTML/JS 注入入口，文字使用 textContent 或受控转义。

公式只处理闭合的美元分隔符，保留价格字面内容；支持基本上下标和常见运算符，未知命令原样保留。零动效；resize、字体加载与全屏变化触发布局测量。

方向键、PageUp/PageDown、Space、Enter、j/k、Home/End、F、N 保留。编辑态、讲稿弹层和可滚动图形不抢翻页输入。

## 验收层次

1. BuildDeck 检查输入契约并内嵌资源。
2. ValidateDeck 从最终 HTML 反解析数据，核对源内容、构建指纹、规范模板、离线和零动效。未使用的旧代码不能掩盖替代渲染器。
3. ProbeDeck 在浏览器核对实际角色、主对象、文字、字号、边界和交互；报告绑定 buildId。
4. 截图对照样张检查构图与节奏。静态和运行时通过都不能独自证明审美成立。
