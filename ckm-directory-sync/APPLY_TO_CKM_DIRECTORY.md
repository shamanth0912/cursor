# Apply brochure enrichment to aroha-dev-001/CKM-directory

This Cloud Agent could **read** https://github.com/aroha-dev-001/CKM-directory but **not push**
(`Permission denied to cursor[bot]`). Grant the Cursor GitHub App write access to the
`aroha-dev-001` org (or add the agent as a collaborator), then re-run the agent — or apply locally:

```bash
git clone https://github.com/aroha-dev-001/CKM-directory.git
cd CKM-directory
git checkout -b cursor/brochure-data-enrich-edaf
cp /path/to/ckm-directory-sync/data.js dist/data.js
# bump cache query in all dist HTML files:
#   data.js?v=sage30  ->  data.js?v=brochure72
git add dist/data.js dist/*.html
git commit -m "Enrich destinations with tourism brochure facts"
git push -u origin cursor/brochure-data-enrich-edaf
# then open PR into main, or merge and let Vercel deploy
```

Or apply the included patch:

```bash
git am /path/to/ckm-directory-sync/0001-enrich-destinations-brochure.patch
git push -u origin cursor/brochure-data-enrich-edaf
```

After merge to `main`, Vercel should publish `dist/` and the live companion will show **72 places**.
