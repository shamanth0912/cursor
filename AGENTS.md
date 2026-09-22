# Agent instructions

## Animated / cinematic websites

Route first with **animated-site-skills**, then open the matching skill.

| Skill | Path | Use |
| --- | --- | --- |
| animated-site-skills | `.cursor/skills/animated-site-skills/SKILL.md` | Router + registries |
| cinematic-sites | `.cursor/skills/cinematic-sites/SKILL.md` | Looping-video glass hero (Janus) |
| cinematic-scroll | `.cursor/skills/cinematic-scroll/SKILL.md` | Scroll-driven cinematic sites |
| immersive-web | `.cursor/skills/immersive-web/SKILL.md` | Google Flow / Veo immersive sites |
| motion-graphics | `.cursor/skills/motion-graphics/SKILL.md` | Seamless loops / hero videos |
| frontend-design | `.cursor/skills/frontend-design/SKILL.md` | Distinctive UI, not motion |

`.cursor/install.sh` mirrors these into `~/.cursor/skills` (and Claude/Codex/Agents dirs) plus `/cursor/stores/user` so later Cloud Agent chats can reuse them.

Compatibility copies: `.agents/skills/`, `.claude/skills/`, `.codex/skills/` (real files; Cursor skips skill symlinks).

Slash: `/animated-site-skills` `/cinematic-sites` `/cinematic-scroll`
