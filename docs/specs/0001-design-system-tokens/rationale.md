# 0001. Design system tokens: rationale

Decision record for [index.md](index.md).

## Context

MovieHub is about to be restyled page by page to a new Figma design (scope feature 1 is this foundation; features 2 to 16 build on it). Today there is no design system. Styling is Tailwind utility classes written inline, with values chosen per file: at least five different near black backgrounds (`#020202`, `#050505`, `#080808`, `#0a0a0a`, `#121212`), two different reds (`red-600` and `#E50914` in `src/index.css`), and the Inter font in heavy 900 weight (`font-black`) with tiny uppercase labels. If every page restyle invented its own values again, the new UI would drift exactly the same way.

The design source is a set of PNG exports in `figma-desing/` (8 screens plus component sheets for Button, Chip, Icon Button, Input, Avatar, Poster Card, Landscape Card, Icons, Logo, Navbar, Footer, Tab Bar, Top Bar, Tab Item). The Figma MCP is blocked on the Starter plan, so exact variable values cannot be read; colors below were measured from the PNG pixels, and sizes were estimated from the 1440px frames.

Constraints: React 19 with Tailwind 4 via `@tailwindcss/vite` (no `tailwind.config.js`; Tailwind 4 reads tokens from an `@theme` block in CSS). The app is dark only. The startup screen (`LoadingScreen.jsx`, `Loadingscreen.css`) is frozen by `AGENTS.md`, and its CSS requests `font-family: "Poppins", sans-serif`, a font the app has never loaded, so it currently renders in the browser's fallback sans serif. The engineer wants that exact look kept. Existing pages must also keep their current look until their own restyle feature runs.

## Options considered

### Option 1: Tokens in Tailwind 4 `@theme`, adopted page by page

Define every token as a CSS variable in an `@theme` block, which makes Tailwind generate a matching utility class for each one. Nothing global changes. New and restyled code opts in with the token classes, and each page's restyle feature replaces its old hard coded values.

**Pros**:
- One source of truth, and the classes look like normal Tailwind (`bg-surface`), so the existing inline utility style is kept.
- Zero risk to pages not yet restyled; fits Tracer Bullet.
- No new build tooling or config file.

**Cons**:
- Old and new values coexist until feature 16 lands, so a grep will show both for a while.
- New components must remember `font-body` until the default font flips at the end; nothing stops a raw hex value except review.

### Option 2: Tokens plus a single migration of every page now

Same tokens, but this feature also rewrites every existing hard coded color, font and radius across all 16 files to the nearest token, and switches the default font and background globally.

**Pros**:
- Consistency immediately; no period of mixed values.

**Cons**:
- A large diff that changes the look of every page before its real restyle, so pages look neither old nor Figma for weeks.
- Each later page restyle rewrites the same lines again.

### Option 3: A JavaScript theme object

Export colors and sizes from a `theme.js` file and use them through inline `style` props or template strings.

**Pros**:
- Values are importable in JavaScript (useful for canvas or charts).

**Cons**:
- Fights the project's Tailwind utility convention; no hover, focus or responsive variants without extra code.
- Two styling systems instead of one.

## Rationale

The project already styles everything with inline Tailwind utilities (`AGENTS.md`, Rules), and Tailwind 4 turns `@theme` variables directly into utilities, so Option 1 adds a design system without adding a second styling approach or a config file. The engineer chose Tracer Bullet and a page by page migration. Option 2 would restyle every page twice and leave the app in an in between look for weeks. Option 3 would split styling across CSS and JavaScript for no benefit, since nothing in the app needs color values in JavaScript.

The body font gets its own `font-body` token instead of replacing Tailwind's default `font-sans`. Replacing the default would instantly change every old page, and many of them use `font-black` (weight 900), which the new font does not ship, so the browser would fake a bold. Keeping the default untouched until feature 16 is what makes "old pages look the same" true.

The measured colors map onto Tailwind's own palette for the brand colors (`#E11D48` is exactly `rose-600`, the star is exactly `amber-500`), so the interaction shades come from the same family. Hover and pressed go darker (`rose-700`, `rose-800`), not lighter: white text on `rose-500` measures only about 3.7:1, which fails AA. Accent colored text on the dark background uses `rose-500`, because `rose-600` text on `#0A0A0F` measures about 4.2:1 and fails AA for small text, while `rose-500` measures about 5.3:1. The near black surfaces match no palette step, so they are custom tokens. Muted text uses white at 68 percent (about 9:1 on canvas) rather than the lighter greys measured in the PNGs.

Fonts were the one real tension. The engineer chose Google Fonts loading and also chose to keep the startup screen exactly as it is. A Google Fonts link always registers the family name "Poppins", and the startup CSS asks for "Poppins", so loading it that way would silently change the frozen screen. The body font is therefore self hosted under the private family name `MH Sans`. Bebas Neue keeps the Google link, since nothing frozen asks for it. Self hosting adds no npm dependency; the woff2 files are committed to the repo.
