# Fix GitHub Actions → Vercel deploy (aroha CKM-directory)

## Problem
Workflow fails with: `Could not retrieve Project Settings` because it runs `vercel pull` without a linked `.vercel` directory in CI.

## Fix (30 seconds on GitHub)
1. Open https://github.com/aroha-dev-001/CKM-directory/blob/main/.github/workflows/deploy-vercel.yml
2. Click the pencil (Edit)
3. Replace the whole file with the contents of `ckm-directory-sync/deploy-vercel.yml` from this sync branch  
   **or** change the run block to only:

```yaml
          npx vercel@latest deploy dist --prod --yes --token "$VERCEL_TOKEN"
```

(remove the `vercel pull` line)

4. Commit directly to **`main`**
5. Wait for **Actions → Deploy to Vercel** to go green
6. Hard-refresh https://chikkamagaluru-companion.vercel.app/places.html

Secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` must remain set (they already are).
