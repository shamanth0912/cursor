# Tourism Day 2026 — QR visit demo (preview only)

**Not production.** Do not deploy to aroha / companion Vercel prod.

## Demo places (one per taluk)

| Taluk | Place |
|-------|--------|
| Chikkamagaluru | Mullayanagiri |
| Kalasa | Horanadu Annapoorneshwari |
| Sringeri | Sringeri Sharadamba |
| Mudigere | Bandaje Falls |

## Features

- Mobile visit page: history, 5 photos, timings, Maps, facilities, helplines, mountain code  
- EN + ಕನ್ನಡ toggle  
- **Ask this place** (canned AI-demo FAQs)  
- Helplines default to **08262-…** placeholders  
- Printable QR PNGs under `dist/qr/`

## Live preview (temporary tunnel)

**Hub:** https://mine-toner-employers-wellington.trycloudflare.com/index.html

- Mullayanagiri: https://mine-toner-employers-wellington.trycloudflare.com/visit.html?id=mullayanagiri
- Horanadu: https://mine-toner-employers-wellington.trycloudflare.com/visit.html?id=horanadu
- Sringeri: https://mine-toner-employers-wellington.trycloudflare.com/visit.html?id=sringeri
- Bandaje Falls: https://mine-toner-employers-wellington.trycloudflare.com/visit.html?id=bandaje-falls

Tunnel dies when the agent session ends — not production.

## Local

```bash
cd ckm-tourism-qr-preview
python3 scripts/build_places.py --base http://127.0.0.1:8790
cd dist && python3 -m http.server 8790 --bind 0.0.0.0
```

After a public tunnel is up, regenerate QRs:

```bash
python3 scripts/build_places.py --base https://YOUR-TUNNEL.trycloudflare.com
```
