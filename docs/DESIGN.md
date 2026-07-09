# Design organisation

This doc explains how Safarnama's design is *organised in code* — tokens, fonts,
component layers, motion system, and layout patterns. The source of truth for
the aesthetic itself (concept, exact colors, scene rules, anti-patterns) is
[`design-system/MASTER.md`](../design-system/MASTER.md); read that first if you're
deciding what something should look like. This doc is about where things live
and how the pieces fit together.

## Philosophy

Safarnama is a **painted travel journal** — a private magazine for a circle of
friends with a curated public face. MASTER.md's framing: every surface should
feel like gouache on warm paper — soft color washes, visible grain, hand-taped
photographs, handwritten margin notes. Studio-Ghibli-inspired warmth (meadow
greens, dusk skies, ember orange) executed with editorial discipline, not
whimsy for its own sake. The style keywords are **Nature Distilled × Anti-Polish**:
hand-made warmth and organic shapes, explicitly *not* glassmorphism, neon,
purple gradients, or perfect rectangles.

## Token system

Every brand color is a CSS custom property, defined once in
`src/app/globals.css` inside a Tailwind v4 `@theme` block, which projects it
straight into a Tailwind utility class (`--color-moss` → `bg-moss`,
`text-moss`, `border-moss/25`, etc.):

```css
/* src/app/globals.css */
@theme {
  --color-paper: #f6efdf;
  --color-paper-deep: #ecdfc3;
  --color-paper-warm: #f9f4e8;
  --color-ink: #33291f;
  --color-ink-soft: #6b5d4b;
  --color-ink-faint: #9a8b74;
  --color-moss: #4a6741;
  --color-moss-deep: #36503a;
  --color-meadow: #88a868;
  --color-sky: #86b5c9;
  --color-dusk: #34506b;
  --color-dusk-deep: #243a52;
  --color-ember: #d8702f;
  --color-ember-deep: #b65820;
  --color-blossom: #cf8295;
  --color-gold: #d9a441;
  ...
}
```

| Token | Role |
|---|---|
| `--color-paper` / `-deep` / `-warm` | page background, card/alt-section backgrounds, warm surface for photo mats |
| `--color-ink` / `-soft` / `-faint` | primary text / secondary text / tertiary (metadata, timestamps) |
| `--color-moss` / `-deep` | primary brand green — nav mark, active nav pill, badges |
| `--color-meadow` | light green accent |
| `--color-sky` | day-sky blue accent |
| `--color-dusk` / `-deep` | dark contrast sections (footer, dusk-toned nav) — not a dark mode, just a "night chapter" |
| `--color-ember` / `-deep` | CTA / Calcifer orange — links, hover states, eyebrows |
| `--color-blossom` | flower-pink accent |
| `--color-gold` | highlights, stars, tape, handwritten quote color |

Three shadow tokens (`--shadow-painted`, `--shadow-photo`, `--shadow-lift`) give
soft, warm-toned, multi-layer shadows instead of hard drop shadows — used on
the floating nav, photo cards, and hover states respectively.

**Rule, enforced throughout the codebase:** never use raw Tailwind palette
classes (`blue-500`, `green-600`, etc.) for brand surfaces — always the
project's own token classes (`bg-moss`, `text-ember`, `border-ink/10`). Light
theme only for v1; "dark" sections (`dusk`/`dusk-deep`) are a deliberate
contrast chapter, not a dark-mode toggle.

## Typography

Fonts are loaded via `next/font/google` in `src/app/layout.tsx` and exposed as
CSS variables on `<html>`, then mapped to semantic font tokens in `globals.css`:

```tsx
// src/app/layout.tsx
const cormorant = Cormorant_Garamond({ variable: "--font-cormorant", weight: ["400","500","600","700"], style: ["normal","italic"] });
const caveat    = Caveat({ variable: "--font-caveat", weight: ["400","500","600"] });
const karla     = Karla({ variable: "--font-karla", weight: ["300","400","500","600","700"] });
```

```css
/* globals.css @theme */
--font-display: var(--font-cormorant), Georgia, serif;
--font-hand: var(--font-caveat), cursive;
--font-body: var(--font-karla), "Segoe UI", sans-serif;
```

| Font | Tailwind class | Used for |
|---|---|---|
| **Cormorant Garamond** | `font-display` | Headings, logo wordmark ("Safarnama"), section titles, the drop-cap first letter in journal prose (`.journal-prose p:first-of-type::first-letter`) |
| **Caveat** | `font-hand` | Handwritten accents — photo captions (`PhotoCard`), nav tagline ("a travel archive"), footer pull-quote |
| **Karla** | `font-body` (also the page's default `body` font) | All UI text and body copy — nav links, buttons, eyebrows |

Body text targets 16–18px at 1.65 line-height, measure ≤70ch; headings are
tracking-tight and never all-caps except small Karla "eyebrow" labels
(`Eyebrow` component, `tracking-[0.22em]`, uppercase, colored `text-ember` or
`text-gold`). Inter/Roboto/system fonts are an explicit anti-pattern.

## Component organisation

- **`src/components/ui.tsx`** — small reusable primitives with no page
  opinions: `Eyebrow`, `WaveDivider` (torn/wavy SVG section divider),
  `Avatar` / `AvatarStack`, `Badge` (tone-based: `moss` | `ember` | `dusk` |
  `gold` | `faint`, each mapping to token-based Tailwind classes).
- **`src/components/icons.tsx`** — a minimal hand-rolled icon set (24×24
  stroke icons, Lucide-style, `currentColor` stroke) exported as
  `IconArrow`, `IconPlay`, `IconLock`, `IconGlobe`, `IconUpload`,
  `IconDownload`, `IconCheck`, `IconX`, `IconCamera`, `IconLeaf`,
  `IconCompass`, `IconFeather`, `IconClock`, `IconUsers`, `IconTrash`. No
  emoji-as-icon anywhere (an explicit anti-pattern) — always inline SVG so
  color follows the token via `currentColor`.
- **`src/components/PaintedScene.tsx`** — anime-grade generative SVG scenery
  used as a placeholder for any `Media` item with no `url`. Eight variants
  (`meadow`, `dusk`, `sea`, `forest`, `lantern`, `mountain`, `ember`,
  `valley`), each built from shared painterly primitives (`Cloud`, `Haze`,
  `Flowers`, `Birds`, `SkyGrad`) plus a final grade pass on every scene:
  warm soft-light wash, film grain via `feTurbulence`, and a radial
  vignette. Follows MASTER.md's "anime, not cartoon" rules — multi-stop
  skies, lit cloud crowns with cool shaded undersides, aerial-perspective
  haze bands, bloom on light sources.
- **`src/components/PhotoCard.tsx`** — the "taped photograph" unit: a
  `TiltCard`-wrapped `<figure>` with a `.photo-card` paper mat, a
  `.tape` strip, and a handwritten Caveat caption. `MediaFrame` inside it
  is the actual branch point: real photos/videos render via `next/image` /
  `<video>` when `item.url` exists; otherwise it falls back to
  `<PaintedScene variant={item.variant} />` (with a per-item hue-rotate
  filter for variety). Deterministic slight rotation per card comes from a
  fixed `ROTATIONS` array indexed by position, not randomness.
- **`SiteNav.tsx`** / **`SiteFooter.tsx`** — public-site chrome. `SiteNav` is
  a fixed, rounded, backdrop-blurred pill bar with a `tone` prop
  (`"paper" | "dusk"`) so it can sit on top of either a light or dark hero.
  `SiteFooter` is a dusk-deep band with scattered CSS star dots and the
  Caveat pull-quote.
- **`ArchiveShell.tsx`** — chrome for the signed-in side (`/archive`,
  `/archive/desk`). Sticky header, active-tab styling via an `active:
  "archive" | "admin"` prop, admin-only "Editor's desk" link gated on
  `user.role`, and a footer with an inline `logout` server action form.

## Motion system (`src/components/motion/`)

- **`SmoothScrollHome.tsx`** — the home page's scroll engine. A single
  damped `requestAnimationFrame` loop is the whole aesthetic: the scroll
  listener only updates a `target` value; each frame eases a `current`
  value toward it (`current += (target - current) * ease`, `ease = 0.085`).
  Every scroll-reactive visual — hero copy translate/opacity, hero sun
  drift, sky parallax, alternating cloud layers, the meadow-strip hills,
  the pinned circle-card scale/rotate, generic `[data-parallax]` wash
  layers — reads off `current`, never `window.scrollY` directly, which is
  what gives the whole page its viscous, "settling" feel instead of 1:1
  scroll-tracking. Rect-based sections are damped too, by offsetting their
  real `getBoundingClientRect()` by `(scrollY - current)`. One-shot
  entrances (`.reveal` elements) are handled separately by an
  `IntersectionObserver` so they fire once and stop costing anything — they
  are deliberately *not* routed through the rAF loop. Respects
  `prefers-reduced-motion` by setting `ease = 1` (snap instantly, no lag).
  Use this only for the home page's bespoke chaptered scroll; it's a
  full-page wrapper, not a reusable primitive.
- **`Reveal.tsx`** — the reusable scroll-into-view primitive for every other
  (non-home) page. Framer Motion `whileInView`-style: `useInView(ref, {
  once: true, amount: 0.15 })` triggers a 3D rise-in (`opacity`, `y: 36→0`,
  `rotateX: 7→0`, `transformPerspective: 1000`, ease `[0.22, 0.8, 0.3, 1]`,
  0.85s). Has a 700ms fallback timer so content already on-screen at mount
  (e.g. mobile) isn't stuck hidden if the observer never fires. Use this to
  wrap cards/sections on inner pages (trips, journal, archive).
  Corresponds to the CSS-only `.reveal` / `.reveal.in` classes in
  `globals.css` used on the home page's IO-driven reveals ("watercolor
  bloom": blur + drift settle, not a flat slide).
- **`TiltCard.tsx`** — pointer-tracked 3D tilt, wraps any card that should
  feel like a physical object. Tracks pointer position as `0–1` motion
  values, springs `rotateX`/`rotateY` toward the cursor (`stiffness: 160,
  damping: 18`), lifts `scale: 1.025` on hover, and sets
  `transformStyle: "preserve-3d"` so nested elements at different
  `translateZ` depths (see `PhotoCard`'s tape at `translateZ(26px)`, image
  at `14px`, caption at `8px`) read as a physically thick, taped object
  rather than a flat card. Bails to a plain `<div>` under
  `useReducedMotion()`. This is what every `PhotoCard` is wrapped in.

Ambient decoration (drifting clouds, flickering embers, soot sprites, pollen
motes, falling leaves) lives as CSS `@keyframes` classes in `globals.css`
(`.drift`, `.flicker`, `.floaty`, `.spore`, `.leaf`, `.sway-leaf`, `.mote`,
`.godray`, `.strip-grass`) rather than JS — kept slow (7s–40s) and subtle, and
all disabled under `prefers-reduced-motion: reduce`.

## Layout patterns

- **Public site** (`/`, `/trips`, `/trips/[slug]`, `/journal/[slug]`) —
  curated, spacious, editorial. Home uses the full chaptered
  `SmoothScrollHome` treatment; inner public pages use `SiteNav` +
  `SiteFooter` chrome with `Reveal`-wrapped sections/grids
  (`.journeys-grid .reveal` / `.journal-grid .reveal` add a slight
  alternating rotation so cards "settle like leaves, not slide like UI").
- **Member/archive** (`/archive`, `/archive/[slug]`) — denser,
  utilitarian-warm, full media visibility, wrapped in `ArchiveShell` instead
  of `SiteNav`/`SiteFooter`.
- **Admin** (`/archive/desk`) — same `ArchiveShell`, `active="admin"`, the
  editor's desk (approval queue, members, trips).
- **Mobile-first responsive approach**: base (unprefixed) Tailwind classes
  target mobile; `sm:`/`md:`/`lg:` layer on larger-viewport behavior — e.g.
  `SiteNav`'s tagline is `hidden sm:block`, `ArchiveShell`'s avatar name
  block is `hidden ... md:block`, and `SmoothScrollHome`'s snap-scroll
  chaptering is a desktop/lg+ enhancement with free scroll preserved on
  mobile (per MASTER.md).

## Relationship to `design-system/MASTER.md`

MASTER.md is the source of truth for *what things should look like* — the
concept, the full color table with roles, the scene-realism rules for
`PaintedScene`, the anti-patterns list, and page-role definitions. This doc
(`docs/DESIGN.md`) is the map of *how that's implemented in code* — which file
owns which token, which component does what, and how the motion pieces
compose. When the two disagree on an aesthetic call, MASTER.md wins; when you
need to find where something lives, start here.
