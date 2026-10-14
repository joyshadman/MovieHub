# AGENTS.md — MovieHub

React 19 + Vite 7 + Tailwind 4 + framer-motion + Firebase (auth/firestore) + TMDB API.
Run with `npm run dev`, build with `npm run build`, lint with `npm run lint`.
No test suite and no type-checking step (plain JS/JSX) exist in this project.

## Project layout

- Routes are declared in `src/App.jsx`; page components live in
  `src/Pages/` (capital P) and are lazy loaded.
- Firebase is initialised once in `src/components/firebase.jsx`
  (exports `auth`, `db`, `googleProvider`); import from there.
- All TMDB calls go through `src/services/movieApi.js`.
- Env vars (in `.env`, git ignored): `VITE_TMDB_READ_TOKEN`,
  `VITE_TMDB_API_KEY`, `VITE_ADMIN_EMAILS`.
- Deployed on Vercel; `vercel.json` rewrites all paths to `/`
  for client side routing.
- `npm run preview` serves the production build.

## Build approach

<TBD, set by /scope>

## Rules

- Package manager is npm (`package-lock.json`).
- Style with Tailwind utility classes inline in JSX; the
  only standalone stylesheet besides `src/index.css` is
  the frozen `Loadingscreen.css`.
- Dark theme throughout: page background `bg-[#050505]`,
  white text, `red-600` as the accent color.
- Notifications use `react-hot-toast` (the single
  `<Toaster>` is mounted in `src/App.jsx`).
- Animation uses `framer-motion`.

## Startup / loading system (existing — do not change)

The startup screen was built and is working. Its visuals, timing, layout and
transitions are considered **frozen**. Changes to audio must not touch them.

| Concern | Location |
| --- | --- |
| Startup component | `src/components/LoadingScreen.jsx` |
| Startup styles | `src/components/Loadingscreen.css` |
| Gating / mount point | `src/App.jsx` (`showLoading`) |
| Startup sound asset | `src/assets/startup-sound.mp3` |

Flow:

1. `src/App.jsx` reads `sessionStorage.getItem('hasLoadedBefore')`. If the flag is
   absent, `showLoading` is `true` and `<LoadingScreen minDuration={2800} />` mounts.
2. On mount the component locks `body` scroll and, in the same effect, flips its
   internal `phase` to `animating` on the next animation frame. That phase class is
   what starts the letter-reveal and sweep animations.
3. After `minDuration` (2800 ms) it flips `phase` to `fading`, which applies
   `mh-fade-out` — a 0.8 s opacity/visibility transition.
4. The transition's `transitionend` sets `phase` to `gone` (component renders `null`)
   and calls `onComplete`.
5. Independently, `App.jsx` has its own 2800 ms timer that sets
   `sessionStorage.hasLoadedBefore` and unmounts the screen, revealing the site.
   That timer usually wins the race, so `mh-fade-out` is rarely painted and
   `onComplete` rarely fires. This is pre-existing behaviour — do not "fix" it as
   part of audio work.

`prefers-reduced-motion: reduce` is already honoured inside
`Loadingscreen.css` (animations disabled, letters left static). Do not modify that
system for audio work.

## Startup sound

- **Asset:** `src/assets/startup-sound.mp3` — 2.806 s (as reported by the browser),
  ~50 KB, VBR ~128 kbps, 44.1 kHz joint stereo. Imported through Vite
  (`import startupSound from "../assets/startup-sound.mp3"`), so the URL is hashed at
  build time and no hand-written asset path exists. `public/assets/audio/` is
  currently empty and is **not** used for this sound. Its 2.806 s length lines up
  with the 2800 ms `minDuration`, so it does not overrun the animation.
- **Trigger:** `tryPlayStartupSound()` is called once from the existing `LoadingScreen`
  mount effect, in the same tick as the `phase` change that starts the animation. It
  builds a `new Audio(startupSound)`, sets `preload = "auto"`, volume
  `STARTUP_SOUND_VOLUME` (0.4), and calls `play()`.
- **Playback state machine:** `soundStateRef` holds `idle` → `playing` → `done` (play
  resolved) or `failed` (play rejected). `tryPlayStartupSound` returns early when the
  state is `playing` or `done`, which is what prevents overlapping playback when two
  gestures land. `soundTriedRef` guarantees the mount attempt happens exactly once,
  so React StrictMode's double effect invocation cannot double-trigger.
- **User-interaction fallback:** while the startup screen is mounted, a one-shot
  `pointerdown` and one-shot `keydown` listener on `window` retry the sound if the
  mount attempt landed in the `failed` state. The loader is a full-screen fixed
  overlay, so a click or tap during the 2.8 s window is a real user gesture and grants
  the transient activation Brave/Chrome require. Both listeners are removed in the
  effect cleanup, so a click after the screen disappears never plays the sound.
- **First load only:** the sound is bound to the startup screen, which `App.jsx` only
  renders for the first load of a tab session (`hasLoadedBefore`). Later route changes
  never remount it, so the sound never replays. No context, store, or global state.
- **Autoplay failure:** `play()` is inside a `try/catch`, and the returned promise is
  settled with `playing.then(onOk, onFail)` rather than left floating, so a rejection
  never surfaces as an uncaught error or an unhandled rejection. No polling, no
  retry loop, no `onComplete` gate, and startup timing is unaffected either way.
- **Browser limits:** Brave, Chrome, Edge and Firefox block unprompted autoplay audio
  until the origin has recorded a user interaction. So on a first-ever visit the
  mount attempt is rejected with `NotAllowedError` and the clip is silent until the
  user clicks/taps during the startup window. On later visits the browser's sticky
  media engagement lets the mount attempt succeed immediately. This is browser
  security, not a bug — do not fake a click, synthesise a gesture, poll `play()`, or
  otherwise work around it.

## How the startup sound was verified

Measured in real Chromium against `npm run build` output (not just assumed):

- Autoplay permitted (`--autoplay-policy=no-user-gesture-required`): `play()`
  resolves and `currentTime` reaches 2.806 s, i.e. the clip plays start to finish.
- Autoplay blocked (default policy): `play()` rejects with `NotAllowedError`, which is
  swallowed. Zero uncaught errors, zero audio-related console messages, and the
  loader still mounts and unmounts normally.
- **Fallback path (the Brave fix):** with autoplay blocked, a real trusted
  `page.mouse.click` on the loader during the 2.8 s window makes the second attempt
  `resolve`, and playback advances normally. Verified on both desktop and a Pixel 7
  viewport with a tap.
- No double playback: with autoplay allowed, a click during startup still results in
  exactly 1 `Audio` instance and 1 `play()` call. With autoplay blocked, a
  click-then-keypress pair also results in exactly 2 instances and 2 calls
  (1 rejected, 1 resolved) — never 3.
- Late gestures do nothing: clicking after the startup screen has disappeared creates
  0 new `Audio` instances, confirming both listeners are removed on unmount.
- `Audio` is constructed exactly once per tab session. A same-session reload plus
  route changes to `/about`, `/search`, `/categories` replay nothing.
- Exactly one network request for the mp3 per load; it resolves HTTP 200.
  `Content-Type: audio/mpeg`, `Content-Length: 50169` — the asset is not the problem
  when a browser is silent.
- `prefers-reduced-motion: reduce` behaves identically and is untouched by the audio.
- Mobile (Pixel 7 viewport/UA): one construction, one play attempt, one request, no errors.
- Animation regression check: the loader's on-screen duration is 2839.4 ms with the
  sound vs 2843.9 ms on a stashed baseline build of the original component — a ~4 ms
  difference, within rAF sampling noise. Letter animation delays (0.15s–1.55s),
  7 s duration, and mid-animation computed opacity/transform values match the
  baseline to 3–4 decimal places.
- `npm run lint` reports no errors for `src/components/LoadingScreen.jsx`. The repo
  has pre-existing lint errors elsewhere (33 errors, mostly `no-unused-vars` in
  `src/services/movieApi.js` and conditional-hook errors in pages) — not caused by
  this work.
- The only functional diff is inside `src/components/LoadingScreen.jsx`.
  `Loadingscreen.css` has a zero-line diff, and every pre-existing line of the
  animation logic (scroll lock, rAF phase change, `minDuration` timeout, cleanup,
  `triggerFade`, and the JSX) is byte-identical to `HEAD`.
