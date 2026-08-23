#!/bin/bash
# ljg-push: sync updated ljg-* skills to github repo (ljg-skills),
# pushing to master (org-mode style) then md (markdown style).
#
# Usage:
#   bash Push.sh             # detect + push both branches
#   bash Push.sh --dry-run   # show what would happen, don't push
#   bash Push.sh --force     # skip detect, sync all ljg-* skills

set -euo pipefail

# === Configuration (HARDCODED) ===
SKILLS_REPO="$HOME/code/ljg-skills"
SKILLS_LOCAL="$HOME/.agents/skills"
REPO_URL="git@github.com:lijigang/ljg-skills.git"

# === Args ===
DRY_RUN=0
FORCE=0
SKIP_README_CHECK=0
for arg in "$@"; do
  case "$arg" in
    --dry-run)            DRY_RUN=1 ;;
    --force)              FORCE=1 ;;
    --skip-readme-check)  SKIP_README_CHECK=1 ;;
    *) echo "Unknown arg: $arg" >&2; exit 2 ;;
  esac
done

# dry-run implicitly bypasses README hard-gate (so users still see the warning
# but don't have to fix it before the dry-run can complete)
if [ "$DRY_RUN" = "1" ]; then
  SKIP_README_CHECK=1
fi

# === Helpers ===

log()  { printf '\033[36m%s\033[0m\n' "$*"; }
ok()   { printf '\033[32m✓ %s\033[0m\n' "$*"; }
warn() { printf '\033[33m! %s\033[0m\n' "$*"; }
err()  { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; }

# Detection and synchronization share this exact file-tree boundary:
#   - content is compared by checksum, so mtime-only drift is ignored
#   - regular-file permissions are mirrored, while detection only treats the
#     executable bit as Git-material
#   - directory-only changes are ignored by detection
#   - dependency/VCS trees and Finder metadata are out of scope
# Deliberately do not add broad backup patterns here: .bak/.backup files are
# publishable content and must remain visible to both detection and sync.
RSYNC_SCOPE_ARGS=(
  --recursive
  --links
  --checksum
  --perms
  --delete
  --exclude='.git/'
  --exclude='node_modules/'
  --exclude='.DS_Store'
)

rsync_skill_tree() {
  local source_dir="$1"
  local target_dir="$2"
  shift 2
  rsync "${RSYNC_SCOPE_ARGS[@]}" "$@" "$source_dir/" "$target_dir/"
}

# Ignore directory-only and timestamp-only records. For a permission-only file
# record, compare the one mode bit Git tracks: executability.
rsync_has_material_changes() {
  local source_dir="$1"
  local target_dir="$2"
  local change_code relative_path deletion_path source_exec target_exec

  while IFS='|' read -r change_code relative_path; do
    [ -n "$change_code" ] || continue
    if [[ "$change_code" == \*deleting* ]]; then
      deletion_path="$relative_path"
      [ -n "$deletion_path" ] || deletion_path=${change_code#\*deleting }
      [[ "$deletion_path" == */ ]] || return 0
      continue
    fi
    [ "${change_code:1:1}" = "d" ] && continue
    # macOS ships Bash 3.2, where backslashes on an unquoted `=~` RHS are
    # consumed before regex matching. The old regex therefore treated content
    # codes such as `>fcsT....` as timestamp-only. Match rsync's exact
    # nine-character timestamp records instead.
    if [ "$change_code" = ".f..t...." ] || [ "$change_code" = ".f..T...." ]; then
      continue
    fi

    if [ "${change_code:1:1}" = "f" ] \
        && [[ "$change_code" == *p* ]] \
        && [[ "$change_code" != *c* ]] \
        && [[ "$change_code" != *s* ]] \
        && [[ "$change_code" != *+* ]]; then
      source_exec=0
      target_exec=0
      [ -x "$source_dir/$relative_path" ] && source_exec=1
      [ -x "$target_dir/$relative_path" ] && target_exec=1
      [ "$source_exec" != "$target_exec" ] && return 0
      continue
    fi

    return 0
  done
  return 1
}

setup_repo() {
  if [ ! -d "$SKILLS_REPO" ]; then
    log "Cloning $REPO_URL → $SKILLS_REPO"
    mkdir -p "$(dirname "$SKILLS_REPO")"
    git clone "$REPO_URL" "$SKILLS_REPO"
    return
  fi
  # Verify it's the right repo
  local actual
  actual=$(cd "$SKILLS_REPO" && git remote get-url origin 2>/dev/null || echo "")
  if [[ "$actual" != *"lijigang/ljg-skills"* ]]; then
    err "$SKILLS_REPO exists but origin is '$actual', not ljg-skills."
    err "Fix: move/remove $SKILLS_REPO and re-run."
    exit 1
  fi
}

# Detect skills with content differences (local vs repo).
# Echoes one skill name per line.
detect_updates() {
  for local_skill in "$SKILLS_LOCAL"/ljg-*; do
    [ -d "$local_skill" ] || continue
    # A prefixed workspace/eval directory is not a publishable skill unless its
    # root contains the skill entrypoint. This keeps benchmark snapshots such as
    # ljg-book-workspace out of README checks, rsync, commits, and releases.
    [ -f "$local_skill/SKILL.md" ] || continue
    local name
    name=$(basename "$local_skill")
    local repo_skill="$SKILLS_REPO/skills/$name"
    if [ ! -d "$repo_skill" ]; then
      echo "$name"
    else
      local changes
      changes=$(rsync_skill_tree "$local_skill" "$repo_skill" \
        --dry-run --itemize-changes --out-format='%i|%n%L')
      if rsync_has_material_changes "$local_skill" "$repo_skill" <<< "$changes"; then
        echo "$name"
      fi
    fi
  done
}

# List all ljg-* skills in local (force mode).
list_all_local() {
  for local_skill in "$SKILLS_LOCAL"/ljg-*; do
    [ -d "$local_skill" ] || continue
    [ -f "$local_skill/SKILL.md" ] || continue
    local name
    name=$(basename "$local_skill")
    echo "$name"
  done
}

# Bump patch version in plugin.json + marketplace.json. Echoes new version.
bump_version() {
  local plugin=".claude-plugin/plugin.json"
  local marketplace=".claude-plugin/marketplace.json"
  local current major minor patch new
  current=$(grep -m1 '"version"' "$plugin" | sed 's/.*"\([0-9]*\.[0-9]*\.[0-9]*\)".*/\1/')
  major=$(echo "$current" | cut -d. -f1)
  minor=$(echo "$current" | cut -d. -f2)
  patch=$(echo "$current" | cut -d. -f3)
  new="$major.$minor.$((patch + 1))"
  sed -i '' "s/\"version\": \"$current\"/\"version\": \"$new\"/" "$plugin"
  sed -i '' "s/\"version\": \"$current\"/\"version\": \"$new\"/" "$marketplace"
  echo "$new"
}

# Convert one org file to a markdown sibling.
#   - Leading #+key: header block → YAML frontmatter (--- fenced, filetags → tags)
#   - Headings: * → #, ** → ## (level-preserving)
#   - #+ATTR_* lines dropped; #+begin_src/#+end_src → ``` fences
#   - [[file:path]] → ![](path)
orgfile_to_md() {
  local src="$1" dst="$2"
  awk '
    BEGIN { inhdr = -1 }   # -1 not started, 1 inside header, 0 closed
    /^#\+[A-Za-z_]+:/ && inhdr != 0 {
      if (inhdr == -1) { print "---"; inhdr = 1 }
      line = $0
      sub(/^#\+/, "", line)
      key = line; sub(/:.*/, "", key); key = tolower(key)
      val = line; sub(/^[A-Za-z_]+:[ \t]*/, "", val)
      if (key == "filetags") {
        gsub(/:/, " ", val); gsub(/^[ \t]+|[ \t]+$/, "", val)
        printf "tags: %s\n", val
      } else {
        printf "%s: %s\n", key, val
      }
      next
    }
    { if (inhdr == 1) { print "---"; inhdr = 0 } }
    /^#\+ATTR/ { next }
    /^# / {
      line = $0
      sub(/^# /, "", line)
      print "<!-- " line " -->"
      next
    }
    /^#\+begin_src/ { sub(/^#\+begin_src[ \t]*/, "```"); print; next }
    /^#\+end_src/ { print "```"; next }
    /^#\+begin_quote/ { next }
    /^#\+end_quote/ { next }
    /^\*+ / {
      n = 0; while (substr($0, n + 1, 1) == "*") n++
      hashes = ""; for (i = 0; i < n; i++) hashes = hashes "#"
      print hashes substr($0, n + 1)
      next
    }
    {
      line = $0
      while (match(line, /\[\[file:[^]]+\]\]/)) {
        path = substr(line, RSTART + 7, RLENGTH - 9)
        line = substr(line, 1, RSTART - 1) "![](" path ")" substr(line, RSTART + RLENGTH)
      }
      print line
    }
  ' "$src" > "$dst"
}

# Apply markdown-ization to a skill directory.
#   1. Every *.org file → converted *.md sibling (orgfile_to_md), .org removed,
#      references to the renamed file rewritten across Markdown and runtime text files.
#   2. String swaps in all *.md files (assets/ excluded):
#      - File-extension refs: __qa.org → __qa.md, etc.
#      - Keywords: org-mode → markdown
#      - Org-style format instructions: *bold* rule, heading-level rule,
#        "Org 文件头", #+title:-style example lines → YAML keys
#      - Org emphasized bullet labels: - *标签*： → - **标签**：
# Does NOT touch: *bold* markers inside prose (markdown italics ambiguity).
mdize_skill() {
  local skill_dir="$1"

  # 1) org files → md siblings
  local orgfiles=() renames=()
  while IFS= read -r f; do orgfiles+=("$f"); done < <(find "$skill_dir" -name '*.org' -not -path '*/assets/*' 2>/dev/null)
  local org
  for org in ${orgfiles[@]+"${orgfiles[@]}"}; do
    orgfile_to_md "$org" "${org%.org}.md"
    rm "$org"
    renames+=("$(basename "$org")")
  done

  # 2) string swaps across all md files
  local files=()
  while IFS= read -r f; do files+=("$f"); done < <(find "$skill_dir" -name '*.md' -not -path '*/assets/*' 2>/dev/null)
  local file r skill_name preserve_crlf
  skill_name=$(basename "$skill_dir")
  for file in ${files[@]+"${files[@]}"}; do
    # ljg-push documents both source and generated branches. Rewriting its
    # explanatory Org examples would corrupt the publisher's own contract.
    if [ "$skill_name" = "ljg-push" ]; then
      continue
    fi
    preserve_crlf=0
    if perl -0777 -ne 'exit((/\r\n/ && !/(?<!\r)\n/) ? 0 : 1)' "$file"; then
      preserve_crlf=1
    fi
    bun "$SKILLS_LOCAL/ljg-push/Tools/MdizeEmbeddedOrg.ts" "$file"
    sed -i '' \
      -e 's/__qa\.org/__qa.md/g' \
      -e 's/__paper\.org/__paper.md/g' \
      -e 's/__think\.org/__think.md/g' \
      -e 's/__concept\.org/__concept.md/g' \
      -e 's/__rank\.org/__rank.md/g' \
      -e 's/__structure\.org/__structure.md/g' \
      -e 's/__is\.org/__is.md/g' \
      -e 's/__write\.org/__write.md/g' \
      -e 's/__constraint\.org/__constraint.md/g' \
      -e 's/__plain\.org/__plain.md/g' \
      -e 's/__blind\.org/__blind.md/g' \
      -e 's/__book\.org/__book.md/g' \
      -e 's/__reading\.org/__reading.md/g' \
      -e 's/__relationship\.org/__relationship.md/g' \
      -e 's/__roundtable\.org/__roundtable.md/g' \
      -e 's/template\.org/template.md/g' \
      -e 's/org-mode/markdown/g' \
      -e 's/Org-mode/Markdown/g' \
      -e 's/文件必须是 markdown，禁止 Markdown。/文件必须是 Markdown，禁止 Org 格式。/g' \
      -e 's/markdown 格式，禁止 markdown 语法/Markdown 格式，禁止 Org 语法/g' \
      -e 's/Defaults to a saved org note/Defaults to a saved markdown note/g' \
      -e 's/Defaults to a saved Org note/Defaults to a saved Markdown note/g' \
      -e 's/Produces natural, content-led Org notes/Produces natural, content-led Markdown notes/g' \
      -e 's/保存 org 笔记/保存 Markdown 笔记/g' \
      -e 's/保存 Org 笔记/保存 Markdown 笔记/g' \
      -e 's/保存为 org 文件/保存为 Markdown 文件/g' \
      -e 's/保存 Org/保存 Markdown/g' \
      -e 's/生成 Org 文件/生成 Markdown 文件/g' \
      -e 's/写入 notes 里的 org 文件/写入 notes 里的 Markdown 文件/g' \
      -e 's/写入 Org 文件/写入 Markdown 文件/g' \
      -e 's/写入 org 文件/写入 Markdown 文件/g' \
      -e 's/写成 org 笔记/写成 Markdown 笔记/g' \
      -e 's/指定的 org 路径/指定的 Markdown 路径/g' \
      -e 's/Org 文件结构/Markdown 文件结构/g' \
      -e 's/org 文件结构/Markdown 文件结构/g' \
      -e 's/存入 org 笔记/存入 Markdown 笔记/g' \
      -e 's/写进 org 文件/写进 Markdown 文件/g' \
      -e 's/不入 org/不入 Markdown/g' \
      -e 's/生成由论文内容命名的 Org 笔记/生成由论文内容命名的 Markdown 笔记/g' \
      -e 's/写 org 文件时/写 Markdown 文件时/g' \
      -e 's/写 Org 文件时/写 Markdown 文件时/g' \
      -e 's/写 Org 时/写 Markdown 时/g' \
      -e 's/Org 使用/Markdown 使用/g' \
      -e 's/所有生成的 Org 文件/所有生成的 Markdown 文件/g' \
      -e 's/写入 Org 后运行/写入 Markdown 后运行/g' \
      -e 's/保存一份由论文内容命名的 Org 与后台 paper-map/保存一份由论文内容命名的 Markdown 与后台 paper-map/g' \
      -e 's/保存同一 Org 与 paper-map/保存同一 Markdown 与 paper-map/g' \
      -e 's/保存 Org 与 paper-map/保存 Markdown 与 paper-map/g' \
      -e 's/Org 默认保存到/Markdown 默认保存到/g' \
      -e 's/Denote\/consult-notes\/Org lint 与确定性 validator/Denote\/consult-notes 与确定性 validator/g' \
      -e 's/、consult-notes 与 `org-lint`。/与 consult-notes。/g' \
      -e 's/Org example 图块/Markdown 围栏图块/g' \
      -e 's/Org 解读/Markdown 解读/g' \
      -e 's/Org 输出合同/Markdown 输出合同/g' \
      -e 's/<Org 文件路径>/<Markdown 文件路径>/g' \
      -e 's/Org 的后台检查/Markdown 的后台检查/g' \
      -e 's/`#+DESCRIPTION`/`description`/g' \
      -e 's/`#+description`/`description`/g' \
      -e 's/`#+source`/`source`/g' \
      -e 's/`#+IDENTIFIER`/`identifier`/g' \
      -e 's/`#+definition`/`definition`/g' \
      -e 's/`#+operation`/`operation`/g' \
      -e 's/`#+recognition`/`recognition`/g' \
      -e 's/`#+guidance`/`guidance`/g' \
      -e 's/`#+basis`/`basis`/g' \
      -e 's/`#+falsifier`/`falsifier`/g' \
      -e 's/Org 的 `#+begin_example` \/ `#+end_example`/Markdown 围栏代码块/g' \
      -e 's/Org 的 #+begin_example \/ #+end_example/Markdown 围栏代码块/g' \
      -e 's/Org example 块/Markdown 围栏代码块/g' \
      -e 's/`#+begin_example` 块/Markdown 围栏代码块/g' \
      -e 's/\/note\.org/\/note.md/g' \
      -e 's/<note\.org>/<note.md>/g' \
      -e 's/- \*x\*：/- **x**：/g' \
      -e 's/- \*f\*：/- **f**：/g' \
      -e 's/- \*f(x)\*：/- **f(x)**：/g' \
      -e 's/`\* x：/`# x：/g' \
      -e 's/`\* f：/`# f：/g' \
      -e 's/`\* f(x)：/`# f(x)：/g' \
      -e 's/`\* 资料校准/`# 资料校准/g' \
      -e 's/org example ASCII 图/Markdown fenced ASCII 图/g' \
      -e 's/org 的 `#+begin_example` \/ `#+end_example` 块/Markdown 的 fenced code block/g' \
      -e 's/加粗用 `\*bold\*`（单星号），禁止 `\*\*bold\*\*`/加粗用 `**bold**`（双星号）/g' \
      -e 's/加粗用 `\*bold\*`（markdown），不用 `\*\*bold\*\*`（markdown）/加粗用 `**bold**`（双星号）/g' \
      -e 's/输出必须是纯 markdown 语法，禁止任何 markdown 语法/输出必须是纯 Markdown 语法，禁止 Org 语法/g' \
      -e 's/格式：markdown（`\*bold\*`，禁 markdown 语法）/格式：Markdown（`**bold**`，禁 Org 语法）/g' \
      -e 's/标题层级从 `\*` 开始/标题层级从 `#` 开始/g' \
      -e 's/Org 加粗使用单星号，标题从 `\*` 开始且不跳级。/Markdown 加粗使用双星号，标题从 `#` 开始且不跳级。/g' \
      -e 's/Org 文件头/Markdown 文件头/g' \
      -e 's/Org 与 Denote/Markdown 与 Denote/g' \
      -e 's/Org 标题/Markdown 标题/g' \
      -e 's/Org 输出在可用的 Emacs\/Denote 环境中确认：文件名与 identifier 一致、Denote 接受、Notes 索引或 consult-notes 可见、`org-lint` 无阻断问题。Markdown 输出由同一校验器检查 YAML 元数据、标题顺序与 identifier。/Markdown 输出由同一校验器检查 YAML 元数据、标题顺序与 identifier，并在可用的 Emacs\/Denote 环境中确认文件名与 identifier 一致、Denote 接受、Notes 索引或 consult-notes 可见。/g' \
      -e 's/格式校验、Denote 或 org-lint 不通过/格式校验或 Denote 不通过/g' \
      -e 's/验证 Denote 接受与 `org-lint`/验证 Denote 接受/g' \
      -e 's/再运行 Denote 接受检查和 `org-lint`/再运行 Denote 接受检查/g' \
      -e 's/真实 Emacs 负责 Denote、consult-notes 与 Org lint/真实 Emacs 负责 Denote 与 consult-notes/g' \
      -e 's/，并实际运行 `org-lint`。保留真实 lint 结果，不把未执行或非阻断提示说成零问题。/。/g' \
      -e 's/，并实际运行 `org-lint`。若正在运行的 Emacs 服务不可用，就使用能加载本机 Denote、consult、consult-notes 与 Org 的批处理 Emacs；/。若正在运行的 Emacs 服务不可用，就使用能加载本机 Denote、consult 与 consult-notes 的批处理 Emacs；/g' \
      "$file"
    if [ "$skill_name" = "ljg-is" ]; then
      sed -i '' \
        -e 's/Org 笔记/Markdown 笔记/g' \
        -e 's/Denote\/Org/Denote\/Markdown/g' \
        -e 's/`#+schema: ljg-is-v2`/`schema: ljg-is-v2`/g' \
        -e 's/标签包含 `:is:act:`/tags 同时包含 `is` 与 `act`/g' \
        "$file"
    fi
    if [ "$skill_name" = "ljg-invest" ]; then
      sed -i '' \
        -e 's/PROJECT_NAME\.org/PROJECT_NAME.md/g' \
        -e 's/example-ai\.org/example-ai.md/g' \
        "$file"
    fi
    if [ "$skill_name" = "ljg-blind" ]; then
      sed -i '' \
        -e 's/## org 严格语法（禁混 markdown）/## Markdown 严格语法（禁混 Org）/g' \
        -e 's/标题用 `\*` \/ `\*\*` \/ `\*\*\*`，不要 `#`/标题用 `#` \/ `##` \/ `###`，不要用星号充当标题/g' \
        -e 's/加粗 `\*字\*`，斜体 `\/字\/`，等宽 `~code~`/加粗 `**字**`，斜体 `*字*`，等宽 `code`/g' \
        -e 's/列表用 `-`，不要 `\*`（`\*` 在 org 是标题）/列表用 `-`；标题使用 `#`/g' \
        -e 's/链接 `\[\[url\]\[text\]\]`，不要 `\[text\](url)`/链接使用 `[text](url)`/g' \
        -e 's/分隔线 `-----`，不要 `---`；不要 markdown 的 `>` 引用/分隔线使用 `---`；引用使用 `>`/g' \
        "$file"
    fi
    if [ "$skill_name" = "ljg-learn" ]; then
      sed -i '' \
        -e 's/分隔线用空行或 org 标题层级区分，不用 `---`（markdown 分隔符）/分隔线用空行或 Markdown 标题层级区分；需要分隔线时使用 `---`/g' \
        -e 's/列表用 `- item` 或 `1. item`，不用 markdown 的 `\* item`（因为 `\*` 在 org 中是标题）/列表用 `- item` 或 `1. item`；标题使用 `#`/g' \
        -e 's/代码用 `~code~` 或 `=code=`，不用反引号/代码使用反引号包裹/g' \
        -e 's/整合为 markdown/整合为 Markdown/g' \
        "$file"
    fi
    if [ "$skill_name" = "ljg-qa" ]; then
      sed -i '' \
        -e 's/列表用 `- item`，不用 `\* item`（`\*` 在 org 是标题）/列表用 `- item`；标题使用 `#`/g' \
        -e 's/代码用 `~code~` 或 `=code=`，不用反引号/代码使用反引号包裹/g' \
        "$file"
    fi
    sed -E -i '' \
      -e 's/^#\+(title|subtitle|date|filetags|identifier|source|author|authors|venue):/\1:/' \
      "$file"
    perl -pi -e 's/^#\+(TITLE|SUBTITLE|DATE|FILETAGS|IDENTIFIER|SOURCE|AUTHOR|AUTHORS|VENUE):/\L$1:/;' "$file"
    sed -i '' -e 's/^filetags:/tags:/' "$file"
    # A line-start bullet label followed by a full-width colon is structural,
    # so it is safe to distinguish from ambiguous prose emphasis.
    perl -pi -e 's/^- \*([^*\n]+)\*：/- **$1**：/;' "$file"
    for r in ${renames[@]+"${renames[@]}"}; do
      sed -i '' "s/${r//./\\.}/${r%.org}.md/g" "$file"
    done
    if [ "$preserve_crlf" = "1" ]; then
      perl -0777 -pi -e 's/(?<!\r)\n/\r\n/g' "$file"
    fi
  done

  # 3) Exact references to converted Org files can also live in runtime
  # consumers (for example a TypeScript test loading ../Template.org).
  # Rewrite only actual converted basenames, so fixture strings such as
  # __is.org remain untouched unless that concrete file was converted.
  local reference_files=()
  while IFS= read -r f; do reference_files+=("$f"); done < <(
    find "$skill_dir" -type f -not -path '*/assets/*' \
      \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.mjs' \
         -o -name '*.cjs' -o -name '*.json' -o -name '*.toml' \
         -o -name '*.yaml' -o -name '*.yml' -o -name '*.sh' \) \
      2>/dev/null
  )
  for file in ${reference_files[@]+"${reference_files[@]}"}; do
    # The publisher documents and enforces both sides of the conversion. Its
    # runtime literals are rules, not generated-branch output instructions.
    if [ "$skill_name" = "ljg-push" ]; then
      continue
    fi
    for r in ${renames[@]+"${renames[@]}"}; do
      sed -i '' "s/${r//./\\.}/${r%.org}.md/g" "$file"
    done
    # Eval prompts are executable output contracts. Convert only phrases that
    # require an Org deliverable; mentions of Org as accepted input stay intact.
    if [[ "$file" == */evals/*.json ]]; then
      sed -i '' \
        -e 's/把 Org 与 coverage/把 Markdown 与 coverage/g' \
        -e 's/保存 Org 与 coverage/保存 Markdown 与 coverage/g' \
        -e 's/保存同一 Org 与 paper-map/保存同一 Markdown 与 paper-map/g' \
        -e 's/保存 Org 与 paper-map/保存 Markdown 与 paper-map/g' \
        -e 's/的 Org；/的 Markdown；/g' \
        -e 's/的 Org：/的 Markdown：/g' \
        "$file"
    fi
    # Runtime-facing usage and validation messages must describe the generated
    # branch contract while explicit Org compatibility fixtures remain intact.
    sed -i '' \
      -e 's/最多保留一个 Org example 图块/最多保留一个 Markdown 围栏图块/g' \
      -e 's/<note\.org>/<note.md>/g' \
      "$file"
    # A stdin default controls which parser the validator selects. On the md
    # branch it must default to Markdown while explicit Org fixtures remain.
    sed -E -i '' 's/(stdin__[a-z0-9-]+)\.org/\1.md/g' "$file"
  done
}

# Fail the md publish if an output-format instruction survived conversion.
# Mentions of Org as an accepted input remain valid; this targets only phrases
# that would make an md-branch skill emit Org or expose Org markup.
audit_md_skill() {
  local skill_dir="$1"
  local skill_name org_files output_residuals markup_residuals eval_residuals runtime_default_residuals runtime_output_residuals
  skill_name=$(basename "$skill_dir")

  org_files=$(find "$skill_dir" -type f -name '*.org' -not -path '*/assets/*' 2>/dev/null || true)
  # ljg-push is meta-documentation for both branches, so its literal Org
  # examples describe the source side and are not an output-format residual.
  if [ "$skill_name" = "ljg-push" ]; then
    if [ -n "$org_files" ]; then
      err "markdown conversion residuals in $skill_name"
      printf '%s\n' "$org_files" >&2
      return 1
    fi
    return 0
  fi
  output_residuals=$(find "$skill_dir" -type f -name '*.md' -not -path '*/assets/*' -print0 \
    | xargs -0 grep -En \
      'Defaults to a saved Org note|Produces natural, content-led Org notes|生成 Org 文件|保存(为)? (Org|org)(笔记|文件)?|保存(一份由[^[:cntrl:]]+|同一 )?Org 与(后台 )?paper-map|存入 (Org|org)|写进 (Org|org)|写入 (Org|org) 文件|写成 org 笔记|(Org|org) 文件结构|指定的 org 路径|不入 org|Org 默认保存到|Org 严格语法|org 严格语法|Org 解读|Org 输出合同|Org 的后台检查|<Org 文件路径>|标签包含 `:[^`]+:`|禁混 markdown|禁 markdown 语法|禁止任何 markdown 语法|__[a-z0-9_-]+\.org|命名按 denote[^[:cntrl:]]*\.org|生成由论文内容命名的 Org 笔记|写 Org 文件时|写 Org 时|Org 使用|所有生成的 Org 文件|Org 文件统一保存|写入 Org 后运行|Org lint|org-lint|文件必须是 (markdown|Markdown)，禁止 Markdown|(markdown|Markdown) 格式，禁止 (markdown|Markdown) 语法|加粗用 `\*bold\*`|代码用 `~code~`|不用反引号|`#\+(DESCRIPTION|description|source|IDENTIFIER|identifier|schema|definition|operation|recognition|guidance|basis|falsifier)`|(嵌入|ASCII 图)[^[:cntrl:]]*#\+begin_example|Org 的 (`)?#\+begin_example|Org example (块|图块)' \
      2>/dev/null || true)
  markup_residuals=$(find "$skill_dir" -type f -name '*.md' -not -path '*/assets/*' -print0 \
    | xargs -0 grep -En '^[[:space:]]*#\+[A-Za-z_]+:|^[[:space:]]*#\+(begin|end)_(example|src|quote)([[:space:]]|$)|^[[:space:]]*```org[[:space:]]*$|^- \*[^*]+\*：|\[\[[^]]+\]\[[^]]+\]\]' \
      2>/dev/null || true)
  eval_residuals=$(find "$skill_dir" -type f -path '*/evals/*.json' -print0 \
    | xargs -0 grep -En '把 Org 与 coverage|保存 Org 与 coverage|保存(同一)? Org 与 paper-map|的 Org(；|：)' \
      2>/dev/null || true)
  runtime_default_residuals=$(find "$skill_dir" -type f -not -path '*/assets/*' \
    \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.mjs' \
       -o -name '*.cjs' -o -name '*.json' -o -name '*.sh' \) -print0 \
    | xargs -0 grep -En 'stdin__[a-z0-9-]+\.org' \
      2>/dev/null || true)
  runtime_output_residuals=$(find "$skill_dir" -type f -not -path '*/assets/*' \
    \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.mjs' \
       -o -name '*.cjs' -o -name '*.json' -o -name '*.sh' \) -print0 \
    | xargs -0 grep -En '用法：[^[:cntrl:]]*<note\.org>|最多保留一个 Org example 图块' \
      2>/dev/null || true)

  if [ -n "$org_files$output_residuals$markup_residuals$eval_residuals$runtime_default_residuals$runtime_output_residuals" ]; then
    err "markdown conversion residuals in $(basename "$skill_dir")"
    [ -n "$org_files" ] && printf '%s\n' "$org_files" >&2
    [ -n "$output_residuals" ] && printf '%s\n' "$output_residuals" >&2
    [ -n "$markup_residuals" ] && printf '%s\n' "$markup_residuals" >&2
    [ -n "$eval_residuals" ] && printf '%s\n' "$eval_residuals" >&2
    [ -n "$runtime_default_residuals" ] && printf '%s\n' "$runtime_default_residuals" >&2
    [ -n "$runtime_output_residuals" ] && printf '%s\n' "$runtime_output_residuals" >&2
    return 1
  fi
}

# Sync one skill: rsync local → repo path, optionally apply mdize.
sync_skill() {
  local name="$1"
  local apply_mdize="$2"   # 0|1
  local target="$SKILLS_REPO/skills/$name"
  rsync_skill_tree "$SKILLS_LOCAL/$name" "$target"
  if [ "$apply_mdize" = "1" ]; then
    mdize_skill "$target"
  fi
}

# Push one branch with given commit message prefix.
push_branch() {
  local branch="$1"
  local mdize="$2"   # 0|1
  local prefix="$3"  # "feat" or "feat(md)"

  log "=== Branch: $branch ==="
  cd "$SKILLS_REPO"
  git checkout "$branch" 2>&1 | head -1 || true
  # Verify checkout actually succeeded — `git checkout` exits non-zero when
  # uncommitted changes block the switch, but `| head -1 || true` swallows it.
  # Without this guard, subsequent reset/sync/commit/push run on the WRONG branch
  # (the one we started on), silently corrupting both branches. Found 2026-05-18.
  local current_branch
  current_branch=$(git rev-parse --abbrev-ref HEAD)
  if [ "$current_branch" != "$branch" ]; then
    err "checkout $branch failed (still on $current_branch). Commit or stash uncommitted changes first, then retry."
    exit 1
  fi
  git pull --rebase --quiet || {
    warn "pull --rebase failed on $branch — trying reset --hard origin/$branch"
    git rebase --abort 2>/dev/null || true
    git fetch origin "$branch" --quiet
    git reset --hard "origin/$branch"
  }

  local skills
  if [ "$FORCE" = "1" ]; then
    skills=$(list_all_local)
  else
    skills=$(detect_updates)
  fi

  if [ -z "$skills" ]; then
    log "  no changes for $branch"
    return 0
  fi

  for name in $skills; do
    log "  syncing $name$([ "$mdize" = "1" ] && echo " (mdize)")"
    [ "$DRY_RUN" = "1" ] && continue
    sync_skill "$name" "$mdize"
  done

  if [ "$DRY_RUN" = "1" ]; then
    log "  [dry-run] skipping bump/commit/push"
    return 0
  fi

  if [ "$mdize" = "1" ]; then
    for name in $skills; do
      audit_md_skill "$SKILLS_REPO/skills/$name"
    done
    ok "markdown residual audit passed"
  fi

  if [ -z "$(git status --porcelain)" ]; then
    log "  no actual file changes after rsync — skipping commit"
    return 0
  fi

  # Commit message lists skills that ACTUALLY changed, not the detect list.
  # On the md branch detect_updates() flags every skill (org source always differs
  # from the markdown-ized repo); the real git delta below — read before the version
  # bump, scoped to skills/ — is the truth. Falls back to the detect list only if
  # nothing under skills/ shows a change.
  local skill_list
  skill_list=$(git status --porcelain -- skills/ \
    | cut -c4- \
    | sed -E 's/^.* -> //; s/^"//; s/"$//' \
    | sed -nE 's#^skills/([^/]+)/.*#\1#p' \
    | sort -u | tr '\n' ' ' | sed 's/ *$//')
  [ -z "$skill_list" ] && skill_list=$(echo "$skills" | tr '\n' ' ' | sed 's/ *$//')

  local new_ver
  new_ver=$(bump_version)
  git add skills/ .claude-plugin/
  git commit -m "${prefix}: sync ljg-* skills [$skill_list] (v$new_ver)" --quiet
  git push origin "$branch" --quiet
  ok "$branch @ v$new_ver pushed"
}

# === README consistency check ===
# Hard gate: README must mention all skills before push.
# A skill present locally but missing in README likely means README hasn't been
# updated to reflect the new skill. Default = exit 1; bypass with --skip-readme-check.
check_readme() {
  local readme_master="$SKILLS_REPO/README.md"
  if [ ! -f "$readme_master" ]; then
    warn "README.md not found at $readme_master (skipping check)"
    return 0
  fi

  local local_skills readme_skills missing
  local_skills=$(list_all_local | sort -u)
  # Extract every ljg-xxx mention from README, dedupe
  readme_skills=$(grep -oE 'ljg-[a-z][a-z0-9-]*' "$readme_master" | sort -u)
  # Skills present locally but absent in README
  missing=$(comm -23 <(echo "$local_skills") <(echo "$readme_skills"))

  if [ -z "$missing" ]; then
    ok "README mentions all local ljg-* skills"
    return 0
  fi

  warn "README is missing these skills:"
  echo "$missing" | sed 's/^/    - /'
  echo ""
  warn "Each push is a chance to refresh README. Ask yourself:"
  echo "    - 新增 skill 了吗？ → README 的 skill 清单 / 安装命令需要加一行"
  echo "    - 删了 skill 吗？ → README 对应行要删"
  echo "    - skill 描述大改了吗？ → README 的简介可能要同步"
  echo ""
  if [ "$SKIP_README_CHECK" = "1" ]; then
    warn "--skip-readme-check passed: ignoring above and continuing."
    return 0
  fi
  err "Aborting push. Update README first, or pass --skip-readme-check."
  exit 1
}

# Keep the working repo on the source branch after every successful push.
return_to_master() {
  cd "$SKILLS_REPO" || return 0
  local current_branch
  current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
  if [ "$current_branch" = "master" ]; then
    return 0
  fi
  if git checkout master >/dev/null 2>&1; then
    ok "repo left on master"
  else
    warn "could not switch back to master; check uncommitted changes in $SKILLS_REPO"
  fi
}

# === Main ===

# Tests source this file to exercise the real conversion functions in an
# isolated tree. Normal CLI execution leaves this unset and follows the release.
if [ "${LJG_PUSH_LIBRARY_ONLY:-0}" = "1" ]; then
  return 0 2>/dev/null || exit 0
fi

setup_repo
cd "$SKILLS_REPO"

# README consistency gate (always runs; --skip-readme-check or --dry-run downgrade to warning)
log "Checking README consistency..."
check_readme

log "Detecting updates..."
UPDATED=$(detect_updates)
if [ "$FORCE" = "1" ]; then
  log "  --force: will sync all local ljg-* skills"
elif [ -z "$UPDATED" ]; then
  log "  No diff vs current branch — md branch may still need attention."
fi

if [ "$DRY_RUN" = "1" ]; then
  log "[dry-run] Would sync these skills:"
  if [ "$FORCE" = "1" ]; then
    list_all_local | sed 's/^/  - /'
  elif [ -n "$UPDATED" ]; then
    echo "$UPDATED" | sed 's/^/  - /'
  else
    log "  (none on current branch)"
  fi
fi

# Always run both branches — each branch does its own detect + early-skip.
# Don't exit early on "no master diff" because md branch may still have changes
# (mdize transformations create per-branch divergence from the org-style local).
push_branch master 0 "feat"
push_branch md     1 "feat(md)"
return_to_master

log ""
log "Done."
