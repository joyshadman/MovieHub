# 0007 · Room subtitle sync, dub picker and first visit tour

**Status**: Assumed
**Date**: 2026-10-21
**Authorized by**: joyshadman, during /develop

## Owed decision
Three product choices no spec recorded:
1. How subtitles behave in a Watch Together room (who sets them, what is shared, what stays personal).
2. How desktop viewers reach audio dubs, given frameXTV's remote control API has no audio command.
3. What the first visit tour is, when it shows, and how it relates to the existing welcome popup.

## Assumption built on

**Findings this rests on (checked 2026-10-21):**
- frameXTV lists 9 movie and TV servers. Tested on 2 movies and 2 TV episodes: Bowler, Titan, Giant 4 of 4; Miner, Super Barbarian 3 of 4; Headhunter, Hog Rider 1 of 4; Valkyrie, Lava Hound 0 of 4. VidLink and VidSrc backups load (vidsrc.me now redirects to vidsrc.sh).
- Dubs exist: `api.framextv.tech/api/stream?provider=giant` returns `audioTracks` (English and Hindi on every title tried). frameXTV's own player shows an audio menu for them. Its postMessage API and embed URL have no audio command or parameter, so only its own player can switch audio.

**1. Room subtitles follow the control mode.**
- The room doc gains `subs`: `null` (never set) or `{ on: bool, url: string | null, lang: string | null, offset: number (-60..60), style: { size, color, bg, position }, by: uid, at: int ms }`.
- Whoever may control playback (`canControl`: the host, or everyone in everyone mode) changes the room's subtitles. Their language, on or off, timing offset and style are published (debounced) and every other desktop member applies them.
- A member who may not control can still change subtitles, but only for themselves (toast says so). Their change lasts until the room's subtitles change again.
- Any member can turn subtitles off just for themselves; a later room change turns them back on.
- The room's track is matched by `url` (everyone is on the same episode and the same subtitle API), then by `lang`.
- Phone members (frameXTV's own player) get the room's language sent through `setSubtitle {index}`; style and timing are not reachable there.
- `lastAction.action` gains `'subs'` ("changed the subtitles").
- Firestore rules delta: an approved member in everyone mode may also change `subs`, and `lastAction.action` may be `'subs'`. The host's existing "any field except hostUid, title, createdAt" already covers `subs`.

**2. Audio language button opens frameXTV's own player.**
- Settings gains an Audio tab. It asks frameXTV's stream API (Giant server) for this title's audio tracks and lists them.
- "Switch audio" reloads the current title at the current second on the Giant server in frameXTV's own player (sandboxed like phones), where the viewer picks the dub. "Back to MovieHub controls" returns to our player at the same second.
- In a room, the server move to Giant goes through the normal server action (held for members who may not control).

**2b. Room audio language (added 2026-10-21).** frameXTV can not switch or report the audio track from outside (no URL parameter, no message command, no saved audio language preference; checked in its player bundle). So the room syncs the chosen language and the dub player, and each member picks that language from the player's audio button.
- The Audio tab lists each language as its own button. Picking one publishes, in one write, the server (Giant) and a new room field `audio`: `null` or `{ lang, label, at }`, with `lastAction.action: 'audio'` ("changed the audio language").
- It follows the control mode, like subtitles. A member who may not control switches only for themselves, and is told so.
- Every other member (and a late joiner) moves to the dub player at the room's second and sees "Room audio: <label>. Pick it from the audio button inside the video." Desktop shows it in the player's top notice; phones get it as a toast and in the Audio tab.
- Going back to MovieHub controls is personal and writes nothing.
- Firestore rules delta: an approved member in everyone mode may also change `audio`, and `lastAction.action` may be `'audio'`.

**2c. English audio by default and a faster start (added 2026-10-21).**
- Measured: "Best available" (frameXTV auto) took 20 to 26 s and often found nothing, and it was tried first. Each server with no stream cost 12 to 15 s inside the frame before the rotation moved on. Giant and Titan answered in 1 to 3 s once warm. Giant's default audio track is English on every title checked.
- Before the frame loads, the player asks Giant, Titan and Bowler for a stream at once and opens on the first one, in that order, that has one (9 s budget). This replaces auto as the default and warms that server's cache. Servers that answered empty are skipped by the rotation.
- The rotation order is the reliable servers first and "Best available" last.
- The check runs again for each new episode until the viewer picks a server by hand. It does not run inside a Watch Together room (the room's server rules there).
- The movie details page starts the check early, and the page preconnects to frameXTV's hosts.
- English default is as far as our side can reach: the first choice is a server whose default track is English. frameXTV can not be told an audio language (see 2b).

**2d. Server order set by the engineer (added 2026-10-21, replaces the order and the blocking check in 2c).**
- Order everywhere (Settings list and the automatic rotation): Miner, Headhunter, Titan, Hog Rider, Valkyrie, then every other server in frameXTV's order, then Giant, then "Best available" last.
- The player opens straight on Miner (no waiting). Miner is resolved inside frameXTV's frame, so it can not be checked in advance. In the background the servers frameXTV resolves on its API are checked, and any that answer empty are skipped when the rotation moves on.
- Each new episode starts again at Miner until the viewer picks a server by hand. Never inside a room.
- Known tradeoff: Giant was first because its default audio track is English. With Giant last, the first server's own default audio applies.
- Dub switching keeps using frameXTV's own player (2, 2b). Playing a dub in our own player is not possible from the browser: the Hindi stream only answers with a `Referer` header a web page can not set, so it would need a video proxy (decided against: bandwidth and the source's terms).

**3. Spotlight tour replaces the welcome popup.**
- Shown once per browser to first time visitors (neither `moviehub_first_time_user` nor `mh:tour` set), after the startup screen, on the home page.
- Step 1 is the welcome text from the old popup. Then it highlights the real UI one element at a time via `data-tour` attributes: browse menu, search, My List, sign in or account, the hero Play button, a title card, then a closing card about the player (servers, subtitles, audio dubs, Watch Together, episodes).
- Each step has Back, Next, Skip and "Step N of M"; Esc skips, arrow keys move. A target hidden at the current screen size shows the step as a centered card instead.
- Finishing or skipping sets both keys. The About page offers "Take the tour" to replay it.
- Built in house with framer-motion, no new library. `DeviceModal.jsx` is removed.

## Code area
`src/services/watchTogether.js`, `src/components/player/useWatchTogether.js`, `src/Pages/Watch.jsx`, `src/components/player/SettingsMenu.jsx`, `src/services/frameX.js`, `src/config/streamSources.js`, `src/components/Tour.jsx` (new), `src/components/DeviceModal.jsx` (removed), `src/App.jsx`, `src/components/Navbar.jsx`, `src/components/Hero.jsx`, `src/components/MovieRow.jsx`, `src/Pages/About.jsx`.

## Requirements
- AC-1: In a room, when a member who may control picks a subtitle language, turns subtitles off, shifts timing or changes style, every other desktop member shows the same within about 2 s.
- AC-2: A member who may not control can change subtitles for themselves only, and is told so. A later room change overrides it.
- AC-3: A member who joins late opens with the room's current subtitles.
- AC-4: Desktop Settings shows an Audio tab listing the dubs for this title, and Switch audio reloads at the same second in frameXTV's own player on the Giant server. Back to MovieHub controls returns.
- AC-4b: In a room, when a member who may control picks an audio language, every other member moves to the dub player at the room's second and is told which language to pick. A late joiner gets the same. A member who may not control switches only for themselves.
- AC-5: Server auto rotation tries the servers that work most often first.
- AC-6: A first time visitor sees the tour after the startup screen, can move Back and Next, skip at any step, and never sees it again after skip or finish. A returning visitor never sees it. The About page can replay it.
- AC-7: The tour works on phone, tablet and desktop, with keyboard focus kept in the step card and visible.

## Ratify
This decision was recorded by /develop, not deliberated. Run `/architect room subtitles, dub picker and tour`
to deliberate and ratify it. Until then it stays flagged as an owed decision; it does not block marking the feature `done`.
