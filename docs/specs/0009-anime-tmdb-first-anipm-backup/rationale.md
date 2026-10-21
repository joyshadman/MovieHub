# 0009 · Rationale: anime from TMDB first, ani.pm as backup

## Context

> ⚠️ Premise note: ani.pm's terms (embed unmodified, never sandboxed, nothing covering it or catching its clicks) mean a click inside it may open one ad tab, at most once every 5 minutes per viewer. That is the opposite of how the site treats every other source on phones (sandboxed, no pop ups). Adding ani.pm therefore means accepting that ad tab on purpose. This spec keeps ani.pm a hand picked backup with a one time notice, so viewers only meet it by choice.

Spec 0008 was built on an assumption: anime would be a separate `/anime` section fully on ani.pm (its lists, title pages and player), and TMDB anime would keep playing on frameXTV with no title matching. That split gives anime two unrelated homes. Continue Watching, the details page, Resume and Watch Together never see ani.pm viewing, and the same show is browsed two different ways.

The engineer now wants anime to behave like every other title: the TMDB details page and our player first, with ani.pm only as a backup. That raises four hard problems. TMDB and ani.pm use different IDs (TMDB ids versus AniList ids). They split shows differently: TMDB groups a long show into seasons, while AniList usually has one entry per season or cour (a 12 episode broadcast block), but one entry for very long shows such as One Piece. ani.pm's terms rule out the click shield and sandbox used for other backups. And rooms and history were designed around frameXTV's numbering and controls.

A wrong match plays the wrong show or season, which is worse than no backup. A slow or heavy match would make every anime page slower. Data must stay within the existing Firestore usage (the free Spark plan, spec 0005), and there is no server of our own: the site is a static Vite build on Vercel.

### Evidence (checked 2026-10-21)

- Fribb anime-lists (`anime-list-full.json`, public on GitHub, CORS open): 39,579 entries, 7.5 MB; 8,530 carry a TMDB id. Examples: Attack on Titan season 1 is AniList 16498 with `themoviedb_id.tv 1429` and `season.tmdb 1`; season 2 is AniList 20958, `season.tmdb 2`. One Piece is AniList 21, `themoviedb_id.tv 37854`, with no `season`, meaning one entry covering the whole run. Frieren is AniList 154587, TMDB 209867, season 1.
- ani.pm (developer notes in `context/ani.pm.md`): embed `/embed/ani/{anilistId}/{episode}/{sub|dub}`; postMessage protocol `{ ns: 'anipm.player', v: 1 }` with commands `play`, `pause`, `seek`, `loadEpisode`, `setLanguage` and events including `play`, `pause`, `timeupdate`, `ended`, `autoplayblocked`; at most 40 commands a second; a click may open one ad tab at most every 5 minutes; do not sandbox.
- AniList GraphQL (`graphql.anilist.co`, no key) already powers Top rated in `src/services/anilist.js`.

## Options considered

### Matching TMDB to AniList

**Option A: deploy time ID map, then a strict title search (chosen).** A build script turns Fribb's list into a compact `public/anime-map.json` (TMDB id plus season and episode offset to AniList id, and the reverse), with a committed fallback copy. Titles missing from it fall back, for season 1 and movies only, to an AniList search accepted only on exact normalized title, year within 1 and agreeing format; otherwise the viewer picks.
- Pros: exact season level matches for most shows; works offline from AniList for those; new shows still get a careful fallback; tiny runtime cost.
- Cons: a build step depending on a community list; the map lags new releases until the next deploy; fixes need a commit.

**Option B: AniList title search only.** Search every time with the TMDB names and year.
- Pros: no build step or extra file; always current.
- Cons: seasons, remakes and spin offs share names, so season mapping becomes guesswork; a network call per anime page.

**Option C: ID map only.** Use the map and nothing else.
- Pros: exact or nothing; simplest runtime.
- Cons: new and less known titles get no backup at all until the list catches up.

### When ani.pm is used

**Option A: offered by hand, plus Try ani.pm on the no stream screen (chosen).**
- Pros: viewers only meet ani.pm's ad tab by choice; obvious recovery when MovieHub fails.
- Cons: one extra tap when MovieHub has nothing.

**Option B: automatic after every MovieHub server fails.**
- Pros: zero taps.
- Cons: drops viewers into a player that may open ad tabs without them choosing it.

**Option C: Settings only.**
- Pros: least UI.
- Cons: viewers on the failure screen may never find it.

### The existing `/anime` section

**Option A: keep its lists, open TMDB pages for matched titles (chosen).**
- Pros: keeps the schedule and latest episodes lists people use; one watch path for matched titles.
- Cons: the old ani.pm title and watch pages stay for unmatched titles.

**Option B: remove `/anime`.**
- Pros: one code path.
- Cons: loses the schedule and latest episodes, which TMDB has no equivalent for.

**Option C: keep `/anime` fully on ani.pm alongside.**
- Pros: no rerouting work.
- Cons: two ways to watch the same show, with history and rooms only on one.

### Watch Together on ani.pm

**Option A: full sync through ani.pm's documented commands and events (chosen).**
- Pros: rooms behave the same on every source; works on phones too, which frameXTV's own player cannot.
- Cons: depends on ani.pm's v1 protocol; in host mode a guest's own clicks inside ani.pm can only be put back, not blocked.

**Option B: Sync now button only.**
- Pros: simple and robust.
- Cons: rooms drift until someone presses it.

**Option C: not allowed in rooms.**
- Pros: no new sync code.
- Cons: an anime room has no backup when MovieHub fails.

## Rationale

The map first approach wins because the hard part is seasons, not titles. Fribb's list already records which TMDB season each AniList entry is, and whether an entry covers the whole show, which is exactly the information needed to turn "TMDB S2 E5" into "AniList entry X episode Y". A pure search (Option B) can find a show but cannot reliably tell season 2 from a sequel film or a remake. Building the map at deploy time keeps the 7.5 MB list off viewers' phones and needs no server, which fits a static Vercel site. The strict search plus a viewer pick covers new shows without ever guessing, because a wrong season is worse than no backup.

Keeping ani.pm a hand picked backup follows from its terms. Every other source on phones is sandboxed precisely to stop pop ups; ani.pm forbids that, so the honest design is to let viewers opt in with a one time notice rather than land them there automatically. Keeping `/anime`'s lists while routing matched titles to TMDB pages removes the "two homes" problem from 0008 without throwing away the schedule.

Storing the resolved ani.pm entry and episode in history and in the room's `server` (with Sub or Dub on the room's existing `audio` field from spec 0007) makes the TMDB numbering the single truth the site shows, while guaranteeing that another device or room member plays exactly the same episode even if their own browser would match differently. The engineer chose to sync Sub or Dub across rooms; that matches spec 0007's room audio rule for frameXTV dubs, so rooms behave consistently whichever server they use.

### Cross check revisions (2026-10-21)

An independent read only review (another model) found gaps that would have left decisions to the builder. Changes made with the engineer's approval: Fribb's `episode_offset` now drives split parts; TMDB season counts have one named source (`movieApi.getSeasonCounts`); search covers season 1 and movies only and the sequel walk was dropped (later seasons not in the map go to a viewer pick, which is simpler and never guesses); the title normalization and tie rules are spelled out; manual picks are per TMDB season with Wrong show? and Reset; Sub or Dub in rooms reuses spec 0007's `audio` field instead of a second language field; room following now has ready gating, echo suppression, a seek rule, a put back delay and a no response state; Resume trusts the stored entry and falls back to the MovieHub server; the option gained `none` and `checking` states; the generated map is gitignored with a committed fallback and a validity rule; timeouts and caching are named; and the Firestore rules check moved into the build plan.
