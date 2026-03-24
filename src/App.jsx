/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { auth } from './components/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Toaster } from 'react-hot-toast';

// Pages
import Navbar from './components/Navbar';
import Home from './Pages/Home';
import SearchPage from './Pages/Search';
import MyList from './Pages/MyList';
import Categories from './Pages/Categories';
import MovieDetails from './Pages/MovieDetails';
import About from './Pages/About';

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
      
      <main className="pt-20">
        <Routes>
          {/* Main Pages */}
          <Route path="/" element={<Home user={user} onMovieClick={handleMovieClick} />} />
          <Route path="/search" element={<SearchPage onMovieClick={handleMovieClick} />} />
          <Route path="/mylist" element={<MyList user={user} onMovieClick={handleMovieClick} />} />
          <Route path="/categories" element={<Categories onMovieClick={handleMovieClick} />} />
          <Route path="/about" element={<About />} />
          
          {/* DYNAMIC DETAILS ROUTE 
              Matches the <Link to={`/details/${current.type}/${current.id}`}> in Hero.jsx
          */}
          <Route 
            path="/details/:type/:id" 
            element={<MovieDetails user={user} onWatchlistToggle={handleWatchlistToggle} />} 
          />

          {/* Fallback Legacy Routes (Optional) */}
          <Route 
            path="/movie/:id" 
            element={<MovieDetails user={user} onWatchlistToggle={handleWatchlistToggle} />} 
          />
          <Route 
            path="/tv/:id" 
            element={<MovieDetails user={user} onWatchlistToggle={handleWatchlistToggle} />} 
          />
        </Routes>
      </main>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
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