# Apply unique place photos to aroha-dev-001/CKM-directory

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
find dist -name '*.html' -print0 | xargs -0 sed -i '' 's/data\.js?v=[^"]*/data.js?v=uniqphotos1/g'

git add dist/data.js dist/assets dist/*.html
git commit -m "Give each new place a unique Commons photograph"
git push -u origin HEAD
gh pr create --base main --title "Unique photos for new places" --body "No repeated placeholders. Distinct CC stills per brochure-added destination."
```

Then merge + redeploy on the aroha Vercel team.
