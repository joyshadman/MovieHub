# Verify: Anime from TMDB with ani.pm backup · spec 0009 · updated 2026-10-21
_Steps derived from spec 0009 acceptance criteria and its Value sourcing table. `/check verify` runs these; `/test` locks the durable ones. Use a real browser (headless Chromium can not play ani.pm streams, so `ready` never arrives there)._

## UI / manual
- [ ] Open Attack on Titan from search → details page, Play starts on the MovieHub server, nothing switches to ani.pm on its own → AC-1
- [ ] Open a non anime title (Fight Club, `/movie/550`) and its Settings → no ani.pm row, and the network tab shows no `anime-map.json` request → AC-2
- [ ] Attack on Titan S2 E1, Settings → ani.pm row tagged Anime; pick it → frame src is `ani.pm/embed/ani/20958/1/sub…` → AC-2, AC-5
- [ ] On ani.pm: the iframe has no `sandbox` attribute, no shield, and our bar sits above the frame (desktop and a phone) with Back, title, Sub | Dub, Episodes, Settings, room button; no bottom controls → AC-7
- [ ] First ani.pm load in a fresh browser profile shows "This server may open an ad tab now and then"; reload and load ani.pm again → not shown → AC-7
- [ ] Open Episodes, Settings and the room panel on ani.pm (desktop) → each opens beside the frame, never over it; on a phone the sheets open below the player → AC-7
- [ ] Block autoplay (a fresh Chrome profile with sound) → bar says "Press play in the player" → AC-7
- [ ] One Piece S2 E1 on ani.pm plays AniList 21 at episode (S1 count + 1) → AC-5
- [ ] Attack on Titan S3 E13 on ani.pm plays AniList 104578 episode 1 (split part at offset 12) → AC-5
- [ ] Wrong show? on a mapped title → Find on ani.pm lists up to 5 playable candidates; pick one → it plays and survives a reload; Reset → back to the map match → AC-4
- [ ] A season 1 title missing from the map with only near matches → choosing ani.pm opens Find on ani.pm; a nonsense search shows "Nothing found on ani.pm" with the search box kept → AC-3, AC-4
- [ ] A later season of a title missing from the map → never searched, goes to Find on ani.pm → AC-3
- [ ] An episode that just aired and is not on ani.pm yet → row disabled "Not on ani.pm yet"; a sub only episode with Dub chosen → "No dub on ani.pm" → AC-6
- [ ] On ani.pm, change episode → availability is checked again for the new episode → AC-6
- [ ] Sub | Dub switch on ani.pm keeps the current second (no reload); reload the page → the choice is remembered (`mh:anime-lang`) → AC-8
- [ ] Room: host switches to ani.pm; a desktop guest and a phone guest (with a different manual pick in their browser) both load the room's entry → AC-9
- [ ] Room: host pauses, seeks, switches to Dub and goes to the next episode → members follow within about 2 s, no echo loop, members are told who changed the language → AC-8, AC-9
- [ ] Room in host controls mode: a guest pauses inside ani.pm's own controls → put back after 0.5 s with "The host controls playback in this room" → AC-9
- [ ] Room: block `ani.pm` for one member → after 15 s their bar says "ani.pm did not respond" with Sync now → AC-9
- [ ] Watch 10 minutes on ani.pm, open Continue Watching in another browser on the same account → Resume reopens ani.pm at that entry, episode and second → AC-10
- [ ] Resume an ani.pm item while `ani.pm` is blocked → opens on the MovieHub server at the same second, with a message → AC-10
- [ ] Let an ani.pm episode play to the end → the next episode countdown shows in our bar; history progress clears → AC-7, AC-10
- [ ] `/anime`: an Attack on Titan Season 2 card opens `/tv/1429?season=2`; a latest episode card of a mapped show opens with that episode; a card with no TMDB match opens the old ani.pm title page → AC-11
- [ ] `/tv/1429?season=3&episode=99` → Play says "Play Season 3" (episode beyond TMDB dropped) → AC-11
- [ ] Block `graphql.anilist.co` and `ani.pm` → the ani.pm row says "Could not check ani.pm" with Try again; MovieHub playback is unaffected → AC-13
- [ ] The anime collection card, home Anime rows and footer still lead to `/anime` → AC-1

## Value sourcing (one per row)
- [ ] Is it anime: a title whose TMDB genres lack Animation (16) never loads the map, even from Continue Watching (no genres on the item) → AC-2
- [ ] Match: a manual pick wins over the map in this browser only; a second browser still uses the map → AC-4
- [ ] Search rule: a title whose AniList start year is 2 years off TMDB's is not auto matched → AC-3
- [ ] Episode mapping: whole show running numbers use TMDB season counts (season 0 left out) → AC-5
- [ ] Upper bound: an episode past a part's AniList total with no later part is "Not on ani.pm" → AC-5
- [ ] Availability: `/series/{id}` `available.sub/dub` drives the disabled reason → AC-6
- [ ] Find list: candidates are AniList results filtered by `/lookup` to playable ones → AC-4
- [ ] Sub or Dub: in a room on ani.pm the room's `audio.lang` wins over this browser's choice → AC-8
- [ ] Start second: in a room the room's second; else the history item's second only when its server matches this entry and episode; else 0 → AC-9, AC-10
- [ ] Resume target: the history item's `server.anilistId` and `aniEpisode` win over a fresh match → AC-10
- [ ] Ad note: `mh:anipm-note` set to `seen` after the first showing → AC-7
- [ ] Room fields: a room update on ani.pm writes `server.anilistId` and `server.aniEpisode` together with `season` and `episode` → AC-9
- [ ] Progress saved: history item carries `server: { sourceId: 'anipm', anilistId, aniEpisode, lang }` while watching on ani.pm → AC-10
- [ ] `/anime` card target: from `byAnilist` plus TMDB season counts for whole show entries → AC-11

## Commands
- [ ] `npm run build` → prebuild writes `public/anime-map.json` (about 5,500 titles) and the build succeeds → AC-12
- [ ] `ANIME_MAP_SOURCE=https://127.0.0.1:9/x npm run build` → warns, uses `src/data/anime-map.fallback.json`, build still succeeds → AC-12
- [ ] Add `"tv:1429": []` to `src/data/animeOverrides.json`, rebuild → Attack on Titan is gone from the map; revert → AC-4, AC-12
- [ ] `npm run lint` → no errors in the changed files

## Acceptance-criteria coverage
- AC-1 … details first, `/anime` links · AC-2 … row only for Animation, Try ani.pm · AC-3 … search rule, later seasons · AC-4 … Find, Wrong show?, Reset, overrides · AC-5 … per season, split parts, whole show, bounds · AC-6 … disabled reasons · AC-7 … layout, ad note, autoplay hint · AC-8 … Sub or Dub · AC-9 … room sync, put back, 15 s · AC-10 … history and Resume · AC-11 … card targets · AC-12 … map build and fallback · AC-13 … timeouts and error state

## Spec 0010 amendment (TMDB matched titles only) · added 2026-10-21
- [ ] Every `/anime` tab (Latest, Top rated, Most watched, Schedule) and a search show only cards and rows that open `/tv/...` or `/movie/...`, never `/anime/...` → 0010
- [ ] Open a Latest card → our details page with that season and episode; Play opens our player; after a minute it shows in Continue Watching → 0010, AC-10
- [ ] Old link `/anime/20958/3` lands on `/tv/1429?season=2&episode=3`; `/anime/999999999` lands on `/anime` → 0010
- [ ] Block `/anime-map.json` → the lists show "ani.pm did not answer" with Try again instead of unmatched cards → 0010
