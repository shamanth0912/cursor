# Apply unique place photos to aroha-dev-001/CKM-directory

Fixes brochure-added destinations that reused the same placeholders (e.g. Bandaje Falls + Elaneer Falls sharing one waterfall still). Every destination now has its own Commons photograph (72 unique paths / hashes).

From your Mac (you have write access):

```bash
cd ~/CKM-directory
git checkout main
git pull
git checkout -b cursor/unique-place-photos-edaf

# Pull sync bundle from shamanth0912/cursor
BASE="https://raw.githubusercontent.com/shamanth0912/cursor/cursor/unique-place-photos-edaf/ckm-directory-sync"
curl -fsSL -o dist/data.js "$BASE/data.js"
mkdir -p dist/assets
for f in baggavalli-yoganarasimha bandaje-arbi bandaje-falls devaramane devarunda-rameshwara elaneer-falls hirenallur-mallikarjuna khandya-markandeshwara kodige-falls kyatanamakki madagada-kere marle-twin-temples narasimha-parvatha panchami-kallu rani-jhari soor-mane-falls ukkada-falls; do
  curl -fsSL -o "dist/assets/${f}.jpg" "$BASE/assets/${f}.jpg"
done

# bump cache query in HTML
find dist -name '*.html' -print0 | xargs -0 sed -i '' 's/data\.js?v=[^"]*/data.js?v=uniqphotos2/g'

git add dist/data.js dist/assets dist/*.html
git commit -m "Give each destination a unique Commons photograph"
git push -u origin HEAD
gh pr create --base main --title "Unique photos for every destination" --body "No repeated placeholders across the 72 destinations. Distinct CC stills for brochure-added places (Bandaje, Elaneer, Kodige, Soor Mane, Ukkada, Rani Jhari, Madagada Kere, temples, etc.)."
```

Then merge + redeploy on the aroha Vercel team (`chikkamagaluru-companion`).

## What changed

| Place | Was (shared) | Now |
| --- | --- | --- |
| Elaneer / Kodige | `bandaje-falls.jpg` | own files |
| Soor Mane / Ukkada | `hebbe-falls.jpg` | own files |
| Madagada Kere | `ayyanakere.jpg` | `madagada-kere.jpg` |
| Rani Jhari / Kyatanamakki / Narasimha Parvatha | `kudremukh-np.jpg` | own files |
| New temples | `belavadi.jpg` / `amruthapura.jpg` | own files |
| Devaramane / Panchami Kallu | shared peaks | own files |

cursor[bot] cannot push to `aroha-dev-001/CKM-directory` (403); this bundle is the apply path.
