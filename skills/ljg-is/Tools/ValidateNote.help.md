# ValidateNote

校验 `ljg-is` 生成的 Org 或 Markdown 笔记。无 schema 的历史笔记继续按 v1 六段结构验收；带 `schema: ljg-is-v2` 的新笔记按七段结构验收，并检查「结构迁移」中的结构式、变量映射、远域迁移与边界。

v2 一级标题严格依次为：`问题 / 完整表达 / 剥离 / 本质 / 示例 / 结构迁移 / 验证`。其中「结构迁移」严格使用四个强调 bullet：`结构式 / 变量 / 迁移 / 边界`。

```bash
bun ~/.agents/skills/ljg-is/Tools/ValidateNote.ts \
  ~/Documents/notes/20260801T010203--本质-taxi__is.md
```

成功时向 stdout 输出 `{"status":"ok", ...}` 并退出 0；失败时向 stderr 输出错误数组并退出 1。缺少文件参数时退出 2。

运行自检：

```bash
bun test ~/.agents/skills/ljg-is/Tools/ValidateNote.test.ts
```
