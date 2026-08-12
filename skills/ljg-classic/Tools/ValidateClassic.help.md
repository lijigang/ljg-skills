# ValidateClassic

复核 classic JSON、PNG 与 manifest 是否仍保持同一份输入、尺寸、哈希和 DOM 审计结果。

```bash
bun Tools/ValidateClassic.ts \
  --input <classic.json> \
  --png <classic.png> \
  --manifest <classic.manifest.json>
```

三个参数均必填。成功时 stdout 返回 JSON `status: "valid"`；任一底本、token、覆盖率、尺寸、哈希、顶部配图 presence/visibility 或必需区块可见性不一致时非零退出。运行 `bun Tools/ValidateClassic.ts --help` 查看当前参数。
