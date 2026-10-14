# 0001. Adopt Figma derived design tokens as the single styling source

**Date**: 2026-10-14
**Status**: In Progress

## Summary

This spec turns the MovieHub Figma design into one shared set of design tokens (named colors, fonts, sizes, corners, shadows) that every page reads, instead of each page picking its own hex colors. The values were measured from the exported frames in `figma-desing/`, because the Figma API was not reachable. The tokens are added alongside today's styles without changing any existing page, and each page switches to them when its own restyle feature is built, so the app never looks half finished. The frozen startup screen keeps exactly the look it has today.

## Requirements

This is a cross cutting standard that also has a buildable scope row (feature 1), so it carries acceptance criteria and a short build plan for the token layer itself; applying the tokens to pages belongs to features 2 to 16.

**User stories**:
- As a developer restyling a page, I want every Figma color, font and size available as a named Tailwind class, so that I never type a raw hex value.
- As a viewer, I want the new UI to look like the Figma file and stay readable, so that the site feels premium and is usable by keyboard.

**Acceptance criteria**:
- **AC-1**: Every token in *Standard definition* exists in one `@theme` block in `src/index.css`, and its Tailwind class compiles. Checked by a temporary file that uses every token class (`bg-canvas`, `bg-surface`, `bg-card`, `bg-sheet`, `bg-raised`, `border-line`, `border-line-strong`, `bg-accent`, `hover:bg-accent-hover`, `active:bg-accent-press`, `text-accent-text`, `text-rating`, `text-muted`, `text-subtle`, `font-display`, `font-body`, `rounded-control`, `rounded-card`, `rounded-panel`, `rounded-sheet`, `shadow-glow`, `shadow-card`, `text-display-xl` to `text-display-sm`, `glass`): `npm run build`, confirm each class appears in the built CSS, then delete the file. (Tailwind 4 leaves unused tokens out of the build, so grepping the build without that file proves nothing.)
- **AC-2**: An element with `font-display` renders in Bebas Neue, and an element with `font-body` renders in Poppins (loaded under the family name `MH Sans`), both with `font-display: swap`, on a fresh load with an empty cache.
- **AC-3**: The startup screen is unchanged. Checked four ways: `git diff --stat -- src/components/LoadingScreen.jsx src/components/Loadingscreen.css` is empty; the computed `font-family` of `.loader-wrapper` is still `Poppins, sans-serif` and resolves to the same platform font as before this change; no network request loads a font file or a Google Fonts stylesheet with "Poppins" in its family name; and no `@font-face` rule or `<link>` anywhere in the app names the family "Poppins".
- **AC-4**: Every component built with the new standard shows a visible rose focus ring on keyboard focus, and no ring on mouse click (text inputs are the exception: browsers show focus on them for any input method, which is expected). Existing pages that use `focus:outline-none` keep their current behavior until migrated.
- **AC-5**: These text pairs meet WCAG AA (4.5:1 or more), with alpha tokens composited over each background first: `text-white` and `text-muted` on `canvas`, `surface`, `card`, `sheet` and `raised`; `accent-text` on `canvas`, `surface`, `card` and `sheet`; white on `accent`, `accent-hover` and `accent-press`; `text-muted` on `glass` over `canvas`. Checked with a short node script using WCAG relative luminance; the script is throwaway, and its numbers are pasted into the PR description.
- **AC-6**: `Logo` renders MOVIE in `text-accent` and HUB in `text-white` in Bebas Neue as real text, inside a `<Link to="/" aria-label="MovieHub">` whose inner spans are `aria-hidden`, so the accessibility tree reads "MovieHub, link".
- **AC-7**: `fallbackGradient(id)` returns the same CSS gradient for the same id every time, reaches all 8 color pairs across ids, and returns pair 0 for `null` or `undefined`.
- **AC-8**: Existing pages look the same as before: the default Tailwind font, the Inter link, the `#020202` body background and every old class are untouched. `npm run build` shows no warnings beyond the baseline recorded before the change. Lint is out of scope (33 errors already exist, per `AGENTS.md`).

## Decision

**Chosen option**: Option 1: Tokens in Tailwind 4 `@theme`, adopted page by page.

All design values live in one `@theme` block in `src/index.css`, added without changing anything global. New and restyled code uses only token classes, each page migrates in its own restyle feature, and the global switches (default font, body background, removing Inter) happen in feature 16 once every page has migrated.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Standard definition

**Canonical pattern**:

```css
/* src/index.css */
@import "tailwindcss";

/* Body font: Poppins, self hosted and RENAMED to "MH Sans".
   Never load a font under the family name "Poppins" (no @font-face, no Google link):
   the frozen startup screen asks for "Poppins" and must keep its fallback font (spec 0001, AC-3). */
@font-face {
  font-family: "MH Sans";
  src: url("./assets/fonts/poppins-400.woff2") format("woff2");
  font-weight: 400; font-style: normal; font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
/* repeat for 500, 600, 700 (latin subset only) */

@theme {
  /* Fonts. --font-sans (Tailwind's default) is NOT overridden until feature 16. */
  --font-display: "Bebas Neue", "Arial Narrow", sans-serif;
  --font-body: "MH Sans", ui-sans-serif, system-ui, sans-serif,
    "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";

  /* Surfaces, darkest to lightest (measured from figma-desing/*.png) */
  --color-canvas:  #0A0A0F;  /* page background */
  --color-surface: #121217;  /* footer, page sections */
  --color-card:    #141418;  /* review cards, panels */
  --color-sheet:   #15151D;  /* modals, tab bar, player sheets */
  --color-raised:  #27272F;  /* chips, raised controls, secondary icon buttons */
  --color-line:        rgb(255 255 255 / 0.08); /* dividers, card borders */
  --color-line-strong: rgb(255 255 255 / 0.16); /* input borders, outline buttons */

  /* Brand */
  --color-accent:       #E11D48; /* rose-600: primary button fill, active chip, progress, MOVIE */
  --color-accent-hover: #BE123C; /* rose-700: hover on accent fills (white text stays AA) */
  --color-accent-press: #9F1239; /* rose-800: pressed accent fills */
  --color-accent-text:  #F43F5E; /* rose-500: accent colored text, links, focus ring on dark */
  --color-rating:       #F59E0B; /* amber-500: star icon */

  /* Text (use text-white for primary) */
  --color-muted:  rgb(255 255 255 / 0.68); /* body copy, meta */
  --color-subtle: rgb(255 255 255 / 0.50); /* placeholders, decorative text */

  /* Radii (control and card are both 12px on purpose: same value, different roles) */
  --radius-control: 0.75rem; /* inputs, small square buttons */
  --radius-card:    0.75rem; /* poster and landscape cards */
  --radius-panel:   1rem;    /* review cards, filter bar, panels */
  --radius-sheet:   1.5rem;  /* auth card, modals, player sheets */
  /* Buttons, chips, avatars, icon buttons: rounded-full (pill) */

  /* Shadows */
  --shadow-glow: 0 10px 30px -8px rgb(225 29 72 / 0.55); /* primary button */
  --shadow-card: 0 16px 40px -16px rgb(0 0 0 / 0.70);   /* hovered cards, sheets */

  /* Display type scale (Bebas Neue), each paired with its line height */
  --text-display-xl: clamp(3.5rem, 7vw, 6.5rem);    /* home hero title */
  --text-display-xl--line-height: 0.95;
  --text-display-lg: clamp(2.75rem, 5vw, 5rem);     /* details title, category title */
  --text-display-lg--line-height: 0.95;
  --text-display-md: clamp(1.75rem, 2.5vw, 2.5rem); /* category tiles */
  --text-display-md--line-height: 1;
  --text-display-sm: 1.5rem;                         /* poster card titles */
  --text-display-sm--line-height: 1.05;
}

/* Glass panel: ghost buttons, auth card, rating panel, player bars */
@utility glass {
  background-color: rgb(255 255 255 / 0.08);
  border: 1px solid var(--color-line);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  @supports not (backdrop-filter: blur(1px)) {
    background-color: var(--color-sheet);
  }
}

@layer base {
  :focus-visible { outline: 2px solid var(--color-accent-text); outline-offset: 2px; }
}
```

If Tailwind 4 rejects the nested `@supports` inside `@utility`, drop the fallback block (every supported browser has `backdrop-filter` in 2026) and note it in the PR. The base focus rule has low specificity on purpose: component `outline-*` classes and old `focus:outline-none` classes still win. New components must never add `focus:outline-none` without a replacement ring.

Motion: there is deliberately no global reduced motion rule, because one would also shorten the frozen startup screen's fade. Each component opts in instead. CSS hover and transition effects use Tailwind's `motion-safe:` variant (for example `motion-safe:hover:scale-[1.03] motion-safe:transition-transform duration-200`). Framer-motion animations read `useReducedMotion()` and skip movement when it is true.

Usage in components (new and restyled code only):

```jsx
<section className="font-body bg-surface px-4 md:px-8 lg:px-16">
  <h2 className="font-display text-display-lg text-white">The Last Orbit</h2>
  <p className="text-muted text-base">A stranded engineer…</p>
  <button className="rounded-full bg-accent hover:bg-accent-hover active:bg-accent-press shadow-glow px-6 py-3 font-semibold text-white">Play</button>
</section>
```

A restyled page sets `font-body` once on its root element, and everything inside inherits it.

Text styles (body font, measured at 1440px):

| Style | Classes | Used for |
|---|---|---|
| Page title | `text-4xl md:text-5xl font-bold` | "Browse Categories", "Welcome back" |
| Section title | `text-xl md:text-2xl font-semibold` | "Trending Now", "Cast & Crew" |
| Body | `text-base text-muted` | descriptions |
| Small | `text-sm text-muted` | meta, footer links |
| Caption | `text-xs text-muted` | card meta "2026 • Sci-Fi" |
| Overline | `text-[11px] uppercase tracking-[0.08em] font-medium` | "COLLECTION", "UP NEXT IN 5s" |

Only weights 400, 500, 600 and 700 exist for the body font; `font-black` and `font-extrabold` are not used in new code.

Layout rhythm: page gutter `px-4` (mobile), `md:px-8`, `lg:px-16` (64px at 1440); 16px gap between cards in a row; 48 to 56px between sections; navbar 80px tall on desktop and 64px on mobile; the mobile tab bar is 64px plus `env(safe-area-inset-bottom)`. Poster cards are 2:3, landscape cards 16:9.

Icons: `lucide-react` only, `strokeWidth={2}`, sized 20px in controls and 16px inline. The Figma icon sheet matches Lucide shapes one to one.

Logo: `src/components/Logo.jsx`, `export default function Logo({ className = "" })`. It renders `<Link to="/" aria-label="MovieHub" className={"font-display text-3xl tracking-wide leading-none " + className}>`, containing `<span aria-hidden="true" className="text-accent">MOVIE</span><span aria-hidden="true" className="text-white">HUB</span>`. Callers resize it through `className` (for example `text-2xl` on mobile). It must render inside the Router, which wraps every page except the frozen startup screen, and the startup screen never uses it.

Fallback art: `src/utils/fallbackArt.js` exports `fallbackGradient(id)`. It computes a djb2 hash (a simple 32 bit string hash) of `String(id)`, takes it modulo 8, and returns `linear-gradient(160deg, <color> 0%, #0A0A0F 100%)` as a CSS `background-image` value; `null` or `undefined` uses index 0. The 8 colors, estimated from the Figma placeholder cards, in this order: `#1E3A8A` (blue), `#7C2D12` (rust), `#065F46` (green), `#6D28D9` (violet), `#9F1239` (crimson), `#0E7490` (teal), `#B45309` (amber), `#BE185D` (magenta). The shared card components (feature 2) use it whenever a poster or backdrop is missing.

**Replaces** (in new and restyled code now; globally in feature 16):
- Raw hex backgrounds (`bg-[#020202]`, `bg-[#050505]`, `bg-[#080808]`, `bg-[#0a0a0a]`, `bg-[#121212]`), replaced by `canvas`, `surface`, `card` or `sheet`
- `red-600` and `#E50914` as the brand red, replaced by `accent` (fills) and `accent-text` (text)
- Inter and `font-black` uppercase micro labels, replaced by `font-body` and the Overline style
- The `.netflix-loader` spinner color, replaced by `accent` when the route loader is restyled in feature 2
- The single Unsplash stock image used as a missing poster (`FALLBACK` in `src/services/movieApi.js`), replaced by `fallbackGradient` in feature 2

**Enforcement**: review convention, backed by a grep check that `/check verify` runs on each restyled page: `grep -nE "bg-\[#|text-\[#|red-600|#E50914|font-black" <page files>` must return nothing once that page's restyle feature is done. A lint rule is not worth it for a 16 file plain JS project with no CI.

**Rollout**: tokens land in this feature with no global change. Each existing page migrates in its own restyle feature (2 to 16). Feature 16 then flips the globals: `--font-sans` points at `MH Sans`, the Inter link is removed, and the `index.html` body background and `theme-color` become `#0A0A0F`.

**Exceptions**: the frozen startup screen (`LoadingScreen.jsx`, `Loadingscreen.css`) keeps its own styles and is never migrated. Third party iframe content in the Watch player cannot be styled.

## Build plan

1. Record the baseline: run `npm run build` and save its warning output, satisfies **AC-8**
2. One time manual download (not a build step): request `https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap` with a modern browser user agent, download the four latin subset woff2 files it lists into `src/assets/fonts/` as `poppins-400.woff2` to `poppins-700.woff2`, and add `src/assets/fonts/OFL.txt` with the license text and the source URL. No preload link (Vite hashes the filenames; `swap` covers first paint), satisfies **AC-2**, **AC-3**
3. Add the `@font-face` rules (with the "never name Poppins" comment), the `@theme` block, the `glass` utility and the focus rule from *Standard definition* to `src/index.css`, keeping every existing rule, satisfies **AC-1**, **AC-2**, **AC-4**, **AC-8**
4. In `index.html`, add the Bebas Neue Google link (`display=swap`) next to the existing Inter link, reusing the existing preconnects; change nothing else, satisfies **AC-2**, **AC-8**
5. Add `src/components/Logo.jsx` and `src/utils/fallbackArt.js`, and check `fallbackGradient` with a node one liner (same id gives same output, all 8 reachable, null gives index 0), satisfies **AC-6**, **AC-7**
6. Verify: the AC-1 temporary class file, the AC-5 contrast script (adjust only alpha values if a pair fails), the four AC-3 checks, and a build compared with the baseline plus a visual pass over every existing page, satisfies **AC-1**, **AC-3**, **AC-5**, **AC-8**

## Consequences

**Positive**:
- One place to change any color, font or radius; every restyled page inherits it.
- Measured values give a close match to Figma without API access.
- Accessible contrast and keyboard focus are built into the tokens, not left to each page.
- No existing page changes, so this foundation can ship on its own safely.

**Negative / tradeoffs**:
- Colors are measured from PNG pixels and sizes are estimates. When Figma access returns, exact values may differ slightly and need one pass of correction (only in `src/index.css`).
- Old and new styling coexist until feature 16, and the app loads both Inter and the new fonts during that time (a few extra kilobytes).
- New code must add `font-body` on each restyled page root until feature 16 flips the default.
- The body font is self hosted under a renamed family to protect the frozen startup screen. That is unusual, and anyone later loading a font named "Poppins" would break AC-3. The comment in `src/index.css` guards it in code, and `AGENTS.md` should record it.
- Only the latin subset of the body font ships; text in other scripts falls back to the system font.

**Neutral**:
- `react-icons` is installed but imported nowhere; it can be removed in a later cleanup.
- `index.html` links a `manifest.json` that does not exist in `public/`; out of scope here.

## Follow-up

- [ ] When Figma MCP access returns, read the real variables with `get_variable_defs` and correct any measured value in `src/index.css`
- [ ] `/sync` should add to `AGENTS.md`: use token classes only; the body font is self hosted as `MH Sans` and no font may ever be loaded under the name "Poppins"; `react-icons` is unused
- [ ] Feature 16 flips the globals (default font, body background, `theme-color`, removes Inter) once every page has migrated
- [ ] Remove the unused `react-icons` dependency, and fix or remove the broken `manifest.json` link, in a cleanup pass
