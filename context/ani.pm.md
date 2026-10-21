# ani.pm Player API

**API v1 · SDK 1.4.1**

Put the ani.pm player on any site, free, with no signup and no key.
ani.pm hosts the video, subtitles, and bandwidth, and provides a two-way
JavaScript API plus an open catalogue API.

-   No key, no limits, any site
-   One popover ad at most every 5 minutes per viewer
-   Embed URL:
    `https://ani.pm/embed/ani/{anilistId}/{episode}/{sub|dub|vostfr}`
-   REST API: `https://ani.pm/api/partner/v1`
-   SDK: `https://ani.pm/embed/sdk/v1.js`

> This document is organized from the developer documentation supplied
> by the user. For the complete current reference, consult the official
> ani.pm developer documentation.

## Table of contents

1.  [Overview](#overview)
2.  [Quick start](#quick-start)
3.  [Embed URL](#embed-url)
4.  [Switching providers](#switching-providers)
5.  [JavaScript SDK](#javascript-sdk)
6.  [Events and state](#events-and-state)
7.  [postMessage protocol](#postmessage-protocol)
8.  [REST API](#rest-api)
9.  [Apps and keys](#apps-and-keys)
10. [Security](#security)
11. [Fair use and limits](#fair-use-and-limits)
12. [Errors](#errors)
13. [Versioning](#versioning)
14. [Developer terms](#developer-terms)

## 1. Overview

One iframe gives visitors the same player ani.pm uses, including:

-   Sub and dub audio
-   Soft and burned-in subtitles, including dub captions
-   Intro/outro skipping, next episode, and episode browser
-   Scrub previews, caption styling, AirPlay, and Cast
-   Playback controls through the SDK and events sent back to the host
    page

No key or account is required for open embeds. ani.pm serves the
streams, subtitle tracks, and bandwidth. Catalogue endpoints provide
title search, series and episode availability, AniList/MyAnimeList ID
mapping, recently added episodes, schedule, and trending titles.

A click inside the player may open one ad in a new tab, at most once
every five minutes per viewer. The player must remain unmodified and
usable.

## 2. Quick start

### Plain iframe (no key)

``` html
<iframe
  src="https://ani.pm/embed/ani/154587/1/sub"
  title="Frieren: Beyond Journey’s End, episode 1"
  style="width:100%;aspect-ratio:16/9;border:0"
  allow="autoplay; fullscreen; picture-in-picture; encrypted-media; screen-wake-lock"
  allowfullscreen>
</iframe>
```

Use an AniList ID in `/embed/ani/`, or a MyAnimeList ID in
`/embed/mal/`.

### With the JavaScript SDK

``` html
<div id="player"></div>
<script src="https://ani.pm/embed/sdk/v1.js"></script>
<script>
  const player = new AniPM.Player('#player', {
    anime: 154587, // AniList ID, or 'mal-52991'
    episode: 1,
    lang: 'sub' // or 'dub'
  });

  player.on('ready', (state) => {
    console.log('Playing', state.title, 'episode', state.episode);
  });
  player.on('ended', () => console.log('Finished'));
</script>
```

### Markup-only auto-mount

``` html
<div
  data-anipm-player
  data-anime="154587"
  data-episode="1"
  data-lang="dub">
</div>
<script src="https://ani.pm/embed/sdk/v1.js" defer></script>
```

## 3. Embed URL

### URL formats

``` text
https://ani.pm/embed/ani/{anilistId}/{episode}/{sub|dub|vostfr}
https://ani.pm/embed/mal/{malId}/{episode}/{sub|dub|vostfr}
https://ani.pm/embed/v1/{anilistId}/{episode}?key=pk_live_…
```

Always put the embed URL in an iframe. Opening it directly in a tab
redirects the visitor to the title on ani.pm.

### Parameters

  -----------------------------------------------------------------------
  Parameter         Values            Default           Description
  ----------------- ----------------- ----------------- -----------------
  `key`             `pk_live_…`       None              Optional app key
                                                        for analytics,
                                                        defaults, and
                                                        site
                                                        restrictions.

  `lang`            `sub`, `dub`,     `sub`             Audio/subtitle
                    `vostfr`                            version. Missing
                                                        dub falls back to
                                                        sub. `vostfr`
                                                        (also `vf`) means
                                                        Japanese audio
                                                        with French
                                                        subtitles where
                                                        available; there
                                                        is no French dub.

  `hardsub`         `1`, `0`          `0`               Prefer burned-in
                                                        subtitles where
                                                        available.

  `start`           Seconds           `0`               Initial playback
                                                        position; `t` is
                                                        also accepted.

  `autoplay`        `1`, `0`          `1`               Start playback on
                                                        load, subject to
                                                        browser autoplay
                                                        rules.

  `muted`           `1`, `0`          `0`               Start muted.

  `poster`          `1`, `0`          `1`               With
                                                        `autoplay=0`,
                                                        show the title
                                                        poster until Play
                                                        is pressed.

  `autonext`        `1`, `0`          `1`               Play the next
                                                        episode
                                                        automatically.

  `autoskip`        `1`, `0`          `0`               Automatically
                                                        skip intros and
                                                        outros.

  `theater`         `1`, `0`          `0`               Start in theater
                                                        mode.

  `episodes`        `1`, `0`          `1`               Show the episode
                                                        browser.

  `color`           Hex without `#`   ani.pm lavender   Accent color,
                                                        e.g. `ff7aa8`.

  `subtitles`       `off`, language,  Viewer choice     Initial subtitle
                    track label                         selection; if
                                                        unavailable,
                                                        English subtitles
                                                        may be used.

  `adult`           `1`, `0`          `1`               Set `0` to hide
                                                        18+ titles.

  `api`             `1`, `0`          `1`               Set `0` to
                                                        disable the
                                                        postMessage API.
  -----------------------------------------------------------------------

Recommended iframe permissions:

``` html
allow="autoplay; fullscreen; picture-in-picture; encrypted-media; screen-wake-lock"
allowfullscreen
```

Use a 16:9 frame at least 320×180. Do not sandbox the iframe; sandboxing
without the required capabilities prevents playback. Viewer preferences
such as volume, subtitles, caption style, shortcuts, theater, and
ambient glow are remembered per site. Explicit URL options override the
saved preference for that load.

## 4. Switching providers

If an existing site embeds by AniList or MyAnimeList ID, switch the host
and path prefix while keeping the IDs. ani.pm also emits compatible
progress messages used by other anime embeds.

``` html
<iframe
  src="https://ani.pm/embed/ani/154587/1/sub"
  allow="autoplay; fullscreen; picture-in-picture; encrypted-media; screen-wake-lock"
  allowfullscreen>
</iframe>

<script>
  window.addEventListener('message', (event) => {
    if (event.origin !== 'https://ani.pm') return;

    const data = event.data;
    if (data.event === 'time') {
      saveProgress(data.time, data.duration, data.percent);
    }
    if (data.event === 'complete') {
      playNext();
    }
    if (data.type === 'watching-log') {
      logWatchTime(data.currentTime, data.duration);
    }
  });
</script>
```

Compatible messages include:

  -----------------------------------------------------------------------------------------------------------------
  Message                                                                       Frequency / meaning
  ----------------------------------------------------------------------------- -----------------------------------
  `{ channel: 'megacloud', event: 'time', time, duration, percent }`            About once per second while playing

  `{ channel: 'megacloud', event: 'complete', time, duration, percent: 100 }`   Episode completed

  `{ type: 'watching-log', currentTime, duration }`                             About every 10 seconds while
                                                                                playing
  -----------------------------------------------------------------------------------------------------------------

## 5. JavaScript SDK

The dependency-free SDK is approximately 5 KB compressed and is
available at `https://ani.pm/embed/sdk/v1.js`. It defines `window.AniPM`
and also supports CommonJS. Calls return Promises and may reject with an
`AniPMError` whose `code` explains the failure. Calls made before the
embed loads are queued.

### Example: custom controls and progress

``` js
const player = new AniPM.Player('#player', {
  anime: 154587,
  episode: 1
});

document.querySelector('#skip-10').onclick = () => player.seekBy(10);
document.querySelector('#dub').onclick = () => player.setLanguage('dub');
document.querySelector('#next').onclick = () => player.next();
document.querySelector('#full').onclick = () => player.requestFullscreen();

const saved = Number(localStorage.getItem('op-1') || 0);
if (saved > 0) player.seek(saved);

player.on('timeupdate', ({ currentTime }) => {
  localStorage.setItem('op-1', String(Math.floor(currentTime)));
});

try {
  await player.setQuality(1080);
} catch (error) {
  console.warn(error.code, error.message);
}
```

`requestFullscreen()` must be called from a user gesture, such as a
click handler.

### Constructor options

`new AniPM.Player(target, options)` mounts a player in an element or
selector. Options include embed parameters in camelCase (`anime`,
`episode`, `lang`, `hardsub`, `start`, `autoplay`, `muted`, `poster`,
`autoNext`, `autoSkip`, `theater`, `episodes`, `color`, `subtitles`,
`adult`, `key`) and:

-   `title`, `width`, `height`, `aspectRatio`
-   `lazy`, `theaterLayout`, `rememberSettings`
-   `reportPage` (default `true`; reports the page path, not query
    string, to app analytics)
-   `on: { event: handler }`

### Methods

  ----------------------------------------------------------------------------------------------------
  Method                                                           Purpose
  ---------------------------------------------------------------- -----------------------------------
  `ready()`                                                        Resolves when the embed responds;
                                                                   listen for `ready` to know the
                                                                   episode is ready.

  `start()`                                                        Starts playback as if Play was
                                                                   pressed.

  `play()`, `pause()`, `togglePlay()`                              Playback controls.

  `seek(seconds)`, `seekBy(delta)`                                 Seek to a time or relative offset.

  `setVolume(0…1)`, `setMuted(bool)`, `mute()`, `unmute()`         Volume controls.

  `setPlaybackRate(0.25…4)`                                        Set playback speed.

  `setSubtitles(false \| language \| { label } \| { language })`   Disable subtitles or select a
                                                                   track.

  `setQuality(height)`                                             Select an available rendition
                                                                   height.

  `setLanguage('sub' \| 'dub')`, `setHardsub(bool)`                Change audio/subtitle version
                                                                   without losing position.

  `loadEpisode(n, { lang, start })`                                Load another episode of the same
                                                                   title.

  `next()`, `previous()`                                           Move between available episodes.

  `setAutoNext(bool)`, `setAutoSkip(bool)`                         Configure next-episode and
                                                                   intro/outro behavior.

  `setTheater(bool)`, `toggleTheater()`                            Toggle theater presentation.

  `setAmbient(bool)`                                               Toggle ambient glow.

  `setAccent('#rrggbb')`                                           Set the player accent.

  `getState()`, `getEpisodes()`                                    Fetch current state or episode
                                                                   availability.

  `loadTitle(anime, episode, options)`                             Load a different title in the same
                                                                   element.

  `requestFullscreen()`, `exitFullscreen()`                        Control iframe fullscreen.

  `on(event, fn)`, `once()`, `off()`                               Subscribe/unsubscribe to events.
                                                                   `on` returns an unsubscribe
                                                                   function; `'*'` receives all
                                                                   events.

  `destroy()`                                                      Remove the player and its
                                                                   listeners.

  `AniPM.embedUrl(options)`                                        Generate an embed URL.

  `AniPM.mountAll(scope?)`                                         Mount matching
                                                                   `[data-anipm-player]` elements,
                                                                   including dynamically added
                                                                   elements.
  ----------------------------------------------------------------------------------------------------

### Episode and title loading

``` js
player.loadTitle(154587, 1);
player.loadEpisode(5, { start: 90 });

const episodes = await player.getEpisodes();
// Each episode includes number, title, runtimeSeconds, and availability:
// { sub, dub, subHard, dubHard }
```

### Theater layout

``` js
const player = new AniPM.Player('#player', {
  anime: 154587,
  episode: 1,
  theaterLayout: false
});

player.on('theaterchange', ({ theater }) => {
  document.body.classList.toggle('watch--wide', theater);
});
```

Alternatively, style `#player[data-anipm-theater]`. The SDK normally
widens the frame for theater mode; `theaterLayout: false` leaves layout
control to the host page while retaining the attribute and event.

Viewer settings are remembered on the site. The SDK also stores a copy
under `anipm:player-settings:v1`; set `rememberSettings: false` to
disable that copy.

## 6. Events and state

`player.state` contains the last known state. `getState()` requests a
fresh state.

### Common state fields

  -----------------------------------------------------------------------
  Field                               Meaning
  ----------------------------------- -----------------------------------
  `status`                            `idle`, `loading`, `ready`, or
                                      `error`

  `awaitingPress`                     `true` when `autoplay=0` is waiting
                                      for the viewer to press Play

  `anilistId`, `malId`, `title`       Title identifiers and name

  `episode`, `lang`, `hardsub`        Current episode and version

  `currentTime`, `duration`           Playback clock in seconds

  `paused`, `ended`, `buffering`      Playback status

  `volume`, `muted`, `playbackRate`   Audio and speed

  `quality`, `qualities`              Current rendition and available
                                      renditions

  `subtitles`, `subtitleTracks`       Current subtitle choice and
                                      available tracks

  `availability`                      Availability of `sub`, `dub`,
                                      `subHard`, and `dubHard`

  `hasPrevious`, `hasNext`            Whether adjacent episodes exist

  `fullscreen`, `autoNext`,           Presentation and behavior state
  `autoSkip`, `theater`, `ambient`    
  -----------------------------------------------------------------------

### Events

  -----------------------------------------------------------------------
  Event                               Meaning
  ----------------------------------- -----------------------------------
  `loaded`                            Embed document loaded; poster may
                                      be showing

  `ready`                             Episode ready; emitted again after
                                      episode changes

  `play`, `pause`, `playing`,         Playback state changes
  `waiting`                           

  `seeking`, `seeked`                 Seeking begins or completes

  `timeupdate`                        About once per second while
                                      playing; includes `currentTime`,
                                      `duration`, `paused`

  `durationchange`, `ratechange`,     Duration, speed, or volume changed
  `volumechange`                      

  `ended`                             Episode finished

  `episodechange`, `languagechange`   Episode or audio/subtitle version
                                      changed

  `episodes`                          Episode list received

  `qualitychange`, `subtitlechange`   Quality or subtitle changed

  `fullscreenchange`                  Fullscreen state changed

  `autonextchange`, `autoskipchange`  Auto-next or auto-skip toggled

  `theaterchange`, `ambientchange`    Theater or ambient glow changed

  `settings`                          Saved player settings changed

  `autoplayblocked`                   Browser blocked autoplay

  `error`                             Error object with `code` and
                                      `message`
  -----------------------------------------------------------------------

## 7. postMessage protocol

The SDK uses messages exchanged between the host page and the iframe.
Messages have the namespace `anipm.player` and protocol version `1`.

-   Page → embed: `{ ns, v: 1, id?, cmd, args? }`
-   Embed reply success: `{ ns, v: 1, id, ok: true, result }`
-   Embed reply failure:
    `{ ns, v: 1, id, ok: false, error: { code, message } }`
-   Embed event: `{ ns, v: 1, event, data }`

Commands include `hello`, `getState`, `getEpisodes`, `start`, `play`,
`pause`, `togglePlay`, `seek`, `setVolume`, `setMuted`,
`setPlaybackRate`, `setSubtitles`, `setQuality`, `setLanguage`,
`setHardsub`, `loadEpisode`, `next`, `previous`, `setAutoNext`,
`setAutoSkip`, `setTheater`, `toggleTheater`, `setAmbient`, and
`setAccent`. The protocol allows at most 40 commands per second.

### Direct postMessage example

``` js
const frame = document.querySelector('iframe');
const ORIGIN = 'https://ani.pm';
let id = 0;
const pending = new Map();

function send(cmd, args = {}) {
  return new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, { resolve, reject });
    frame.contentWindow.postMessage(
      { ns: 'anipm.player', v: 1, id: n, cmd, args },
      ORIGIN
    );
  });
}

window.addEventListener('message', (event) => {
  if (event.source !== frame.contentWindow || event.origin !== ORIGIN) return;

  const message = event.data;
  if (!message || message.ns !== 'anipm.player' || message.v !== 1) return;

  if (message.id && pending.has(message.id)) {
    const request = pending.get(message.id);
    pending.delete(message.id);
    if (message.ok) request.resolve(message.result);
    else request.reject(Object.assign(
      new Error(message.error.message),
      { code: message.error.code }
    ));
  } else if (message.event) {
    console.log(message.event, message.data);
  }
});

frame.addEventListener('load', () => {
  send('hello').then((result) => console.log('connected', result.state));
});
```

Always validate both `event.origin` and `event.source` when handling
messages.

## 8. REST API

Base URL: `https://ani.pm/api/partner/v1`

The read-only JSON catalogue API requires no key and supports browser
CORS. Responses include `X-AniPM-API-Version`; errors use
`{ "error": { "code", "message" } }`. 18+ titles are included and marked
`adult: true`; use `adult=0` where supported to exclude them.

### Example requests

``` bash
curl "https://ani.pm/api/partner/v1/titles?q=frieren&limit=5"
curl "https://ani.pm/api/partner/v1/series/154587"
curl "https://ani.pm/api/partner/v1/lookup?mal=52991,21"
```

``` js
const response = await fetch('https://ani.pm/api/partner/v1/series/154587');
const { data } = await response.json();
const dubbed = data.episodeList.filter((episode) => episode.available.dub);
```

### Public endpoints

  --------------------------------------------------------------------------------------------------------------------------------------------------
  Endpoint                                                                                                       Description
  -------------------------------------------------------------------------------------------------------------- -----------------------------------
  `GET /titles?q={query}&page={1-20}&limit={1-50}`                                                               Search romaji, English, native, and
                                                                                                                 alternative titles. Query length:
                                                                                                                 2--120 characters. Returns `data`,
                                                                                                                 `page`, `limit`, `total`,
                                                                                                                 `hasMore`.

  `GET /titles/{id}`                                                                                             Fetch a title by AniList ID or
                                                                                                                 `mal-{id}`.

  `GET /series/{id}`                                                                                             Title metadata plus all episodes
                                                                                                                 and exact version
                                                                                                                 availability/embed URLs.

  `GET /titles/{id}/episodes`                                                                                    Episode rows and total.

  `GET /lookup?anilist={ids}&mal={ids}`                                                                          Map up to 50 comma-separated
                                                                                                                 AniList and MAL IDs.

  `GET /recent?page={1-25}&limit={1-100}`                                                                        Most recently added episodes;
                                                                                                                 `/latest` is equivalent.

  `GET /schedule`                                                                                                Weekly releases, sub/dub
                                                                                                                 information, and whether an episode
                                                                                                                 is available on ani.pm.

  `GET /top?range={today\|week\|month\|all}&genre={Genre}&format={TV\|MOVIE\|OVA\|ONA\|SPECIAL}&limit={1-100}`   Most-watched titles and view
                                                                                                                 counts.
  --------------------------------------------------------------------------------------------------------------------------------------------------

### Example title response

``` json
{
  "data": {
    "anilistId": 154587,
    "malId": 52991,
    "title": "Frieren: Beyond Journey’s End",
    "nativeTitle": "葬送のフリーレン",
    "format": "TV",
    "status": "Finished",
    "year": 2023,
    "season": "fall",
    "score": 9.36,
    "rating": "PG-13",
    "durationMinutes": 24,
    "episodes": { "total": 28, "sub": 28, "dub": 28 },
    "genres": ["Adventure", "Drama", "Fantasy"],
    "studios": ["MADHOUSE"],
    "adult": false,
    "synopsis": "The adventure is over but life goes on…",
    "poster": "https://ani.pm/api/anime/cover?anilistId=154587&malId=52991",
    "banner": null,
    "url": "https://ani.pm/ani/154587",
    "embed": "https://ani.pm/embed/ani/154587/1/sub"
  }
}
```

### Series and episode availability

`GET /series/{id}` returns title metadata plus `episodeList`. Each
episode includes its number, title, runtime, air date, thumbnail, an
`available` object (`sub`, `dub`, `subHard`, `dubHard`) and ready-to-use
`embed` links for available versions.

### App-only endpoints

These endpoints require a secret key sent in the `X-API-Key` header:

-   `GET /me`
-   `GET /usage?days={1-90}`
-   `GET /analytics?days={7|30|90}`
-   `GET /analytics/report?from={YYYY-MM-DD}&to={YYYY-MM-DD}&tz={minutes east of UTC}&compare={0|1}&f_{dimension}={value}`
-   `GET /analytics/plays?from=&to=&tz=&f_{dimension}=&limit={1-10000}&format={json|csv}`
-   `GET /analytics/realtime`

Example:

``` bash
curl -H "X-API-Key: sk_live_…" \
  "https://ani.pm/api/partner/v1/analytics?days=30"
```

Analytics can include loads, plays, watch time, completion, retention,
startup and rebuffering, titles, episodes, sites, pages, countries,
devices, browsers, systems, audio, subtitles, resolution, errors, API
latency, and current playback sessions. Reports support date ranges up
to 400 days and filters. Play data can be exported as JSON or CSV,
subject to the documented row limits.

**Never expose a secret key in frontend/browser code.** Browser requests
containing a secret key are refused.

## 9. Apps and keys

Apps are free and optional. Open embeds and the public catalogue API
work without an app or key. Creating an app can add:

-   A full analytics dashboard and server-side analytics endpoints
-   Default audio language, auto-next, auto-skip, accent color, and
    adult-content behavior for keyed embeds
-   Optional site locking using a publishable key (`pk_live_…`)
-   A secret key (`sk_live_…`) for server-side usage and analytics
    endpoints

A site lock applies only when configured with allowed sites. An app with
no sites listed can be used anywhere. Secret keys are shown once and
must remain on the server.

Analytics are collected where ani.pm serves the player and API. The
supplied documentation describes anonymous daily viewer tags, site
hostnames, page paths (without query strings), coarse
device/browser/system classes, and playback events. Plays are retained
for 400 days; an app's analytics are deleted when the app is deleted.

## 10. Security

-   Stream URLs are not exposed to the host page; playback uses
    short-lived, episode-specific sessions inside ani.pm frames.
-   Open embeds may be framed by any site; site-locked apps accept only
    configured sites.
-   The iframe sends the host page only the documented player events.
-   Configure CSP with `frame-src https://ani.pm`; add
    `script-src https://ani.pm` when using the SDK.
-   Do not sandbox the iframe. The player requires scripts, its own
    origin, popups, and presentation capabilities.
-   Validate `event.origin` and `event.source` for postMessage events.
-   Keep secret API keys on the server and rotate them if accidentally
    exposed.

## 11. Fair use and limits

The player opens at most one popover every five minutes per viewer. Do
not:

-   Cover the player or shrink it below 320×180
-   Hide the player or intercept its clicks
-   Place it inside ad-stacking or click-generating pages
-   Rehost, scrape, or re-stream its content

The documentation states that there are no quotas or rate limits for
ordinary playback, catalogue REST requests, or SDK commands. Abuse
protection still applies, and ani.pm may disable apps or sites that
misuse the player. Honour `Cache-Control` headers where practical.

## 12. Errors

REST errors use this shape:

``` json
{
  "error": {
    "code": "title-not-found",
    "message": "No available title has that id."
  }
}
```

  ----------------------------------------------------------------------------
  Error code                   Area                    Meaning
  ---------------------------- ----------------------- -----------------------
  `invalid-key`                REST, embed             The app key does not
                                                       exist; omit it for open
                                                       use.

  `origin-not-allowed`         REST                    Publishable key used on
                                                       a site not listed by
                                                       the app.

  `secret-key-in-browser`      REST                    A secret key was sent
                                                       from a browser; rotate
                                                       it.

  `secret-key-required`        REST                    Endpoint requires a
                                                       secret key.

  `app-suspended`              REST, player            App suspended.

  `title-not-found`,           REST, player            Title or episode is not
  `episode-not-found`                                  available on ani.pm.

  `adult-not-enabled`          Player                  18+ content requested
                                                       while adult content is
                                                       disabled.

  `source-absent`              Player                  Requested
                                                       language/version is
                                                       unavailable; the player
                                                       may fall back to sub.

  `media-unavailable`          Player                  Stream failed to load
                                                       after retry.

  `rate-limited`               Player                  Player temporarily
                                                       busy; try again.

  `sandboxed`                  Player                  Iframe sandbox lacks
                                                       `allow-same-origin` or
                                                       other required
                                                       capabilities.

  `invalid-argument`,          SDK                     Invalid arguments or
  `unknown-command`                                    unknown command.

  `quality-unavailable`,       SDK                     Requested quality is
  `auto-quality-unavailable`                           unavailable.

  `no-next-episode`,           SDK                     No adjacent episode
  `no-previous-episode`                                exists.

  `timeout`, `destroyed`,      SDK                     No response in 15
  `reloaded`                                           seconds, player
                                                       destroyed, or another
                                                       title loaded.
  ----------------------------------------------------------------------------

## 13. Versioning

The embed URL format, `/embed/sdk/v1.js`, message protocol, and
`/api/partner/v1` are stable v1 interfaces. Additive fields, options,
commands, and events may be introduced without breaking existing
integrations. Breaking changes will ship as v2 alongside v1.

The supplied documentation lists these recent changes:

-   **2026-10-02 --- embed 1.6.0 / SDK 1.4.1:** `screen-wake-lock`
    iframe permission helps prevent phones dimming during playback.
-   **2026-10-01:** One popover per five minutes per viewer.
-   **2026-09-28 --- embed 1.5.0:** Autoplay defaults to enabled;
    `autoplay=0` keeps the Play screen.
-   **2026-09-27:** French subtitles via `vostfr` / `vf`, subtitle
    language selection, theater mode, ambient glow, analytics, and
    broader catalogue access.

## 14. Developer terms

Embedding the player means embedding it unmodified. Do not scrape,
rehost, or re-stream its content, present ani.pm content as your own, or
expose a secret key. ani.pm may withdraw the player from sites or apps
that misuse it and may remove titles from embeds at any time. The site
terms also apply to visitors.
