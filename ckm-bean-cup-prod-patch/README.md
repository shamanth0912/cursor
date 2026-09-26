# Bean to Cup — current-rail prod patch

**Selected layout:** current rail (translucent left overlay on the 3D plate walk).  
Replaces the live `bean-flight` / Scrollcraft page with the kage-walk player.

Cursor bot **cannot push** to `aroha-dev-001/CKM-directory` (403). Apply these files into Aroha `dist/`:

```bash
git clone https://github.com/aroha-dev-001/CKM-directory.git
cd CKM-directory
cp /path/to/ckm-bean-cup-prod-patch/bean-to-cup.html dist/
cp /path/to/ckm-bean-cup-prod-patch/kage-walk.js dist/
cp /path/to/ckm-bean-cup-prod-patch/seq-walk.css dist/
git checkout -b cursor/bean-cup-current-rail-prod
git add dist/bean-to-cup.html dist/kage-walk.js dist/seq-walk.css
git commit -m "Ship current-rail Bean to Cup walk to production"
git push -u origin HEAD
# open PR → merge → Vercel deploys
```

Optional: `?layout=classic` still enables the solid left rail.

Requires existing `dist/secret-pathways-assets/three.min.js`, bean-to-cup stills, `bean-cursor.js`, `chikku.js`.
