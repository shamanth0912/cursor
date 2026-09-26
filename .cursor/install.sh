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

# Mirror every project skill into Cursor/Claude/Codex global dirs and Cloud Agent stores.
# Real copies (not symlinks): Cursor skill discovery skips symlinks.
# Avoid cp -a on /cursor/stores (permission bits cannot be preserved there).
mirror_skill_dir() {
  local src="$1"
  local dest="$2"
  mkdir -p "$dest"
  cp -rf "$src/." "$dest/" 2>/dev/null || {
    mkdir -p "$dest"
    # Fallback: copy files individually if preserve-perms fails
    (cd "$src" && tar cf - .) | (cd "$dest" && tar xf -)
  }
}

if [[ -d .cursor/skills ]]; then
  dests=(
    "$HOME/.cursor/skills"
    "$HOME/.agents/skills"
    "$HOME/.claude/skills"
    "$HOME/.codex/skills"
  )
  [[ -d /cursor/stores/user ]] && dests+=("/cursor/stores/user/skills")
  [[ -d /cursor/stores/self ]] && dests+=("/cursor/stores/self/skills")

  for skill_src in .cursor/skills/*/; do
    name="$(basename "$skill_src")"
    for dest in "${dests[@]}"; do
      mirror_skill_dir "$skill_src" "$dest/$name"
    done
  done
fi

if [[ -d /cursor/stores/user ]]; then
  mkdir -p /cursor/stores/user/skill-plans
  if [[ -f .cursor/skills/animated-site-skills/SKILL.md ]]; then
    cp -f .cursor/skills/animated-site-skills/SKILL.md /cursor/stores/user/skills/animated-site-skills/SKILL.md
  fi
  cat > /cursor/stores/user/SKILLS.md <<'EOF'
# User skill memory (cross-conversation)

This store is user-scoped. Later Cloud Agent chats should load matching `skills/<name>/SKILL.md`.

| Skill | Path | Use when |
| --- | --- | --- |
| animated-site-skills | `skills/animated-site-skills/SKILL.md` | Routing: looping hero vs scroll cinematic vs Flow/Runway. |
| cinematic-sites | `skills/cinematic-sites/SKILL.md` | Janus-style looping-video glass hero. |
| cinematic-scroll | `skills/cinematic-scroll/SKILL.md` | Scroll-driven cinematic sites (parallax, pin, 3D tilt). |
| immersive-web | `skills/immersive-web/SKILL.md` | Google Flow / Veo cinematic scroll sites. |
| motion-graphics | `skills/motion-graphics/SKILL.md` | Seamless loops and hero background videos. |
| frontend-design | `skills/frontend-design/SKILL.md` | Distinctive UI taste (not motion). |
EOF
  cat > /cursor/stores/user/ALWAYS.md <<'EOF'
# Always remember (Shamanth)

Permanent catalog for cinematic / animated websites. Use in every later chat.

1. Route with `skills/animated-site-skills/SKILL.md`.
2. Looping glass hero → `skills/cinematic-sites/SKILL.md`.
3. Scroll cinematic → `skills/cinematic-scroll/SKILL.md`.
4. Flow/Veo loops → `skills/motion-graphics/SKILL.md` then `skills/immersive-web/SKILL.md`.
5. Taste-only UI → `skills/frontend-design/SKILL.md`.

Install extras if missing (use --copy, not symlinks):
`npx skills add MustBeSimo/cinematic-scroll-skill -g -a cursor --copy -y`
Browse: https://skills.sh https://skills.rest https://superdesign.dev/library
EOF
  if [[ -d /cursor/stores/self ]]; then
    mkdir -p /cursor/stores/self/skill-plans /cursor/stores/self/skills
    cp -f /cursor/stores/user/SKILLS.md /cursor/stores/self/SKILLS.md
    cp -f /cursor/stores/user/ALWAYS.md /cursor/stores/self/ALWAYS.md
  fi
fi

echo "Environment bootstrap complete"
