import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { CalendarDays, ChevronRight, Clock, Flame, Search, Sparkles, Star, Tv } from 'lucide-react';
import { aniPm, TOP_RANGES } from '../services/aniPm';
import { topRatedAnime } from '../services/anilist';
import { loadAnimeMap } from '../services/animeMatch';
import AnimeCard from '../components/AnimeCard';
import { useAnimeLink } from '../components/useAnimeLink';
import Chip from '../components/ui/Chip';
import Button from '../components/ui/Button';
import { TextField } from '../components/ui/fields';
import { EmptyState, ErrorState, SkeletonGrid } from '../components/ui/feedback';

// Anime section (spec 0008): Latest episodes, Top rated (AniList ranking, playable on ani.pm), Most
// watched, the weekly Schedule, and search, listed from ani.pm. Since spec 0010 it shows only titles
// the ID map matches to TMDB, and each one opens our details page, player and Continue Watching.
// The tab, range and search live in the URL so Back and shared links keep them.
const TABS = [
  { id: 'latest', label: 'Latest', icon: Clock },
  { id: 'top', label: 'Top rated', icon: Star },
  { id: 'popular', label: 'Most watched', icon: Flame },
  { id: 'schedule', label: 'Schedule', icon: CalendarDays },
];
const COLORS = ['#6D28D9', '#BE185D'];
const GRID = 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-5';

const ago = (iso) => {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`;
};

// Only titles with a TMDB match (spec 0010). A page left empty by the filter pulls the next ones
// (up to EXTRA_PAGES) so a list never looks blank while more exists. No map, no list: an error.
const EXTRA_PAGES = 3;
const matchedOnly = async (load, page) => {
  const map = await loadAnimeMap();
  let p = page;
  for (;;) {
    const { items, hasMore } = await load(p);
    const kept = items.filter((x) => map.byAnilist?.[x.anilistId]);
    if (kept.length || !hasMore || p - page >= EXTRA_PAGES) return { items: kept, hasMore, page: p };
    p += 1;
  }
};

// One paged list. Page 1 loads whenever `key` changes; "Load more" appends the next page.
const usePaged = (key, load) => {
  const [state, setState] = useState({ key: null, items: [], page: 0, hasMore: false, error: false, busy: false });
  const req = useRef(0);
  const run = useCallback((page) => {
    const id = ++req.current;
    return matchedOnly(load, page).then(
      ({ items, hasMore, page: last }) => {
        if (id !== req.current) return;
        setState((s) => {
          const all = page === 1 ? items : [...s.items, ...items];
          const seen = new Set();
          return { key, page: last, hasMore, error: false, busy: false, items: all.filter((x) => { const k = `${x.anilistId}|${x.episode ?? ''}`; return !seen.has(k) && seen.add(k); }) };
        });
      },
      () => { if (id === req.current) setState((s) => ({ ...s, key, error: true, busy: false })); },
    );
  }, [key, load]);
  useEffect(() => { run(1); }, [run]);
  const fresh = state.key === key;
  return {
    items: fresh ? state.items : [],
    loading: !fresh || state.busy,
    error: fresh && state.error,
    hasMore: fresh && state.hasMore,
    more: () => { setState((s) => ({ ...s, busy: true, error: false })); run(state.page + 1); },
    retry: () => { setState((s) => ({ ...s, key: null, error: false })); run(1); },
  };
};

const Grid = ({ list, render, emptyTitle = 'Nothing here yet', emptyMessage }) => {
  if (list.error && list.items.length === 0) return <ErrorState message="ani.pm did not answer. Try again in a moment." onRetry={list.retry} />;
  if (list.loading && list.items.length === 0) return <SkeletonGrid count={18} />;
  if (list.items.length === 0) return <EmptyState title={emptyTitle} message={emptyMessage} />;
  return (
    <>
      <ul className={GRID}>
        {list.items.map((a, i) => (
          <li key={`${a.anilistId}-${a.episode ?? ''}`} className="motion-safe:animate-rise" style={{ animationDelay: `${(i % 24) * 25}ms` }}>{render(a)}</li>
        ))}
      </ul>
      {list.error && <p role="alert" className="mt-6 text-center text-sm text-accent-text">More titles did not load. <button type="button" onClick={list.more} className="underline">Try again</button></p>}
      {list.hasMore && (
        <div className="mt-10 flex justify-center">
          <Button variant="outline" size="lg" onClick={list.more} loading={list.loading}>Load more</Button>
        </div>
      )}
    </>
  );
};

const titleMeta = (a) => [a.year, a.format, a.episodes?.dub ? 'Dub' : null].filter(Boolean).join(' • ');

const loadRecent = (page) => aniPm.recent(page);
const LatestTab = () => {
  const list = usePaged('latest', loadRecent);
  return (
    <Grid
      list={list}
      render={(a) => (
        <AnimeCard
          anime={a}
          episode={a.episode}
          badge={`EP ${a.episode}`}
          meta={[a.dub ? 'Sub • Dub' : 'Sub', ago(a.addedAt)].join(' • ')}
        />
      )}
    />
  );
};

const TopRatedTab = () => {
  const list = usePaged('top', topRatedAnime);
  return (
    <>
      <p className="mb-5 text-xs text-muted">Ranked by AniList score. Only titles you can watch here are shown.</p>
      <Grid list={list} render={(a) => <AnimeCard anime={a} meta={titleMeta(a)} />} />
    </>
  );
};

const PopularTab = ({ range, onRange }) => {
  const load = useCallback(() => aniPm.top(range).then((items) => ({ items, hasMore: false })), [range]);
  const list = usePaged(`popular|${range}`, load);
  return (
    <>
      <div role="group" aria-label="Time range" className="mb-6 flex flex-wrap gap-2">
        {TOP_RANGES.map((r) => <Chip key={r.id} selected={range === r.id} onClick={() => onRange(r.id)}>{r.label}</Chip>)}
      </div>
      <Grid list={list} render={(a) => <AnimeCard anime={a} meta={titleMeta(a)} />} />
    </>
  );
};

// The time table: releases grouped by day in this viewer's time zone.
const dayKey = (d) => d.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
const dayLabel = (key, todayKey) => {
  const d = new Date(`${key}T00:00:00`);
  const diff = Math.round((d - new Date(`${todayKey}T00:00:00`)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
};
const loadSchedule = () => aniPm.schedule().then((items) => ({ items, hasMore: false }));
// One release: opens its TMDB page with the season selected (spec 0009 AC-11, spec 0010).
const ScheduleRow = ({ x, aired }) => {
  const href = useAnimeLink(x.anilistId, undefined, '/anime');
  return (
    <li className="flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4">
      <time dateTime={x.airingAt} className={`w-16 shrink-0 text-sm font-semibold tabular-nums ${aired ? 'text-muted' : 'text-white'}`}>
        {x.at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
      </time>
      <Link to={href} className="h-16 w-11 shrink-0 overflow-hidden rounded-md bg-raised" tabIndex={-1} aria-hidden="true">
        {x.poster && <img src={x.poster} alt="" loading="lazy" className="h-full w-full object-cover" />}
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={href} className="line-clamp-1 text-sm font-semibold hover:text-accent-text">{x.title}</Link>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
          <span>Episode {x.episode}</span>
          <span className="uppercase">{x.kind}</span>
          {x.final && <span className="text-rating">Final</span>}
          {x.delayed && <span className="text-accent-text">Delayed</span>}
        </p>
      </div>
      {x.onAniPm ? (
        <Link to={href} className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-white/90">Watch</Link>
      ) : (
        <span className="shrink-0 text-xs text-muted">{aired ? 'Coming soon' : 'Upcoming'}</span>
      )}
    </li>
  );
};

const ScheduleTab = () => {
  const list = usePaged('schedule', loadSchedule);
  const todayKey = dayKey(new Date());
  const byDay = useMemo(() => {
    const map = new Map();
    list.items
      .map((x) => ({ ...x, at: new Date(x.airingAt) }))
      .sort((a, b) => a.at - b.at)
      .forEach((x) => { const k = dayKey(x.at); if (!map.has(k)) map.set(k, []); map.get(k).push(x); });
    return map;
  }, [list.items]);
  const days = [...byDay.keys()];
  const [picked, setPicked] = useState(null);
  const [now] = useState(() => Date.now()); // "aired" is judged once per visit, which is plenty
  const day = picked && byDay.has(picked) ? picked : (byDay.has(todayKey) ? todayKey : days.find((k) => k >= todayKey) || days[0]);

  if (list.error && !list.items.length) return <ErrorState message="The schedule did not load. Try again in a moment." onRetry={list.retry} />;
  if (list.loading && !list.items.length) return <div className="h-64 rounded-panel border border-line bg-card motion-safe:animate-pulse" aria-hidden="true" />;
  if (!days.length) return <EmptyState icon={<CalendarDays size={28} aria-hidden="true" />} title="No releases scheduled" />;

  return (
    <>
      <div role="group" aria-label="Day" className="hide-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        {days.map((k) => <Chip key={k} selected={day === k} onClick={() => setPicked(k)}>{dayLabel(k, todayKey)}</Chip>)}
      </div>
      <p className="mb-3 text-xs text-muted">Times are in your time zone.</p>
      <ol className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-card">
        {(byDay.get(day) || []).map((x) => <ScheduleRow key={`${x.anilistId}-${x.episode}-${x.kind}-${x.airingAt}`} x={x} aired={x.at.getTime() <= now} />)}
      </ol>
    </>
  );
};

const SearchResults = ({ q }) => {
  const load = useCallback((page) => aniPm.search(q, page), [q]);
  const list = usePaged(`search|${q}`, load);
  return (
    <Grid
      list={list}
      render={(a) => <AnimeCard anime={a} meta={titleMeta(a)} />}
      emptyTitle={`No anime found for “${q}”`}
      emptyMessage="Try the English or Japanese title."
    />
  );
};

const Anime = () => {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'latest';
  const range = TOP_RANGES.some((r) => r.id === params.get('range')) ? params.get('range') : 'week';
  const q = (params.get('q') || '').trim();
  const [text, setText] = useState(q);

  // Search as you type (from 2 characters), kept in the URL.
  useEffect(() => {
    const t = setTimeout(() => {
      const next = text.trim();
      if (next === q || (next.length === 1)) return;
      setParams((p) => { const n = new URLSearchParams(p); if (next) n.set('q', next); else n.delete('q'); return n; }, { replace: true });
    }, 400);
    return () => clearTimeout(t);
  }, [text, q, setParams]);

  const setParam = (key, value, fallback) => setParams((p) => {
    const n = new URLSearchParams(p);
    if (value === fallback) n.delete(key); else n.set(key, value);
    return n;
  }, { replace: true });

  return (
    <div className="font-body text-white">
      <Helmet><title>Anime · MovieHub</title></Helmet>
      <section
        className="px-4 pb-8 pt-28 md:px-8 md:pt-32 lg:px-16"
        style={{ backgroundImage: `radial-gradient(ellipse at top left, ${COLORS[0]}77, transparent 60%), radial-gradient(ellipse at top right, ${COLORS[1]}55, transparent 55%)` }}
      >
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-xs text-muted">
            <li><Link to="/categories" className="hover:text-white">Categories</Link></li>
            <li className="flex items-center gap-1.5"><ChevronRight size={14} aria-hidden="true" /><span aria-current="page" className="text-white">Anime</span></li>
          </ol>
        </nav>
        <p className="mt-4 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-rating">
          <Sparkles size={13} aria-hidden="true" /> Sub and dub
        </p>
        <h1 className="mt-2 font-display text-display-lg uppercase">Anime</h1>
        <p className="mt-3 max-w-2xl text-base text-muted">New episodes as they land, the highest rated series, what everyone is watching, and this week&apos;s release times.</p>
        <form role="search" onSubmit={(e) => e.preventDefault()} className="mt-6 max-w-xl">
          <TextField
            label="Search anime"
            type="search"
            icon={<Search size={20} />}
            placeholder="Frieren, One Piece, Solo Leveling…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoComplete="off"
          />
        </form>
      </section>

      <section className="px-4 pb-16 md:px-8 lg:px-16">
        {q.length >= 2 ? (
          <>
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Results for “{q}”</h2>
              <button type="button" onClick={() => setText('')} className="text-sm text-muted underline hover:text-white">Clear search</button>
            </div>
            <SearchResults q={q} />
          </>
        ) : (
          <>
            <div role="tablist" aria-label="Anime lists" className="hide-scrollbar -mx-4 mb-8 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`anime-tab-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls="anime-panel"
                  onClick={() => setParam('tab', t.id, 'latest')}
                  className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold motion-safe:transition-colors ${tab === t.id ? 'border-accent bg-accent text-white' : 'border-line bg-raised/70 text-white/80 hover:bg-white/10'}`}
                >
                  <t.icon size={16} aria-hidden="true" /> {t.label}
                </button>
              ))}
            </div>
            <div role="tabpanel" id="anime-panel" aria-labelledby={`anime-tab-${tab}`}>
              {tab === 'latest' && <LatestTab />}
              {tab === 'top' && <TopRatedTab />}
              {tab === 'popular' && <PopularTab range={range} onRange={(r) => setParam('range', r, 'week')} />}
              {tab === 'schedule' && <ScheduleTab />}
            </div>
          </>
        )}
        <p className="mt-12 flex items-center gap-2 text-xs text-subtle"><Tv size={14} aria-hidden="true" /> Anime streams and listings by ani.pm. Ratings by AniList.</p>
      </section>
    </div>
  );
};

export default Anime;
