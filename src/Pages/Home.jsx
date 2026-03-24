/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { movieApi } from '../services/movieApi';
import { auth, db } from '../components/firebase'; 
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

// Components
import Hero from '../components/Hero';
import MovieRow from '../components/MovieRow';
import Footer from '../components/Footer';
import Watch from './Watch';
import SearchPage from './Search';
import MyList from './MyList';
import ContinueWatching from './ContinueWatching';

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home'); // 'home' or 'mylist'
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Content States
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [trendingSeries, setTrendingSeries] = useState([]);
  const [topRatedMovies, setTopRatedMovies] = useState([]);
  const [topRatedSeries, setTopRatedSeries] = useState([]);
  const [actionMovies, setActionMovies] = useState([]);
  const [comedyMovies, setComedyMovies] = useState([]);
  const [thrillerMovies, setThrillerMovies] = useState([]);
  const [horrorMovies, setHorrorMovies] = useState([]);
  const [bollywood, setBollywood] = useState([]);
  const [banglaMovies, setBanglaMovies] = useState([]);
  const [animeSeries, setAnimeSeries] = useState([]);
  const [animeMovies, setAnimeMovies] = useState([]);
  const [romanceMovies, setRomanceMovies] = useState([]);
  const [history, setHistory] = useState([]); 

  const [playingMovie, setPlayingMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const reducedMotion = useReducedMotion();

  // --- APPLE-STYLE PARALLAX ---
  const { scrollYProgress } = useScroll();
  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.2]);
  const bgOpacity = useTransform(scrollYProgress, [0, 0.5], [0.15, 0.4]);
  const heroBlur = useTransform(scrollYProgress, [0, 0.2], [0, 8]);

  const rowReveal = {
    hidden: { opacity: 0, y: 40, filter: "blur(10px)" },
    visible: { 
      opacity: 1, 
      y: 0, 
      filter: "blur(0px)",
      transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] } 
    }
  };

  // 1. AUTH & HISTORY SYNC
  useEffect(() => {
    let unsubscribeHistory = null;
    const unsubscribeAuth = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (unsubscribeHistory) {
        unsubscribeHistory();
        unsubscribeHistory = null;
      }
      if (u) {
        const historyRef = doc(db, "history", u.uid);
        unsubscribeHistory = onSnapshot(historyRef, (docSnap) => {
          if (docSnap.exists()) {
            const historyData = docSnap.data().items || [];
            setHistory([...historyData].sort((a, b) => b.watchedAt - a.watchedAt));
          } else { 
            setHistory([]); 
          }
        });
      } else { 
        setHistory([]); 
      }
    });
    return () => {
      if (unsubscribeHistory) unsubscribeHistory();
      unsubscribeAuth();
    };
  }, []);

  // 2. DATA FETCHING
  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      try {
        const results = await Promise.allSettled([
          movieApi.getTrending('movie'),      // 0
          movieApi.getTrending('tv'),         // 1
          movieApi.getTopRated('movie'),      // 2
          movieApi.getTopRated('tv'),         // 3
          movieApi.getPopular('tv'),          // 4
          movieApi.getByGenre(28),            // 5
          movieApi.getByGenre(35),            // 6
          movieApi.getByGenre(53),            // 7
          movieApi.getByGenre(27),            // 8
          movieApi.getBollywood(1),           // 9
          movieApi.getByGenre(10749),         // 10
          movieApi.getBanglaMovies(1),        // 11
          movieApi.getAnime('tv', 1),         // 12
          movieApi.getAnime('movie', 1),      // 13
        ]);
        
        const getVal = (idx) => (results[idx].status === 'fulfilled'
          ? (Array.isArray(results[idx].value) ? results[idx].value : results[idx].value.results || [])
          : []
        );

        setTrendingMovies(getVal(0));
        setTrendingSeries(getVal(1));
        setTopRatedMovies(getVal(2));
        setTopRatedSeries(getVal(3));
        setActionMovies(getVal(5));
        setComedyMovies(getVal(6));
        setThrillerMovies(getVal(7));
        setHorrorMovies(getVal(8));
        setBollywood(getVal(9));
        setRomanceMovies(getVal(10));
        setBanglaMovies(getVal(11));
        setAnimeSeries(getVal(12));
        setAnimeMovies(getVal(13));

        // Optionally: prepend a "Popular Series" rail after trending rows
        // We'll pass it down in the rows mapping below using a local variable.
        
      } catch (err) { 
        console.error("Home Data Fetch Error:", err); 
      } finally { 
        setTimeout(() => setLoading(false), 1200); 
      }
    };
    fetchContent();
  }, []);

  // 3. HANDLERS
  const handleMovieSelect = (movie) => {
    if (!movie || !movie.id) return;
    setIsSearchOpen(false); 
    const type = movie.type || movie.media_type || (movie.first_air_date ? 'tv' : 'movie');
    navigate(`/${type}/${movie.id}`);
  };
  
  const handlePlay = async (movie) => {
    setIsSearchOpen(false);
    setPlayingMovie(movie);

    if (user) {
      const historyRef = doc(db, "history", user.uid);
      const movieType = movie.type || movie.media_type || (movie.first_air_date ? 'tv' : 'movie');
      const existingItem = history.find(
        item =>
          String(item.id) === String(movie.id) &&
          (item.type || (item.first_air_date ? 'tv' : 'movie')) === movieType
      );

      const isTV = movie.type === 'tv' || movie.media_type === 'tv' || !!movie.first_air_date;

      // Normalize shape so ContinueWatching & WatchPage see consistent fields
      const movieData = { 
        ...movie,
        id: movie.id,
        type: isTV ? 'tv' : 'movie',
        title: movie.title || movie.name,
        // Derive TMDB-style paths from full URLs when needed
        poster_path: movie.poster_path || (movie.image?.includes('/t/p/w500') 
          ? movie.image.replace('https://image.tmdb.org/t/p/w500', '') 
          : movie.poster_path),
        backdrop_path: movie.backdrop_path || (movie.backdrop?.includes('/t/p/original') 
          ? movie.backdrop.replace('https://image.tmdb.org/t/p/original', '') 
          : movie.backdrop_path),
        release_date: movie.release_date || movie.year,
        first_air_date: isTV ? (movie.first_air_date || movie.year) : null,
        watchedAt: Date.now(),
        progress: existingItem?.progress || 0,
        lastSeason: existingItem?.lastSeason || (isTV ? 1 : null),
        lastEpisode: existingItem?.lastEpisode || (isTV ? 1 : null)
      };

      const filtered = history.filter(
        item =>
          !(String(item.id) === String(movie.id) &&
          (item.type || (item.first_air_date ? 'tv' : 'movie')) === movieType)
      );
      const updated = [movieData, ...filtered].slice(0, 20);
      
      await setDoc(historyRef, { items: updated }, { merge: true });
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-red-600 font-sans overflow-x-hidden flex flex-col">
      
      {/* GLOSSY AMBIENT BACKGROUND */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div 
          style={{ scale: reducedMotion ? 1 : bgScale, opacity: reducedMotion ? 0.2 : bgOpacity }}
          className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-red-600/10 blur-[180px] rounded-full mix-blend-plus-lighter" 
        />
      </div>


      <main className="relative z-10 flex-grow">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loader"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.05, filter: "blur(20px)" }}
              className="h-screen flex flex-col items-center justify-center bg-[#020202] fixed inset-0 z-[200]"
            >
               <motion.div 
                 animate={{ rotate: 360 }} 
                 transition={{ repeat: Infinity, duration: 1, ease: "linear" }} 
                 className="w-16 h-16 border-t-2 border-red-600 rounded-full" 
               />
               <span className="mt-8 text-[8px] font-black uppercase tracking-[1.5em] text-white/30">Syncing Library</span>
            </motion.div>
          ) : view === 'mylist' ? (
            /* MY LIST VIEW */
            <motion.div 
              key="list" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <MyList user={user} onMovieClick={handleMovieSelect} onBack={() => setView('home')} />
            </motion.div>
          ) : (
            /* HOME VIEW */
            <motion.div 
              key="home" 
              className="relative"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div style={{ filter: reducedMotion ? 'none' : `blur(${heroBlur}px)` }}>
                <Hero
                  movies={trendingMovies}
                  onSearchClick={() => setIsSearchOpen(true)}
                  onPlay={handlePlay}
                  onInfo={handleMovieSelect}
                />
              </motion.div>

              <div className="relative mt-20 z-20 space-y-16 md:space-y-24 pb-40">
                {user && (
                  <motion.div variants={rowReveal} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                    <ContinueWatching user={user} onMovieClick={handleMovieSelect} />
                  </motion.div>
                )}

                {[
                  { title: "Global Trending", data: trendingMovies },
                  { title: "Trending Series", data: trendingSeries },
                  { title: "Top Rated Movies", data: topRatedMovies },
                  { title: "Top Rated Series", data: topRatedSeries },
                  { title: "Action Packed", data: actionMovies },
                  { title: "Comedy Central", data: comedyMovies },
                  { title: "Edge of Your Seat", data: thrillerMovies },
                  { title: "Horror Essentials", data: horrorMovies },
                  { title: "Bollywood Specials", data: bollywood },
                  { title: "Bangla Movies", data: banglaMovies },
                  { title: "Anime Series", data: animeSeries },
                  { title: "Anime Movies", data: animeMovies },
                  { title: "Romantic Escapes", data: romanceMovies }
                ].map((row, i) => (
                  <motion.div key={i} variants={rowReveal} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                    <MovieRow title={row.title} movies={row.data} onMovieClick={handleMovieSelect} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* OVERLAYS */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-3xl"
          >
            <SearchPage onClose={() => setIsSearchOpen(false)} onMovieClick={handleMovieSelect} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {playingMovie && (
          <Watch movie={playingMovie} user={user} onClose={() => setPlayingMovie(null)} />
        )}
      </AnimatePresence>

      <Footer/>
    </div>
  );
};

export default Home;