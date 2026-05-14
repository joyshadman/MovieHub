import React, { useState, useEffect } from 'react';
import { motion as Motion, AnimatePresence, useReducedMotion } from 'framer-motion';
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
import DeviceModal from '../components/DeviceModal'; 

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

  const rowReveal = reducedMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.2 } },
      }
    : {
        hidden: { opacity: 0, y: 16 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] },
        },
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

  // 2. DATA FETCHING — show hero after trending loads; fill rows in the background
  useEffect(() => {
    let cancelled = false;

    const extractResults = (settled, idx) => {
      const r = settled[idx];
      if (!r || r.status !== 'fulfilled') return [];
      const v = r.value;
      return Array.isArray(v) ? v : v?.results || [];
    };

    const loadSecondary = () => {
      Promise.allSettled([
        movieApi.getTopRated('movie'),
        movieApi.getTopRated('tv'),
        movieApi.getByGenre(28),
        movieApi.getByGenre(35),
        movieApi.getByGenre(53),
        movieApi.getByGenre(27),
        movieApi.getBollywood(1),
        movieApi.getByGenre(10749),
        movieApi.getBanglaMovies(1),
        movieApi.getAnime('tv', 1),
        movieApi.getAnime('movie', 1),
      ]).then((results) => {
        if (cancelled) return;
        setTopRatedMovies(extractResults(results, 0));
        setTopRatedSeries(extractResults(results, 1));
        setActionMovies(extractResults(results, 2));
        setComedyMovies(extractResults(results, 3));
        setThrillerMovies(extractResults(results, 4));
        setHorrorMovies(extractResults(results, 5));
        setBollywood(extractResults(results, 6));
        setRomanceMovies(extractResults(results, 7));
        setBanglaMovies(extractResults(results, 8));
        setAnimeSeries(extractResults(results, 9));
        setAnimeMovies(extractResults(results, 10));
      });
    };

    (async () => {
      setLoading(true);
      try {
        const [tM, tS] = await Promise.all([
          movieApi.getTrending('movie'),
          movieApi.getTrending('tv'),
        ]);
        if (cancelled) return;
        setTrendingMovies(Array.isArray(tM) ? tM : []);
        setTrendingSeries(Array.isArray(tS) ? tS : []);
      } catch (err) {
        console.error('Home Data Fetch Error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
      loadSecondary();
    })();

    return () => {
      cancelled = true;
    };
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
      
      {/* Global First Time Visited / Sign up device check modal */}
      <DeviceModal />

      {/* GLOSSY AMBIENT BACKGROUND */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-red-600/10 blur-[100px] md:blur-[120px] rounded-full mix-blend-plus-lighter opacity-[0.18]" />
      </div>

      <main className="relative z-10 flex-grow">
        <AnimatePresence mode="wait">
          {loading ? (
            <Motion.div 
              key="loader"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0.12 : 0.2 }}
              className="h-screen flex flex-col items-center justify-center bg-[#020202] fixed inset-0 z-[200]"
            >
               <div className="w-12 h-12 border-2 border-white/10 border-t-red-600 rounded-full animate-spin" />
               <span className="mt-8 text-[8px] font-black uppercase tracking-[1.5em] text-white/30">Syncing Library</span>
            </Motion.div>
          ) : view === 'mylist' ? (
            /* MY LIST VIEW */
            <Motion.div 
              key="list" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: reducedMotion ? 0.12 : 0.2 }}
            >
              <MyList user={user} onMovieClick={handleMovieSelect} onBack={() => setView('home')} />
            </Motion.div>
          ) : (
            /* HOME VIEW */
            <Motion.div 
              key="home" 
              className="relative"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0.15 : 0.25 }}
            >
              <Hero
                movies={trendingMovies}
                onSearchClick={() => setIsSearchOpen(true)}
                onPlay={handlePlay}
                onInfo={handleMovieSelect}
              />

              <div className="relative mt-20 z-20 space-y-16 md:space-y-24 pb-40">
                {user && (
                  <Motion.div variants={rowReveal} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                    <ContinueWatching user={user} onMovieClick={handleMovieSelect} />
                  </Motion.div>
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
                  <Motion.div key={i} variants={rowReveal} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                    <MovieRow title={row.title} movies={row.data} onMovieClick={handleMovieSelect} />
                  </Motion.div>
                ))}
              </div>
            </Motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* OVERLAYS */}
      <AnimatePresence>
        {isSearchOpen && (
          <Motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.15 : 0.2 }}
            className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md"
          >
            <SearchPage onClose={() => setIsSearchOpen(false)} onMovieClick={handleMovieSelect} />
          </Motion.div>
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