import { aniPm } from './aniPm';

// AniList's public GraphQL API (no key, CORS open). Used for the highest rated anime (spec 0008)
// and, for ani.pm matching (spec 0009), the title search and split part details.
const ANILIST = 'https://graphql.anilist.co';
const TIMEOUT_MS = 8000;

const query = (q, variables) =>
  fetch(ANILIST, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: q, variables }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`AniList ${r.status}`))));

// Cached for the session; a failure is dropped so the next call tries again.
const cached = (cache, key, run) => {
  if (!cache.has(key)) cache.set(key, run().catch((err) => { cache.delete(key); throw err; }));
  return cache.get(key);
};

const TOP_RATED = `query ($page: Int) {
  Page(page: $page, perPage: 50) {
    pageInfo { hasNextPage }
    media(type: ANIME, sort: SCORE_DESC, isAdult: false, status_not: NOT_YET_RELEASED) {
      id title { romaji english } coverImage { large } averageScore format seasonYear
    }
  }
}`;

// Highest rated anime. ani.pm has no rated list, so the ranking comes from AniList and ani.pm's
// lookup keeps only the titles it can play.
const pages = new Map();
export const topRatedAnime = (page = 1) => cached(pages, page, () => query(TOP_RATED, { page }).then(async (d) => {
  const media = d?.data?.Page?.media || [];
  const playable = new Map((await aniPm.lookup(media.map((m) => m.id)))
    .filter((x) => x.available)
    .map((x) => [x.anilistId, x]));
  return {
    hasMore: !!d?.data?.Page?.pageInfo?.hasNextPage,
    items: media.filter((m) => playable.has(m.id)).map((m) => ({
      anilistId: m.id,
      title: m.title?.english || m.title?.romaji || playable.get(m.id).title,
      poster: m.coverImage?.large || null,
      score: m.averageScore ? m.averageScore / 10 : null,
      year: m.seasonYear || null,
      format: m.format || null,
      episodes: playable.get(m.id).episodes || null,
    })),
  };
}));

const MEDIA_FIELDS = 'id title { english romaji native } synonyms startDate { year month day } format episodes coverImage { large }';
const SEARCH = `query ($q: String) {
  Page(perPage: 10) { media(search: $q, type: ANIME, isAdult: false) { ${MEDIA_FIELDS} } }
}`;
const BY_IDS = `query ($ids: [Int]) {
  Page(perPage: 50) { media(id_in: $ids, type: ANIME) { id startDate { year month day } episodes } }
}`;

// Up to 10 anime for a title string (spec 0009, AC-3 and AC-4).
const searches = new Map();
export const searchAnime = (q) => {
  const key = String(q || '').trim().toLowerCase();
  if (!key) return Promise.resolve([]);
  return cached(searches, key, () => query(SEARCH, { q: key }).then((d) => d?.data?.Page?.media || []));
};

// Start date and episode total for AniList ids, one batched call (split part ordering, AC-5).
const byId = new Map();
export const mediaByIds = async (ids) => {
  const missing = [...new Set(ids)].filter((id) => !byId.has(id));
  if (missing.length) {
    const request = query(BY_IDS, { ids: missing }).then((d) => new Map((d?.data?.Page?.media || []).map((m) => [m.id, m])));
    missing.forEach((id) => byId.set(id, request.then((found) => found.get(id) || null)));
    request.catch(() => missing.forEach((id) => byId.delete(id)));
  }
  return Promise.all(ids.map((id) => byId.get(id)));
};

// YYYY-MM-DD, or null without a full date.
export const anilistDate = (d) => (d?.year ? [d.year, d.month || 1, d.day || 1].map((n, i) => String(n).padStart(i ? 2 : 4, '0')).join('-') : null);
