import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Play, AlertCircle, HardDrive, Loader2, 
  ShieldCheck, Star, Activity, ChevronRight, 
  Tv, Clapperboard, MonitorPlay, Zap, Server, List, RotateCcw, Info, Globe, ChevronDown
} from 'lucide-react';
import { db } from '../components/firebase';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';

const Player = ({ movie, user, onClose }) => {
  const [server, setServer] = useState(null); // Set to null to allow useEffect to force vidsrc.cc
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  if (!movie) return null;

  const tmdbId = movie.id;
  const isTV = movie.type === 'tv' || !!movie.first_air_date;

  // 1. DYNAMIC PROVIDER ENGINE - Prioritizing Vidsrc.cc
  const providers = [
    { id: 3, name: "Vidsrc.cc", url: isTV ? `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}` : `https://vidsrc.cc/v2/embed/movie/${tmdbId}` },
    { id: 1, name: "VidSrc PRO", url: isTV ? `https://vidsrc.pro/embed/tv/${tmdbId}/${season}/${episode}` : `https://vidsrc.pro/embed/movie/${tmdbId}` },
    { id: 2, name: "VidLink", url: isTV ? `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}` : `https://vidlink.pro/movie/${tmdbId}` },
    { id: 4, name: "AutoEmbed", url: isTV ? `https://player.autoembed.cc/tv/${tmdbId}/${season}/${episode}` : `https://player.autoembed.cc/movie/${tmdbId}` },
  ];

  // Force vidsrc.cc (ID: 3) as default on mount
  useEffect(() => {
    if (!server) setServer(3);
  }, [server]);

  const currentProvider = providers.find(p => p.id === server) || providers[0];

  useEffect(() => {
    setLoading(true);
    setHasError(false);
    const timer = setTimeout(() => { if (loading) setHasError(true); }, 12000);
    return () => clearTimeout(timer);
  }, [server, season, episode]);

  const handleReset = () => {
    setLoading(true);
    const current = server;
    setServer(null);
    setTimeout(() => setServer(current), 50);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-xl p-0 md:p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9, filter: "blur(20px)" }}
        className="relative w-full h-full max-w-[1700px] bg-[#050505] md:rounded-[3.5rem] border border-white/10 flex flex-col overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)]"
      >
        
        {/* --- DYNAMIC HEADER STICKY --- */}
        <div className="absolute top-0 left-0 w-full flex items-start justify-between px-10 py-10 z-[110] pointer-events-none">
          
          {/* Left: Movie Info */}
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex items-center gap-6 pointer-events-auto">
            <div className="bg-white/5 backdrop-blur-3xl p-5 rounded-[2rem] border border-white/10 shadow-2xl">
              {isTV ? <Tv size={28} className="text-red-600" /> : <Clapperboard size={28} className="text-red-600" />}
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">
                {movie.title || movie.name}
              </h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="bg-red-600 px-2 py-0.5 rounded text-[9px] font-bold text-white uppercase">4K HDR</span>
                <div className="w-1 h-1 rounded-full bg-white/20" />
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                  {isTV ? `Season ${season} • Episode ${episode}` : 'Feature Film'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Right: Integrated Source Switcher (The Corner) */}
          <div className="pointer-events-auto flex flex-col gap-4 items-end">
             {/* Close Button Float */}
             <motion.button 
                whileHover={{ scale: 1.1, rotate: 90 }} 
                onClick={onClose}
                className="mb-2 p-4 bg-red-600 text-white rounded-2xl shadow-xl shadow-red-600/20"
              >
                <X size={20} />
              </motion.button>

             {/* The Source Switcher Box */}
             <div className="w-[380px] flex flex-col gap-4 p-5 bg-black/60 border border-white/10 rounded-[2.5rem] backdrop-blur-3xl shadow-2xl">
                <div className="flex justify-between items-center mb-1">
                  <button onClick={() => console.log("Info")} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase text-white/60">
                    <Info size={12} /> Info
                  </button>
                  <button onClick={handleReset} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/10 border border-red-500/20 text-[9px] font-black uppercase text-red-500">
                    <RotateCcw size={12} /> Reset
                  </button>
                </div>

                {isTV && (
                  <div className="grid grid-cols-2 gap-2">
                    <select value={season} onChange={(e) => setSeason(Number(e.target.value))} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black text-white outline-none appearance-none cursor-pointer">
                      {[...Array(10)].map((_, i) => <option key={i} value={i+1} className="bg-black">Season {i+1}</option>)}
                    </select>
                    <select value={episode} onChange={(e) => setEpisode(Number(e.target.value))} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black text-white outline-none appearance-none cursor-pointer">
                      {[...Array(24)].map((_, i) => <option key={i} value={i+1} className="bg-black">Episode {i+1}</option>)}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {providers.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setServer(p.id)}
                      className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all border ${
                        server === p.id ? 'bg-red-600 border-red-400 text-white' : 'bg-white/5 border-white/5 text-white/30 hover:text-white'
                      }`}
                    >
                      {p.id === 3 && <Zap size={10} className="inline mr-1" fill="currentColor" />}
                      {p.name}
                    </button>
                  ))}
                </div>
             </div>
          </div>
        </div>

        {/* --- VIEWPORT --- */}
        <div className="relative flex-1 bg-black">
          <AnimatePresence>
            {loading && (
              <motion.div exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex items-center justify-center bg-[#020202]">
                <div className="flex flex-col items-center">
                   <Loader2 className="w-12 h-12 text-red-600 animate-spin mb-4" />
                   <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em]">Establishing Secure Link</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <iframe
            key={`${server}-${season}-${episode}`}
            src={currentProvider.url}
            className="w-full h-full border-none"
            allowFullScreen
            onLoad={() => setLoading(false)}
            sandbox="allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-top-navigation"
          />

          {hasError && !loading && (
            <div className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-2xl flex items-center justify-center">
               <div className="text-center">
                  <AlertCircle size={50} className="text-red-600 mx-auto mb-4" />
                  <h3 className="text-white font-black uppercase tracking-widest">Mirror Unresponsive</h3>
                  <button onClick={() => setServer(server === 4 ? 1 : server + 1)} className="mt-6 px-8 py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px]">Switch Mirror</button>
               </div>
            </div>
          )}
        </div>

        {/* --- FOOTER STATUS --- */}
        <div className="px-10 py-6 bg-black border-t border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span className="text-[9px] font-black text-white/30 uppercase">Sandboxed Connection</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-red-600" />
              <span className="text-[9px] font-black text-white/30 uppercase">32ms Latency</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black text-emerald-500 uppercase">Stream Encrypted</span>
          </div>
        </div>

      </motion.div>
    </div>
  );
};

export default Player;