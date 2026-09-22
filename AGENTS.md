# Agent instructions

## Cinematic sites

This repo includes a **cinematic-sites** skill. Use it in every conversation where the user wants a premium looping-video landing hero (glass nav, Instrument Serif headline, email capture).

- Skill: `.cursor/skills/cinematic-sites/SKILL.md`
- Prompts: `.cursor/skills/cinematic-sites/references/prompts.md`
- Glass CSS: `.cursor/skills/cinematic-sites/references/liquid-glass.css`

Compatibility copies also live at `.agents/skills/cinematic-sites/`, `.claude/skills/cinematic-sites/`, and `.codex/skills/cinematic-sites/` (same files; Cursor does not follow skill symlinks).

Environment bootstrap (`.cursor/install.sh`) also mirrors the skill into user-global dirs on this machine (`~/.cursor/skills`, `~/.agents/skills`, `~/.claude/skills`, `~/.codex/skills`) and into `/cursor/stores/user` so later Cloud Agent chats for this user can still find it.

Invoke with `/cinematic-sites` or let the agent match on the skill description.
