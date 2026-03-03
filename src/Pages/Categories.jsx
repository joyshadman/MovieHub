import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sword, Zap, Ghost, Drama, Film, Heart, 
  ChevronLeft, Loader2, Sparkles, Search, 
  Compass, Music 
} from 'lucide-react';
import { movieApi } from '../services/movieApi';
import MovieCard from '../components/MovieCard';

const genreList = [
  { id: 'bollywood', name: 'Bollywood', icon: <Music size={24} />, color: 'from-orange-600/20' },
  { id: 28, name: 'Action', icon: <Sword size={24} />, color: 'from-red-600/20' },
  { id: 878, name: 'Sci-Fi', icon: <Zap size={24} />, color: 'from-blue-600/20' },
  { id: 27, name: 'Horror', icon: <Ghost size={24} />, color: 'from-purple-600/20' },
  { id: 35, name: 'Comedy', icon: <Drama size={24} />, color: 'from-yellow-600/20' },
  { id: 18, name: 'Drama', icon: <Film size={24} />, color: 'from-emerald-600/20' },
  { id: 10749, name: 'Romance', icon: <Heart size={24} />, color: 'from-pink-600/20' },
  { id: 16, name: 'Animation', icon: <Sparkles size={24} />, color: 'from-cyan-600/20' },
  { id: 9648, name: 'Mystery', icon: <Search size={24} />, color: 'from-indigo-600/20' },
];

const Categories = ({ user, onMovieClick }) => {
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const observer = useRef();

  // --- FIXED CLICK HANDLER ---
  const handleMovieClick = (movie) => {
    if (typeof onMovieClick === 'function') {
      onMovieClick(movie);
    } else {
      console.warn("Categories: onMovieClick prop is not a function", movie);
    }
  };

  // Fetch Logic
  const fetchMovies = async (genre, pageNum, isNewGenre = false) => {
    if (isLoading) return;
    setIsLoading(true);
    
    try {
        let data;
        // Check if selected category is Bollywood or a standard TMDB Genre
        if (genre.id === 'bollywood') {
            data = await movieApi.getBollywood(pageNum);
        } else {
            data = await movieApi.getByGenre(genre.id, "movie", pageNum);
        }

        setMovies(prev => isNewGenre ? data.results : [...prev, ...data.results]);
        // Support both data.totalPages and data.total_pages naming conventions
        const total = data.totalPages || data.total_pages || 1;
        setHasMore(pageNum < total);
    } catch (error) {
        console.error("Fetch failed", error);
    } finally {
        setIsLoading(false);
    }
  };

  // Infinite Scroll Observer
  const lastMovieElementRef = useCallback(node => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, hasMore]);

  // Effect to trigger fetch on genre or page change
  useEffect(() => {
    if (selectedGenre) {
      fetchMovies(selectedGenre, page, page === 1);
    }
  }, [selectedGenre, page]);

  const handleGenreSelect = (genre) => {
    setMovies([]);
    setPage(1);
    setHasMore(true);
    setSelectedGenre(genre);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-32 pb-20 px-6">
      <AnimatePresence mode="wait">
        {!selectedGenre ? (
          <motion.div 
            key="genres"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-7xl mx-auto"
          >
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-16 text-center md:text-left">
              <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-white">
                BROWSE <span className="text-red-600">GENRES</span>
              </h1>
              <div className="h-1 w-20 bg-red-600 mt-4 mx-auto md:mx-0 shadow-[0_0_15px_rgba(220,38,38,0.8)]" />
            </motion.div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {genreList.map((g, i) => (
                <motion.div
                  key={g.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  whileHover={{ scale: 1.05, y: -8 }}
                  onClick={() => handleGenreSelect(g)}
                  className="h-40 rounded-[2rem] bg-white/[0.03] border border-white/5 backdrop-blur-xl flex flex-col items-center justify-center gap-4 relative overflow-hidden group cursor-pointer transition-all shadow-2xl"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${g.color} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  <div className="text-red-600 relative z-10 group-hover:scale-110 transition-transform duration-500">
                    {g.icon}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] relative z-10 text-white/40 group-hover:text-white transition-colors">
                    {g.name}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="movies"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="max-w-[1600px] mx-auto"
          >
            <div className="flex items-center gap-6 mb-12">
              <motion.button 
                whileHover={{ scale: 1.1, backgroundColor: "rgba(220, 38, 38, 1)" }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedGenre(null)}
                className="p-4 rounded-2xl bg-white/5 border border-white/10 transition-all shadow-xl"
              >
                <ChevronLeft />
              </motion.button>
              <div>
                <h2 className="text-red-600 font-black uppercase tracking-[0.3em] text-[10px]">Data Stream</h2>
                <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">
                    {selectedGenre.name}
                </h1>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-8">
              {movies.map((movie, index) => (
                <div 
                  key={`${movie.id}-${index}`}
                  ref={movies.length === index + 1 ? lastMovieElementRef : null}
                >
                  <MovieCard 
                    movie={movie} 
                    user={user} 
                    onClick={() => handleMovieClick(movie)} 
                  />
                </div>
              ))}
            </div>

            {isLoading && (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-12 h-12 text-red-600 animate-spin mb-4 opacity-50" />
                <span className="text-[9px] font-black uppercase tracking-[0.6em] text-white/20 animate-pulse">Syncing Archive</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Categories;