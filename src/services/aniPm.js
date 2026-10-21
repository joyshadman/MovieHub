// ani.pm (spec 0008): the anime catalogue and player behind the /anime section.
// Catalogue: https://ani.pm/api/partner/v1, no key, CORS open (plain curl gets a bot page; browsers
// pass). Player: https://ani.pm/embed/ani/{anilistId}/{episode}/{sub|dub}. Its terms: the player
// stays unmodified, nothing covers it or catches its clicks, and it is never sandboxed. So anime
// plays in ani.pm's own player, and our controls sit outside it. Reference: context/ani.pm.md.

export const ANIPM_ORIGIN = 'https://ani.pm';
const API = `${ANIPM_ORIGIN}/api/partner/v1`;
const CACHE_MS = 5 * 60 * 1000;

const cache = new Map();
const get = (path) => {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.request;
  const request = fetch(`${API}${path}`)
    .then(async (r) => {
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.error?.message || `ani.pm ${r.status}`);
      return body;
    })
    .catch((err) => { cache.delete(path); throw err; });
  cache.set(path, { at: Date.now(), request });
  return request;
};

// Adult titles are left out everywhere (spec 0008).
const safe = (list) => (Array.isArray(list) ? list : []).filter((t) => t && !t.adult);

export const TOP_RANGES = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'all', label: 'All time' },
];

export const aniPm = {
  // Latest episodes added, newest first.
  recent: (page = 1) => get(`/recent?page=${page}&limit=48`).then((d) => ({ items: safe(d.data), hasMore: !!d.hasMore })),
  // Most watched in a range, with view counts.
  top: (range = 'week') => get(`/top?range=${range}&limit=60`).then((d) => safe(d.data)),
  // About ten days of releases, each with airingAt and whether it is on ani.pm yet.
  schedule: () => get('/schedule').then((d) => safe(d.data)),
  search: (q, page = 1) => get(`/titles?q=${encodeURIComponent(q)}&page=${page}&limit=30`).then((d) => ({ items: safe(d.data), hasMore: !!d.hasMore })),
  // A title plus every episode and which versions (sub, dub) exist.
  series: (id) => get(`/series/${encodeURIComponent(id)}`).then((d) => d.data),
  // Which AniList ids ani.pm can play (up to 50 at once).
  lookup: (ids) => (ids.length ? get(`/lookup?anilist=${ids.slice(0, 50).join(',')}`).then((d) => (Array.isArray(d.data) ? d.data : [])) : Promise.resolve([])),
};

// The player. Our accent color, adult titles off, start where this browser stopped. Its own auto
// next is off: the watch page moves to the next episode itself, so its URL and list stay in step.
export const animeEmbedUrl = ({ id, episode, lang = 'sub', start = 0 }) => {
  const q = new URLSearchParams({ autoplay: '1', adult: '0', autonext: '0', color: 'e11d48' });
  if (start > 5) q.set('start', String(Math.floor(start)));
  return `${ANIPM_ORIGIN}/embed/ani/${id}/${episode}/${lang === 'dub' ? 'dub' : 'sub'}?${q}`;
};

// Messages from the player frame we created: its v1 events ({ ns: 'anipm.player', event, data })
// and the compatible progress message ({ channel: 'megacloud', event: 'time' | 'complete' }).
export const readAniPmMessage = (event, frameWindow) => {
  if (!frameWindow || event.source !== frameWindow || event.origin !== ANIPM_ORIGIN) return null;
  const m = event.data;
  if (!m || typeof m !== 'object') return null;
  if (m.ns === 'anipm.player' && m.v === 1 && typeof m.event === 'string') return { event: m.event, data: m.data || {} };
  if (m.channel === 'megacloud' && m.event === 'time') return { event: 'timeupdate', data: { currentTime: Number(m.time), duration: Number(m.duration) } };
  if (m.channel === 'megacloud' && m.event === 'complete') return { event: 'ended', data: {} };
  return null;
};
// The player only sends its v1 events after a hello.
export const helloAniPm = (frameWindow) => frameWindow?.postMessage({ ns: 'anipm.player', v: 1, id: 1, cmd: 'hello' }, ANIPM_ORIGIN);

// Resume points live in this browser only (a per viewer convenience, like frameXTV's).
const progressKey = (id, episode) => `mh:anime:${id}:${episode}`;
const lastKey = (id) => `mh:anime:${id}:last`;
export const loadAnimeProgress = (id, episode) => {
  try { const v = JSON.parse(localStorage.getItem(progressKey(id, episode)) || 'null'); return v && Number.isFinite(v.t) ? v : null; } catch { return null; }
};
export const saveAnimeProgress = (id, episode, lang, t, duration) => {
  try {
    localStorage.setItem(lastKey(id), JSON.stringify({ episode, lang }));
    // Near the end counts as finished: start from the top next time.
    if (duration > 0 && duration - t < 60) localStorage.removeItem(progressKey(id, episode));
    else if (t > 10) localStorage.setItem(progressKey(id, episode), JSON.stringify({ t, duration }));
  } catch { /* storage blocked: resume just starts at 0 */ }
};
export const loadLastEpisode = (id) => {
  try { const v = JSON.parse(localStorage.getItem(lastKey(id)) || 'null'); return v && Number(v.episode) > 0 ? v : null; } catch { return null; }
};
