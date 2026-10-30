# ValidateNote

校验 `ljg-is` 生成的 Org 或 Markdown 笔记。

当前生成合同是 `ljg-is-v5`：文件名使用 `--理解-<目标>__is`，标题使用「理解：<目标>」。成品把名词的「是什么」与动词的「怎样运作」接起来，并继续给出认知修正和行动判断。

验证器检查 `definition`、`operation`、`recognition`、`guidance`、`basis` 与 `falsifier` 后台元数据，以及内容型标题、自然段数量和基础可读性。它会拦截项目符号、字段式标题、过密顿号、过多分号和超长句；它不要求虚构主人公、创造物反制或问号结尾。

这些只是确定性代理，不能证明中文已经自然。校验后仍须全文读回：读者要能区分概念、复述机制、说出旧判断怎样改变，并举出一个真正会改变行动的情境。

`ljg-is-v4`、`ljg-is-v3`、`ljg-is-v2` 和无 schema 的 legacy 笔记仍可读取验证，但不会被新工作流生成。

```bash
bun ~/.agents/skills/ljg-is/Tools/ValidateNote.ts \
  ~/Context/20260823T010203--理解-目标函数__is.org
```

成功时向 stdout 输出 `{"status":"ok", ...}` 并退出 0；失败时向 stderr 输出错误数组并退出 1；缺少文件参数时退出 2。

运行自检：

```bash
bun test ~/.agents/skills/ljg-is/Tools/ValidateNote.test.ts
```
