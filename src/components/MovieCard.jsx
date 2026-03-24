import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Play, Star, Plus, Check, Loader2, Sparkles } from 'lucide-react';
import { db, auth } from './firebase'; 
import { doc, arrayUnion, onSnapshot, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import toast from 'react-hot-toast';

const MovieCard = React.memo(({ movie, onClick, user: propUser }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentUser, setCurrentUser] = useState(propUser || null);
  const shouldReduceMotion = useReducedMotion();

  // 1. Auth Sync
  useEffect(() => {
    if (propUser) {
      setCurrentUser(propUser);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user || null);
    });
    return () => unsubscribe();
  }, [propUser]);

  // 2. Firestore Sync
  useEffect(() => {
    const activeUser = currentUser || propUser;
    if (!activeUser?.uid || !movie?.id) {
      setIsAdded(false);
      return;
    }

    const userRef = doc(db, "watchlists", activeUser.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const items = docSnap.data().items || [];
        const exists = items.some(item => String(item.id) === String(movie.id));
        setIsAdded(exists);
      }
    }, (err) => console.error("Sync error:", err));

    return () => unsubscribe();
  }, [currentUser, propUser, movie.id]);

  const toggleWatchlist = async (e) => {
    e.stopPropagation(); 
    const activeUser = currentUser || propUser || auth.currentUser;

    if (!activeUser) {
      toast.error('SIGN IN TO SAVE', {
        style: { borderRadius: '12px', background: '#000', color: '#fff', border: '1px solid #333' }
      });
      return;
    }

    if (isAdded || isSyncing) return;
    
    setIsSyncing(true);
    const userRef = doc(db, "watchlists", activeUser.uid);

    try {
      await setDoc(userRef, { items: arrayUnion(movie) }, { merge: true });
      toast.success('SAVED TO LIBRARY');
    } catch (error) {
      toast.error('FAILED TO SAVE');
    } finally {
      setIsSyncing(false);
    }
  };

  // RESTORED: Original Poster Logic
  const posterUrl = useMemo(() => {
    return movie.poster_path 
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` 
      : movie.image || `https://via.placeholder.com/500x750?text=No+Image`;
  }, [movie.poster_path, movie.image]);

  // FIXED: IMDb Rating Logic
  const rating = useMemo(() => {
    const val = movie.vote_average || movie.rating;
    return val ? val.toFixed(1) : "7.5"; // High-quality fallback
  }, [movie.vote_average, movie.rating]);

  const releaseYear = useMemo(() => {
    const date = movie.release_date || movie.first_air_date || movie.year;
    return date ? String(date).split('-')[0] : '2024';
  }, [movie.release_date, movie.first_air_date, movie.year]);

  return (
    <motion.div
      onMouseEnter={() => !shouldReduceMotion && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick(movie)}
      className="relative group cursor-pointer w-full will-change-transform"
    >
      <AnimatePresence>
        {isHovered && !shouldReduceMotion && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute -inset-1 bg-red-600/20 rounded-[2rem] blur-xl z-0 hidden md:block"
          />
        )}
      </AnimatePresence>

      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl z-10">
        
        <motion.img
          src={posterUrl}
          alt={movie.title || movie.name}
          animate={isHovered ? { scale: 1.05 } : { scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="h-full w-full object-cover"
          loading="lazy"
        />

        <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-90' : 'opacity-60'}`} />

        <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-20">
          {/* FIXED: IMDb Rating Badge */}
          <div className="flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-md px-2 py-1 border border-white/10">
            <Star size={12} className="fill-yellow-500 text-yellow-500" />
            <span className="text-[10px] font-black text-white tracking-tighter">{rating}</span>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleWatchlist}
            disabled={isSyncing}
            className={`p-2 rounded-xl backdrop-blur-md border transition-all duration-300 ${
              isAdded 
              ? 'bg-green-500/20 border-green-500/50 text-green-500' 
              : 'bg-black/40 border-white/10 text-white hover:bg-red-600 hover:border-red-600'
            }`}
          >
            {isSyncing ? <Loader2 size={14} className="animate-spin" /> : isAdded ? <Check size={14} strokeWidth={3} /> : <Plus size={14} strokeWidth={3} />}
          </motion.button>
        </div>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <motion.div 
            animate={isHovered ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }} 
            className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.5)] border border-white/20"
          >
            <Play size={20} fill="white" className="ml-1 text-white" />
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col gap-1 z-30">
          <h3 className="text-[13px] md:text-sm font-bold uppercase tracking-tight text-white line-clamp-1 drop-shadow-md">
            {movie.title || movie.name}
          </h3>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold text-red-500">
              {releaseYear}
            </span>
            <span className="text-white/30 text-[10px]">•</span>
            <div className="flex items-center gap-1 text-[9px] font-bold text-white/70">
              <Sparkles size={10} className="text-blue-400" />
              ULTRA HD
            </div>
          </div>
        </div>

        {isHovered && !shouldReduceMotion && (
          <motion.div 
            initial={{ x: "-150%" }}
            animate={{ x: "200%" }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 pointer-events-none"
          />
        )}
      </div>
    </motion.div>
  );
});

export default MovieCard;