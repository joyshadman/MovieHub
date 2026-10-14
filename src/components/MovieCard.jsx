import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Star, Plus, Check, Loader2, Play } from 'lucide-react';
import { useWatchlist } from '../context/WatchlistContext';
import { fallbackGradient } from '../utils/fallbackArt';
import { primaryGenre } from '../utils/genres';
import HoverPreview from './HoverPreview';
import { HOVER_DELAY_MS, canHoverPreview } from '../utils/hoverPreview';

// Only one hover preview on screen at a time: opening one closes the last.
let closeActivePreview = null;

// Figma "Poster Card": 2:3 artwork, rating pill, Bebas title, "year • genre" meta.
const MovieCard = React.memo(({ movie, onClick, meta, showSave = true }) => {
  const watchlist = useWatchlist();
  const [imgFailed, setImgFailed] = useState(false);
  const title = movie.title || movie.name || 'Untitled';

  const posterUrl = useMemo(() => {
    if (movie.poster_path) return `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
    return movie.image || null;
  }, [movie.poster_path, movie.image]);

  const rating = useMemo(() => {
    const val = Number(movie.vote_average || movie.rating);
    return val ? val.toFixed(1) : null;
  }, [movie.vote_average, movie.rating]);

  const releaseYear = useMemo(() => {
    const date = movie.release_date || movie.first_air_date || movie.year;
    return date ? String(date).split('-')[0] : null;
  }, [movie.release_date, movie.first_air_date, movie.year]);

  const metaLine = meta ?? [releaseYear, primaryGenre(movie)].filter(Boolean).join(' • ');
  const saved = watchlist?.isSaved(movie.id);
  const busy = watchlist?.isPending(movie.id);
  const showArt = posterUrl && !imgFailed;

  // Desktop hover preview (silent trailer) after the pointer rests on the card.
  const cardRef = useRef(null);
  const hoverTimer = useRef(null);
  const [previewRect, setPreviewRect] = useState(null);
  const closePreview = useCallback(() => {
    clearTimeout(hoverTimer.current);
    setPreviewRect(null);
  }, []);
  const startHover = () => {
    if (!onClick || !canHoverPreview()) return;
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      if (!cardRef.current?.matches(':hover')) return;
      closeActivePreview?.();
      closeActivePreview = closePreview;
      setPreviewRect(cardRef.current.getBoundingClientRect());
    }, HOVER_DELAY_MS);
  };
  const cancelHover = () => clearTimeout(hoverTimer.current);
  useEffect(() => () => {
    clearTimeout(hoverTimer.current);
    if (closeActivePreview === closePreview) closeActivePreview = null;
  }, [closePreview]);

  return (
    <div
      ref={cardRef}
      className="group relative w-full"
      onMouseEnter={startHover}
      onMouseLeave={cancelHover}
      onMouseDown={cancelHover}
    >
      {previewRect && (
        <HoverPreview
          movie={movie}
          rect={previewRect}
          onClose={closePreview}
          onOpen={(m) => { closePreview(); onClick?.(m); }}
        />
      )}
      <div
        className="relative aspect-[2/3] w-full overflow-hidden rounded-card border border-line bg-card motion-safe:transition-[transform,box-shadow,border-color] duration-300 ease-out motion-safe:group-hover:-translate-y-1.5 group-hover:border-accent/40 group-hover:shadow-[0_18px_40px_-14px_rgb(0_0_0/0.8),0_0_0_1px_rgb(225_29_72/0.25)]"
        style={showArt ? undefined : { backgroundImage: fallbackGradient(movie.id) }}
      >
        {showArt && (
          <img
            src={posterUrl}
            alt=""
            className="h-full w-full object-cover motion-safe:transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.07]"
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {/* Hover: light sweep and a play badge (fine pointers only, so touch taps stay clean). */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] motion-safe:pointer-fine:group-hover:animate-shine" />
        <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-accent/90 shadow-glow flex items-center justify-center opacity-0 scale-75 motion-safe:transition-all duration-300 ease-out pointer-fine:group-hover:opacity-100 pointer-fine:group-hover:scale-100">
          <Play size={18} className="ml-0.5 fill-white text-white" />
        </span>

        {rating && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full bg-black/55 backdrop-blur-sm border border-line px-2 py-0.5">
            <Star size={11} className="fill-rating text-rating" aria-hidden="true" />
            <span className="text-[11px] font-semibold text-white">{rating}</span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="font-display text-display-sm text-white uppercase line-clamp-2 break-words">{title}</h3>
          {metaLine && <p className="mt-0.5 text-[11px] text-muted truncate">{metaLine}</p>}
        </div>
      </div>

      {/* Full card click target (keyboard reachable); the save button sits above it. */}
      <button
        type="button"
        onClick={() => onClick?.(movie)}
        className="absolute inset-0 rounded-card"
        aria-label={`${title}${releaseYear ? `, ${releaseYear}` : ''}`}
      />

      {showSave && watchlist && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); watchlist.toggle(movie); }}
          disabled={busy}
          aria-label={saved ? `Remove ${title} from My List` : `Add ${title} to My List`}
          aria-pressed={!!saved}
          className={`absolute top-2.5 left-2.5 z-10 h-8 w-8 rounded-full flex items-center justify-center border backdrop-blur-sm motion-safe:transition-all duration-200
            ${saved || busy ? 'opacity-100' : 'opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:focus-visible:opacity-100'}
            ${saved ? 'bg-accent border-accent text-white' : 'bg-black/55 border-line text-white hover:bg-accent hover:border-accent'}`}
        >
          {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : saved ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : <Plus size={14} strokeWidth={3} aria-hidden="true" />}
        </button>
      )}
    </div>
  );
});

export default MovieCard;
