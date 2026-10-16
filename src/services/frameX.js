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

export const FRAMEX_ORIGIN = 'https://framextv.xyz';
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
// no other window can be that object), from a framextv.xyz address (www. or other subdomains
// included, in case it redirects), and with a known shape.
const isFrameXOrigin = (origin) => {
  try {
    const { protocol, hostname } = new URL(origin);
    return protocol === 'https:' && (hostname === 'framextv.xyz' || hostname.endsWith('.framextv.xyz'));
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

let providersRequest = null;
export const fetchFrameXProviders = () => {
  if (!providersRequest) {
    providersRequest = fetch(`${FRAMEX_API}/providers`)
      .then((r) => (r.ok ? r.json() : { providers: [] }))
      .then((d) => (d.providers || [])
        .filter((p) => p?.id && p.category !== 'anime' && p.status !== 'unavailable')
        .map((p) => ({ id: p.id, name: p.name || p.id, tagline: p.tagline || '' })))
      .catch(() => { providersRequest = null; return []; });
  }
  return providersRequest;
};

export const fetchFrameXSubtitles = ({ id, isTV, season, episode }) => {
  const q = new URLSearchParams({ type: isTV ? 'tv' : 'movie', id: String(id) });
  if (isTV) { q.set('season', String(season)); q.set('episode', String(episode)); }
  return fetch(`${FRAMEX_API}/subtitles?${q}`)
    .then((r) => (r.ok ? r.json() : { subtitles: [] }))
    .then((d) => (d.subtitles || []).filter((s) => s?.url).map((s, index) => ({
      index,
      url: s.url,
      label: s.label?.replace(/^Subtitles\s*•\s*/, '') || s.lang || `Track ${index + 1}`,
      lang: s.lang || s.language || null,
      isDefault: !!s.isDefault,
    })))
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
