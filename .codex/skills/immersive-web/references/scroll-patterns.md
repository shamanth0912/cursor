# Scroll Patterns

## Libraries
- Motion (`motion/react`) for component animation and `useScroll()`.
- GSAP + ScrollTrigger for pinning and scrubbed timelines, isolated in leaf client components.

## Canonical Patterns
- **Pinned hero scrub** - pin the hero, scrub a Motion/GSAP timeline tied to scroll progress (parallax layers, scale, fade).
- **Reveal on enter** - IntersectionObserver or Motion `whileInView` with spring (stiffness 100, damping 20).
- **Horizontal scroll section** - GSAP ScrollTrigger translating a track on `x` via transform only.
- **Video-backed section** - fixed/sticky muted looping MP4 with content scrolling over it.

## Hard Rules (from quality-gate)
- Never `window.addEventListener('scroll')`.
- Animate only `transform` and `opacity`.
- Guard everything above minimal motion with `prefers-reduced-motion`.
- Use `min-h-[100dvh]`, never `h-screen`.
