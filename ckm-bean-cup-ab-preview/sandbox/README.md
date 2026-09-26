# Bean to Cup sandbox (inside A/B preview)

Admin HUD for the immersive walk. **Not on the live website.**

## Run (from preview root)

```bash
cd ckm-bean-cup-ab-preview
python3 serve.py
```

Open `http://127.0.0.1:43191/sandbox/bean-to-cup/`.

Press **H** or **Admin** to show the panel. Sliders cover world, camera, motion, focus, plates, shards, particles, copy rail, and navigation. **Export JSON** when a setting should later move into production. Tweaks persist in this browser (`localStorage`).

`/dist/*` is rewritten to the classic walk tree by `serve.py`.
