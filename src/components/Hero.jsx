/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Shield, Zap, Globe, ArrowUpRight, Play, Sparkles, Loader2, 
  Sword, Ghost, Drama, Film, Heart, Music, Search 
} from 'lucide-react';
import { movieApi } from '../services/movieApi';

// The category source from your Categories component
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
  const containerRef = useRef(null);

  useEffect(() => {
    const fetchHeroData = async () => {
      try {
        setLoading(true);
        // 1. Pick a completely random genre from the list provided
        const randomGenre = genreList[Math.floor(Math.random() * genreList.length)];
        setActiveCategory(randomGenre.name);

        let data;

        // 2. Fetch data based on the randomized category
        if (randomGenre.id === 'bollywood') {
          data = await movieApi.getBollywood();
        } else if (randomGenre.id === 'bangla') {
          data = await movieApi.getBanglaMovies();
        } else if (randomGenre.id === 'anime') {
          data = await movieApi.getAnime('movie');
        } else {
          data = await movieApi.getByGenre(randomGenre.id, 'movie');
        }

        // 3. Extract results and take exactly 7 items as requested
        const results = data?.results || [];
        setSlides(results.slice(0, 7));
        setLoading(false);
      } catch (error) {
        console.error("Hero Discovery Error:", error);
        setLoading(false);
      }
    };

    fetchHeroData();
  }, []);

  // Auto-slide logic
  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 6000); 
    return () => clearInterval(timer);
  }, [slides]);

  const { scrollY } = useScroll();
  const yParallax = useTransform(scrollY, [0, 500], [0, 250]);
  const opacityFade = useTransform(scrollY, [0, 400], [1, 0]);

  const current = slides[index];

  if (loading || !current) return (
    <div className="h-[100svh] w-full flex flex-col items-center justify-center bg-[#020202]">
      <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
      <p className="mt-4 text-[10px] font-black uppercase tracking-[0.5em] text-white/20 animate-pulse">
        Generating Randomized Spotlight
      </p>
    </div>
  );

  return (
    <div ref={containerRef} className="relative h-[100svh] w-full overflow-hidden bg-[#020202]">
      
      {/* CINEMATIC GLASSY OVERLAYS */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" 
             style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
        
        {/* Dynamic Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,transparent_0%,rgba(0,0,0,0.9)_100%)]" />
        <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-[#020202] via-[#020202]/80 to-transparent" />
      </div>

      {/* BACKGROUND IMAGE WITH PARALLAX */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, scale: 1.15, filter: 'blur(20px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
          transition={{ duration: 1.8, ease: [0.19, 1, 0.22, 1] }}
          className="absolute inset-0 z-0"
        >
          <motion.div 
            style={{ 
              y: yParallax,
              backgroundImage: `url(${current.backdrop})` 
            }}
            className="absolute inset-0 bg-cover bg-center filter brightness-[0.4] contrast-[1.2] saturate-[1.2]"
          />
        </motion.div>
      </AnimatePresence>

      {/* CONTENT LAYER */}
      <div className="absolute inset-0 z-20 flex flex-col justify-center">
        <div className="max-w-[1600px] mx-auto w-full px-6 md:px-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
              }}
              style={{ opacity: opacityFade }}
            >
              {/* RANDOMIZED CATEGORY TAG */}
              <motion.div 
                variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}
                className="flex items-center gap-4 mb-8"
              >
                <div className="flex items-center gap-3 px-4 py-1.5 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-full shadow-2xl">
                  <Sparkles size={14} className="text-red-600 animate-pulse" />
                  <span className="text-[11px] font-black uppercase tracking-[0.5em] text-white/90">
                    {activeCategory}
                  </span>
                </div>
                <div className="h-[1px] w-12 bg-red-600/30" />
                <span className="text-red-600 text-[10px] font-black uppercase tracking-[0.4em]">
                  {Number(current.rating).toFixed(1)} SCORE
                </span>
              </motion.div>

              {/* DYNAMIC TITLE SPLIT */}
              <motion.div variants={{ hidden: { opacity: 0, x: -30 }, visible: { opacity: 1, x: 0 } }}>
                <h1 className="text-6xl md:text-[8rem] lg:text-[11rem] font-black uppercase leading-[0.8] tracking-tighter text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                    <span className="block">{current.title.split(' ')[0]}</span>
                    {current.title.includes(' ') && (
                      <span className="block font-thin italic opacity-90 text-red-600 mix-blend-screen">
                        {current.title.split(' ').slice(1).join(' ')}
                      </span>
                    )}
                </h1>
              </motion.div>

              {/* META INFO */}
              <motion.div 
                variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
                className="flex items-center gap-6 mt-10 mb-10 text-white/50 font-bold uppercase tracking-[0.3em] text-[10px]"
              >
                <span className="text-white">{current.year}</span>
                <div className="w-1.5 h-1.5 bg-red-600 rotate-45" />
                <span>{current.type === 'movie' ? 'Cinematic Feature' : 'Television Series'}</span>
                <div className="w-1.5 h-1.5 bg-red-600 rotate-45" />
                <span className="bg-red-600/10 text-red-500 px-3 py-1 rounded-sm border border-red-600/20">4K_ULTRA_HD</span>
              </motion.div>

              {/* ACTION BUTTONS */}
              <motion.div 
                variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }}
                className="flex flex-wrap items-center gap-5"
              >
                <Link to={`/details/${current.type}/${current.id}`}>
                  <motion.button 
                    whileHover={{ scale: 1.05, backgroundColor: "#fff", color: "#000", boxShadow: "0 0 50px rgba(255,255,255,0.3)" }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-5 bg-red-600 text-white px-14 py-7 rounded-full font-black uppercase tracking-widest text-xs shadow-[0_15px_40px_rgba(220,38,38,0.3)] transition-all duration-700"
                  >
                    <Play size={18} fill="currentColor" /> Play Production
                  </motion.button>
                </Link>
                
                <motion.button 
                  onClick={onSearchClick}
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.5)" }}
                  className="flex items-center gap-5 bg-transparent border border-white/10 text-white px-12 py-7 rounded-full font-black uppercase tracking-widest text-xs backdrop-blur-md transition-all duration-500"
                >
                  Explore Catalog <ArrowUpRight size={18} />
                </motion.button>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* 7-SLIDE PROGRESS INDICATORS */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-40 flex gap-3">
        {slides.map((_, i) => (
          <div 
            key={i} 
            onClick={() => setIndex(i)}
            className="relative h-[3px] w-14 bg-white/5 cursor-pointer overflow-hidden rounded-full"
          >
            {index === i && (
              <motion.div 
                initial={{ x: "-100%" }}
                animate={{ x: "0%" }}
                transition={{ duration: 6, ease: "linear" }}
                className="absolute inset-0 bg-red-600 shadow-[0_0_15px_#dc2626]"
              />
            )}
          </div>
        ))}
      </div>

      {/* GLASSY DECORATIVE STATS */}
      <div className="absolute bottom-12 left-20 z-40 hidden xl:flex gap-16 opacity-30">
        <StatItem icon={<Shield size={14} className="text-red-600"/>} text="ENCRYPTED_STREAM" />
        <StatItem icon={<Zap size={14} className="text-red-600"/>} text="LOW_LATENCY_VOD" />
        <StatItem icon={<Globe size={14} className="text-red-600"/>} text="MULTI_REGION_CDN" />
      </div>
    </div>
  );
};

const StatItem = ({ icon, text }) => (
  <div className="flex items-center gap-3 text-[10px] font-black tracking-[0.4em] text-white uppercase italic">
    {icon} {text}
  </div>
);

export default Hero;