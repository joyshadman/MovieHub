import { doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { db } from '../components/firebase';

// Watch history and resume points (spec 0004). One doc per user, history/{uid}, holding up to
// MAX_ITEMS compact items, newest first. One item per title; for a show it holds the last watched
// episode and that episode's progress. The visitor tracker reads lastSeason / lastEpisode too.
const MAX_ITEMS = 20;
// Within this many seconds of the end counts as finished: start from the top next time.
const FINISHED_LEFT_SEC = 90;

export const itemType = (item) => item?.type || item?.media_type || (item?.first_air_date ? 'tv' : 'movie');
const sameTitle = (a, id, type) => String(a.id) === String(id) && itemType(a) === type;

// Which server the item was watched on (spec 0009): the MovieHub server, or ani.pm with the exact
// AniList entry, episode and language, so Resume reopens the same thing on any device.
const cleanServer = (s) => {
  if (!s || (s.sourceId !== 'framex' && s.sourceId !== 'anipm')) return undefined;
  const ani = s.sourceId === 'anipm';
  return {
    sourceId: s.sourceId,
    providerId: ani ? null : s.providerId || null,
    anilistId: ani ? Number(s.anilistId) || null : null,
    aniEpisode: ani ? Number(s.aniEpisode) || null : null,
    lang: ani ? (s.lang === 'dub' ? 'dub' : 'sub') : null,
  };
};

const stripTmdb = (url, size) => (typeof url === 'string' && url.includes(`/t/p/${size}`) ? url.split(`/t/p/${size}`)[1] : null);

// Only the fields the history UIs need. The details page hands the player the full TMDB object
// (cast, similar titles, videos...): spreading that into Firestore used to make writes fail on
// nested undefined values and pushed the doc toward its 1 MiB limit.
const compact = (m) => {
  const type = itemType(m);
  const item = {
    id: m.id,
    type,
    title: m.title || m.name || 'Untitled',
    poster_path: m.poster_path || stripTmdb(m.image, 'w500') || stripTmdb(m.poster, 'w500') || null,
    backdrop_path: m.backdrop_path || stripTmdb(m.backdrop, 'original') || stripTmdb(m.backdrop, 'w1280') || null,
    release_date: type === 'movie' ? String(m.release_date || m.year || '') || null : null,
    first_air_date: type === 'tv' ? String(m.first_air_date || m.year || '') || null : null,
    vote_average: Number(m.vote_average || m.rating) || null,
    watchedAt: Number(m.watchedAt) || Date.now(),
    lastSeason: type === 'tv' ? Number(m.lastSeason) || 1 : null,
    lastEpisode: type === 'tv' ? Number(m.lastEpisode) || 1 : null,
    progressSec: Number(m.progressSec) || 0,
    duration: Number(m.duration) || 0,
    progress: Number(m.progress) || 0, // percent, 0 to 100
    server: cleanServer(m.server),
  };
  Object.keys(item).forEach((k) => { if (item[k] === undefined) delete item[k]; });
  return item;
};

const percent = (t, duration) => (duration > 0 ? Math.round(Math.min(100, Math.max(0, (t / duration) * 100))) : 0);

// Records that a title is being watched. `t` and `duration` are optional: without them the
// episode's saved progress is kept (same episode) or reset (another episode). `server` is where it
// plays (spec 0009); left out, the item keeps the one it had.
// A transaction, so the player's frequent writes and a second tab never overwrite each other.
export const recordWatch = async (uid, movie, { season, episode, t, duration, server } = {}) => {
  if (!uid || !movie?.id) return;
  const ref = doc(db, 'history', uid);
  const type = itemType(movie);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const items = snap.exists() ? snap.data().items || [] : [];
    const prev = items.find((i) => sameTitle(i, movie.id, type));
    const s = type === 'tv' ? Number(season) || prev?.lastSeason || 1 : null;
    const e = type === 'tv' ? Number(episode) || prev?.lastEpisode || 1 : null;
    const sameEpisode = prev && (type === 'movie' || (prev.lastSeason === s && prev.lastEpisode === e));
    let progressSec = Number.isFinite(t) ? t : sameEpisode ? Number(prev.progressSec) || 0 : 0;
    const dur = Number(duration) > 0 ? Number(duration) : sameEpisode ? Number(prev.duration) || 0 : 0;
    if (dur > 0 && dur - progressSec < FINISHED_LEFT_SEC) progressSec = 0;
    const item = compact({
      ...(prev || {}),
      ...movie,
      type,
      watchedAt: Date.now(),
      lastSeason: s,
      lastEpisode: e,
      progressSec: Math.floor(progressSec),
      duration: Math.floor(dur),
      progress: percent(progressSec, dur),
      server: server || prev?.server,
    });
    const rest = items.filter((i) => !sameTitle(i, movie.id, type)).map(compact);
    tx.set(ref, { items: [item, ...rest].slice(0, MAX_ITEMS) }, { merge: true });
  });
};

export const subscribeHistory = (uid, cb) =>
  onSnapshot(
    doc(db, 'history', uid),
    (snap) => cb([...(snap.exists() ? snap.data().items || [] : [])].sort((a, b) => (b.watchedAt || 0) - (a.watchedAt || 0))),
    (err) => { console.error('History read error:', err); cb([]); }
  );

export const findHistoryItem = (items, id, type) => items.find((i) => sameTitle(i, id, type)) || null;

// Where to pick up a history item: episode, second, how far in, and time left.
export const resumeFrom = (item) => {
  if (!item) return null;
  const tv = itemType(item) === 'tv';
  const t = Number(item.progressSec) || 0;
  const duration = Number(item.duration) || 0;
  return {
    season: tv ? item.lastSeason || 1 : null,
    episode: tv ? item.lastEpisode || 1 : null,
    t,
    duration,
    percent: duration > 0 ? percent(t, duration) : Number(item.progress) || 0,
    leftSec: duration > 0 ? Math.max(0, duration - t) : 0,
    server: item.server || null,
  };
};

export const formatLeft = (sec) => {
  if (!sec) return '';
  const m = Math.round(sec / 60);
  if (m < 1) return 'less than a minute left';
  if (m < 60) return `${m} min left`;
  return `${Math.floor(m / 60)} h ${m % 60} min left`;
};
