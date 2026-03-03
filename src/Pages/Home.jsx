import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { movieApi } from '../services/movieApi';
import { auth, db } from '../components/firebase'; 
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

// Components
import Navbar from '../components/Navbar';
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
  const [view, setView] = useState('home');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Content States - Reordered based on your request
  const [trending, setTrending] = useState([]);
  const [actionMovies, setActionMovies] = useState([]);
  const [comedyMovies, setComedyMovies] = useState([]);
  const [thrillerMovies, setThrillerMovies] = useState([]);
  const [horrorMovies, setHorrorMovies] = useState([]);
  const [bollywood, setBollywood] = useState([]);
  const [romanceMovies, setRomanceMovies] = useState([]);
  const [history, setHistory] = useState([]); 

  const [playingMovie, setPlayingMovie] = useState(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        const historyRef = doc(db, "history", u.uid);
        const unsubscribeHistory = onSnapshot(historyRef, (docSnap) => {
          if (docSnap.exists()) {
            const historyData = docSnap.data().items || [];
            setHistory([...historyData].sort((a, b) => b.watchedAt - a.watchedAt));
          } else { setHistory([]); }
        });
        return () => unsubscribeHistory();
      } else { setHistory([]); }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      try {
        const results = await Promise.allSettled([
          movieApi.getTrending('movie'), // 0: Trending
          movieApi.getByGenre(28),       // 1: Action
          movieApi.getByGenre(35),       // 2: Comedy
          movieApi.getByGenre(53),       // 3: Thriller
          movieApi.getByGenre(27),       // 4: Horror
          movieApi.getBollywood(1),      // 5: Bollywood
          movieApi.getByGenre(10749),    // 6: Romance
        ]);
        
        const getVal = (idx) => (results[idx].status === 'fulfilled' ? results[idx].value.results : []);

        setTrending(getVal(0));
        setActionMovies(getVal(1));
        setComedyMovies(getVal(2));
        setThrillerMovies(getVal(3));
        setHorrorMovies(getVal(4));
        setBollywood(getVal(5));
        setRomanceMovies(getVal(6));
        
      } catch (err) { 
        console.error("Home Data Fetch Error:", err); 
      } finally { 
        setTimeout(() => setLoading(false), 1200); 
      }
    };
    fetchContent();
  }, []);

  const handleMovieSelect = (movie) => {
    if (!movie || !movie.id) return;
    setIsSearchOpen(false); 
    const type = movie.media_type || (movie.first_air_date ? 'tv' : 'movie');
    navigate(`/${type}/${movie.id}`);
  };
  
  const handlePlay = async (movie) => {
    setIsSearchOpen(false);
    setPlayingMovie(movie);

    if (user) {
      const historyRef = doc(db, "history", user.uid);
      const filtered = history.filter(item => item.id !== movie.id);
      const updated = [{ ...movie, watchedAt: Date.now() }, ...filtered].slice(0, 20);
      await setDoc(historyRef, { items: updated }, { merge: true });
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-red-600 font-sans overflow-x-hidden flex flex-col">
      
      {/* GLOSSY AMBIENT BACKGROUND */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div 
          style={{ scale: bgScale, opacity: bgOpacity }}
          className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-red-600/10 blur-[180px] rounded-full mix-blend-plus-lighter" 
        />
      </div>

      <Navbar
        user={user}
        activeView={view}
        onSearchIconClick={() => setIsSearchOpen(true)}
        onHomeTrigger={() => { setView('home'); setIsSearchOpen(false); }}
        onListTrigger={() => { setView('mylist'); setIsSearchOpen(false); }}
        onMovieClick={handleMovieSelect}
      />

      <main className="relative z-10 flex-grow">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loader"
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
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <MyList user={user} onMovieClick={handleMovieSelect} onBack={() => setView('home')} />
            </motion.div>
          ) : (
            <motion.div key="home" className="relative">
              
              <motion.div style={{ filter: `blur(${heroBlur}px)` }}>
                <Hero
                  movies={trending}
                  onSearchClick={() => setIsSearchOpen(true)}
                  onPlay={handlePlay}
                  onInfo={handleMovieSelect}
                />
              </motion.div>

              {/* REORDERED ROWS PER REQUEST */}
              <div className="relative mt-20 z-20 space-y-16 md:space-y-24 pb-40">
                
                <motion.div variants={rowReveal} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                  <ContinueWatching user={user} onMovieClick={handleMovieSelect} />
                </motion.div>

                {/* 1. Trending */}
                <motion.div variants={rowReveal} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                  <MovieRow title="Global Trending" movies={trending} onMovieClick={handleMovieSelect} />
                </motion.div>

                {/* 2. Action */}
                <motion.div variants={rowReveal} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                  <MovieRow title="Action Packed" movies={actionMovies} onMovieClick={handleMovieSelect} />
                </motion.div>

                {/* 3. Comedy */}
                <motion.div variants={rowReveal} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                  <MovieRow title="Comedy Central" movies={comedyMovies} onMovieClick={handleMovieSelect} />
                </motion.div>

                {/* 4. Thriller */}
                <motion.div variants={rowReveal} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                  <MovieRow title="Edge of Your Seat" movies={thrillerMovies} onMovieClick={handleMovieSelect} />
                </motion.div>

                {/* 5. Horror */}
                <motion.div variants={rowReveal} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                  <MovieRow title="Horror Essentials" movies={horrorMovies} onMovieClick={handleMovieSelect} />
                </motion.div>

                {/* 6. Bollywood */}
                <motion.div variants={rowReveal} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                  <MovieRow title="Bollywood Specials" movies={bollywood} onMovieClick={handleMovieSelect} />
                </motion.div>

                {/* 7. Romance */}
                <motion.div variants={rowReveal} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                  <MovieRow title="Romantic Escapes" movies={romanceMovies} onMovieClick={handleMovieSelect} />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* SEARCH OVERLAY */}
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

      {/* WATCH OVERLAY */}
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