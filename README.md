# Meridian

A fictional B2B SaaS landing page and sign-up flow, built as a front-end craft demo. Meridian is positioned as a client-relationship-intelligence tool for professional-services firms; every screen exists to show UI design, motion, and component architecture, not to sell a real product.

## Highlights

- **Interactive 3D hero** — a relationship graph (react-three-fiber) with drag-to-rotate, modifier-gated zoom, and amber signal pulses that ripple along the edges toward the key-relationship nodes.
- **Warm-dark design system** — Barlow Condensed (display), Hanken Grotesk (body), and Red Hat Mono (labels) over an OKLCH warm-charcoal palette with a single amber accent.
- **Motion, with restraint** — scroll reveals, count-up stats, a testimonial carousel, a word-by-word closing reveal, a drifting amber glow, and a page-transition curtain. All respect `prefers-reduced-motion`, and content is fully visible without JavaScript (the animation is progressive enhancement).
- **A real sign-up flow** — required indicators, on-blur validation, a submit loading state, and a success confirmation, with a warm-dark product-preview pane.

## Stack

- [Astro](https://astro.build) with React islands
- [react-three-fiber](https://r3f.docs.pmnd.rs/) + [three.js](https://threejs.org) for the hero graph
- [Framer Motion](https://www.framer.com/motion/) for the carousel
- Plain CSS with OKLCH design tokens

## Run it

```sh
npm install
npm run dev      # dev server at localhost:4321
npm run build    # static build to ./dist
npm run preview  # serve the build locally
```

Two routes: `/` (landing) and `/signup`.

## Notes

All firms, people, quotes, and metrics are fictional. This is a portfolio piece, not a shipping product.
