import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion as Motion, useReducedMotion } from 'framer-motion';
import { Star, Plus, Check, ChevronRight, VolumeX } from 'lucide-react';
import { movieApi } from '../services/movieApi';
import { useWatchlist } from '../context/WatchlistContext';
import { fallbackGradient } from '../utils/fallbackArt';
import { primaryGenre } from '../utils/genres';
import TrailerBackdrop from './TrailerBackdrop';

// Desktop only (utils/hoverPreview.js): hovering a poster card for HOVER_DELAY_MS opens this larger card over it,
// playing the title's trailer silently. Mouse users only (it is an extra, never the only way
// to reach an action): keyboard and touch users keep the plain card.
const GUTTER = 16;
const NAV_H = 80;
const INFO_H = 132; // approx height of the text block under the video

const backdropOf = (m) => {
  if (m.backdrop_path) return `https://image.tmdb.org/t/p/w780${m.backdrop_path}`;
  if (m.backdrop) return String(m.backdrop).replace('/t/p/original', '/t/p/w780');
  return null;
};

const HoverPreview = ({ movie, rect, onClose, onOpen }) => {
  const reducedMotion = useReducedMotion();
  const watchlist = useWatchlist();
  const [trailer, setTrailer] = useState({ id: null, key: null });

  const type = movie.type || movie.media_type || (movie.first_air_date ? 'tv' : 'movie');
  useEffect(() => {
    let cancelled = false;
    movieApi.getTrailerKey(type, movie.id).then((key) => {
      if (!cancelled) setTrailer({ id: movie.id, key });
    });
    return () => { cancelled = true; };
  }, [type, movie.id]);

  // Any scroll (page, a row, the player overlay) or resize moves the card away from its anchor.
  useEffect(() => {
    const close = () => onClose();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const width = Math.min(Math.max(rect.width * 1.9, 320), 420);
  const height = (width * 9) / 16 + INFO_H;
  const left = Math.min(Math.max(rect.left + rect.width / 2 - width / 2, GUTTER), window.innerWidth - width - GUTTER);
  const top = Math.min(Math.max(rect.top + rect.height / 2 - height / 2, NAV_H), window.innerHeight - height - GUTTER);
  const originX = rect.left + rect.width / 2 - left;
  const originY = rect.top + rect.height / 2 - top;

  const title = movie.title || movie.name || 'Untitled';
  const year = String(movie.release_date || movie.first_air_date || movie.year || '').slice(0, 4);
  const rating = Number(movie.vote_average || movie.rating || 0);
  const genre = primaryGenre(movie);
  const saved = watchlist?.isSaved(movie.id);
  const videoKey = trailer.id === movie.id ? trailer.key : null;
  const image = backdropOf(movie) || (movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : movie.image);

  return createPortal(
    <Motion.div
      initial={reducedMotion ? false : { opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      style={{ left, top, width, transformOrigin: `${originX}px ${originY}px` }}
      onMouseLeave={onClose}
      aria-hidden="true"
      data-hover-preview
      className="fixed z-[600] overflow-hidden rounded-panel border border-line-strong bg-sheet font-body text-white shadow-[0_30px_80px_-20px_rgb(0_0_0/0.9)]"
    >
      <div onClick={() => onOpen?.(movie)} className="relative block w-full aspect-video cursor-pointer">
        <TrailerBackdrop
          videoKey={videoKey}
          image={image}
          fallbackStyle={{ backgroundImage: fallbackGradient(movie.id) }}
          title={title}
          soundless
          revealDelay={2600}
          crop={1.45}
        />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-sheet to-transparent" />
        <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-white/85 backdrop-blur-sm">
          <VolumeX size={11} /> Preview
        </span>
      </div>

      <div className="px-4 pb-4 -mt-3 relative">
        <p className="font-display text-2xl uppercase leading-none line-clamp-1">{title}</p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
          {rating > 0 && (
            <span className="inline-flex items-center gap-1 font-semibold text-white">
              <Star size={12} className="fill-rating text-rating" /> {rating.toFixed(1)}
            </span>
          )}
          {year && <span>{year}</span>}
          {genre && <span>• {genre}</span>}
          <span className="rounded border border-line-strong px-1.5 text-[10px] font-semibold uppercase">{type === 'tv' ? 'Series' : 'Movie'}</span>
        </p>
        {movie.overview && <p className="mt-2 text-xs text-muted line-clamp-2">{movie.overview}</p>}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            tabIndex={-1}
            onClick={() => onOpen?.(movie)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-4 text-xs font-semibold text-black hover:bg-white/90 motion-safe:active:scale-95 motion-safe:transition-all"
          >
            Details <ChevronRight size={14} />
          </button>
          {watchlist && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => watchlist.toggle(movie)}
              disabled={watchlist.isPending(movie.id)}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border motion-safe:transition-all motion-safe:active:scale-90 ${saved ? 'bg-accent border-accent' : 'border-line-strong hover:bg-white/10'}`}
            >
              {saved ? <Check size={16} /> : <Plus size={16} />}
            </button>
          )}
        </div>
      </div>
    </Motion.div>,
    document.body
  );
};

export default HoverPreview;
