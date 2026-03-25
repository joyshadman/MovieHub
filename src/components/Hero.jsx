/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Shield, Zap, Globe, ArrowUpRight, Play, Sparkles, Loader2, 
  Star, Activity, Tv
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

const Hero = ({ onSearchClick }) => {
  const [slides, setSlides] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("");

  useEffect(() => {
    const fetchHeroData = async () => {
      try {
        setLoading(true);
        const randomGenre = genreList[Math.floor(Math.random() * genreList.length)];
        setActiveCategory(randomGenre.name);

        let data;
        if (randomGenre.id === 'bollywood') data = await movieApi.getBollywood();
        else if (randomGenre.id === 'bangla') data = await movieApi.getBanglaMovies();
        else if (randomGenre.id === 'anime') data = await movieApi.getAnime('movie');
        else data = await movieApi.getByGenre(randomGenre.id, 'movie');

        setSlides((data?.results || []).slice(0, 7));
      } catch (error) {
        console.error("Hero Discovery Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHeroData();
  }, []);

  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 7000); 
    return () => clearInterval(timer);
  }, [slides]);

  const current = useMemo(() => slides[index], [slides, index]);

  if (loading || !current) return (
    <div className="h-[100svh] w-full flex flex-col items-center justify-center bg-[#0a0a0a]">
      <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
      <p className="mt-4 text-[9px] font-bold uppercase tracking-[0.6em] text-white/30">INITIALIZING_SPOTLIGHT</p>
    </div>
  );

  return (
    <div className="relative h-[100svh] w-full overflow-hidden bg-[#080808]">
      
      {/* BACKGROUND IMAGE - SOFT MASKING */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
          className="absolute inset-0"
        >
          <div 
            style={{ backgroundImage: `url(${current.backdrop})` }}
            className="absolute inset-0 bg-cover bg-center filter brightness-[0.65] saturate-[1.1]"
          />
          
          {/* Refined subtle gradients */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-black/20 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-transparent z-10" />
        </motion.div>
      </AnimatePresence>

      {/* CONTENT LAYER */}
      <div className="absolute inset-0 z-20 flex items-center">
        <div className="container mx-auto px-6 md:px-12 lg:px-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
              className="max-w-3xl"
            >
              {/* Badge UI */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center gap-2 px-3 py-1 bg-red-600/90 backdrop-blur-md rounded-lg shadow-xl shadow-red-900/20">
                  <Sparkles size={12} className="text-white animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-white">
                    {activeCategory}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg">
                  <Star size={12} className="text-yellow-500 fill-yellow-500" />
                  <span className="text-[10px] font-black text-white/90">
                    {Number(current.rating).toFixed(1)}
                  </span>
                </div>
              </div>

              {/* FLUID TYPOGRAPHY - Balanced for all screens */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase leading-[1.1] tracking-tighter text-white drop-shadow-2xl">
                {current.title.split(' ')[0]}
                {current.title.includes(' ') && (
                  <span 
                    className="block opacity-90"
                    style={{ 
                      WebkitTextStroke: "1px rgba(255,255,255,0.5)", 
                      color: "transparent",
                      transition: "all 0.5s ease" 
                    }}
                  >
                    {current.title.split(' ').slice(1).join(' ')}
                  </span>
                )}
              </h1>

              {/* Meta Info Line */}
              <div className="flex items-center gap-4 mt-6 mb-8 text-[11px] font-bold tracking-[0.2em] text-white/50 uppercase">
                 <span className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded border border-white/10 text-white">
                    <Tv size={13} /> {current.year}
                 </span>
                 <div className="w-1 h-1 bg-red-600 rounded-full" />
                 <span className="text-red-500">Ultra 4K Stream</span>
              </div>

              {/* Description - Shorter & cleaner */}
              <p className="hidden md:block text-sm md:text-base text-white/60 max-w-lg mb-10 line-clamp-2 leading-relaxed font-medium">
                {current.overview || "Now streaming the most anticipated release of the season. Experience cinematic brilliance in high definition."}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4">
                <Link to={`/details/${current.type}/${current.id}`}>
                  <motion.button 
                    whileHover={{ scale: 1.05, backgroundColor: "#fff", color: "#000" }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-3 bg-red-600 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all duration-300"
                  >
                    <Play size={16} fill="currentColor" /> Play Production
                  </motion.button>
                </Link>
                
                <motion.button 
                  onClick={onSearchClick}
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.15)" }}
                  className="flex items-center gap-3 bg-white/5 border border-white/10 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] backdrop-blur-xl transition-all"
                >
                  Discovery <ArrowUpRight size={16} />
                </motion.button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* REFINED INDICATORS */}
      <div className="absolute bottom-10 left-6 md:left-12 lg:left-20 z-40 flex gap-2">
        {slides.map((_, i) => (
          <button 
            key={i} 
            onClick={() => setIndex(i)}
            className={`h-1 rounded-full transition-all duration-700 ${index === i ? 'w-10 bg-red-600' : 'w-4 bg-white/10 hover:bg-white/30'}`}
          />
        ))}
      </div>

      {/* MINIMAL STATS */}
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