import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { Play, Star, Plus, Check, Loader2, Sparkles } from 'lucide-react';
import { db, auth } from './firebase'; 
import { doc, arrayUnion, onSnapshot, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import toast from 'react-hot-toast';

const MovieCard = ({ movie, onClick, user: propUser }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentUser, setCurrentUser] = useState(propUser || null);

  // 1. AUTH SYNC (Keep your fix)
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

  useEffect(() => {
    const canHoverMedia = window.matchMedia('(hover: hover)');
    setCanHover(canHoverMedia.matches);
  }, []);

  // 2. FIRESTORE SYNC (Keep your fix)
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
    }, (err) => console.error("Snapshot error:", err));

    return () => unsubscribe();
  }, [currentUser, propUser, movie.id]);

  // --- 3D TILT PHYSICS (Enhanced) ---
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 120, damping: 25 });
  const mouseYSpring = useSpring(y, { stiffness: 120, damping: 25 });
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["18deg", "-18deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-18deg", "18deg"]);
  const sheenX = useTransform(mouseXSpring, [-0.5, 0.5], ["0%", "100%"]);

  const handleMouseMove = (e) => {
    if (!canHover) return;
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const toggleWatchlist = async (e) => {
    e.stopPropagation(); 
    const activeUser = currentUser || propUser || auth.currentUser;

    if (!activeUser) {
      toast.error('SIGN IN TO SAVE', {
        style: { borderRadius: '15px', background: '#000', color: '#fff', border: '1px solid #333' }
      });
      return;
    }

    if (isAdded || isSyncing) return;
    
    setIsSyncing(true);
    const userRef = doc(db, "watchlists", activeUser.uid);

    try {
      await setDoc(userRef, { items: arrayUnion(movie) }, { merge: true });
      toast.success('LIBRARY UPDATED');
    } catch (error) {
      toast.error('SYNC ERROR');
    } finally {
      setIsSyncing(false);
    }
  };

  const posterUrl = movie.poster_path 
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` 
    : movie.image || `https://via.placeholder.com/500x750?text=${movie.title}`;

  return (
    <motion.div
      style={{ rotateX: isHovered && canHover ? rotateX : 0, rotateY: isHovered && canHover ? rotateY : 0, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => canHover && setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); x.set(0); y.set(0); }}
      onClick={() => onClick(movie)}
      className="relative group cursor-pointer w-full perspective-1000"
    >
      {/* 1. ANIMATED OUTER GLOW */}
      <AnimatePresence>
        {isHovered && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1.15 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -inset-4 bg-gradient-to-tr from-red-600/30 via-transparent to-blue-500/30 rounded-[2.5rem] blur-3xl z-0"
          />
        )}
      </AnimatePresence>

      {/* 2. MAIN CONTAINER (GLASSY) */}
      <motion.div 
        animate={isHovered && canHover ? { scale: 1.07, z: 50 } : { scale: 1, z: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="relative aspect-[2/3] w-full overflow-hidden rounded-[2.2rem] border border-white/10 bg-[#0a0a0a] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-10"
      >
        {/* IMAGE ANIMATION */}
        <motion.img
          src={posterUrl}
          alt={movie.title}
          animate={isHovered && canHover ? { scale: 1.15, filter: 'contrast(1.1) brightness(0.8)' } : { scale: 1, filter: 'contrast(1) brightness(1)' }}
          transition={{ duration: 0.8 }}
          className="h-full w-full object-cover"
        />

        {/* GLASS OVERLAY SHEEN */}
        <motion.div 
          style={{ left: sheenX, skewX: "-20deg" }}
          className="absolute top-0 bottom-0 w-32 bg-white/5 blur-2xl pointer-events-none"
        />

        <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent transition-opacity duration-500 ${isHovered ? 'opacity-95' : 'opacity-40'}`} />

        {/* 3. TOP CONTROLS (Floating Effect) */}
        <div 
          style={{ transform: isHovered && canHover ? "translateZ(60px)" : "none" }}
          className="absolute top-5 left-5 right-5 flex justify-between items-start z-50 transition-transform duration-300"
        >
          <div className="flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-xl px-3 py-1.5 border border-white/10">
            <Star size={10} className="fill-red-500 text-red-500 animate-pulse" />
            <span className="text-[10px] font-black text-white">{movie.vote_average?.toFixed(1) || "8.5"}</span>
          </div>

          <motion.button
            whileHover={{ scale: 1.2, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleWatchlist}
            disabled={isSyncing}
            className={`p-2.5 rounded-2xl backdrop-blur-2xl border transition-all duration-500 ${
              isAdded 
              ? 'bg-green-500/20 border-green-500/50 text-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]' 
              : 'bg-white/5 border-white/10 text-white hover:bg-red-600 hover:border-red-600'
            }`}
          >
            {isSyncing ? <Loader2 size={16} className="animate-spin" /> : isAdded ? <Check size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />}
          </motion.button>
        </div>

        {/* 4. CENTRAL PLAY BUTTON (Glass Pop) */}
        <div 
          style={{ transform: isHovered && canHover ? "translateZ(100px)" : "none" }} 
          className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-500"
        >
          <motion.div 
            animate={isHovered ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.5, y: 20 }} 
            className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-[0_0_40px_rgba(220,38,38,0.8)] border-2 border-white/30"
          >
            <Play size={28} fill="white" className="ml-1 text-white" />
          </motion.div>
        </div>

        {/* 5. BOTTOM TEXT (Staggered Pop) */}
        <div 
          style={{ transform: isHovered && canHover ? "translateZ(80px)" : "none" }} 
          className="absolute bottom-0 left-0 right-0 p-8 flex flex-col gap-1 transition-transform duration-300"
        >
          <motion.h3 
            animate={isHovered ? { x: 0, opacity: 1 } : { x: -10, opacity: 0.8 }}
            className="text-base font-black uppercase tracking-tighter text-white italic truncate drop-shadow-lg"
          >
            {movie.title || movie.name}
          </motion.h3>
          
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md uppercase">
              {(movie.release_date || movie.first_air_date)?.split('-')[0]}
            </span>
            <span className="text-[10px] text-white/40">•</span>
            <div className="flex items-center gap-1 text-[10px] font-medium text-white/70">
              <Sparkles size={10} className="text-blue-400" />
              ULTRA HD
            </div>
          </div>
        </div>

        {/* GLASS LIGHT STREAK */}
        <motion.div 
          initial={{ x: "-150%", y: "-150%" }}
          animate={isHovered ? { x: "250%", y: "250%" } : {}}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent rotate-45 pointer-events-none"
        />
      </motion.div>
    </motion.div>
  );
};

export default MovieCard;