import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from './components/firebase';
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Toaster } from 'react-hot-toast';

import Navbar from './components/Navbar';

const Home = lazy(() => import('./Pages/Home'));
const SearchPage = lazy(() => import('./Pages/Search'));
const MyList = lazy(() => import('./Pages/MyList'));
const Categories = lazy(() => import('./Pages/Categories'));
const MovieDetails = lazy(() => import('./Pages/MovieDetails'));
const About = lazy(() => import('./Pages/About'));

const RouteFallback = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center bg-[#050505] text-white gap-4 px-6">
    <div className="h-9 w-9 border-2 border-white/15 border-t-red-600 rounded-full animate-spin" />
    <p className="text-[9px] font-black uppercase tracking-[0.35em] text-white/35">Loading</p>
  </div>
);

/**
 * Helper component to ensure page starts at top on navigation
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const AppContent = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user) return;

    setDoc(
      doc(db, "users", user.uid),
      {
        displayName: user.displayName || "Anonymous",
        email: user.email || null,
        photoURL: user.photoURL || null,
        isOnline: true,
        currentPage: location.pathname,
        watching: `Browsing ${location.pathname}`,
        lastActive: serverTimestamp(),
      },
      { merge: true }
    ).catch((err) => console.error("Page tracking error:", err));
  }, [user, location.pathname]);

  // CENTRAL NAVIGATION LOGIC
  // This handles clicks from Hero, Search, or Grid items
  const handleMovieClick = (movie) => {
    if (!movie || !movie.id) return;

    // Determine if it's a movie or tv show
    const type = movie.type || movie.media_type || (movie.first_air_date ? 'tv' : 'movie');
    const id = movie.id;

    // Navigate to the dynamic route used by your Hero component
    navigate(`/details/${type}/${id}`);
  };

  // Watchlist Toggle Logic (placeholder or Firebase logic)
  const handleWatchlistToggle = (movie) => {
    console.log("Watchlist action for:", movie.title || movie.name);
    // Add your Firebase Firestore logic here
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <ScrollToTop />
      <Navbar user={user} onMovieClick={handleMovieClick} />
      
      <main className="">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home user={user} onMovieClick={handleMovieClick} />} />
            <Route path="/search" element={<SearchPage onMovieClick={handleMovieClick} />} />
            <Route path="/mylist" element={<MyList user={user} onMovieClick={handleMovieClick} />} />
            <Route path="/categories" element={<Categories onMovieClick={handleMovieClick} />} />
            <Route path="/about" element={<About />} />
            <Route
              path="/details/:type/:id"
              element={<MovieDetails user={user} onWatchlistToggle={handleWatchlistToggle} />}
            />
            <Route
              path="/movie/:id"
              element={<MovieDetails user={user} onWatchlistToggle={handleWatchlistToggle} />}
            />
            <Route
              path="/tv/:id"
              element={<MovieDetails user={user} onWatchlistToggle={handleWatchlistToggle} />}
            />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    getRedirectResult(auth).catch((err) => console.error('Redirect sign-in:', err));
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  return (
    <Router>
      <Toaster 
        position="bottom-right" 
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }
        }}
      />
      <AppContent user={user} />
    </Router>
  );
};

export default App;