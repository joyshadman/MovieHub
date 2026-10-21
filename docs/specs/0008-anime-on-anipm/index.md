# 0008 · Anime section on ani.pm

**Status**: Superseded by [0009](../0009-anime-tmdb-first-anipm-backup/index.md)
**Date**: 2026-10-21
**Authorized by**: joyshadman, during /develop

## Owed decision
Where anime comes from and plays (a new provider), what the Anime section shows (pages and lists), how "highest rated" is sourced when ani.pm has no rated list, and what happens to anime titles that come from TMDB.

## Assumption built on

**Findings (checked 2026-10-21 from a browser on the site's origin):**
- ani.pm catalogue API (`https://ani.pm/api/partner/v1`, no key, CORS open) answers in 0.3 to 1.8 s: `/recent` (latest episodes), `/schedule` (218 releases over about 10 days, each with `airingAt`, `episode`, `kind`, `onAniPm`, `embed`), `/top?range=today|week|month|all` (most watched, with `views` and `score`), `/titles?q=` (search), `/series/{anilistId}` (title plus `episodeList` with sub/dub availability), `/lookup?anilist=` (up to 50 ids, says which are playable). Plain curl gets a 403 bot page; browsers pass.
- ani.pm has no top rated list. AniList's public GraphQL API (`https://graphql.anilist.co`, no key, CORS open, about 0.8 s) gives one sorted by score.
- ani.pm terms: the player must stay unmodified, must not be covered or have its clicks intercepted, must not be sandboxed, at least 320×180. So anime plays in ani.pm's own player (its controls, sub/dub, episodes, intro skip). Our back bar and episode list sit outside it.

**Decisions (engineer's answers):**
1. A separate Anime section at `/anime`, fully on ani.pm. TMDB anime elsewhere (home rows, search, categories grids) keeps playing on frameXTV, so no title matching. The Anime collection card, the home Anime rows' "See all" and the footer link point to `/anime`.
2. `/anime` has tabs: **Latest** (`/recent`), **Top rated** (AniList by score, 50 per page, then `/lookup` keeps only titles ani.pm can play), **Most watched** (`/top`, with Today, Week, Month, All time), **Schedule** (the time table: `/schedule` grouped by day in the viewer's local time, marking what is already on ani.pm), and search (`/titles?q=`).
3. `/anime/:id` (AniList id) shows the title (`/series/{id}`): poster, score, year, format, status, genres, studios, synopsis, and every episode with sub and dub availability.
4. `/anime/:id/:episode` plays `https://ani.pm/embed/ani/{id}/{episode}/{sub|dub}` in ani.pm's own player, not sandboxed, with a Sub/Dub switch, previous and next episode, and the episode list beside or below it. A dub that does not exist is not offered (ani.pm falls back to sub on its own).
5. Resume: the last second of each episode is kept in this browser (ani.pm `timeupdate` events, `start=` on the next load), like frameXTV's local resume. Not in Firestore history or Continue Watching yet, and not in Watch Together.
6. Adult titles are hidden (`adult: true` filtered out, `adult=0` on the embed).

## Code area
`src/services/aniPm.js` (new), `src/services/anilist.js` (new), `src/Pages/Anime.jsx` (new), `src/Pages/AnimeDetails.jsx` (new), `src/Pages/AnimeWatch.jsx` (new), `src/components/AnimeCard.jsx` (new), `src/App.jsx`, `src/utils/collections.js`, `src/Pages/Categories.jsx`, `src/Pages/Home.jsx`, `src/components/Footer.jsx`, `src/components/Navbar.jsx`.

## Requirements
- AC-1: `/anime` shows Latest episodes, Top rated, Most watched (Today, Week, Month, All time) and a Schedule grouped by day in local time; each list loads within a few seconds with loading, empty and error states.
- AC-2: Search on `/anime` finds titles by name on ani.pm.
- AC-3: Every Top rated title can be played (unplayable AniList titles are left out).
- AC-4: `/anime/:id` lists every episode with sub and dub availability; Play opens episode 1 or the resumed one.
- AC-5: `/anime/:id/:episode` plays in ani.pm's own player, nothing drawn over it, with Sub/Dub (only when dub exists), previous, next and an episode list; reopening an episode resumes where it stopped in this browser.
- AC-6: Categories, the home Anime rows and the footer lead to `/anime`; TMDB anime still plays on frameXTV.
- AC-7: Works on phone, tablet and desktop, keyboard reachable, dark theme, red accent.

## Ratify
This decision was recorded by /develop, not deliberated. Run `/architect anime on ani.pm`
to deliberate and ratify it. Until then it stays flagged as an owed decision; it does not block marking the feature `done`.
