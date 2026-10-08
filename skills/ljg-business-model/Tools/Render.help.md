# Render.ts

无外部依赖，使用 Bun 将 JSON 生成为离线 HTML。文本全部按文本处理，自动转义；不执行输入中的 HTML。HTML 包含画布和浏览器验收函数，不连接外部服务。

```sh
bun Tools/Render.ts --input model.json --output model.html [--width 1600]
bun Tools/Render.ts --help
```

`--input`、`--output` 必填。`--width` 是 1200–2400 的整数，默认 1600。输出路径已存在会报错，以免覆盖旧版本。成功 stdout 输出 JSON；失败 stderr 输出原因并以非零状态退出。

## 输入

顶层字段：

- `title`：业务／项目名，最多 32 字符。
- `scope`：对象范围和阶段，最多 60 字符。
- `date`：`YYYY-MM-DD`，使用任务当地日期。
- `version`：版本文字，最多 24 字符。
- `summary`：一句话说明商业模式，最多 100 字符；不支持的逻辑写「待明确」。
- `sources`：`[{"id":"S1","label":"用户提供的项目介绍"}]`；可选 `detail` 保留相关原文摘要或定位信息，不会渲染到页脚。编号不重复。
- `segments`：可选 `[{"id":"C1","label":"社区居民"}]`，最多 4 个；用于跨模块关联客户，保持固定色彩与文字编号。
- `blocks`：必须包含 CanvasGuide.md 的九个键，值均为条目数组。空数组显示「待补充」；不接受其他模块键。

条目结构：

```json
{
  "text": "C1 居民按月付费，每月获得 20 杯咖啡",
  "status": "given",
  "source_refs": ["S1"],
  "segment": "C1"
}
```

- 每格最多 5 条；每条 `text` 最多 90 字符。超限会报错，不会截断。
- `status` 为 `given` / `inferred` / `unknown`。卡片文字分别显示「材料提供」「推测」「待补充」。
- `given` 需要至少一个有效 `source_refs`。
- `inferred` 需要 `reason`（推测依据，最多 240 字符）；可选 `source_refs`。依据保留在 JSON 和 HTML 悬停提示中。
- `unknown` 不需要引用。可具体写「获客成本待补充」，比空泛问号更好。
- `segment` 可选，必须对应 `segments` 中的编号。

完整输入示例见 [Example.json](../Example.json)，示例明确为虚构，不应用于真实企业。

## 浏览器与图片

打开 HTML 后等待 `document.fonts.ready`，调用 `window.businessModelAudit()`：返回 `ok`、`blocks`、`items`、`inferred`、`unknown`、`overflow`、`bounds`。这是几何检查，不验证商业事实，也不替代看图。

使用真实浏览器截图功能捕获整个 `#canvas`，以 PNG 保存，推荐 2 倍像素。若浏览器工具不支持 file URL，用只绑定 127.0.0.1 的临时服务提供这一个文件，完成后关闭服务。截图前确保没有水平裁切；不要用视口大小截掉画布右侧。
