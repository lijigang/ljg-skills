# ProbeDeck

浏览器主页面中的只读验收表达式。它翻阅页面并测试键盘，结束后恢复原页，不修改演示文件。

按 Interceptor 当前隔离与视口契约执行 Tools/ProbeDeck.js。需要视口测试时，可将文件作为其验证工具的表达式：

    VerifyViewport.ts probe <deck-url> --widths 1098 --height 648 --expr @<skill-dir>/Tools/ProbeDeck.js

再以 390×844 等手机尺寸执行一次。不要通过手动调用布局函数来冒充 resize/字体加载行为，视口工具应保证页面渲染生命周期活跃。

报告包含 buildId、视口、每页角色、主对象、文字核对、有效字号、越界、节点重叠，以及键盘和讲稿开关结果。原生条形、比较、文字、表格、源代码和 Unicode 节点按实际 DOM 核对。

    bun Tools/ValidateDeck.ts output.html --browser-report probe.json

ValidateDeck 接受原始报告或视口工具返回的 results 包装，核对报告所属的同一构建。一次报告只证明记录的视口、页面和探针范围；截图中的主次、留白、关系正确性与图形接缝仍需单独观察。
