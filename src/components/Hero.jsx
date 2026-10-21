import React, { useState, useEffect, useMemo } from 'react';
import { motion as Motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Play, Info, Plus, Check, Star } from 'lucide-react';
import { movieApi } from '../services/movieApi';
import { useWatchlist } from '../context/WatchlistContext';
import { fallbackGradient } from '../utils/fallbackArt';
import { genreName } from '../utils/genres';
import Button, { IconButton } from './ui/Button';
import { Badge } from './ui/Chip';

// Used when no slides are passed in: a random genre spotlight (existing behavior).
const fallbackGenres = [
  { id: 'bollywood', name: 'Bollywood' },
  { id: 'bangla', name: 'Bangla' },
  { id: 'anime', name: 'Anime' },
  { id: 28, name: 'Action' },
  { id: 878, name: 'Sci-Fi' },
  { id: 27, name: 'Horror' },
  { id: 35, name: 'Comedy' },
  { id: 18, name: 'Drama' },
  { id: 10749, name: 'Romance' },
  { id: 16, name: 'Animation' },
  { id: 9648, name: 'Mystery' },
];

const SLIDE_MS = 8000;
// Copy rises one line at a time on every slide.
const LIST = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } }, exit: {} };
const ITEM = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.25 } },
};

// Figma home hero: backdrop art, TOP 10 badge, Bebas title, meta, genre chips, Play / More Info / +.
const Hero = ({ movies = [], onPlay, onInfo, label = 'Trending', pending = false }) => {
  const reducedMotion = useReducedMotion();
  const watchlist = useWatchlist();
  const [slides, setSlides] = useState(() => (movies.length ? movies.slice(0, 7) : []));
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(() => movies.length === 0);
  const [activeCategory, setActiveCategory] = useState(() => (movies.length ? label : ''));

  useEffect(() => {
    if (pending) return undefined; // parent is still loading its slides
    if (movies.length > 0) {
      setSlides(movies.slice(0, 7));
      setActiveCategory(label);
      setIndex(0);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const randomGenre = fallbackGenres[Math.floor(Math.random() * fallbackGenres.length)];
        setActiveCategory(randomGenre.name);
        let data;
        if (randomGenre.id === 'bollywood') data = await movieApi.getBollywood();
        else if (randomGenre.id === 'bangla') data = await movieApi.getBanglaMovies();
        else if (randomGenre.id === 'anime') data = await movieApi.getAnime('movie');
        else data = await movieApi.getByGenre(randomGenre.id, 'movie');
        if (!cancelled) setSlides((data?.results || []).slice(0, 7));
      } catch (error) {
        console.error('Hero Discovery Error:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [movies, label, pending]);

  // One timer per slide, so picking a slide by hand restarts the countdown (and its progress bar).
  useEffect(() => {
    if (slides.length === 0) return undefined;
    const timer = setTimeout(() => setIndex((prev) => (prev + 1) % slides.length), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [slides, index]);

  const current = useMemo(() => slides[index], [slides, index]);

  if (pending || loading || !current) {
    return (
      <div className="relative h-[78svh] min-h-[520px] w-full bg-canvas" aria-busy="true">
        <div className="absolute inset-0 bg-gradient-to-r from-surface to-canvas motion-safe:animate-pulse" />
        <div className="relative h-full flex flex-col justify-end gap-4 px-4 md:px-8 lg:px-16 pb-16">
          <div className="h-6 w-40 rounded-full bg-raised" />
          <div className="h-20 w-2/3 max-w-xl rounded-panel bg-raised" />
          <div className="h-4 w-1/2 max-w-md rounded-full bg-raised" />
        </div>
      </div>
    );
  }

  const saved = watchlist?.isSaved(current.id);
  const genres = (current.genreIds || []).map(genreName).filter(Boolean).slice(0, 3);
  const rating = Number(current.rating || current.vote_average || 0);
  const fade = { duration: reducedMotion ? 0 : 0.4 };

  return (
    <section aria-roledescription="carousel" aria-label="Featured titles" className="relative h-[82svh] min-h-[560px] max-h-[900px] w-full overflow-hidden bg-canvas">
      <AnimatePresence mode="wait">
        <Motion.div key={current.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade} className="absolute inset-0">
          {current.backdrop ? (
            <img src={current.backdrop.replace('/t/p/original', '/t/p/w1280')} alt="" className="absolute inset-0 h-full w-full object-cover object-[70%_center] motion-safe:animate-kenburns" />
          ) : (
            <div className="absolute inset-0" style={{ backgroundImage: fallbackGradient(current.id) }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-canvas via-canvas/75 to-canvas/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-canvas via-transparent to-black/40" />
        </Motion.div>
      </AnimatePresence>

      <div className="relative z-10 h-full flex items-end md:items-center px-4 md:px-8 lg:px-16 pb-16 md:pb-0 pt-24">
        <AnimatePresence mode="wait">
          <Motion.div
            key={current.id}
            variants={LIST}
            initial={reducedMotion ? false : 'hidden'}
            animate="show"
            exit={reducedMotion ? undefined : 'exit'}
            className="max-w-xl"
            aria-live="polite"
          >
            <Motion.div variants={ITEM} className="inline-flex items-center gap-2 rounded-full glass pl-1 pr-3 py-1 mb-5">
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-white">Top 10</span>
              <span className="text-xs font-medium text-white">#{index + 1} in {activeCategory} Today</span>
            </Motion.div>

            <Motion.h1 variants={ITEM} className="font-display text-display-xl text-white uppercase line-clamp-3 break-words">{current.title}</Motion.h1>

            <Motion.div variants={ITEM} className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
              {current.year && <span>{current.year}</span>}
              {rating > 0 && (
                <>
                  <span aria-hidden="true">•</span>
                  <span className="inline-flex items-center gap-1 text-white">
                    <Star size={14} className="fill-rating text-rating" aria-hidden="true" />
                    {rating.toFixed(1)}
                  </span>
                </>
              )}
              <span aria-hidden="true">•</span>
              <Badge>{current.type === 'tv' ? 'Series' : 'Movie'}</Badge>
            </Motion.div>

            {genres.length > 0 && (
              <Motion.ul variants={ITEM} className="mt-4 flex flex-wrap gap-2" aria-label="Genres">
                {genres.map((g) => (
                  <li key={g} className="h-8 inline-flex items-center px-3 rounded-full border border-line-strong text-xs font-medium text-white">{g}</li>
                ))}
              </Motion.ul>
            )}

            <Motion.p variants={ITEM} className="mt-5 text-sm md:text-base text-muted line-clamp-3 max-w-lg">{current.overview}</Motion.p>

            <Motion.div variants={ITEM} className="mt-7 flex flex-wrap items-center gap-3" data-tour="hero">
              <Button variant="light" size="lg" onClick={() => onPlay?.(current)} icon={<Play size={18} className="fill-black" aria-hidden="true" />}>
                Play
              </Button>
              <Button variant="glass" size="lg" onClick={() => onInfo?.(current)} icon={<Info size={18} aria-hidden="true" />}>
                More Info
              </Button>
              {watchlist && (
                <IconButton
                  label={saved ? `Remove ${current.title} from My List` : `Add ${current.title} to My List`}
                  aria-pressed={!!saved}
                  active={saved}
                  size="lg"
                  disabled={watchlist.isPending(current.id)}
                  onClick={() => watchlist.toggle(current)}
                >
                  {saved ? <Check size={20} aria-hidden="true" /> : <Plus size={20} aria-hidden="true" />}
                </IconButton>
              )}
            </Motion.div>
          </Motion.div>
        </AnimatePresence>
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-12 md:bottom-20 right-4 md:right-8 lg:right-16 z-20 flex gap-1.5" role="group" aria-label="Choose featured title">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show ${s.title}`}
              aria-current={index === i ? 'true' : undefined}
              className="py-2"
            >
              <span className={`relative block h-1 overflow-hidden rounded-full motion-safe:transition-all duration-500 ${index === i ? 'w-10 bg-white/25' : 'w-3 bg-white/30 hover:bg-white/60'}`}>
                {index === i && <span key={index} className="absolute inset-0 origin-left rounded-full bg-accent motion-safe:animate-progress" />}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

export default Hero;
