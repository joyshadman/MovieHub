import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Film, Loader2, ArrowLeft, Heart } from 'lucide-react';
import { db } from '../components/firebase';
import { doc, onSnapshot, updateDoc, arrayRemove } from 'firebase/firestore';
import MovieCard from '../components/MovieCard';

const MyList = ({ user, onMovieClick, onBack }) => {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. REAL-TIME FIRESTORE SYNC
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "watchlists", user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setWatchlist(docSnap.data().items || []);
      }
      setLoading(false);
    }, (error) => {
      console.error("Watchlist sync error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // 2. REMOVE ITEM LOGIC
  const removeFromWatchlist = async (e, movie) => {
    e.stopPropagation(); // Prevents movie details from opening
    const userRef = doc(db, "watchlists", user.uid);
    try {
      await updateDoc(userRef, {
        items: arrayRemove(movie)
      });
    } catch (err) {
      console.error("Remove error:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-red-600 animate-spin mb-4 opacity-40" />
        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em]">Syncing Library</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] pt-28 px-6 md:px-12 pb-20">
      {/* HEADER SECTION */}
      <div className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-white/40 hover:text-white mb-4 transition-colors group pointer-events-auto"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Back to Catalog</span>
          </button>
          <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-white leading-none">
            MY <span className="text-red-600">WATCHLIST</span>
          </h1>
          <div className="h-1.5 w-24 bg-red-600 mt-4 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.5)]" />
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          className="flex items-center gap-4 text-white/20 bg-white/5 p-3 px-5 rounded-2xl border border-white/5 backdrop-blur-md"
        >
          <Heart size={20} className="text-red-600" />
          <span className="text-[11px] font-bold uppercase tracking-[0.2em]">{watchlist.length} Titles Saved</span>
        </motion.div>
      </div>

      {/* WATCHLIST GRID */}
      <div className="max-w-7xl mx-auto">
        <AnimatePresence mode="popLayout">
          {watchlist.length > 0 ? (
            <motion.div 
              layout
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6"
            >
              {watchlist.map((movie) => (
                <motion.div 
                  layout
                  key={movie.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                  className="relative group"
                >
                  <MovieCard 
                    movie={movie} 
                    onClick={() => onMovieClick(movie)} 
                  />
                  
                  {/* GLASSY DELETE BUTTON */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => removeFromWatchlist(e, movie)}
                    className="absolute top-3 right-3 z-50 p-2.5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full text-white/40 hover:text-white hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 shadow-2xl"
                    title="Remove from list"
                  >
                    <Trash2 size={16} />
                  </motion.button>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-32 flex flex-col items-center justify-center bg-white/[0.02] border border-dashed border-white/10 rounded-[3rem]"
            >
              <div className="p-6 bg-white/5 rounded-full mb-6 border border-white/5">
                <Film size={40} className="text-white/10" />
              </div>
              <h3 className="text-white font-black text-lg mb-2 uppercase tracking-tight italic">Your library is empty</h3>
              <p className="text-white/20 text-[10px] font-bold max-w-xs text-center leading-relaxed uppercase tracking-widest">
                Add movies and shows to your watchlist to keep track of what you want to stream.
              </p>
              <button 
                onClick={onBack}
                className="mt-8 px-8 py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-red-600 hover:text-white transition-all shadow-xl"
              >
                Browse Catalog
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MyList;