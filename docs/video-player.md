# Video player (frameXTV)

The Watch player (`src/Pages/Watch.jsx`) is a full screen, Netflix style player. Its main source is
**frameXTV**, which we drive with our own controls through its `postMessage` API. Two backup sources
are plain embeds that keep their own controls.

Everything below was read from frameXTV's embed code and checked against the real `<video>` element
in Brave on 2026-10-15. If frameXTV changes its player, rerun those checks before you trust this page.

## Where things live

| File | What it does |
| --- | --- |
| `src/services/frameX.js` | Embed URL builder, message validation, commands, server and subtitle lists, resume points |
| `src/config/streamSources.js` | Source list in fallback order: frameXTV, then VidLink, then VidSrc |
| `src/components/player/useFrameXPlayer.js` | Playback state (playing, buffering, stuck, ended, failed) from frameXTV messages |
| `src/components/player/SettingsMenu.jsx` | Servers, Subtitles and Speed sheet |
| `src/components/player/EpisodesPanel.jsx` | Season picker and episode list |
| `src/Pages/Watch.jsx` | Puts it together: controls, fallback, history, tracker, keyboard, fullscreen |

The page is still opened the same way as before: `<WatchPage movie user onClose />` from Movie
Details, Home and Browse. Routes did not change.

## Embed URLs

- Movie: `https://framextv.cc/embed/{tmdbId}`
- TV and anime (TMDB ids): `https://framextv.cc/embed/{tmdbId}/{season}/{episode}`

framextv.xyz now sends a 301 redirect to framextv.cc (seen 2026-10-20), so we load `.cc` directly
and accept messages from both domains. If messages stop arriving, check where the embed redirects first.

URL parameters we use: `autoplay=1`, `controls=0` (hides frameXTV's own controls), `t` (start
second, for resume), `provider` (a frameXTV server), `title`, `poster`. frameXTV also reads `muted`
and `speed`.

## What frameXTV exposes, and what our UI does with it

Commands we send (`postMessage({ action, ... }, 'https://framextv.xyz')`):

| Command | Our control | Checked on the real video |
| --- | --- | --- |
| `play`, `pause`, `togglePlay` | Play / Pause, click on video, `Space` / `K` | yes |
| `seek {time}` | Seek bar, `Home` | yes |
| `seekBy {seconds}` | ±10 s buttons, `←` `→` `J` `L` | yes |
| `setVolume {volume}` | Volume slider, `↑` `↓` | yes |
| `mute`, `unmute` | Mute button, `M` | yes |
| `setSpeed {speed}` | Speed tab | yes |
| `setSubtitle {index}` | CC on (index 0, the stream's first track) | turns on: yes. Turning off with `-1`: **does not work** |
| `setProvider {provider}` | not used: it restarts at 0 s, so we reload with `provider` and `t` instead | yes |

Events we receive: `frameXTV:ready`, `frameXTV:timeupdate {currentTime, duration}` (about 4 per
second), `frameXTV:ended` (only for some servers), `frameXTV:autoplay_preference` (ignored).

Not exposed, so our UI works around it:

- **Playing, paused, buffering.** Inferred. Playing means time moved in the last 1.5 s. Buffering
  means we asked to play but time is not moving. If time stays frozen for 8 s once a stream exists,
  we show Play again ("stuck"), because a slow server and a stopped video look the same from outside.
- **Ended.** Detected three ways: the `ended` event, time reaching the end, or a rollover (time
  was near the end, then jumps to 0 or the duration changes). frameXTV starts the next episode
  inside its own frame, so on ended we pause it and run our own 8 s "Next episode" countdown. That
  keeps our episode, history and tracker state in sync.
- **Subtitles off.** There is no working off command, so CC off reloads the stream at the current second.
- **Subtitle languages.** The index points into frameXTV's internal track list, which we cannot
  read. Settings, Subtitles, "More languages" reloads with frameXTV's own controls at the current second.
- **Volume and speed.** We keep them ourselves and send them again after every load. Volume is saved in
  `localStorage` (`mh:volume`).

Controls that live **inside the iframe**, not in our UI: everything on the VidLink and VidSrc
backups, and everything after you pick "More languages" (frameXTV's own player). The player says
so on screen and offers "back to our player".

## Security

`readFrameXMessage` only accepts a message when all three hold:

1. `event.origin` is `https://framextv.cc` or `https://framextv.xyz` (or a subdomain of either),
2. `event.source` is the iframe we created (not any other frame), and
3. the data has a known `frameXTV:*` event with numeric fields.

Commands are posted with the exact target origin, never `'*'`. A forged `timeupdate` from another
origin is covered by the end to end check and is ignored.

## Servers, errors and fallback

- frameXTV's server list comes from `https://api.framextv.tech/api/providers` (public, CORS open).
  "Best available" lets frameXTV choose.
- No `ready` within 15 s: frameXTV did not respond. Ready, but no stream within 25 s: no stream
  on that server.
- With auto switch on (the default, a toggle in Settings), we try up to two more frameXTV servers on
  "no stream", then the next backup source. Backups must load within 12 s.
- Switching server or source resumes at the current second.
- A failure screen offers Try again and Choose server.

## Resume

The current second is saved every 5 s in `localStorage` (`mh:progress:...`) per movie or per episode,
and used as `t` next time. It is cleared within 90 s of the end. This is per browser, not synced. The
Firestore history (last season and episode) works as before.

## Testing

There is no test suite in this repo. The checks were run with Playwright and Brave (Brave because
Playwright's bundled Chromium lacks the H.264 codec most streams use), from a real `http://`
origin. frameXTV shows an error page when it is embedded in `about:blank`.
Checked: autoplay, real duration, play / pause, ±10 s, seek, mute, volume, keyboard, speed, server
switch with resume, CC on, fullscreen, auto hide, backup sources, Escape, TV episode picker, next
episode, end of episode countdown and auto advance, frameXTV down leading to the VidLink fallback,
forged message ignored, phone layout, no console errors.

Known limits: streams come from third parties and can be slow or missing for a title. On iPhone,
Safari cannot make the player stage fullscreen, so the button is hidden there.
