# Photo gaps — authentic images still needed

Freely licensed (Commons / Flickr CC BY/BY-SA / CC0 / PD) searches were exhausted for these cards. **Do not hotlink copyrighted Google/blog photos.**

| Place | Current card image | Status |
| --- | --- | --- |
| **Manikyadhara Falls** | `manikyadhara.jpg` ← updated to Commons `Manikyadhara.JPG` (Amarrg, Public Domain) — **authentic cascade**, but source is only 213×284 so the card is soft after upscale | Prefer a higher-res CC upload of the falls when available |
| **Marle Twin Temples** | `marle-twin-temples.jpg` is an **architectural floor plan** (CC0), not a photograph | **No place photo** on Commons/Openverse/Flickr CC. Blog photos exist but are copyrighted |
| **Mallikarjuna Temple, Yagati** | `yagati-kadur-road.jpg` — Kadur road landscape stand-in | **No temple photo** under a free license found |
| **Kopada Veerabhadra Temple, Koppa** | `koppa-hills.jpg` — tea-estate stand-in near Koppa | **No temple photo** under a free license found |

## How to supply real photos (aroha)

1. Shoot or obtain rights to exterior photos of each temple (and a high-res Manikyadhara cascade if possible).
2. Prefer releasing them on Wikimedia Commons as **CC BY-SA 4.0** (or grant the Companion a written license).
3. Drop files into `dist/assets/` as:
   - `marle-twin-temples.jpg`
   - `yagati-mallikarjuna.jpg` (then point `yagati-mallikarjuna-temple` `image` to it)
   - `kopada-veerabhadra.jpg` (then point `kopada-veerabhadra-temple` `image` to it)
   - `manikyadhara.jpg` (replace)
4. Cover-crop to **1800×1200**, update `credits` in `dist/data.js`, bump `data.js?v=…` in HTML, commit on `aroha-dev-001/CKM-directory`.

## Sources checked

Wikimedia Commons, Openverse (commercial+modification), Flickr CC via Openverse, Nominatim/OSM vicinity, Karnataka tourism pages (no reusable license), travel blogs (all-rights-reserved photos — not used).
