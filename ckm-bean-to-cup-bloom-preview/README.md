# Bean to cup — Bloom / Scrollcraft preview

**Not production.** Do not merge to aroha `main` or deploy to Vercel until approved.

## Decision

**Port Scrollcraft** (`worldflight`) — same engine Bloom uses. Stills-only posters still get seam crossfades, Ken Burns scale, lerp scroll, and copy windows.

## What’s here

- 15 chapters (beats **00–14**) as full-bleed still slides  
- Left chapter rail with names + Act I / II ground mark  
- Smooth lerp scroll (`data-sc-lerp="0.12"`)  
- Section crossfades (`data-sc-seam`)  
- Aperture / lens first-load entrance  
- Alternating left / right copy  
- Companion dark coffee UI (not Bloom lime)

## Local preview

```bash
cd ckm-bean-to-cup-bloom-preview
python3 build_bloom_walk.py
cd dist
python3 -m http.server 8788 --bind 127.0.0.1
```

Open: http://127.0.0.1:8788/bean-to-cup.html

`dist/assets` is a symlink to companion stills (not committed).
