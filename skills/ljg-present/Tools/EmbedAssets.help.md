# EmbedAssets

将已组装的演示变成可分享的单文件 HTML：字体、许可和本地图片全部内嵌，不访问网络。

```bash
bun Tools/EmbedAssets.ts ~/Downloads/talk.html
bun Tools/EmbedAssets.ts /tmp/draft.html --output ~/Downloads/talk.html
```

- 输入必须来自含 `BEGIN/END DECK FONTS` 标记的当前模板。
- 自动嵌入 `Fonts/` 中的 IBM Plex Mono Regular/Bold，HTML 保留 OFL 许可；不要求观众安装该字体。
- `<img src="本地路径">` 中的 PNG/JPEG/WebP 根据文件签名字节转成 data URI；相对路径相对输入 HTML。
- 已内嵌的 raster data URI 保留，最终由 ValidateDeck 检查编码与类型。拒绝远程资源、SVG/GIF 栅格入口与 srcset。
- 原生 Chart 的 SVG/HTML 直接保留。中文字体仍遵循平台 fallback；工具不自动搬运整个中文字体包。
- 无 `--output` 时更新输入。可重复执行，字体和许可不会重复添加。
- 完成后再运行 `ValidateDeck.ts` 并做实际浏览器离线验收；资源内嵌不等于排版通过。
