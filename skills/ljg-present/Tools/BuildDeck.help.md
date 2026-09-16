# BuildDeck

从结构化数据生成规范模板的单文件离线演示，自动内嵌字体并检查最终文件。

    bun Tools/BuildDeck.ts input.json output.html
    bun Tools/BuildDeck.ts input.json output.html --theme hacker

输入需要 title、sources、slides。mode 默认为 faithful；editorial 还需 editingBasis。每页提供显式 role；示例见 References/CompositionDeck.json，完整字段见 RenderingSpec.md。

显式 theme 优先于 theme_* 视觉标签；share/talk 等用途标签不改变默认 hacker-dark。输出目录不存在时创建。已有目标 HTML 会更新，因此使用明确的任务产物路径。

构建过程：验证数据 → 当前模板组装 → EmbedAssets → ValidateDeck。任一步失败即非零退出。数据和规范模板共同进入 buildId，改动内容或渲染实现都会使旧浏览器报告失效。

本工具不解析任意 Org/Markdown，也不决定作者是否授权提炼。技能负责读取完整源、选择内容模式和转录独立来源清单；工具负责兑现已选择的契约。不要把改写后的 slides 反过来当来源。
