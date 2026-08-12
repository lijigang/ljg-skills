# RenderClassic

把 classic JSON 渲染为完整 HTML、单张 PNG、manifest，并可生成重叠视觉验收切片。

```bash
bun Tools/RenderClassic.ts \
  --input <classic.json> \
  --output <classic.png> \
  --html <classic.html> \
  --width 1080 \
  --slices-dir <qa-slices>
```

`--input` 与 `--output` 必填。`--width` 接受 720–1600；默认 1080。省略 `--html` 时写到 PNG 同目录同名 HTML。运行 `bun Tools/RenderClassic.ts --help` 查看当前参数。

输入 JSON 可选填成对的 `heroImage` 与 `heroAlt`。`heroImage` 只接受相对 JSON 或绝对路径的本地 PNG/JPEG/WebP；渲染器会把它编码进 HTML，不保留文件热链。

渲染前会校验原文逐字回读、非标点注解覆盖、tone 枚举、顶部配图和章节解读禁词；渲染后会检查页面溢出、裁切、空文本、配图可见性、必需标题与真实 PNG 尺寸。
