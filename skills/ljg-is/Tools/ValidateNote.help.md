# ValidateNote

校验 `ljg-is` 生成的 Markdown 笔记是否符合固定结构。

```bash
bun ~/.agents/skills/ljg-is/Tools/ValidateNote.ts \
  ~/Documents/notes/20260801T010203--本质-taxi__is.md
```

成功时向 stdout 输出 `{"status":"ok", ...}` 并退出 0；失败时向 stderr 输出错误数组并退出 1。缺少文件参数时退出 2。

运行自检：

```bash
bun test ~/.agents/skills/ljg-is/Tools/ValidateNote.test.ts
```

