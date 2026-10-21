# Verify: anime section on ani.pm · spec 0008 · updated 2026-10-21
_Steps derived from spec 0008 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Categories, Anime card → `/anime`; the home "Anime Series" and "Anime Movies" See all and the footer Anime link → `/anime`; the desktop nav has Anime → AC-6
- [ ] A TMDB anime card on Home (Anime Series row) still opens the normal title page and plays on frameXTV → AC-6
- [ ] Latest → about 48 newest episodes, each with an EP badge, Sub or Sub • Dub, and how long ago it was added (source: ani.pm `/recent` `addedAt`); a card opens that exact episode; Load more adds the next page → AC-1
- [ ] Top rated → AniList order by score (Frieren first on 2026-10-21); every card opens a playable title (source: AniList score, filtered by ani.pm `/lookup` `available`); Load more works → AC-1, AC-3
- [ ] Most watched → Today, This week, This month, All time each reload the list with view counts (source: ani.pm `/top?range=`); the range stays in the URL → AC-1
- [ ] Schedule → a chip per day, Today selected; times shown in your time zone (change the computer's time zone and reload: times and day grouping move with it; source: `airingAt`); rows already on ani.pm have Watch, others say Upcoming or Coming soon → AC-1
- [ ] Search "frieren" → results after typing stops; the query is in the URL; Clear search returns to the tabs; a nonsense query shows the empty state → AC-2
- [ ] Turn the network off and open a tab → the error state with Try again; turn it back on and retry → loads → AC-1
- [ ] `/anime/154587` → poster, score, year, status, genres, studios, story and 28 episodes with Sub and Dub badges (source: ani.pm `/series`); One Piece (`/anime/21`) splits episodes into ranges of 100 → AC-4
- [ ] Watch episode 1 → `/anime/154587/1` plays in ani.pm's own player; nothing is drawn over it; its own controls work (play, seek, subtitles, quality, full screen) → AC-5
- [ ] Sub/Dub → Dub reloads the episode in dub; on a title or episode with no dub the Dub button is disabled → AC-5
- [ ] Previous and next buttons and the episode list move between episodes; when an episode ends the page moves to the next one → AC-5
- [ ] Watch a few minutes, leave, come back to the same episode → it starts where you stopped; the title page says Continue episode N → AC-5
- [ ] Phone (Pixel 7 size) and tablet: tabs scroll sideways, the grid is 3 across, the player is full width with the episode list below → AC-7
- [ ] Keyboard only: tabs, chips, cards, Sub/Dub and episodes are reachable with Tab and show a focus ring → AC-7
- [ ] No adult titles appear in any list, and an adult title's page says Not available → spec 0008 decision 6

## Commands
- [ ] `npm run build` → builds with no errors
- [ ] `npx eslint src/Pages/Anime.jsx src/Pages/AnimeDetails.jsx src/Pages/AnimeWatch.jsx src/components/AnimeCard.jsx src/components/AnimeEpisodes.jsx src/services/aniPm.js src/services/anilist.js` → no errors

## Acceptance-criteria coverage
- AC-1 Latest, Top rated, Most watched, Schedule, error state · AC-2 search · AC-3 Top rated playable · AC-4 title page · AC-5 watch, Sub/Dub, next, resume · AC-6 entry points and TMDB anime · AC-7 phone, tablet, keyboard

## Already checked during /develop (2026-10-21, headless Chromium against `npm run build`, desktop 1440×900 and Pixel 7)
- Categories card → `/anime`. Latest 47 cards (0.3 to 1.1 s), Top rated 50 (Frieren first), Most watched 58, All time range in the URL, Schedule 10 day chips with Today selected and 23 releases today, search "frieren" 3 results.
- Frieren title page: 28 episodes. Watch page: ani.pm embed not sandboxed, `autonext=0`, it answered our hello with events (`loaded`, `episodes`, `settings`). Dub switched the frame to dub; Episode 2 kept `?lang=dub`.
- Console errors seen came only from inside ani.pm's frame (its ad frame and analytics), none from MovieHub code.
- Not checked: actual video playback and resume (headless Chromium has no H.264), real keyboard pass, tablet size.
