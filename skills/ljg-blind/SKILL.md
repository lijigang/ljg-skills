---
name: ljg-blind
description: 盲区扫描——读昨天你与 AI 的全部对话，照出暴露的思维盲区（不是不懂的知识，是让某类真相一直看不见的思维习惯），再从微信读书挑一本书的一章精准补上，落成一篇完整分析笔记。Use when user says '扫盲区', '盲区', '照盲区', '看看我的思维盲区', '我昨天想漏了什么', 'blind spot', 'ljg-blind', '/ljg-blind', or wants yesterday's AI conversations analyzed for cognitive blind spots plus a targeted weread chapter to fill them. 可选参数：传一个日期(YYYY-MM-DD)扫那天而非昨天。NOT FOR 纵向深钻一个观点（用 ljg-think）、一个领域降秩（用 ljg-rank）、陪读一篇文本（用 ljg-read）、找一个领域的约束（用 ljg-constraint）。
user_invocable: true
---

# 盲区扫描

读你昨天跟 AI 的全部对话，照出那个你自己看不见的思维盲区，从微信读书点亮补它的一章。

## 盲区是什么

盲区不是知识缺口。不是"没读过某本书""不知道某个事实"——那种缺口，查一下就补上了。

盲区是一种结构性的思维习惯，它让某一类真相对你**系统性地不可见**。你不是想不到，是这个习惯让你压根没往那个方向看。它藏在你怎么想事情的方式里，不藏在你想的内容里。

所以证据不在"他说错了什么"。在——他没往哪看，他在哪绕了，他默认了什么却从没检。

## 五种盲区信号

从昨天的对话里找这五种。每一种都要落到具体的话上，不能凭感觉。

1. **绕开点**——一个难题他打开了，又飞快合上。证据：问题抛出，转头换话题，或一句"这个先不管"滑过去。
2. **空转框架**——反复换视角切同一个问题，没有一个落地。证据：一个问题被套上三四副框架，每副都浅尝辄止，最后没结论。
3. **单一取景框**——一整天只调用一两副 f（逢事就"约束""进化""博弈"），没试过别的镜子。这是他最隐蔽的盲区：越趁手的 f，越挡住别的 f 能照见的东西。（继刚看世界 = f(x)，四轴是他默认的四副 f；正因为默认，才最该查他今天是不是又只用了其中一副。）
4. **未检前提**——一个默认假设贯穿全程，他当硬约束在用，从没问过它是不是假墙。证据：某个"本来就该这样"的说法，反复出现却从未被他自己质疑。
5. **相邻空缺**——从他问的东西反推，本该问、却没问的那个角落。不是凭空猜，是他自己的线索指向那儿。

## 选哪一个

从信号里挑 **1 个**作为今天的盲区。宁可一个说透，不要五个都点一遍——盲区的密度低于精度。判据三条：

- **杠杆**——补上它，下一步打开的可能性最多。
- **真盲**——是他自己看不见的，不是知道了在拖的。
- **对位 mission**——贴 M0（找新取景框）/ M1（求本质）。盲区若正好挡在他的主线上，优先。读 `~/.claude/PAI/USER/TELOS/MISSION.md` 确认主线。

---

## 操作步骤

### 第一步 · 定日期

```bash
# 默认昨天；用户传了 YYYY-MM-DD 就用那天（macOS BSD date）
target=${1:-$(date -v-1d +%Y-%m-%d)}
```

### 第二步 · 捞当天的对话

会话文件在 `~/.claude/projects/-Users-lijigang*/*.jsonl`，每行一条消息（type=user / assistant / system）。只要继刚的真人发言，滤掉工具回显和子 agent 噪声：

```bash
target=<上一步的日期>
out=/tmp/ljg-blind-${target}.txt
: > "$out"
# 只取顶层会话文件（排除 subagents/workflows），只留真人纯文本
for f in $(rg -l "\"timestamp\":\"${target}" ~/.claude/projects/-Users-lijigang*/ 2>/dev/null | grep -vE 'subagents/|workflows/'); do
  jq -r 'select(.type=="user" and ((.timestamp // "") | startswith("'"${target}"'"))) |
    (.message.content) as $c |
    (if ($c|type)=="string" then $c
     elif ($c|type)=="array" then ([$c[] | select(.type=="text") | .text] | join(" "))
     else "" end) as $t |
    select($t|length>0) |
    "[" + (.timestamp|.[11:16]) + "] " + $t' "$f" 2>/dev/null >> "$out"
done
# 滤掉工具回显 / 系统噪声 / 本次调用请求自身
grep -vE 'tool_use_id|system-reminder|caveat|Caveat|local-command|command-name|command-message|<task-notification>|ljg-blind|扫盲区' "$out" > "${out}.f" && mv "${out}.f" "$out"
wc -c "$out"
```

材料若 >50KB，按对话分段读，先识别每段在讨论什么主题，再往下看。可辅助看几条相邻的 assistant 回复定上下文。

**数据稀薄兜底**：当天真人输入 <200 字或没有对话——直接在输出里写明「当天对话稀薄 / 无」，**不强造盲区**。宁可交白卷，不许编。

### 第三步 · 读出盲区

按上面「五种盲区信号」过一遍，每命中一处都记下证据（哪几句话、什么转折让你看出来的）。然后按「选哪一个」的三条判据，选出 1 个最要紧的盲区。

### 第四步 · 微信读书选章

调 weread skill（`WEREAD_API_KEY` 在环境变量里，格式 `wrk-xxxx`；若没有，提示 `export WEREAD_API_KEY=<key>`）。三步：

1. **搜书**——从盲区里抽 1-2 个核心词当 keyword：

```bash
curl -s -X POST https://i.weread.qq.com/api/agent/gateway \
  -H "Authorization: Bearer $WEREAD_API_KEY" -H "Content-Type: application/json" \
  -d '{"api_name":"/store/search","keyword":"<核心词>","count":8,"skill_version":"1.0.3"}' \
  | jq -r '.results[].books[]?.bookInfo | "\(.bookId)\t\(.title)\t\(.author)\t评分\(.newRating)"'
```

从返回里挑评分尽量 ≥750（新版评分是 ×100，即 7.5）、且最贴盲区的 1 本，记 bookId。评分不是唯一标准——对症 > 高分，一本 7.4 但正打在盲区上，胜过一本 8.5 但擦边的。

2. **看目录**——挑最对症那 **1 章**，不是整本、不是序章泛泛：

```bash
curl -s -X POST https://i.weread.qq.com/api/agent/gateway \
  -H "Authorization: Bearer $WEREAD_API_KEY" -H "Content-Type: application/json" \
  -d '{"api_name":"/book/chapterinfo","bookId":"<bookId>","skill_version":"1.0.3"}' \
  | jq -r '.chapters[] | select(.level<=2) | "\(.chapterUid)\t[\(.level)] \(.title)\t\(.wordCount)字"'
```

记 chapterUid、章节标题、wordCount。

3. **估时长**——`wordCount / 280`（中文阅读速度）向上圆到 5 的倍数。无 wordCount 就按目录感觉在 15-45 分钟之间估一个；标题带「上篇/下篇」「卷一」这类宏观词，时长再 ×1.5。

4. **构造网页版链接**——微信读书网页阅读器不接受裸 `bookId` / `chapterUid`，必须先编码。用技能自带工具生成：

```bash
bun "${HOME}/.agents/skills/ljg-blind/Tools/WeReadWebUrl.ts" "<bookId>" "<chapterUid>"
```

工具输出形如：

```text
https://weread.qq.com/web/reader/{encodedBookId}k{encodedChapterUid}
```

把输出的完整 URL 写进笔记。不要手拼编码值，也不要把裸 ID 直接塞进 `/web/reader/`。

**兜底**：搜索全空 / 没对症章节 → 选整本相关书，只传 bookId 生成网页版书籍入口：

```bash
bun "${HOME}/.agents/skills/ljg-blind/Tools/WeReadWebUrl.ts" "<bookId>"
```

文里说明为什么没能精准到章。

### 第五步 · 写笔记

获取时间戳：`date +%Y%m%dT%H%M%S` 和 `date "+%Y-%m-%d %a %H:%M"`（时间用当前，不是 target）。

写入 `~/Documents/notes/{时间戳}--盲区-{主题}__blind.org`。org-mode 格式，禁止 markdown 语法。

正文模板：

```org
#+title: 盲区扫描 · {一句话点出这个盲区}
#+date: [YYYY-MM-DD Weekday HH:MM]
#+filetags: :blind:weread:topology:

* 昨天你在想什么
<1-2 段。当天对话的思维地形——哪几件事、绕着哪个核心在转。给证据：哪几句话看出来的。不流水账，抓主线。>

* 照出来的盲区
<挑出的那 1 个盲区。先一句话点破它是哪种（绕开点 / 空转框架 / 单一取景框 / 未检前提 / 相邻空缺）。再 2-3 段说清：它具体长什么样、昨天哪几处暴露了它、为什么你自己看不见。要点到杠杆——补上之后会打开什么。>

* 这一章给你
- 书：《书名》 — 作者
- 章节：<章节标题>
- 时长：约 N 分钟
- 链接：[[https://weread.qq.com/web/reader/ENCODED_BOOKkENCODED_CHAPTER][在微信读书网页版阅读本章]]
- 为什么是它：<3-4 句。把盲区和这一章对上——这章具体讲什么、怎么补这个盲区。不要泛泛说"开阔视野"，要说清这一章的哪个东西正对这个盲区的哪个缺口。>
```

报告文件路径给用户。

---

## 语气规则（写笔记时守住）

这篇笔记是写给一个跟你长期一起思考的人的，不是报告，不是陌生读者。

- **中文写作，禁翻译腔**。少用「然而 / 此外 / 值得注意的是」；少用名词化（「对…的理解」→「懂…」，「做出…的决定」→「决定」）；主语能省则省；短句优先。写完默念一遍，问：一个没读过翻译小说的中国人会这么说吗？汪曾祺会这么写吗？卡的地方整段重写，不是换个词。
- **禁切痕风金属比喻**。不写「这一刀」「再狠一层」「锋利的话」「砸实」「钉死」「硬话」这一整套自夸元修辞。盲区照得准不准，读者看得出，不用作者吆喝力度。
- **有温度、有毛刺、有判断**。可以有立场，别装中立到虚伪；但标清楚这是判断，不是客观事实。

## org 严格语法（禁混 markdown）

- 标题用 `*` / `**` / `***`，不要 `#`
- 加粗 `*字*`，斜体 `/字/`，等宽 `~code~`
- 列表用 `-`，不要 `*`（`*` 在 org 是标题）
- 链接 `[[url][text]]`，不要 `[text](url)`
- 分隔线 `-----`，不要 `---`；不要 markdown 的 `>` 引用

## 自检（写完前过一遍）

- 盲区有具体证据吗？每一处都能指到昨天哪几句话？没有就退回第三步。
- 只选了 1 个盲区、说透了吗？还是贪多点了三四个？
- 章节链接以 `https://weread.qq.com/web/reader/` 开头，并由工具用非空 bookId、chapterUid 生成？
- 全文没有残留只能唤起移动 App 的专用协议链接？
- 翻译腔查了吗？名词化、「是…的」句、可省的连词，扫一遍。
- 切痕风金属比喻查了吗？「这一刀」「钉死」「砸实」一个不留。
- 三段都有内容、不空段？

## Gotchas

- **网页版 reader 路径使用编码 ID。** `https://weread.qq.com/web/reader/573976?chapterUid=13` 会返回 404；必须用 `Tools/WeReadWebUrl.ts` 分别编码 bookId 与 chapterUid，再用 `k` 连接。
- **章节定位不放在 query 参数。** 正确形态是 `/web/reader/{encodedBookId}k{encodedChapterUid}`；省掉章节编码只会打开整本书入口。

## 和「早信」的分工

Pulse 每天早上有个自动早信（`陈平安思维拓扑.org`），是陈平安的口气、每天一封、挑一个洞。ljg-blind 是**随手调**的分析版——同一套「读昨天 → 看盲区 → weread 选章」的底子，但更系统、专照盲区、分析写得更足，而且能扫任意一天（传日期参数）。想要一封信，等早信；想主动查某天的盲区、要一篇能存档的分析，用 ljg-blind。
