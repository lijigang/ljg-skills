---
name: ljg-library
description: "一本书 → 一幅清晰的「取景框」意向画面 → 一张 2050 图书馆借书卡（PNG）。取景框 = 作者从哪个角度看什么问题、看到了哪幅画面；卡上有真实封面、作者头像、书目信息。取景框 block 用费曼式讲解把这幅意向画面讲得通俗又准确；图解 block 用 AI 生图把这幅画面画出来，继刚是固定主角（从其墨像参考生成、认得出的他）。图解风格：吉田诚治式绘本感（异世界日常空间、暖光斜射、治愈又精致）。浅色光学玻璃卡身、强调色从封面动态提取、宽高自适应。合上书记住这幅画面，就没白读。Use when user says '取景框卡', '图书馆卡', 'library card', '书卡', '铸书卡', '一本书一句话一张卡', '/ljg-library', or provides a book name and wants it distilled into one collectible card. NOT FOR 拆书结构分析（用 ljg-book）、纯文字金句（用 ljg-card -b）、信息图（用 ljg-card -i）、视觉笔记（用 ljg-card -v）。"
user_invocable: true
version: "3.3.0"
---

# ljg-library：取景框借书卡

一本书铸成一张 2050 图书馆借书卡。封面、作者、书目是这张卡的身份；真正要做的事，是把这本书独创的「取景框」提炼成一幅意向画面——作者从某个角度看某个问题，看到了一幅别人没看到的画面。文字 block 把这幅画面讲透，图解 block 把它画出来。半年后瞥一眼卡，画面回来，这本书就没白读。

一张卡两块活：

- **取景框 block（文字）**：主句 `{{FRAME}}` 一句话点出这幅画面，费曼讲解 `{{EXP}}` 把它讲给聪明的外行听。`{{EXP}}` 必须走 `feynman-eli5` skill 生成，不手写。
- **图解 block（生图）**：把同一幅画面交给 `assets/gen_illustration.py` 画出来。继刚是每张图的主角——脚本把他的墨像（`assets/ljg-portrait.png`）作 character reference 喂给模型，画出认得出的他，让他在画面里亲历那个核心动作——主动做，或被动承受。风格是吉田诚治式绘本感：异世界日常空间、暖光斜射、蜜糖琥珀木棕暖调、建筑透视扎实、植物书本器物细节堆叠、魔法工房旧书店图书馆一类治愈场所，场景内自然手写中文字，继刚是栖居其中的小身形人物。风格已写死在脚本里，frame 只写画什么。

文字和图讲的必须是同一幅画面。提炼失手，这张卡就只是一张豆瓣读书卡。

输出只有 PNG，不产文字笔记。

## 动手前先读两份 reference

- `references/extraction.md` — 怎么从书里提炼意向画面、怎么写生图 frame。提炼是六步：对象、角度、旧画面、意向画面、费曼讲解、校验。继刚若已把想法想透（读完顺手铸卡是常态），直接用他的：只走校验和画图，不重新提炼。
- `references/visual.md` — 卡身规格、配色、字体、出厂自检。

## 流程

```
输入：书名（或 书名 + 已想透的取景框思想）
  ↓
1. weread 取真封面 + 书目（见「素材获取」）
2. web 抓作者头像
3. 提封面主色 → 卡身强调色（python3 assets/extract_color.py <封面>）
4. 提炼意向画面（用户给了→校验；没给→extraction.md 六步）
5. {{FRAME}} 主句 + {{EXP}} 费曼讲解（走 feynman-eli5）
6. 写 frame（英文构图：继刚在做什么、隐喻物件、信息流向、3-5 个中文标注每个 ≤5 字），生图：
   python3 assets/gen_illustration.py --frame "<...>" --out /tmp/ljg_lib_{slug}_sketch.png
7. 填 assets/library_template.html 占位变量（{{SKETCH_IMG}} = file://生成图）
8. 渲染（capture.js，fullpage）
9. Read 成品 PNG 亲眼验，不满意调 frame 重生，然后交付
```

## 素材获取

### 封面 + 书目

继刚有微信读书，先走 weread skill 的 `/store/search`（用前 Read `~/.claude/skills/weread/search.md`）：

```bash
curl -s -X POST "https://i.weread.qq.com/api/agent/gateway" \
  -H "Authorization: Bearer $WEREAD_API_KEY" -H "Content-Type: application/json" \
  -d '{"api_name":"/store/search","keyword":"<书名>","scope":10,"skill_version":"1.0.3"}'
```

回包 `results[].books[].bookInfo`（每个 result 一本）里有 `title / author / translator / cover / publisher`。cover URL 默认是 `s_` 缩略图（70×100，放进卡里必糊），把 `s_` 换成 `t7_` 拿 285×411 高清：`.../cover/942/635942/t7_635942.jpg`。下载带 `-H "Referer: https://weread.qq.com/"`。

weread 搜不到时按书的类型降级：

- 中文书 / 得到课程类图书 → 豆瓣封面，用 `l/public` 大图路径（`s/public` 小图会糊）
- 外文学术书 → OpenLibrary：`https://openlibrary.org/search.json?q=<书名>` 拿 `cover_i`，再走 covers CDN `https://covers.openlibrary.org/b/id/<cover_i>-L.jpg`
- 都没有 → CSS 占位书封，不阻塞

### 作者头像

维基百科原图最稳，Wikipedia API 直接拿 original 图 URL：

```bash
curl -s -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" \
  "https://en.wikipedia.org/w/api.php?action=query&titles=<英文名>&prop=pageimages&piprop=original&format=json"
# 拿到 .original.source 后下载（同样带 UA）：
curl -sL -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" -o /tmp/ljg_lib_{slug}_avatar.jpg "<original-url>"
```

注意 thumb 路径（`/thumb/.../480px-xxx.jpg`）在该尺寸未缓存时会返回 HTML 错误页——用原图路径（去掉 `/thumb/` 和尺寸段），并且必须带 User-Agent，缺 UA 会被 Wikimedia 拦。

降级：英文维基没有 → 维基 REST summary（`/api/rest_v1/page/summary/<名字>`）→ 中文人物走百度百科 → 都没有就省略头像（模板作者行自动不显示 avatar），不阻塞。

### 主角参考图

`assets/ljg-portrait.png` 是继刚的真头像抠底墨像，`gen_illustration.py` 自动把它作 character reference 喂给模型。生成的是模型按吉田诚治风格画出来的他——认得出即可，不追求像素级同一张脸。头像要更新，换这个 png 就行。

### 卡身强调色

```bash
python3 assets/extract_color.py /tmp/ljg_lib_{slug}_cover.jpg
# 输出形如：#c43d30
```

从封面提取最显著的彩色作卡身强调色，换书自动换色：红封红卡、蓝封蓝卡。两种情况要自己动手调：封面主体是大面积米灰背景时，脚本会挑出发闷的背景色，改按「鲜艳度 × 频次」重排，从真实像素里挑一个撑得住的彩色，别凭空写死；封面色很亮时压深半档，在浅色卡身上才读得清。强调色只管卡身（标签、英文行、关键词高亮、署名印），图解板的配色是生成图自带的，两边互不干扰。挑暖色（棕、橙、绿）更配那块暖调插画。

## 模板变量（library_template.html）

| 变量 | 内容 |
|------|------|
| `{{ACCENT}}` | 卡身强调色 hex（从封面提取） |
| `{{COVER}}` | 封面的 `file://` 绝对路径 |
| `{{AVATAR_IMG}}` | 整个头像 `<img class="avatar" src="file://…">`（无头像填空字符串） |
| `{{TITLE}}` `{{EN}}` `{{SUBTITLE}}` | 书名中 / 英 / 副标题 |
| `{{TAGS}}` | 3-4 个主题标签，每个 `<span class="tag">…</span>` |
| `{{AUTHOR_CN}}` `{{AUTHOR_META}}` | 作者中文名 / 「英文名 · 出版社 年份」 |
| `{{FRAME}}` | 意向画面主句，关键词用 `<span class="hl">…</span>` 染强调色 |
| `{{EXP}}` | 费曼讲解（feynman-eli5 产物），关键词同样染色 |
| `{{SKETCH_TITLE}}` | 图解板名字（英文 + 中文，如 `Ergodicity 遍历性`） |
| `{{SKETCH_IMG}}` | 生成插画的 `file://` 绝对路径 |

## 渲染

```bash
node ~/.claude/skills/ljg-card/assets/capture.js \
  /tmp/ljg_library_{name}.html ~/Downloads/{name}.png 1080 1440 fullpage
```

复用 ljg-card 的 capture.js（playwright 装在 ljg-card/node_modules）。`fullpage` 不能省——卡片高度跟内容走，省了会留底部空白。`file://` 引用的本地封面、头像可直接渲染。

## 交付

1. Read 成品 PNG 亲眼验，图解板放大看。对照 visual.md 的出厂自检：封面加载、讲解把画面讲透、卡身色协调、继刚认得出、画面一眼读懂、中文标注无糊、图文同一幅画面、右侧无豁口、底部无留白。生图不满意就调 frame 重生。
2. 报告文件路径，加一句意向画面的提炼说明。

## Gotchas

- **封面尺寸**：weread `s_` 是 70×100 缩略图，必糊。换 `t7_`（285×411），下载带 `Referer`。
- **头像 thumb 陷阱**：Wikimedia `/thumb/.../NNNpx-` 未缓存返回 HTML 错误页。用原图路径，带 User-Agent。
- **生图必看图**：同一个 frame 每次出的图都不一样，gemini 会糊中文标注、把继刚画得不像、画错动作。每次生成后必 Read 亲验，不行调 frame 重生。重生前把当前这张先存到别的路径——新的未必比旧的好，别把能用的覆盖没了。
- **中文标注 ≤5 字**：长标注和生僻字容易糊。每个标注压到 5 字以内，机制细节让正文扛，别指望画里写清。
- **frame 里标注用分号或顿号分隔**：` / ` 分隔中文标注会被安全钩子误判成危险命令而 BLOCK，不用斜杠。
- **frame 要具体可画**：写清继刚亲历的动作、真实隐喻物件、信息怎么流。抽象命题画不出来——回到意向画面，把它落成可见的物和动作（见 extraction.md）。
- **主角风格化，不追同一张脸**：从墨像参考生成，认得出即可。不做真墨像贴脸合成。
- **两套色不串**：卡身强调色从封面提取；图解板背景是生成图自带的。
- **/tmp 文件名带 slug**：并行铸卡时生成图、封面、头像都用唯一路径（带书 slug），共享固定名会串图。
- **生图成本**：`gen_illustration.py` 直调 marswave gemini-3-pro，不走 listenhub 的交互门控。每张都要联网、花 API 额度、亲眼验一回图，比纯模板慢，批量排任务时留余地。
- **{{FRAME}} 写的是看法怎么被改动，不是内容摘要**：句式是「原来不是 X，其实是 Y」，不写「本书讲了什么」。检验：删掉书名和作者，这句话还能独立站住，才算提炼到位。
