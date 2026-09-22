# Stealable prompts

Adapt tokens. Do not ship Janus copy unless the user wants that demo.

## Video prompt — falling petals

```
A sleek modern laptop rests open on a mossy, ancient tree stump in a lush green clearing. A vibrant, clear blue sky serves as the background. Delicate pink flower petals slowly drift downwards through the air, catching the sunlight. Cinematic, soft lighting filters through the surrounding foliage, creating a serene, peaceful atmosphere. The laptop screen displays the clean, minimalist text "{{BRAND}}" in a modern sans-serif font. The camera executes a slow, subtle push-in towards the screen. Seamless 5-second loop with identical starting and ending frames, flawless looping, ultra-detailed 4K, cinematic realism.
```

Keep slow motion. Models read prompts loosely — keep the best take even if objects drift (the guide’s “laptop” came back as a CRT).

Palette constraint for this look: no purple/indigo in the UI.

## Video prompt — liquid light

```
A sleek, minimalist, high-gloss liquid ribbon wave slowly undulating across the lower third of a pitch-black background. The liquid wave features a vibrant, flowing gradient of metallic colors: deep cobalt blue, ultraviolet purple, glowing electric pink, fiery orange, and bright golden yellow. The texture is ultra-smooth, resembling liquid silk or fluid metallic chrome with realistic reflections and soft highlights. The animation is a gentle, smooth, continuous wave motion. Seamlessly looping 5-second video with identical start and end frames for an infinite, flawless loop. Cinematic lighting, 4K resolution.
```

Do **not** apply the no-purple/indigo UI constraint for this vibe.

## Video prompt — custom (template)

```
{{SCENE}}. Slow, subtle motion only. Seamless 5-second loop with identical starting and ending frames, flawless looping, ultra-detailed 4K, cinematic realism, soft lighting.
```

## Hero section prompt (coding tool)

```
Build a single-page cinematic hero section for {{BRAND}}. Stack: React + TypeScript + Tailwind CSS + lucide-react (Vite). Single App.tsx + index.css. Match these specs exactly.

SECTION SHELL
- <section className="relative w-full h-screen overflow-hidden bg-black">
- Prevents white flash before the video loads.

BACKGROUND VIDEO (the hero visual)
- One full-screen <video>, absolutely positioned, object-cover, covering the whole viewport, z-0.
- Attributes: autoPlay, muted, loop, playsInline (all four are required or it won't autoplay on mobile).
- Video source: {{VIDEO_PATH_OR_ATTACHED}}
- Add a subtle bottom fade: an absolutely positioned gradient div (h-40, from bg-black to transparent, z-10) so text stays readable over the footer.

FONT
- Import Instrument Serif (regular + italic): @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap')
- Headings use font-family: 'Instrument Serif', serif. Body/buttons/nav use system-ui, sans-serif.

LIQUID GLASS (.liquid-glass class, use for nav bar, input, buttons)
- Copy the recipe from references/liquid-glass.css

CONTENT LAYER (z-10, flex column, full height)
- Nav (top): .liquid-glass rounded-full pill, max-w-5xl mx-auto, px-6 py-3, flex items-center justify-between.
- Left: logo "{{BRAND}}", white, font-semibold text-lg (optional lucide icon, gap-2).
- Center (hidden on mobile, md+): links {{NAV_LINKS}}, text-white/80 hover:text-white text-sm gap-8.
- Right: "{{CTA_SECONDARY}}" plain white text + "{{CTA_PRIMARY}}" as a .liquid-glass rounded-full px-6 py-2 button.
- Hero (flex-1, centered, text-center, px-6):
- Heading: "{{HEADLINE}}", Instrument Serif, text-5xl md:text-6xl lg:text-7xl, text-white, tracking-tight, mb-8.
- Sub: "{{SUBTEXT}}", text-white/80 text-sm max-w-xl leading-relaxed.
- Email capture: .liquid-glass rounded-full pill, transparent input (placeholder "Enter your email") + white circular submit button with a lucide ArrowRight icon.

RESPONSIVE: smaller heading + tighter padding on mobile; nav collapses to a .liquid-glass hamburger (lucide Menu/X).
COLORS: black bg, white text, white/20 borders. {{COLOR_CONSTRAINT}}
```

`COLOR_CONSTRAINT` is `No purple/indigo.` for petals/neutral looks, empty for liquid-light.
