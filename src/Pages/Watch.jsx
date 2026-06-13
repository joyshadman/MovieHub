/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ShieldCheck, 
  Server, Globe, ChevronDown, PlayCircle,
  LayoutGrid, StretchHorizontal, Cpu,
  RefreshCcw, Lightbulb, LightbulbOff,
  ExternalLink, Maximize, SkipForward, Repeat,
  RadioTower, Zap as ZapIcon
} from 'lucide-react';
import { Helmet } from "react-helmet";
import { db, auth } from '../components/firebase';
import { doc, updateDoc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const WatchPage = ({ movie, user, onClose }) => {
  const [activeSource, setActiveSource] = useState('vidsrc_pro');
  const [isLoading, setIsLoading] = useState(true);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [seasonsData, setSeasonsData] = useState([]);
  const [episodesList, setEpisodesList] = useState([]);
  const [layout, setLayout] = useState("row");
  const [shieldActive, setShieldActive] = useState(true);
  const [currentUser, setCurrentUser] = useState(user || null);

  // --- NEW FEATURE STATES ---
  const [restartKey, setRestartKey] = useState(0);
  const [cinemaMode, setCinemaMode] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);
  const [autoReplay, setAutoReplay] = useState(false);

  // --- AUTO SOURCE SWITCHER STATES ---
  const [autoSwitch, setAutoSwitch] = useState(true);
  const [failedSources, setFailedSources] = useState([]);

  useEffect(() => {
    if (user) {
      setCurrentUser(user);
      return;
    }
    const unsub = auth.onAuthStateChanged((u) => setCurrentUser(u || null));
    return () => unsub();
  }, [user]);

  const sources = [
    { id: 'vidsrc_pro', name: 'VidSrc Pro', icon: <Server size={14} /> },
    { id: 'vidsrc_cc', name: 'VidSrc CC', icon: <RadioTower size={14} /> },
    { id: 'vidlink', name: 'VidLink', icon: <Globe size={14} /> },
    { id: 'vidsrc_xyz', name: 'VidSrc XYZ', icon: <Cpu size={14} /> },
  ];

  const getOptions = () => ({
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_TMDB_READ_TOKEN}`
    }
  });

  // Helper to prevent Firebase "undefined" errors
  const cleanData = (obj) => {
    const clean = {};
    Object.keys(obj).forEach(key => {
      if (obj[key] !== undefined && obj[key] !== null) clean[key] = obj[key];
    });
    return clean;
  };

  const addToHistory = async (s = season, e = episode) => {
    const activeUser = currentUser || user || auth.currentUser;
    if (!activeUser) return;
    try {
      const historyRef = doc(db, "history", activeUser.uid);
      const historySnap = await getDoc(historyRef);
      const isTV = movie.type === 'tv' || !!movie.first_air_date;

      const historyItem = cleanData({
        ...movie,
        id: movie.id,
        type: isTV ? 'tv' : 'movie',
        title: movie.title || movie.name,
        watchedAt: Date.now(),
        lastSeason: isTV ? s : null,
        lastEpisode: isTV ? e : null,
        progress: 90 
      });

      if (historySnap.exists()) {
        const existingData = historySnap.data().items || [];
        const updatedItems = existingData.filter(item => {
          const itemType = item.type || (item.first_air_date ? 'tv' : 'movie');
          return !(String(item.id) === String(movie.id) && itemType === historyItem.type);
        });
        await updateDoc(historyRef, { items: [historyItem, ...updatedItems].slice(0, 20) });
      } else {
        await setDoc(historyRef, { items: [historyItem] });
      }
    } catch (err) { console.error("Error updating history:", err); }
  };

  useEffect(() => {
    const initLoad = async () => {
      const isTV = movie.type === 'tv' || !!movie.first_air_date;
      const activeUser = currentUser || user || auth.currentUser;
      if (activeUser && isTV) {
        try {
          const historyRef = doc(db, "history", activeUser.uid);
          const snap = await getDoc(historyRef);
          if (snap.exists()) {
            const item = snap.data().items?.find(i => String(i.id) === String(movie.id));
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
          setSeasonsData(data.seasons?.filter(s => s.season_number > 0) || []);
        } catch (err) { console.error(err); }
      }
      addToHistory(season, episode);
    };
    initLoad();
  }, [movie.id, currentUser]);

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

  useEffect(() => { if (movie.id) addToHistory(season, episode); }, [season, episode]);

  useEffect(() => {
    const activeUser = currentUser || user || auth.currentUser;
    if (!activeUser || !movie?.id) return;

    const isTV = movie.type === 'tv' || !!movie.first_air_date;
    const sourceLabel = sources.find((s) => s.id === activeSource)?.name || activeSource;
    const watchLabel = isTV
      ? `Watching ${movie.title || movie.name} S${season}E${episode} (${sourceLabel})`
      : `Watching ${movie.title || movie.name} (${sourceLabel})`;

    setDoc(
      doc(db, "users", activeUser.uid),
      {
        displayName: activeUser.displayName || "Anonymous",
        email: activeUser.email || null,
        photoURL: activeUser.photoURL || null,
        isOnline: true,
        watching: watchLabel,
        currentPage: window.location.pathname,
        lastActive: serverTimestamp(),
      },
      { merge: true }
    ).catch((err) => console.error("Activity update error:", err));
  }, [activeSource, season, episode, movie?.id, currentUser, user]);

  // Reset failed-sources tracker whenever the movie/show changes
  useEffect(() => {
    setFailedSources([]);
  }, [movie.id]);

  // AUTO SOURCE SWITCHER:
  // If the iframe doesn't fire onLoad within the timeout window, assume the
  // current source is dead/slow and cycle to the next untried source.
  useEffect(() => {
    if (!autoSwitch) return;

    setIsLoading(true);
    const timeoutId = setTimeout(() => {
      setIsLoading((stillLoading) => {
        if (stillLoading) {
          setFailedSources((prev) => {
            const updated = [...new Set([...prev, activeSource])];
            const nextSource = sources.find((s) => !updated.includes(s.id));
            if (nextSource) {
              setActiveSource(nextSource.id);
              return updated;
            }
            // All sources exhausted — reset and retry from scratch
            setActiveSource(sources[0].id);
            return [];
          });
          setShieldActive(true);
          return true; // keep loading flag true until new iframe loads
        }
        return stillLoading;
      });
    }, 9000); // 9s per source before switching

    return () => clearTimeout(timeoutId);
  }, [activeSource, season, episode, autoSwitch]);

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
    
    let url = urls[activeSource];
    if (autoReplay) url += (url.includes('?') ? '&' : '?') + 'loop=1';
    return url;
  };

  // --- HANDLERS ---
  const handleRestart = () => {
    setIsLoading(true);
    setRestartKey(prev => prev + 1);
    setShieldActive(true);
  };

  const handleNextEpisode = () => {
    if (episode < episodesList.length) {
      setEpisode(prev => prev + 1);
      setIsLoading(true);
      setShieldActive(true);
    } else if (season < seasonsData.length) {
      setSeason(prev => prev + 1);
      setEpisode(1);
      setIsLoading(true);
      setShieldActive(true);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const togglePiP = () => {
    window.open(getSourceUrl(), 'PiP', 'width=800,height=450,menubar=no,status=no');
  };

  const handleManualSourceChange = (id) => {
    setActiveSource(id);
    setIsLoading(true);
    setShieldActive(true);
    // Manual pick shouldn't be immediately re-flagged as failed if it's slow
    setFailedSources((prev) => prev.filter((f) => f !== id));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-[500] bg-[#020202] text-white overflow-y-auto no-scrollbar"
    >
      <Helmet>
        <title>{`Watching ${movie.title || movie.name}`}</title>
      </Helmet>

      {/* LIGHTS OUT OVERLAY */}
      <AnimatePresence>
        {cinemaMode && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setCinemaMode(false)}
            className="fixed inset-0 z-[510] bg-black/95 backdrop-blur-md cursor-pointer"
          />
        )}
      </AnimatePresence>

      {/* AMBIENT GLOW */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/10 blur-[120px] rounded-full" />
      </div>

      <div className={`relative mx-auto px-3 sm:px-4 md:px-10 py-6 sm:py-8 md:py-12 space-y-6 sm:space-y-8 transition-all duration-700 ${theaterMode ? 'max-w-full' : 'max-w-7xl'} ${cinemaMode ? 'z-[520]' : ''}`}>
        
        {/* HEADER SECTION */}
        <div className={`flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-6 border-b border-white/5 pb-6 sm:pb-8 transition-all duration-500 ${cinemaMode ? 'opacity-0 h-0 overflow-hidden mb-0' : 'opacity-100'}`}>
          <div className="space-y-3 sm:space-y-4">
            <button onClick={onClose} className="group flex items-center gap-2 text-white/40 hover:text-white transition-all text-xs font-black uppercase tracking-widest">
              <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
                <ChevronLeft size={18} />
              </div>
              Exit Player
            </button>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-none break-words">
              {movie.title || movie.name}
              {movie.type === 'tv' && <span className="text-red-600 ml-2 sm:ml-4 text-lg sm:text-2xl not-italic">S{season} E{episode}</span>}
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* SOURCE PICKER */}
            <div className="flex flex-wrap sm:flex-nowrap bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-1.5 rounded-2xl sm:rounded-full overflow-x-auto no-scrollbar gap-1 w-full sm:w-auto">
                {sources.map(s => (
                <button
                    key={s.id}
                    onClick={() => handleManualSourceChange(s.id)}
                    className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase transition-all whitespace-nowrap flex-1 sm:flex-none ${
                    activeSource === s.id ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'text-white/40 hover:text-white'
                    } ${failedSources.includes(s.id) ? 'opacity-40' : ''}`}
                    title={failedSources.includes(s.id) ? 'This source failed to load recently' : s.name}
                >
                    {s.icon} {s.name}
                </button>
                ))}
            </div>

            {/* CONTROL CENTER */}
            <div className="flex flex-wrap justify-center sm:justify-start bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-1.5 rounded-2xl sm:rounded-full gap-0.5">
                <button onClick={handleRestart} className="p-2.5 hover:bg-white/10 rounded-full text-white/40 hover:text-red-500 transition-all" title="Restart Player"><RefreshCcw size={16} /></button>
                <button onClick={togglePiP} className="p-2.5 hover:bg-white/10 rounded-full text-white/40 hover:text-blue-400 transition-all" title="Mini Player (PiP)"><ExternalLink size={16} /></button>
                <button onClick={() => setTheaterMode(!theaterMode)} className={`p-2.5 rounded-full transition-all ${theaterMode ? 'text-blue-500 bg-blue-500/10' : 'text-white/40 hover:text-white hover:bg-white/10'}`} title="Theater Mode"><Maximize size={16} /></button>
                <button 
                  onClick={() => setAutoSwitch(!autoSwitch)} 
                  className={`p-2.5 rounded-full transition-all ${autoSwitch ? 'text-green-500 bg-green-500/10' : 'text-white/40 hover:text-white hover:bg-white/10'}`} 
                  title={`Auto Source Switch: ${autoSwitch ? 'On' : 'Off'}`}
                >
                  <ZapIcon size={16} />
                </button>
                <div className="w-[1px] h-4 bg-white/10 self-center mx-1" />
                <button 
                  onClick={() => setCinemaMode(!cinemaMode)}
                  className="p-2.5 rounded-full text-white/40 hover:text-yellow-500 hover:bg-white/10 transition-all"
                  title="Lights Out Mode"
                >
                    <Lightbulb size={16} />
                </button>
            </div>
          </div>
        </div>

        {/* PLAYER AREA */}
        <div className="space-y-4">
          <div className={`relative aspect-video w-full rounded-2xl sm:rounded-[1.5rem] md:rounded-[3rem] overflow-hidden border border-white/10 bg-black transition-all duration-700 shadow-2xl ${cinemaMode ? 'scale-[1.02] shadow-red-600/30 ring-4 ring-white/5' : 'shadow-black'}`}>
            {shieldActive && (
              <div className="absolute inset-0 z-40 cursor-pointer bg-transparent" onClick={() => setShieldActive(false)} />
            )}
            
            <iframe
              id="player-iframe"
              key={`${activeSource}-${season}-${episode}-${restartKey}`}
              src={getSourceUrl()}
              className="w-full h-full"
              allowFullScreen
              onLoad={() => setIsLoading(false)}
            />

            {/* FLOATING LIGHT SWITCH (Visible only in cinema mode) */}
            <AnimatePresence>
              {cinemaMode && (
                <motion.button 
                  initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                  onClick={() => setCinemaMode(false)}
                  className="absolute top-4 right-4 sm:top-6 sm:right-6 z-[60] p-3 sm:p-4 bg-white text-black rounded-full shadow-[0_0_30px_rgba(255,255,255,0.6)] hover:scale-110 transition-transform"
                >
                  <LightbulbOff size={20} />
                </motion.button>
              )}
            </AnimatePresence>

            {/* LOADING OVERLAY */}
            <AnimatePresence>
              {isLoading && (
                <motion.div exit={{ opacity: 0 }} className="absolute inset-0 bg-[#050505] flex flex-col items-center justify-center z-50 px-4 text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-white/5 border-t-red-600 rounded-full animate-spin" />
                  <p className="mt-4 sm:mt-6 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.4em] sm:tracking-[0.5em] text-white/30 animate-pulse">Establishing Link</p>
                  {autoSwitch && (
                    <p className="mt-2 text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.2em] text-white/15 flex items-center gap-1.5">
                      <ShieldCheck size={12} /> Auto-switch active — will try another source if this stalls
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* PLAYER SUB-BAR */}
          <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-2 sm:px-4 transition-opacity ${cinemaMode ? 'opacity-0' : 'opacity-100'}`}>
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <button 
                onClick={() => setAutoReplay(!autoReplay)}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all flex-1 sm:flex-none ${autoReplay ? 'bg-red-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
              >
                <Repeat size={14} /> Auto Replay {autoReplay ? 'On' : 'Off'}
              </button>
            </div>

            {(movie.type === 'tv' || !!movie.first_air_date) && (
              <button 
                onClick={handleNextEpisode}
                className="flex items-center justify-center gap-2 px-6 py-2 bg-white text-black rounded-full text-[10px] font-black uppercase hover:bg-red-600 hover:text-white transition-all group w-full sm:w-auto"
              >
                Next Episode <SkipForward size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>
        </div>


        {(movie.type === 'tv' || !!movie.first_air_date) && (
          <div className={`space-y-6 sm:space-y-8 pb-16 sm:pb-20 transition-all duration-500 ${cinemaMode ? 'opacity-0 pointer-events-none translate-y-10' : 'opacity-100 translate-y-0'}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <h3 className="text-lg sm:text-xl md:text-3xl font-black uppercase italic tracking-tighter">Selection</h3>
                <div className="relative">
                  <select 
                    value={season} 
                    onChange={(e) => { setSeason(Number(e.target.value)); setEpisode(1); setIsLoading(true); }}
                    className="bg-white/5 border border-white/10 rounded-xl py-2.5 px-5 sm:px-6 pr-9 sm:pr-10 text-xs font-black uppercase text-red-500 outline-none appearance-none cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    {seasonsData.map(s => <option key={s.id} value={s.season_number} className="bg-zinc-900">Season {s.season_number}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                </div>
              </div>
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 self-start md:self-auto">
                <button onClick={() => setLayout("row")} className={`p-2.5 rounded-lg transition-all ${layout === "row" ? "bg-white/10 text-white" : "text-white/20"}`}><StretchHorizontal size={18} /></button>
                <button onClick={() => setLayout("grid")} className={`p-2.5 rounded-lg transition-all ${layout === "grid" ? "bg-white/10 text-white" : "text-white/20"}`}><LayoutGrid size={18} /></button>
              </div>
            </div>

            <div className={`grid gap-3 sm:gap-4 md:gap-6 ${layout === "row" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-3 sm:grid-cols-6 lg:grid-cols-10"}`}>
              {episodesList.map((ep) => (
                <button
                  key={ep.id}
                  onClick={() => { setEpisode(ep.episode_number); setIsLoading(true); setShieldActive(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className={`group relative overflow-hidden transition-all duration-500 ${layout === "row" ? "p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-red-500/50" : "aspect-square flex items-center justify-center rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/20"} ${episode === ep.episode_number ? "border-red-600 bg-red-600/10 ring-1 ring-red-600/50" : ""}`}
                >
                  {layout === "row" ? (
                    <div className="flex gap-3 sm:gap-4">
                      <div className="relative w-24 sm:w-32 aspect-video rounded-lg overflow-hidden shrink-0">
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