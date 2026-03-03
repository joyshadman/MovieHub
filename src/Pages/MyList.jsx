/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Film, Loader2, ArrowLeft, Heart, Sparkles, LayoutGrid } from 'lucide-react';
import { db } from '../components/firebase';
import { doc, onSnapshot, updateDoc, arrayRemove } from 'firebase/firestore';
import MovieCard from '../components/MovieCard';

const MyList = ({ user, onMovieClick, onBack }) => {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const removeFromWatchlist = async (e, movie) => {
    e.stopPropagation();
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
      <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center">
        <div className="relative">
          <Loader2 className="w-16 h-16 text-red-600 animate-spin mb-4 opacity-20" />
          <div className="absolute inset-0 blur-xl bg-red-600/20 animate-pulse rounded-full" />
        </div>
        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.8em] animate-pulse">Initializing Library</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-red-600/30">
      {/* BACKGROUND MESH GLOW */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-red-900/10 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-blue-900/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 pt-32 px-6 md:px-12 pb-20 max-w-[1800px] mx-auto">
        
        {/* EDITORIAL HEADER */}
        <header className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div className="space-y-6">
            <motion.button 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={onBack}
              className="flex items-center gap-3 text-white/30 hover:text-red-500 transition-all group"
            >
            </motion.button>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <Sparkles size={16} className="text-red-600" />
                <span className="text-red-600 text-[10px] font-black uppercase tracking-[0.4em]">Personal Collection</span>
              </div>
              <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-[0.85]">
                MY <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/20">WATCHLIST</span>
              </h1>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-end"
          >
            <div className="flex items-center gap-6 bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-2 pr-6 rounded-[2rem]">
              <div className="h-12 w-12 rounded-full bg-red-600 flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.4)]">
                <LayoutGrid size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black italic leading-none">{watchlist.length}</span>
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Saved Titles</span>
              </div>
            </div>
          </motion.div>
        </header>

        {/* CONTENT GRID */}
        <div className="relative">
          <AnimatePresence mode="popLayout">
            {watchlist.length > 0 ? (
              <motion.div 
                layout
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-x-6 gap-y-10"
              >
                {watchlist.map((movie, idx) => (
                  <motion.div 
                    layout
                    key={movie.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                    className="relative group"
                  >
                    <div className="relative rounded-[2rem] transition-transform duration-500 group-hover:-translate-y-2 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
                      <MovieCard 
                        movie={movie} 
                        onClick={() => onMovieClick(movie)} 
                      />
                      
                      <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      
                      <motion.button
                        whileHover={{ scale: 1.1, backgroundColor: '#dc2626' }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => removeFromWatchlist(e, movie)}
                        className="absolute top-4 right-4 z-[60] p-3 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl text-white/40 hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-2xl pointer-events-auto"
                      >
                        <Trash2 size={16} />
                      </motion.button>
                    </div>

                    <div className="mt-4 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                       <p className="text-[10px] font-black uppercase tracking-tighter text-red-600 truncate">{movie.title}</p>
                       <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">{movie.year}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-40 flex flex-col items-center justify-center rounded-[4rem] bg-white/[0.02] border border-white/5 relative overflow-hidden"
              >
                <div className="relative z-10 flex flex-col items-center text-center px-6">
                  <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-8 border border-white/10 shadow-inner">
                    <Film size={32} className="text-white/10" />
                  </div>
                  <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-4">The screen is dark</h3>
                  <p className="text-white/30 text-xs font-medium max-w-sm mb-10 leading-relaxed uppercase tracking-[0.2em]">
                    Your private collection is waiting for its first masterpiece.
                  </p>
                  <button 
                    onClick={onBack}
                    className="group relative px-10 py-4 bg-white text-black text-[11px] font-black uppercase tracking-[0.3em] rounded-full overflow-hidden transition-all hover:pr-14"
                  >
                    <span className="relative z-10">Start Discovering</span>
                    <ArrowLeft className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 rotate-180 transition-all" size={16} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default MyList;