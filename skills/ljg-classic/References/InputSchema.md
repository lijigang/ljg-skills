# Input Schema

渲染器读取 UTF-8 JSON。最小结构：

```json
{
  "book": "道德经",
  "chapter": "第十六章",
  "heroImage": "assets/第十六章-意旨图.png",
  "heroAlt": "山谷晨雾中，万物从静处显出往复",
  "original": "致虚极，守静笃。",
  "source": "采用通行本；标点为本次整理",
  "passages": [
    {
      "tokens": [
        {
          "text": "致虚极",
          "note": "尽力使内心虚静",
          "tone": "word"
        },
        {
          "text": "，",
          "punctuation": true
        },
        {
          "text": "守静笃",
          "note": "彻底守住清静",
          "tone": "clause"
        },
        {
          "text": "。",
          "punctuation": true
        }
      ]
    }
  ],
  "interpretation": [
    "这一章先处理人的观看位置。心被眼前得失占满时，人只能跟着变化跑；把心放空并守住安静，才有机会看见变化重复出现的轨迹。",
    "这里的虚静不是发呆，而是暂时不让自己的欲望抢先替世界下结论。"
  ]
}
```

## 字段

| 字段 | 类型 | 要求 |
|---|---|---|
| `book` | string | 必填，非空；显示在页首 |
| `chapter` | string | 必填，非空；显示在书名下 |
| `heroImage` | string | 可选；本地 PNG/JPEG/WebP，绝对路径或相对 JSON 的路径；禁止 URL 与 data URI |
| `heroAlt` | string | `heroImage` 存在时必填；一句话说明可见画面和章节意旨，不重复书名章节 |
| `original` | string | 必填；锁定底本的完整原文，必须与全部 token 顺序拼接完全一致 |
| `source` | string | 可选；显示在页尾，不推断不存在的版本信息 |
| `passages` | array | 必填，至少一段 |
| `passages[].tokens` | array | 必填，按原文顺序排列 |
| `text` | string | 必填，必须保留底本原字 |
| `punctuation` | boolean | 标点设为 true；设为 true 时不要求 note |
| `note` | string | 所有非标点 token 必填 |
| `tone` | enum | 非标点必填：`word`、`clause`、`variant` |
| `pinyin` | string | 可选，只用于必要读音 |
| `interpretation` | string[] | 必填，至少一段自然中文 |

## 内容不变量

1. 按 token 顺序拼接 `text`，必须与 `original` 逐字一致。
2. `punctuation !== true` 的 token 全部有非空 `note` 和合法 `tone`。
3. `interpretation` 不是逐句翻译列表，而是完整章节解读。
4. JSON 中不放 HTML；渲染器统一转义并控制样式。
5. `heroImage` 与 `heroAlt` 成对出现；图片在渲染时编码为 data URL，HTML 不保留本地热链。
6. `interpretation` 不得出现「解读边界」；边界条件写进自然段，不显示写作脚手架。
