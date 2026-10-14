# Verify: design system and tokens · spec 0001 · updated 2026-10-14
_Steps derived from spec 0001 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## Commands
- [ ] Add a temporary file using every token class listed in AC-1, run `npm run build`, confirm each class appears in `dist/assets/index-*.css`, then delete the file → every class compiles → AC-1
- [ ] `npm run build` → passes, and its warnings match the baseline (one existing "chunks larger than 500 kB" warning) → AC-8
- [ ] `git diff --stat -- src/components/LoadingScreen.jsx src/components/Loadingscreen.css` → shows no change made by this feature (the files were last modified on 2026-09-26, before this work; their older uncommitted startup sound diff is not part of it) → AC-3
- [ ] `grep -rn "Poppins" src index.html` → only `Loadingscreen.css` and the warning comment in `src/index.css`; no `@font-face` or `<link>` names "Poppins" → AC-3
- [ ] Run the WCAG contrast script over the AC-5 pairs (alpha colors blended over their background first) → all 18 pairs are 4.5:1 or more → AC-5
- [ ] `node --input-type=module -e "import {fallbackGradient as g} from './src/utils/fallbackArt.js'; ..."` → same id gives the same gradient, ids 0 to 499 reach all 8 colors, `null` and `undefined` give the blue pair → AC-7

## UI / manual (Chromium, `npm run build` then `npx vite preview`)
- [ ] Open the site in a fresh tab session → the startup screen's `.loader-wrapper` computed `font-family` is `Poppins, sans-serif`, and DevTools "Rendered Fonts" shows the system fallback (Arial on Windows), not Poppins → AC-3
- [ ] In the Network panel during that load → no request has `family=Poppins` in its URL; `poppins-*.woff2` files load only when an element uses `font-body` → AC-3
- [ ] Add an element with `class="font-body"` and one with `class="font-display"` → Rendered Fonts shows Poppins (via the `MH Sans` family) and Bebas Neue, and text is visible right away with the swap → AC-2
- [ ] Press Tab through a page built with the new tokens → a 2px rose ring appears on each focused control; clicking a button with the mouse shows no ring (text inputs show focus either way) → AC-4
- [ ] Render the `Logo` component inside the router → MOVIE is rose, HUB is white, in Bebas Neue, and the accessibility tree reads "MovieHub, link" → AC-6
- [ ] Visit `/`, `/categories`, `/search`, `/mylist`, `/about` and a details page → each looks the same as before this feature → AC-8

## Acceptance-criteria coverage
- AC-1: temporary class file build check
- AC-2: font-body and font-display probe
- AC-3: git diff, Poppins grep, loader computed and rendered font, network check
- AC-4: keyboard Tab pass
- AC-5: contrast script
- AC-6: Logo render check (first live use comes with the app shell, feature 3)
- AC-7: fallbackGradient node check
- AC-8: build warning baseline and visual pass over existing pages
