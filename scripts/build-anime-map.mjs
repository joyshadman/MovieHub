// Builds the TMDB to AniList ID map for ani.pm (spec 0009, AC-12).
//
//   node scripts/build-anime-map.mjs             writes public/anime-map.json (npm prebuild)
//   node scripts/build-anime-map.mjs --fallback  also rewrites src/data/anime-map.fallback.json
//                                                (npm run anime-map, run by hand now and then)
//
// Source: Fribb's public anime-lists (anime-list-full.json). Each entry that has an AniList id and
// a TMDB id becomes { a, s, o }: AniList id, TMDB season (null = the whole show, running episode
// numbers) and episode offset (left out when 0). Season 0 never maps, so it is left out.
// src/data/animeOverrides.json replaces whole keys (an empty array removes a title).
// A download that does not parse, or holds 5,000 or fewer entries with AniList ids, is not used:
// the committed fallback is copied instead, with a warning, and the build still succeeds.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// ANIME_MAP_SOURCE swaps the download URL (to test the fallback path).
const SOURCE = process.env.ANIME_MAP_SOURCE || 'https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-full.json';
const OUT = resolve(ROOT, 'public/anime-map.json');
const FALLBACK = resolve(ROOT, 'src/data/anime-map.fallback.json');
const OVERRIDES = resolve(ROOT, 'src/data/animeOverrides.json');
const MIN_ENTRIES = 5000;
const TIMEOUT_MS = 60000;
const writeFallback = process.argv.includes('--fallback');

const warn = (msg) => console.warn(`\x1b[33m[anime-map] ${msg}\x1b[0m`);
const log = (msg) => console.log(`[anime-map] ${msg}`);

const readJson = async (path, fallback) => {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return fallback; }
};
const write = async (path, data) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data));
};

const download = async () => {
  const res = await fetch(SOURCE, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const list = JSON.parse(await res.text());
  if (!Array.isArray(list)) throw new Error('not a list');
  const withAnilist = list.filter((e) => Number.isInteger(e?.anilist_id)).length;
  if (withAnilist <= MIN_ENTRIES) throw new Error(`only ${withAnilist} entries with AniList ids`);
  return list;
};

const int = (v) => (Number.isInteger(v) ? v : null);

// The downloaded list as byTmdb.
const fromList = (list) => {
  const byTmdb = {};
  const add = (key, entry) => { (byTmdb[key] ||= []).push(entry); };
  for (const e of list) {
    const a = int(e?.anilist_id);
    const ids = e?.themoviedb_id;
    if (!a || !ids || typeof ids !== 'object') continue;
    const tv = int(ids.tv);
    if (tv) {
      const s = int(e.season?.tmdb);
      if (s !== 0) {
        const o = int(e.episode_offset?.tmdb) || 0;
        add(`tv:${tv}`, { a, s, ...(o ? { o } : {}), movie: false });
      }
    }
    for (const m of [].concat(ids.movie || [])) {
      // A film lists its AniList MOVIE entry first, so it wins over a TV or OVA one with the same id.
      if (int(m)) add(`movie:${m}`, { a, s: null, movie: e.type === 'MOVIE' });
    }
  }
  for (const [key, entries] of Object.entries(byTmdb)) {
    if (key.startsWith('movie:')) entries.sort((x, y) => Number(y.movie) - Number(x.movie));
    byTmdb[key] = (key.startsWith('movie:') ? entries.slice(0, 1) : entries).map(({ a, s, o }) => ({ a, s, ...(o ? { o } : {}) }));
  }
  return byTmdb;
};

// Overrides on top (whole keys), then the reverse lookup.
const finish = (base, overrides) => {
  const byTmdb = { ...base };
  for (const [key, entries] of Object.entries(overrides || {})) {
    if (!/^(tv|movie):\d+$/.test(key) || !Array.isArray(entries)) { warn(`override ${key} ignored (bad key or not a list)`); continue; }
    if (!entries.length) { delete byTmdb[key]; continue; }
    byTmdb[key] = entries
      .filter((x) => int(x?.a) && x.s !== 0)
      .map((x) => ({ a: x.a, s: int(x.s), ...(int(x.o) ? { o: x.o } : {}) }));
  }
  // Reverse lookup for /anime cards: the first entry with a numbered season wins.
  const byAnilist = {};
  for (const [key, entries] of Object.entries(byTmdb)) {
    const [type, id] = key.split(':');
    for (const x of entries) {
      const prev = byAnilist[x.a];
      if (prev && (prev[2] !== null || x.s === null)) continue;
      byAnilist[x.a] = [type, Number(id), x.s, x.o || 0];
    }
  }
  return { v: 1, builtAt: new Date().toISOString(), byTmdb, byAnilist };
};

const main = async () => {
  const overrides = await readJson(OVERRIDES, {});
  let list;
  try {
    list = await download();
  } catch (err) {
    warn(`download not usable (${err.message}); using the committed fallback`);
    const fallback = await readJson(FALLBACK, null);
    if (!fallback?.byTmdb) {
      warn('no fallback either; writing an empty map (ani.pm matching falls back to search)');
      await write(OUT, { v: 1, builtAt: null, byTmdb: {}, byAnilist: {} });
      return;
    }
    // The overrides still apply on top of the fallback.
    await write(OUT, finish(fallback.byTmdb, overrides));
    if (writeFallback) process.exitCode = 1; // a manual refresh should say it did not refresh
    return;
  }
  const base = fromList(list);
  const map = finish(base, overrides);
  await write(OUT, map);
  log(`${Object.keys(map.byTmdb).length} TMDB titles mapped → public/anime-map.json`);
  if (writeFallback) {
    // The fallback holds the list without overrides, so removing an override takes effect.
    await write(FALLBACK, finish(base, {}));
    log('fallback refreshed → src/data/anime-map.fallback.json');
  }
};

main().catch((err) => {
  // Never break the build over the map.
  warn(`unexpected error: ${err.message}`);
});
