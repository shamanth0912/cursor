# Chikkamagaluru / CKM — Claude handoff

Use this to continue work in Claude Code / Claude Desktop on your machine.

## 1. Clone both repos (required)

```bash
# Preview + agent experiments (this Cursor cloud workspace)
git clone https://github.com/shamanth0912/cursor.git
cd cursor
git fetch --all

# Production companion (Aroha)
git clone https://github.com/aroha-dev-001/CKM-directory.git
```

## 2. Important branches on shamanth0912/cursor

| Branch | What |
|--------|------|
| `cursor/tourism-qr-demo-edaf` | Tourism Day 2026 QR visit pages (4 places) — **current** |
| `cursor/bean-to-cup-bloom-edaf` | Bean-to-cup Scrollcraft/Bloom walk preview |
| `cursor/places-shelf-edaf` | WebGL 6-book places shelf preview |
| `cursor/brochure-data-enrich-edaf` | Brochure enrichment sync |
| `cursor/unique-place-photos-edaf` | Unique Commons photos |
| `cursor/authentic-place-photos-edaf` | Authentic place photos + Vercel Actions |
| `main` | Base |

```bash
cd cursor
git checkout cursor/tourism-qr-demo-edaf
```

## 3. Key folders (after checkout)

- `ckm-tourism-qr-preview/` — QR demo (EN/KN, Ask this place, 08262 placeholders)
- `ckm-bean-to-cup-bloom-preview/` — Bloom/Scrollcraft bean-to-cup (on its branch)
- `ckm-places-shelf-preview/` — WebGL shelf (on its branch)
- Live companion site: https://chikkamagaluru-companion.vercel.app/
- Tourism QR public tunnel (ephemeral): may be dead; rebuild locally

## 4. Run Tourism QR locally

```bash
cd ckm-tourism-qr-preview
python3 scripts/build_places.py --base http://127.0.0.1:8790
cd dist && python3 -m http.server 8790
# open http://127.0.0.1:8790/index.html
```

## 5. Run bean-to-cup Bloom preview

```bash
git checkout cursor/bean-to-cup-bloom-edaf
cd ckm-bean-to-cup-bloom-preview
# symlink assets from companion build if needed
cd dist && python3 -m http.server 8788
# open http://127.0.0.1:8788/bean-to-cup.html
```

## 6. Pending / context for Claude

- Helpline numbers: still placeholders `08262-*` — user will supply real numbers
- Tourism QR places: Mullayanagiri, Horanadu (Kalasa), Sringeri, Bandaje Falls (Mudigere)
- Do **not** deploy previews to aroha production without approval
- Vercel project still under personal alias until transfer to Aroha team `aroha5`
- Uploaded Dept PDFs: Tourism Destination list + QR CODE requirements (World Tourism Day 2026)

## 7. Draft PRs

- https://github.com/shamanth0912/cursor/pull/9 — Tourism QR
- https://github.com/shamanth0912/cursor/pull/8 — Bean-to-cup Bloom
- https://github.com/shamanth0912/cursor/pull/7 — Places shelf
