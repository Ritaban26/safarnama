# Safarnama — Travel Archive Design System (MASTER)

Source of truth for every page. Page-specific overrides live in `design-system/pages/`.

## Concept

A **painted travel journal** — the private magazine of a circle of friends, with a curated
public face. Every surface should feel like gouache on warm paper: soft washes of color,
visible grain, hand-taped photographs, handwritten margin notes. Studio-Ghibli-inspired
warmth (meadow greens, dusk skies, ember orange) executed with editorial discipline.

## Style

- **Base style:** Nature Distilled × Anti-Polish (hand-made warmth, paper textures, organic shapes)
- **Pattern:** Scroll-triggered storytelling; each section is a "chapter" with its own wash of color
- **Texture:** global film-grain overlay (~5% opacity), watercolor blob washes behind sections,
  torn/wavy SVG dividers between chapters
- **Photography treatment:** taped polaroid cards, slight deterministic rotation (−2.5° … 2.5°),
  warm paper mat border, soft natural shadow

## Colors (CSS variables in `globals.css`)

| Token | Hex | Role |
|---|---|---|
| `--paper` | `#f6efdf` | page background (warm cream) |
| `--paper-deep` | `#ecdfc3` | cards, alt sections |
| `--ink` | `#33291f` | primary text (warm sepia ink) |
| `--ink-soft` | `#6b5d4b` | secondary text |
| `--moss` | `#4a6741` | forest green — primary brand |
| `--meadow` | `#88a868` | light green accents |
| `--sky` | `#86b5c9` | day sky blue |
| `--dusk` | `#34506b` | night/dusk blue (dark sections) |
| `--ember` | `#d8702f` | CTA / Calcifer orange |
| `--blossom` | `#cf8295` | flower pink accent |
| `--gold` | `#d9a441` | highlights, stars, tape |

Light theme only for v1. Dark *sections* (dusk blue) are used for contrast, not a dark mode.

## Typography

- **Display / headings:** Cormorant Garamond (500–700) — literary, storybook
- **Handwritten accents:** Caveat — margin notes, captions, tape labels
- **Body / UI:** Karla — humanist, warm, highly readable
- Body 16–18px, line-height 1.65, measure ≤ 70ch. Headings tracking-tight, never all-caps
  except small Karla eyebrow labels (tracking-[0.2em]).

## Motion (GSAP + Framer Motion)

- **Home = snap-scroll chapters**: full-viewport sections, CSS `snap-y snap-mandatory`
  on lg+ inside the `SnapHome` scroll shell (`src/components/motion/SnapHome.tsx`),
  free scroll on mobile. Right-edge dot nav jumps between chapters.
- **3D scroll language (GSAP ScrollTrigger)**: content enters by rotating up out of the
  page plane (`[data-depth]`, rotateX 9° → 0, z −160 → 0); grids cascade with 120ms
  stagger (`[data-depth-stagger]`); backgrounds move at differential speeds
  (`[data-parallax="0.2–0.9"]`); the hero painting dolly-zooms as you leave it.
- **Pointer 3D tilt (Framer Motion)**: every photo card pivots toward the cursor on
  sprung axes (`TiltCard`); tape/caption sit at different translateZ depths so the
  card reads as physically thick.
- **Inner pages**: `Reveal` (Framer Motion whileInView, 3D rise, once) on cards/galleries.
- Ambient: drifting clouds, flickering ember glow — slow (20s+), subtle.
- All motion behind `prefers-reduced-motion` guards (gsap.matchMedia / useReducedMotion).

## Scene realism rules (anime, not cartoon)

- Skies are 4–6 stop gradients, never flat fills
- Cumulus clouds have lit crowns and cool shaded undersides; distant ones are blurred
- Aerial perspective: far landforms desaturate toward sky blue behind blurred haze bands
- Light sources get true gaussian bloom (sun, lanterns, windows, fire) + god rays
- Mountains/buildings carry a shadow face; water reflects with blurred streaks
- Final grade pass on every scene: warm soft-light wash up top, cool shadow floor,
  ~10% grain, vignette

## Anti-patterns (never)

- Purple gradients, glassmorphism, neon, pure white `#fff` backgrounds
- Inter/Roboto/system fonts; emoji as icons (inline SVG only)
- Hard drop shadows, perfect rectangles everywhere — radii vary organically (0.75–1.5rem)

## Roles → surfaces

- **Public:** `/`, `/trips`, `/trips/[slug]`, `/journal/[slug]` — curated, spacious, editorial
- **Member:** `/archive`, `/archive/[slug]` — denser, utilitarian-warm, full media visibility,
  upload + request-public flows
- **Admin:** `/admin` — the editor's desk: approval queue first, then members & trips
