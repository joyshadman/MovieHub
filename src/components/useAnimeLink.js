import { useEffect, useState } from 'react';
import { loadAnimeMap, loadedAnimeMap, toTmdb } from '../services/animeMatch';
import { movieApi } from '../services/movieApi';

// Where an /anime card leads (spec 0009, AC-11): the TMDB details page when the ID map knows the
// AniList id (with its TMDB season, and for an episode card that episode), else `fallback`. TMDB season counts are fetched only for whole show
// entries, where the running episode number has to be split into seasons; the details page drops
// an episode TMDB does not list yet.
export const useAnimeLink = (anilistId, aniEpisode, fallback) => {
  const [map, setMap] = useState(loadedAnimeMap);
  useEffect(() => {
    if (map) return undefined;
    let cancelled = false;
    loadAnimeMap().then((m) => { if (!cancelled) setMap(m); }, () => { /* no map: cards keep their ani.pm pages */ });
    return () => { cancelled = true; };
  }, [map]);
  const hit = map?.byAnilist?.[anilistId] || null;
  const wholeShowId = hit && hit[0] === 'tv' && hit[2] === null && Number(aniEpisode) > 0 ? hit[1] : null;
  const [counts, setCounts] = useState({ id: null, value: null });
  useEffect(() => {
    if (!wholeShowId) return undefined;
    let cancelled = false;
    movieApi.getSeasonCounts(wholeShowId).then((value) => { if (!cancelled) setCounts({ id: wholeShowId, value }); }, () => {});
    return () => { cancelled = true; };
  }, [wholeShowId]);
  if (!hit) return fallback;
  const target = toTmdb(anilistId, aniEpisode, counts.id === wholeShowId ? counts.value || undefined : undefined);
  if (!target) return fallback;
  if (target.type === 'movie') return `/movie/${target.tmdbId}`;
  const q = new URLSearchParams();
  if (target.season) q.set('season', String(target.season));
  if (target.season && target.episode) q.set('episode', String(target.episode));
  return `/tv/${target.tmdbId}${q.size ? `?${q}` : ''}`;
};
