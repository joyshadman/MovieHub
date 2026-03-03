import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
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

const AppContent = ({ user }) => {
  const navigate = useNavigate();

  // CENTRAL NAVIGATION LOGIC
  const handleMovieClick = (movie) => {
    if (!movie || !movie.id) return;

    // Determine if it's a movie or tv show
    const type = movie.media_type || (movie.first_air_date ? 'tv' : 'movie');
    const id = movie.id;

    // Navigate to the dynamic route
    navigate(`/${type}/${id}`);
  };

  // ADDED: Prevent "onWatchlistToggle is not a function" error
  const handleWatchlistToggle = (movie) => {
    console.log("Watchlist action:", movie);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar user={user} onMovieClick={handleMovieClick} />
      
      <main className="pt-20">
        <Routes>
          <Route path="/" element={<Home user={user} onMovieClick={handleMovieClick} />} />
          <Route path="/search" element={<SearchPage onMovieClick={handleMovieClick} />} />
          <Route path="/mylist" element={<MyList user={user} onMovieClick={handleMovieClick} />} />
          <Route path="/categories" element={<Categories onMovieClick={handleMovieClick} />} />
          <Route path="/about" element={<About />} />
          
          {/* Detailed Routes - Added onWatchlistToggle prop */}
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
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  return (
    <Router>
      <Toaster position="bottom-right" />
      <AppContent user={user} />
    </Router>
  );
};

export default App;