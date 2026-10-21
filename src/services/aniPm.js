// ani.pm (spec 0008): the anime catalogue and player behind the /anime section, and since spec 0009
// the anime only backup server in the Watch player.
// Catalogue: https://ani.pm/api/partner/v1, no key, CORS open (plain curl gets a bot page; browsers
// pass). Player: https://ani.pm/embed/ani/{anilistId}/{episode}/{sub|dub}. Its terms: the player
// stays unmodified, nothing covers it or catches its clicks, and it is never sandboxed. So anime
// plays in ani.pm's own player, and our controls sit outside it. Reference: context/ani.pm.md.

export const ANIPM_ORIGIN = 'https://ani.pm';
const API = `${ANIPM_ORIGIN}/api/partner/v1`;
const CACHE_MS = 5 * 60 * 1000;
const SERIES_CACHE_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 8000;

const cache = new Map();
const get = (path, ttl = CACHE_MS) => {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < ttl) return hit.request;
  const request = fetch(`${API}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    .then(async (r) => {
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error(body?.error?.message || `ani.pm ${r.status}`), { status: r.status });
      return body;
    })
    .catch((err) => { cache.delete(path); throw err; });
  cache.set(path, { at: Date.now(), request });
  return request;
};

// Adult titles are left out everywhere (spec 0008).
const safe = (list) => (Array.isArray(list) ? list : []).filter((t) => t && !t.adult);

// ani.pm versions the viewer can pick (spec 0009, AC-8).
export const ANI_LANGS = [{ id: 'sub', label: 'Sub' }, { id: 'dub', label: 'Dub' }];

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
  series: (id) => get(`/series/${encodeURIComponent(id)}`, SERIES_CACHE_MS).then((d) => d.data),
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
// The v1 command channel to one player frame (spec 0009): send(cmd, args) resolves with the
// frame's reply (or rejects with its error, or after REPLY_MS), and on(fn) gets every event as
// { event, data }. ani.pm allows at most 40 commands a second, so they go out at least 25 ms apart.
const REPLY_MS = 8000;
const COMMAND_GAP_MS = 25;
export const aniPmPlayer = (getFrameWindow) => {
  let nextId = 100;
  let lastSentAt = 0;
  const pending = new Map();
  const listeners = new Set();
  const onMessage = (e) => {
    const frameWindow = getFrameWindow();
    if (!frameWindow || e.source !== frameWindow || e.origin !== ANIPM_ORIGIN) return;
    const m = e.data;
    if (m?.ns === 'anipm.player' && m.v === 1 && m.id && pending.has(m.id)) {
      const { resolve, reject, timer } = pending.get(m.id);
      clearTimeout(timer);
      pending.delete(m.id);
      if (m.ok) resolve(m.result);
      else reject(Object.assign(new Error(m.error?.message || 'ani.pm error'), { code: m.error?.code }));
      return;
    }
    const msg = readAniPmMessage(e, frameWindow);
    if (msg) listeners.forEach((fn) => fn(msg));
  };
  window.addEventListener('message', onMessage);
  return {
    send: (cmd, args = {}) => new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`ani.pm ${cmd} timed out`)); }, REPLY_MS);
      pending.set(id, { resolve, reject, timer });
      const wait = Math.max(0, lastSentAt + COMMAND_GAP_MS - Date.now());
      lastSentAt = Date.now() + wait;
      setTimeout(() => getFrameWindow()?.postMessage({ ns: 'anipm.player', v: 1, id, cmd, args }, ANIPM_ORIGIN), wait);
    }),
    on: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    destroy: () => {
      window.removeEventListener('message', onMessage);
      pending.forEach(({ timer, reject }) => { clearTimeout(timer); reject(new Error('ani.pm player closed')); });
      pending.clear();
      listeners.clear();
    },
  };
};
