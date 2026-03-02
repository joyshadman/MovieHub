import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Trash2, Play, Plus, Check, Trash, AlertTriangle, X } from 'lucide-react';
import { db } from '../components/firebase'; // Ensure correct path
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';
import MovieCard from '../components/MovieCard';
import toast from 'react-hot-toast';

const ContinueWatching = ({ user, onMovieClick }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [watchlist, setWatchlist] = useState([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [dragMoved, setDragMoved] = useState(false);

  useEffect(() => {
    if (!user) {
      setHistory([]);
      setWatchlist([]);
      setLoading(false);
      return;
    }

    const historyRef = doc(db, "history", user.uid);
    // Updated to "watchlists" to match MovieCard
    const listRef = doc(db, "watchlists", user.uid);

    const unsubHistory = onSnapshot(historyRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data().items || [];
        setHistory([...data].sort((a, b) => b.watchedAt - a.watchedAt));
      } else { 
        setHistory([]); 
      }
      setLoading(false);
    });

    const unsubWatchlist = onSnapshot(listRef, (docSnap) => {
      if (docSnap.exists()) {
        // Updated to "items" to match MovieCard
        setWatchlist(docSnap.data().items || []);
      }
    });

    return () => { 
      unsubHistory(); 
      unsubWatchlist(); 
    };
  }, [user]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragMoved(false);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
    scrollRef.current.style.scrollBehavior = 'auto';
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    if (Math.abs(walk) > 8) setDragMoved(true);
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (scrollRef.current) scrollRef.current.style.scrollBehavior = 'smooth';
  };

  const isMovieInList = (movieId) => watchlist.some(m => String(m.id) === String(movieId));

  const toggleWatchlist = async (movie, e) => {
    e.stopPropagation();
    if (dragMoved) return; 
    if (!user) return toast.error("Please login first");
    
    const listRef = doc(db, "watchlists", user.uid);
    try {
      if (isMovieInList(movie.id)) {
        const movieToRemove = watchlist.find(m => String(m.id) === String(movie.id));
        await updateDoc(listRef, { items: arrayRemove(movieToRemove) });
        toast.success("REMOVED FROM MY LIST");
      } else {
        await setDoc(listRef, { items: arrayUnion(movie) }, { merge: true });
        toast.success("ADDED TO MY LIST");
      }
    } catch (err) { 
      toast.error("SYNC ERROR"); 
    }
  };

  const deleteFromHistory = async (movieId, e) => {
    e.stopPropagation();
    if (dragMoved) return; 
    if (!user) return;
    try {
      const historyRef = doc(db, "history", user.uid);
      await updateDoc(historyRef, { items: history.filter(item => item.id !== movieId) });
      toast.success('DELETED FROM HISTORY');
    } catch (err) { 
      toast.error('DELETE ERROR'); 
    }
  };

  const clearAllHistory = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "history", user.uid), { items: [] });
      setIsConfirmOpen(false);
      toast.success('HISTORY WIPED');
    } catch (err) {
      toast.error('FAILED TO CLEAR');
    }
  };

  if (loading || history.length === 0) return null;

  return (
    <section className="relative px-4 md:px-12 mb-16 mt-24 overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
          <div className="p-2 bg-red-600/10 rounded-xl border border-red-600/20 shadow-[0_0_20px_rgba(220,38,38,0.2)]">
            <History className="text-red-600" size={20} />
          </div>
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-white">
            Continue <span className="text-red-600 italic underline decoration-red-600/30 underline-offset-8">Watching</span>
          </h2>
        </motion.div>

        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsConfirmOpen(true)} 
          className="group flex items-center gap-2 px-5 py-2 bg-white/5 hover:bg-red-600/10 border border-white/10 rounded-full transition-all backdrop-blur-md"
        >
          <Trash2 size={14} className="text-white/40 group-hover:text-red-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white">Clear All</span>
        </motion.button>
      </div>

      {/* DRAGGABLE ROW */}
      <div 
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex gap-6 overflow-x-auto pb-10 select-none cursor-grab active:cursor-grabbing hide-scrollbar ${isDragging ? 'scroll-auto' : 'scroll-smooth'}`}
      >
        <style>{`
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -webkit-overflow-scrolling: touch; }
        `}</style>
        
        <AnimatePresence mode='popLayout'>
          {history.map((movie, index) => (
            <motion.div 
              key={movie.id}
              layout
              initial={{ opacity: 0, scale: 0.9, x: 30 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.5, filter: 'blur(15px)' }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: index * 0.03 }}
              className="relative shrink-0 w-[170px] sm:w-[210px] md:w-[280px] group"
            >
              <div className="relative rounded-[2.2rem] overflow-hidden shadow-2xl border border-white/5 transition-all duration-700 group-hover:border-red-600/50">
                <MovieCard movie={movie} user={user} onClick={() => !dragMoved && onMovieClick(movie)} />
                
                {/* GLASSY OVERLAY (Secondary controls) */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xl flex flex-col items-center justify-center gap-6 p-4 opacity-0 pointer-events-none group-hover:pointer-events-auto transition-all duration-500"
                >
                  <div className="flex items-center gap-4">
                    <motion.button 
                      whileHover={{ scale: 1.2, rotate: 5 }} whileTap={{ scale: 0.8 }}
                      onClick={(e) => toggleWatchlist(movie, e)}
                      className="w-11 h-11 flex items-center justify-center rounded-full bg-white/10 border border-white/20 hover:bg-white/20"
                    >
                      {isMovieInList(movie.id) ? <Check size={20} className="text-red-500" /> : <Plus size={20} className="text-white" />}
                    </motion.button>

                    <motion.button 
                      whileHover={{ scale: 1.15, backgroundColor: '#dc2626' }} whileTap={{ scale: 0.9 }}
                      onClick={() => !dragMoved && onMovieClick(movie)}
                      className="w-16 h-16 flex items-center justify-center rounded-full bg-red-600 text-white shadow-[0_0_30px_rgba(220,38,38,0.4)]"
                    >
                      <Play size={28} fill="white" />
                    </motion.button>

                    <motion.button 
                      whileHover={{ scale: 1.2, rotate: -5 }} whileTap={{ scale: 0.8 }}
                      onClick={(e) => deleteFromHistory(movie.id, e)}
                      className="w-11 h-11 flex items-center justify-center rounded-full bg-white/10 border border-white/20 group/trash"
                    >
                      <Trash size={20} className="text-white/70 group-hover/trash:text-red-500 transition-colors" />
                    </motion.button>
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-[0.25em] text-white/90 text-center px-4 line-clamp-1">
                    {movie.title || movie.name}
                  </span>
                </motion.div>

                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 w-full h-1.5 bg-black/50 z-[60] overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${movie.progress || Math.floor(Math.random() * 50) + 40}%` }}
                    transition={{ duration: 1.5, ease: "circOut" }}
                    className="h-full bg-gradient-to-r from-red-900 via-red-600 to-red-400 shadow-[0_0_15px_#dc2626]"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* CONFIRMATION POPUP */}
      <AnimatePresence>
        {isConfirmOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsConfirmOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-600/20 blur-[80px] rounded-full" />
              
              <div className="relative z-10 text-center">
                <div className="w-16 h-16 bg-red-600/10 border border-red-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="text-red-600" size={32} />
                </div>
                
                <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Clear History?</h3>
                <p className="text-white/50 text-sm font-medium leading-relaxed mb-8">
                  This action cannot be undone. Your progress will be wiped clean.
                </p>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsConfirmOpen(false)}
                    className="flex-1 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all border border-white/5"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={clearAllHistory}
                    className="flex-1 py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all shadow-lg shadow-red-600/20"
                  >
                    Wipe it
                  </button>
                </div>
              </div>

              <button 
                onClick={() => setIsConfirmOpen(false)}
                className="absolute top-6 right-6 text-white/20 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default ContinueWatching;