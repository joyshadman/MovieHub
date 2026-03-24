import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
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
  // Ensure initial state is an empty array
  const [query, setQuery] = useState(externalQuery);
  const [results, setResults] = useState([]); 
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (externalQuery) setQuery(externalQuery);
  }, [externalQuery]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim().length > 1) {
        setIsLoading(true);
        try {
          const response = await movieApi.search(query);
          // API check: ensure we are setting an array
          const data = Array.isArray(response) ? response : (response?.results || []);
          setResults(data);
        } catch (error) {
          console.error("Search error:", error);
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      } else if (query.length === 0) {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const normalizeText = (value = "") =>
    value.toString().toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

  const rankByQuery = (items, q) => {
    const normalizedQuery = normalizeText(q);
    if (!normalizedQuery) return items;

    return [...items].sort((a, b) => {
      const aTitle = normalizeText(a.title || a.name || "");
      const bTitle = normalizeText(b.title || b.name || "");

      const score = (title, item) => {
        let s = 0;
        if (title === normalizedQuery) s += 100;
        if (title.startsWith(normalizedQuery)) s += 70;
        if (title.includes(normalizedQuery)) s += 40;
        const words = normalizedQuery.split(/\s+/).filter(Boolean);
        const matchedWords = words.filter(w => title.includes(w)).length;
        s += matchedWords * 10;
        s += Math.min(Number(item.rating || item.vote_average || 0), 10);
        return s;
      };

      return score(bTitle, b) - score(aTitle, a);
    });
  };

  // Memoized Filter with safety check + ranking
  const filteredResults = useMemo(() => {
    if (!Array.isArray(results)) return []; // Safety guard
    const filtered = results.filter(item => {
      if (filter === "all") return true;
      const itemType = item.type || item.media_type || (item.first_air_date ? 'tv' : 'movie');
      return itemType === filter;
    });
    return rankByQuery(filtered, query);
  }, [results, filter, query]);

  return (
    <div className="min-h-screen bg-[#050505] pt-20 md:pt-32 px-4 md:px-12 pb-10 relative">
      
      <div className="max-w-4xl mx-auto mb-8 md:mb-12">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-white/5 border border-white/10 rounded-xl text-white/50 active:scale-95 transition-transform"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-white text-xl md:text-3xl font-black uppercase tracking-tighter">
              Discovery <span className="text-red-600">Portal</span>
            </h1>
          </div>
        </div>

        <div className="relative z-20">
          <div className="relative flex items-center bg-[#111] border border-white/10 rounded-2xl px-5 py-4 shadow-xl focus-within:border-red-600/50 transition-colors">
            <SearchIcon className="text-red-600 mr-4 shrink-0" size={20} />
            <input 
              autoFocus
              type="text" 
              placeholder="Search..."
              className="bg-transparent border-none outline-none w-full text-lg md:text-xl font-bold text-white placeholder:text-white/20 uppercase tracking-tight"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button onClick={() => setQuery("")} className="ml-2 text-white/30 hover:text-white">
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-2 no-scrollbar">
          <div className="flex items-center gap-2 pr-3 border-r border-white/10 shrink-0">
            <SlidersHorizontal size={14} className="text-red-600" />
          </div>

          {[
            { id: 'all', label: 'All', icon: <Activity size={14}/> },
            { id: 'movie', label: 'Movies', icon: <Film size={14}/> },
            { id: 'tv', label: 'Shows', icon: <Tv size={14}/> }
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilter(btn.id)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
                filter === btn.id 
                ? 'bg-red-600 text-white shadow-lg' 
                : 'bg-white/5 text-white/40 border border-white/5'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <AnimatePresence mode='wait'>
          {isLoading ? (
            <motion.div 
              key="loader"
              initial={{ opacity: reducedMotion ? 1 : 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: reducedMotion ? 1 : 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
            </motion.div>
          ) : filteredResults.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-6">
              {filteredResults.map((movie) => (
                <div key={movie.id} className="transform-gpu">
                  <MovieCard movie={movie} onClick={() => onMovieClick(movie)} />
                </div>
              ))}
            </div>
          ) : query.length > 1 ? (
            <div className="text-center py-20 border border-white/5 rounded-3xl bg-white/[0.02]">
              <p className="text-white/40 text-xs font-black uppercase tracking-[0.3em]">No results for "{query}"</p>
            </div>
          ) : (
            <div className="text-center py-20 opacity-20">
              <p className="text-[10px] font-black uppercase tracking-[1em]">Ready for input</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black to-transparent pointer-events-none" />
    </div>
  );
};

export default SearchPage;