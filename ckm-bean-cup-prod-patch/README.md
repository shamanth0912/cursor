# Bean-to-cup prod patch (Aroha)

Apply to https://github.com/aroha-dev-001/CKM-directory so Vercel updates
https://chikkamagaluru-companion.vercel.app/

## Apply + push (from a machine with Aroha write access)

```bash
git clone https://github.com/aroha-dev-001/CKM-directory.git
cd CKM-directory
cp /path/to/cursor/ckm-bean-cup-prod-patch/kage-walk.js dist/kage-walk.js
cp /path/to/cursor/ckm-bean-cup-prod-patch/bean-to-cup.html dist/bean-to-cup.html
git checkout -b fix/bean-cup-shard-glitch
git add dist/kage-walk.js dist/bean-to-cup.html
git commit -m "Fix bean-to-cup Baba Budan shard mosaic glitch"
git push -u origin HEAD
# merge to main (or open PR) — Vercel prod should redeploy
```

## What changed

- `shards.enabled: false` (stacked WebGL shards caused the mosaic glitch)
- nearest-only guard if shards are re-enabled later
- fixed broken `</script` tag; cache bump `kage-walk.js?v=cup26`
