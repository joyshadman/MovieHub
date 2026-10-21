# Verify: room subtitle sync, dub picker, first visit tour · spec 0007 · updated 2026-10-21
_Steps derived from spec 0007 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## Before you start
- [ ] Firestore rules: an approved member in everyone mode may also change `subs`, and `lastAction.action` may be `'subs'`. Publish together with the code (keep a copy of the current rules first). The host rule already allows `subs`. → AC-1
- [ ] Two signed in accounts (A host, B guest) on two desktop browsers, plus a phone for B2 if you can.

## UI / manual

### Room subtitles
- [ ] A starts a room on a movie, B joins and is let in. A turns subtitles on (English) → B shows the same English subtitles within about 2 s, and gets a "A changed the subtitles" toast → AC-1
- [ ] A shifts timing +0.5 s three times quickly → B ends at +1.5 s; Firestore shows one `subs` write, not three (debounce) → AC-1
- [ ] A changes size to XL and color to Yellow → B's subtitles change look → AC-1
- [ ] A turns subtitles off → B's subtitles go off → AC-1
- [ ] Host controls mode: B picks another language → it changes for B only, B sees "Subtitle changes are just for you", A is unchanged. A then changes timing → B snaps back to the room's subtitles → AC-2
- [ ] Settings, Subtitles shows the room note: A "Your subtitle changes go to everyone", B "The room sets the subtitles" → AC-2
- [ ] Everyone controls mode: B changes the language → A follows → AC-1
- [ ] C joins late (after A set Hindi, +1.0 s, Yellow) → C opens with the same → AC-3
- [ ] TV room: A moves to the next episode with subtitles on → everyone keeps the same language on the new episode (value source: `subs.lang`, then `pickTrack`) → AC-1
- [ ] Phone member: A turns on a language → the phone's frameXTV player switches to that language after load → AC-1
- [ ] B's own look outside the room is unchanged after leaving (localStorage `mh:subs` only changes when B edits style) → AC-2

### Audio dubs
- [ ] Desktop, Fight Club: Settings, Audio lists English and Hindi (value source: `api/stream?provider=giant` `audioTracks`) → AC-4
- [ ] Switch audio language → reloads at the same second on Giant in frameXTV's own player, notice "Audio language: use the audio button inside the video", the player's audio menu offers Hindi and switching works → AC-4
- [ ] "back to MovieHub controls" → our controls return at the same second → AC-4
- [ ] A title with one audio track → "Only English audio was found" (no switch button) → AC-4
- [ ] In a host controls room, guest presses Switch audio → held with "The host controls playback" → AC-4

### Room audio language (needs the rules delta: members in everyone mode may change `audio`, `lastAction.action` may be `'audio'`)
- [ ] A (host) picks Hindi in Settings, Audio → one Firestore write sets `audio: { lang: 'Hindi', ... }` and `server.providerId: 'giant'`; A reloads in the dub player at the same second → AC-4b
- [ ] B (desktop guest) within a few seconds reloads in the dub player at the room's second, sees "Room audio: Hindi. Pick it from the audio button inside the video" in the top notice and a toast, and gets "A changed the audio language" → AC-4b
- [ ] B's Audio tab shows the Room audio note and Hindi marked → AC-4b
- [ ] Phone guest: moves to Giant and gets the Room audio toast → AC-4b
- [ ] C joins late → opens in the dub player with the Room audio notice → AC-4b
- [ ] Host controls mode: B picks English → only B switches, B sees "Audio change is just for you", the room's `audio` is unchanged → AC-4b
- [ ] B presses back to MovieHub controls → only B leaves the dub player; no Firestore write → AC-4b
- [ ] Everyone controls mode: B picks English → A and C follow with the notice → AC-4b

### Server order (spec 0007, 2d; replaces the fast start checks)
- [ ] Settings, Servers lists Miner, Headhunter, Titan, Hog Rider, Valkyrie, then the rest, Giant, and Best available last → AC-5
- [ ] Press Play on a movie → the player opens straight on Miner (no waiting step) → AC-5
- [ ] A title Miner can not play → the rotation moves on and skips servers the background check found empty (Bohemian Rhapsody 424694 had no Giant stream on 2026-10-21) → AC-5
- [ ] TV show, next episode → starts again on Miner → AC-5
- [ ] Pick a server by hand, then go to the next episode → it stays on your server → AC-5
- [ ] Inside a Watch Together room → members open on the room's server, never reset to Miner → AC-5

Checked during /develop (headless Chromium, 2026-10-21): Fight Club opened with provider=miner; Settings listed Miner > Headhunter > Titan > Hog Rider > Valkyrie > Lava Hound > Super Barbarian > Bowler > Giant, with Best available now moved last.

### Tour
- [ ] Fresh browser profile, open `/` → after the startup screen the tour shows "Welcome to MovieHub", Step 1 of 10 → AC-6
- [ ] Next through all 10 steps: Browse, Search, My List, Sign in (or Your account when signed in), Start watching, Title cards, Ask AI each spotlight the real element; the card stays on screen → AC-6, AC-7
- [ ] Back, ArrowLeft and ArrowRight move steps; Esc and Skip tour close it; Tab stays in the card; focus is on the main button each step → AC-7
- [ ] After finish or skip, reload → no tour → AC-6
- [ ] Browser with `moviehub_first_time_user` already set → no tour → AC-6
- [ ] First visit landing on `/search` → no tour there; it shows on reaching `/` → AC-6
- [ ] About, Take the tour → goes to `/` and starts the tour → AC-6
- [ ] Repeat on a phone (Pixel 7 size) and a tablet: the tab bar items are spotlighted instead of the top nav → AC-7

## Commands
- [ ] `npm run build` → builds with no errors → all
- [ ] `npx eslint src/components/Tour.jsx src/utils/tour.js src/Pages/Watch.jsx src/components/player src/services/frameX.js src/services/watchTogether.js` → no errors → all

## Acceptance-criteria coverage
- AC-1 room subtitle steps 1 to 4, 7, 9, 10 · AC-2 steps 5, 6, 11 · AC-3 late joiner · AC-4 audio dub steps · AC-5 server order · AC-6 tour steps 1, 2, 4 to 7 · AC-7 tour steps 2, 3, 8

## Already checked during /develop (2026-10-21, headless Chromium against `npm run build`)
- Tour: all 10 steps on desktop 1440×900 and Pixel 7; spotlight on every targeted step, card in view, focus on Next; finish, skip, Esc, reload, returning visitor, `/search` landing, About replay all behave; zero console errors.
- Dubs: Fight Club Audio tab listed English and Hindi; Switch audio loaded `provider=giant` without `controls=0`, sandboxed; back restored `controls=0`. Video itself not visible (headless Chromium has no H.264).
- Room subtitle sync: NOT checked live (needs two signed in accounts and the rules update).
