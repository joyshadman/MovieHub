import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bookmark, Trash2, LogIn } from 'lucide-react';
import { useWatchlist } from '../context/WatchlistContext';
import MovieCard from '../components/MovieCard';
import Button from '../components/ui/Button';
import Chip from '../components/ui/Chip';
import { SkeletonGrid, EmptyState } from '../components/ui/feedback';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'movie', label: 'Movies' },
  { id: 'tv', label: 'TV Shows' },
];

// Not in Figma: built in the Figma style. Live list from the shared watchlist store.
const MyList = ({ user, onMovieClick }) => {
  const watchlist = useWatchlist();
  const navigate = useNavigate();
  const location = useLocation();
  const [filter, setFilter] = useState('all');

  const items = useMemo(() => {
    const list = [...(watchlist?.items || [])].reverse(); // newest saves first
    if (filter === 'all') return list;
    return list.filter((m) => (m.type || (m.first_air_date ? 'tv' : 'movie')) === filter);
  }, [watchlist?.items, filter]);

  const open = (movie) => {
    if (onMovieClick) onMovieClick(movie);
    else navigate(`/${movie.type || 'movie'}/${movie.id}`);
  };

  const header = (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
      <div>
        <h1 className="text-4xl md:text-5xl font-bold">My List</h1>
        <p className="mt-2 text-muted">
          {user ? `${watchlist?.count || 0} saved title${watchlist?.count === 1 ? '' : 's'}` : 'Your saved movies and shows, on every device.'}
        </p>
      </div>
      {user && watchlist?.count > 0 && (
        <div role="group" aria-label="Filter saved titles" className="flex gap-2">
          {FILTERS.map((f) => <Chip key={f.id} selected={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</Chip>)}
        </div>
      )}
    </div>
  );

  let body;
  if (!user) {
    body = (
      <EmptyState
        icon={<LogIn size={28} aria-hidden="true" />}
        title="Sign in to see your list"
        message="Save movies and shows with the + button, and they will wait for you here."
        action={
          <div className="flex gap-3">
            <Button to="/login" state={{ from: location.pathname }}>Sign In</Button>
            <Button to="/signup" variant="outline" state={{ from: location.pathname }}>Create account</Button>
          </div>
        }
      />
    );
  } else if (watchlist?.loading) {
    body = <SkeletonGrid count={12} />;
  } else if ((watchlist?.count || 0) === 0) {
    body = (
      <EmptyState
        icon={<Bookmark size={28} aria-hidden="true" />}
        title="Your list is empty"
        message="Tap the + on any title to save it here for later."
        action={<Button to="/categories" variant="outline">Start discovering</Button>}
      />
    );
  } else if (items.length === 0) {
    body = <EmptyState title="Nothing here for this filter" message="Try All to see every saved title." action={<Button variant="outline" size="sm" onClick={() => setFilter('all')}>Show all</Button>} />;
  } else {
    body = (
      <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-5">
        {items.map((movie) => (
          <li key={movie.id} className="group relative">
            <MovieCard movie={movie} onClick={open} showSave={false} />
            <button
              type="button"
              onClick={() => watchlist.remove(movie)}
              disabled={watchlist.isPending(movie.id)}
              aria-label={`Remove ${movie.title || movie.name} from My List`}
              className="absolute top-2.5 left-2.5 z-10 h-8 w-8 rounded-full flex items-center justify-center bg-black/60 border border-line backdrop-blur-sm text-white hover:bg-accent hover:border-accent disabled:opacity-50 opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:focus-visible:opacity-100"
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="font-body text-white min-h-[70vh] pt-24 md:pt-32 px-4 md:px-8 lg:px-16">
      {header}
      {body}
    </div>
  );
};

export default MyList;
