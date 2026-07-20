#!/usr/bin/env bash
# init.sh — fix-ljg-org-to-md 的确定性批处理部分
# Usage: bash init.sh <MD_SAVE_DIR> <AUTHOR_NAME> <LOGO_PATH>
#   传空串 "" 表示 AUTHOR_NAME / LOGO_PATH 不显示
# 由 SKILL.md 的 Step 3 调用；LLM 只负责 Step 1-2 询问和 Step 4 语义判断残留

set -euo pipefail

if [ $# -lt 3 ]; then
  echo "Usage: bash init.sh <MD_SAVE_DIR> <AUTHOR_NAME> <LOGO_PATH>" >&2
  echo "  MD_SAVE_DIR 必须以 / 结尾" >&2
  echo "  AUTHOR_NAME / LOGO_PATH 传空串 \"\" 表示留空" >&2
  exit 1
fi

MD_SAVE_DIR="$1"
AUTHOR_NAME="$2"
LOGO_PATH="$3"

case "$MD_SAVE_DIR" in
  */) ;;
  *) echo "ERROR: MD_SAVE_DIR 必须以 / 结尾" >&2; exit 1 ;;
esac

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "SKILLS_DIR  = $SKILLS_DIR"
echo "MD_SAVE_DIR = $MD_SAVE_DIR"
echo "AUTHOR_NAME = ${AUTHOR_NAME:-(empty)}"
echo "LOGO_PATH   = ${LOGO_PATH:-(empty)}"
echo

# 便携 in-place sed（macOS BSD / Linux GNU / Git Bash 都能用）
sed_inplace() {
  local file="$1"; shift
  local tmp="${file}.tmp.$$"
  sed "$@" "$file" > "$tmp" && mv "$tmp" "$file"
}

# 跳过清单
skip_file() {
  case "$1" in
    *.bak-v*) return 0 ;;
    */fix-ljg-org-to-md/*) return 0 ;;
    */ljg-roundtable/references/original-prompt.md) return 0 ;;
    */ljg-push/Tools/*) return 0 ;;
    */package-lock.json) return 0 ;;
    */.git/*) return 0 ;;
  esac
  return 1
}

# ==================== 1. md 保存目录 ====================
echo "[1/5] md 保存目录 → $MD_SAVE_DIR"
find "$SKILLS_DIR" -type f \( -name '*.md' -o -name '*.html' \) -print0 \
  | while IFS= read -r -d '' f; do
      skip_file "$f" && continue
      if grep -q '~/Documents/notes/' "$f"; then
        sed_inplace "$f" "s|~/Documents/notes/|$MD_SAVE_DIR|g"
        echo "  changed: ${f#$SKILLS_DIR/}"
      fi
    done

# ==================== 2. 作者署名 ====================
echo "[2/5] 作者署名 → ${AUTHOR_NAME:-(empty)}"

# 2-A HTML 模板：<span>李继刚</span> → <span>$AUTHOR_NAME</span>
AUTHOR_HTML_FILES=(
  "$SKILLS_DIR/ljg-card/assets/big_template.html"
  "$SKILLS_DIR/ljg-card/assets/comic_template.html"
  "$SKILLS_DIR/ljg-card/assets/infograph_template.html"
  "$SKILLS_DIR/ljg-card/assets/long_template.html"
  "$SKILLS_DIR/ljg-card/assets/poster_template.html"
  "$SKILLS_DIR/ljg-card/assets/whiteboard_template.html"
  "$SKILLS_DIR/ljg-card/assets/sketchnote_template.html"
  "$SKILLS_DIR/ljg-map/assets/map_template.html"
  "$SKILLS_DIR/ljg-library/assets/library_template.html"
)
for f in "${AUTHOR_HTML_FILES[@]}"; do
  [ -f "$f" ] || continue
  if grep -q '李继刚' "$f"; then
    sed_inplace "$f" "s|>李继刚<|>${AUTHOR_NAME}<|g"
    echo "  changed: ${f#$SKILLS_DIR/}"
  fi
done

# 2-B markdown 文件里的说明性用法
if [ -n "$AUTHOR_NAME" ]; then
  # 非空：整体替换
  find "$SKILLS_DIR" -type f -name '*.md' -print0 \
    | while IFS= read -r -d '' f; do
        skip_file "$f" && continue
        if grep -q '李继刚' "$f"; then
          sed_inplace "$f" "s|李继刚|$AUTHOR_NAME|g"
          echo "  changed: ${f#$SKILLS_DIR/}"
        fi
      done
else
  # 空：先处理已知语境防止残留空格
  find "$SKILLS_DIR" -type f -name '*.md' -print0 \
    | while IFS= read -r -d '' f; do
        skip_file "$f" && continue
        if grep -q '李继刚' "$f"; then
          sed_inplace "$f" \
            -e 's|logo + 李继刚|logo|g' \
            -e 's|署名：印 李继刚|署名：印|g' \
            -e 's| 李继刚||g' \
            -e 's|李继刚||g'
          echo "  changed: ${f#$SKILLS_DIR/}"
        fi
      done
fi

# ==================== 3. logo (capture.js) ====================
echo "[3/5] logo → ${LOGO_PATH:-(empty)}"
CAPTURE="$SKILLS_DIR/ljg-card/assets/capture.js"
if [ -f "$CAPTURE" ]; then
  sed_inplace "$CAPTURE" "s|const logoUrl =.*|const logoUrl = '${LOGO_PATH}';|"
  echo "  changed: ${CAPTURE#$SKILLS_DIR/}"
fi

# ==================== 4. 文件名扩展 __xxx.org → __xxx.md ====================
echo "[4/5] denote 文件扩展 __*.org → __*.md"
find "$SKILLS_DIR" -type f \( -name '*.md' -o -name '*.html' \) -print0 \
  | while IFS= read -r -d '' f; do
      skip_file "$f" && continue
      if grep -qE '__[a-zA-Z]+\.org\b' "$f"; then
        sed_inplace "$f" -E 's|__([a-zA-Z]+)\.org\b|__\1.md|g'
        echo "  changed: ${f#$SKILLS_DIR/}"
      fi
    done

# ==================== 5. 输出格式声明 ====================
echo "[5/5] 输出格式声明 org → markdown"
find "$SKILLS_DIR" -type f -name '*.md' -print0 \
  | while IFS= read -r -d '' f; do
      skip_file "$f" && continue
      if grep -qE 'org 格式|org格式|以 org 输出|输出 org' "$f"; then
        sed_inplace "$f" \
          -e 's|org 格式|markdown 格式|g' \
          -e 's|org格式|markdown 格式|g' \
          -e 's|以 org 输出|以 markdown 输出|g' \
          -e 's|输出 org|输出 markdown|g'
        echo "  changed: ${f#$SKILLS_DIR/}"
      fi
    done

# ==================== 验证 ====================
echo
echo "=== 残留检查（跳过清单外） ==="

echo "[a] ~/Documents/notes/ 残留："
if grep -rn '~/Documents/notes/' "$SKILLS_DIR" 2>/dev/null \
     --include='*.md' --include='*.html' \
     | grep -vE '\.bak-v|fix-ljg-org-to-md'; then
  echo "  ↑ 需 LLM 判断"
else
  echo "  无"
fi

echo "[b] 李继刚 残留："
if grep -rn '李继刚' "$SKILLS_DIR" 2>/dev/null \
     | grep -vE '\.bak-v|fix-ljg-org-to-md|original-prompt'; then
  echo "  ↑ 需 LLM 判断"
else
  echo "  无"
fi

echo "[c] org 头块 (#+title/#+date/#+filetags) 残留（可能需转 YAML frontmatter）："
if grep -rEn '^#\+(title|date|filetags|subtitle|identifier|source|authors|author):' "$SKILLS_DIR" 2>/dev/null \
     --include='*.md' --include='*.org' \
     | grep -vE '\.bak-v|fix-ljg-org-to-md|ljg-push|ljg-present'; then
  echo "  ↑ 需 LLM 手工转 YAML frontmatter"
else
  echo "  无"
fi

echo "[d] 独立 .org 文件（可能需 orgfile_to_md 转换）："
if find "$SKILLS_DIR" -type f -name '*.org' -not -name '*.bak-v*' 2>/dev/null | grep .; then
  echo "  ↑ 参考 ljg-push/Tools/Push.sh 的 orgfile_to_md"
else
  echo "  无"
fi

echo
echo "init.sh 完成。"
