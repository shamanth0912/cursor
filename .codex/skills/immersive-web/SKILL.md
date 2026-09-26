---
name: immersive-web
description: Build cinematic, scroll-driven websites with AI-generated hero imagery and video backgrounds from Google Flow. Produces full Next.js + Tailwind + Motion/GSAP code with integrated AI assets. Use when the user wants an immersive, 3D-feeling, scroll-driven, or award-style website.
type: flexible
version: 1.1.1
foundation: false
consumes: [brand-identity, character-pipeline]
tools: [gflow-cli]
---

# Immersive Scroll Websites

Builds a scroll-driven site with AI-generated visuals. Outputs production Next.js + Tailwind v4 + Motion/GSAP code.

Read `references/quality-gate.md` (mandatory, motion and anti-slop rules) and `references/scroll-patterns.md` for scroll techniques.

## When to Use
Immersive landing pages, portfolios, product launches, award-style sites with parallax and cinematic transitions.

## Workflow

1. **Brief inference (read the room)** - identify page kind, audience, vibe words, references. Output a one-line "Design Read" before building.
2. **Set three dials** (default 8/6/4): DESIGN_VARIANCE, MOTION_INTENSITY, VISUAL_DENSITY. Confirm with user.
3. **Inherit brand** if available - use `--project <brand>` so generated assets match the brand system; otherwise pick one named project for this run. Every gflow command shares that `--project <name>` and runs with `--no-headed`; split assets across projects only if the user explicitly asks.
4. **Generate hero imagery** - `gflow image --model imagen-4 --ratio 16:9 --outputs 4 --upscale 4k --out ./public/hero` (use `--project <brand>` if set).
5. **Generate background video loops** - `gflow video --model veo-3.1-quality --duration 8 --ratio 16:9 --out ./public/video`.
6. **Longer background sequences (optional)** - when a section needs a video that runs past a single 8s generation, extend the clip with `gflow extend --media-id <clip>` plus repeated `--prompt "<how the motion continues>"` (about 7-8s per extend) before integrating it; keep file size in check since it ships as a page asset.
7. **Build the layout** - scroll-driven sections with GSAP ScrollTrigger pinning and Motion springs. At least 4 distinct layout families across the page. Turbopack is prohibited: keep `next dev` and `next build` on the standard webpack toolchain and strip `--turbopack` from package.json scripts if a scaffold added it.
8. **Integrate assets** - optimized WebP for images, MP4 (muted, loop, playsinline) for video backgrounds.
9. **Pre-flight check** - run the quality gate: no scroll listeners, transform/opacity only, reduced-motion guard, no AI-purple, no centered-hero default, distinct section layouts, no em-dashes in copy, no `--turbopack` in package.json scripts.

## Domain Quality Checks
- Section-Layout-Repetition Ban: at least 4 different layout families per page.
- Anti-center bias: no default centered hero when DESIGN_VARIANCE > 4.
- `min-h-[100dvh]` not `h-screen`; container `max-w-[1400px]`.
- Dev and build scripts run plain `next dev` / `next build`; the `--turbopack` flag is banned.
- Background video: muted, `playsinline`, poster frame from generated hero.
