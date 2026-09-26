# Places shelf preview (WebGL)

**Not production.** Do not merge to `aroha-dev-001/CKM-directory` `main` until approved.

## What this is

Six Chikkamagaluru “volumes” on the ThreeUI Complete Shelf (exact `complete-shelf-v2.html` source, adapted `BOOKS` + place cards):

1. Waterfalls  
2. Temples  
3. Lakes (+ dams)  
4. Ridges & Views (peaks, viewpoints, hill-station, heritage/ghats)  
5. Wildlife  
6. Treks & Forts  

## Preview locally

1. Populate `dist/` from a CKM-directory companion build (or keep a full local clone).
2. Symlink or copy `dist/assets` from that build so place-card thumbnails resolve.
3. Rebuild the shelf page, then serve:

```bash
cd ckm-places-shelf-preview
python3 build_places_shelf.py
cd dist
python3 -m http.server 8777 --bind 127.0.0.1
```

Open:

- http://127.0.0.1:8777/places-shelf.html — WebGL shelf  
- http://127.0.0.1:8777/places.html — classic list + “Open shelf view (preview)”  

This branch is **preview only** — do not merge to aroha `main` until approved.

## Rebuild shelf from source

```bash
cd ckm-places-shelf-preview
python3 build_places_shelf.py
```

Source file: `complete-shelf-v2.source.html` (SHA-256 `606f200fed8602c243f40a11c8c364f0e625c57f80e7c97dc76419da207f198e`).

## What’s committed (lean)

- `build_places_shelf.py` — adapts ThreeUI Complete Shelf → 6 CKM volumes + place cards  
- `complete-shelf-v2.source.html` — exact upstream shelf source  
- `dist/places-shelf.html` — generated page  
- `dist/data.js`, `dist/sections.js`, `dist/places.html`, core CSS/JS for classic list entry  
- Heavy `dist/assets/` and unrelated companion pages are gitignored  
