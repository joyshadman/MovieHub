/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useState } from 'react';
import { movieApi } from '../../services/movieApi';
import { aniPm } from '../../services/aniPm';
import { anilistDate, mediaByIds } from '../../services/anilist';
import { isAnimation, match, needsPartInfo, pick, rememberParts, reset, resolveEpisode } from '../../services/animeMatch';

// The ani.pm option for one TMDB episode (spec 0009, state transitions):
// none (not Animation: hidden, the map is never loaded) · checking → ready (entry and episode
// known and on ani.pm) · unavailable (season 0, outside the mapped parts, not on ani.pm yet, or no
// dub; shown disabled with the reason) · unsure (no confident match: Find on ani.pm) · error
// (AniList, ani.pm or the map unreachable: Try again).

const NOT_ON = 'Not on ani.pm';
const NOT_YET = 'Not on ani.pm yet';
const NO_DUB = 'No dub on ani.pm';

// Is this episode on ani.pm, in this language?
const checkTarget = async (target, lang, via) => {
  let series;
  try { series = await aniPm.series(target.anilistId); } catch (err) {
    if (err?.status === 404) return { state: 'unavailable', reason: NOT_ON, target, via };
    throw err;
  }
  const ep = (series?.episodeList || []).find((e) => Number(e.number) === target.aniEpisode);
  const availability = { sub: !!ep?.available?.sub, dub: !!ep?.available?.dub };
  if (!availability.sub && !availability.dub) return { state: 'unavailable', reason: NOT_YET, target, availability, via };
  if (lang === 'dub' && !availability.dub) return { state: 'unavailable', reason: NO_DUB, target, availability, via };
  return { state: 'ready', target, availability, via };
};

// The whole check for one TMDB season and episode. Throws when something can not be reached.
export const checkAniPm = async ({ type, tmdbId, basics, season, episode, lang }) => {
  if (!basics || !isAnimation(basics)) return { state: 'none' };
  if (type === 'tv' && !Number(season)) return { state: 'unavailable', reason: NOT_ON };
  const m = await match({ type, tmdbId, season, title: basics.name, originalTitle: basics.originalName, year: basics.year, genreIds: basics.genreIds });
  if (m.status === 'none') return { state: 'none' };
  if (m.status === 'unsure') return { state: 'unsure' };
  let entries = m.entries;
  if (needsPartInfo(entries)) {
    const info = await mediaByIds(entries.map((x) => x.a));
    entries = entries.map((x, i) => ({ ...x, episodes: info[i]?.episodes ?? null, start: anilistDate(info[i]?.startDate) }));
    rememberParts(type, tmdbId, season, entries, m.via);
  }
  const r = resolveEpisode({ entries }, { type, season, episode, seasonCounts: basics.seasonCounts });
  if (r.unavailable) return { state: 'unavailable', reason: NOT_ON, via: m.via };
  return checkTarget(r, lang, m.via);
};

const hasGenres = (movie) => (Array.isArray(movie?.genreIds) && movie.genreIds.length > 0) || (Array.isArray(movie?.genres) && movie.genres.length > 0);

export const useAniPmOption = ({ movie, isTV, season, episode, lang }) => {
  const type = isTV ? 'tv' : 'movie';
  // A title whose genres we already have and that is not Animation never asks for anything more.
  const plainlyNot = hasGenres(movie) && !isAnimation(movie);
  const [basics, setBasics] = useState({ id: null, value: null }); // value: object | 'error'
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState({ key: null });

  useEffect(() => {
    if (plainlyNot || (basics.id === movie.id && basics.value && basics.value !== 'error')) return undefined;
    let cancelled = false;
    movieApi.getTitleBasics(type, movie.id)
      .then((b) => { if (!cancelled) setBasics({ id: movie.id, value: b }); })
      .catch(() => { if (!cancelled) setBasics({ id: movie.id, value: 'error' }); });
    return () => { cancelled = true; };
  }, [movie.id, type, plainlyNot, nonce]);

  const b = basics.id === movie.id ? basics.value : null;
  const key = `${movie.id}|${season}|${episode}|${lang}|${nonce}|${b ? 'b' : ''}`;
  useEffect(() => {
    if (plainlyNot || !b || b === 'error') return undefined;
    let cancelled = false;
    checkAniPm({ type, tmdbId: movie.id, basics: b, season, episode, lang })
      .then((r) => { if (!cancelled) setResult({ key, ...r }); })
      .catch(() => { if (!cancelled) setResult({ key, state: 'error' }); });
    return () => { cancelled = true; };
  }, [key]);

  let current;
  if (plainlyNot || (b && b !== 'error' && !isAnimation(b))) current = { state: 'none' };
  else if (b === 'error') current = { state: 'error' };
  else if (result.key === key) current = result;
  else current = { state: 'checking' };

  const retry = useCallback(() => setNonce((n) => n + 1), []);
  const pickMedia = useCallback((media) => { pick(type, movie.id, season, media); setNonce((n) => n + 1); }, [type, movie.id, season]);
  const resetPick = useCallback(() => { reset(type, movie.id, season); setNonce((n) => n + 1); }, [type, movie.id, season]);
  // The check for another episode (an episode change on ani.pm in a room needs it before publishing).
  const resolveFor = useCallback((s, e) => (b && b !== 'error'
    ? checkAniPm({ type, tmdbId: movie.id, basics: b, season: s, episode: e, lang }).catch(() => ({ state: 'error' }))
    : Promise.resolve({ state: 'error' })), [b, type, movie.id, lang]);

  return { ...current, basics: b && b !== 'error' ? b : null, retry, pickMedia, resetPick, resolveFor };
};
