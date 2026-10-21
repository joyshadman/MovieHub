import { aniPm } from './aniPm';

// Highest rated anime (spec 0008). ani.pm has no rated list, so the ranking comes from AniList's
// public GraphQL API (no key, CORS open) and ani.pm's lookup keeps only the titles it can play.
const ANILIST = 'https://graphql.anilist.co';
const TOP_RATED = `query ($page: Int) {
  Page(page: $page, perPage: 50) {
    pageInfo { hasNextPage }
    media(type: ANIME, sort: SCORE_DESC, isAdult: false, status_not: NOT_YET_RELEASED) {
      id title { romaji english } coverImage { large } averageScore format seasonYear
    }
  }
}`;

const pages = new Map();
export const topRatedAnime = (page = 1) => {
  if (!pages.has(page)) {
    const request = fetch(ANILIST, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: TOP_RATED, variables: { page } }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`AniList ${r.status}`))))
      .then(async (d) => {
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
      })
      .catch((err) => { pages.delete(page); throw err; });
    pages.set(page, request);
  }
  return pages.get(page);
};
