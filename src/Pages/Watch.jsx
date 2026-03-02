import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Zap, ShieldCheck, 
  Server, Globe, ChevronDown, PlayCircle, Info
} from 'lucide-react';

const WatchPage = ({ movie, onClose }) => {
  const [activeSource, setActiveSource] = useState('vidsrc_cc');
  const [isLoading, setIsLoading] = useState(true);
  const [showUI, setShowUI] = useState(true);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [seasonsData, setSeasonsData] = useState([]);
  const [episodesList, setEpisodesList] = useState([]);
  const uiTimeout = useRef(null);

  const sources = [
    { id: 'vidsrc_cc', name: 'VidSrc.cc', icon: <Zap size={14} /> },
    { id: 'vidsrc_pro', name: 'VidSrc PRO', icon: <Server size={14} /> },
    { id: 'vidlink', name: 'VidLink.cloud', icon: <Globe size={14} /> },
    { id: 'embed_su', name: 'Embed.su', icon: <ShieldCheck size={14} /> }
  ];

  const getOptions = () => ({
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_TMDB_READ_TOKEN}`
    }
  });

  useEffect(() => {
    if (movie.type === 'tv' || movie.first_air_date) {
      const fetchTVData = async () => {
        try {
          const res = await fetch(`https://api.themoviedb.org/3/tv/${movie.id}`, getOptions());
          const data = await res.json();
          setSeasonsData(data.seasons?.filter(s => s.season_number > 0) || []);
        } catch (err) { console.error("TMDB Season Fetch Error", err); }
      };
      fetchTVData();
    }
  }, [movie.id]);

  useEffect(() => {
    if (movie.type === 'tv' || movie.first_air_date) {
      const fetchEpisodes = async () => {
        try {
          const res = await fetch(`https://api.themoviedb.org/3/tv/${movie.id}/season/${season}`, getOptions());
          const data = await res.json();
          setEpisodesList(data.episodes || []);
        } catch (err) { console.error("TMDB Episode Fetch Error", err); }
      };
      fetchEpisodes();
    }
  }, [movie.id, season]);

  const getSourceUrl = () => {
    const isTV = movie.type === 'tv' || !!movie.first_air_date;
    const id = movie.id;
    const urls = {
      'vidsrc_cc': isTV ? `https://vidsrc.cc/v2/embed/tv/${id}/${season}/${episode}` : `https://vidsrc.cc/v2/embed/movie/${id}`,
      'vidsrc_pro': isTV ? `https://vidsrc.pro/embed/tv/${id}/${season}/${episode}` : `https://vidsrc.pro/embed/movie/${id}`,
      'vidlink': isTV ? `https://vidlink.pro/tv/${id}/${season}/${episode}` : `https://vidlink.pro/movie/${id}`,
      'embed_su': isTV ? `https://embed.su/embed/tv/${id}/${season}/${episode}` : `https://embed.su/embed/movie/${id}`,
    };
    return urls[activeSource];
  };

  const handleInteraction = (e) => {
    const isAtTopHalf = e.clientY < (window.innerHeight * 0.45); 
    setShowUI(true);
    if (uiTimeout.current) clearTimeout(uiTimeout.current);

    if (!isAtTopHalf) {
      uiTimeout.current = setTimeout(() => {
        if (!isLoading) setShowUI(false);
      }, 3000);
    }
  };

  useEffect(() => {
    uiTimeout.current = setTimeout(() => setShowUI(false), 3000);
    return () => clearTimeout(uiTimeout.current);
  }, []);

  return (
    <div 
      className="fixed inset-0 z-[300] bg-black flex flex-col overflow-hidden select-none"
      onMouseMove={handleInteraction}
      onClick={handleInteraction}
      style={{ cursor: showUI ? 'default' : 'none' }}
    >
      <div className="relative flex-1 bg-black">
        <iframe
          key={`${activeSource}-${season}-${episode}`}
          src={getSourceUrl()}
          className="w-full h-full border-none pointer-events-auto"
          allowFullScreen
          onLoad={() => setIsLoading(false)}
          sandbox="allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-top-navigation"
          allow="autoplay; encrypted-media; picture-in-picture"
        />

        {/* --- WATERMARK --- */}
        <div className="absolute bottom-4 right-6 md:bottom-8 md:right-10 z-[305] pointer-events-none opacity-40 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
          <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.5em] text-white italic">MovieHub Digital</span>
        </div>

        <AnimatePresence>
          {showUI && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 z-[310] pointer-events-none flex flex-col justify-between p-4 md:p-8 lg:p-12"
            >
              {/* GRADIENTS */}
              <div className="absolute inset-x-0 top-0 h-[50%] bg-gradient-to-b from-black/90 via-black/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-black/90 via-black/40 to-transparent md:hidden" />

              {/* MAIN CONTENT WRAPPER */}
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-start w-full h-full gap-6">
                
                {/* LEFT SIDE: HEADER & INFO */}
                <motion.div 
                  initial={{ x: -20, opacity: 0 }} 
                  animate={{ x: 0, opacity: 1 }}
                  className="flex flex-col gap-4 md:gap-6 w-full md:max-w-[60%] pointer-events-auto"
                >
                  <div className="flex items-center gap-4 md:gap-6">
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={onClose} 
                      className="p-3 md:p-5 bg-white/10 hover:bg-red-600 border border-white/20 rounded-full text-white transition-all shadow-xl"
                    >
                      <ChevronLeft className="w-5 h-5 md:w-7 md:h-7" />
                    </motion.button>
                    <div className="overflow-hidden">
                      <h2 className="text-2xl md:text-4xl lg:text-6xl font-black italic uppercase text-white tracking-tighter truncate drop-shadow-2xl">
                        {movie.title || movie.name}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-1 text-[10px] md:text-[12px] font-black text-white/60 uppercase tracking-widest md:tracking-[0.4em]">
                        <span className="text-red-500 whitespace-nowrap">Node: {activeSource}</span>
                        <span className="hidden xs:inline">•</span>
                        <span>{movie.year}</span>
                        {movie.type === 'tv' && (
                          <span className="bg-red-600/40 text-white px-2 py-0.5 rounded border border-red-500/50">
                            S{season} E{episode}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* DESCRIPTION - Hidden on very small screens to save space */}
                  <motion.div 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="hidden sm:block bg-white/[0.03] border border-white/10 border-l-[4px] md:border-l-[6px] border-l-red-600 p-4 md:p-8 rounded-r-2xl md:rounded-r-[3rem] shadow-2xl"
                  >
                    <div className="flex items-center gap-2 mb-2 text-red-500 font-black text-[9px] md:text-[10px] uppercase tracking-widest">
                      <Info size={14} /> Cinematic Brief
                    </div>
                    <p className="text-sm md:text-lg lg:text-xl text-white/90 leading-snug md:leading-relaxed font-bold italic line-clamp-2 md:line-clamp-3">
                      {movie.overview}
                    </p>
                  </motion.div>
                </motion.div>

                {/* RIGHT SIDE: CONTROLS (Floating on desktop, Bottom-docked on mobile) */}
                <motion.div 
                  initial={{ y: 20, opacity: 0 }} 
                  animate={{ y: 0, opacity: 1 }}
                  className="w-full md:w-[340px] lg:w-[400px] mt-auto md:mt-0 pointer-events-auto"
                >
                  <div className="bg-white/[0.05] border border-white/10 p-4 md:p-8 rounded-[1.5rem] md:rounded-[3rem] shadow-2xl">
                    { (movie.type === 'tv' || movie.first_air_date) && (
                      <div className="grid grid-cols-2 gap-2 md:gap-4 mb-4 md:mb-6">
                        <div className="relative group">
                          <select 
                            value={season} 
                            onChange={(e) => {setSeason(Number(e.target.value)); setEpisode(1); setIsLoading(true);}} 
                            className="w-full bg-white/10 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 px-3 md:px-5 text-[10px] md:text-[12px] font-black text-white outline-none appearance-none cursor-pointer"
                          >
                            {seasonsData.map((s) => (
                              <option key={s.id} value={s.season_number} className="bg-zinc-900">Season {s.season_number}</option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" />
                        </div>
                        <div className="relative group">
                          <select 
                            value={episode} 
                            onChange={(e) => {setEpisode(Number(e.target.value)); setIsLoading(true);}} 
                            className="w-full bg-white/10 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 px-3 md:px-5 text-[10px] md:text-[12px] font-black text-white outline-none appearance-none cursor-pointer"
                          >
                            {episodesList.map((ep) => (
                              <option key={ep.id} value={ep.episode_number} className="bg-zinc-900">
                                Ep {ep.episode_number}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 xs:grid-cols-4 md:grid-cols-2 gap-2 md:gap-3">
                      {sources.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {setActiveSource(s.id); setIsLoading(true);}}
                          className={`flex flex-col items-center justify-center gap-1 md:gap-2 py-3 md:py-5 rounded-xl md:rounded-3xl transition-all border ${
                            activeSource === s.id 
                              ? 'bg-red-600/90 border-red-400 text-white' 
                              : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
                          }`}
                        >
                          <span className="md:scale-110">{s.icon}</span>
                          <span className="text-[8px] md:text-[10px] font-black uppercase whitespace-nowrap">{s.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* CENTER LOGO - Subtle on mobile */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                <PlayCircle className="w-40 h-40 md:w-80 md:h-80 text-white/[0.02]" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- LOADER --- */}
        <AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-[400] flex flex-col items-center justify-center bg-black"
            >
              <motion.div 
                animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-16 h-16 md:w-24 md:h-24 border-[2px] md:border-[3px] border-white/5 border-t-red-600 rounded-full" 
              />
              <p className="mt-6 md:mt-10 text-[9px] md:text-[11px] font-black text-white/40 uppercase tracking-[1em] md:tracking-[2em] text-center px-4">
                Linking Node
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WatchPage;