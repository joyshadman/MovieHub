/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Play, Pause, RotateCcw, RotateCw, Volume2, Volume1, VolumeX, Maximize, Minimize,
  SkipForward, ListVideo, Captions, Settings, ServerCrash, RefreshCcw, AlertTriangle,
} from 'lucide-react';
import { Helmet } from 'react-helmet';
import { db, auth } from '../components/firebase';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { writePresence, activityFor } from '../services/presence';
import { STREAM_SOURCES } from '../config/streamSources';
import { movieApi } from '../services/movieApi';
import { fetchFrameXProviders, loadProgress, saveProgress } from '../services/frameX';
import { useFrameXPlayer } from '../components/player/useFrameXPlayer';
import SettingsMenu from '../components/player/SettingsMenu';
import EpisodesPanel from '../components/player/EpisodesPanel';
import { Spinner } from '../components/ui/feedback';

const HIDE_UI_MS = 3000;
const BACKUP_TIMEOUT_MS = 12000;
const NEXT_UP_SECONDS = 8;

const fmt = (sec) => {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
};

const readVolume = () => {
  try { const v = Number(localStorage.getItem('mh:volume')); return Number.isFinite(v) && v > 0 && v <= 1 ? v : 1; } catch { return 1; }
};

const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;

// Control button for the dark player chrome.
const Ctl = ({ label, onClick, children, className = '', active = false, ...rest }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/90 hover:text-white hover:bg-white/10 motion-safe:transition-all motion-safe:hover:scale-110 motion-safe:active:scale-95 ${active ? 'text-white bg-white/10' : ''} ${className}`}
    {...rest}
  >
    {children}
  </button>
);

// Seek bar: click or drag, keyboard arrows, time preview on hover.
const SeekBar = ({ current, duration, onSeek }) => {
  const ref = useRef(null);
  const [hover, setHover] = useState(null);
  const [drag, setDrag] = useState(null);
  const ratioAt = (clientX) => {
    const r = ref.current.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  };
  const shown = drag ?? (duration ? current / duration : 0);
  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration) || 0}
      aria-valuenow={Math.round(current)}
      aria-valuetext={`${fmt(current)} of ${fmt(duration)}`}
      onPointerDown={(e) => { if (!duration) return; e.currentTarget.setPointerCapture(e.pointerId); setDrag(ratioAt(e.clientX)); }}
      onPointerMove={(e) => { const x = ratioAt(e.clientX); setHover(x); if (drag !== null) setDrag(x); }}
      onPointerUp={(e) => { if (drag !== null) { onSeek(ratioAt(e.clientX) * duration); setDrag(null); } }}
      onPointerLeave={() => setHover(null)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); onSeek(current + (e.key === 'ArrowRight' ? 10 : -10)); }
        if (e.key === 'Home') { e.preventDefault(); onSeek(0); }
      }}
      className={`group/seek relative h-5 w-full touch-none ${duration ? 'cursor-pointer' : 'cursor-default opacity-50'}`}
    >
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/20 motion-safe:transition-[height] group-hover/seek:h-1.5">
        {hover !== null && duration > 0 && <div className="absolute inset-y-0 left-0 rounded-full bg-white/25" style={{ width: `${hover * 100}%` }} />}
        <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${shown * 100}%` }} />
      </div>
      <div
        className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_0_4px_rgb(225_29_72/0.25)] scale-0 group-hover/seek:scale-100 group-focus-visible/seek:scale-100 motion-safe:transition-transform"
        style={{ left: `${shown * 100}%`, ...(drag !== null ? { transform: 'translate(-50%,-50%) scale(1)' } : {}) }}
        aria-hidden="true"
      />
      {hover !== null && duration > 0 && (
        <span className="pointer-events-none absolute -top-8 -translate-x-1/2 rounded-md bg-black/80 px-2 py-1 text-xs font-semibold text-white" style={{ left: `${hover * 100}%` }}>
          {fmt(hover * duration)}
        </span>
      )}
    </div>
  );
};

// Full screen Netflix style player. frameXTV is driven through its postMessage API with our own
// controls; backup sources keep their own controls inside the iframe (see config/streamSources.js).
const WatchPage = ({ movie, user, onClose }) => {
  const isTV = movie.type === 'tv' || !!movie.first_air_date;
  const title = movie.title || movie.name;

  const [sourceId, setSourceId] = useState(STREAM_SOURCES[0].id);
  const [providerId, setProviderId] = useState(null);
  const [providers, setProviders] = useState([]);
  const [nativeControls, setNativeControls] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [seasonsData, setSeasonsData] = useState([]);
  const [episodesList, setEpisodesList] = useState([]);
  const [currentUser, setCurrentUser] = useState(user || null);
  const [autoSwitch, setAutoSwitch] = useState(true);
  const [failedSources, setFailedSources] = useState([]);
  const [triedProviders, setTriedProviders] = useState([]);
  const [startAt, setStartAt] = useState(() => (isTV ? 0 : loadProgress({ id: movie.id, isTV })?.t || 0));
  const [volume, setVolume] = useState(readVolume);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [subtitlesOn, setSubtitlesOn] = useState(false);
  const [panel, setPanel] = useState(null); // 'episodes' | 'settings' | null
  const [showUI, setShowUI] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [backupLoading, setBackupLoading] = useState(true);
  const [shieldActive, setShieldActive] = useState(true);
  const [nextUp, setNextUp] = useState(null); // seconds left before auto next episode
  const [flash, setFlash] = useState(null);

  const stageRef = useRef(null);
  const frameRef = useRef(null);
  const hideTimer = useRef(null);

  const source = STREAM_SOURCES.find((s) => s.id === sourceId) || STREAM_SOURCES[0];
  const isFrameX = source.id === 'framex';
  const custom = isFrameX && !nativeControls;
  const loadKey = `${sourceId}|${providerId || 'auto'}|${season}|${episode}|${reloadKey}|${nativeControls}`;
  const poster = movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : (movie.backdrop ? String(movie.backdrop).replace('/t/p/original', '/t/p/w1280') : null);
  const progressRef = { id: movie.id, isTV, season, episode };

  // --- SOURCE FALLBACK ---
  const moveToNextSource = useCallback((failedId) => {
    setFailedSources((prev) => {
      const updated = [...new Set([...prev, failedId])];
      const next = STREAM_SOURCES.find((s) => !updated.includes(s.id));
      setSourceId(next ? next.id : STREAM_SOURCES[0].id);
      setBackupLoading(true);
      setShieldActive(true);
      return next ? updated : [];
    });
  }, []);

  // frameXTV failed to answer or found no stream: try two of its own servers first (keeps our
  // controls), then fall back to a backup source.
  const handleFrameXFail = useCallback((reason) => {
    if (!autoSwitch) return;
    const tried = [...triedProviders, providerId || 'auto'];
    const nextProvider = reason === 'no-stream' && tried.length < 3 ? providers.find((p) => !tried.includes(p.id)) : null;
    if (nextProvider) {
      setTriedProviders(tried);
      setProviderId(nextProvider.id);
    } else {
      setTriedProviders([]);
      moveToNextSource('framex');
    }
  }, [autoSwitch, triedProviders, providerId, providers, moveToNextSource]);

  const player = useFrameXPlayer({ frameRef, active: isFrameX, loadKey, onFail: handleFrameXFail });

  useEffect(() => {
    if (user) { setCurrentUser(user); return undefined; }
    const unsub = auth.onAuthStateChanged((u) => setCurrentUser(u || null));
    return () => unsub();
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    fetchFrameXProviders().then((list) => { if (!cancelled) setProviders(list); });
    return () => { cancelled = true; };
  }, []);

  // --- TMDB SEASONS / EPISODES + HISTORY (existing behavior) ---
  const getOptions = () => ({
    method: 'GET',
    headers: { accept: 'application/json', Authorization: `Bearer ${import.meta.env.VITE_TMDB_READ_TOKEN}` },
  });

  const cleanData = (obj) => {
    const clean = {};
    Object.keys(obj).forEach((key) => { if (obj[key] !== undefined && obj[key] !== null) clean[key] = obj[key]; });
    return clean;
  };

  const addToHistory = async (s = season, e = episode) => {
    const activeUser = currentUser || user || auth.currentUser;
    if (!activeUser) return;
    try {
      const historyRef = doc(db, 'history', activeUser.uid);
      const historySnap = await getDoc(historyRef);
      const historyItem = cleanData({
        ...movie,
        id: movie.id,
        type: isTV ? 'tv' : 'movie',
        title,
        watchedAt: Date.now(),
        lastSeason: isTV ? s : null,
        lastEpisode: isTV ? e : null,
        progress: 90,
      });
      if (historySnap.exists()) {
        const existingData = historySnap.data().items || [];
        const updatedItems = existingData.filter((item) => {
          const itemType = item.type || (item.first_air_date ? 'tv' : 'movie');
          return !(String(item.id) === String(movie.id) && itemType === historyItem.type);
        });
        await updateDoc(historyRef, { items: [historyItem, ...updatedItems].slice(0, 20) });
      } else {
        await setDoc(historyRef, { items: [historyItem] });
      }
    } catch (err) { console.error('Error updating history:', err); }
  };

  useEffect(() => {
    const initLoad = async () => {
      const activeUser = currentUser || user || auth.currentUser;
      if (activeUser && isTV) {
        try {
          const snap = await getDoc(doc(db, 'history', activeUser.uid));
          if (snap.exists()) {
            const item = snap.data().items?.find((i) => String(i.id) === String(movie.id));
            if (item?.lastSeason) {
              const s = item.lastSeason;
              const e = item.lastEpisode || 1;
              setSeason(s);
              setEpisode(e);
              setStartAt(loadProgress({ id: movie.id, isTV, season: s, episode: e })?.t || 0);
            }
          }
        } catch (err) { console.error('Resume Error:', err); }
      }
      if (isTV) {
        try {
          const res = await fetch(`https://api.themoviedb.org/3/tv/${movie.id}`, getOptions());
          const data = await res.json();
          setSeasonsData(data.seasons?.filter((s) => s.season_number > 0) || []);
        } catch (err) { console.error(err); }
      }
      addToHistory(season, episode);
    };
    initLoad();
  }, [movie.id, currentUser]);

  useEffect(() => {
    if (!isTV) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const eps = await movieApi.getSeason(movie.id, season);
        if (!cancelled) setEpisodesList(eps);
      } catch (err) { console.error(err); }
    })();
    return () => { cancelled = true; };
  }, [movie.id, season]);

  useEffect(() => { if (movie.id) addToHistory(season, episode); }, [season, episode]);

  // --- TRACKER (existing behavior) ---
  useEffect(() => {
    const activeUser = currentUser || user || auth.currentUser;
    if (!activeUser || !movie?.id) return;
    const serverLabel = isFrameX && providerId ? `${source.name} · ${providers.find((p) => p.id === providerId)?.name || providerId}` : source.name;
    const watchLabel = isTV ? `Watching ${title} S${season}E${episode} (${serverLabel})` : `Watching ${title} (${serverLabel})`;
    writePresence(activeUser, { isOnline: true, watching: watchLabel, currentPage: window.location.pathname });
  }, [sourceId, providerId, season, episode, movie?.id, currentUser, user]);

  useEffect(() => () => {
    const activeUser = auth.currentUser;
    if (activeUser) writePresence(activeUser, { watching: activityFor(window.location.pathname) });
  }, []);

  // --- frameXTV: re-apply our settings once a stream is ready, save resume points ---
  useEffect(() => {
    if (!custom || !player.ready) return;
    player.send('setVolume', { volume });
    if (muted) player.send('mute');
    if (speed !== 1) player.send('setSpeed', { speed });
    if (subtitlesOn) player.send('setSubtitle', { index: 0 });
  }, [custom, player.ready, loadKey]);

  const progressBucket = Math.floor(player.currentTime / 5);
  useEffect(() => {
    if (isFrameX && player.currentTime > 0) saveProgress(progressRef, player.currentTime, player.duration);
  }, [progressBucket]);

  // --- BACKUP SOURCES: their iframe must load within BACKUP_TIMEOUT_MS ---
  useEffect(() => {
    if (isFrameX || !autoSwitch || !backupLoading) return undefined;
    const t = setTimeout(() => moveToNextSource(sourceId), BACKUP_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [isFrameX, autoSwitch, backupLoading, loadKey]);

  // --- EPISODES ---
  const seasonCount = seasonsData.length;
  const hasNext = isTV && (episode < episodesList.length || season < seasonCount);

  // Stable callbacks so the memoized episode panel does not re-render on every playback update.
  const closePanel = useCallback(() => setPanel(null), []);

  const goToEpisode = useCallback((s, e) => {
    setSeason(s);
    setEpisode(e);
    setStartAt(loadProgress({ id: movie.id, isTV, season: s, episode: e })?.t || 0);
    setNextUp(null);
    setBackupLoading(true);
    setShieldActive(true);
    setTriedProviders([]);
    setPanel(null);
  }, [movie.id, isTV]);

  const handleNextEpisode = useCallback(() => {
    if (episode < episodesList.length) goToEpisode(season, episode + 1);
    else if (season < seasonCount) goToEpisode(season + 1, 1);
  }, [episode, episodesList.length, season, seasonCount, goToEpisode]);

  // Ended (frameXTV:ended): next episode after a short countdown, like Netflix.
  const ended = custom && player.ended;
  const [endedFor, setEndedFor] = useState(null);
  if (ended && endedFor !== loadKey) {
    setEndedFor(loadKey);
    if (hasNext) setNextUp(NEXT_UP_SECONDS);
  }
  // frameXTV starts the next episode inside its frame on its own; hold it so our countdown (and our
  // episode, history and tracker state) stays in charge.
  useEffect(() => {
    if (ended) player.send('pause');
  }, [ended]);
  useEffect(() => {
    if (nextUp === null) return undefined;
    if (nextUp <= 0) { handleNextEpisode(); return undefined; }
    const t = setTimeout(() => setNextUp((n) => (n === null ? null : n - 1)), 1000);
    return () => clearTimeout(t);
  }, [nextUp]);

  // --- SOURCE / SERVER CHANGES (resume from where you are) ---
  const resumeHere = () => setStartAt(isFrameX && player.currentTime > 5 ? player.currentTime : startAt);

  const chooseSource = (id) => {
    resumeHere();
    setFailedSources((prev) => prev.filter((f) => f !== id));
    setSourceId(id);
    setNativeControls(false);
    setBackupLoading(true);
    setShieldActive(true);
    setPanel(null);
  };
  const chooseProvider = (id) => {
    resumeHere();
    setProviderId(id);
    setTriedProviders([]);
    setPanel(null);
  };
  const reload = () => {
    resumeHere();
    setReloadKey((k) => k + 1);
    setBackupLoading(true);
    setShieldActive(true);
  };
  const toggleSubtitles = (on) => {
    setPanel(null);
    if (on) {
      setSubtitlesOn(true);
      player.send('setSubtitle', { index: 0 });
    } else if (subtitlesOn) {
      // frameXTV has no working "off" command (tested): reload at the current second instead.
      setSubtitlesOn(false);
      reload();
    }
  };
  const openNativeControls = () => {
    resumeHere();
    setNativeControls(true);
    setPanel(null);
  };

  // --- VOLUME / SPEED ---
  const applyVolume = (v) => {
    const next = Math.min(1, Math.max(0, v));
    setVolume(next || volume);
    try { if (next) localStorage.setItem('mh:volume', String(next)); } catch { /* ignore */ }
    if (next === 0) { setMuted(true); player.send('mute'); return; }
    player.send('setVolume', { volume: next });
    if (muted) { setMuted(false); player.send('unmute'); }
  };
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    player.send(next ? 'mute' : 'unmute');
  };
  const applySpeed = (s) => {
    setSpeed(s);
    player.send('setSpeed', { speed: s });
    setPanel(null);
  };

  // --- FULLSCREEN ---
  const canFullscreen = typeof document !== 'undefined' && !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  const toggleFullscreen = async () => {
    try {
      if (fullscreenElement()) await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else {
        const el = stageRef.current;
        await (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
        await window.screen?.orientation?.lock?.('landscape').catch(() => {});
      }
    } catch { /* fullscreen refused (iframe policy or user gesture) */ }
  };
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!fullscreenElement());
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  // --- CHROME AUTO HIDE ---
  const pinned = !!panel || !player.playing || nextUp !== null || !custom;
  const wake = useCallback(() => {
    setShowUI(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowUI(false), HIDE_UI_MS);
  }, []);
  useEffect(() => () => clearTimeout(hideTimer.current), []);
  const uiVisible = showUI || pinned;

  const flashIcon = (name) => { setFlash({ name, id: Date.now() }); };
  const togglePlay = () => { flashIcon(player.paused ? 'play' : 'pause'); player.toggle(); };

  // --- KEYBOARD (Netflix style) ---
  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      if (k === 'escape') {
        if (panel) return; // panels close themselves
        if (!fullscreenElement()) onClose?.();
        return;
      }
      if (!custom) return;
      if (k === ' ' || k === 'k') { if (k === ' ' && e.target?.closest?.('button, [role="slider"]')) return; e.preventDefault(); togglePlay(); }
      else if (k === 'arrowright' || k === 'l') { e.preventDefault(); flashIcon('fwd'); player.seekBy(10); }
      else if (k === 'arrowleft' || k === 'j') { e.preventDefault(); flashIcon('back'); player.seekBy(-10); }
      else if (k === 'arrowup') { e.preventDefault(); applyVolume(volume + 0.1); }
      else if (k === 'arrowdown') { e.preventDefault(); applyVolume(volume - 0.1); }
      else if (k === 'm') toggleMute();
      else if (k === 'f') toggleFullscreen();
      else if (k === 'c') toggleSubtitles(!subtitlesOn);
      else if (k === 'n' && hasNext) handleNextEpisode();
      else return;
      wake();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Lock page scroll behind the player.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const iframeSrc = useMemo(
    () => source.url({ id: movie.id, isTV, season, episode, start: startAt, provider: providerId, title, poster, nativeControls }),
    [loadKey]
  );

  const currentEp = episodesList.find((e) => e.episode_number === episode);
  const subtitle = isTV ? `S${season}:E${episode}${currentEp?.name ? ` · ${currentEp.name}` : ''}` : (movie.year || String(movie.release_date || '').slice(0, 4) || 'Movie');
  const serverName = isFrameX ? (providers.find((p) => p.id === providerId)?.name || 'Auto server') : source.name;
  const loading = isFrameX ? !player.duration && !player.failed : backupLoading;
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const remaining = player.duration ? player.duration - player.currentTime : 0;

  const settingsProps = {
    onClose: closePanel,
    sources: STREAM_SOURCES,
    sourceId,
    onSource: chooseSource,
    failedSources,
    autoSwitch,
    onAutoSwitch: setAutoSwitch,
    custom,
    providers,
    providerId,
    onProvider: chooseProvider,
    subtitlesOn,
    onSubtitles: toggleSubtitles,
    onNativeControls: openNativeControls,
    speed,
    onSpeed: applySpeed,
  };

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role="dialog"
      aria-modal="true"
      aria-label={`Watching ${title}`}
      className="fixed inset-0 z-[500] bg-black font-body text-white"
    >
      <Helmet><title>{`Watching ${title}`}</title></Helmet>

      <div
        ref={stageRef}
        onPointerMove={wake}
        onPointerDown={wake}
        className={`relative h-full w-full overflow-hidden bg-black ${uiVisible || !custom ? '' : 'cursor-none'}`}
      >
        {/* Immersive backdrop while the stream connects */}
        <AnimatePresence>
          {loading && (
            <Motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.8 } }} className="pointer-events-none absolute inset-0 z-[1]">
              {poster && <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40 blur-sm scale-105 motion-safe:animate-kenburns" />}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#000_85%)]" />
            </Motion.div>
          )}
        </AnimatePresence>

        <iframe
          ref={frameRef}
          key={loadKey}
          title={`${title} video player`}
          src={iframeSrc}
          className={`absolute inset-0 h-full w-full border-0 motion-safe:transition-opacity duration-700 ${loading ? 'opacity-0' : 'opacity-100'}`}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="origin"
          onLoad={() => setBackupLoading(false)}
        />

        {/* Backup sources: first click is absorbed (blocks pop-up ads), then their own controls take over */}
        {!isFrameX && shieldActive && !backupLoading && (
          <button
            type="button"
            onClick={() => setShieldActive(false)}
            className="absolute inset-0 z-10 flex items-center justify-center"
            aria-label="Start the video"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/20 motion-safe:transition-transform hover:scale-110">
              <Play size={34} className="ml-1 fill-white" aria-hidden="true" />
            </span>
          </button>
        )}

        {/* Our click surface over frameXTV (its own controls are hidden with controls=0) */}
        {custom && !player.failed && (
          <div
            className="absolute inset-0 z-10"
            onClick={(e) => { if (e.target === e.currentTarget) togglePlay(); }}
            onDoubleClick={toggleFullscreen}
            aria-hidden="true"
          />
        )}

        {/* Loading */}
        {loading && !player.failed && (
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 text-center px-6">
            <Spinner size={52} />
            <p className="text-sm font-medium text-white/80">Connecting to {isFrameX ? `frameXTV · ${serverName}` : source.name}…</p>
            {autoSwitch && <p className="text-xs text-white/45">If this stalls, we try another server automatically.</p>}
          </div>
        )}

        {/* Buffering mid playback */}
        {custom && !loading && player.buffering && !player.failed && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"><Spinner size={52} /></div>
        )}

        {/* Play / pause / seek flash */}
        <AnimatePresence>
          {flash && custom && (
            <Motion.span
              key={flash.id}
              initial={{ opacity: 0.9, scale: 0.8 }}
              animate={{ opacity: 0, scale: 1.4 }}
              transition={{ duration: 0.6 }}
              onAnimationComplete={() => setFlash(null)}
              className="pointer-events-none absolute left-1/2 top-1/2 z-20 -ml-10 -mt-10 flex h-20 w-20 items-center justify-center rounded-full bg-black/50"
              aria-hidden="true"
            >
              {flash.name === 'play' && <Play size={34} className="ml-1 fill-white" />}
              {flash.name === 'pause' && <Pause size={34} className="fill-white" />}
              {flash.name === 'fwd' && <RotateCw size={30} />}
              {flash.name === 'back' && <RotateCcw size={30} />}
            </Motion.span>
          )}
        </AnimatePresence>

        {/* Paused: big center play */}
        {custom && !loading && player.paused && !player.ended && !player.failed && nextUp === null && (
          <button type="button" onClick={togglePlay} aria-label="Play" className="absolute left-1/2 top-1/2 z-20 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/25 motion-safe:transition-transform hover:scale-110">
            <Play size={34} className="ml-1 fill-white" aria-hidden="true" />
          </button>
        )}

        {/* Stream failure */}
        {isFrameX && player.failed && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 px-6">
            <div className="max-w-md text-center">
              <ServerCrash size={40} className="mx-auto text-accent-text" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-semibold">{player.failed === 'no-response' ? 'frameXTV did not respond' : 'No stream found on this server'}</h2>
              <p className="mt-2 text-sm text-white/60">
                {autoSwitch ? 'Trying another server…' : 'Try another frameXTV server or a backup source.'}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={reload} className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black hover:bg-white/90"><RefreshCcw size={16} aria-hidden="true" /> Try again</button>
                <button type="button" onClick={() => setPanel('settings')} data-settings-toggle className="inline-flex h-11 items-center gap-2 rounded-full border border-white/20 px-5 text-sm font-semibold hover:bg-white/10"><Settings size={16} aria-hidden="true" /> Choose server</button>
              </div>
            </div>
          </div>
        )}

        {/* Next episode countdown */}
        <AnimatePresence>
          {nextUp !== null && (
            <Motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
              className="absolute bottom-28 right-4 sm:right-8 z-30 w-[min(340px,calc(100vw-32px))] rounded-panel border border-white/10 bg-[#111116]/95 p-4 backdrop-blur-xl shadow-card"
              role="status"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/50">Next episode in {nextUp}s</p>
              <p className="mt-1 truncate text-sm font-semibold">
                {episode < episodesList.length ? `E${episode + 1} · ${episodesList.find((e) => e.episode_number === episode + 1)?.name || ''}` : `Season ${season + 1}, Episode 1`}
              </p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={handleNextEpisode} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-white text-sm font-semibold text-black hover:bg-white/90"><Play size={14} className="fill-black" aria-hidden="true" /> Play now</button>
                <button type="button" onClick={() => setNextUp(null)} className="h-9 rounded-full border border-white/20 px-4 text-sm hover:bg-white/10">Cancel</button>
              </div>
            </Motion.div>
          )}
        </AnimatePresence>

        {/* TOP BAR */}
        <div className={`pointer-events-none absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/85 via-black/40 to-transparent px-3 sm:px-6 pt-3 sm:pt-5 pb-12 motion-safe:transition-opacity duration-300 ${uiVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="pointer-events-auto flex min-w-0 items-center gap-2 sm:gap-4">
              <Ctl label="Back" onClick={onClose}><ArrowLeft size={24} aria-hidden="true" /></Ctl>
              <div className="min-w-0">
                <h1 className="truncate text-base sm:text-lg font-semibold">{title}</h1>
                <p className="truncate text-xs text-white/60">{subtitle}</p>
              </div>
            </div>
            <div className="pointer-events-auto flex shrink-0 items-center gap-1">
              {!custom && (
                <>
                  {isTV && <Ctl label="Episodes" onClick={() => setPanel(panel === 'episodes' ? null : 'episodes')} active={panel === 'episodes'}><ListVideo size={20} aria-hidden="true" /></Ctl>}
                  {isTV && hasNext && <Ctl label="Next episode" onClick={handleNextEpisode}><SkipForward size={20} aria-hidden="true" /></Ctl>}
                  <Ctl label="Reload video" onClick={reload}><RefreshCcw size={18} aria-hidden="true" /></Ctl>
                  <Ctl label="Servers and settings" onClick={() => setPanel(panel === 'settings' ? null : 'settings')} active={panel === 'settings'} data-settings-toggle><Settings size={20} aria-hidden="true" /></Ctl>
                </>
              )}
              {custom && (
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" /> {serverName}
                </span>
              )}
            </div>
          </div>
          {!custom && (
            <p className="pointer-events-none mt-2 ml-14 text-[11px] text-white/45">
              {nativeControls ? 'frameXTV’s own controls' : `${source.name} uses its own controls inside the video`} ·{' '}
              <button type="button" onClick={() => chooseSource('framex')} className="pointer-events-auto underline hover:text-white">back to our player</button>
            </p>
          )}
        </div>

        {/* BOTTOM CONTROLS (frameXTV only: these really drive it through postMessage) */}
        {custom && (
          <div className={`absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 sm:px-6 pt-16 pb-3 sm:pb-5 motion-safe:transition-opacity duration-300 ${uiVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
            <div className="flex items-center gap-3">
              <SeekBar current={player.currentTime} duration={player.duration} onSeek={(t) => { player.seek(t); wake(); }} />
              <span className="shrink-0 text-xs sm:text-sm font-medium tabular-nums text-white/80">{player.duration ? `-${fmt(remaining)}` : '--:--'}</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-1">
              <div className="flex items-center gap-0.5 sm:gap-1">
                <Ctl label={player.paused ? 'Play' : 'Pause'} onClick={togglePlay}>
                  {!player.paused ? <Pause size={26} className="fill-white" aria-hidden="true" /> : <Play size={26} className="ml-0.5 fill-white" aria-hidden="true" />}
                </Ctl>
                <Ctl label="Back 10 seconds" onClick={() => { flashIcon('back'); player.seekBy(-10); }}><RotateCcw size={22} aria-hidden="true" /><span className="absolute text-[8px] font-bold mt-0.5">10</span></Ctl>
                <Ctl label="Forward 10 seconds" onClick={() => { flashIcon('fwd'); player.seekBy(10); }}><RotateCw size={22} aria-hidden="true" /><span className="absolute text-[8px] font-bold mt-0.5">10</span></Ctl>
                <div className="group/vol flex items-center">
                  <Ctl label={muted ? 'Unmute' : 'Mute'} onClick={toggleMute}><VolumeIcon size={24} aria-hidden="true" /></Ctl>
                  <label className="sr-only" htmlFor="player-volume">Volume</label>
                  <input
                    id="player-volume"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={muted ? 0 : volume}
                    onChange={(e) => applyVolume(Number(e.target.value))}
                    className="hidden md:block w-0 opacity-0 group-hover/vol:w-24 group-hover/vol:opacity-100 focus:w-24 focus:opacity-100 motion-safe:transition-all duration-300 accent-accent cursor-pointer"
                  />
                </div>
                <span className="ml-2 hidden sm:block text-sm tabular-nums text-white/80">
                  {fmt(player.currentTime)} <span className="text-white/40">/ {fmt(player.duration)}</span>
                </span>
              </div>

              <p className="hidden lg:block min-w-0 truncate px-4 text-sm font-medium text-white/70">{isTV ? `${title} · ${subtitle}` : title}</p>

              <div className="flex items-center gap-0.5 sm:gap-1">
                {isTV && hasNext && <Ctl label="Next episode" onClick={handleNextEpisode}><SkipForward size={22} className="fill-white" aria-hidden="true" /></Ctl>}
                {isTV && <Ctl label="Episodes" onClick={() => setPanel(panel === 'episodes' ? null : 'episodes')} active={panel === 'episodes'}><ListVideo size={22} aria-hidden="true" /></Ctl>}
                <Ctl label={subtitlesOn ? 'Turn subtitles off' : 'Turn subtitles on'} onClick={() => toggleSubtitles(!subtitlesOn)} active={subtitlesOn} aria-pressed={subtitlesOn}>
                  <Captions size={22} aria-hidden="true" />
                  {subtitlesOn && <span className="absolute bottom-1.5 h-0.5 w-4 rounded-full bg-accent" aria-hidden="true" />}
                </Ctl>
                <Ctl label="Servers and settings" onClick={() => setPanel(panel === 'settings' ? null : 'settings')} active={panel === 'settings'} data-settings-toggle><Settings size={22} aria-hidden="true" /></Ctl>
                {canFullscreen && (
                  <Ctl label={isFullscreen ? 'Exit full screen' : 'Full screen'} onClick={toggleFullscreen}>
                    {isFullscreen ? <Minimize size={22} aria-hidden="true" /> : <Maximize size={22} aria-hidden="true" />}
                  </Ctl>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Fullscreen for backup sources (their own fullscreen button also works) */}
        {!custom && canFullscreen && (
          <div className={`pointer-events-none absolute bottom-3 right-3 z-30 motion-safe:transition-opacity ${uiVisible ? 'opacity-100' : 'opacity-0'}`}>
            <span className="pointer-events-auto inline-flex rounded-full bg-black/50 backdrop-blur-md">
              <Ctl label={isFullscreen ? 'Exit full screen' : 'Full screen'} onClick={toggleFullscreen}>
                {isFullscreen ? <Minimize size={20} aria-hidden="true" /> : <Maximize size={20} aria-hidden="true" />}
              </Ctl>
            </span>
          </div>
        )}

        {/* PANELS */}
        <AnimatePresence>
          {panel === 'settings' && (
            <SettingsMenu key="settings" {...settingsProps} position={custom ? 'bottom-24 right-3 sm:right-6' : 'top-20 right-3 sm:right-6'} />
          )}
          {panel === 'episodes' && isTV && (
            <EpisodesPanel
              key="episodes"
              title={title}
              tvId={movie.id}
              seasons={seasonsData}
              playingSeason={season}
              playingEpisode={episode}
              onPick={goToEpisode}
              onClose={closePanel}
            />
          )}
        </AnimatePresence>

        {/* Movie finished */}
        {custom && player.ended && !isTV && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70">
            <div className="text-center">
              <p className="text-sm text-white/60">You finished</p>
              <h2 className="mt-1 font-display text-5xl uppercase">{title}</h2>
              <div className="mt-6 flex justify-center gap-3">
                <button type="button" onClick={() => { player.seek(0); player.play(); }} className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black hover:bg-white/90"><RotateCcw size={16} aria-hidden="true" /> Watch again</button>
                <button type="button" onClick={onClose} className="h-11 rounded-full border border-white/20 px-5 text-sm font-semibold hover:bg-white/10">Back to browsing</button>
              </div>
            </div>
          </div>
        )}

        {!isFrameX && failedSources.length >= STREAM_SOURCES.length - 1 && !backupLoading && (
          <p className="pointer-events-none absolute bottom-4 left-4 z-30 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white/70">
            <AlertTriangle size={14} className="text-rating" aria-hidden="true" /> Other sources failed for this title
          </p>
        )}
      </div>
    </Motion.div>
  );
};

export default WatchPage;
