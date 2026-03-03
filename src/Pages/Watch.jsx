/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Zap, ShieldCheck, 
  Server, Globe, ChevronDown, PlayCircle, Info,
  LayoutGrid, StretchHorizontal
} from 'lucide-react';
import { Helmet } from "react-helmet";

const WatchPage = ({ movie, onClose }) => {
  const [activeSource, setActiveSource] = useState('vidsrc_cc');
  const [isLoading, setIsLoading] = useState(true);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [seasonsData, setSeasonsData] = useState([]);
  const [episodesList, setEpisodesList] = useState([]);
  const [layout, setLayout] = useState("row"); // "row" for details, "grid" for compact
  const scrollRef = useRef(null);

  const sources = [
    { id: 'vidsrc_cc', name: 'VidSrc', icon: <Zap size={14} /> },
    { id: 'vidsrc_pro', name: 'VidSrc Pro', icon: <Server size={14} /> },
    { id: 'vidlink', name: 'VidLink', icon: <Globe size={14} /> },
    { id: 'embed_su', name: 'Embed', icon: <ShieldCheck size={14} /> }
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
        } catch (err) { console.error(err); }
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
        } catch (err) { console.error(err); }
      };
      fetchEpisodes();
    }
  }, [movie.id, season]);

  const getSourceUrl = () => {
    const isTV = movie.type === 'tv' || !!movie.first_air_date;
    const id = movie.id;
    const urls = {
      vidsrc_cc: isTV ? `https://vidsrc.cc/v2/embed/tv/${id}/${season}/${episode}` : `https://vidsrc.cc/v2/embed/movie/${id}`,
      vidsrc_pro: isTV ? `https://vidsrc.me/embed/tv/${id}/${season}/${episode}` : `https://vidsrc.me/embed/movie/${id}`,
      vidlink: isTV ? `https://vidlink.pro/tv/${id}/${season}/${episode}` : `https://vidlink.pro/movie/${id}`,
      embed_su: isTV ? `https://embed.su/embed/tv/${id}/${season}/${episode}` : `https://embed.su/embed/movie/${id}`,
    };
    return urls[activeSource];
  };

  // --- Animations ---
  const containerVars = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVars = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
  };

  return (
    <motion.div 
      initial="hidden" animate="visible" variants={containerVars}
      className="fixed inset-0 z-[500] bg-[#020202] text-white overflow-y-auto no-scrollbar selection:bg-red-500/30"
    >
      <Helmet>
        <title>{`Watching ${movie.title || movie.name}`}</title>
      </Helmet>

      {/* BACKGROUND DECOR */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 md:px-10 py-8 md:py-16 space-y-10">
        
        {/* HEADER SECTION */}
        <motion.div variants={itemVars} className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
          <div className="space-y-4">
            <button 
              onClick={onClose} 
              className="group flex items-center gap-2 text-white/40 hover:text-white transition-all text-xs font-black uppercase tracking-widest"
            >
              <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
                <ChevronLeft size={18} />
              </div>
              Back to Hub
            </button>
            <h1 className="text-3xl md:text-6xl font-black italic uppercase tracking-tighter leading-none">
              {movie.title || movie.name}
            </h1>
            <div className="flex items-center gap-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">
              <span className="text-red-500">Live Server</span>
              <span>•</span>
              <span>{movie.year || "2024"}</span>
              {movie.type === 'tv' && (
                <>
                  <span>•</span>
                  <span className="bg-white/10 px-2 py-0.5 rounded text-white/80">S{season} E{episode}</span>
                </>
              )}
            </div>
          </div>

          {/* SOURCE DOCK */}
          <div className="flex bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-1.5 rounded-full shadow-2xl overflow-x-auto no-scrollbar">
            {sources.map(s => (
              <button
                key={s.id}
                onClick={() => { setActiveSource(s.id); setIsLoading(true); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                  activeSource === s.id 
                  ? 'bg-white text-black shadow-lg' 
                  : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                {s.icon} {s.name}
              </button>
            ))}
          </div>
        </motion.div>

        {/* PLAYER AREA */}
        <motion.div variants={itemVars} className="relative aspect-video w-full rounded-[2rem] md:rounded-[3.5rem] overflow-hidden border border-white/10 bg-black shadow-[0_0_100px_-20px_rgba(220,38,38,0.15)] group">
          <iframe
            key={`${activeSource}-${season}-${episode}`}
            src={getSourceUrl()}
            className="w-full h-full"
            allowFullScreen
            onLoad={() => setIsLoading(false)}
          />
          
          <AnimatePresence>
            {isLoading && (
              <motion.div exit={{ opacity: 0 }} className="absolute inset-0 bg-[#050505] flex flex-col items-center justify-center z-50">
                <div className="w-12 h-12 border-2 border-white/5 border-t-red-600 rounded-full animate-spin" />
                <p className="mt-4 text-[9px] font-black uppercase tracking-[0.4em] text-white/20 animate-pulse">Syncing Relay</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* EPISODE SECTION */}
        {movie.type === 'tv' && (
          <motion.div variants={itemVars} className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <h3 className="text-xl md:text-3xl font-black uppercase italic tracking-tighter">Episodes</h3>
                <div className="relative group">
                  <select 
                    value={season} 
                    onChange={(e) => { setSeason(Number(e.target.value)); setEpisode(1); setIsLoading(true); }}
                    className="bg-white/5 border border-white/10 rounded-xl py-2 px-6 pr-10 text-xs font-black uppercase tracking-widest text-red-500 outline-none appearance-none cursor-pointer hover:bg-white/10 transition-colors backdrop-blur-xl"
                  >
                    {seasonsData.map(s => <option key={s.id} value={s.season_number} className="bg-zinc-900">Season {s.season_number}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                </div>
              </div>

              {/* LAYOUT TOGGLE */}
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 self-end">
                <button onClick={() => setLayout("row")} className={`p-2.5 rounded-lg transition-all ${layout === "row" ? "bg-white/10 text-white" : "text-white/20 hover:text-white/40"}`}>
                  <StretchHorizontal size={18} />
                </button>
                <button onClick={() => setLayout("grid")} className={`p-2.5 rounded-lg transition-all ${layout === "grid" ? "bg-white/10 text-white" : "text-white/20 hover:text-white/40"}`}>
                  <LayoutGrid size={18} />
                </button>
              </div>
            </div>

            <motion.div 
              layout
              className={`grid gap-4 md:gap-6 ${
                layout === "row" 
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" 
                : "grid-cols-4 sm:grid-cols-6 lg:grid-cols-10"
              }`}
            >
              <AnimatePresence mode="popLayout">
                {episodesList.map((ep) => (
                  <motion.button
                    key={ep.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => { setEpisode(ep.episode_number); setIsLoading(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className={`group relative overflow-hidden transition-all duration-500 ${
                      layout === "row" 
                      ? "p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-red-500/50 hover:bg-white/[0.05]" 
                      : "aspect-square flex items-center justify-center rounded-xl bg-white/[0.02] border border-white/5"
                    } ${episode === ep.episode_number ? "border-red-600 bg-red-600/10 shadow-[0_0_20px_rgba(220,38,38,0.1)]" : ""}`}
                  >
                    {layout === "row" ? (
                      <div className="flex gap-4">
                        <div className="relative w-32 aspect-video rounded-lg overflow-hidden shrink-0 shadow-xl">
                          <img 
                            src={`https://image.tmdb.org/t/p/w300${ep.still_path}`} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                            alt="" 
                            onError={(e) => e.target.src = 'https://placehold.co/300x169/111/fff?text=No+Preview'}
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <PlayCircle size={24} className="text-white shadow-2xl" />
                          </div>
                        </div>
                        <div className="text-left py-1 overflow-hidden">
                          <p className="text-[10px] font-black uppercase text-red-500 mb-1">Episode {ep.episode_number}</p>
                          <p className={`text-sm font-bold truncate ${episode === ep.episode_number ? "text-white" : "text-white/70 group-hover:text-white"}`}>
                            {ep.name || `Episode ${ep.episode_number}`}
                          </p>
                          <p className="text-[9px] text-white/30 font-medium line-clamp-2 mt-1 hidden md:block italic">
                            {ep.overview || "No overview available for this episode."}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <span className={`text-xs font-black ${episode === ep.episode_number ? "text-white" : "text-white/20 group-hover:text-white"}`}>
                        {ep.episode_number}
                      </span>
                    )}
                  </motion.button>
                ))}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default WatchPage;