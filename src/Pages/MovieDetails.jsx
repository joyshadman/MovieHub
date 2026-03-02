import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Plus, Check, Star, Clock, Calendar, X, Globe, Share2, Info } from 'lucide-react';
import { movieApi } from '../services/movieApi';

const MovieDetails = ({ movie, user, onClose, onPlay, isSaved, onWatchlistToggle }) => {
  const [imdbId, setImdbId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchId = async () => {
      if (movie) {
        setLoading(true);
        const id = await movieApi.getExternalIds(movie.id, movie.type);
        setImdbId(id);
        setLoading(false);
      }
    };
    fetchId();
  }, [movie]);

  if (!movie) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-8"
    >
      {/* Background Layer with Blurred Backdrop */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <motion.img 
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.3 }}
          src={movie.backdrop} 
          className="w-full h-full object-cover blur-sm" 
          alt="" 
        />
        <div className="absolute inset-0 bg-linear-to-t from-[#050505] via-[#050505]/80 to-transparent" />
      </div>

      <motion.div 
        initial={{ y: 50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-6xl bg-zinc-900/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col md:flex-row"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-50 p-2.5 bg-white/5 hover:bg-red-600 rounded-full text-white transition-all border border-white/10 group"
        >
          <X size={20} className="group-hover:rotate-90 transition-transform" />
        </button>

        {/* Poster Section */}
        <div className="w-full md:w-[35%] p-8 lg:p-12">
          <motion.div 
            whileHover={{ y: -10 }}
            className="relative aspect-[2/3] rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10"
          >
            <img src={movie.image} className="w-full h-full object-cover" alt={movie.title} />
            <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
          </motion.div>
        </div>

        {/* Content Section */}
        <div className="w-full md:w-[65%] p-8 lg:p-12 md:pl-0 flex flex-col justify-center">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="px-3 py-1 bg-red-600/20 text-red-500 border border-red-500/30 rounded-full text-[10px] font-black uppercase tracking-widest">
              {movie.type === 'tv' ? 'Series' : 'Movie'}
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-amber-400">
              <Star size={12} fill="currentColor" /> {movie.rating?.toFixed(1)}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
              {movie.year} • {loading ? 'Fetching IDs...' : `IMDb: ${imdbId || 'N/A'}`}
            </span>
          </div>

          <h1 className="text-4xl lg:text-6xl font-black italic text-white uppercase tracking-tighter leading-none mb-6 drop-shadow-2xl">
            {movie.title}
          </h1>

          <p className="text-white/60 text-sm lg:text-base leading-relaxed mb-10 max-w-2xl font-medium">
            {movie.overview || "Deep within the Streamium archives, this title awaits your discovery. High-fidelity playback and encrypted routing are ready for initialization."}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onPlay({ ...movie, imdb_id: imdbId })}
              disabled={loading}
              className="flex items-center gap-3 bg-white text-black px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-600 hover:text-white transition-all shadow-xl disabled:opacity-50"
            >
              <Play size={18} fill="currentColor" /> {loading ? "Syncing..." : "Initialize Stream"}
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onWatchlistToggle(movie)}
              className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all border ${
                isSaved 
                ? 'bg-amber-500/10 border-amber-500 text-amber-500' 
                : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
              }`}
            >
              {isSaved ? <Check size={18} /> : <Plus size={18} />}
              {isSaved ? "In Watchlist" : "Add to Watchlist"}
            </motion.button>
          </div>

          {/* Metadata Footer */}
          <div className="mt-12 pt-8 border-t border-white/5 flex gap-8">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-white/20 font-black uppercase tracking-widest">Production</span>
              <span className="text-[11px] text-white/60 font-bold flex items-center gap-2"><Globe size={12}/> Global Release</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-white/20 font-black uppercase tracking-widest">Quality</span>
              <span className="text-[11px] text-white/60 font-bold flex items-center gap-2"><Info size={12}/> Ultra-HD Mirror</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MovieDetails;