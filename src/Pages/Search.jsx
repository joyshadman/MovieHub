import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, X, SearchX } from 'lucide-react';
import { movieApi } from '../services/movieApi';
import MovieCard from '../components/MovieCard';
import Chip from '../components/ui/Chip';
import { SkeletonGrid, EmptyState, ErrorState } from '../components/ui/feedback';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'movie', label: 'Movies' },
  { id: 'tv', label: 'TV Shows' },
];

const normalizeText = (value = '') => value.toString().toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

const rankByQuery = (items, q) => {
  const normalizedQuery = normalizeText(q);
  if (!normalizedQuery) return items;
  const score = (title, item) => {
    let s = 0;
    if (title === normalizedQuery) s += 100;
    if (title.startsWith(normalizedQuery)) s += 70;
    if (title.includes(normalizedQuery)) s += 40;
    const words = normalizedQuery.split(/\s+/).filter(Boolean);
    s += words.filter((w) => title.includes(w)).length * 10;
    s += Math.min(Number(item.rating || item.vote_average || 0), 10);
    return s;
  };
  return [...items].sort(
    (a, b) => score(normalizeText(b.title || b.name || ''), b) - score(normalizeText(a.title || a.name || ''), a)
  );
};

// Not in Figma: built in the Figma style. Debounced TMDB multi search, ranked, filterable.
// The query is kept in the URL (?q=) so results survive back navigation.
const SearchPage = ({ onMovieClick, externalQuery = '' }) => {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(externalQuery || params.get('q') || '');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState('all');
  const [retry, setRetry] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (externalQuery) setQuery(externalQuery);
  }, [externalQuery]);

  useEffect(() => {
    const trimmed = query.trim();
    setParams(trimmed ? { q: trimmed } : {}, { replace: true });
    const delayDebounceFn = setTimeout(async () => {
      if (trimmed.length > 1) {
        setIsLoading(true);
        setFailed(false);
        try {
          const response = await movieApi.search(trimmed);
          const data = Array.isArray(response) ? response : response?.results || [];
          setResults(data);
        } catch (error) {
          console.error('Search error:', error);
          setResults([]);
          setFailed(true);
        } finally {
          setIsLoading(false);
        }
      } else if (trimmed.length === 0) {
        setResults([]);
        setFailed(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, retry]);

  const filteredResults = useMemo(() => {
    if (!Array.isArray(results)) return [];
    const filtered = results.filter((item) => {
      if (filter === 'all') return true;
      const itemType = item.type || item.media_type || (item.first_air_date ? 'tv' : 'movie');
      return itemType === filter;
    });
    return rankByQuery(filtered, query);
  }, [results, filter, query]);

  const hasQuery = query.trim().length > 1;

  return (
    <div className="font-body text-white min-h-[70vh] pt-24 md:pt-32 px-4 md:px-8 lg:px-16">
      <h1 className="text-4xl md:text-5xl font-bold">Search</h1>
      <p className="mt-2 text-muted">Find movies and TV shows by title.</p>

      <div className="mt-6 max-w-3xl">
        <label htmlFor="search-input" className="sr-only">Search movies and TV shows</label>
        <div className="flex items-center gap-3 h-14 px-5 rounded-panel glass focus-within:border-accent-text">
          <SearchIcon size={22} className="text-muted shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            id="search-input"
            autoFocus
            type="search"
            placeholder="Search movies and TV shows"
            className="flex-1 min-w-0 bg-transparent text-lg text-white placeholder:text-subtle focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button type="button" onClick={() => { setQuery(''); inputRef.current?.focus(); }} aria-label="Clear search" className="text-muted hover:text-white rounded-full p-1">
              <X size={20} aria-hidden="true" />
            </button>
          )}
        </div>

        <div role="group" aria-label="Filter results" className="mt-4 flex gap-2">
          {FILTERS.map((f) => (
            <Chip key={f.id} selected={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</Chip>
          ))}
        </div>
      </div>

      <div className="mt-8" aria-live="polite" aria-busy={isLoading}>
        {isLoading ? (
          <SkeletonGrid count={12} />
        ) : failed ? (
          <ErrorState title="Search is not responding" message="Check your connection and try again." onRetry={() => setRetry((n) => n + 1)} />
        ) : filteredResults.length > 0 ? (
          <>
            <p className="mb-4 text-sm text-muted">{filteredResults.length} result{filteredResults.length === 1 ? '' : 's'} for “{query.trim()}”</p>
            <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-5">
              {filteredResults.map((movie) => (
                <li key={`${movie.type}-${movie.id}`}>
                  <MovieCard movie={movie} onClick={() => onMovieClick(movie)} />
                </li>
              ))}
            </ul>
          </>
        ) : hasQuery ? (
          <EmptyState
            icon={<SearchX size={28} aria-hidden="true" />}
            title={`No results for “${query.trim()}”`}
            message={filter !== 'all' ? 'Try switching the filter to All, or check the spelling.' : 'Check the spelling or try a different title.'}
          />
        ) : (
          <EmptyState icon={<SearchIcon size={28} aria-hidden="true" />} title="Start typing to search" message="Results appear as you type, ranked by how closely they match." />
        )}
      </div>
    </div>
  );
};

export default SearchPage;
