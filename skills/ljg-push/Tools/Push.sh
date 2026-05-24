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
SKILLS_LOCAL="$HOME/.claude/skills"
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
    local name
    name=$(basename "$local_skill")
    local repo_skill="$SKILLS_REPO/skills/$name"
    if [ ! -d "$repo_skill" ]; then
      echo "$name"
    elif ! diff -rq --exclude='.git' "$local_skill" "$repo_skill" > /dev/null 2>&1; then
      echo "$name"
    fi
  done
}

# List all ljg-* skills in local (force mode).
list_all_local() {
  for local_skill in "$SKILLS_LOCAL"/ljg-*; do
    [ -d "$local_skill" ] || continue
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

# Apply markdown-ization to a skill directory.
# Replaces:
#   - File-extension refs: __qa.org → __qa.md, __paper.org → __paper.md, etc.
#   - Template refs: template.org → template.md
#   - Keywords: org-mode → markdown
# Does NOT replace: *bold*, org headers, file renames (manual maintenance).
mdize_skill() {
  local skill_dir="$1"
  local files=()
  [ -f "$skill_dir/SKILL.md" ] && files+=("$skill_dir/SKILL.md")
  if [ -d "$skill_dir/Workflows" ]; then
    while IFS= read -r f; do files+=("$f"); done < <(find "$skill_dir/Workflows" -name '*.md' 2>/dev/null)
  fi
  if [ -d "$skill_dir/References" ]; then
    while IFS= read -r f; do files+=("$f"); done < <(find "$skill_dir/References" -name '*.md' 2>/dev/null)
  fi
  for file in "${files[@]}"; do
    sed -i '' \
      -e 's/__qa\.org/__qa.md/g' \
      -e 's/__paper\.org/__paper.md/g' \
      -e 's/__think\.org/__think.md/g' \
      -e 's/__concept\.org/__concept.md/g' \
      -e 's/__rank\.org/__rank.md/g' \
      -e 's/__plain\.org/__plain.md/g' \
      -e 's/template\.org/template.md/g' \
      -e 's/org-mode/markdown/g' \
      -e 's/Org-mode/Markdown/g' \
      "$file"
  done
}

# Sync one skill: rsync local → repo path, optionally apply mdize.
sync_skill() {
  local name="$1"
  local apply_mdize="$2"   # 0|1
  local target="$SKILLS_REPO/skills/$name"
  rsync -a --delete --exclude='.git' "$SKILLS_LOCAL/$name/" "$target/"
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

  if [ -z "$(git status --porcelain)" ]; then
    log "  no actual file changes after rsync — skipping commit"
    return 0
  fi

  local new_ver
  new_ver=$(bump_version)
  git add skills/ .claude-plugin/
  local skill_list
  skill_list=$(echo "$skills" | tr '\n' ' ')
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

# === Main ===

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

log ""
log "Done."
