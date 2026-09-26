# Bean to cup — classic vs current A/B preview

**Not production.** Do not deploy to Aroha / Vercel until a layout is approved.

## What you can control

Sandbox Admin HUD still works:

```bash
python3 serve.py
# open http://127.0.0.1:43191/sandbox/bean-to-cup/
```

Press **H** (or the Admin control) for the panel. Sliders cover world, camera, motion, focus, plates, shards, particles, **copy rail**, and navigation. Tweaks persist in `localStorage`. **Export JSON** when a setting should later move into production defaults.

## A/B URLs

| Version | URL | Notes |
|---------|-----|--------|
| Chooser | `/` | Links to both |
| **Classic rail** | `/classic/bean-to-cup.html?layout=classic` | Solid left copy column + framed plate (old format, mobile + laptop) |
| Current (Bloom) | `/current/bean-to-cup.html` | Full-bleed Scrollcraft — text overlays the still |
| Current weak rail | `/classic/bean-to-cup.html?layout=current` | Same walk engine, translucent overlay rail |
| Sandbox settings | `/sandbox/bean-to-cup/` | Admin HUD on classic walk |

## Layout query

On the classic player:

- `?layout=classic` (default) — restored copy-rail
- `?layout=current` — older translucent overlay

## Source files in companion

- `chikkamagaluru-companion/seq-walk.css`
- `chikkamagaluru-companion/kage-walk.js`
- `chikkamagaluru-companion/bean-to-cup.html`
