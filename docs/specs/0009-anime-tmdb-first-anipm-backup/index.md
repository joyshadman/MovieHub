# 0009 · Anime plays from TMDB first, with ani.pm as its backup

**Date**: 2026-10-21
**Status**: In Progress
**Supersedes**: [0008](../0008-anime-on-anipm/index.md) (assumed, ratified as wrong on its main point: anime is no longer a separate ani.pm only section)

## Summary

Anime now works like every other title: it opens our TMDB details page and plays on the MovieHub servers first. ani.pm becomes the one backup server for anime, which the viewer picks by hand in Settings or from the "no playable stream" screen, never on its own. To know which ani.pm show and episode a TMDB title is, the site uses a small ID map built from a public anime ID list on every deploy, falls back to a careful title search, and asks the viewer to pick when it is not sure. ani.pm plays in its own player, exactly as its terms require, and still works with Watch Together, Continue Watching and Sub or Dub.

## Requirements

**User stories**:
- As a viewer, I want anime to open the same details page and player as any show, so I browse, resume and share it the same way.
- As a viewer, when MovieHub servers have no stream for an anime episode, I want to switch to ani.pm and land on the right show, season and episode.
- As a viewer, when the site is not sure which ani.pm show matches, I want to pick it myself instead of getting the wrong one.
- As a room member, I want ani.pm playback, episodes and Sub or Dub to stay in sync with the room like the MovieHub server does.
- As a viewer, I want anime I watched on ani.pm in Continue Watching, and Resume to take me back to the same second on ani.pm.

**Acceptance criteria** (the contract; revised after the cross check):
- **AC-1**: Anime from anywhere (home rows, search, categories, and `/anime` cards that match TMDB) opens the TMDB details page and plays first on the MovieHub server, exactly as today. Nothing switches to ani.pm on its own.
- **AC-2**: For a TMDB title with genre Animation, Settings lists **ani.pm** as a server, and the "No playable stream on MovieHub servers" screen shows a **Try ani.pm** button. With a confident match it plays directly; without one it opens Find on ani.pm (AC-4). Titles that are not Animation never show ani.pm and never load the map.
- **AC-3**: Matching per TMDB season: a manual pick for that season in this browser first, then the ID map, then (season 1 and movies only) an AniList search. A search result is accepted only when a normalized title (English, romaji, native or a synonym; lowercased, accents removed, punctuation and a leading "the" removed, spaces collapsed) equals the normalized TMDB name or original name, its start year is within 1 of the TMDB year (first air year for TV, release year for movies), and the format agrees (TMDB movie to `MOVIE`; TMDB TV to `TV`, `TV_SHORT` or `ONA`). If several results pass, the earliest starting `TV` (or `MOVIE`) entry wins; a remaining tie is not confident. Later seasons of a title missing from the map are never searched: they go to Find on ani.pm.
- **AC-4**: With no confident match, choosing ani.pm opens **Find on ani.pm**: the top 5 AniList results that ani.pm can play (poster, title, year, format), plus a search box using ani.pm's own title search. With zero playable results it says "Nothing found on ani.pm" and keeps the search box. The viewer's pick plays and is remembered in this browser for that TMDB title and season. A **Wrong show?** link on the ani.pm option opens the same sheet even for map matches, and the sheet has **Reset** to drop the pick. A correction added to `src/data/animeOverrides.json` applies to everyone after the next deploy.
- **AC-5**: Episode mapping, using the match entries `{ a, s, o }` (AniList id, TMDB season, episode offset, the offset defaulting to 0):
  - **Per season**: the entries whose `s` equals the TMDB season are ordered by `o`. TMDB episode N plays, on the last entry whose `o` is below N, its episode `N − o` (Attack on Titan S2 E1 plays AniList 20958 episode 1; a 12 plus 12 season with the second part at offset 12 plays E13 as part 2 episode 1). When parts have no offsets, they are ordered by AniList start date and offsets are derived from their episode totals.
  - **Whole show** (`s` is null): the running number, the episodes of all earlier TMDB seasons (season 0 left out) plus N (One Piece S2 E1 plays AniList 21 at episode `S1 count + 1`). When TMDB lists the show as one long season, that is simply N.
  - The result is `unavailable` when it falls before the first part, beyond a part's known episode total with no later part, or beyond ani.pm's episode list. A part still airing (no total) is open ended.
  - TMDB season 0 never offers ani.pm.
- **AC-6**: When the mapped episode is not on ani.pm yet, or the viewer wants Dub and ani.pm has no dub for it, ani.pm stays in the list but is disabled, with "Not on ani.pm yet" or "No dub on ani.pm". Availability is checked again on every episode change.
- **AC-7**: ani.pm plays as ani.pm requires: not sandboxed, no click shield, nothing of ours drawn over its frame. Our bar sits above the frame on desktop and phones and holds Back, the title, a **Sub | Dub** switch, Episodes, Settings, the room button and the next episode countdown. Our bottom controls are hidden. The first time ani.pm loads in a browser (chosen by the viewer or by the room), a small line in our bar says "This server may open an ad tab now and then", not blocking anything, and it is not shown again in that browser. When the browser blocks autoplay, the bar says "Press play in the player".
- **AC-8**: Sub or Dub on ani.pm is the viewer's choice, remembered in this browser and passed in the embed URL. A switch keeps the current second (ani.pm `setLanguage`). In a room, the language rides on the room's existing `audio` field and `'audio'` action (spec 0007): a change by someone who may control switches every member and the others are told who changed it; a member who may not control switches only for themselves.
- **AC-9**: In a Watch Together room, switching to ani.pm (allowed per the room's control mode, spec 0005) makes every member load the room's AniList entry, ani.pm episode and language, never their own match. Play, pause, seek and episode changes reach every member within about 2 s on desktop and phones, and a member more than 3 s off is corrected. In host controls mode, a guest's play, pause or seek inside ani.pm's own controls is put back to the room's state (after 0.5 s, once per action) with "The host controls playback in this room". **Sync now** stays available on ani.pm as a manual fallback. If ani.pm does not answer `hello` with `ready` within 15 s, the member sees "ani.pm did not respond" with Sync now.
- **AC-10**: Watching on ani.pm saves progress to Continue Watching like the MovieHub server does (TMDB season, episode, second), and the history item stores the ani.pm server with its AniList entry and episode. Resume, from Continue Watching or the details page, reopens on ani.pm at that stored entry, episode and second, on any device of that account, even if the browser would match differently. If ani.pm is unavailable or unreachable at that moment, Resume opens on the MovieHub server at the same second and says so. Progress clears within 90 s of the end (spec 0004 rule).
- **AC-11**: `/anime` keeps Latest, Top rated, Most watched, Schedule and search. A card whose AniList id is in the map opens `/tv/{tmdbId}` or `/movie/{tmdbId}` with that TMDB season selected, and for a latest episode card that episode, mapped back with the AC-5 rules in reverse (TMDB episode = ani.pm episode + offset per season, or split by earlier season counts for a whole show entry). If that TMDB episode is beyond what TMDB lists yet, only the season is selected. Schedule items open with the season selected. A card with no TMDB match opens the existing ani.pm title page.
- **AC-12**: Each deploy's build downloads the public anime ID list and writes `public/anime-map.json` (not committed). The download counts only if it parses and holds more than 5,000 entries with AniList ids; otherwise the build uses the committed fallback `src/data/anime-map.fallback.json`, warns, and still succeeds. The fallback is refreshed by hand with `npm run anime-map`.
- **AC-13**: Each AniList or ani.pm catalogue request times out after 8 s. If AniList, ani.pm or the map file cannot be reached, the ani.pm option shows "Could not check ani.pm" with Try again (failures are not cached). MovieHub server playback, history and rooms keep working as before.

## Decision

**Chosen option**: TMDB first everywhere, ani.pm as a hand picked backup, matched by a deploy time ID map plus a strict search, with the viewer picking when unsure. (Options and reasoning: see [rationale.md](rationale.md).)

Anime stops being a separate ani.pm world. It flows through the existing TMDB details page and Watch player; ani.pm is added as a fourth kind of source that only anime gets, only by choice, and only played in ani.pm's own unmodified player.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch** (no new Firestore collections):

| Store | Key | Fields | Notes |
|---|---|---|---|
| `public/anime-map.json` (generated each deploy, gitignored) | `byTmdb["tv:{tmdbId}"]`, `byTmdb["movie:{tmdbId}"]` | array of `{ a: anilistId (int), s: tmdbSeason (int) \| null, o: episodeOffset (int, omitted when 0) }` | `s: null` means one entry for the whole show (running numbers). Entries with `s: 0` are kept out (season 0 never maps). Built from Fribb anime-lists entries that have `anilist_id` and `themoviedb_id` (`season.tmdb`, `episode_offset`), with the overrides file replacing whole keys. About 8,500 titles |
| `src/data/anime-map.fallback.json` (committed) | same as above | same | Used when the build's download is invalid (AC-12). Refreshed by hand with `npm run anime-map` |
| same file | `byAnilist["{anilistId}"]` | `[type ('tv' \| 'movie'), tmdbId (int), tmdbSeason (int \| null), offset (int)]` | Reverse lookup for `/anime` cards (AC-11). If an AniList id appears in several entries, the first with a numbered season wins |
| `src/data/animeOverrides.json` (repo) | same keys as `byTmdb` | same entry arrays; an empty array removes a title | Replaces the whole key from the downloaded list at build time. Edited by maintainers only |
| browser `localStorage` `mh:anime-match:{type}:{tmdbId}` | one per TMDB title | `{ seasons: { [tmdbSeason or 'movie']: { entries: [{ a, s, o, episodes (int \| null), start (YYYY-MM-DD \| null) }], via: 'map' \| 'search' \| 'manual', at (ms) } } }` | Per TMDB season. `manual` never expires until Reset. `map` and `search` refresh after 7 days. A `manual` pick wins over the map in this browser only |
| browser `localStorage` `mh:anime-lang` | one | `'sub' \| 'dub'` | Default `'sub'` (AC-8). In a room the room's `audio.lang` wins |
| browser `localStorage` `mh:anipm-note` | one | `'seen'` | The ad tab note shows once per browser (AC-7) |
| Firestore `history/{uid}.items[]` (existing, spec 0004) | one item per title | adds `server: { sourceId: 'framex' \| 'anipm', providerId: string \| null, anilistId: int \| null, aniEpisode: int \| null, lang: 'sub' \| 'dub' \| null }` | Additive. Old items have no `server` and resume on the MovieHub server. On Resume the stored `anilistId` and `aniEpisode` win over a fresh match |
| Firestore `watch_rooms/{id}.server` (existing, spec 0005) | one per room | adds `anilistId: int \| null`, `aniEpisode: int \| null` (null on MovieHub) | Written in the same update as `season` and `episode` whenever the episode changes on ani.pm |
| Firestore `watch_rooms/{id}.audio` (existing, spec 0007) | one per room | on ani.pm `{ lang: 'sub' \| 'dub', label: 'Sub' \| 'Dub', at }` | Reused for Sub or Dub with the existing `'audio'` action; no new field |

Relationships: one TMDB title has 1 to many AniList entries (one per TMDB season, one per split part, or one for the whole run). One AniList entry has 1 to many ani.pm episodes. A history item and a room each point at exactly one `(anilistId, aniEpisode, lang)` while on ani.pm.

**State transitions** (ani.pm option for the current TMDB episode, evaluated on open and again on every episode change):
`none` (not Animation: option hidden, map never loaded) · `checking` (option shown with a spinner) → `ready` (entry and episode known, available on ani.pm) · `unavailable` (season 0, outside the mapped parts, not on ani.pm yet, or no dub; option disabled with the reason) · `unsure` (no confident match; tapping opens Find on ani.pm) · `error` (AniList, ani.pm or the map unreachable; Try again → `checking`). `unsure` → `checking` after a manual pick; Reset → `checking`. Playing on ani.pm starts only from `ready`. Room followers skip this machine: they load the room's fields directly.

**Interface surface** (browser only; no server code):

| Function / file | Inputs | Outputs | Notes |
|---|---|---|---|
| `scripts/build-anime-map.mjs`, run by an npm `prebuild` script, and by `npm run anime-map` | Fribb `anime-list-full.json` (download), `src/data/animeOverrides.json` | `prebuild` writes `public/anime-map.json`; `npm run anime-map` also rewrites `src/data/anime-map.fallback.json` | Valid only if it parses and has more than 5,000 entries with AniList ids; otherwise copy the fallback, warn, exit 0 (AC-12) |
| `services/animeMatch.js` `loadAnimeMap()` | none | the parsed map (cached in memory) | Fetched lazily, only for TMDB titles with genre Animation (16) |
| `animeMatch.match({ type, tmdbId, season, title, originalTitle, year, genreIds })` | the TMDB title and season | `{ status: 'ready', entries, via }`, `{ status: 'unsure', candidates }` or `{ status: 'none' }` | Manual pick, then map, then (season 1 and movies only) AniList search with the AC-3 rule. `none` only when the title is not Animation |
| `animeMatch.pick(type, tmdbId, season, anilistId)` and `animeMatch.reset(type, tmdbId, season)` | the viewer's choice | saves or drops `via: 'manual'` for that season | AC-4 |
| `animeMatch.resolveEpisode(match, { season, episode, seasonCounts })` | match, TMDB season and episode, TMDB per season episode counts | `{ anilistId, aniEpisode }` or `{ unavailable: reason }` | The AC-5 rules |
| `animeMatch.toTmdb(anilistId, aniEpisode, seasonCounts)` | AniList id, ani.pm episode | `{ type, tmdbId, season, episode \| null }` or `null` | AC-11 reverse mapping |
| `movieApi.getSeasonCounts(tvId)` (new, cached for the session) | TMDB tv id | `{ [season]: episode_count }` without season 0 | The one source of TMDB season counts for every caller (Watch, details, Resume, rooms, `/anime` cards) |
| `anilist.searchAnime(query)` | a title string | up to 10 media `{ id, title{english,romaji,native}, synonyms, startDate, format, episodes, coverImage }` | AniList GraphQL, `type: ANIME`, `isAdult: false`; 8 s timeout; cached in memory for the session |
| `anilist.mediaByIds(ids)` | AniList ids (one batched call per title) | `{ id, startDate, episodes }` | Split part ordering when offsets are missing, and part totals; cached in memory for the session |
| `aniPm.series(anilistId)` (existing) | AniList id | `episodeList` with `available.sub` / `available.dub` | AC-6 availability; cached 10 minutes; 8 s timeout |
| `aniPm.search(q)` (existing) | a title string | ani.pm titles | The search box in Find on ani.pm |
| `aniPm.lookup(ids)` (existing) | AniList ids | which are playable, episode totals | Filters Find on ani.pm candidates to playable ones |
| `aniPmPlayer` (new, in `services/aniPm.js`) | the frame | `send(cmd, args)` returning a promise; event subscription | Protocol `{ ns: 'anipm.player', v: 1, id, cmd, args }` to `https://ani.pm`; commands used: `hello`, `getState`, `play`, `pause`, `seek`, `loadEpisode`, `setLanguage`; events used: `ready`, `play`, `pause`, `timeupdate`, `ended`, `languagechange`, `autoplayblocked`, `error`. No command before `ready`. Events matching a command we sent in the last 1.5 s are treated as echoes and never published. At most 40 commands a second |
| `STREAM_SOURCES` entry `anipm` (`config/streamSources.js`) | `{ anilistId, aniEpisode, lang, start }` | `https://ani.pm/embed/ani/{anilistId}/{aniEpisode}/{lang}?autoplay=1&adult=0&autonext=0&color=e11d48&start=…` | Flags: `anime: true`, `sandbox: false`, `ownControls: true`. Listed only when the option is `ready`, `unavailable` or `unsure` |
| `watchHistory` save and resume (existing) | adds `server` | as the data model | AC-10 |
| `watchTogether.publishState` (existing) | `server` gains `anilistId`, `aniEpisode`; Sub or Dub uses the existing `audio` and `'audio'` | as the data model | AC-8, AC-9 |
| `MovieDetails` | reads `?season=&episode=` | Play opens that season and episode when no newer resume exists | AC-11 |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Is it anime (load the map at all) | TMDB genre Animation (id 16) | `movie.genres` / `genreIds` from TMDB details (existing) |
| Match | AniList entries for a TMDB title and season | browser cache `mh:anime-match` manual pick, else `public/anime-map.json` `byTmdb`, else (season 1 and movies) AniList search with the AC-3 rule |
| Match (search rule) | normalized titles, start year, format | TMDB `name`/`title`, `original_name`/`original_title`, first air or release year; AniList `title`, `synonyms`, `startDate.year`, `format` |
| Episode mapping | `aniEpisode` | derived (AC-5) from the entries' `s` and `o` (Fribb `season.tmdb`, `episode_offset`), TMDB per season counts (`movieApi.getSeasonCounts`), and only when offsets are missing, parts' `episodes` and `startDate` (`anilist.mediaByIds`) |
| Upper bound of a part | last playable episode | the part's AniList `episodes` total, else ani.pm `/series` `episodeList` |
| Availability (AC-6) | sub and dub per episode | ani.pm `/series/{anilistId}` `episodeList[].available` |
| Find on ani.pm list | 5 candidates | AniList search on the TMDB name, filtered by `aniPm.lookup` to playable |
| Sub or Dub | `lang` | room `audio.lang` when in a room on ani.pm, else `localStorage` `mh:anime-lang`, else `'sub'` |
| Start second | `start` | room second (spec 0005 formula) in a room, else `history` item `progressSec` when its `server` matches this ani.pm entry and episode, else `0` |
| Resume target | AniList entry and episode | `history` item `server.anilistId`, `server.aniEpisode` (wins over a fresh match) |
| Ad tab note | shown or not | `localStorage` `mh:anipm-note` |
| Room sync on ani.pm | room second, playing, episode, language | `watch_rooms/{id}` fields (spec 0005), `server.anilistId`, `server.aniEpisode`, and `audio.lang` (spec 0007) |
| Publish from ani.pm (who did what) | action and position | ani.pm events `play`, `pause`, `languagechange` (echoes within 1.5 s of our own command ignored); a seek is a `timeupdate` that moved more than 2 s further than the wall clock time since the previous one; episode changes come from our episode list |
| Progress saved | season, episode, second, duration | TMDB season and episode on screen; ani.pm `timeupdate` `currentTime`, `duration` |
| `/anime` card target | TMDB type, id, season (and episode) | `public/anime-map.json` `byAnilist` and `animeMatch.toTmdb` with `movieApi.getSeasonCounts`; the card's ani.pm episode number for latest episode cards |
| Ad note shown | yes or no | `localStorage` `mh:anipm-note` |

**Key invariants**:
- ani.pm is never loaded without a viewer action or a room action. It is never sandboxed, never covered, and its clicks are never intercepted.
- The room fully names what plays: on ani.pm every member loads `server.anilistId`, `server.aniEpisode` and `audio.lang`, never their own match. `season`, `episode` and `server.aniEpisode` change in one write.
- TMDB season and episode stay the single numbering the site shows and stores (history, episode list, room). ani.pm numbers are derived for the frame only, plus kept in `server` so another device or member plays the identical episode.
- A `manual` match in a browser is never overwritten by the map or a search.
- Following a room never publishes (spec 0005 rule); only a person's own action does.
- Season 0 never maps to ani.pm.

**Security model**:
- No new data a user can write for others. Matches and picks live in each browser; shared corrections only through the repo overrides file.
- `history/{uid}`: owner only, unchanged (spec 0004). The new `server` field is part of the owner's item.
- `watch_rooms/{id}`: unchanged rules from spec 0005. `server` and `audio` keep their existing write rules (host, or members in everyone mode). If the Firestore rules in the console check the keys inside `server`, they must also allow `anilistId` and `aniEpisode` (build plan task 1).
- ani.pm runs unsandboxed by its terms, so it may open one ad tab per click at most every 5 minutes (its stated policy). Browsers still block a cross origin frame from navigating our page without a user gesture; we accept the remaining risk as the cost of ani.pm's terms and tell the viewer once (AC-7).
- Adult titles stay off: `adult=0` on the embed and `isAdult: false` in AniList searches.

**Configuration required**:
- No new env vars or keys. ani.pm open embeds, its catalogue API and AniList's public API need none.
- `package.json`: a `prebuild` script running `node scripts/build-anime-map.mjs`.

**Critical test scenarios**:
- Happy path: open Attack on Titan from search, play S2 E1 on the MovieHub server, switch to ani.pm in Settings, see the one time ad note, AniList 20958 episode 1 plays with nothing over it, verifies **AC-1**, **AC-2**, **AC-5**, **AC-7**.
- Running numbers: One Piece S2 E1 on ani.pm plays AniList 21 at episode (S1 count + 1), verifies **AC-5**.
- Split part: a show whose TMDB S1 is AniList part 1 plus part 2 at offset 12; S1 E13 plays part 2 episode 1, verifies **AC-5**.
- Wrong map: Wrong show? on a mapped title, pick another entry, it plays and survives reload; Reset returns to the map, verifies **AC-4**.
- Not sure: a title missing from the map with only near matches shows Find on ani.pm; picking one plays it and the pick is reused after reload, verifies **AC-3**, **AC-4**.
- Missing episode: a just aired episode not on ani.pm shows the option disabled with "Not on ani.pm yet", verifies **AC-6**.
- Room: host switches to ani.pm, a desktop guest and a phone guest load the same entry even with a different manual pick in their browser; host pauses, seeks, switches to Dub and next episode, members follow within 2 s and no echo loop appears; in host mode a guest's own pause is put back once, verifies **AC-8**, **AC-9**.
- Resume: watch 10 minutes on ani.pm, open Continue Watching on another browser, Resume reopens ani.pm at that second, verifies **AC-10**.
- `/anime`: an Attack on Titan Season 2 card opens `/tv/1429` with season 2 selected; a title without a TMDB match opens the ani.pm title page, verifies **AC-11**.
- Build: block the Fribb download and run `npm run build`; it warns and succeeds with the committed fallback, verifies **AC-12**.
- Resume fallback: Resume an ani.pm item while ani.pm is blocked; it opens on the MovieHub server at that second with a message, verifies **AC-10**.
- Outage: block `graphql.anilist.co` and `ani.pm`; the option shows Could not check ani.pm, MovieHub playback is unaffected, verifies **AC-13**.

## Build plan

Ordered as a tracer bullet (the project approach): one thin path that plays a mapped episode on ani.pm end to end first, then widen.

1. Firestore rules check in the console: make sure room updates may carry `server.anilistId` and `server.aniEpisode` (spec 0005 rules), satisfies **AC-9**.
2. Map builder: `scripts/build-anime-map.mjs` (with `episode_offset`, season 0 left out, the validity rule), `src/data/animeOverrides.json` (empty), `src/data/anime-map.fallback.json`, `prebuild` and `anime-map` npm scripts, `public/anime-map.json` gitignored, satisfies **AC-12**.
3. `movieApi.getSeasonCounts`, and `services/animeMatch.js` with `loadAnimeMap`, the map branch of `match`, and `resolveEpisode` (per season with offsets, running numbers, bounds, season 0), satisfies **AC-3**, **AC-5**.
4. Tracer bullet: the `anipm` source in `STREAM_SOURCES` and Watch support for an unsandboxed own controls frame on desktop and phones (our bar above with Sub | Dub, Episodes, Settings, room and countdown; bottom controls hidden; no shield; nothing over it), listed only for Animation titles, Try ani.pm on the no stream screen, the one time ad note line and the "Press play in the player" hint, satisfies **AC-1**, **AC-2**, **AC-7**.
5. The option state machine: availability from `aniPm.series` per episode, the disabled reasons, the error state with Try again and the 8 s timeouts, satisfies **AC-6**, **AC-13**.
6. Split parts without offsets (`anilist.mediaByIds`, batched and cached), satisfies **AC-5**.
7. Search fallback for season 1 and movies with the strict rule, the `unsure` state, Find on ani.pm (candidates, ani.pm search box, nothing found), per season manual picks, Wrong show? and Reset, satisfies **AC-3**, **AC-4**.
8. `aniPmPlayer` command and event helper (ready gating, echo window); next episode countdown driven by ani.pm `ended` (its auto next stays off); Sub or Dub remembered, passed in the URL and switched with `setLanguage`, satisfies **AC-7**, **AC-8**.
9. Continue Watching: save progress and `server` from ani.pm events; Resume (Continue Watching and details) reopens on ani.pm at the stored entry, episode and second, with the MovieHub fallback, satisfies **AC-10**.
10. Watch Together: `server.anilistId` and `server.aniEpisode` written with `season` and `episode`; Sub or Dub over the existing `audio` field; follow loop over `aniPmPlayer` (play, pause, seek, loadEpisode, setLanguage) with the 3 s drift rule; publishing from ani.pm events; host mode put back; Sync now and the 15 s no response state, satisfies **AC-8**, **AC-9**.
11. `/anime` cards: `byAnilist` and `animeMatch.toTmdb`, `MovieDetails` reading `?season=&episode=`, unmatched titles keep the ani.pm title page, satisfies **AC-11**.
12. Recheck the anime collection card, home Anime rows and footer still lead to `/anime`, and that non Animation titles never load the map or show ani.pm, satisfies **AC-1**, **AC-2**.

## Consequences

**Positive**:
- One way to browse, resume and share anime; history, rooms and the details page work for anime like everything else.
- ani.pm fills gaps where MovieHub servers have no stream, without ever surprising viewers with its ad tab.
- Most matches are exact (the ID map), and the viewer, not a guess, settles the unsure ones.

**Negative / tradeoffs**:
- A public ID list is now a build input. If it changes shape, the build falls back to the committed copy, which only updates when someone runs `npm run anime-map`.
- Later seasons of shows missing from the map always need a viewer pick (no sequel guessing), which is the common case for brand new seasons until the list catches up.
- Map entries can be wrong or missing for new shows; Wrong show? lets a viewer fix it for their own browser, and fixes for everyone need a commit to the overrides file.
- ani.pm may open an ad tab when clicked, and we cannot prevent it under its terms.
- Desktop ani.pm playback uses ani.pm's controls, not ours: our subtitles, subtitle styling and speed control do not apply there.
- Room sync on ani.pm relies on its message protocol, which is versioned (v1) but outside our control.
- Two anime paths remain: TMDB pages for matched titles, and the old ani.pm title and watch pages for titles TMDB lacks.

**Neutral**:
- `history` items and room `server` gain optional fields; old data keeps working.
- About 100 KB (compressed) map file, loaded only for animation titles.

## Migration plan

**Strategy**: strangler. The new TMDB first path is added next to the existing `/anime` section; `/anime` cards are rerouted only when a TMDB match exists.
**Phases**:
1. Ship the map, matching and the ani.pm source in Watch (build plan 1 to 8). `/anime` unchanged.
2. Ship history and rooms on ani.pm (9, 10).
3. Reroute `/anime` cards to TMDB pages (11, 12). The ani.pm title and watch pages stay for unmatched titles.
**Rollback**: each phase is a revert. The added Firestore fields are optional, so reverted code simply ignores them.
**Risks**: a wrong map entry plays the wrong show (mitigated by overrides and manual picks); a room member on an old build ignores the ani.pm fields and stays on the MovieHub server.

## Follow-up

- [ ] Specs 0004 (watch progress) and 0007 (room subtitles and dubs) are still Assumed; this spec builds on both. Ratify them with `/architect` when you can.
- [ ] `docs/video-player.md` will need an ani.pm section after the build (`/sync`).
- [ ] AniList's public API has a rate limit (about 90 requests a minute as of my knowledge; verify current). Search runs only on demand and is cached for 7 days, which should stay well under it.
- [ ] Optional later: an ani.pm app with a publishable key adds analytics and default player settings; not needed for this feature.
