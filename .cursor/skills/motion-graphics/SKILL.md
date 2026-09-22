---
name: motion-graphics
description: Create seamless video loops, animated backgrounds, and title sequences using frame interpolation and Veo. Use when the user needs ambient backgrounds, transitions, title sequences, or web hero loops.
type: flexible
version: 1.1.1
foundation: false
consumes: [brand-identity]
tools: [gflow-cli]
---

# Motion Graphics

Produces seamless video loops, animated backgrounds, and title sequences with frame interpolation on Veo.

Read `references/quality-gate.md` (mandatory, motion and anti-slop rules) before building.

## When to Use
Ambient backgrounds, scene transitions, title sequences, web hero loops.

## Workflow

1. **Define motion purpose** - classify the loop as ambient, transition, emphasis, or narrative. Every loop must have an articulable purpose.
2. **Verify session** - run `gflow doctor`. Pick one Flow project for the whole run and pass the same `--project <name>` plus `--no-headed` on every gflow command (reuse `--project <brand>` if a brand exists); split assets across projects only if the user explicitly asks.
3. **Generate start frame** - `gflow image --model imagen-4 --ratio 16:9 --out ./motion/start.png` (use `--project <brand>` if a brand exists).
4. **Generate end frame** - produce a subtle variation of the start frame so the motion reads as gentle drift, not a cut.
5. **Interpolate** - `gflow video --start-frame ./motion/start.png --end-frame ./motion/end.png --duration 4 --model veo-3.1-quality --ratio 16:9 --out ./motion/loop.mp4`.
6. **Validate the loop** - confirm the first and last frames match so it loops cleanly. If the loop jumps, regenerate the end frame closer to the start.
7. **Batch resolutions** - render multiple resolutions via `gflow batch <file.yaml>`.
8. **Longer sequences (optional)** - when a title sequence or background needs to run longer than a single generation, grow it with `gflow extend --media-id <clip>` (ids via `gflow media list`), repeating `--prompt "<how the motion continues>"` per step (about 7-8s each, 148s cap) or `--add-clip` to chain rendered loops; continue a timeline later with `--scene <id>` from `gflow scene list`.

## Domain Quality Checks
- Seamless loop validation: first and last frame coherence so playback loops without a visible jump.
- Motivated motion: every loop has an articulable purpose (ambient, transition, emphasis, narrative).
- Spring-curve base for any UI motion, not linear easing.
- Durations: 3-5s for ambient loops, 8-15s for sequences.

## Inheriting the brand
Inherit the brand system via `--project <brand>` so generated frames match brand colors, lighting, and tone.
