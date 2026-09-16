# ValidateDeck · 4.8

    bun Tools/ValidateDeck.ts deck.html --json
    bun Tools/ValidateDeck.ts deck.html --theme hacker-dark
    bun Tools/ValidateDeck.ts deck.html --browser-report probe.json
    bun Tools/ValidateDeck.ts SloganTemplate.html --template
    bun Tools/ValidateDeck.ts --self-test

## 静态检查

- 与当前规范模板一致：数据、受限字体槽和许可之外的 renderer/CSS/DOM 改动会被拒绝。保留旧函数名或校验 token 不能替代实际模板。
- 最终 RAW_SLIDES、DECK_META 的语法、语义角色、主体互斥和源清单。
- faithful 模式逐字段内容、顺序与续页重建；editorial 模式授权依据记录、引用覆盖与图数据有效性。
- 数据、元信息和规范模板共同绑定 buildId。
- 离线资源、字体签名、许可槽、零动效和运行时语法。

## 浏览器报告

--browser-report 核对同一 buildId 的实际页面探针报告。ProbeDeck.js 检查渲染后的文字、角色、主体、字号、边界和交互。未提供报告时，静态通过不会被描述成视觉验收。

## 自测

覆盖规范模板、额外 CSS、跳过渲染的分支、额外脚本、外部资源、字体伪装、用途标签、两行主张、保真漂移、图形端点、价格和公式。原生 chart 的真实 renderer 在最小 DOM fixture 中核对共同零点、正负条形、真实时间间距、原始点数、移动数据列表和文本安全。

## 返回值与边界

成功退出 0，验证失败非零。--json 给出逐项失败和浏览器验证状态。

来源清单仍需独立对照完整原稿；工具不能判断模型自行转录的来源是否真实。字体文件签名不等于完整解码证明，截图器也可能遗漏浏览器原生界面细节。有限测试只支持其实际条件，审美和关系含义需源文与视觉复核。
