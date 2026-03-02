import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { auth } from './components/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Toaster } from 'react-hot-toast';

// Components & Pages
import Navbar from './components/Navbar';
import Home from './Pages/Home';
import SearchPage from './Pages/Search';
import MyList from './Pages/MyList';
import Categories from './Pages/Categories';
import About from './Pages/About';
import MovieDetails from './Pages/MovieDetails'; // Import your component

const AppContent = ({ user }) => {
  const navigate = useNavigate();

  const handleMovieClick = (movie) => {
    // Standardizes navigation across all pages
    navigate(`/${movie.type || 'movie'}/${movie.id}`);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-red-600 font-sans overflow-x-hidden">
      <Navbar user={user} />
      
      <main className="pt-24 md:pt-28">
        <Routes>
          <Route path="/" element={<Home user={user} onMovieClick={handleMovieClick} />} />
          <Route path="/search" element={<SearchPage user={user} onMovieClick={handleMovieClick} />} />
          <Route path="/mylist" element={<MyList user={user} onMovieClick={handleMovieClick} />} />
          <Route path="/categories" element={<Categories user={user} onMovieClick={handleMovieClick} />} />
          
          {/* FIXED: Using your MovieDetails component instead of placeholder div */}
          <Route path="/movie/:id" element={<MovieDetails user={user} />} />
          <Route path="/tv/:id" element={<MovieDetails user={user} />} />
          
          <Route path="/about" element={<About />} />
        </Routes>
      </main>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return null; 

  return (
    <Router>
      <Toaster position="bottom-right" />
      <AppContent user={user} />
    </Router>
  );
};

export default App;