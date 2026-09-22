---
description: Create an immersive, scroll-driven website with AI-generated visuals from Google Flow
---

Run the immersive-web skill. Do brief inference and output a one-line Design Read, set the three dials, generate hero imagery and background video loops with gflow-cli (inheriting `--project <brand>` if a brand exists), optionally extend a background video past one generation with `gflow extend` and repeated `--prompt`, build scroll-driven Next.js + Tailwind + Motion/GSAP code with at least 4 distinct layout families, and run the full quality-gate pre-flight before delivering. Execute every gflow command with one shared `--project <name>` for the run (the brand project if one exists) and `--no-headed`; only `gflow auth login` runs headed. Turbopack is prohibited: never use `--turbopack` in the Next.js scripts.
