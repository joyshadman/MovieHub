import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Search as SearchIcon, 
  Loader2, 
  Film, 
  Tv, 
  SlidersHorizontal, 
  X, 
  Activity,
  ArrowLeft
} from 'lucide-react';
import { movieApi } from '../services/movieApi';
import MovieCard from '../components/MovieCard';

const SearchPage = ({ onMovieClick, externalQuery = "" }) => {
  const [query, setQuery] = useState(externalQuery);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const navigate = useNavigate();

  // Sync internal query with Navbar query if provided
  useEffect(() => {
    if (externalQuery) setQuery(externalQuery);
  }, [externalQuery]);

  // Debounced Search Logic
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim().length > 2) {
        setIsLoading(true);
        try {
          const searchResults = await movieApi.search(query);
          // We keep the raw results; we'll handle type detection in the filter
          setResults(searchResults || []);
        } catch (error) {
          console.error("Search error:", error);
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      } else if (query.length === 0) {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  // FIXED Filter Logic: Checks both 'type' and 'media_type'
  const filteredResults = results.filter(item => {
    if (filter === "all") return true;
    const itemType = item.type || item.media_type || (item.first_air_date ? 'tv' : 'movie');
    return itemType === filter;
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#050505] pt-32 px-6 md:px-12 pb-20"
    >
      <div className="max-w-4xl mx-auto mb-16">
        
        {/* BACK BUTTON & HEADER */}
        <div className="flex items-center gap-6 mb-12">
          <motion.button
            whileHover={{ scale: 1.1, x: -5, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-white/40 hover:text-white transition-all shadow-2xl backdrop-blur-md"
          >
            <ArrowLeft size={20} />
          </motion.button>
          <div>
            <h2 className="text-white text-[10px] font-black uppercase tracking-[0.4em] opacity-30">Global Search</h2>
            <h1 className="text-white text-3xl font-black italic uppercase tracking-tighter">Discovery <span className="text-red-600">Portal</span></h1>
          </div>
        </div>

        {/* SEARCH INPUT AREA (Animated & Glassy) */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative group"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-violet-600 rounded-[2.5rem] blur opacity-10 group-focus-within:opacity-30 transition duration-500"></div>
          
          <div className="relative flex items-center bg-white/[0.02] border border-white/10 rounded-[2.2rem] px-8 py-6 backdrop-blur-3xl shadow-2xl transition-all group-focus-within:border-white/20">
            <SearchIcon className="text-red-600 mr-5 shrink-0" size={24} />
            <input 
              autoFocus
              type="text" 
              placeholder="Search movies, shows, or actors..."
              className="bg-transparent border-none outline-none w-full text-xl md:text-2xl font-black text-white placeholder:text-white/10 uppercase tracking-tighter"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <AnimatePresence>
              {query && (
                <motion.button 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => setQuery("")} 
                  className="p-2 bg-white/5 hover:bg-red-600 rounded-full text-white/40 hover:text-white transition-all"
                >
                  <X size={20} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* GLASSY FILTER CHIPS */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-4 mt-10 overflow-x-auto pb-4 scrollbar-hide"
        >
          <div className="flex items-center gap-3 px-5 py-3 border-r border-white/5 mr-2 shrink-0">
            <SlidersHorizontal size={14} className="text-red-600" />
            <span className="text-[9px] font-black uppercase text-white/40 tracking-widest">Type</span>
          </div>

          {[
            { id: 'all', label: 'All Signals', icon: <Activity size={12}/> },
            { id: 'movie', label: 'Movies', icon: <Film size={12}/> },
            { id: 'tv', label: 'TV Shows', icon: <Tv size={12}/> }
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilter(btn.id)}
              className={`flex items-center gap-3 px-8 py-3.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border shrink-0 ${
                filter === btn.id 
                ? 'bg-red-600 border-red-500 text-white shadow-[0_15px_30px_rgba(220,38,38,0.3)] scale-105' 
                : 'bg-white/[0.03] border-white/10 text-white/30 hover:border-white/30 hover:text-white hover:bg-white/[0.08] backdrop-blur-md'
              }`}
            >
              {btn.icon} {btn.label}
            </button>
          ))}
        </motion.div>
      </div>

      {/* RESULTS GRID */}
      <div className="max-w-7xl mx-auto">
        <AnimatePresence mode='wait'>
          {isLoading ? (
            <motion.div 
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-40"
            >
              <Loader2 className="w-16 h-16 text-red-600 animate-spin mb-6" />
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.8em] animate-pulse">Accessing Archive</p>
            </motion.div>
          ) : filteredResults.length > 0 ? (
            <motion.div 
              key="results"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
              }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-10"
            >
              {filteredResults.map((movie) => (
                <motion.div
                  key={movie.id}
                  layout
                  variants={{
                    hidden: { opacity: 0, scale: 0.9 },
                    visible: { opacity: 1, scale: 1 }
                  }}
                  whileHover={{ y: -10 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <MovieCard movie={movie} onClick={() => onMovieClick(movie)} />
                </motion.div>
              ))}
            </motion.div>
          ) : query.length > 2 ? (
            <motion.div 
              key="empty" 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="text-center py-48 bg-white/[0.01] border border-dashed border-white/10 rounded-[4rem] backdrop-blur-sm"
            >
              <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5">
                <X size={32} className="text-white/10" />
              </div>
              <p className="text-white/40 text-sm font-black uppercase tracking-[0.4em]">Zero Results for "{query}"</p>
              <p className="text-white/10 text-[10px] mt-4 uppercase font-bold tracking-widest">Adjust filters or search parameters</p>
            </motion.div>
          ) : (
            <motion.div 
              key="idle" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-center py-40"
            >
              <div className="flex justify-center gap-6 mb-8 opacity-10">
                <Film size={40} className="text-white" />
                <Tv size={40} className="text-white" />
                <Activity size={40} className="text-white" />
              </div>
              <p className="text-white/10 text-[11px] font-black uppercase tracking-[1.5em]">Awaiting Signal Input</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FOOTER FADE */}
      <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none z-10" />
    </motion.div>
  );
};

export default SearchPage;