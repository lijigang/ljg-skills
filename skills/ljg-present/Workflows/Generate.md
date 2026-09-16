# Generate

## 完成状态

交付一个离线 HTML。每页的语义角色和主视觉明确，章节节奏与原意成立，文字与关系有来源，原尺寸可读，整套有一致的视觉语言。

读取完整源文、[DesignSystem.md](../DesignSystem.md)、[RenderingSpec.md](../RenderingSpec.md) 和对应的[构图样张](../CompositionReference.md)。有图时再读 [ChartSpec.md](../ChartSpec.md)。声明本次使用的内容模式与视觉方向。

## 内容模式与授权

| 当前请求 | 数据模式 |
|---|---|
| 按提纲排版、保持原文、未授权删改 | faithful |
| 提炼讲稿、把精髓上屏、重组展示、已授权重绘 | editorial，editingBasis 记录当前授权 |

不为已经授权的工作再次确认。改写范围由当前请求决定，模式本身不授予扩大内容、发表或推送的权限。

源清单先于演示数据，独立从原稿转录，不能由改写后的 slides 倒推。faithful 核对原文字句、表格与空白；editorial 核对观点、事实、数值、关系与重要限制，并把完整讲述关联到 notes。仅在备注中保留的来源也要由相应页面引用。

章节、主张、对照、关系和证据由讲述用途确定。两行主张保持 statement；章节边界可以独立成为问题页；标题和提示句可省略。源节点数不等于最终页数。模式允许的改写或续页，应服务于阅读与讲述，而不是塞进固定模板。

## 构建数据

准备 deck.json：文档元信息、mode、独立 sources 清单和带显式 role 的 slides。语法见 RenderingSpec；完整可运行示例见 References/CompositionDeck.json。

主题只从明确的视觉意图选择。share/talk/course 等普通标签不改变默认 hacker-dark；只有 theme_hacker 等明确视觉标签可作后备。旧参数 --hacker/--cyber/-b/-r/-y 在生成输入时映射到相应 theme。

## 工具契约

    bun Tools/BuildDeck.ts /tmp/deck.json ~/Downloads/演示标题.html
    bun Tools/ValidateDeck.ts ~/Downloads/演示标题.html --json

BuildDeck 从当前模板组装，使用函数式占位符替换，内嵌字体并验证最终文件。不要另写 renderer、追加 CSS 或复制旧演示作为新模板。新能力应在技能模板和回归样例中实现；产物只承载数据。

| 意图 | 工具选项 |
|---|---|
| 显式浅色 | BuildDeck --theme hacker |
| 深色默认 | 不传 theme，或 --theme hacker-dark |
| 机器可读静态报告 | ValidateDeck --json |
| 校验真实浏览器报告 | ValidateDeck --browser-report /tmp/probe.json |

## 浏览器与视觉验收

使用 Interceptor 隔离 context。把 Tools/ProbeDeck.js 作为主页面表达式执行；需要验证视口响应时使用 Interceptor 当前的视口验证工具。保存报告后交给 ValidateDeck，报告必须对应同一 buildId。

ProbeDeck 检查实际 DOM 的角色、主对象、内容、字号、越界、图形标签以及翻页与讲稿开关。至少包含一个横屏投影尺寸和一个手机尺寸。再看整套 25% 缩略图与各类代表页，按 CompositionReference 判断主次与节奏；关系图逐一看标签与连线。

静态 PASS 只表明模板、数据和资源符合合同。浏览器探针不替代视觉判断，也不证明具体翻页笔硬件工作。隔离浏览器不可用时保留产物，明确记录视觉复验未完成。

## 交付说明

给出最终 HTML 路径、模式与主题、页数、内容核对范围、实际完成的验证及限制。方向键 / Space 翻页，F 全屏，N 讲稿。只交付最终单文件；中间 JSON、脚本和截图留在任务临时目录。
