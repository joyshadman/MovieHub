# 0010 · Anime section shows TMDB matched titles only

**Status**: Assumed
**Date**: 2026-10-21
**Authorized by**: Joy Shadmane, during /develop ("only use tmdb, if ani.pm can't do it, remove it")
**Amends**: [0009](0009-anime-tmdb-first-anipm-backup/index.md), AC-11

## Owed decision
What `/anime` does with titles the ID map can not match to TMDB. Spec 0009 AC-11 sent them to the old ani.pm title and watch pages, outside our details page, player and Continue Watching.

## Assumption built on
- `/anime` (Latest, Top rated, Most watched, Schedule, search) lists only titles whose AniList id is in the ID map (`byAnilist`). Every card and schedule row opens our TMDB details page (season, and episode for latest episode cards, per 0009 AC-11), so playback goes through our Watch player and Continue Watching.
- Titles with no TMDB match are left out of the lists. Until the map has loaded, the lists show their loading state; if the map can not be reached, they show an error with Try again.
- The old ani.pm title and watch pages (`/anime/:id`, `/anime/:id/:episode`) are removed. Those addresses stay as redirects for old links: to the TMDB page when the map knows the id, else to `/anime`.
- Unchanged: ani.pm as the hand picked backup server inside our player (0009 AC-2 to AC-10, AC-12, AC-13).

## Code area
`src/Pages/Anime.jsx`, `src/components/AnimeCard.jsx`, `src/components/useAnimeLink.js`, `src/App.jsx`, `src/Pages/AnimeDetails.jsx` and `src/Pages/AnimeWatch.jsx` (removed), `src/components/AnimeEpisodes.jsx` (removed), `src/services/aniPm.js`

## Requirements
- Every card and schedule row on `/anime` opens `/tv/{id}` or `/movie/{id}`, never an ani.pm page.
- Watching from there saves to Continue Watching like any title.
- An old `/anime/{anilistId}` or `/anime/{anilistId}/{episode}` link lands on the TMDB page when matched, else on `/anime`.

## Ratify
This decision was recorded by /develop, not deliberated. Run `/architect anime from TMDB with ani.pm backup: ratify the TMDB only anime section` to deliberate and ratify it (and fold it into 0009 AC-11). Until then it stays flagged as an owed decision; it does not block marking the feature `done`.
