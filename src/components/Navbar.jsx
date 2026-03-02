import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { 
  Search, LogOut, Play, Star, X, 
  Loader2, ShieldCheck, Home, LayoutGrid, Info, ChevronDown
} from 'lucide-react';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { movieApi } from '../services/movieApi';
import MovieCard from '../components/MovieCard';

const Navbar = ({ onMovieClick }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  
  const navigate = useNavigate();
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll);
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) setShowAuthModal(false);
    });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      unsubscribe();
    };
  }, []);

  // Search Logic (Debounced)
  useEffect(() => {
    if (!isSearchActive) return;
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim().length > 2) {
        setIsLoading(true);
        try {
          const searchResults = await movieApi.search(query);
          setResults(searchResults || []);
        } catch (error) {
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [query, isSearchActive]);

  const closeSearch = () => {
    setIsSearchActive(false);
    setQuery("");
    setResults([]);
  };

  // --- FIXED MOVIE SELECTION ---
  const handleResultClick = (movie) => {
    const formatted = {
      ...movie,
      image: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : movie.image,
      backdrop: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : movie.backdrop,
      type: movie.media_type || (movie.first_air_date ? 'tv' : 'movie'),
      title: movie.title || movie.name
    };
    onMovieClick(formatted);
    closeSearch();
  };

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setShowUserMenu(false);
    navigate('/');
  };

  const navItems = [
    { name: 'Home', path: '/', icon: <Home size={16} /> },
    { name: 'Categories', path: '/categories', icon: <LayoutGrid size={16} /> },
    { name: 'About', path: '/about', icon: <Info size={16} /> },
  ];

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[110] p-4 flex justify-center pointer-events-none">
        <motion.nav 
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className={`
            pointer-events-auto flex items-center justify-between gap-4 px-4 py-2 rounded-[2.5rem] 
            transition-all duration-700 border border-white/10
            ${isScrolled || isSearchActive 
              ? 'w-full md:w-[95%] lg:w-[85%] bg-white/[0.03] backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)]' 
              : 'w-full md:w-[90%] lg:w-[75%] bg-white/[0.01] backdrop-blur-md'
            }
          `}
        >
          {/* LOGO */}
          <Link to="/" onClick={closeSearch} className="flex items-center gap-2 group shrink-0 ml-1">
            <div className="bg-red-600/20 backdrop-blur-xl p-2 rounded-2xl border border-red-600/30 shadow-[0_0_20px_rgba(220,38,38,0.2)] group-hover:bg-red-600 transition-all duration-500">
              <Play size={18} fill="white" className="text-white" />
            </div>
            <h1 className="text-[11px] font-black italic tracking-tighter text-white uppercase hidden sm:block">
              MOVIE<span className="text-red-600">HUB</span>
            </h1>
          </Link>

          {/* MAIN NAVIGATION LINKS */}
          <div className="hidden md:flex items-center bg-white/[0.03] backdrop-blur-2xl rounded-full p-1 border border-white/10">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeSearch}
                className={({ isActive }) => `
                  flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all
                  ${isActive 
                    ? 'bg-white/10 text-white shadow-xl' 
                    : 'text-white/30 hover:text-white hover:bg-white/5'}
                `}
              >
                {item.icon}
                {item.name}
              </NavLink>
            ))}
          </div>

          {/* SEARCH BAR */}
          <div className="flex-1 max-w-sm relative">
            <div className="relative flex items-center group">
              <Search className={`absolute left-4 transition-colors ${isSearchActive ? 'text-red-600' : 'text-white/20'}`} size={16} />
              <input 
                ref={searchInputRef}
                type="text"
                placeholder="Find movies..."
                className="w-full bg-white/[0.02] border border-white/10 rounded-full py-2.5 pl-11 pr-10 text-[11px] text-white placeholder:text-white/20 transition-all focus:bg-white/[0.08] focus:border-red-600/50 outline-none backdrop-blur-xl"
                value={query}
                onFocus={() => setIsSearchActive(true)}
                onChange={(e) => setQuery(e.target.value)}
              />
              <AnimatePresence>
                {isSearchActive && (
                  <motion.button 
                    initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    onClick={closeSearch} 
                    className="absolute right-3 p-1.5 bg-white/10 rounded-full text-white/40 hover:text-white"
                  >
                    <X size={12} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* USER SYSTEM */}
          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <div className="relative">
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1 bg-white/[0.03] border border-white/10 rounded-full hover:bg-white/10 transition-all backdrop-blur-2xl"
                >
                  <img src={user.photoURL} alt="pfp" className="w-8 h-8 rounded-full border border-white/20" />
                  <ChevronDown size={14} className={`text-white/40 pr-1 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </motion.button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div 
                      initial={{ opacity: 0, y: 15, scale: 0.95 }} 
                      animate={{ opacity: 1, y: 0, scale: 1 }} 
                      exit={{ opacity: 0, y: 15, scale: 0.95 }}
                      className="absolute right-0 mt-4 w-56 bg-black/40 backdrop-blur-[50px] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.5)] z-[120]"
                    >
                      <div className="md:hidden p-2 border-b border-white/5 flex flex-col gap-1">
                         {navItems.map(item => (
                           <Link key={item.path} to={item.path} onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-3 text-[10px] font-bold text-white/40 hover:text-white rounded-2xl hover:bg-white/5 uppercase">
                             {item.icon} {item.name}
                           </Link>
                         ))}
                      </div>
                      <Link to="/mylist" onClick={() => setShowUserMenu(false)} className="w-full flex items-center gap-3 px-6 py-5 text-[10px] uppercase font-black text-white/40 hover:text-white hover:bg-white/5 transition-all">
                        <Star size={16} className="text-red-600" /> My Library
                      </Link>
                      <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-6 py-5 text-[10px] uppercase font-black text-red-500 hover:bg-red-500/10 transition-all border-t border-white/5">
                        <LogOut size={16} /> Exit System
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAuthModal(true)}
                className="bg-red-600/90 hover:bg-red-600 text-white px-7 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-600/20 backdrop-blur-md transition-all"
              >
                Sign In
              </motion.button>
            )}
          </div>
        </motion.nav>
      </div>

      {/* SEARCH OVERLAY */}
      <AnimatePresence>
        {isSearchActive && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/[0.02] backdrop-blur-[100px] pt-32 px-6 pb-20 overflow-y-auto"
          >
            <div className="max-w-4xl mx-auto mb-16 flex justify-center gap-4">
              {['all', 'movie', 'tv'].map((id) => (
                <button
                  key={id}
                  onClick={() => setFilter(id)}
                  className={`px-10 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border transition-all ${
                    filter === id 
                    ? 'bg-red-600 border-red-500 text-white shadow-[0_0_30px_rgba(220,38,38,0.3)]' 
                    : 'bg-white/[0.03] border-white/10 text-white/30 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {id}
                </button>
              ))}
            </div>

            <div className="max-w-7xl mx-auto">
              {isLoading ? (
                <div className="flex flex-col items-center py-40">
                  <Loader2 className="w-12 h-12 text-red-600 animate-spin mb-6" />
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] animate-pulse">Scanning Grid</p>
                </div>
              ) : (
                <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
                  {results
                    .filter(i => filter === "all" || (i.media_type || (i.first_air_date ? 'tv' : 'movie')) === filter)
                    .map((movie) => (
                      <MovieCard key={movie.id} movie={movie} onClick={() => handleResultClick(movie)} />
                    ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AUTH MODAL */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white/[0.02] backdrop-blur-[60px] border border-white/10 rounded-[3rem] p-12 text-center shadow-[0_50px_100px_rgba(0,0,0,0.5)]"
            >
              <div className="bg-red-600/20 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-600/30">
                <ShieldCheck size={32} className="text-red-600" />
              </div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-2">Access Portal</h2>
              <p className="text-white/30 text-[10px] uppercase font-bold tracking-widest mb-10 leading-loose">
                Sign in to sync your library <br /> across the MovieHub node.
              </p>
              <button 
                onClick={signIn}
                className="w-full flex items-center justify-center gap-4 bg-white text-black py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] transition-transform shadow-2xl"
              >
                Continue with Google
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;