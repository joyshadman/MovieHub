// frameXTV embed integration (docs/specs and AGENTS.md "Video player" describe the contract).
//
// What frameXTV really exposes (read from its embed bundle and checked live, 2026-10-15):
//   URL params   autoplay (on unless 0), muted=1, t / start (seconds), speed, provider / server,
//                controls=0 (hides its own controls), title, poster.
//   Commands IN  postMessage({ action, ... }): play, pause, togglePlay, seek {time}, seekBy {seconds},
//                setVolume {volume 0..1}, mute, unmute, setProvider {provider}, setSubtitle {index},
//                setSpeed {speed}.
//   Events OUT   { event: 'frameXTV:ready' }, { event: 'frameXTV:timeupdate', currentTime, duration },
//                { event: 'frameXTV:ended' }, { event: 'frameXTV:autoplay_preference', enabled }.
//   NOT exposed  play/pause state, buffering, volume, errors, the active provider. The UI infers
//                playing / buffering from timeupdate and keeps volume and speed as its own state.
// Server list and subtitle list come from its public JSON API (CORS open).

// framextv.xyz now answers with a 301 to framextv.cc (seen 2026-10-20), so the frame's real origin
// is .cc. Load .cc directly; messages from either domain are accepted below.
export const FRAMEX_ORIGIN = 'https://framextv.cc';
const FRAMEX_HOSTS = ['framextv.cc', 'framextv.xyz'];
const FRAMEX_API = 'https://api.framextv.tech/api';

export const frameXEmbedUrl = ({ id, isTV, season, episode, start = 0, provider, customControls = true, title, poster }) => {
  const path = isTV ? `/embed/${id}/${season}/${episode}` : `/embed/${id}`;
  const params = new URLSearchParams({ autoplay: '1' });
  if (customControls) params.set('controls', '0');
  if (start > 0) params.set('t', String(Math.floor(start)));
  if (provider) params.set('provider', provider);
  if (title) params.set('title', title);
  if (poster) params.set('poster', poster);
  return `${FRAMEX_ORIGIN}${path}?${params}`;
};

// Trust a message only when it comes FROM THE IFRAME WE CREATED (event.source, the real guarantee:
// no other window can be that object), from a frameXTV address (www. or other subdomains
// included, in case it redirects), and with a known shape.
const isFrameXOrigin = (origin) => {
  try {
    const { protocol, hostname } = new URL(origin);
    return protocol === 'https:' && FRAMEX_HOSTS.some((h) => hostname === h || hostname.endsWith(`.${h}`));
  } catch { return false; }
};
export const readFrameXMessage = (event, frameWindow) => {
  if (!frameWindow || event.source !== frameWindow) return null;
  if (!isFrameXOrigin(event.origin)) return null;
  let data = event.data;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { return null; }
  }
  if (!data || typeof data !== 'object' || typeof data.event !== 'string' || !data.event.startsWith('frameXTV:')) return null;
  const type = data.event.slice('frameXTV:'.length);
  if (type === 'timeupdate') {
    const currentTime = Number(data.currentTime);
    const duration = Number(data.duration);
    if (!Number.isFinite(currentTime)) return null;
    return { type, currentTime, duration: Number.isFinite(duration) ? duration : 0 };
  }
  if (type === 'autoplay_preference') return { type, enabled: !!data.enabled };
  if (type === 'ready' || type === 'ended') return { type };
  return null;
};

// Target '*' as in frameXTV's docs: commands carry no secrets, and a fixed target origin would
// silently drop them if frameXTV answers from another address (www., a mirror).
export const sendFrameX = (frameWindow, action, payload = {}) => {
  frameWindow?.postMessage({ action, ...payload }, '*');
};

// Server order (spec 0007, 2d), set by the engineer: these first, in this order, then every other
// server in frameXTV's order, then Giant (the dub server) last. Settings lists them this way and
// the automatic rotation tries them this way ("Best available" after all of them).
export const FIRST_PROVIDER = 'miner';
const LEAD_PROVIDERS = [FIRST_PROVIDER, 'headhunter', 'titan', 'hog_rider', 'valkyrie'];
const LAST_PROVIDERS = ['giant'];
const providerRank = (id) => {
  const lead = LEAD_PROVIDERS.indexOf(id);
  if (lead >= 0) return lead;
  const last = LAST_PROVIDERS.indexOf(id);
  return last >= 0 ? 1000 + last : 500;
};

let providersRequest = null;
export const fetchFrameXProviders = () => {
  if (!providersRequest) {
    providersRequest = fetch(`${FRAMEX_API}/providers`)
      .then((r) => (r.ok ? r.json() : { providers: [] }))
      .then((d) => (d.providers || [])
        .filter((p) => p?.id && p.category !== 'anime' && p.status !== 'unavailable')
        .map((p) => ({ id: p.id, name: p.name || p.id, tagline: p.tagline || '' }))
        // Array sort is stable, so servers of equal rank keep frameXTV's order.
        .sort((a, b) => providerRank(a.id) - providerRank(b.id)))
      .catch(() => { providersRequest = null; return []; });
  }
  return providersRequest;
};

// Servers with nothing for this title (spec 0007, 2d). Asked in the background while the player
// opens on the first server, so the rotation can skip them instead of waiting 12 to 15 s on each.
// Only servers frameXTV resolves on its API can be asked; Miner and Super Barbarian are fetched
// inside the frame itself. A server that fails or is slow counts as unknown, never as empty.
const API_CHECKED = ['headhunter', 'titan', 'hog_rider', 'valkyrie', 'lavahound', 'bowler', 'giant'];
const CHECK_TIMEOUT_MS = 20000;
const streamQuery = ({ id, isTV, season, episode }, provider) => {
  const q = new URLSearchParams({ type: isTV ? 'tv' : 'movie', id: String(id), provider });
  if (isTV) { q.set('season', String(season)); q.set('episode', String(episode)); }
  return q.toString();
};
// The stream API usually answers { sources: [...] }, sometimes wrapped in detail, and not always a list.
const sourcesOf = (d) => { const list = (d?.detail || d)?.sources; return Array.isArray(list) ? list : []; };
const emptyChecks = new Map();
export const findEmptyProviders = (ref) => {
  const key = streamQuery(ref, '');
  if (!emptyChecks.has(key)) {
    const timeout = () => (typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(CHECK_TIMEOUT_MS) : undefined);
    emptyChecks.set(key, Promise.all(API_CHECKED.map((p) => fetch(`${FRAMEX_API}/stream?${streamQuery(ref, p)}`, { signal: timeout() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d && sourcesOf(d).length === 0 ? p : null))
      .catch(() => null)))
      .then((list) => list.filter(Boolean)));
    // Good for a few minutes: servers come and go.
    setTimeout(() => emptyChecks.delete(key), 5 * 60 * 1000);
  }
  return emptyChecks.get(key);
};

// Audio dubs (spec 0007). The Giant server carries every audio track of its streams (English and
// Hindi on every title checked). Only frameXTV's OWN player can switch them: its postMessage API
// and embed URL have no audio command, so the Watch page reloads in that player to pick one.
export const DUB_PROVIDER = 'giant';
const audioRequests = new Map();
export const fetchFrameXAudio = ({ id, isTV, season, episode }) => {
  const q = new URLSearchParams({ type: isTV ? 'tv' : 'movie', id: String(id), provider: DUB_PROVIDER });
  if (isTV) { q.set('season', String(season)); q.set('episode', String(episode)); }
  const key = q.toString();
  if (!audioRequests.has(key)) {
    const request = fetch(`${FRAMEX_API}/stream?${key}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => {
        const seen = new Set();
        return sourcesOf(d)
          .flatMap((s) => s?.audioTracks || [])
          .map((a) => ({ lang: a?.language || a?.label || '', label: a?.label || a?.language || '' }))
          .filter((a) => a.lang && !seen.has(a.lang.toLowerCase()) && seen.add(a.lang.toLowerCase()));
      })
      .catch((err) => { audioRequests.delete(key); throw err; });
    audioRequests.set(key, request);
  }
  return audioRequests.get(key);
};

export const fetchFrameXSubtitles = ({ id, isTV, season, episode }) => {
  const q = new URLSearchParams({ type: isTV ? 'tv' : 'movie', id: String(id) });
  if (isTV) { q.set('season', String(season)); q.set('episode', String(episode)); }
  return fetch(`${FRAMEX_API}/subtitles?${q}`)
    .then((r) => (r.ok ? r.json() : { subtitles: [] }))
    // index = position in frameXTV's own list (its setSubtitle command takes that number), so map
    // before filtering.
    .then((d) => (d.subtitles || []).map((s, index) => ({
      index,
      url: s?.url,
      label: s?.label?.replace(/^Subtitles\s*•\s*/, '') || s?.lang || `Track ${index + 1}`,
      lang: s?.lang || s?.language || null,
      isDefault: !!s?.isDefault,
    })).filter((s) => s.url))
    .catch(() => []);
};

// Resume points live in this browser only (a per viewer convenience, not synced).
const progressKey = ({ id, isTV, season, episode }) => `mh:progress:${isTV ? `tv:${id}:${season}:${episode}` : `movie:${id}`}`;
export const loadProgress = (ref) => {
  try {
    const v = JSON.parse(localStorage.getItem(progressKey(ref)) || 'null');
    return v && Number.isFinite(v.t) ? v : null;
  } catch { return null; }
};
export const saveProgress = (ref, t, duration) => {
  try {
    // Near the end counts as finished: start from the top next time.
    if (duration > 0 && duration - t < 90) localStorage.removeItem(progressKey(ref));
    else if (t > 15) localStorage.setItem(progressKey(ref), JSON.stringify({ t, duration, at: Date.now() }));
  } catch { /* storage blocked: resume just starts at 0 */ }
};
