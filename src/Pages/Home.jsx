import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom'; // Added for routing
import { movieApi } from '../services/movieApi';
import { auth, db } from '../components/firebase'; 
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

// Components
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import MovieRow from '../components/MovieRow';
import MovieDetails from './MovieDetails';
import Watch from './Watch';
import SearchPage from './Search';
import MyList from './MyList';
import ContinueWatching from './ContinueWatching';
import Footer from '../components/Footer';

const Home = () => {
  const navigate = useNavigate(); // Hook for navigation
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Content States
  const [trending, setTrending] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [actionMovies, setActionMovies] = useState([]);
  const [comedyMovies, setComedyMovies] = useState([]);
  const [documentaries, setDocumentaries] = useState([]);
  const [horrorMovies, setHorrorMovies] = useState([]);
  const [history, setHistory] = useState([]); 

  const [playingMovie, setPlayingMovie] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- APPLE-STYLE PARALLAX ---
  const { scrollYProgress } = useScroll();
  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.2]);
  const bgOpacity = useTransform(scrollYProgress, [0, 0.5], [0.2, 0.5]);
  const heroBlur = useTransform(scrollYProgress, [0, 0.2], [0, 10]);

  const rowReveal = {
    hidden: { opacity: 0, y: 50, scale: 0.95, filter: "blur(10px)" },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1, 
      filter: "blur(0px)",
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } 
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
          movieApi.getTrending('movie'),
          movieApi.getTrending('tv'),
          movieApi.search('Action'),
          movieApi.search('Comedy'),
          movieApi.search('Documentary'),
          movieApi.search('Horror')
        ]);
        
        if (results[0].status === 'fulfilled') setTrending(results[0].value || []);
        if (results[1].status === 'fulfilled') setTopRated(results[1].value || []);
        if (results[2].status === 'fulfilled') setActionMovies(results[2].value || []);
        if (results[3].status === 'fulfilled') setComedyMovies(results[3].value || []);
        if (results[4].status === 'fulfilled') setDocumentaries(results[4].value || []);
        if (results[5].status === 'fulfilled') setHorrorMovies(results[5].value || []);
        
      } catch (err) { console.error(err); } 
      finally { 
        setTimeout(() => setLoading(false), 1200); 
      }
    };
    fetchContent();
  }, []);

  // FIXED: CENTRAL NAVIGATION HANDLER
  const handleMovieSelect = (movie) => {
    if (!movie || !movie.id) return;
    setIsSearchOpen(false); 
    
    // Determine type (movie or tv)
    const type = movie.type || (movie.first_air_date ? 'tv' : 'movie');
    
    // Navigate to the Detail Page Route
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
      
      {/* AMBIENT BACKGROUND */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div 
          style={{ scale: bgScale, opacity: bgOpacity }}
          className="absolute top-[-15%] left-[-10%] w-[70%] h-[70%] bg-red-600/15 blur-[160px] rounded-full mix-blend-screen" 
        />
      </div>

      <Navbar
        user={user}
        activeView={view}
        onSearchIconClick={() => setIsSearchOpen(true)}
        onHomeTrigger={() => { setView('home'); setIsSearchOpen(false); }}
        onListTrigger={() => { setView('mylist'); setIsSearchOpen(false); }}
        onMovieClick={handleMovieSelect} // Pass to navbar search
      />

      <main className="relative z-10 flex-grow">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loader"
              exit={{ opacity: 0, scale: 1.1, filter: "blur(30px)" }}
              className="h-screen flex flex-col items-center justify-center bg-[#020202] fixed inset-0 z-[200]"
            >
               <div className="relative">
                  <motion.div 
                    animate={{ rotate: 360 }} 
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} 
                    className="w-24 h-24 border-[2px] border-red-600 border-t-transparent rounded-full" 
                  />
               </div>
               <span className="mt-10 text-[10px] font-black uppercase tracking-[1.5em] text-white/20">Initializing</span>
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

              <div className="relative -mt-52 z-20 space-y-28 pb-40">
                <motion.div variants={rowReveal} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                  <ContinueWatching user={user} onMovieClick={handleMovieSelect} />
                </motion.div>

                <motion.div variants={rowReveal} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                  <MovieRow title="Global Trending" movies={trending} onMovieClick={handleMovieSelect} />
                </motion.div>
                
                <motion.div variants={rowReveal} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                  <MovieRow title="Laughter Therapy" movies={comedyMovies} onMovieClick={handleMovieSelect} />
                </motion.div>
                
                <motion.div variants={rowReveal} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                  <MovieRow title="Binge-Worthy Series" movies={topRated} onMovieClick={handleMovieSelect} />
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
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-3xl"
          >
            <SearchPage onClose={() => setIsSearchOpen(false)} onMovieClick={handleMovieSelect} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* WATCH OVERLAY (Still a modal for seamless playback) */}
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