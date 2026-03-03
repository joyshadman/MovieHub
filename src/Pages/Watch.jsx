/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Zap, ShieldCheck, 
  Server, Globe, ChevronDown, PlayCircle,
  LayoutGrid, StretchHorizontal, Monitor, Cpu
} from 'lucide-react';
import { Helmet } from "react-helmet";
import { db } from '../components/firebase';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';

const WatchPage = ({ movie, user, onClose }) => {
  const [activeSource, setActiveSource] = useState('vidsrc_cc');
  const [isLoading, setIsLoading] = useState(true);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [seasonsData, setSeasonsData] = useState([]);
  const [episodesList, setEpisodesList] = useState([]);
  const [layout, setLayout] = useState("row");
  const [shieldActive, setShieldActive] = useState(true);

  const sources = [
    { id: 'vidsrc_cc', name: 'VidSrc CC', icon: <Zap size={14} /> },
    { id: 'vidsrc_pro', name: 'VidSrc Pro', icon: <Server size={14} /> },
    { id: 'vidlink', name: 'VidLink', icon: <Globe size={14} /> },
    { id: 'embed_su', name: 'Embed.su', icon: <ShieldCheck size={14} /> },
    { id: 'vidsrc_xyz', name: 'VidSrc XYZ', icon: <Cpu size={14} /> },
    { id: 'autoembed', name: 'AutoEmbed', icon: <Monitor size={14} /> }
  ];

  const getOptions = () => ({
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_TMDB_READ_TOKEN}`
    }
  });

  // 1. Sync History to Firebase
  const addToHistory = async (s = season, e = episode) => {
    if (!user) return;
    try {
      const historyRef = doc(db, "history", user.uid);
      const historySnap = await getDoc(historyRef);
      
      const isTV = movie.type === 'tv' || !!movie.first_air_date;

      const historyItem = {
        ...movie,
        watchedAt: Date.now(),
        // Save progress details specifically for TV Shows
        lastSeason: isTV ? s : null,
        lastEpisode: isTV ? e : null,
        progress: 90 
      };

      if (historySnap.exists()) {
        const existingData = historySnap.data().items || [];
        // Filter out the old entry for this movie
        const updatedItems = existingData.filter(item => item.id !== movie.id);
        // Add new entry to the top and limit to 20
        await updateDoc(historyRef, {
          items: [historyItem, ...updatedItems].slice(0, 20)
        });
      } else {
        await setDoc(historyRef, { items: [historyItem] });
      }
    } catch (err) {
      console.error("Error updating history:", err);
    }
  };

  // 2. Initial Load: Auto-Resume logic & Fetch Seasons
  useEffect(() => {
    const initLoad = async () => {
      const isTV = movie.type === 'tv' || !!movie.first_air_date;

      // Auto-resume from Firebase
      if (user && isTV) {
        try {
          const historyRef = doc(db, "history", user.uid);
          const snap = await getDoc(historyRef);
          if (snap.exists()) {
            const item = snap.data().items?.find(i => i.id === movie.id);
            if (item?.lastSeason) {
              setSeason(item.lastSeason);
              setEpisode(item.lastEpisode || 1);
            }
          }
        } catch (err) { console.error("Resume Error:", err); }
      }

      if (isTV) {
        try {
          const res = await fetch(`https://api.themoviedb.org/3/tv/${movie.id}`, getOptions());
          const data = await res.json();
          // Filter out "Season 0" / Specials usually
          setSeasonsData(data.seasons?.filter(s => s.season_number > 0) || []);
        } catch (err) { console.error(err); }
      }
      
      // Initial save
      addToHistory(season, episode);
    };
    initLoad();
  }, [movie.id]);

  // 3. Fetch episodes when season changes
  useEffect(() => {
    const isTV = movie.type === 'tv' || !!movie.first_air_date;
    if (isTV) {
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

  // 4. Update Firebase when episode/season changes
  // This ensures the "Continue Watching" row reflects the actual episode you are on
  useEffect(() => {
    if (movie.id) {
      addToHistory(season, episode);
    }
  }, [season, episode]);

  const getSourceUrl = () => {
    const isTV = movie.type === 'tv' || !!movie.first_air_date;
    const id = movie.id;
    const urls = {
      vidsrc_cc: isTV ? `https://vidsrc.cc/v2/embed/tv/${id}/${season}/${episode}` : `https://vidsrc.cc/v2/embed/movie/${id}`,
      vidsrc_pro: isTV ? `https://vidsrc.me/embed/tv/${id}/${season}/${episode}` : `https://vidsrc.me/embed/movie/${id}`,
      vidlink: isTV ? `https://vidlink.pro/tv/${id}/${season}/${episode}` : `https://vidlink.pro/movie/${id}`,
      embed_su: isTV ? `https://embed.su/embed/tv/${id}/${season}/${episode}` : `https://embed.su/embed/movie/${id}`,
      vidsrc_xyz: isTV ? `https://vidsrc.xyz/embed/tv/${id}/${season}-${episode}` : `https://vidsrc.xyz/embed/movie/${id}`,
      autoembed: isTV ? `https://player.autoembed.cc/tv/${id}/${season}/${episode}` : `https://player.autoembed.cc/movie/${id}`,
    };
    return urls[activeSource];
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-[500] bg-[#020202] text-white overflow-y-auto no-scrollbar"
    >
      <Helmet>
        <title>{`Watching ${movie.title || movie.name}`}</title>
      </Helmet>

      {/* AMBIENT GLOW */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 md:px-10 py-8 md:py-16 space-y-10">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
          <div className="space-y-4">
            <button onClick={onClose} className="group flex items-center gap-2 text-white/40 hover:text-white transition-all text-xs font-black uppercase tracking-widest">
              <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
                <ChevronLeft size={18} />
              </div>
              Back to Hub
            </button>
            <h1 className="text-3xl md:text-6xl font-black italic uppercase tracking-tighter leading-none">
              {movie.title || movie.name}
            </h1>
          </div>

          {/* SOURCE PICKER */}
          <div className="flex bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-1.5 rounded-full overflow-x-auto no-scrollbar">
            {sources.map(s => (
              <button
                key={s.id}
                onClick={() => { setActiveSource(s.id); setIsLoading(true); setShieldActive(true); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                  activeSource === s.id ? 'bg-white text-black' : 'text-white/40 hover:text-white'
                }`}
              >
                {s.icon} {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* PLAYER SECTION */}
        <div className="relative aspect-video w-full rounded-[2rem] md:rounded-[3.5rem] overflow-hidden border border-white/10 bg-black shadow-[0_0_100px_-20px_rgba(220,38,38,0.15)]">
          {shieldActive && (
            <div className="absolute inset-0 z-40 cursor-pointer bg-transparent" onClick={() => setShieldActive(false)} />
          )}
          <iframe
            key={`${activeSource}-${season}-${episode}`}
            src={getSourceUrl()}
            className="w-full h-full"
            allowFullScreen
            onLoad={() => setIsLoading(false)}
            sandbox={activeSource === 'vidsrc_cc' 
              ? "allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-top-navigation-by-user-activation allow-presentation" 
              : undefined
            }
          />
          <AnimatePresence>
            {isLoading && (
              <motion.div exit={{ opacity: 0 }} className="absolute inset-0 bg-[#050505] flex flex-col items-center justify-center z-50">
                <div className="w-12 h-12 border-2 border-white/5 border-t-red-600 rounded-full animate-spin" />
                <p className="mt-4 text-[9px] font-black uppercase tracking-[0.4em] text-white/20">Syncing Relay</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* TV SHOWS - EPISODE SELECTOR */}
        {(movie.type === 'tv' || !!movie.first_air_date) && (
          <div className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <h3 className="text-xl md:text-3xl font-black uppercase italic tracking-tighter">Episodes</h3>
                <div className="relative">
                  <select 
                    value={season} 
                    onChange={(e) => { setSeason(Number(e.target.value)); setEpisode(1); setIsLoading(true); }}
                    className="bg-white/5 border border-white/10 rounded-xl py-2 px-6 pr-10 text-xs font-black uppercase text-red-500 outline-none appearance-none cursor-pointer hover:bg-white/10"
                  >
                    {seasonsData.map(s => <option key={s.id} value={s.season_number} className="bg-zinc-900">Season {s.season_number}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                </div>
              </div>
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                <button onClick={() => setLayout("row")} className={`p-2.5 rounded-lg transition-all ${layout === "row" ? "bg-white/10 text-white" : "text-white/20"}`}><StretchHorizontal size={18} /></button>
                <button onClick={() => setLayout("grid")} className={`p-2.5 rounded-lg transition-all ${layout === "grid" ? "bg-white/10 text-white" : "text-white/20"}`}><LayoutGrid size={18} /></button>
              </div>
            </div>

            <div className={`grid gap-4 md:gap-6 ${layout === "row" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-4 sm:grid-cols-6 lg:grid-cols-10"}`}>
              {episodesList.map((ep) => (
                <button
                  key={ep.id}
                  onClick={() => { setEpisode(ep.episode_number); setIsLoading(true); setShieldActive(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className={`group relative overflow-hidden transition-all duration-500 ${layout === "row" ? "p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-red-500/50" : "aspect-square flex items-center justify-center rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/20"} ${episode === ep.episode_number ? "border-red-600 bg-red-600/10" : ""}`}
                >
                  {layout === "row" ? (
                    <div className="flex gap-4">
                      <div className="relative w-32 aspect-video rounded-lg overflow-hidden shrink-0">
                        <img src={`https://image.tmdb.org/t/p/w300${ep.still_path}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" onError={(e) => e.target.src = 'https://placehold.co/300x169/111/fff?text=No+Preview'} />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><PlayCircle size={24} className="text-white" /></div>
                      </div>
                      <div className="text-left py-1 overflow-hidden">
                        <p className="text-[10px] font-black uppercase text-red-500 mb-1">Episode {ep.episode_number}</p>
                        <p className={`text-sm font-bold truncate ${episode === ep.episode_number ? "text-white" : "text-white/70"}`}>{ep.name || `Episode ${ep.episode_number}`}</p>
                      </div>
                    </div>
                  ) : (
                    <span className={`text-xs font-black ${episode === ep.episode_number ? "text-white" : "text-white/20 group-hover:text-white"}`}>{ep.episode_number}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default WatchPage;