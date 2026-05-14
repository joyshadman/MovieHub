import React, { useState, useEffect, useMemo } from 'react';
import { motion as Motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Shield, Zap, ArrowUpRight, Play, Sparkles,
  Loader2, Star, Tv,
} from 'lucide-react';
import { movieApi } from '../services/movieApi';

const genreList = [
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

const Hero = ({ movies = [], onSearchClick }) => {
  const reducedMotion = useReducedMotion();
  const [slides, setSlides] = useState(() => (movies.length ? movies.slice(0, 7) : []));
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(() => movies.length === 0);
  const [activeCategory, setActiveCategory] = useState(() => (movies.length ? 'Trending' : ''));

  const fadeFast = { duration: reducedMotion ? 0 : 0.32 };
  const fadeContent = { duration: reducedMotion ? 0 : 0.28 };

  useEffect(() => {
    if (movies.length > 0) {
      setSlides(movies.slice(0, 7));
      setActiveCategory('Trending');
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const randomGenre = genreList[Math.floor(Math.random() * genreList.length)];
        setActiveCategory(randomGenre.name);

        let data;
        if (randomGenre.id === 'bollywood') data = await movieApi.getBollywood();
        else if (randomGenre.id === 'bangla') data = await movieApi.getBanglaMovies();
        else if (randomGenre.id === 'anime') data = await movieApi.getAnime('movie');
        else data = await movieApi.getByGenre(randomGenre.id, 'movie');

        if (cancelled) return;
        setSlides((data?.results || []).slice(0, 7));
      } catch (error) {
        console.error('Hero Discovery Error:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [movies]);

  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [slides]);

  const current = useMemo(() => slides[index], [slides, index]);

  if (loading || !current) {
    return (
      <div className="h-[100svh] w-full flex flex-col items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
        <p className="mt-4 text-[9px] font-bold uppercase tracking-[0.6em] text-white/30">INITIALIZING_SPOTLIGHT</p>
      </div>
    );
  }

  return (
    <div className="relative h-[100svh] w-full overflow-hidden bg-[#080808]">

      <AnimatePresence mode="wait">
        <Motion.div
          key={current.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={fadeFast}
          className="absolute inset-0"
        >
          <div
            style={{ backgroundImage: `url(${current.backdrop})` }}
            className="absolute inset-0 bg-cover bg-center brightness-[0.65] saturate-[1.05]"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-black/20 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-transparent z-10" />
        </Motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 z-20 flex items-center">
        <div className="container mx-auto px-6 md:px-12 lg:px-20">
          <AnimatePresence mode="wait">
            <Motion.div
              key={current.id}
              initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
              transition={fadeContent}
              className="max-w-3xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center gap-2 px-3 py-1 bg-red-600/90 rounded-lg shadow-lg shadow-red-900/20">
                  <Sparkles size={12} className="text-white" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-white">
                    {activeCategory}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-lg">
                  <Star size={12} className="text-yellow-500 fill-yellow-500" />
                  <span className="text-[10px] font-black text-white/90">
                    {Number(current.rating).toFixed(1)}
                  </span>
                </div>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase leading-[1.1] tracking-tighter text-white drop-shadow-2xl">
                {current.title.split(' ')[0]}
                {current.title.includes(' ') && (
                  <span
                    className="block opacity-90"
                    style={{
                      WebkitTextStroke: '1px rgba(255,255,255,0.5)',
                      color: 'transparent',
                    }}
                  >
                    {current.title.split(' ').slice(1).join(' ')}
                  </span>
                )}
              </h1>

              <div className="flex items-center gap-4 mt-6 mb-8 text-[11px] font-bold tracking-[0.2em] text-white/50 uppercase">
                <span className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded border border-white/10 text-white">
                  <Tv size={13} /> {current.year}
                </span>
                <div className="w-1 h-1 bg-red-600 rounded-full" />
                <span className="text-red-500">Ultra 4K Stream</span>
              </div>

              <p className="hidden md:block text-sm md:text-base text-white/60 max-w-lg mb-10 line-clamp-2 leading-relaxed font-medium">
                {current.overview || 'Now streaming the most anticipated release of the season. Experience cinematic brilliance in high definition.'}
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Link to={`/details/${current.type}/${current.id}`}>
                  <button
                    type="button"
                    className="flex items-center gap-3 bg-red-600 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-transform duration-200 hover:bg-red-500 active:scale-[0.98]"
                  >
                    <Play size={16} fill="currentColor" /> Play Production
                  </button>
                </Link>

                <button
                  type="button"
                  onClick={onSearchClick}
                  className="flex items-center gap-3 bg-white/5 border border-white/10 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors duration-200 hover:bg-white/10 active:scale-[0.98]"
                >
                  Discovery <ArrowUpRight size={16} />
                </button>
              </div>
            </Motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="absolute bottom-10 left-6 md:left-12 lg:left-20 z-40 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            className={`h-1 rounded-full transition-all duration-300 ${index === i ? 'w-10 bg-red-600' : 'w-4 bg-white/10 hover:bg-white/30'}`}
          />
        ))}
      </div>

      <div className="absolute bottom-10 right-12 z-40 hidden lg:flex items-center gap-8 opacity-30">
        <div className="flex items-center gap-2 text-[8px] font-black tracking-widest text-white uppercase">
          <Shield size={10} /> Encryption: AES-256
        </div>
        <div className="flex items-center gap-2 text-[8px] font-black tracking-widest text-white uppercase">
          <Zap size={10} /> Buffer: 0.2s
        </div>
      </div>
    </div>
  );
};

export default Hero;
