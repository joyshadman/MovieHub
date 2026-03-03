/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Play, Star, X, Globe, Loader2, ArrowLeft, 
  Calendar, Users, Cpu, Monitor, Zap 
} from 'lucide-react';
import { movieApi } from '../services/movieApi';
import WatchPage from './Watch';
import { auth } from '../components/firebase'; // Ensure correct path

const fader = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
};

const staggerContainer = {
  visible: { transition: { staggerChildren: 0.1 } }
};

const MovieDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [movie, setMovie] = useState(null);
  const [imdbId, setImdbId] = useState(null);
  const [cast, setCast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPlayer, setShowPlayer] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Sync auth state to pass to WatchPage
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    
    const fetchFullDetails = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const type = location.pathname.includes('/tv/') ? 'tv' : 'movie';
        
        const [details, externalData, creditsData] = await Promise.all([
          movieApi.getDetails(type, id),
          movieApi.getExternalIds(id, type),
          movieApi.getCredits(type, id)
        ]);

        if (details) {
          // Normalize the movie object so Firebase history works correctly
          const normalizedMovie = {
            ...details,
            id: details.id,
            type: type,
            // Fallbacks to ensure WatchPage/ContinueWatching find the data
            title: details.title || details.name,
            poster_path: details.poster_path || details.image?.replace('https://image.tmdb.org/t/p/w500', ''),
            backdrop_path: details.backdrop_path || details.backdrop?.replace('https://image.tmdb.org/t/p/original', ''),
            vote_average: details.vote_average || details.rating,
            release_date: details.release_date || details.year,
            first_air_date: type === 'tv' ? (details.first_air_date || details.year) : null
          };
          
          setMovie(normalizedMovie);
          setImdbId(externalData);
          setCast(creditsData || []);
        }
      } catch (error) {
        console.error("Transmission Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFullDetails();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return () => unsub();
  }, [id, location.pathname]);

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#050505]">
      <motion.div animate={{ scale: [1, 1.2, 1], rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
        <Loader2 className="w-12 h-12 text-red-600" />
      </motion.div>
      <p className="mt-4 text-[10px] font-black uppercase tracking-[0.5em] text-white/20">Syncing Data</p>
    </div>
  );

  if (!movie) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#050505]">
      <X size={48} className="text-red-600 mb-4" />
      <button onClick={() => navigate('/')} className="text-white border-b border-red-600 pb-1 font-black uppercase text-xs tracking-widest">Return Home</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-red-600 overflow-x-hidden">
      
      {/* --- WATCH INTERFACE MODAL --- */}
      <AnimatePresence>
        {showPlayer && (
          <WatchPage 
            movie={movie} 
            user={user} // CRITICAL: Pass the user object here
            onClose={() => setShowPlayer(false)} 
          />
        )}
      </AnimatePresence>

      <div className="fixed inset-0 z-0">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 0.3 }}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
          style={{ backgroundImage: `url(https://image.tmdb.org/t/p/original${movie.backdrop_path})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/80 to-[#050505]" />
        <div className="absolute inset-0 backdrop-blur-[80px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 lg:py-32">
        <motion.button 
          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(-1)}
          className="group flex items-center gap-3 text-white/40 hover:text-white transition-all uppercase font-black text-[10px] tracking-[0.4em] mb-16"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Exit Archive
        </motion.button>

        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-[450px_1fr] gap-12 lg:gap-24">
          
          <motion.div variants={fader} className="flex flex-col gap-8">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-red-600/20 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="relative aspect-[2/3] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl bg-zinc-900">
                <img src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} className="w-full h-full object-cover" alt={movie.title} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 backdrop-blur-xl p-5 rounded-[2rem] flex flex-col items-center justify-center">
                <Calendar size={18} className="text-red-600 mb-2" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Release</span>
                <span className="text-sm font-bold">{movie.release_date?.substring(0,4) || 'TBA'}</span>
              </div>
              <div className="bg-white/5 border border-white/10 backdrop-blur-xl p-5 rounded-[2rem] flex flex-col items-center justify-center">
                <Star size={18} className="text-amber-500 fill-amber-500 mb-2" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Rating</span>
                <span className="text-sm font-bold">{movie.vote_average?.toFixed(1)}</span>
              </div>
            </div>
          </motion.div>

          <div className="flex flex-col">
            <motion.div variants={fader} className="flex items-center gap-4 mb-6">
              <span className="px-4 py-1 rounded-full bg-red-600 text-[10px] font-black uppercase tracking-widest">
                {movie.type === 'tv' ? 'Series' : 'Feature'}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">8K Mastering</span>
            </motion.div>

            <motion.h1 variants={fader} className="text-5xl md:text-7xl lg:text-9xl font-black italic tracking-tighter leading-none uppercase mb-10 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">
              {movie.title}
            </motion.h1>

            <motion.p variants={fader} className="text-white/50 text-lg lg:text-2xl font-medium leading-relaxed mb-12 max-w-3xl italic">
              {movie.overview}
            </motion.p>

            <motion.div variants={fader} className="mb-20">
              <motion.button 
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => setShowPlayer(true)}
                className="flex items-center gap-4 bg-white text-black px-12 py-6 rounded-full font-black uppercase tracking-widest text-xs shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:bg-red-600 hover:text-white transition-all duration-500"
              >
                <Play size={20} fill="currentColor" /> Initialize Terminal
              </motion.button>
            </motion.div>

            <motion.div variants={fader} className="space-y-10">
              <h3 className="text-[10px] font-black uppercase tracking-[0.6em] text-white/20 flex items-center gap-3"><Users size={14} /> Personnel Registry</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
                {cast.slice(0, 5).map((actor) => (
                  <div key={actor.id} className="group cursor-default">
                    <div className="aspect-square rounded-[1.5rem] overflow-hidden mb-3 border border-white/5 bg-white/5 group-hover:border-red-600/50 transition-colors duration-500">
                      <img src={actor.profile} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" alt={actor.name} />
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-widest truncate">{actor.name}</p>
                    <p className="text-[9px] font-bold text-white/20 uppercase truncate">{actor.character}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div variants={fader} className="mt-20 pt-10 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-8">
              <StatBlock icon={<Zap size={14}/>} label="Resolution" value="4K_ATMOS" />
              <StatBlock icon={<Cpu size={14}/>} label="Encoding" value="HEVC.H265" />
              <StatBlock icon={<Monitor size={14}/>} label="IMDb ID" value={imdbId || 'REF_NULL'} />
              <StatBlock icon={<Globe size={14}/>} label="Network" value="Secure_Node" />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const StatBlock = ({ icon, label, value }) => (
  <div className="space-y-2">
    <span className="text-[9px] font-black uppercase tracking-widest text-white/20 flex items-center gap-2">{icon} {label}</span>
    <p className="text-[11px] font-bold tracking-widest text-white/60 uppercase">{value}</p>
  </div>
);

export default MovieDetails;