# WeReadWebUrl

把微信读书 API 返回的裸 `bookId`、`chapterUid` 编码成电脑端可打开的网页阅读器链接。

## 用法

```bash
bun "${HOME}/.agents/skills/ljg-blind/Tools/WeReadWebUrl.ts" <bookId> [chapterUid]
```

- 同时传 bookId、chapterUid：输出目标章节网页链接。
- 只传 bookId：输出整本书的网页阅读器入口。
- 传 `--help` 或 `-h`：显示用法并以退出码 0 结束。
- 参数为空：退出码为 1，并打印用法。

## 示例

```bash
bun "${HOME}/.agents/skills/ljg-blind/Tools/WeReadWebUrl.ts" 573976 13
```

输出：

```text
https://weread.qq.com/web/reader/b2632d7058c218b269e80c0kc51323901dc51ce410c121b
```
