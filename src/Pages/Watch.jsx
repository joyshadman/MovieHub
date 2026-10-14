/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ShieldCheck,
  Server, Globe, ChevronDown, Play,
  LayoutGrid, List, Cpu,
  RefreshCcw, Lightbulb, LightbulbOff,
  PictureInPicture2, Maximize, SkipForward, Repeat,
  RadioTower, Zap as ZapIcon, Star, Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from "react-helmet";
import { db, auth } from '../components/firebase';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import Button, { IconButton } from '../components/ui/Button';
import { Badge } from '../components/ui/Chip';
import SectionHeader from '../components/ui/SectionHeader';
import MovieCard from '../components/MovieCard';
import { movieApi } from '../services/movieApi';
import { writePresence, activityFor } from '../services/presence';
import { fallbackGradient } from '../utils/fallbackArt';
import { findCategoryGenre } from '../utils/genres';
import { Spinner } from '../components/ui/feedback';

const formatRuntime = (min) => {
  if (!min) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
};
const languageName = (code) => {
  if (!code) return null;
  try { return new Intl.DisplayNames(['en'], { type: 'language' }).of(code); } catch { return code; }
};
const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

// Player frame restyled to the Figma "Video Player" look. The video itself is a third party
// iframe that keeps its own controls (spec 0002); every control here drives the existing logic.
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

  // --- TITLE INFO (About + More like this under the player) ---
  // The details page passes the full record; Home and Browse pass a list item, so fetch it then.
  const navigate = useNavigate();
  const hasFullInfo = Array.isArray(movie.similar);
  const [fetchedInfo, setFetchedInfo] = useState(null);
  useEffect(() => {
    if (hasFullInfo) return undefined;
    let cancelled = false;
    const t = movie.type === 'tv' || !!movie.first_air_date ? 'tv' : 'movie';
    movieApi.getDetails(t, movie.id).then((d) => {
      if (!cancelled) setFetchedInfo({ forId: movie.id, data: d });
    });
    return () => { cancelled = true; };
  }, [movie.id, hasFullInfo]);

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

    writePresence(activeUser, { isOnline: true, watching: watchLabel, currentPage: window.location.pathname });
  }, [activeSource, season, episode, movie?.id, currentUser, user]);

  // Closing the player: the tracker goes back to the page underneath instead of "Watching …".
  useEffect(() => () => {
    const activeUser = auth.currentUser;
    if (activeUser) writePresence(activeUser, { watching: activityFor(window.location.pathname) });
  }, []);

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

  const isTV = movie.type === 'tv' || !!movie.first_air_date;
  const title = movie.title || movie.name;
  const activeSourceName = sources.find((s) => s.id === activeSource)?.name || 'source';
  const metaLine = [movie.year || String(movie.release_date || movie.first_air_date || '').slice(0, 4), isTV ? 'Series' : 'Movie']
    .filter(Boolean).join(' • ');

  const info = hasFullInfo ? movie : fetchedInfo?.forId === movie.id ? (fetchedInfo.data || movie) : null;
  const infoLoading = !info;
  const similar = (info?.similar || []).filter((m) => m && String(m.id) !== String(movie.id)).slice(0, 12);
  const posterUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : (info?.image || movie.image || null);
  const infoRating = Number(info?.vote_average || info?.rating || 0);
  const infoYear = String(info?.releaseDate || info?.release_date || info?.year || movie.year || '').slice(0, 4);
  const infoCast = (info?.cast || []).slice(0, 8);
  const credits = info ? [
    info.directors?.length ? { label: info.directors.length > 1 ? 'Directors' : 'Director', value: info.directors.join(', ') } : null,
    !info.directors?.length && info.creators?.length ? { label: 'Created by', value: info.creators.join(', ') } : null,
    info.writers?.length ? { label: 'Writers', value: info.writers.join(', ') } : null,
  ].filter(Boolean) : [];

  // Leaving the player for another title: close the overlay, then open its details page.
  const openTitle = (m) => {
    onClose?.();
    navigate(`/${m.type || (isTV ? 'tv' : 'movie')}/${m.id}`);
  };

  const toolClass = (on) =>
    `inline-flex h-10 w-10 items-center justify-center rounded-full motion-safe:transition-colors ${on ? 'bg-white text-black' : 'text-muted hover:text-white hover:bg-white/10'}`;

  return (
    <Motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      role="dialog"
      aria-modal="true"
      aria-label={`Watching ${title}`}
      className="fixed inset-0 z-[500] bg-canvas text-white overflow-y-auto hide-scrollbar font-body"
    >
      <Helmet>
        <title>{`Watching ${title}`}</title>
      </Helmet>

      {/* LIGHTS OUT OVERLAY */}
      <AnimatePresence>
        {cinemaMode && (
          <Motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setCinemaMode(false)}
            className="fixed inset-0 z-[510] bg-black/95 backdrop-blur-md cursor-pointer"
          />
        )}
      </AnimatePresence>

      {/* Ambient glow like the Figma player background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[70%] h-[60%] bg-accent/10 blur-[140px] rounded-full" />
      </div>

      <div className={`relative mx-auto px-4 md:px-8 py-5 md:py-8 space-y-5 md:space-y-6 motion-safe:transition-all duration-500 ${theaterMode ? 'max-w-full' : 'max-w-7xl'} ${cinemaMode ? 'z-[520]' : ''}`}>

        {/* TOP BAR */}
        <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 motion-safe:transition-opacity ${cinemaMode ? 'opacity-0 pointer-events-none h-0 overflow-hidden' : 'opacity-100'}`}>
          <div className="flex items-center gap-4 min-w-0">
            <IconButton label="Close player" onClick={onClose}>
              <ArrowLeft size={20} aria-hidden="true" />
            </IconButton>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-semibold truncate">
                {title}
                {isTV && <span className="ml-2 text-accent-text">S{season} E{episode}</span>}
              </h1>
              <p className="text-xs text-muted">{metaLine}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
            {/* SOURCE PICKER */}
            <div role="group" aria-label="Video server" className="flex glass rounded-full p-1 gap-1 overflow-x-auto hide-scrollbar">
              {sources.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleManualSourceChange(s.id)}
                  aria-pressed={activeSource === s.id}
                  title={failedSources.includes(s.id) ? 'This server failed to load recently' : s.name}
                  className={`flex flex-1 sm:flex-none items-center justify-center gap-1.5 h-9 px-4 rounded-full text-xs font-semibold whitespace-nowrap motion-safe:transition-colors ${
                    activeSource === s.id ? 'bg-white text-black' : 'text-muted hover:text-white'
                  } ${failedSources.includes(s.id) ? 'opacity-50' : ''}`}
                >
                  {s.icon} {s.name}
                </button>
              ))}
            </div>

            {/* CONTROL CENTER */}
            <div role="toolbar" aria-label="Player tools" className="flex justify-center glass rounded-full p-1 gap-0.5">
              <button type="button" onClick={handleRestart} className={toolClass(false)} aria-label="Restart player" title="Restart player"><RefreshCcw size={17} aria-hidden="true" /></button>
              <button type="button" onClick={togglePiP} className={toolClass(false)} aria-label="Open mini player" title="Mini player"><PictureInPicture2 size={17} aria-hidden="true" /></button>
              <button type="button" onClick={() => setTheaterMode(!theaterMode)} className={toolClass(theaterMode)} aria-pressed={theaterMode} aria-label="Theater mode" title="Theater mode"><Maximize size={17} aria-hidden="true" /></button>
              <button
                type="button"
                onClick={() => setAutoSwitch(!autoSwitch)}
                className={toolClass(autoSwitch)}
                aria-pressed={autoSwitch}
                aria-label="Auto switch server"
                title={`Auto switch server: ${autoSwitch ? 'On' : 'Off'}`}
              >
                <ZapIcon size={17} aria-hidden="true" />
              </button>
              <span className="w-px h-5 bg-line-strong self-center mx-1" aria-hidden="true" />
              <button type="button" onClick={() => setCinemaMode(!cinemaMode)} className={toolClass(cinemaMode)} aria-pressed={cinemaMode} aria-label="Lights out" title="Lights out">
                <Lightbulb size={17} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* PLAYER AREA */}
        <div className={`relative aspect-video w-full rounded-panel overflow-hidden border border-line bg-black shadow-card motion-safe:transition-all duration-500 ${cinemaMode ? 'ring-4 ring-white/5' : ''}`}>
          {shieldActive && (
            <button
              type="button"
              aria-label="Start player"
              className="absolute inset-0 z-40 cursor-pointer bg-transparent"
              onClick={() => setShieldActive(false)}
            />
          )}

          <iframe
            id="player-iframe"
            title={`${title} video player`}
            key={`${activeSource}-${season}-${episode}-${restartKey}`}
            src={getSourceUrl()}
            className="w-full h-full"
            allowFullScreen
            onLoad={() => setIsLoading(false)}
          />

          <AnimatePresence>
            {cinemaMode && (
              <Motion.button
                type="button"
                initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                onClick={() => setCinemaMode(false)}
                aria-label="Turn the lights back on"
                className="absolute top-4 right-4 z-[60] h-12 w-12 flex items-center justify-center bg-white text-black rounded-full shadow-card"
              >
                <LightbulbOff size={20} aria-hidden="true" />
              </Motion.button>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isLoading && (
              <Motion.div exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-canvas flex flex-col items-center justify-center gap-4 px-4 text-center">
                <Spinner size={48} />
                <p className="text-sm text-white">Connecting to {activeSourceName}…</p>
                {autoSwitch && (
                  <p className="text-xs text-muted flex items-center gap-1.5">
                    <ShieldCheck size={14} aria-hidden="true" /> If this stalls, we will try another server automatically.
                  </p>
                )}
              </Motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* PLAYER BAR */}
        <div className={`glass rounded-panel px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 motion-safe:transition-opacity ${cinemaMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <button
            type="button"
            onClick={() => setAutoReplay(!autoReplay)}
            aria-pressed={autoReplay}
            className={`inline-flex items-center gap-2 h-9 px-4 rounded-full text-sm font-medium motion-safe:transition-colors w-full sm:w-auto justify-center ${
              autoReplay ? 'bg-accent text-white' : 'bg-white/10 text-muted hover:text-white'
            }`}
          >
            <Repeat size={15} aria-hidden="true" /> Auto replay {autoReplay ? 'on' : 'off'}
          </button>

          <p className="hidden md:block text-sm text-muted truncate">
            <span className="font-semibold text-white">{title}</span>
            {isTV && <span> • Season {season}, Episode {episode}</span>}
          </p>

          {isTV ? (
            <button
              type="button"
              onClick={handleNextEpisode}
              className="inline-flex items-center justify-center gap-2 h-9 px-5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 w-full sm:w-auto"
            >
              Next episode <SkipForward size={15} aria-hidden="true" />
            </button>
          ) : (
            <span className="hidden sm:block w-[120px]" aria-hidden="true" />
          )}
        </div>

        {isTV && (
          <section aria-labelledby="episodes-heading" className={`space-y-5 motion-safe:transition-opacity ${cinemaMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <h2 id="episodes-heading" className="text-xl font-semibold">Episodes</h2>
                <div className="relative">
                  <label htmlFor="season-select" className="sr-only">Season</label>
                  <select
                    id="season-select"
                    value={season}
                    onChange={(e) => { setSeason(Number(e.target.value)); setEpisode(1); setIsLoading(true); }}
                    className="h-10 appearance-none rounded-control bg-white/[0.06] border border-line-strong pl-4 pr-10 text-sm font-semibold text-white cursor-pointer hover:bg-white/10 focus-visible:border-accent-text"
                  >
                    {seasonsData.map((s) => <option key={s.id} value={s.season_number} className="bg-sheet">Season {s.season_number}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" aria-hidden="true" />
                </div>
              </div>
              <div role="group" aria-label="Episode layout" className="flex rounded-control border border-line p-1 gap-1">
                <button type="button" onClick={() => setLayout('row')} aria-pressed={layout === 'row'} aria-label="List view" className={`h-9 w-9 flex items-center justify-center rounded-lg ${layout === 'row' ? 'bg-accent text-white' : 'text-muted hover:text-white'}`}><List size={18} aria-hidden="true" /></button>
                <button type="button" onClick={() => setLayout('grid')} aria-pressed={layout === 'grid'} aria-label="Number grid view" className={`h-9 w-9 flex items-center justify-center rounded-lg ${layout === 'grid' ? 'bg-accent text-white' : 'text-muted hover:text-white'}`}><LayoutGrid size={18} aria-hidden="true" /></button>
              </div>
            </div>

            <ul className={`grid gap-3 md:gap-4 ${layout === 'row' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-4 sm:grid-cols-6 lg:grid-cols-10'}`}>
              {episodesList.map((ep) => {
                const active = episode === ep.episode_number;
                return (
                  <li key={ep.id}>
                    <button
                      type="button"
                      aria-current={active ? 'true' : undefined}
                      onClick={() => { setEpisode(ep.episode_number); setIsLoading(true); setShieldActive(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className={`group w-full text-left motion-safe:transition-colors ${
                        layout === 'row'
                          ? `flex gap-3 p-2 rounded-card border ${active ? 'border-accent bg-accent/10' : 'border-line bg-card hover:border-line-strong'}`
                          : `aspect-square flex items-center justify-center rounded-control border text-sm font-semibold ${active ? 'border-accent bg-accent text-white' : 'border-line bg-card text-muted hover:text-white hover:border-line-strong'}`
                      }`}
                    >
                      {layout === 'row' ? (
                        <>
                          <div className="relative w-28 sm:w-32 aspect-video rounded-lg overflow-hidden shrink-0 bg-raised">
                            {ep.still_path && (
                              <img src={`https://image.tmdb.org/t/p/w300${ep.still_path}`} className="w-full h-full object-cover" alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                            )}
                            <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 motion-safe:transition-opacity">
                              <Play size={20} className="fill-white text-white" aria-hidden="true" />
                            </span>
                          </div>
                          <div className="min-w-0 py-1">
                            <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-accent-text">Episode {ep.episode_number}</p>
                            <p className={`text-sm font-semibold truncate ${active ? 'text-white' : 'text-white/85'}`}>{ep.name || `Episode ${ep.episode_number}`}</p>
                            {ep.runtime ? <p className="text-xs text-muted mt-0.5">{ep.runtime}m</p> : null}
                          </div>
                        </>
                      ) : (
                        <span><span className="sr-only">Episode </span>{ep.episode_number}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <div className={`space-y-10 pt-4 pb-16 motion-safe:transition-opacity ${cinemaMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          {/* ABOUT THIS TITLE */}
          <section aria-labelledby="watch-about-heading" aria-busy={infoLoading || undefined} className="relative overflow-hidden rounded-sheet border border-line bg-card motion-safe:animate-rise">
            {info?.backdrop && (
              <div className="absolute inset-0 opacity-25" aria-hidden="true">
                <img src={String(info.backdrop).replace('/t/p/original', '/t/p/w780')} alt="" loading="lazy" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-card via-card/90 to-card/60" />
              </div>
            )}
            <div className="relative grid gap-6 p-5 md:p-8 sm:grid-cols-[150px_1fr] lg:grid-cols-[190px_1fr]">
              <div
                className="hidden sm:block aspect-[2/3] overflow-hidden rounded-card border border-line shadow-card"
                style={posterUrl ? undefined : { backgroundImage: fallbackGradient(movie.id) }}
              >
                {posterUrl && <img src={posterUrl} alt={`${title} poster`} loading="lazy" className="h-full w-full object-cover" />}
              </div>

              {infoLoading ? (
                <div className="space-y-3 py-1">
                  <h2 id="watch-about-heading" className="sr-only">About {title}</h2>
                  <div className="h-3 w-28 rounded-full bg-raised motion-safe:animate-pulse" />
                  <div className="h-9 w-2/3 rounded-lg bg-raised motion-safe:animate-pulse" />
                  <div className="h-3 w-1/2 rounded-full bg-raised motion-safe:animate-pulse" />
                  <div className="h-16 w-full max-w-2xl rounded-lg bg-raised motion-safe:animate-pulse" />
                </div>
              ) : (
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-accent-text">About this {isTV ? 'series' : 'movie'}</p>
                  <h2 id="watch-about-heading" className="mt-1 font-display text-4xl md:text-5xl uppercase leading-none break-words">{title}</h2>
                  {info.tagline && <p className="mt-2 text-sm italic text-muted">“{info.tagline}”</p>}

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
                    {infoYear && <span>{infoYear}</span>}
                    {!isTV && info.runtime ? <span>{formatRuntime(info.runtime)}</span> : null}
                    {isTV && info.seasons ? <span>{info.seasons} season{info.seasons > 1 ? 's' : ''}{info.episodes ? `, ${info.episodes} episodes` : ''}</span> : null}
                    {infoRating > 0 && (
                      <span className="inline-flex items-center gap-1 font-semibold text-white">
                        <Star size={14} className="fill-rating text-rating" aria-hidden="true" /> {infoRating.toFixed(1)}
                      </span>
                    )}
                    {languageName(info.language) && <span>{languageName(info.language)}</span>}
                    <Badge>{isTV ? 'Series' : 'Movie'}</Badge>
                  </div>

                  {info.genres?.length > 0 && (
                    <ul className="mt-4 flex flex-wrap gap-2" aria-label="Genres">
                      {info.genres.map((g, i) => {
                        const cat = findCategoryGenre(info.genreIds?.[i]);
                        const cls = 'inline-flex items-center h-8 px-3.5 rounded-full border border-line-strong text-xs font-medium text-white';
                        return (
                          <li key={g}>
                            {cat ? (
                              <button type="button" onClick={() => { onClose?.(); navigate(`/categories/${cat.id}${isTV ? '?type=tv' : ''}`); }} className={`${cls} hover:bg-white/10 motion-safe:transition-colors`}>{g}</button>
                            ) : <span className={cls}>{g}</span>}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {info.overview && <p className="mt-4 text-sm md:text-base text-muted max-w-3xl">{info.overview}</p>}

                  {credits.length > 0 && (
                    <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl">
                      {credits.map((c) => (
                        <div key={c.label}>
                          <dt className="text-xs text-muted">{c.label}</dt>
                          <dd className="text-sm text-white">{c.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}

                  {infoCast.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-xs text-muted mb-3">Cast</h3>
                      <ul className="flex gap-4 overflow-x-auto hide-scrollbar pb-1">
                        {infoCast.map((actor, i) => (
                          <li key={`${actor.id || actor.name}-${i}`} className="w-20 shrink-0 text-center motion-safe:animate-rise" style={{ animationDelay: `${i * 50}ms` }}>
                            {actor.profile ? (
                              <img src={actor.profile} alt="" loading="lazy" className="mx-auto h-16 w-16 rounded-full object-cover border border-line" />
                            ) : (
                              <span className="mx-auto h-16 w-16 rounded-full border border-line flex items-center justify-center text-base font-semibold" style={{ backgroundImage: fallbackGradient(actor.name) }}>{initials(actor.name)}</span>
                            )}
                            <p className="mt-2 text-[11px] font-semibold text-white truncate">{actor.name}</p>
                            <p className="text-[10px] text-muted truncate">{actor.character}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-6">
                    <Button variant="outline" size="sm" onClick={() => openTitle(movie)} icon={<Info size={15} aria-hidden="true" />}>
                      Full details
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* MORE LIKE THIS */}
          {similar.length > 0 && (
            <section aria-labelledby="watch-similar-heading">
              <SectionHeader id="watch-similar-heading" title="More Like This" />
              <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
                {similar.map((m, i) => (
                  <li key={m.id} className="motion-safe:animate-rise" style={{ animationDelay: `${i * 40}ms` }}>
                    <MovieCard movie={m} onClick={openTitle} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </Motion.div>
  );
};

export default WatchPage;
