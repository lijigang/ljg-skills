#!/usr/bin/env bash
# Scan all installed skills, extract frontmatter metadata
# Output: JSON array

SKILLS_DIR="${HOME}/.openclaw/workspace/skills/ljg-skills"
first=1
echo "["

for skill_dir in "$SKILLS_DIR"/*/; do
  skill_file="$skill_dir/SKILL.md"
  [ -f "$skill_file" ] || continue
  dir_name=$(basename "$skill_dir")

  # Strip \r then extract frontmatter
  clean=$(tr -d '\r' < "$skill_file")
  frontmatter=$(echo "$clean" | sed -n '/^---$/,/^---$/p' | sed '1d;$d')
  [ -z "$frontmatter" ] && continue

  name=$(echo "$frontmatter" | grep -m1 '^name:' | sed 's/^name:[[:space:]]*//' | tr -d '"')
  version=$(echo "$frontmatter" | grep -m1 '^version:' | sed 's/^version:[[:space:]]*//' | tr -d '"')
  invocable=$(echo "$frontmatter" | grep -m1 '^user_invocable:' | sed 's/^user_invocable:[[:space:]]*//' | tr -d '"')

  # Extract description
  desc_line=$(echo "$frontmatter" | grep -m1 '^description:')
  desc_value=$(echo "$desc_line" | sed 's/^description:[[:space:]]*//')

  if [[ "$desc_value" == '>'* ]] || [[ "$desc_value" == '|'* ]]; then
    desc=$(echo "$frontmatter" | sed -n '/^description:/,/^[a-z_]*:/{ /^description:/d; /^[a-z_]*:/d; p; }' | sed 's/^[[:space:]]*//' | tr -d '"' | tr '\n' ' ' | sed 's/[[:space:]]*$//')
  else
    desc=$(echo "$desc_value" | tr -d '"')
  fi

  # Truncate: first sentence, max 80 chars
  short=$(echo "$desc" | sed 's/\. .*//' | sed 's/。.*//' | cut -c1-80)

  : "${name:=$dir_name}"
  : "${version:=-}"
  : "${invocable:=false}"

  if (( first )); then first=0; else echo ","; fi
  short_esc=$(echo "$short" | sed 's/\\/\\\\/g; s/"/\\"/g')
  printf '  {"name":"%s","version":"%s","invocable":%s,"desc":"%s"}' \
    "$name" "$version" "$invocable" "$short_esc"
done

echo ""
echo "]"
