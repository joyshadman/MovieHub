# Scope: MovieHub, Figma restyle

MovieHub is a streaming site where people browse movies and shows from TMDB, sign in, keep a watch list, and pick up where they left off. This pass restyles the whole app to the "MovieHub, Streaming UI" Figma file (exported frames live in `figma-desing/`), keeping every existing feature working through the new UI.

**Build approach:** Tracer Bullet (design system first, then one page at a time, each fully restyled and wired to its real logic before the next, so the app works after every step).
**Workflow:** Alpha (after `/develop`, `/check verify` drives the real app to prove the feature works). The project default level of rigor. `/architect` is the recommended first stop for a feature with a real decision, but skippable when you already know the build. Any feature can carry its own tag (e.g. `· GA`) to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

Ground rules for every feature in this pass: no feature, route, auth flow or data call is removed; the frozen startup screen (`LoadingScreen.jsx`, `Loadingscreen.css`) is never touched; every page works on mobile, tablet and desktop with keyboard focus visible; one small commit per component or page.

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| A | Google sign in and account menu | Existing | existing |
| B | Home browse rows and hero | Existing | existing |
| C | Continue watching | Existing | existing |
| D | Categories and genre browsing | Existing | existing |
| E | Search | Existing | existing |
| F | Title details | Existing | existing |
| G | My List | Existing | existing |
| H | Watch player overlay | Existing | existing |
| I | About page, site updates, admin center | Existing | existing |
| J | First visit device tip | Existing | existing |
| K | Startup screen and sound (frozen) | Existing | existing |
| 1 | Design system and tokens | Foundation | in-progress |
| 2 | Shared components | Foundation | in-progress |
| 3 | App shell: navbar, mobile bars, footer | Foundation | in-progress |
| 4 | Home page restyle | Slice 1 | in-progress |
| 5 | Title details restyle | Slice 1 | in-progress |
| 6 | Watch player frame | Slice 1 | in-progress |
| 7 | Email sign up, login and password reset | Slice 2 | in-progress |
| 8 | Categories and category filters | Slice 3 | in-progress |
| 9 | Movies and TV Shows pages | Slice 3 | in-progress |
| 10 | Regional and anime collections | Slice 3 | in-progress |
| 11 | Top 10 by country row | Slice 3 | in-progress |
| 12 | Search page restyle | Slice 4 | in-progress |
| 13 | My List page restyle | Slice 4 | in-progress |
| 14 | About page and admin center restyle | Slice 4 | in-progress |
| 15 | Reviews on title details | Slice 4 | in-progress |
| 16 | System states: 404, empty, error, popups, toasts | Slice 4 | in-progress |
| 17 | Global style switch | Slice 4 | in-progress |
| 18 | AI recommendation chat | Slice 5 | in-progress |
| 19 | Watch Together | Slice 5 | in-progress |

## Already built (enrolled for context)

### A. Google sign in and account menu · existing
Google sign in by popup with redirect fallback, sign out, watch list count. code in `src/components/Navbar.jsx`

### B. Home browse rows and hero · existing
Hero banner plus trending, top rated and popular rows from TMDB. code in `src/Pages/Home.jsx`, `src/components/Hero.jsx`, `src/components/MovieRow.jsx`, `src/components/MovieCard.jsx`

### C. Continue watching · existing
Watch history stored per user in Firestore (`history`), shown as a row with remove and clear. code in `src/Pages/ContinueWatching.jsx`

### D. Categories and genre browsing · existing
Genre list including Bollywood, Bangla and Anime, movie or TV switch, load more paging. code in `src/Pages/Categories.jsx`

### E. Search · existing
TMDB multi search with all, movie and TV filter and query ranking. code in `src/Pages/Search.jsx`

### F. Title details · existing
Poster, meta, cast, similar titles and play, for movies and TV. code in `src/Pages/MovieDetails.jsx`

### G. My List · existing
Per user watch list in Firestore (`watchlists`), add from cards, remove on the page. code in `src/Pages/MyList.jsx`, `src/components/MovieCard.jsx`

### H. Watch player overlay · existing
Third party iframe player with 5 switchable servers, TV season and episode picker, writes watch history. code in `src/Pages/Watch.jsx`

### I. About page, site updates, admin center · existing
Live site updates feed, online users list, admin only posting and user removal (`VITE_ADMIN_EMAILS`). code in `src/Pages/About.jsx`

### J. First visit device tip · existing
One time popup for first time visitors. code in `src/components/DeviceModal.jsx`

### K. Startup screen and sound (frozen) · existing
First load intro animation and sound. Frozen by `AGENTS.md`; not part of this restyle. code in `src/components/LoadingScreen.jsx`

## Foundations

### 1. Design system and tokens · in-progress
Turn the Figma look into project tokens (colors, the condensed display font and body font, spacing, radii, shadows, glass panels) in the existing Tailwind setup, and bring in the logo and icons.
**Done when:** tokens live in one place the whole app reads, fonts load without layout shift, the logo and icon set match the Figma sheets, and estimated values (read from PNG exports) are listed for you to confirm.
- [x] Design it (spec): `/architect design system and tokens`
- [x] Build it: `/develop design system and tokens`
   - [x] Fonts: build baseline, body font self hosted as MH Sans, Bebas Neue link (AC-2, AC-3, AC-8)
   - [x] Tokens, glass utility and focus rule in `src/index.css` (AC-1, AC-4, AC-5)
   - [x] Logo component and fallback art helper (AC-6, AC-7)
- [ ] Verify it: `/check verify design system and tokens`
Spec [0001](../specs/0001-design-system-tokens/index.md) · code in `src/index.css`, `index.html`, `src/assets/fonts/`, `src/components/Logo.jsx`, `src/utils/fallbackArt.js`

### 2. Shared components · in-progress
Rebuild Button, Icon Button, Chip, Input, Avatar, Poster Card, Landscape Card, the scrolling row, toasts and the route loading fallback on the new tokens, so every page inherits them.
**Done when:** each component matches its Figma sheet and has default, hover, focus, active, disabled and loading states; existing cards still add to My List and open details.
- [x] Build it: `/develop shared components`
- [ ] Verify it: `/check verify shared components`
code in `src/components/ui/`, `src/components/MovieCard.jsx`, `src/components/MovieRow.jsx`, `src/components/TitleGrid.jsx`, `src/context/WatchlistContext.jsx`

### 3. App shell: navbar, mobile bars, footer · in-progress
Desktop navbar, mobile top bar and mobile tab bar (Home, Search, Browse, My List, Profile), and the footer, all wired to real routes and the existing sign in and account menu.
**Done when:** every nav link goes to a real page, the tab bar shows below tablet width, Profile opens the account menu, sign in and sign out still work, footer links point only to pages that exist.
- [x] Build it: `/develop app shell`
- [ ] Verify it: `/check verify app shell navbar, mobile bars, footer`
code in `src/components/Navbar.jsx`, `src/components/Footer.jsx`, `src/App.jsx`

## Slice 1: Browse to play (the thin thread)

### 4. Home page restyle · in-progress
Home matches the Figma frame: hero with play, more info and add to list, continue watching with progress, and poster rows, all on live TMDB and Firestore data.
**Done when:** hero, continue watching and every row render real data, play and details open correctly, and add to list updates My List.
- [x] Build it: `/develop home page restyle`
- [ ] Verify it: `/check verify home page restyle`
code in `src/Pages/Home.jsx`, `src/components/Hero.jsx`, `src/Pages/ContinueWatching.jsx`

### 5. Title details restyle · in-progress
Details page matches the Figma frame: poster, title, meta, genres, credits, rating panel, actions, tabs, trailers from TMDB videos, cast, and more like this.
**Done when:** movies and TV both render, play and trailer work, add to list works, and actions with no backend (download, like) are left out rather than faked.
- [x] Build it: `/develop title details restyle`
- [ ] Verify it: `/check verify title details restyle`
code in `src/Pages/MovieDetails.jsx`

### 6. Watch player frame · in-progress
Restyle the frame around the iframe player in the Figma player look: back button, title bar, server switcher, TV season and episode picker. The iframe keeps its own controls.
**Done when:** all 5 servers still switch, episodes still change, history still saves, and the frame works on mobile and desktop.
- [x] Build it: `/develop watch player frame`
- [ ] Verify it: `/check verify watch player frame`
code in `src/Pages/Watch.jsx`

## Slice 2: Accounts

### 7. Email sign up, login and password reset · in-progress · assumed decision (spec 0002)
Login and Sign Up pages from Figma with real email and password accounts, a forgot password flow, and the existing Google sign in. Needs Email auth turned on in your Firebase console.
**Done when:** a new user can sign up, log in, log out and reset a password by email; validation and error messages show inline; Google sign in still works; signed in users are sent away from the auth pages.
- [ ] Design it (spec): `/architect email sign up, login and password reset`
- [x] Build it: `/develop email sign up, login and password reset`
- [ ] Verify it: `/check verify email sign up, login and password reset`
Spec [0002](../specs/0002-figma-restyle-assumptions.md) · code in `src/Pages/auth/`, `src/services/authService.js`

## Slice 3: Browse more

### 8. Categories and category filters · in-progress · assumed decision (spec 0002)
Categories grid and the single category page from Figma, with genre, year, rating, language and sort filters plus grid and list view, on TMDB discover data.
**Done when:** each tile opens its category page, filters and sort change the results, active filters show as removable chips with clear all, load more pages through results, and the filters survive a page refresh.
- [ ] Design it (spec): `/architect categories and category filters`
- [x] Build it: `/develop categories and category filters`
- [ ] Verify it: `/check verify categories and category filters`
Spec [0002](../specs/0002-figma-restyle-assumptions.md) · code in `src/Pages/Categories.jsx`, `src/Pages/CategoryPage.jsx`

### 9. Movies and TV Shows pages · in-progress · assumed decision (spec 0002)
Real pages behind the Movies and TV Shows nav links, built from the home row and category patterns.
**Done when:** each page shows real rows for its type and links into details and play.
- [ ] Design it (spec): `/architect movies and tv shows pages`
- [x] Build it: `/develop movies and tv shows pages`
- [ ] Verify it: `/check verify movies and tv shows pages`
Spec [0002](../specs/0002-figma-restyle-assumptions.md) · code in `src/Pages/BrowsePage.jsx`

### 10. Regional and anime collections · in-progress · assumed decision (spec 0002)
Collections for Best Bangla, Hollywood, Bollywood, Korean, Japanese and Anime, using the Figma collection card style.
**Done when:** each collection opens a real, paged list of titles from TMDB; existing Bangla, Bollywood and Anime browsing keeps working.
- [ ] Design it (spec): `/architect regional and anime collections`
- [x] Build it: `/develop regional and anime collections`
- [ ] Verify it: `/check verify regional and anime collections`
Spec [0002](../specs/0002-figma-restyle-assumptions.md) · code in `src/Pages/CollectionPage.jsx`, `src/utils/collections.js`

### 11. Top 10 by country row · in-progress · assumed decision (spec 0002)
The big numbered Top 10 row from the Home frame, based on the visitor's country.
**Done when:** the row shows 10 ranked real titles for a country and falls back sensibly when the country is unknown.
- [ ] Design it (spec): `/architect top 10 by country row`
- [x] Build it: `/develop top 10 by country row`
- [ ] Verify it: `/check verify top 10 by country row`
Spec [0002](../specs/0002-figma-restyle-assumptions.md) · code in `src/Pages/Home.jsx`, `src/utils/region.js`

## Slice 4: The rest of the app in the new style

### 12. Search page restyle · in-progress · assumed decision (spec 0002)
Search has no Figma frame; design it in the Figma style with the existing all, movie and TV filter.
**Done when:** typing searches live, the filter works, and loading, empty and error states all render.
- [ ] Design it (spec): `/architect search page restyle`
- [x] Build it: `/develop search page restyle`
- [ ] Verify it: `/check verify search page restyle`
Spec [0002](../specs/0002-figma-restyle-assumptions.md) · code in `src/Pages/Search.jsx`

### 13. My List page restyle · in-progress · assumed decision (spec 0002)
My List has no Figma frame; design it in the Figma style.
**Done when:** saved titles show for the signed in user, remove works, signed out users see a sign in prompt, and the empty state guides back to browsing.
- [ ] Design it (spec): `/architect my list page restyle`
- [x] Build it: `/develop my list page restyle`
- [ ] Verify it: `/check verify my list page restyle`
Spec [0002](../specs/0002-figma-restyle-assumptions.md) · code in `src/Pages/MyList.jsx`

### 14. About page and admin center restyle · in-progress · assumed decision (spec 0002)
About has no Figma frame; restyle the site updates feed, online users and the admin center in the Figma style.
**Done when:** updates stream live, admins can still post, delete updates and remove users, and non admins never see admin controls.
- [ ] Design it (spec): `/architect about page and admin center restyle`
- [x] Build it: `/develop about page and admin center restyle`
- [ ] Verify it: `/check verify about page and admin center restyle`
Spec [0002](../specs/0002-figma-restyle-assumptions.md) · code in `src/Pages/About.jsx`

### 15. Reviews on title details · in-progress
Read only review list on details from TMDB review text, in the Figma review card style.
**Done when:** real reviews show with author and date, titles without reviews show an empty state, and nothing that needs new storage (star breakdown, your rating, write a review) appears.
- [x] Build it: `/develop reviews on title details`
- [ ] Verify it: `/check verify reviews on title details`
code in `src/Pages/MovieDetails.jsx`

### 16. System states: 404, empty, error, popups, toasts · in-progress · assumed decision (spec 0002)
A 404 page, shared empty and error states, the device tip popup and toasts, all in the Figma style.
**Done when:** unknown routes show the 404 with a way home, every list page has empty and error states, and the device tip and toasts use the new style.
- [ ] Design it (spec): `/architect system states`
- [x] Build it: `/develop system states 404, empty, error, popups, toasts`
- [ ] Verify it: `/check verify system states 404, empty, error, popups, toasts`
Spec [0002](../specs/0002-figma-restyle-assumptions.md) · code in `src/Pages/NotFound.jsx`, `src/components/ui/feedback.jsx`, `src/components/ui/Modal.jsx`, `src/components/DeviceModal.jsx`

### 17. Global style switch · in-progress · from spec 0001
Once every page uses the new tokens, flip the app wide defaults: default font to the body font, body background and `theme-color` to the canvas color, and remove the Inter font link.
**Done when:** no file uses the old hard coded colors or `font-black`, the startup screen still passes spec 0001 AC-3, and every page looks unchanged after the flip.
- [x] Build it: `/develop global style switch`
- [ ] Verify it: `/check verify global style switch`
code in `src/index.css`, `index.html`

## Slice 5: Watch features

### 18. AI recommendation chat · in-progress
An "Ask AI" chat that suggests only movies and shows from what each signed in user types, watched and saved, on free OpenRouter models, with a small daily allowance set on the Admin page and one saved chat per user.
**Done when:** picks show as real title cards, off topic questions are refused, the daily limit holds and can not be cheated, the owner is unlimited, only free models are ever called, and the chat survives a refresh on any device.
- [x] Design it (spec): `/architect AI recommendation chat`
- [ ] Build it: `/develop AI recommendation chat`
   - [x] Server: free only model chain, busy and resting messages, limit from the Admin page, owner exemption (AC-3, AC-5, AC-6, AC-7, AC-8)
   - [ ] Firestore rules for usage, saved chats and the limit field (AC-4, AC-6, AC-9)
   - [ ] Browser: live counter, saved chat with Clear chat, Admin limit field; recheck picks, refusal, taste, key and sign in (AC-1, AC-2, AC-3, AC-5, AC-6, AC-9, AC-10, AC-11, AC-12)
- [ ] Verify it: `/check verify AI recommendation chat`
Spec [0006](../specs/0006-ai-recommendation-chat/index.md) · code in `api/recommend.js`, `src/services/aiChat.js`, `src/components/AiChat.jsx`, `src/Pages/Admin.jsx`, `src/services/siteConfig.js`, `src/App.jsx`, `vite.config.js`

### 19. Watch Together · in-progress
Signed in friends watch the same movie or episode in sync from a shared link, with members and chat beside the player. The host lets each guest in, and the whole room follows one server, all on Firestore within the free plan.
**Done when:** guests wait in a lobby until the host lets them in, approvals stick and denials block, a room holds at most 10, playback, episode and server stay in sync, a host refresh does not end the room, rooms end on request or after 12 h idle, and every tamper attempt is refused.
- [x] Design it (spec): `/architect watch together`
- [ ] Build it: `/develop watch together`
   - [ ] Fewer writes and host away or return (AC-9, AC-14)
   - [ ] Lobby: waiting screen, knock, let in or deny, the cap of 10, remove member (AC-2, AC-3, AC-4, AC-5, AC-10)
   - [ ] Shared server and room end (AC-6, AC-7, AC-8, AC-11)
   - [ ] Firestore rules published, and the built behavior rechecked (AC-1, AC-6, AC-7, AC-8, AC-12, AC-13)
- [ ] Verify it: `/check verify watch together`
Spec [0005](../specs/0005-watch-together/index.md) · code in `src/services/watchTogether.js`, `src/components/player/useWatchTogether.js`, `src/components/player/TogetherPanel.jsx`, `src/Pages/TogetherRoom.jsx`, `src/Pages/Watch.jsx` · from spec 0005

## Deferred
Out of scope for the current build pass, kept so the plan stays honest.
- **Custom video player controls**: scrubber, chapters, audio and subtitles, speed, quality, skip intro, up next. Impossible on third party iframes; needs a video source you control · needs a decision
- **Apple sign in**: needs a paid Apple Developer account · needs a decision
- **Notifications bell**: no notifications backend yet · needs a decision
- **Your rating, star breakdown, write a review**: needs new storage · needs a decision
- **Download, like and share actions** · needs a decision
- **Language switcher**: no translations exist yet · needs a decision
- **Free trial and plans text, reCAPTCHA line**: no billing or captcha behind them
- **Editorial collections** (Award Winners, Hidden Gems): no data source · needs a decision
- **Cleanup**: remove unused `react-icons`, fix the broken `manifest.json` link · from spec 0001

## Legend

**The decision box.** Every feature carries exactly one, the sub-task whose label ends with `(spec)`. Its wording varies, so skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and `/architect` never ticks one.

**Feature lifecycle**: the scope updates as a feature moves; each row is what it shows and who sets it:

| State | Set by | The feature shows |
|---|---|---|
| `planned` · needs a decision | `/scope` | one box: `Design it (spec): /architect <feature>` |
| `in-progress` (designed) | **`/architect` at spec capture** | `Design it` ticked; spec linked; `Build it: /develop <feature>` + **2 to 5 milestones**; the tier's closing boxes (`Verify it` Alpha+, `Test it` Beta+, `Review it` + `Document it` GA); any surfaced follow-up enrolled |
| `in-progress` (building) | `/develop` | milestone sub-boxes tick one by one; code pointer filled |
| `in-progress` (verified) | `/check verify` | `Build it` + milestones ticked; `Verify it` ticked |
| `done` | **you, when you decide it is** (any skill sets it when you say so); `/sync` reconciles | boxes you ran ticked, skipped ones marked skipped; the tier's last stage (`Prototype` → after `/develop`; `Alpha` → after `/check verify`; `Beta`/`GA` → after `/test`) is the suggested point to call it done; `/sync` captures conventions |

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/architect` first; otherwise straight to `/develop`. The tag drops once the spec is captured.
- **Atomic build tasks live in the spec's `## Build plan`, not here**: the scope carries only the milestone rollup.
- **Status** `planned` → `in-progress` → `done`, plus `existing` (pre-workflow) and `dropped` (de-scoped, kept for history).
- **Approach tag** beside a heading (e.g. `· Facade`) overrides the project default for that feature; no tag = inherits it.
- **Workflow tier tag** beside a heading (e.g. `· GA`, `· Prototype`) sets that one feature's rigor above or below the project default; no tag inherits the default.
- **Workflow** (header line) is the project default, what runs after `/develop`: **Prototype** = nothing; **Alpha** = `/check verify`; **Beta** = `/check verify` then `/test`; **GA** = adds a fresh model `/check review` then `/document`.
- **Pointer line** (`spec <n> · code in <path>`): the spec link added by `/architect`, the code path by `/develop`.
