import { searchAnime, anilistDate } from './anilist';

// Which ani.pm show and episode a TMDB title and episode is (spec 0009).
// Per TMDB season: a manual pick in this browser first, then the deploy time ID map
// (public/anime-map.json, scripts/build-anime-map.mjs), then, for season 1 and movies only, a
// strict AniList search. Anything less than sure is 'unsure', and the viewer picks.
// A match is a list of entries { a, s, o }: AniList id, TMDB season (null = whole show, running
// episode numbers) and episode offset. Entries may also carry `episodes` and `start` (AniList).

export const ANIMATION_GENRE = 16;
const MAP_URL = '/anime-map.json';
const MAP_TIMEOUT_MS = 8000;
const STORE_PREFIX = 'mh:anime-match:';
const REFRESH_MS = 7 * 24 * 60 * 60 * 1000; // map and search matches are looked up again after this

export const isAnimation = ({ genreIds, genres } = {}) =>
  (genreIds || []).map(Number).includes(ANIMATION_GENRE) || (genres || []).some((g) => (g?.name || g) === 'Animation');

// --- The ID map, fetched once, only for Animation titles. A failure is not cached. ---
let mapRequest = null;
let loadedMap = null;
export const loadAnimeMap = () => {
  if (!mapRequest) {
    mapRequest = fetch(MAP_URL, { signal: AbortSignal.timeout(MAP_TIMEOUT_MS) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`anime map ${r.status}`))))
      .then((m) => (m?.byTmdb ? m : Promise.reject(new Error('anime map unreadable'))))
      // `npm run dev` has no prebuild, so the dev server reads the committed fallback instead.
      .catch((err) => (import.meta.env.DEV ? import('../data/anime-map.fallback.json').then((m) => m.default) : Promise.reject(err)))
      .then((m) => { loadedMap = m; return m; })
      .catch((err) => { mapRequest = null; throw err; });
  }
  return mapRequest;
};

// The map if it has loaded already (null before), for links that render before it arrives.
export const loadedAnimeMap = () => loadedMap;

// --- Matches remembered in this browser, per TMDB title and season ---
const seasonKey = (type, season) => (type === 'movie' ? 'movie' : String(season));
const storeKey = (type, tmdbId) => `${STORE_PREFIX}${type}:${tmdbId}`;
const readStore = (type, tmdbId) => {
  try { const v = JSON.parse(localStorage.getItem(storeKey(type, tmdbId)) || 'null'); return v?.seasons ? v : { seasons: {} }; } catch { return { seasons: {} }; }
};
const writeSeason = (type, tmdbId, season, value) => {
  try {
    const all = readStore(type, tmdbId);
    if (value) all.seasons[seasonKey(type, season)] = value;
    else delete all.seasons[seasonKey(type, season)];
    if (Object.keys(all.seasons).length) localStorage.setItem(storeKey(type, tmdbId), JSON.stringify(all));
    else localStorage.removeItem(storeKey(type, tmdbId));
  } catch { /* storage blocked: the match is just looked up again */ }
};
const remembered = (type, tmdbId, season) => readStore(type, tmdbId).seasons[seasonKey(type, season)] || null;

// --- The strict search rule (AC-3) ---
export const normalizeTitle = (t) => String(t || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}\s]/gu, '')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/^the /, '');

const FORMATS = { movie: ['MOVIE'], tv: ['TV', 'TV_SHORT', 'ONA'] };
const startKey = (m) => anilistDate(m.startDate) || '9999-99-99';

// The one confident AniList result for a TMDB title, or null.
export const confidentResult = (results, { type, title, originalTitle, year }) => {
  const names = new Set([title, originalTitle].map(normalizeTitle).filter(Boolean));
  const passing = (results || []).filter((m) => {
    const titles = [m.title?.english, m.title?.romaji, m.title?.native, ...(m.synonyms || [])].map(normalizeTitle);
    return titles.some((t) => t && names.has(t))
      && !!year && !!m.startDate?.year && Math.abs(m.startDate.year - year) <= 1
      && FORMATS[type].includes(m.format);
  });
  if (passing.length <= 1) return passing[0] || null;
  const main = passing.filter((m) => m.format === (type === 'movie' ? 'MOVIE' : 'TV'));
  const pool = (main.length ? main : passing).sort((x, y) => startKey(x).localeCompare(startKey(y)));
  return pool.length > 1 && startKey(pool[0]) === startKey(pool[1]) ? null : pool[0];
};

// AniList results for the TMDB names (the name first, then the original name if it differs).
export const searchForTitle = async ({ title, originalTitle }) => {
  const first = await searchAnime(title);
  if (!originalTitle || normalizeTitle(originalTitle) === normalizeTitle(title)) return first;
  const second = await searchAnime(originalTitle);
  const seen = new Set(first.map((m) => m.id));
  return [...first, ...second.filter((m) => !seen.has(m.id))];
};

const entryFromMedia = (m, type, season) => ({
  a: m.id, s: type === 'movie' ? null : season, episodes: m.episodes ?? null, start: anilistDate(m.startDate),
});

// Map entries for a TMDB title and season: that season's, else whole show ones.
const mapEntries = (m, type, tmdbId, season) => {
  const all = m.byTmdb[`${type}:${tmdbId}`];
  if (!all?.length) return null;
  if (type === 'movie') return all;
  const own = all.filter((x) => x.s === season);
  if (own.length) return own;
  const whole = all.filter((x) => x.s === null);
  return whole.length ? whole : null;
};

// { status: 'ready', entries, via } | { status: 'unsure', candidates } | { status: 'none' }.
// Throws when AniList or the map can not be reached (the option shows "Could not check ani.pm").
export const match = async ({ type, tmdbId, season, title, originalTitle, year, genreIds, genres }) => {
  if (!isAnimation({ genreIds, genres })) return { status: 'none' };
  const s = type === 'movie' ? null : Number(season);
  const saved = remembered(type, tmdbId, s);
  if (saved?.via === 'manual' || (saved && Date.now() - (saved.at || 0) < REFRESH_MS)) {
    return { status: 'ready', entries: saved.entries, via: saved.via };
  }
  const fromMap = mapEntries(await loadAnimeMap(), type, tmdbId, s);
  if (fromMap) {
    writeSeason(type, tmdbId, s, { entries: fromMap, via: 'map', at: Date.now() });
    return { status: 'ready', entries: fromMap, via: 'map' };
  }
  // Later seasons are never searched: no guessing which sequel it is.
  if (type !== 'movie' && s !== 1) return { status: 'unsure', candidates: [] };
  const results = await searchForTitle({ title, originalTitle });
  const hit = confidentResult(results, { type, title, originalTitle, year });
  if (!hit) return { status: 'unsure', candidates: results };
  const entries = [entryFromMedia(hit, type, s)];
  writeSeason(type, tmdbId, s, { entries, via: 'search', at: Date.now() });
  return { status: 'ready', entries, via: 'search' };
};

// The viewer's own pick for this season (AC-4): wins over the map in this browser until Reset.
export const pick = (type, tmdbId, season, media) => {
  const s = type === 'movie' ? null : Number(season);
  writeSeason(type, tmdbId, s, { entries: [{ ...entryFromMedia(media, type, s), o: 0 }], via: 'manual', at: Date.now() });
};
export const reset = (type, tmdbId, season) => writeSeason(type, tmdbId, type === 'movie' ? null : Number(season), null);

// Remembers part totals and start dates looked up for a map match, so they are not asked again.
export const rememberParts = (type, tmdbId, season, entries, via) => {
  const s = type === 'movie' ? null : Number(season);
  const saved = remembered(type, tmdbId, s);
  writeSeason(type, tmdbId, s, { entries, via, at: saved?.via === via ? saved.at : Date.now() });
};

// Parts in playing order, with offsets. Parts with no offsets are ordered by AniList start date
// and their offsets come from the episode totals of the parts before them (AC-5).
export const orderParts = (entries) => {
  const list = entries.map((x) => ({ ...x, o: Number(x.o) || 0 }));
  if (list.length < 2 || list.some((x) => x.o)) return list.sort((x, y) => x.o - y.o);
  list.sort((x, y) => (x.start || '9999').localeCompare(y.start || '9999'));
  let offset = 0;
  return list.map((x) => {
    const part = { ...x, o: offset };
    // An earlier part still airing (no total) leaves later parts unreachable.
    offset = Number.isFinite(offset) && x.episodes > 0 ? offset + x.episodes : Infinity;
    return part;
  });
};
// Split parts with no offsets need AniList start dates and totals before they can be ordered.
export const needsPartInfo = (entries) =>
  entries.length > 1 && !entries.some((x) => Number(x.o)) && entries.some((x) => x.start === undefined || x.episodes === undefined);

// TMDB season and episode → { anilistId, aniEpisode } or { unavailable: reason } (AC-5).
// `seasonCounts` is { [season]: episode count } (movieApi.getSeasonCounts), needed for whole show
// entries. ani.pm's own episode list is checked after this (useAniPmOption).
export const resolveEpisode = (matched, { type, season, episode, seasonCounts }) => {
  const entries = matched?.entries || [];
  if (!entries.length) return { unavailable: 'none' };
  if (type === 'movie') return { anilistId: entries[0].a, aniEpisode: 1 };
  const s = Number(season);
  if (!s) return { unavailable: 'season0' };
  let n = Number(episode);
  const whole = entries.every((x) => x.s === null);
  if (whole) {
    for (let k = 1; k < s; k += 1) {
      if (!Number.isFinite(seasonCounts?.[k])) return { unavailable: 'counts' };
      n += seasonCounts[k];
    }
  }
  const parts = orderParts(whole ? entries : entries.filter((x) => x.s === s));
  const part = [...parts].reverse().find((x) => x.o < n);
  if (!part) return { unavailable: 'outside' };
  const aniEpisode = n - part.o;
  if (part.episodes > 0 && aniEpisode > part.episodes) return { unavailable: 'outside' };
  return { anilistId: part.a, aniEpisode };
};

// AniList id and ani.pm episode → the TMDB page and season (and episode) for /anime cards (AC-11).
// Needs the map loaded (loadAnimeMap). Returns null when the id has no TMDB match.
export const toTmdb = (anilistId, aniEpisode, seasonCounts) => {
  const hit = loadedMap?.byAnilist?.[anilistId];
  if (!hit) return null;
  const [type, tmdbId, s, o = 0] = hit;
  if (type === 'movie') return { type, tmdbId, season: null, episode: null };
  const ep = Number(aniEpisode) > 0 ? Number(aniEpisode) + o : null;
  if (s !== null) {
    const known = seasonCounts?.[s];
    return { type, tmdbId, season: s, episode: ep && (!Number.isFinite(known) || ep <= known) ? ep : null };
  }
  if (!ep || !seasonCounts) return { type, tmdbId, season: null, episode: null };
  // Whole show: split the running number by the seasons TMDB lists.
  const seasons = Object.keys(seasonCounts).map(Number).filter((k) => k > 0).sort((x, y) => x - y);
  let left = ep;
  for (const k of seasons) {
    if (left <= seasonCounts[k]) return { type, tmdbId, season: k, episode: left };
    left -= seasonCounts[k];
  }
  return { type, tmdbId, season: seasons[seasons.length - 1] || null, episode: null };
};
