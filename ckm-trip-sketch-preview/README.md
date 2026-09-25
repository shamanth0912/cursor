# Trip sketch in Chikku (preview only)

**Not production.** Concept A — Three ridges composer.

## What

- Button inside Ask Chikku: **Sketch my route**
- Days **1–5**, EN only
- Moods: Cloud line · Water & shade · Peetha & prayer
- Pace: Soft / Full / Trek
- Output: route ribbon + day cards (Companion places)
- **No stays, no budget, no property enquiry**

## Live preview (temporary tunnel)

- Focused: https://cards-homeland-carol-enhancement.trycloudflare.com/sketch-preview.html
- Home: https://cards-homeland-carol-enhancement.trycloudflare.com/index.html

Open Chikku (tiger) → **Sketch my route**. Tunnel dies with the agent session — not production.

## Local

```bash
cd ckm-trip-sketch-preview/dist
python3 -m http.server 8791 --bind 0.0.0.0
```

- Focused demo: http://127.0.0.1:8791/sketch-preview.html  
- Full home preview: http://127.0.0.1:8791/index.html  
