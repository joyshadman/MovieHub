import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronRight, LayoutGrid, List, SlidersHorizontal } from 'lucide-react';
import { movieApi } from '../services/movieApi';
import { CATEGORY_GENRES, TV_GENRE_MAP, findCategoryGenre } from '../utils/genres';
import { SelectPill } from '../components/ui/fields';
import Chip from '../components/ui/Chip';
import Button from '../components/ui/Button';
import TitleGrid from '../components/TitleGrid';
import NotFound from './NotFound';

const YEAR_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: '2020-2026', label: '2020–2026' },
  { value: '2010-2019', label: '2010–2019' },
  { value: '2000-2009', label: '2000–2009' },
  { value: '1990-1999', label: '1990s' },
  { value: '1900-1989', label: 'Before 1990' },
];
const RATING_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: '6', label: '6+' },
  { value: '7', label: '7+' },
  { value: '8', label: '8+' },
];
const LANGUAGE_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'bn', label: 'Bengali' },
  { value: 'ko', label: 'Korean' },
  { value: 'ja', label: 'Japanese' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
];
const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest' },
];
const TYPE_OPTIONS = [
  { value: 'movie', label: 'Movies' },
  { value: 'tv', label: 'TV Shows' },
];

const DEFAULTS = { type: 'movie', year: 'any', rating: 'any', lang: 'any', sort: 'popular', view: 'grid' };
const labelOf = (opts, v) => opts.find((o) => o.value === v)?.label || v;

// Figma "Category – Action": breadcrumb, title + count, filter bar, active chips, grid/list, load more.
// Filters live in the URL (spec 0002) so refresh and back keep them.
const CategoryPage = () => {
  const { genreId } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const genre = findCategoryGenre(genreId);

  const f = Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, params.get(k) || DEFAULTS[k]]));
  const [rawItems, setItems] = useState([]);
  const [loadedKey, setLoadedKey] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const requestId = useRef(0);

  const filterKey = `${genreId}|${f.type}|${f.year}|${f.rating}|${f.lang}|${f.sort}`;
  const items = loadedKey === filterKey ? rawItems : []; // hide stale titles while new filters load

  const load = useCallback(async (pageNum) => {
    if (!genre) return;
    const id = ++requestId.current;
    setLoading(true);
    setError(false);
    const [yearFrom, yearTo] = f.year === 'any' ? [] : f.year.split('-');
    const gid = f.type === 'tv' ? TV_GENRE_MAP[genre.id] || genre.id : genre.id;
    const data = await movieApi.discoverAdvanced({
      type: f.type,
      genre: gid,
      yearFrom,
      yearTo,
      minRating: f.rating === 'any' ? null : f.rating,
      language: f.lang === 'any' ? null : f.lang,
      sort: f.sort,
      page: pageNum,
    });
    if (id !== requestId.current) return; // a newer filter change won
    if (data.error) setError(true);
    setItems((prev) => (pageNum === 1 ? data.results : [...prev, ...data.results]));
    setLoadedKey(filterKey);
    setTotalPages(data.totalPages || 0);
    if (pageNum === 1) setTotalResults(data.totalResults || 0);
    setPage(pageNum);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  useEffect(() => {
    load(1);
    window.scrollTo(0, 0);
  }, [load]);

  if (!genre) return <NotFound />;

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value === DEFAULTS[key]) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const clearAll = () => setParams(f.view !== 'grid' ? { view: f.view } : {}, { replace: true });

  const activeChips = [
    f.type !== DEFAULTS.type && { key: 'type', label: labelOf(TYPE_OPTIONS, f.type) },
    f.year !== 'any' && { key: 'year', label: labelOf(YEAR_OPTIONS, f.year) },
    f.rating !== 'any' && { key: 'rating', label: `Rating ${labelOf(RATING_OPTIONS, f.rating)}` },
    f.lang !== 'any' && { key: 'lang', label: labelOf(LANGUAGE_OPTIONS, f.lang) },
    f.sort !== DEFAULTS.sort && { key: 'sort', label: labelOf(SORT_OPTIONS, f.sort) },
  ].filter(Boolean);

  const shownTo = items.length;
  // TMDB caps totals at 20,001, so show the cap as "20,000+" instead of a fake exact number.
  const totalLabel = totalResults >= 20000 ? "20,000+" : totalResults.toLocaleString();
  const openTitle = (m) => navigate(`/${m.type || f.type}/${m.id}`);

  return (
    <div className="font-body text-white">
      <section
        className="pt-28 md:pt-32 pb-8 px-4 md:px-8 lg:px-16"
        style={{ backgroundImage: `radial-gradient(ellipse at top left, ${genre.from}66, transparent 60%)` }}
      >
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-xs text-muted">
            <li><Link to="/categories" className="hover:text-white">Categories</Link></li>
            <li className="flex items-center gap-1.5"><ChevronRight size={14} aria-hidden="true" /><span aria-current="page" className="text-white">{genre.name}</span></li>
          </ol>
        </nav>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <h1 className="font-display text-display-lg uppercase">{genre.name}</h1>
          {totalResults > 0 && (
            <span className="inline-flex items-center h-8 px-3 rounded-full border border-accent/60 bg-accent/10 text-sm">{totalLabel} titles</span>
          )}
        </div>
        <p className="mt-3 text-base text-muted max-w-2xl">{genre.blurb}</p>

        {/* FILTER BAR */}
        <div className="mt-8 glass rounded-panel p-3 md:p-4 flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <SlidersHorizontal size={20} className="text-muted hidden md:block mx-1" aria-hidden="true" />
            <SelectPill
              label="Genre"
              value={String(genre.id)}
              onChange={(v) => navigate(`/categories/${v}${params.toString() ? `?${params}` : ''}`)}
              options={CATEGORY_GENRES.map((g) => ({ value: String(g.id), label: g.name }))}
            />
            <SelectPill label="Type" value={f.type} onChange={(v) => update('type', v)} options={TYPE_OPTIONS} />
            <SelectPill label="Year" value={f.year} onChange={(v) => update('year', v)} options={YEAR_OPTIONS} />
            <SelectPill label="Rating" value={f.rating} onChange={(v) => update('rating', v)} options={RATING_OPTIONS} />
            <SelectPill label="Language" value={f.lang} onChange={(v) => update('lang', v)} options={LANGUAGE_OPTIONS} />
          </div>
          <div className="flex items-center gap-2.5">
            <SelectPill label="Sort by" value={f.sort} onChange={(v) => update('sort', v)} options={SORT_OPTIONS} />
            <div role="group" aria-label="View" className="flex rounded-control border border-line-strong p-1 gap-1">
              <button type="button" onClick={() => update('view', 'grid')} aria-pressed={f.view === 'grid'} aria-label="Grid view" className={`h-8 w-8 rounded-lg flex items-center justify-center ${f.view === 'grid' ? 'bg-accent text-white' : 'text-muted hover:text-white'}`}><LayoutGrid size={17} aria-hidden="true" /></button>
              <button type="button" onClick={() => update('view', 'list')} aria-pressed={f.view === 'list'} aria-label="List view" className={`h-8 w-8 rounded-lg flex items-center justify-center ${f.view === 'list' ? 'bg-accent text-white' : 'text-muted hover:text-white'}`}><List size={17} aria-hidden="true" /></button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 min-h-9" aria-live="polite">
          <p className="text-sm text-muted mr-1">
            {loading && items.length === 0 ? 'Loading titles…' : `Showing 1–${shownTo.toLocaleString()} of ${totalLabel}`}
          </p>
          {activeChips.map((c) => (
            <Chip key={c.key} onRemove={() => update(c.key, DEFAULTS[c.key])}>{c.label}</Chip>
          ))}
          {activeChips.length > 0 && (
            <button type="button" onClick={clearAll} className="text-sm font-medium text-accent-text hover:underline ml-1">Clear all</button>
          )}
        </div>
      </section>

      <section aria-label={`${genre.name} titles`} className="px-4 md:px-8 lg:px-16">
        <TitleGrid
          items={items}
          view={f.view}
          loading={loading}
          error={error}
          hasMore={page < totalPages}
          onLoadMore={() => load(page + 1)}
          onRetry={() => load(1)}
          onOpen={openTitle}
          emptyAction={activeChips.length > 0 && <Button variant="outline" size="sm" onClick={clearAll}>Clear filters</Button>}
        />
      </section>
    </div>
  );
};

export default CategoryPage;
