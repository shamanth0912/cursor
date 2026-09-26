---
name: cinematic-sites
description: Build a premium cinematic landing hero — full-viewport looping background video, liquid-glass nav, serif headline, email capture — in a short coding pass. Use when the user wants an expensive-looking animated website, cinematic hero, looping video background, glassmorphism nav, Janus-style studio site, falling-petals or liquid-light vibe, or a “10 minute cinematic landing page.”
---

# Cinematic sites

Looks expensive. Is not a 3D engine. The whole trick is a **slow looping video** behind a **clean glass hero**.

Follow this skill whenever the request matches that look. Read `references/prompts.md` for stealable video/hero prompts and `references/liquid-glass.css` for the exact glass recipe.

## When not to use

Dashboards, docs, settings, dense SaaS chrome, or Superdesign exploration. Those are different skills. If they only want a poster or still, do not scaffold a Vite app.

## Defaults

- Stack: React + TypeScript + Tailwind CSS + lucide-react (Vite). Prefer a single `App.tsx` + `index.css` on a greenfield job.
- Shell: black full-viewport section so there is no white flash before the first video frame.
- Type: Instrument Serif (regular + italic) for headings; `system-ui, sans-serif` for body, nav, buttons.
- Palette: black background, white text, `white/20` borders. **No purple/indigo** unless the vibe is liquid-light or the user overrides.
- Motion: the video does the work. Do not add GSAP/Lottie/canvas particles unless asked.

## Workflow

### 1. Brief (do not skip)

Collect or invent:

| Token | Example |
| --- | --- |
| `BRAND` | Janus Studio |
| `NAV_LINKS` | Work, Studio, Journal |
| `CTA_SECONDARY` | View work |
| `CTA_PRIMARY` | Book a call |
| `HEADLINE` | Motion that feels expensive. |
| `SUBTEXT` | One loop. One hero. No agency. |
| Vibe | `petals` \| `liquid-light` \| custom video |

If the user already attached a video, use it. Otherwise generate or prompt for a **seamless ~5s loop**.

### 2. Generate the loop

One rule: **slow, subtle motion**. Fast motion shows the seam and kills the calm.

Ask the video model for **identical start and end frames**, 5-second seamless loop, cinematic lighting, 4K if available. Generate a few takes; keep the one that feels best even if the prompt was not followed literally.

Copy-ready prompts: `references/prompts.md`.

Place the file in the app (`public/hero-loop.mp4` or equivalent). Compress for web before shipping. Mute audio.

### 3. Build the hero

Match these specs unless the user already has a different React tree — then port the same structure into their layout.

**Section shell**

```tsx
<section className="relative w-full h-screen overflow-hidden bg-black">
```

**Background video** (`z-0`)

- One full-screen `<video>`, absolutely positioned, `object-cover`, covering the viewport.
- Required attributes: `autoPlay` `muted` `loop` `playsInline`. All four. Missing any one breaks mobile autoplay.
- Subtle bottom fade: absolutely positioned `h-40` gradient `from-black` to transparent, `z-10`, so footer/text stays readable.

**Font**

```css
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');
```

Headings: `'Instrument Serif', serif`. Everything else: `system-ui, sans-serif`.

**Liquid glass**

Use class `.liquid-glass` on the nav pill, email pill, and primary button. Copy `references/liquid-glass.css` exactly (luminosity blend, 4px blur, inset 1px highlight, `::before` XOR gradient stroke).

**Content layer** (`z-10`, flex column, full height)

- **Nav** (top): `.liquid-glass` rounded-full pill, `max-w-5xl mx-auto`, `px-6 py-3`, `flex items-center justify-between`.
  - Left: logo `{{BRAND}}`, white, `font-semibold text-lg` (optional lucide icon, `gap-2`).
  - Center (`hidden md:flex`): `{{NAV_LINKS}}`, `text-white/80 hover:text-white text-sm gap-8`.
  - Right: `{{CTA_SECONDARY}}` plain white text + `{{CTA_PRIMARY}}` as `.liquid-glass rounded-full px-6 py-2` button.
- **Hero** (`flex-1`, centered, `text-center`, `px-6`):
  - Heading: `{{HEADLINE}}`, Instrument Serif, `text-5xl md:text-6xl lg:text-7xl text-white tracking-tight mb-8`.
  - Sub: `{{SUBTEXT}}`, `text-white/80 text-sm max-w-xl leading-relaxed`.
  - Email capture: `.liquid-glass` rounded-full pill, transparent input (placeholder `Enter your email`) + white circular submit with lucide `ArrowRight`.
- **Responsive**: smaller heading + tighter padding on mobile; nav collapses to a `.liquid-glass` hamburger (`Menu` / `X`).

Paste the long coding prompt from `references/prompts.md` when scaffolding from a blank chat.

### 4. Swap the vibe

Same build, new brand. Change **one** lever at a time:

1. **Video** — petals, liquid light, slow fog. This is the big mood shift.
2. **Fonts** — swap Instrument Serif for another display face.
3. **Colors** — text, borders, button fills. Tiny shifts read as a new studio.

For liquid-light, **delete** the “no purple/indigo” constraint so the metallic ribbon can run full spectrum.

### 5. Ship checklist

- [ ] Video has `autoPlay muted loop playsInline`
- [ ] Section background is black (no white flash)
- [ ] Loop seam is invisible — watch one full cycle; regenerate if it jumps
- [ ] Audio muted; file compressed for web
- [ ] Tested on a phone, not only desktop preview
- [ ] No accidental indigo/purple Tailwind defaults on the petals look

## Implementation notes

- Email submit: prevent default; if there is no backend, no-op or `mailto:` is fine. Do not fake a SaaS waitlist API.
- Prefer `object-cover` over `object-contain` so the loop never letterboxes.
- `pointer-events-none` on the video and on `.liquid-glass::before`.
- Keep z-index simple: video `z-0`, fade + UI `z-10`, mobile menu overlay above that.

## After build

Offer one alternate vibe (swap the loop or the display font) so they see the three-lever idea. Do not expand into extra pages unless they ask.
