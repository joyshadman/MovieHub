import React from 'react';
import { Star, Plus, Check } from 'lucide-react';
import MovieCard from './MovieCard';
import Button from './ui/Button';
import { SkeletonGrid, EmptyState, ErrorState } from './ui/feedback';
import { useWatchlist } from '../context/WatchlistContext';
import { fallbackGradient } from '../utils/fallbackArt';
import { primaryGenre } from '../utils/genres';

const ListRow = ({ movie, onOpen, delay = 0 }) => {
  const watchlist = useWatchlist();
  const saved = watchlist?.isSaved(movie.id);
  const rating = Number(movie.rating || movie.vote_average || 0);
  return (
    <li className="group relative flex gap-4 rounded-panel border border-line bg-card p-3 hover:border-line-strong hover:bg-white/[0.03] motion-safe:transition-colors motion-safe:animate-rise" style={{ animationDelay: `${delay}ms` }}>
      <div className="w-20 sm:w-24 aspect-[2/3] shrink-0 overflow-hidden rounded-control" style={movie.image ? undefined : { backgroundImage: fallbackGradient(movie.id) }}>
        {movie.image && <img src={movie.image} alt="" loading="lazy" className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1 py-1">
        <h3 className="font-display text-2xl uppercase leading-none">
          <button type="button" onClick={() => onOpen(movie)} className="text-left after:absolute after:inset-0 after:rounded-panel">{movie.title}</button>
        </h3>
        <p className="mt-1.5 flex items-center gap-2 text-xs text-muted">
          {movie.year}
          {primaryGenre(movie) && <><span aria-hidden="true">•</span>{primaryGenre(movie)}</>}
          {rating > 0 && <><span aria-hidden="true">•</span><Star size={12} className="fill-rating text-rating" aria-hidden="true" /><span className="text-white">{rating.toFixed(1)}</span></>}
        </p>
        <p className="mt-2 text-sm text-muted line-clamp-2 max-w-3xl">{movie.overview}</p>
      </div>
      {watchlist && (
        <button
          type="button"
          onClick={() => watchlist.toggle(movie)}
          aria-pressed={!!saved}
          aria-label={saved ? `Remove ${movie.title} from My List` : `Add ${movie.title} to My List`}
          className={`relative z-10 self-center h-10 w-10 shrink-0 rounded-full flex items-center justify-center border ${saved ? 'bg-accent border-accent' : 'border-line-strong hover:bg-white/10'}`}
        >
          {saved ? <Check size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
        </button>
      )}
    </li>
  );
};

// Shared results area for category and collection pages: grid or list, load more, all states.
const TitleGrid = ({ items, view = 'grid', loading, error, hasMore, onLoadMore, onRetry, onOpen, emptyAction }) => {
  if (error && items.length === 0) return <ErrorState onRetry={onRetry} />;
  if (loading && items.length === 0) return <SkeletonGrid count={18} />;
  if (!loading && items.length === 0) {
    return <EmptyState title="No titles match" message="Try removing a filter or two." action={emptyAction} />;
  }

  return (
    <>
      {view === 'list' ? (
        <ul className="flex flex-col gap-3">
          {items.map((m, i) => <ListRow key={`${m.id}-${i}`} movie={m} onOpen={onOpen} delay={(i % 20) * 30} />)}
        </ul>
      ) : (
        <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-5">
          {items.map((m, i) => (
            // Stagger restarts per page of 20, so "Load more" animates only the new titles.
            <li key={`${m.id}-${i}`} className="motion-safe:animate-rise" style={{ animationDelay: `${(i % 20) * 30}ms` }}><MovieCard movie={m} onClick={onOpen} /></li>
          ))}
        </ul>
      )}

      {error && <p role="alert" className="mt-6 text-center text-sm text-accent-text">More titles did not load. <button type="button" onClick={onLoadMore} className="underline">Try again</button></p>}

      {hasMore && (
        <div className="flex justify-center mt-10">
          <Button variant="outline" size="lg" onClick={onLoadMore} loading={loading}>Load more titles</Button>
        </div>
      )}
    </>
  );
};

export default TitleGrid;
