/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Trash2, Play, AlertTriangle, X } from 'lucide-react';
import { db } from '../components/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const ContinueWatching = ({ user, onMovieClick }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [hasMoved, setHasMoved] = useState(false); // Threshold flag
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchScrollLeft, setTouchScrollLeft] = useState(0);

  useEffect(() => {
    if (!user) {
      setHistory([]);
      setLoading(false);
      return;
    }

    const historyRef = doc(db, "history", user.uid);
    const unsubHistory = onSnapshot(historyRef, (docSnap) => {
      if (docSnap.exists()) {
        const items = docSnap.data().items || [];
        setHistory([...items].sort((a, b) => b.watchedAt - a.watchedAt));
      } else {
        setHistory([]);
      }
      setLoading(false);
    });

    return () => unsubHistory();
  }, [user?.uid]);

  // --- DRAG LOGIC WITH CLICK PROTECTION ---
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setHasMoved(false); // Reset movement on new click
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    
    // If moved more than 5px, mark as drag to disable click
    if (Math.abs(x - startX) > 5) {
      setHasMoved(true);
    }
    
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (!scrollRef.current) return;
    setHasMoved(false);
    setTouchStartX(e.touches[0].clientX);
    setTouchScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleTouchMove = (e) => {
    if (!scrollRef.current) return;
    const x = e.touches[0].clientX;
    const walk = (x - touchStartX) * 1.6;
    if (Math.abs(x - touchStartX) > 6) setHasMoved(true);
    scrollRef.current.scrollLeft = touchScrollLeft - walk;
  };

  const handlePlayClick = (movie, e) => {
    e.stopPropagation();
    // Only trigger play if the user didn't actually drag the slider
    if (!hasMoved) {
      onMovieClick(movie);
    }
  };

  const deleteFromHistory = async (movieId, movieType, e) => {
    e.stopPropagation();
    if (hasMoved) return; // Prevent delete on drag
    try {
      const historyRef = doc(db, "history", user.uid);
      const updated = history.filter(item => {
        const itemType = item.type || (item.first_air_date ? 'tv' : 'movie');
        return !(String(item.id) === String(movieId) && itemType === movieType);
      });
      await updateDoc(historyRef, { items: updated });
      toast.success('CLEARED FROM CACHE');
    } catch (err) { toast.error('SYNC ERROR'); }
  };

  const clearAllHistory = async () => {
    try {
      await updateDoc(doc(db, "history", user.uid), { items: [] });
      setIsConfirmOpen(false);
      toast.success('DATABASE WIPED');
    } catch (err) { toast.error('WIPE FAILED'); }
  };

  if (!user || loading || history.length === 0) return null;

  return (
    <section className="relative px-4 md:px-12 py-12 mb-10 overflow-hidden select-none">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header Section */}
      <div className="flex items-end justify-between mb-10 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-red-500 font-black text-[10px] uppercase tracking-[0.3em]">
            <span className="w-8 h-[1px] bg-red-500" />
            Active Session
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none">
            Continue <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-400 italic">Watching</span>
          </h2>
        </div>

        <motion.button 
          whileHover={{ scale: 1.05, backgroundColor: 'rgba(220, 38, 38, 0.15)' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsConfirmOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-white/[0.03] border border-white/10 rounded-2xl backdrop-blur-md transition-all"
        >
          <Trash2 size={15} className="text-red-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/80">Clear Archive</span>
        </motion.button>
      </div>

      {/* Horizontal Scroller */}
      <div 
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        className="flex gap-6 overflow-x-auto pb-12 no-scrollbar cursor-grab active:cursor-grabbing relative z-10 scroll-smooth"
      >
        <AnimatePresence mode='popLayout'>
          {history.map((movie, index) => (
            // Use id+type so movie and series with same ID can coexist
            <motion.div 
              key={`${movie.type || (movie.first_air_date ? 'tv' : 'movie')}-${movie.id}`}
              layout
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.5, filter: 'blur(20px)' }}
              transition={{ delay: index * 0.05, type: "spring", stiffness: 100 }}
              className="relative shrink-0 w-[260px] sm:w-[320px] md:w-[380px] group"
            >
              <div 
                onClick={(e) => handlePlayClick(movie, e)}
                className="relative aspect-video rounded-[2.5rem] overflow-hidden border border-white/10 bg-zinc-950 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-700 group-hover:border-red-600/40 group-hover:shadow-red-600/10"
              >
              {/* Image Layer - pointer-events-none prevents dragging the image itself */}
                <img 
                  src={
                    movie.backdrop_path
                      ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}`
                      : movie.poster_path
                      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                      : movie.backdrop || movie.image || 'https://via.placeholder.com/780x439?text=No+Image'
                  } 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-70 group-hover:opacity-50 pointer-events-none"
                  alt=""
                />

                {/* Top Glass Badge */}
                <div className="absolute top-4 left-4 flex gap-2 pointer-events-none">
                   <div className="px-3 py-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-white/90">
                     {(movie.type || (movie.first_air_date ? 'tv' : 'movie')) === 'tv' ? 'Series' : 'Movie'}
                   </div>
                </div>

                {/* Play Center Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 bg-black/20">
                   <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => handlePlayClick(movie, e)}
                    className="w-16 h-16 flex items-center justify-center bg-white text-black rounded-full shadow-[0_0_40px_rgba(255,255,255,0.3)] z-30"
                   >
                     <Play size={24} fill="currentColor" className="ml-1" />
                   </motion.button>
                </div>

                {/* Bottom Content Area */}
                <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none">
                  <div className="flex items-end justify-between gap-4 pointer-events-auto">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm md:text-lg font-black text-white uppercase tracking-tighter truncate leading-tight">
                        {movie.title || movie.name}
                      </h4>
                      <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1">
                        {movie.lastSeason ? `S${movie.lastSeason} • E${movie.lastEpisode}` : 'Resume Session'}
                      </p>
                    </div>
                    
                    <button 
                      onClick={(e) => deleteFromHistory(movie.id, movie.type || (movie.first_air_date ? 'tv' : 'movie'), e)}
                      className="p-3 bg-white/5 hover:bg-red-600/20 rounded-2xl border border-white/10 group/btn transition-all relative z-40"
                    >
                      <X size={16} className="text-white/40 group-hover/btn:text-white" />
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4 relative h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${movie.progress || 60}%` }}
                      transition={{ duration: 1.5, ease: "circOut" }}
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_15px_rgba(220,38,38,0.5)] rounded-full"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* MODAL - ULTRA GLASSY DELETE */}
      <AnimatePresence>
        {isConfirmOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsConfirmOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 40 }}
              className="relative w-full max-w-md bg-zinc-900/40 backdrop-blur-[50px] border border-white/10 rounded-[3.5rem] p-12 text-center shadow-2xl"
            >
              <div className="relative z-10">
                <div className="w-24 h-24 bg-red-600/10 border border-red-600/20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8">
                  <AlertTriangle className="text-red-600" size={48} />
                </div>
                <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">Purge History?</h3>
                <p className="text-white/40 text-[12px] font-bold uppercase tracking-[0.2em] mb-10">Confirmed action will delete all cloud progress.</p>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setIsConfirmOpen(false)} className="py-5 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-[1.8rem] border border-white/5 transition-all">Abort</button>
                  <button onClick={clearAllHistory} className="py-5 bg-red-600 text-white font-black uppercase tracking-widest text-[10px] rounded-[1.8rem] shadow-lg hover:bg-red-700 transition-all">Confirm</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </section>
  );
};

export default ContinueWatching;