#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

test -f README.md
grep -q cursor README.md

command -v node >/dev/null
command -v python3 >/dev/null
command -v go >/dev/null
command -v git >/dev/null
command -v curl >/dev/null

# Mirror cinematic-sites into every skill discovery path this machine can see.
# Real copies (not symlinks): Cursor skill discovery skips symlinks.
SKILL_SRC=".cursor/skills/cinematic-sites"
if [[ -f "$SKILL_SRC/SKILL.md" ]]; then
  dests=(
    "$HOME/.cursor/skills/cinematic-sites"
    "$HOME/.agents/skills/cinematic-sites"
    "$HOME/.claude/skills/cinematic-sites"
    "$HOME/.codex/skills/cinematic-sites"
  )
  if [[ -d /cursor/stores/user ]]; then
    dests+=("/cursor/stores/user/skills/cinematic-sites")
  fi
  if [[ -d /cursor/stores/self ]]; then
    dests+=("/cursor/stores/self/skills/cinematic-sites")
  fi
  for dest in "${dests[@]}"; do
    mkdir -p "$dest/references"
    # Avoid cp -a on /cursor/stores (permission bits cannot be preserved there).
    cp -f "$SKILL_SRC/SKILL.md" "$dest/SKILL.md"
    cp -f "$SKILL_SRC/references/"* "$dest/references/"
  done

  if [[ -d /cursor/stores/user ]]; then
    mkdir -p /cursor/stores/user/skill-plans
    cat > /cursor/stores/user/SKILLS.md <<'EOF'
# User skill memory (cross-conversation)

Load `skills/<name>/SKILL.md` when the trigger matches. This store is user-scoped so later Cloud Agent chats can reuse it.

| Skill | Path | Use when |
| --- | --- | --- |
| cinematic-sites | `skills/cinematic-sites/SKILL.md` | Expensive looping-video hero / cinematic landing (glass nav, serif headline, email capture). |
EOF
    cat > /cursor/stores/user/ALWAYS.md <<'EOF'
# Always remember

Shamanth's cinematic landing playbook lives at `skills/cinematic-sites/SKILL.md`.
When they ask for a cinematic / expensive animated / looping-video / glass-hero site, follow that skill.
EOF
  fi
fi

echo "Environment bootstrap complete"
