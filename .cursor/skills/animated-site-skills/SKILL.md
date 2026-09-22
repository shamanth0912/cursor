---
name: animated-site-skills
description: Route to cinematic/animated website skills and prompt sources. Use when the user wants looping-video heroes, scroll-driven cinematic sites, GSAP/Lenis Apple-style scroll, Google Flow / Runway video loops, or asks where similar skills/prompts/templates live.
---

# Animated site skills (router)

Shamanth’s permanent catalog. **Read this first**, then open the matching skill file. Do not default to a generic Tailwind landing page.

## Route

| Ask | Skill | Path |
| --- | --- | --- |
| Looping 5s video + liquid-glass hero (Janus) | `cinematic-sites` | `.cursor/skills/cinematic-sites/SKILL.md` or `~/.cursor/skills/cinematic-sites/SKILL.md` |
| Pinned chapters, parallax, 3D tilt, launch pages | `cinematic-scroll` | `~/.cursor/skills/cinematic-scroll/` (install if missing) |
| Google Flow / Veo loops + immersive site | `gflow-immersive` / `gflow-motion` | `~/.cursor/skills/` from swissmarley/gflow-skills |
| Scroll-scrubbed camera journey (Imagen→Veo) | `scroll-earth` | install prantikmedhi/scroll-earth |
| Fly-through chained clips (Seedance/Kling) | `lets-scroll` | install AIwithhassan/lets-scroll |
| MP4 → GSAP/Lenis scroll site | `creating-video-websites` | WilkoMarketing/antigravity-video-websites-skill |
| Apple-style canvas scroll from video | `3d-animation-creator` | sergeyramas/3d-animation-creator-skill |
| Film-director visual language | `cinematic-ui` | prishsu0730/cinematic-ui |
| Video generation in-app | Runway skills | `npx skills add runwayml/runway-studio-skills` |
| Taste / anti-slop UI (not motion) | `frontend-design` | anthropics/skills |
| Design canvas + prompt library | Superdesign | `npx skills add superdesigndev/superdesign-skill` |

If the target skill is **not on disk**, install it (real copy, not symlink — Cursor skips skill symlinks):

```bash
npx skills add MustBeSimo/cinematic-scroll-skill --agent cursor -y
npx cinematic-scroll-skill --dir "$HOME/.cursor/skills"
```

Then copy into `/cursor/stores/user/skills/<name>/` when running as a Cloud Agent so later chats keep it.

## Janus vs scroll

- **cinematic-sites**: autoplaying muted loop behind glass UI. Video does the motion.
- **cinematic-scroll / scroll-earth / video-websites**: scroll position drives the motion (pin, scrub, canvas frames).

## Prompt / template sources

- Superdesign library: https://superdesign.dev/library — `superdesign search-prompts --query cinematic`
- skills.sh — https://skills.sh
- skills.rest — https://skills.rest
- Cursor Customize → Skills; team marketplace; GitHub plugins
- Video loops: Google Flow, Runway, Kling, Luma, fal.ai — ask for slow motion + identical start/end frames

## After routing

Load only the chosen `SKILL.md` and its `references/`. Do not load every skill in this table.
