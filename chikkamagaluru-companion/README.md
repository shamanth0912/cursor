# Chikkamagaluru Companion

Static district companion (places, map, plan, stories). Deploy the folder root to Vercel/static hosting.

## Data enrichment (Sep 2026)

`data.js` destinations were enriched from the **Chikkamagaluru Department of Tourism** brochure:

- Added missing brochure places (falls, viewpoints, temples, lakes)
- Enriched existing blurbs/summaries/visit notes with authentic distances, routes, and facts
- Split lookalikes (Soor Mane ≠ Sirimane, Rani Jhari ≠ Jhari Falls, Devaramane ≠ Deviramma)
- Tourism office contact fields under `official` / Visit essentials

No intentional UI redesign — content and catalogue counts only.

Regenerate merge: `python3 scripts/merge_brochure_data.py` (then re-fold routes into `visit` if needed).
