/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Play, Pause, RotateCcw, RotateCw, Volume2, Volume1, VolumeX, Maximize, Minimize,
  SkipForward, ListVideo, Captions, Settings, ServerCrash, RefreshCcw, AlertTriangle, Users, Megaphone,
} from 'lucide-react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { db, auth } from '../components/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { writePresence, activityFor } from '../services/presence';
import { STREAM_SOURCES } from '../config/streamSources';
import { movieApi, tmdbAuthHeaders, withTmdbKey } from '../services/movieApi';
import { DUB_PROVIDER, FIRST_PROVIDER, fetchFrameXAudio, fetchFrameXProviders, findEmptyProviders, fetchFrameXSubtitles, loadProgress, saveProgress } from '../services/frameX';
import { loadSubPrefs, saveSubPrefs, loadSubtitleCues, pickTrack } from '../services/subtitles';
import { recordWatch, findHistoryItem, resumeFrom } from '../services/watchHistory';
import { createRoom, roomLink } from '../services/watchTogether';
import { ANI_LANGS, aniPm } from '../services/aniPm';
import { useFrameXPlayer } from '../components/player/useFrameXPlayer';
import { useAniPmPlayer } from '../components/player/useAniPmPlayer';
import { useAniPmOption } from '../components/player/useAniPmOption';
import FindOnAniPm from '../components/player/FindOnAniPm';
import { useWatchTogether } from '../components/player/useWatchTogether';
import TogetherPanel, { KnockToast } from '../components/player/TogetherPanel';
import SettingsMenu from '../components/player/SettingsMenu';
import EpisodesPanel from '../components/player/EpisodesPanel';
import MobileWatchDetails from '../components/player/MobileWatchDetails';
import SubtitleOverlay from '../components/player/SubtitleOverlay';
import { Spinner } from '../components/ui/feedback';

// A source this device can play: phones and tablets run only sandboxed ones (see settingsProps),
// plus ani.pm, which by its terms runs unsandboxed everywhere (spec 0009).
const usableSource = (id, touch) => {
  const src = STREAM_SOURCES.find((s) => s.id === id);
  return !!src && (!touch || !!src.sandbox || !!src.anime);
};

// ani.pm (spec 0009): Sub or Dub is remembered in this browser; the ad tab note shows once per browser.
const readAniLang = () => {
  try { return localStorage.getItem('mh:anime-lang') === 'dub' ? 'dub' : 'sub'; } catch { return 'sub'; }
};
const firstAniPmVisit = () => {
  try {
    if (localStorage.getItem('mh:anipm-note') === 'seen') return false;
    localStorage.setItem('mh:anipm-note', 'seen');
    return true;
  } catch { return false; }
};
const sameAni = (a, b) => (!a && !b) || (!!a && !!b && a.anilistId === b.anilistId && a.aniEpisode === b.aniEpisode && a.season === b.season && a.episode === b.episode);
// A history item (or resume point) on ani.pm, as the exact entry and episode it played.
const aniServerOf = (server) => (server?.sourceId === 'anipm' && server.anilistId && server.aniEpisode ? server : null);

const HIDE_UI_MS = 3000;
const BACKUP_TIMEOUT_MS = 12000;
const NEXT_UP_SECONDS = 8;
// Resume points go to Firestore history at most this often while the video plays (spec 0004).
const HISTORY_SAVE_SEC = 15;
// Without an answer from history by then, start anyway (S1 E1, or the local resume point).
const RESUME_LOOKUP_MS = 4000;
// Sandbox for the player frame: it may run scripts, keep its own storage, go full screen (allowFullScreen)
// and lock the screen to landscape, but NOT open pop ups or new tabs (no allow-popups) and NOT
// navigate this page anywhere (no allow-top-navigation). Ad redirects and pop unders are blocked by
// the browser itself, also for frames nested inside the player.
const FRAME_SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-presentation allow-orientation-lock';
// iPhone full screen: how long taps go straight to the video after the full screen button.
const FS_HINT_MS = 6000;
// After a tap or click on the video, how long playback gets to start before we try another server.
const TAP_START_MS = 6000;

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

// Phones: touch screen whose window's short side is at most 600 css px (tablets keep the normal
// layout). The window, not window.screen: some browsers report the host screen there.
const isPhone = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(pointer: coarse)').matches &&
  Math.min(window.innerWidth, window.innerHeight) <= 600;
// iPhone / iPad (iPadOS reports itself as a Mac with touch).
const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
const isCoarse = () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
const viewport = () => ({ w: window.innerWidth, h: window.innerHeight });

// 25 ms of silence. One unmuted play() of it tells whether this browser starts media with sound
// without a tap; frameXTV's iframe gets the same answer (it is allowed autoplay by the page).
const SILENT_WAV = 'data:audio/wav;base64,UklGRuwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YcgAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';
const probeAutoplay = () => {
  try {
    const a = new Audio(SILENT_WAV);
    const p = a.play();
    if (!p) return Promise.resolve(true);
    return p.then(() => { a.pause(); return true; }, (err) => err?.name !== 'NotAllowedError');
  } catch { return Promise.resolve(true); }
};

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
const SeekBar = ({ current, duration, onSeek, rotated = false }) => {
  const ref = useRef(null);
  const [hover, setHover] = useState(null);
  const [drag, setDrag] = useState(null);
  // In the rotated phone layout the bar runs top to bottom on the physical screen.
  const ratioAt = (e) => {
    const r = ref.current.getBoundingClientRect();
    const v = rotated ? (e.clientY - r.top) / r.height : (e.clientX - r.left) / r.width;
    return Math.min(1, Math.max(0, v));
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
      onPointerDown={(e) => { if (!duration) return; e.currentTarget.setPointerCapture(e.pointerId); setDrag(ratioAt(e)); }}
      onPointerMove={(e) => { const x = ratioAt(e); setHover(x); if (drag !== null) setDrag(x); }}
      onPointerUp={(e) => { if (drag !== null) { onSeek(ratioAt(e) * duration); setDrag(null); } }}
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
// controls, always: its own player UI is never shown (no controls handoff). Subtitles are ours too.
// Backup sources keep their own controls and are only used when picked by hand in Settings.
// `resume` ({ season, episode, t }) starts at a known point (details page, Continue Watching, a
// Watch Together link). Left out, the player looks the title up in the viewer's history first.
// `roomId` opens it inside a Watch Together room, on the room's `server` ({ sourceId, providerId }).
const WatchPage = ({ movie, user, onClose, resume, roomId: joinRoomId = null, server: joinServer = null }) => {
  const isTV = movie.type === 'tv' || movie.media_type === 'tv' || !!movie.first_air_date;
  const title = movie.title || movie.name;

  const [phone] = useState(isPhone);
  const [ios] = useState(isIOS);
  const [touch] = useState(isCoarse);
  // Resume on ani.pm (spec 0009, AC-10): the stored AniList entry and episode win over a fresh
  // match, once ani.pm confirms it still has that episode (aniPinStatus).
  const resumeAni = !joinRoomId ? aniServerOf(resume?.server) : null;
  const [aniPin, setAniPin] = useState(() => (resumeAni ? { anilistId: resumeAni.anilistId, aniEpisode: resumeAni.aniEpisode, season: isTV ? resume.season || 1 : null, episode: isTV ? resume.episode || 1 : null } : null));
  const [aniPinStatus, setAniPinStatus] = useState(resumeAni ? 'checking' : null);
  const [aniLang, setAniLang] = useState(() => (resumeAni?.lang === 'dub' || resumeAni?.lang === 'sub' ? resumeAni.lang : readAniLang()));
  // Where this browser stopped on each ani.pm entry and episode ("a|ep" → second): the start point
  // when ani.pm loads that same episode again (history item, then this session's own playback).
  const aniSpots = useRef(resumeAni ? { [`${resumeAni.anilistId}|${resumeAni.aniEpisode}`]: Number(resume.t) || 0 } : {});
  const [sourceId, setSourceId] = useState(() => (usableSource(joinServer?.sourceId, touch) ? joinServer.sourceId : resumeAni ? 'anipm' : STREAM_SOURCES[0].id));
  // A room link opens on the room's server; otherwise the first server of the set order (frameX.js).
  const [providerId, setProviderId] = useState(() => (usableSource(joinServer?.sourceId, touch) ? joinServer.providerId || null : FIRST_PROVIDER));
  const [providers, setProviders] = useState([]);
  // Audio dubs (spec 0007): only frameXTV's own player can switch audio, so desktop reloads in it.
  const [dubMode, setDubMode] = useState(false);
  const [audio, setAudio] = useState({ key: null, list: [], status: 'idle' });
  const [roomAudio, setRoomAudio] = useState(null); // a Watch Together room's dub language
  // Phones open inline (player on top, details below). Full screen ("immersive") is real fullscreen +
  // landscape lock where the browser allows it, and a CSS rotated landscape stage when it does not
  // (iPhone) or the phone is held upright.
  const [immersive, setImmersive] = useState(false);
  const [vp, setVp] = useState(viewport);
  const [reloadKey, setReloadKey] = useState(0);
  const [season, setSeason] = useState(() => (isTV && resume?.season) || 1);
  const [episode, setEpisode] = useState(() => (isTV && resume?.episode) || 1);
  // The frame waits until we know where to start, so it never loads S1 E1 first and then jumps.
  const [resolved, setResolved] = useState(() => resume !== undefined);
  const [seasonsData, setSeasonsData] = useState([]);
  const [episodesList, setEpisodesList] = useState([]);
  const [currentUser, setCurrentUser] = useState(user || null);
  const [autoSwitch, setAutoSwitch] = useState(true);
  const [failedSources, setFailedSources] = useState([]);
  const [startAt, setStartAt] = useState(() => {
    if (resume) return Math.max(0, Number(resume.t) || 0);
    return isTV ? 0 : loadProgress({ id: movie.id, isTV })?.t || 0;
  });
  const [volume, setVolume] = useState(readVolume);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  // Subtitles (ours): tracks for this episode, the chosen file, its cues, the viewer's style and offset.
  const [subTracks, setSubTracks] = useState({ key: null, list: [], status: 'idle' });
  const [subUrl, setSubUrl] = useState(null);
  const [subCues, setSubCues] = useState({ url: null, cues: [] });
  const [subPrefs, setSubPrefs] = useState(loadSubPrefs);
  const [subOffset, setSubOffset] = useState(0);
  const [roomStyle, setRoomStyle] = useState(null); // a Watch Together room's subtitle look (spec 0007)
  const [panel, setPanel] = useState(null); // 'episodes' | 'settings' | 'subtitles' | null
  const [showUI, setShowUI] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [backupLoading, setBackupLoading] = useState(true);
  const [shieldActive, setShieldActive] = useState(true);
  const [nextUp, setNextUp] = useState(null); // seconds left before auto next episode
  const [flash, setFlash] = useState(null);

  const stageRef = useRef(null);
  const rootRef = useRef(null);
  const frameRef = useRef(null);
  const hideTimer = useRef(null);

  const source = STREAM_SOURCES.find((s) => s.id === sourceId) || STREAM_SOURCES[0];
  const isFrameX = source.id === 'framex';
  // ani.pm (spec 0009): anime only, its own player, unsandboxed, nothing of ours over it.
  const isAniPm = source.id === 'anipm';
  // The AniList entry and episode the ani.pm frame plays, with the TMDB season and episode it is
  // for. Set from the room, a resume pin or the option (see "ANI.PM" below), never guessed here.
  const [aniLoaded, setAniLoaded] = useState(null);
  // Phones and tablets use frameXTV's OWN player (its controls, full screen and subtitle menu),
  // sandboxed (see FRAME_SANDBOX): no pop ups, no new tabs, no redirects of this page. Desktop is
  // unchanged: our player, no sandbox, backups offered.
  // Desktop also uses it while picking an audio dub (dubMode).
  const ownControls = touch || dubMode || isAniPm;
  const custom = isFrameX && !ownControls;
  // ani.pm reloads only when its entry or episode changes (Sub or Dub switches in place).
  const loadKey = isAniPm
    ? `anipm|${aniLoaded?.anilistId || ''}|${aniLoaded?.aniEpisode || ''}|${reloadKey}`
    : `${sourceId}|${providerId || 'auto'}|${season}|${episode}|${reloadKey}${dubMode ? '|own' : ''}`;
  const episodeKey = `${season}|${episode}|${reloadKey}`;
  const poster = movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : (movie.backdrop ? String(movie.backdrop).replace('/t/p/original', '/t/p/w1280') : null);
  const progressRef = { id: movie.id, isTV, season, episode };

  // --- SERVER ROTATION ---
  // A frameXTV server that never answers, or answers but sends nothing we can track (it then plays
  // inside its own backup player, which we never show), is skipped: we load the next MovieHub server
  // at the same point. Once every server was tried, an error screen offers Try again / Choose server.
  const [tried, setTried] = useState({ key: null, ids: [] });
  // Until the viewer picks a server by hand, each new episode starts again on the first server of
  // the set order (spec 0007, 2d). Never in a room: the room's server rules there.
  const [autoServer, setAutoServer] = useState(() => !joinRoomId);
  const autoServerRef = useRef(autoServer);
  autoServerRef.current = autoServer;
  const [exhaustedKey, setExhaustedKey] = useState(null);
  const [noStreamKey, setNoStreamKey] = useState(null);
  const exhausted = exhaustedKey === episodeKey;
  const rotateRef = useRef(() => {});
  rotateRef.current = () => {
    if (!isFrameX || ownControls) return; // frameXTV's own player switches its servers itself
    if (!autoSwitch || exhausted) { setNoStreamKey(loadKey); return; }
    const done = [...new Set([...(tried.key === episodeKey ? tried.ids : []), providerId])];
    // "Best available" (frameXTV's own auto) last: it is the slowest and often finds nothing.
    const next = [...providers.map((p) => p.id), null].find((id) => !done.includes(id));
    setTried({ key: episodeKey, ids: done });
    if (next === undefined) { setExhaustedKey(episodeKey); setNoStreamKey(loadKey); return; }
    setProviderId(next);
  };
  const handleFrameXFail = useCallback(() => rotateRef.current(), []);

  // Ready but silent: blocked autoplay gets a click to play (below); anything else, another server.
  const likelyBlockedRef = useRef(false);
  const handleFrameXSilent = useCallback(() => { if (!likelyBlockedRef.current) rotateRef.current(); }, []);
  const player = useFrameXPlayer({ frameRef, active: isFrameX, loadKey, onFail: handleFrameXFail, onSilent: handleFrameXSilent });
  // ani.pm's player: the viewer's own actions inside its controls go to the room (see onAniUser).
  const aniUserRef = useRef(() => {});
  const onAniUser = useCallback((action, data) => aniUserRef.current(action, data), []);
  const ani = useAniPmPlayer({ frameRef, active: isAniPm && !!aniLoaded, loadKey, lang: aniLang, onUserAction: onAniUser });
  // The player that reports time: history, the room and the next episode countdown read this one.
  const tp = isAniPm ? ani : player;
  // Is ani.pm an option for this episode, and which entry and episode (spec 0009, state machine).
  const aniOption = useAniPmOption({ movie, isTV, season: isTV ? season : null, episode: isTV ? episode : null, lang: aniLang });
  // Meanwhile, find the servers with nothing for this episode so the rotation skips them.
  useEffect(() => {
    if (!isFrameX || !resolved) return undefined;
    let cancelled = false;
    const key = episodeKey;
    findEmptyProviders({ id: movie.id, isTV, season, episode }).then((empty) => {
      if (cancelled || !empty.length) return;
      setTried((t) => ({ key, ids: [...new Set([...(t.key === key ? t.ids : []), ...empty])] }));
    });
    return () => { cancelled = true; };
  }, [isFrameX, resolved, episodeKey]);

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
  const getOptions = () => ({ method: 'GET', headers: tmdbAuthHeaders() });

  // Where to start when no `resume` was passed: this title's history item (episode and second),
  // else this browser's own resume point. History is only written once this is settled, so the
  // old S1 E1 default can never overwrite the episode you were really on.
  const uid = (currentUser || user || auth.currentUser)?.uid || null;
  useEffect(() => {
    if (resolved) return undefined;
    let cancelled = false;
    const finish = () => { if (!cancelled) setResolved(true); };
    const giveUp = setTimeout(finish, RESUME_LOOKUP_MS);
    (async () => {
      if (uid) {
        try {
          const snap = await getDoc(doc(db, 'history', uid));
          const from = resumeFrom(findHistoryItem(snap.exists() ? snap.data().items || [] : [], movie.id, isTV ? 'tv' : 'movie'));
          if (from && !cancelled) {
            const s = isTV ? from.season : null;
            const e = isTV ? from.episode : null;
            if (isTV) { setSeason(s); setEpisode(e); }
            const local = loadProgress({ id: movie.id, isTV, season: s, episode: e })?.t || 0;
            setStartAt(from.t || local);
            // Last watched on ani.pm: reopen that exact entry and episode there (spec 0009, AC-10).
            const aniFrom = aniServerOf(from.server);
            if (aniFrom) {
              aniSpots.current[`${aniFrom.anilistId}|${aniFrom.aniEpisode}`] = from.t || 0;
              setAniPin({ anilistId: aniFrom.anilistId, aniEpisode: aniFrom.aniEpisode, season: s, episode: e });
              setAniPinStatus('checking');
              setAniLang(aniFrom.lang === 'dub' ? 'dub' : 'sub');
              setAutoServer(false);
              setSourceId('anipm');
            }
          }
        } catch (err) { console.error('Resume lookup:', err); }
      } else if (isTV) {
        setStartAt(loadProgress({ id: movie.id, isTV, season: 1, episode: 1 })?.t || 0);
      }
      finish();
    })();
    return () => { cancelled = true; clearTimeout(giveUp); };
  }, [movie.id, uid, resolved]);

  useEffect(() => {
    if (!isTV) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(withTmdbKey(`https://api.themoviedb.org/3/tv/${movie.id}`), getOptions());
        const data = await res.json();
        if (!cancelled) setSeasonsData(data.seasons?.filter((s) => s.season_number > 0) || []);
      } catch (err) { console.error(err); }
    })();
    return () => { cancelled = true; };
  }, [movie.id]);

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

  // History: the title and episode as soon as it starts, then the resume point while it plays
  // (frameXTV and ani.pm; backups report no time) and once more on close. Each record says which
  // server it played on (spec 0009): on ani.pm the exact entry, episode and language.
  // On ani.pm the frame must already be on this TMDB episode, so a record never pairs a new
  // episode with the previous ani.pm episode.
  const aniInStep = !isAniPm || (!!aniLoaded && (!isTV || (aniLoaded.season === season && aniLoaded.episode === episode)));
  const historyServer = isAniPm
    ? (aniLoaded ? { sourceId: 'anipm', anilistId: aniLoaded.anilistId, aniEpisode: aniLoaded.aniEpisode, lang: aniLang } : undefined)
    : { sourceId: 'framex', providerId };
  const recordRef = useRef(null);
  recordRef.current = (t, duration, s = season, e = episode) => {
    if (!uid || !resolved || !aniInStep) return;
    recordWatch(uid, movie, { season: s, episode: e, t, duration, server: historyServer }).catch((err) => console.error('History update:', err));
  };
  useEffect(() => { if (resolved && uid && movie.id && aniInStep) recordRef.current(); }, [resolved, uid, movie.id, season, episode, aniInStep, isAniPm]);

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
  }, [custom, player.ready, loadKey]);
  // iPhone: hand the chosen subtitle to frameXTV (by its index in frameXTV's list), after every load.
  const nativeSubs = ios;
  const nativeSubIndex = nativeSubs ? subTracks.list.find((t) => t.url === subUrl)?.index : undefined;
  useEffect(() => {
    if (!custom || !player.ready || nativeSubIndex === undefined) return;
    player.send('setSubtitle', { index: nativeSubIndex });
  }, [custom, player.ready, loadKey, nativeSubIndex]);

  const progressBucket = Math.floor(player.currentTime / 5);
  useEffect(() => {
    if (isFrameX && player.currentTime > 0) saveProgress(progressRef, player.currentTime, player.duration);
  }, [progressBucket]);
  const tracked = (isFrameX || isAniPm) && aniInStep;
  const historyBucket = Math.floor(tp.currentTime / HISTORY_SAVE_SEC);
  const lastPlayback = useRef(null);
  useEffect(() => {
    if (!tracked || !(tp.duration > 0) || tp.ended) return;
    if (tp.currentTime > 5) recordRef.current(tp.currentTime, tp.duration);
  }, [historyBucket]);
  // Ended: the resume point clears (recordWatch treats the last 90 s as finished).
  useEffect(() => {
    if (!tracked || !tp.ended || !(tp.duration > 0)) return;
    lastPlayback.current = null;
    recordRef.current(tp.duration, tp.duration);
  }, [tp.ended]);
  // Closing the player: save exactly where it stopped, for the episode it was on.
  useEffect(() => {
    if (tracked && tp.duration > 0 && !tp.ended && tp.currentTime > 5) {
      lastPlayback.current = { t: tp.currentTime, duration: tp.duration, season, episode };
      if (isAniPm) aniSpots.current[`${aniLoaded.anilistId}|${aniLoaded.aniEpisode}`] = tp.currentTime;
    }
  }, [tp.currentTime]);
  useEffect(() => { lastPlayback.current = null; }, [season, episode, sourceId]);
  useEffect(() => () => {
    const last = lastPlayback.current;
    if (last) recordRef.current(last.t, last.duration, last.season, last.episode);
  }, []);

  // --- BACKUP SOURCES: their iframe must load within BACKUP_TIMEOUT_MS, else back to our player ---
  // (Not ani.pm: it is never left on its own; its own states say what is wrong.)
  useEffect(() => {
    if (isFrameX || isAniPm || !autoSwitch || !backupLoading) return undefined;
    const t = setTimeout(() => {
      setFailedSources((prev) => [...new Set([...prev, sourceId])]);
      setSourceId('framex');
    }, BACKUP_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [isFrameX, autoSwitch, backupLoading, loadKey]);

  // --- EPISODES ---
  const seasonCount = seasonsData.length;
  const hasNext = isTV && (episode < episodesList.length || season < seasonCount);

  // Stable callbacks so the memoized episode panel does not re-render on every playback update.
  const closePanel = useCallback(() => setPanel(null), []);

  // `t` given (Watch Together): start there instead of this browser's resume point.
  const roomIdRef = useRef(joinRoomId);
  const loadEpisode = useCallback((s, e, t) => {
    if (autoServerRef.current && !roomIdRef.current) setProviderId(FIRST_PROVIDER);
    setSeason(s);
    setEpisode(e);
    setStartAt(Number.isFinite(t) ? Math.max(0, t) : loadProgress({ id: movie.id, isTV, season: s, episode: e })?.t || 0);
    setNextUp(null);
    setBackupLoading(true);
    setShieldActive(true);
    setPanel(null);
  }, [movie.id, isTV]);

  // --- WATCH TOGETHER (spec 0005) ---
  const [roomId, setRoomId] = useState(joinRoomId);
  roomIdRef.current = roomId;
  const [showTogether, setShowTogether] = useState(!!joinRoomId);
  const [startingRoom, setStartingRoom] = useState(false);
  // On ani.pm the room's server names the exact AniList entry and ani.pm episode (spec 0009).
  const roomServer = useMemo(() => (isAniPm && aniLoaded
    ? { sourceId: 'anipm', providerId: null, anilistId: aniLoaded.anilistId, aniEpisode: aniLoaded.aniEpisode }
    : { sourceId, providerId }), [sourceId, providerId, isAniPm, aniLoaded]);
  // Someone switched the room's server: follow it from the room's second. Phones only run
  // sandboxed sources, so a server they can not play is skipped with a note.
  const followServer = useCallback((next, t) => {
    setAutoServer(false);
    if (!usableSource(next?.sourceId, touch)) {
      toast('The room switched to a server that does not play on this device. Staying on yours.', { id: 'room-server', icon: '👥' });
      return;
    }
    setStartAt(Math.max(0, t));
    setFailedSources((prev) => prev.filter((f) => f !== next.sourceId));
    // ani.pm: the room's entry and episode load from the room itself (see ANI.PM below).
    if (next.sourceId === 'anipm') setDubMode(false);
    setSourceId(next.sourceId);
    setProviderId(next.providerId || null);
    setBackupLoading(true);
    setShieldActive(true);
  }, [touch]);
  // The room's subtitles changed (spec 0007): applied by the subtitle section below.
  const applyRoomSubsRef = useRef(() => {});
  const followSubs = useCallback((subs) => applyRoomSubsRef.current(subs), []);
  // The room's audio language changed (spec 0007): applied by the audio section below.
  const applyRoomAudioRef = useRef(() => {});
  const followAudio = useCallback((audio, t) => applyRoomAudioRef.current(audio, t), []);
  const together = useWatchTogether({ roomId, user: currentUser, player: tp, season, episode, server: roomServer, onEpisode: loadEpisode, onServer: followServer, onSubs: followSubs, onAudio: followAudio });
  const inRoom = together.syncing;

  // --- ANI.PM (spec 0009) ---
  // What the ani.pm frame plays, in order: the room's entry and episode (every member loads the
  // room's, never their own match), a Resume pin from history, else this browser's match. While a
  // Sub or Dub check runs for the same episode, it keeps playing.
  const roomSrv = together.room?.server;
  const roomAni = inRoom && roomSrv?.sourceId === 'anipm' && roomSrv.anilistId && roomSrv.aniEpisode
    ? { anilistId: roomSrv.anilistId, aniEpisode: roomSrv.aniEpisode, season: isTV ? together.room.season ?? null : null, episode: isTV ? together.room.episode ?? null : null }
    : null;
  const onThisEpisode = (x) => !!x && (!isTV || (x.season === season && x.episode === episode));
  const pinValid = aniPinStatus === 'ok' && onThisEpisode(aniPin);
  let aniWanted = null;
  if (isAniPm) {
    if (roomAni) aniWanted = onThisEpisode(roomAni) ? roomAni : null;
    else if (pinValid) aniWanted = aniPin;
    else if (aniOption.state === 'ready') aniWanted = { ...aniOption.target, season: isTV ? season : null, episode: isTV ? episode : null };
    else if (aniOption.state === 'checking' && onThisEpisode(aniLoaded)) aniWanted = aniLoaded;
  }
  useEffect(() => {
    setAniLoaded((cur) => (sameAni(cur, aniWanted) ? cur : aniWanted));
  }, [aniWanted?.anilistId, aniWanted?.aniEpisode, aniWanted?.season, aniWanted?.episode]);

  // Resume on ani.pm: only once ani.pm confirms that episode; otherwise the MovieHub server at the
  // same second, and say so (AC-10).
  useEffect(() => {
    if (aniPinStatus !== 'checking' || !aniPin) return undefined;
    let cancelled = false;
    const fallBack = (msg) => {
      if (cancelled) return;
      setAniPin(null);
      setAniPinStatus(null);
      setSourceId('framex');
      toast(msg, { id: 'anipm-resume', icon: '📺', duration: 6000 });
    };
    aniPm.series(aniPin.anilistId).then((data) => {
      if (cancelled) return;
      const ep = (data?.episodeList || []).find((x) => Number(x.number) === aniPin.aniEpisode);
      if (!ep || !(ep.available?.sub || ep.available?.dub)) { fallBack('That episode is not on ani.pm right now, so it opens on the MovieHub server at the same spot.'); return; }
      if (!ep.available?.[aniLang]) setAniLang(ep.available.sub ? 'sub' : 'dub');
      setAniPinStatus('ok');
    }, () => fallBack('ani.pm could not be reached, so this opens on the MovieHub server at the same spot.'));
    return () => { cancelled = true; };
  }, [aniPinStatus, aniPin?.anilistId, aniPin?.aniEpisode]);

  // On ani.pm by this browser's own match, and the match went bad (a new episode that is not on
  // ani.pm, no dub, not sure which show, or ani.pm unreachable): back to the MovieHub server.
  const aniGone = isAniPm && !roomAni && !pinValid && aniPinStatus !== 'checking'
    && (aniOption.state === 'unavailable' || aniOption.state === 'unsure' || aniOption.state === 'error');
  useEffect(() => {
    if (!aniGone) return;
    const why = aniOption.state === 'unavailable' ? `${aniOption.reason}.` : aniOption.state === 'unsure' ? 'Pick the show for this season in Settings to use ani.pm.' : 'Could not check ani.pm.';
    toast(`${why} Back on the MovieHub server.`, { id: 'anipm-gone', icon: '📺', duration: 6000 });
    setSourceId('framex');
  }, [aniGone]);

  // A pick in Find on ani.pm (or Reset) plays as soon as its check is done.
  const [aniPending, setAniPending] = useState(false);
  useEffect(() => {
    if (!aniPending || aniOption.state === 'checking') return;
    setAniPending(false);
    if (aniOption.state === 'ready') latest.current.chooseSource('anipm');
    else if (aniOption.state === 'unavailable') toast(`${aniOption.reason}.`, { id: 'anipm-pick', icon: '📺' });
  }, [aniPending, aniOption.state]);
  const pickAniShow = (media) => { aniOption.pickMedia(media); setPanel(null); setAniPending(true); };
  const resetAniShow = () => { aniOption.resetPick(); setPanel(null); setAniPending(isAniPm); };

  // Sub or Dub (AC-8): remembered here, passed in the embed URL, switched in place (setLanguage).
  // In a room it rides on the room's audio field, following the control mode like subtitles.
  const chooseAniLang = (lang) => {
    try { localStorage.setItem('mh:anime-lang', lang); } catch { /* storage blocked: this visit only */ }
    if (isAniPm && inRoom) {
      const shared = together.act('audio', { audio: { lang, label: lang === 'dub' ? 'Dub' : 'Sub', at: Date.now() } });
      if (!shared) toast("Sub or Dub is just for you. The host sets the room's language.", { id: 'audio-local', icon: '👥' });
    }
    setAniLang(lang); // from our switch, ani.pm follows below; from ani.pm's own menu, it already has
  };
  useEffect(() => {
    if (isAniPm && ani.ready && ani.lang !== aniLang) ani.setLanguage(aniLang);
  }, [isAniPm, ani.ready, aniLang]);

  // The ad tab note: the first time ani.pm loads in this browser, chosen by the viewer or the room.
  const [aniNote, setAniNote] = useState(false);
  useEffect(() => { if (isAniPm && aniLoaded && firstAniPmVisit()) setAniNote(true); }, [isAniPm, !!aniLoaded]);

  // The viewer's own play, pause, seek or language change inside ani.pm's controls (echoes of our
  // commands never arrive here). In a room it is published like our own buttons; a member who may
  // not control is put back to the room's state after 0.5 s, once per action (AC-9).
  const aniRef = useRef(ani);
  aniRef.current = ani;
  const togetherRef = useRef(together);
  togetherRef.current = together;
  const putBack = useRef(null);
  useEffect(() => () => clearTimeout(putBack.current), []);
  aniUserRef.current = (action, data) => {
    if (!isAniPm) return;
    if (action === 'language') { chooseAniLang(data.lang); return; }
    if (!inRoom) return;
    const position = action === 'seek' ? data.position : ani.currentTime;
    const playing = action === 'play' ? true : action === 'pause' ? false : !ani.paused;
    if (together.act(action, { playing, position })) return;
    clearTimeout(putBack.current);
    putBack.current = setTimeout(() => {
      const room = togetherRef.current;
      const p = aniRef.current;
      if (!room.room) return;
      p.seek(room.expectedTime());
      if (room.room.playing) p.play(); else p.pause();
    }, 500);
    toast('The host controls playback in this room', { id: 'host-only', icon: '👥' });
  };
  // A person's own play, pause, seek or episode change goes to the room first. Members who may not
  // control right now (host only mode) are held with a note; everyone else acts as usual.
  const share = (action, state) => {
    if (together.act(action, state)) return true;
    toast('The host controls playback in this room. They can let everyone control in the room sheet.', { id: 'host-only', icon: '👥' });
    return false;
  };
  const startTogether = async () => {
    if (roomId) { setShowTogether(true); return; }
    if (!currentUser) { toast.error('Sign in to watch together'); return; }
    setStartingRoom(true);
    try {
      const id = await createRoom(currentUser, movie, {
        season: isTV ? season : null,
        episode: isTV ? episode : null,
        position: tp.duration > 0 ? tp.currentTime : startAt,
        playing: !tp.paused,
        server: roomServer,
        // On ani.pm the room starts with this viewer's Sub or Dub (spec 0009, AC-8).
        audio: isAniPm ? { lang: aniLang, label: aniLang === 'dub' ? 'Dub' : 'Sub', at: Date.now() } : null,
      });
      setRoomId(id);
      setShowTogether(true);
      navigator.clipboard?.writeText(roomLink(id)).then(() => toast.success('Room ready. Invite link copied'), () => toast.success('Room ready. Share the invite link'));
    } catch (err) {
      console.error('Create room:', err);
      toast.error('Could not start a room. Check your connection and try again.');
    } finally {
      setStartingRoom(false);
    }
  };
  const leaveTogether = () => { setRoomId(null); setShowTogether(false); };
  // Jump to the host: a seek when our controls drive the video, else a reload at that second.
  const syncNow = () => {
    const t = together.expectedTime();
    if (together.room?.season && (together.room.season !== season || together.room.episode !== episode)) { loadEpisode(together.room.season, together.room.episode, t); return; }
    if ((custom || isAniPm) && tp.duration > 0) {
      tp.seek(t);
      if (together.room?.playing) tp.play(); else if (isAniPm) tp.pause();
    } else {
      setStartAt(t);
      setReloadKey((k) => k + 1);
    }
  };
  useEffect(() => { if (together.missing && roomId) { toast.error('That Watch Together room is gone'); leaveTogether(); } }, [together.missing]);

  // Host: a toast with Let in and Deny for each knock, open until it is handled (here, in the room
  // sheet, or on another of the host's devices).
  const knockIds = together.pending.map((p) => p.uid).join(',');
  const shownKnocks = useRef(new Set());
  useEffect(() => {
    const current = new Set(together.pending.map((p) => p.uid));
    together.pending.forEach((p) => {
      if (shownKnocks.current.has(p.uid)) return;
      shownKnocks.current.add(p.uid);
      toast((t) => (
        <KnockToast
          guest={p}
          onLetIn={() => { toast.dismiss(t.id); together.letIn(p.uid, p).catch(() => toast.error('Could not let them in. The room may be full.')); }}
          onDeny={() => { toast.dismiss(t.id); together.turnAway(p.uid, p).catch(() => toast.error('Could not turn them away. Try again.')); }}
        />
      ), { id: `knock-${p.uid}`, duration: Infinity });
    });
    shownKnocks.current.forEach((guestUid) => {
      if (current.has(guestUid)) return;
      shownKnocks.current.delete(guestUid);
      toast.dismiss(`knock-${guestUid}`);
    });
  }, [knockIds]);
  useEffect(() => () => shownKnocks.current.forEach((guestUid) => toast.dismiss(`knock-${guestUid}`)), []);

  // In a room everyone starts the new episode from the top together. On ani.pm the room's new
  // AniList entry and episode go in the same write (spec 0009); an episode ani.pm does not have
  // moves the room back to the MovieHub server.
  const goToEpisode = useCallback(async (s, e) => {
    if (isAniPm && inRoom && together.allowed) {
      const next = await aniOption.resolveFor(s, e);
      const server = next.state === 'ready'
        ? { sourceId: 'anipm', providerId: null, ...next.target }
        : { sourceId: 'framex', providerId: null };
      if (!share('episode', { season: s, episode: e, position: 0, playing: true, server })) return;
      if (next.state !== 'ready') {
        toast(`${next.reason || 'Not on ani.pm'}. The room is back on the MovieHub server.`, { id: 'anipm-gone', icon: '📺' });
        setSourceId('framex');
      }
      loadEpisode(s, e, 0);
      return;
    }
    if (!share('episode', { season: s, episode: e, position: 0, playing: true })) return;
    loadEpisode(s, e, inRoom ? 0 : undefined);
  }, [loadEpisode, together.act, together.allowed, inRoom, isAniPm, aniOption.resolveFor]);

  const handleNextEpisode = useCallback(() => {
    if (episode < episodesList.length) goToEpisode(season, episode + 1);
    else if (season < seasonCount) goToEpisode(season + 1, 1);
  }, [episode, episodesList.length, season, seasonCount, goToEpisode]);

  // Ended (frameXTV:ended, or ani.pm's own `ended`; its auto next is off): next episode after a
  // short countdown, like Netflix.
  const ended = (isFrameX || isAniPm) && tp.ended;
  const [endedFor, setEndedFor] = useState(null);
  if (ended && endedFor !== loadKey) {
    setEndedFor(loadKey);
    // In a room only the host counts down; the others move on when the room does.
    if (hasNext && (!inRoom || together.isHost)) setNextUp(NEXT_UP_SECONDS);
  }
  // frameXTV starts the next episode inside its frame on its own; hold it so our countdown (and our
  // episode, history and tracker state) stays in charge.
  useEffect(() => {
    if (ended && isFrameX) player.send('pause');
  }, [ended]);
  useEffect(() => {
    if (nextUp === null) return undefined;
    if (nextUp <= 0) { handleNextEpisode(); return undefined; }
    const t = setTimeout(() => setNextUp((n) => (n === null ? null : n - 1)), 1000);
    return () => clearTimeout(t);
  }, [nextUp]);

  // --- CLICK / TAP TO PLAY ---
  // Browsers can block video with sound until a click or tap INSIDE the frame that plays it (iPhone
  // always, Brave on Android by default). frameXTV's own autoplay then just waits, and our messages
  // cannot unlock it. So while this load has never played, our layer steps aside: the frame shows and
  // the click lands on frameXTV's video (its click handler starts playback with sound). From then on
  // our controls drive it as usual. Nothing of frameXTV's own player UI is visible (controls=0).
  const [autoplayBlocked, setAutoplayBlocked] = useState(null);
  useEffect(() => {
    let cancelled = false;
    probeAutoplay().then((ok) => { if (!cancelled) setAutoplayBlocked(!ok); });
    return () => { cancelled = true; };
  }, []);
  likelyBlockedRef.current = ios || autoplayBlocked === true;
  const [playedKey, setPlayedKey] = useState(null);
  if (player.playing && playedKey !== loadKey) setPlayedKey(loadKey);
  const [tapKey, setTapKey] = useState(null); // a click reached the frame for this load
  const noStream = noStreamKey === loadKey;
  const blocked = (player.ready && !player.playing && likelyBlockedRef.current)
    || (player.duration > 0 && player.paused);
  const frameTaps = custom && playedKey !== loadKey && !player.failed && !noStream && !player.ended && nextUp === null && blocked;
  const tapStarting = frameTaps && tapKey === loadKey;
  // A click inside a cross origin frame moves focus into it: the page gets "blur" and the iframe
  // becomes the active element. That is how we know it happened (to show a spinner while it starts).
  useEffect(() => {
    if (!frameTaps || tapKey === loadKey) return undefined;
    const onBlur = () => setTimeout(() => { if (document.activeElement === frameRef.current) setTapKey(loadKey); }, 0);
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, [frameTaps, tapKey, loadKey]);
  // Still nothing after the click: this server plays something we cannot track. Next server.
  useEffect(() => {
    if (tapKey !== loadKey || playedKey === loadKey) return undefined;
    const t = setTimeout(() => rotateRef.current(), TAP_START_MS);
    return () => clearTimeout(t);
  }, [tapKey, playedKey, loadKey]);
  // Keyboard users: focus returns to the page after a click in the frame.
  useEffect(() => { if (playedKey === loadKey && document.activeElement === frameRef.current) frameRef.current.blur(); }, [playedKey, loadKey]);

  // --- SUBTITLES (ours) ---
  useEffect(() => {
    if (!isFrameX) return undefined;
    const key = `${movie.id}|${season}|${episode}`;
    let cancelled = false;
    setSubTracks((t) => (t.key === key ? t : { key, list: [], status: 'loading' }));
    fetchFrameXSubtitles({ id: movie.id, isTV, season, episode })
      .then((list) => { if (!cancelled) setSubTracks({ key, list, status: 'ready' }); })
      .catch(() => { if (!cancelled) setSubTracks({ key, list: [], status: 'error' }); });
    return () => { cancelled = true; };
  }, [isFrameX, movie.id, isTV, season, episode]);
  // New episode with subtitles on: keep the same language (the room's, when it set one).
  const subsWanted = useRef(false);
  const wantedLang = useRef(null);
  useEffect(() => {
    if (!subsWanted.current || subTracks.status !== 'ready') return;
    if (!subTracks.list.some((t) => t.url === subUrl)) setSubUrl(pickTrack(subTracks.list, wantedLang.current || subPrefs.lang)?.url || null);
  }, [subTracks]);
  useEffect(() => {
    if (!subUrl) return undefined;
    let cancelled = false;
    loadSubtitleCues(subUrl)
      .then((cues) => { if (!cancelled) setSubCues({ url: subUrl, cues }); })
      .catch(() => { if (!cancelled) setSubCues({ url: subUrl, cues: [] }); });
    return () => { cancelled = true; };
  }, [subUrl]);
  const chooseSubTrack = (url) => {
    // iPhone: the subtitles are frameXTV's own text track (sent below), because Apple's full screen
    // player only shows tracks of the video itself. It has no working "off", so off reloads here.
    if (nativeSubs && !url && subUrl) latest.current.reload();
    subsWanted.current = !!url;
    setSubUrl(url);
    setSubOffset(0);
    const track = subTracks.list.find((t) => t.url === url);
    if (track) { wantedLang.current = track.lang; updateSubPrefs({ lang: track.lang }); }
    shareSubs({ on: !!url, url, lang: track?.lang || null, offset: 0 });
  };
  const updateSubPrefs = (patch) => setSubPrefs((p) => { const next = { ...p, ...patch }; saveSubPrefs(next); return next; });
  // In a room the look follows the room's (roomStyle) until this viewer changes it.
  const shownSubPrefs = inRoom && roomStyle ? { ...subPrefs, ...roomStyle } : subPrefs;
  const changeSubStyle = (patch) => {
    updateSubPrefs(patch);
    setRoomStyle((rs) => (rs ? { ...rs, ...patch } : rs));
    shareSubs({ style: patch });
  };
  const changeSubOffset = (v) => {
    const next = Math.round(Math.max(-60, Math.min(60, v)) * 10) / 10;
    setSubOffset(next);
    shareSubs({ offset: next });
  };

  // --- WATCH TOGETHER SUBTITLES (spec 0007) ---
  // A change goes to the room when this member may control it; otherwise it stays theirs alone.
  const subsNow = useRef({});
  subsNow.current = { on: !!subUrl, url: subUrl, lang: subTracks.list.find((t) => t.url === subUrl)?.lang || wantedLang.current, offset: subOffset, style: shownSubPrefs };
  const shareSubs = (patch) => {
    const result = together.shareSubs({ ...subsNow.current, ...patch, style: { ...subsNow.current.style, ...patch.style } });
    if (result === 'held') toast("Subtitle changes are just for you. The host sets the room's subtitles.", { id: 'subs-local', icon: '👥' });
  };
  // Someone set the room's subtitles: the same track (by url, then language), timing and look.
  applyRoomSubsRef.current = (subs) => {
    setSubOffset(Number(subs.offset) || 0);
    setRoomStyle(subs.style || null);
    if (!subs.on || !subs.url) { subsWanted.current = false; setSubUrl(null); return; }
    subsWanted.current = true;
    if (subs.lang) wantedLang.current = subs.lang;
    const list = subTracks.list;
    setSubUrl((list.find((t) => t.url === subs.url) || (list.length ? pickTrack(list, subs.lang) : null))?.url || subs.url);
  };
  // Phones (and desktop picking a dub) run frameXTV's own player: hand it the room's language by
  // its index in frameXTV's list, after every load. Timing and look are out of reach there.
  const ownSubIndex = isFrameX && !custom && inRoom ? subTracks.list.find((t) => t.url === subUrl)?.index : undefined;
  useEffect(() => {
    if (!player.ready || ownSubIndex === undefined) return;
    player.send('setSubtitle', { index: ownSubIndex });
  }, [player.ready, loadKey, ownSubIndex]);
  const toggleSubtitles = () => {
    if (subUrl) { chooseSubTrack(null); return; }
    const track = pickTrack(subTracks.list, subPrefs.lang);
    if (track) chooseSubTrack(track.url);
    else setPanel('subtitles'); // nothing found (or still loading): show why
  };
  // The subtitle clock: the last reported time, when it came, and whether it is moving.
  const clockRef = useRef({ t: 0, at: 0, playing: false, speed: 1 });
  useEffect(() => {
    clockRef.current = { t: player.currentTime, at: performance.now(), playing: player.playing, speed };
  }, [player.currentTime, player.playing, speed]);

  // --- SOURCE / SERVER CHANGES (resume from where you are) ---
  const resumeHere = () => setStartAt((isFrameX || isAniPm) && tp.currentTime > 5 ? tp.currentTime : startAt);

  // ani.pm, chosen by the viewer (spec 0009): plays only from `ready`; `unsure` opens Find on
  // ani.pm. In a room the entry, episode and Sub or Dub go to everyone in one write.
  const chooseAniPm = () => {
    if (aniOption.state === 'unsure') { setPanel('find'); return; }
    if (aniOption.state !== 'ready') return;
    const server = { sourceId: 'anipm', providerId: null, ...aniOption.target };
    const audio = { lang: aniLang, label: aniLang === 'dub' ? 'Dub' : 'Sub', at: Date.now() };
    if (!share('server', { server, audio })) return;
    setAutoServer(false);
    setDubMode(false);
    setAniPin(null);
    setAniPinStatus(null);
    if (inRoom) setStartAt(together.expectedTime());
    setSourceId('anipm');
    setPanel(null);
  };

  // In a room the server is a playback action like any other: it goes to the room first (held for
  // members who may not control), and everyone else follows it.
  const chooseSource = (id) => {
    if (id === 'anipm') { chooseAniPm(); return; }
    if (!share('server', { server: { sourceId: id, providerId: null } })) return;
    setAutoServer(false);
    resumeHere();
    setFailedSources((prev) => prev.filter((f) => f !== id));
    setSourceId(id);
    setBackupLoading(true);
    setShieldActive(true);
    setPanel(null);
  };
  const chooseProvider = (id) => {
    if (!share('server', { server: { sourceId, providerId: id } })) return;
    setAutoServer(false);
    resumeHere();
    setProviderId(id);
    setPanel(null);
  };
  const reload = () => {
    resumeHere();
    setReloadKey((k) => k + 1);
    setBackupLoading(true);
    setShieldActive(true);
  };

  // --- AUDIO DUBS (spec 0007): looked up when Settings opens, once per episode ---
  const audioKey = `${movie.id}|${season}|${episode}`;
  const settingsOpen = panel === 'settings' || panel === 'subtitles';
  useEffect(() => {
    if (!settingsOpen || !isFrameX || audio.key === audioKey) return;
    setAudio({ key: audioKey, list: [], status: 'loading' });
    fetchFrameXAudio({ id: movie.id, isTV, season, episode })
      .then((list) => setAudio((a) => (a.key === audioKey ? { key: audioKey, list, status: 'ready' } : a)))
      .catch(() => setAudio((a) => (a.key === audioKey ? { key: null, list: [], status: 'error' } : a)));
  }, [settingsOpen, isFrameX, audioKey]);
  // Reload at the same second on the dub server, in frameXTV's own player (its audio button picks
  // the language; frameXTV can not be told which). In a room the language and the server go to
  // everyone in one write, following the control mode like subtitles: a member who may not control
  // switches only for themselves.
  const enterDub = (t) => {
    setAutoServer(false);
    setStartAt(Number.isFinite(t) ? Math.max(0, t) : (isFrameX && player.currentTime > 5 ? player.currentTime : startAt));
    setSourceId('framex');
    setProviderId(DUB_PROVIDER);
    setDubMode(true);
    setBackupLoading(true);
    setShieldActive(true);
    setPanel(null);
  };
  const chooseDub = (track) => {
    const pick = { lang: track.lang, label: track.label || track.lang, at: Date.now() };
    const shared = together.act('audio', { server: { sourceId: 'framex', providerId: DUB_PROVIDER }, audio: pick });
    if (inRoom && shared) setRoomAudio(pick);
    enterDub();
    toast(`Pick ${pick.label} from the audio button inside the player.`, { id: 'dub', icon: '🎧', duration: 6000 });
    if (!shared) toast("Audio change is just for you. The host sets the room's audio.", { id: 'audio-local', icon: '👥' });
  };
  // Someone set the room's audio: open the dub player at the room's second (the server follows on
  // its own, see followServer) and say which language to pick.
  applyRoomAudioRef.current = (audio, t) => {
    setRoomAudio(audio);
    if (!audio) return;
    // ani.pm's Sub or Dub (spec 0009): switched in place at the same second, not the dub player.
    if (audio.lang === 'sub' || audio.lang === 'dub') { setAniLang(audio.lang); return; }
    enterDub(t);
    toast(`Room audio: ${audio.label}. Pick it from the audio button inside the video.`, { id: 'dub', icon: '🎧', duration: 8000 });
  };
  const leaveDub = () => {
    resumeHere();
    setDubMode(false);
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
  const enterRealFullscreen = async () => {
    if (!canFullscreen || fullscreenElement()) return;
    try {
      const el = rootRef.current;
      await (el.requestFullscreen || el.webkitRequestFullscreen).call(el, { navigationUI: 'hide' });
      await window.screen?.orientation?.lock?.('landscape').catch(() => {});
    } catch { /* refused: no user gesture, or not allowed. The CSS landscape covers phones. */ }
  };
  const exitRealFullscreen = async () => {
    try { window.screen?.orientation?.unlock?.(); } catch { /* not supported */ }
    if (fullscreenElement()) await (document.exitFullscreen || document.webkitExitFullscreen).call(document).catch(() => {});
  };
  const toggleFullscreen = () => {
    if (nativeFullscreen) { showFsHint(); return; }
    if (phone) {
      if (immersive) { setImmersive(false); exitRealFullscreen(); }
      else { setImmersive(true); enterRealFullscreen(); }
      return;
    }
    if (fullscreenElement()) exitRealFullscreen();
    else enterRealFullscreen();
  };
  // --- iPHONE FULL SCREEN ---
  // iPhone browsers have no full screen for page elements, only Apple's own video player, and only a
  // gesture inside frameXTV's frame can open it (its double tap handler calls webkitEnterFullscreen).
  // So the button lets the next taps through to the video and says to double tap it.
  const nativeFullscreen = ios && !canFullscreen;
  const [fsHint, setFsHint] = useState(false);
  const fsHintTimer = useRef(null);
  const showFsHint = () => {
    setFsHint(true);
    setPanel(null);
    clearTimeout(fsHintTimer.current);
    fsHintTimer.current = setTimeout(() => setFsHint(false), FS_HINT_MS);
  };
  useEffect(() => () => clearTimeout(fsHintTimer.current), []);

  useEffect(() => {
    const onChange = () => {
      const fs = !!fullscreenElement();
      setIsFullscreen(fs);
      // Android back gesture / system exit leaves fullscreen: leave immersive too.
      if (!fs && phone) setImmersive((was) => (was && canFullscreen ? false : was));
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, [phone, canFullscreen]);

  useEffect(() => () => { exitRealFullscreen(); }, []);

  useEffect(() => {
    const onResize = () => setVp(viewport());
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  // Held upright in immersive mode: draw the player sideways so it is always landscape.
  const rotated = phone && immersive && vp.h > vp.w;
  const stageStyle = rotated
    ? { position: 'absolute', top: 0, left: 0, width: vp.h, height: vp.w, transform: `translateX(${vp.w}px) rotate(90deg)`, transformOrigin: 'top left' }
    : undefined;
  const fullscreenOn = nativeFullscreen ? false : phone ? immersive : isFullscreen;
  const showFullscreenButton = phone || canFullscreen;
  // Phone held upright and not full screen: the older inline layout, a 16:9 player at the top with
  // the details, episodes and related titles under it. Turning the phone sideways fills the screen.
  // Phones with frameXTV's own player stay in this layout when turned sideways too (its own full
  // screen button covers landscape).
  const inline = phone && (ownControls || (!immersive && vp.h >= vp.w));

  // --- CHROME AUTO HIDE ---
  const pinned = !!panel || !player.playing || nextUp !== null || !custom;
  const wake = useCallback(() => {
    setShowUI(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowUI(false), HIDE_UI_MS);
  }, []);
  useEffect(() => () => clearTimeout(hideTimer.current), []);
  // Start the hide countdown when playback starts. On touch screens there is no mouse movement to
  // start it, so without this the controls stayed on screen until the first tap.
  useEffect(() => { if (player.playing) wake(); }, [player.playing, wake]);
  const uiVisible = showUI || pinned;

  const flashIcon = (name) => { setFlash({ name, id: Date.now() }); };
  const togglePlay = () => {
    const willPlay = player.paused;
    if (!share(willPlay ? 'play' : 'pause', { playing: willPlay })) return;
    flashIcon(willPlay ? 'play' : 'pause');
    player.toggle();
  };
  const seekTo = (t) => {
    const target = Math.max(0, player.duration ? Math.min(t, player.duration - 0.5) : t);
    if (!share('seek', { position: target })) return;
    player.seek(target);
  };
  const seekBy = (seconds) => seekTo(player.currentTime + seconds);

  // Touch: a tap shows or hides the controls (it never pauses by accident); a double tap on the
  // left or right side jumps 10 seconds, like the Netflix and YouTube apps.
  const lastTap = useRef({ t: 0, side: null });
  const handleSurfaceTap = (e) => {
    if (e.target !== e.currentTarget) return;
    if (!touch) { togglePlay(); return; }
    const w = e.currentTarget.clientWidth || 1;
    const x = e.nativeEvent.offsetX;
    const side = x < w * 0.35 ? 'back' : x > w * 0.65 ? 'fwd' : null;
    const now = Date.now();
    if (side && lastTap.current.side === side && now - lastTap.current.t < 320) {
      flashIcon(side);
      seekBy(side === 'fwd' ? 10 : -10);
      lastTap.current = { t: 0, side: null };
      wake();
      return;
    }
    lastTap.current = { t: now, side };
    if (showUI && !pinned) { clearTimeout(hideTimer.current); setShowUI(false); }
    else wake();
  };

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
      else if (k === 'arrowright' || k === 'l') { e.preventDefault(); flashIcon('fwd'); seekBy(10); }
      else if (k === 'arrowleft' || k === 'j') { e.preventDefault(); flashIcon('back'); seekBy(-10); }
      else if (k === 'arrowup') { e.preventDefault(); applyVolume(volume + 0.1); }
      else if (k === 'arrowdown') { e.preventDefault(); applyVolume(volume - 0.1); }
      else if (k === 'm') toggleMute();
      else if (k === 'f') toggleFullscreen();
      else if (k === 'c') toggleSubtitles();
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

  // ani.pm starts at the room's second in a room, else where this browser (or the history item)
  // left that same entry and episode, else at 0 (spec 0009, Value sourcing).
  const aniStart = aniLoaded ? (inRoom ? startAt : aniSpots.current[`${aniLoaded.anilistId}|${aniLoaded.aniEpisode}`] || 0) : 0;
  const iframeSrc = useMemo(
    () => source.url({ id: movie.id, isTV, season, episode, start: isAniPm ? aniStart : startAt, provider: providerId, title, poster, ownControls, anilistId: aniLoaded?.anilistId, aniEpisode: aniLoaded?.aniEpisode, lang: aniLang }),
    [loadKey]
  );

  const currentEp = episodesList.find((e) => e.episode_number === episode);
  const subtitle = isTV ? `S${season}:E${episode}${currentEp?.name ? ` · ${currentEp.name}` : ''}` : (movie.year || String(movie.release_date || '').slice(0, 4) || 'Movie');
  const serverName = isFrameX ? (providers.find((p) => p.id === providerId)?.name || 'Auto server') : source.name;
  // frameXTV stays hidden until it reports a stream (or the viewer has to click it to start).
  // Our controls: frameXTV stays hidden until it reports a stream. Its own player: shown once its page is up.
  // ani.pm: shown the moment its frame exists (nothing of ours over it); loading only before that.
  const loading = isAniPm
    ? !aniLoaded
    : isFrameX
      ? (custom ? !player.duration && !player.failed && !noStream && !frameTaps : !player.ready && !player.failed)
      : backupLoading;
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const remaining = player.duration ? player.duration - player.currentTime : 0;

  // --- PHONE DETAILS (inline layout) ---
  // Stable handlers so the memoized details section does not re-render with playback updates.
  const navigate = useNavigate();
  const latest = useRef({});
  latest.current = { reload, onClose, chooseSource };
  const openSettings = useCallback(() => setPanel((p) => (p === 'settings' ? null : 'settings')), []);
  const reloadStable = useCallback(() => latest.current.reload(), []);
  const backToOurPlayer = useCallback(() => latest.current.chooseSource('framex'), []);
  const openTitle = useCallback((m) => {
    latest.current.onClose?.();
    navigate(`/${m.type || (isTV ? 'tv' : 'movie')}/${m.id}`);
  }, [navigate, isTV]);
  if (inline && panel === 'episodes') setPanel(null); // the list is on the page in this layout
  const detailsNotice = isAniPm ? 'ani.pm is the anime backup server. It plays in its own player.' : !isFrameX ? `${source.name} is a backup source with its own player.` : null;

  const liveCount = together.members.filter((m) => m.live).length;
  const knocks = together.pending.length;
  const togetherButton = (
    <Ctl
      label={roomId ? `Watch together, ${liveCount} here${knocks ? `, ${knocks} waiting to join` : ''}` : 'Watch together'}
      onClick={() => (roomId ? setShowTogether((v) => !v) : startTogether())}
      active={!!roomId}
      disabled={startingRoom}
      aria-pressed={!!roomId}
    >
      {startingRoom ? <Spinner size={18} /> : <Users size={20} aria-hidden="true" />}
      {roomId && knocks > 0
        ? <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rating px-1 text-[10px] font-bold text-black motion-safe:animate-pulse" aria-hidden="true">{knocks}</span>
        : roomId && liveCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold">{liveCount}</span>}
    </Ctl>
  );

  // --- ANI.PM CHROME (spec 0009, AC-7): our bar sits above ani.pm's frame and nothing of ours
  // is drawn over it. Panels open beside the frame (desktop) or below it (phones).
  const aniSettings = aniOption.state === 'none' ? null : {
    state: aniOption.state,
    reason: aniOption.reason,
    lang: aniLang,
    availability: aniOption.availability,
    onLang: chooseAniLang,
    onWrongShow: () => setPanel('find'),
    onRetry: aniOption.retry,
  };
  const findProps = {
    title: aniOption.basics?.name || title,
    originalTitle: aniOption.basics?.originalName,
    seasonLabel: isTV ? `Season ${season}` : null,
    onPick: pickAniShow,
    onReset: resetAniShow,
    canReset: aniOption.via === 'manual',
    onClose: closePanel,
  };
  const sidePanel = panel === 'settings' || panel === 'subtitles' || panel === 'find';
  const dock = isAniPm && !inline
    ? Math.max(panel === 'episodes' ? 440 : sidePanel ? 364 : 0, showTogether && roomId ? 360 : 0)
    : 0;
  // Phones: the sticky bar (48 px) and the 16:9 player above; sheets and the room panel go below.
  const belowPlayer = 'calc(48px + min(56.25vw, 100svh - 48px))';
  const aniStatus = !isAniPm ? null
    : ani.noResponse ? { text: 'ani.pm did not respond', action: inRoom ? { label: 'Sync now', run: syncNow } : { label: 'Try again', run: reload } }
      : !aniLoaded ? { text: 'Connecting to ani.pm…' }
        : ani.autoplayBlocked ? { text: 'Press play in the player' }
          : aniNote ? { text: 'This server may open an ad tab now and then', icon: true }
            : null;
  const aniStatusLine = aniStatus && (
    <p className="flex min-w-0 items-center gap-1.5 text-xs text-white/70" role="status">
      {aniStatus.icon && <Megaphone size={12} className="shrink-0 text-rating" aria-hidden="true" />}
      <span className="truncate">{aniStatus.text}</span>
      {aniStatus.action && <button type="button" onClick={aniStatus.action.run} className="shrink-0 font-semibold text-white underline underline-offset-2">{aniStatus.action.label}</button>}
    </p>
  );
  const noDub = !!aniOption.availability && !aniOption.availability.dub && aniLang !== 'dub';
  const subDubSwitch = (
    <div role="radiogroup" aria-label="Sub or Dub" className="flex shrink-0 rounded-full bg-white/10 p-0.5">
      {ANI_LANGS.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={aniLang === o.id}
          disabled={o.id === 'dub' && noDub}
          title={o.id === 'dub' && noDub ? 'No dub on ani.pm for this episode' : undefined}
          onClick={() => aniLang !== o.id && chooseAniLang(o.id)}
          className={`h-8 rounded-full px-3 text-xs font-semibold motion-safe:transition-colors disabled:opacity-35 ${aniLang === o.id ? 'bg-white text-black' : 'text-white/75 hover:text-white'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
  const aniNextUp = isAniPm && nextUp !== null && (
    <div role="status" className="flex shrink-0 items-center gap-1 rounded-full bg-white/10 py-1 pl-3 pr-1 text-xs">
      <span className="tabular-nums text-white/80">Next in {nextUp}s</span>
      <button type="button" onClick={handleNextEpisode} className="rounded-full bg-white px-2.5 py-1 font-semibold text-black hover:bg-white/90">Play now</button>
      <button type="button" onClick={() => setNextUp(null)} className="rounded-full px-2 py-1 text-white/70 hover:bg-white/10 hover:text-white">Cancel</button>
    </div>
  );

  const settingsProps = {
    onClose: closePanel,
    // Phones and tablets: only sources that run sandboxed (no pop ups, no redirects). VidLink and VidSrc
    // refuse to load in a sandboxed frame (checked 2026-10-17), so they are not offered there.
    sources: STREAM_SOURCES.filter((src) => (src.anime ? aniOption.state !== 'none' : !(touch || dubMode) || src.sandbox)),
    aniPm: aniSettings,
    sourceId,
    onSource: chooseSource,
    failedSources,
    autoSwitch,
    onAutoSwitch: setAutoSwitch,
    custom,
    providers,
    providerId,
    onProvider: chooseProvider,
    subTracks: subTracks.list,
    subStatus: subTracks.status,
    subUrl,
    onSubTrack: chooseSubTrack,
    subPrefs: shownSubPrefs,
    onSubPrefs: changeSubStyle,
    subOffset,
    onSubOffset: changeSubOffset,
    subRoomNote: inRoom ? (together.allowed ? 'Your subtitle changes go to everyone in the room.' : 'The room sets the subtitles. Changes here are just for you.') : null,
    nativeSubs,
    isFrameX,
    audio,
    dubMode: dubMode && !touch,
    roomAudio: inRoom ? roomAudio : null,
    onDub: chooseDub,
    onLeaveDub: leaveDub,
    ownPlayer: ownControls && isFrameX,
    speed,
    onSpeed: applySpeed,
  };

  return (
    <Motion.div
      // No fade in: a see through first frame showed the page underneath (Home) before the player.
      initial={false}
      role="dialog"
      aria-modal="true"
      aria-label={`Watching ${title}`}
      ref={rootRef}
      className={inline
        ? 'fixed inset-0 z-[500] overflow-y-auto overflow-x-hidden overscroll-contain bg-[#050505] font-body text-white'
        : 'fixed inset-0 z-[500] overflow-hidden overscroll-none bg-black font-body text-white'}
    >
      <Helmet><title>{`Watching ${title}`}</title></Helmet>

      {/* Phones with frameXTV's own player: our back bar sits above the video, not on top of its controls */}
      {inline && ownControls && (
        <div className="sticky top-0 z-30 flex h-12 items-center gap-1 bg-[#050505] pr-2">
          <Ctl label="Back" onClick={onClose}><ArrowLeft size={22} aria-hidden="true" /></Ctl>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">{title}</p>
            {isAniPm && nextUp !== null ? (
              <p className="flex items-center gap-2 text-[11px] text-white/70" role="status">
                <span className="tabular-nums">Next in {nextUp}s</span>
                <button type="button" onClick={handleNextEpisode} className="font-semibold text-white underline underline-offset-2">Play now</button>
                <button type="button" onClick={() => setNextUp(null)} className="text-white/60 underline underline-offset-2">Cancel</button>
              </p>
            ) : (aniStatusLine || <p className="truncate text-[11px] text-white/55">{subtitle}</p>)}
          </div>
          {isAniPm && subDubSwitch}
          {isAniPm && <Ctl label="Servers and settings" onClick={openSettings} active={sidePanel} data-settings-toggle><Settings size={20} aria-hidden="true" /></Ctl>}
          {togetherButton}
        </div>
      )}

      <div
        ref={stageRef}
        onPointerMove={touch ? undefined : wake}
        onPointerDown={touch ? undefined : wake}
        data-rotated={rotated || undefined}
        style={stageStyle}
        className={`@container relative overflow-hidden bg-black ${inline ? (ownControls ? 'sticky top-12 z-20 aspect-video max-h-[calc(100svh-48px)] w-full' : 'sticky top-0 z-20 aspect-video w-full') : 'h-full w-full'} ${uiVisible || !custom ? '' : 'cursor-none'}`}
      >
        {/* ani.pm (desktop and tablets): our bar sits above its frame, never on it */}
        {isAniPm && !inline && (
          <div className="absolute inset-x-0 top-0 z-30 flex h-16 items-center gap-1.5 border-b border-white/10 bg-[#050505] px-2 sm:gap-2 sm:px-4">
            <Ctl label="Back" onClick={onClose}><ArrowLeft size={24} aria-hidden="true" /></Ctl>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold">{title}</h1>
              {aniStatusLine || <p className="truncate text-xs text-white/60">{subtitle} · ani.pm</p>}
            </div>
            {aniNextUp}
            {subDubSwitch}
            {isTV && <Ctl label="Episodes" onClick={() => setPanel(panel === 'episodes' ? null : 'episodes')} active={panel === 'episodes'}><ListVideo size={20} aria-hidden="true" /></Ctl>}
            <Ctl label="Servers and settings" onClick={() => setPanel(panel === 'settings' ? null : 'settings')} active={sidePanel} data-settings-toggle><Settings size={20} aria-hidden="true" /></Ctl>
            {togetherButton}
          </div>
        )}

        {/* Immersive backdrop while the stream connects */}
        <AnimatePresence>
          {loading && (
            <Motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: isAniPm ? 0 : 0.8 } }} className="pointer-events-none absolute inset-0 z-[1]">
              {poster && <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40 blur-sm scale-105 motion-safe:animate-kenburns" />}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#000_85%)]" />
            </Motion.div>
          )}
        </AnimatePresence>

        {/* No playable stream: the frame is unloaded so nothing keeps playing out of sight */}
        {!noStream && resolved && (!isAniPm || aniLoaded) && (
          <iframe
            ref={frameRef}
            key={loadKey}
            title={`${title} video player`}
            src={iframeSrc}
            // When the embed shows its own controls, start it below our top bar so neither covers the other.
            className={`absolute inset-x-0 bottom-0 w-full border-0 motion-safe:transition-opacity duration-700 ${custom || inline ? 'top-0 h-full' : isAniPm ? 'top-16 h-[calc(100%-64px)]' : 'top-[88px] h-[calc(100%-88px)]'} ${loading ? 'opacity-0' : 'opacity-100'}`}
            style={dock ? { width: `calc(100% - ${dock}px)` } : undefined}
            allow={isAniPm ? 'autoplay; fullscreen; picture-in-picture; encrypted-media; screen-wake-lock' : 'autoplay; fullscreen; encrypted-media; picture-in-picture'}
            sandbox={ownControls && source.sandbox ? FRAME_SANDBOX : undefined}
            allowFullScreen
            referrerPolicy="origin"
            onLoad={() => { setBackupLoading(false); if (isAniPm) ani.connect(); }}
          />
        )}

        {/* Backup sources: first click is absorbed (blocks pop-up ads), then their own controls take over */}
        {!isFrameX && !isAniPm && shieldActive && !backupLoading && (
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
        {custom && !player.failed && !noStream && !frameTaps && !fsHint && (
          <div
            className="absolute inset-0 z-10"
            onClick={handleSurfaceTap}
            onDoubleClick={touch ? undefined : toggleFullscreen}
            aria-hidden="true"
          />
        )}

        {/* Loading */}
        {loading && !player.failed && !noStream && (
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 text-center px-6">
            <Spinner size={inline ? 40 : 52} />
            <p className="text-sm font-medium text-white/80">Connecting to {isFrameX ? `MovieHub Server · ${serverName}` : source.name}…</p>
            {autoSwitch && !inline && !isAniPm && <p className="text-xs text-white/45">{tried.key === episodeKey && tried.ids.length ? `Server ${tried.ids.length + 1}: the last one had no stream we can play.` : 'If this stalls, we try another server automatically.'}</p>}
          </div>
        )}

        {/* Buffering mid playback */}
        {custom && !loading && player.buffering && !player.failed && !frameTaps && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"><Spinner size={52} /></div>
        )}

        {/* Click / tap to play: drawn over the frame but lets the click through to frameXTV's video */}
        {frameTaps && (
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 text-center" role="status">
            {tapStarting && <Spinner size={inline ? 40 : 52} />}
            {!tapStarting && (
              <>
                <span className={`flex items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25 backdrop-blur-md ${inline ? 'h-14 w-14' : 'h-[72px] w-[72px]'}`}>
                  <Play size={inline ? 26 : 34} className="ml-1 fill-white" aria-hidden="true" />
                </span>
                <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white/85">{touch ? 'Tap to play' : 'Click to play'}</span>
              </>
            )}
          </div>
        )}

        {/* Our subtitles, drawn over the video and lifted above the controls while they show */}
        {/* iPhone: double tap to open Apple's full screen player (taps reach the video meanwhile) */}
        {fsHint && (
          <p className="pointer-events-none absolute left-1/2 top-1/2 z-30 w-max max-w-[calc(100%-32px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/75 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-card backdrop-blur-md" role="status">
            Double tap the video for full screen
          </p>
        )}

        {custom && !nativeSubs && subUrl && subCues.url === subUrl && !frameTaps && (
          <SubtitleOverlay
            cues={subCues.cues}
            clockRef={clockRef}
            offset={subOffset}
            prefs={shownSubPrefs}
            lift={uiVisible ? (inline ? 64 : 120) : 0}
          />
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

        {/* Touch: Netflix style center row (back 10, play / pause, forward 10) while controls show */}
        {custom && touch && uiVisible && !loading && !player.ended && !player.failed && nextUp === null && !panel && !frameTaps && !fsHint && (
          <div className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center ${inline ? 'gap-8' : 'gap-10'}`}>
            <button type="button" onClick={() => { flashIcon('back'); seekBy(-10); wake(); }} aria-label="Back 10 seconds" className={`pointer-events-auto relative flex items-center ${inline ? 'h-12 w-12' : 'h-14 w-14'} justify-center rounded-full bg-black/40 active:scale-90 motion-safe:transition-transform`}>
              <RotateCcw size={inline ? 24 : 28} aria-hidden="true" /><span className="absolute mt-0.5 text-[9px] font-bold">10</span>
            </button>
            <button type="button" onClick={() => { togglePlay(); wake(); }} aria-label={player.paused ? 'Play' : 'Pause'} className={`pointer-events-auto flex items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25 active:scale-90 motion-safe:transition-transform ${inline ? 'h-[60px] w-[60px]' : 'h-[72px] w-[72px]'}`}>
              {player.paused ? <Play size={34} className="ml-1 fill-white" aria-hidden="true" /> : <Pause size={34} className="fill-white" aria-hidden="true" />}
            </button>
            <button type="button" onClick={() => { flashIcon('fwd'); seekBy(10); wake(); }} aria-label="Forward 10 seconds" className={`pointer-events-auto relative flex items-center justify-center rounded-full bg-black/40 active:scale-90 motion-safe:transition-transform ${inline ? 'h-12 w-12' : 'h-14 w-14'}`}>
              <RotateCw size={inline ? 24 : 28} aria-hidden="true" /><span className="absolute mt-0.5 text-[9px] font-bold">10</span>
            </button>
          </div>
        )}

        {/* Paused: big center play (mouse / desktop) */}
        {custom && !touch && !loading && player.paused && !player.ended && !player.failed && !noStream && !frameTaps && nextUp === null && (
          <button type="button" onClick={togglePlay} aria-label="Play" className="absolute left-1/2 top-1/2 z-20 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/25 motion-safe:transition-transform hover:scale-110">
            <Play size={34} className="ml-1 fill-white" aria-hidden="true" />
          </button>
        )}

        {/* Stream failure */}
        {isFrameX && (player.failed || noStream) && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 px-6">
            <div className="max-w-md text-center">
              <ServerCrash size={inline ? 28 : 40} className="mx-auto text-accent-text" aria-hidden="true" />
              <h2 className={inline ? 'mt-2 text-base font-semibold' : 'mt-4 text-xl font-semibold'}>{noStream ? 'No playable stream on MovieHub servers' : 'MovieHub Server did not respond'}</h2>
              <p className={`text-sm text-white/60 ${inline ? 'mt-1' : 'mt-2'}`}>
                {autoSwitch && !noStream ? 'Trying another server…' : 'Try again, or pick a server yourself.'}
              </p>
              <div className={`flex flex-wrap justify-center gap-3 ${inline ? 'mt-3' : 'mt-6'}`}>
                <button type="button" onClick={reload} className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black hover:bg-white/90"><RefreshCcw size={16} aria-hidden="true" /> Try again</button>
                <button type="button" onClick={() => setPanel('settings')} data-settings-toggle className="inline-flex h-11 items-center gap-2 rounded-full border border-white/20 px-5 text-sm font-semibold hover:bg-white/10"><Settings size={16} aria-hidden="true" /> Choose server</button>
                {/* Anime only (spec 0009): the ani.pm backup, by hand */}
                {aniOption.state === 'error' && (
                  <button type="button" onClick={aniOption.retry} className="inline-flex h-11 items-center gap-2 rounded-full border border-white/20 px-5 text-sm font-semibold hover:bg-white/10">Could not check ani.pm · Try again</button>
                )}
                {aniOption.state !== 'none' && aniOption.state !== 'error' && (
                  <button type="button" onClick={() => chooseSource('anipm')} disabled={aniOption.state === 'checking' || aniOption.state === 'unavailable'} className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-40">
                    {aniOption.state === 'checking' && <Spinner size={14} />} Try ani.pm
                  </button>
                )}
              </div>
              {aniOption.state === 'unavailable' && <p className="mt-2 text-xs text-white/50">ani.pm: {aniOption.reason}</p>}
            </div>
          </div>
        )}

        {/* Next episode countdown */}
        <AnimatePresence>
          {nextUp !== null && !isAniPm && (
            <Motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
              className={`absolute z-30 rounded-panel border border-white/10 bg-[#111116]/95 backdrop-blur-xl shadow-card ${inline ? 'inset-x-2 bottom-2 p-3' : 'bottom-28 right-4 sm:right-8 w-[min(340px,calc(100vw-32px))] p-4'}`}
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

        {/* TOP BAR (not with frameXTV's own player on phones: the back bar above replaces it) */}
        <div hidden={(inline && ownControls) || isAniPm} className={`pointer-events-none absolute inset-x-0 top-0 z-30 bg-gradient-to-b motion-safe:transition-opacity duration-300 ${inline ? 'from-black/75 to-transparent px-1 pt-1 pb-6' : 'from-black/85 via-black/40 to-transparent px-3 sm:px-6 pt-3 sm:pt-5 pb-12'} ${uiVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="pointer-events-auto flex min-w-0 items-center gap-2 sm:gap-4">
              <Ctl label="Back" onClick={onClose}><ArrowLeft size={24} aria-hidden="true" /></Ctl>
              <div className="min-w-0">
                {inline
                  ? <p className="truncate text-sm font-semibold">{title}</p>
                  : <h1 className="truncate text-base sm:text-lg font-semibold">{title}</h1>}
                <p className="truncate text-xs text-white/60">{subtitle}</p>
              </div>
            </div>
            <div className="pointer-events-auto flex shrink-0 items-center gap-1">
              {togetherButton}
              {(!custom || frameTaps) && !inline && (
                <>
                  {isTV && <Ctl label="Episodes" onClick={() => setPanel(panel === 'episodes' ? null : 'episodes')} active={panel === 'episodes'}><ListVideo size={20} aria-hidden="true" /></Ctl>}
                  {isTV && hasNext && <Ctl label="Next episode" onClick={handleNextEpisode}><SkipForward size={20} aria-hidden="true" /></Ctl>}
                  <Ctl label="Reload video" onClick={reload}><RefreshCcw size={18} aria-hidden="true" /></Ctl>
                  <Ctl label="Servers and settings" onClick={() => setPanel(panel === 'settings' ? null : 'settings')} active={panel === 'settings'} data-settings-toggle><Settings size={20} aria-hidden="true" /></Ctl>
                  {showFullscreenButton && (
                    <Ctl label={fullscreenOn ? 'Exit full screen' : 'Full screen'} onClick={toggleFullscreen}>
                      {fullscreenOn ? <Minimize size={20} aria-hidden="true" /> : <Maximize size={20} aria-hidden="true" />}
                    </Ctl>
                  )}
                </>
              )}
              {(!custom || frameTaps) && inline && showFullscreenButton && (
                <Ctl label={fullscreenOn ? 'Exit full screen' : 'Full screen'} onClick={toggleFullscreen}>
                  {fullscreenOn ? <Minimize size={20} aria-hidden="true" /> : <Maximize size={20} aria-hidden="true" />}
                </Ctl>
              )}
              {custom && !frameTaps && (
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" /> {serverName}
                </span>
              )}
            </div>
          </div>
          {!custom && !inline && (
            <p className="pointer-events-none mt-2 ml-14 text-[11px] text-white/45">
              {dubMode && !touch ? (inRoom && roomAudio ? `Room audio: ${roomAudio.label}. Pick it from the audio button inside the video · ` : 'Audio language: use the audio button inside the video · ') : `${source.name} is a backup source with its own player · `}
              <button type="button" onClick={dubMode && !touch ? leaveDub : () => chooseSource('framex')} className="pointer-events-auto underline hover:text-white">{dubMode && !touch ? 'back to MovieHub controls' : 'back to our player'}</button>
            </p>
          )}
        </div>

        {/* BOTTOM CONTROLS (frameXTV only: these really drive it through postMessage) */}
        {custom && !frameTaps && !(inline && nextUp !== null) && (
          <div className={`absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/90 via-black/50 to-transparent motion-safe:transition-opacity ${inline ? 'px-2 pt-10 pb-0.5' : 'px-3 sm:px-6 pt-16 pb-3 sm:pb-5'} duration-300 ${uiVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
            <div className="flex items-center gap-3">
              <SeekBar rotated={rotated} current={player.currentTime} duration={player.duration} onSeek={(t) => { seekTo(t); wake(); }} />
              <span className="shrink-0 text-xs sm:text-sm font-medium tabular-nums text-white/80">{player.duration ? `-${fmt(remaining)}` : '--:--'}</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-1">
              <div className="flex items-center gap-0.5 sm:gap-1">
                <Ctl label={player.paused ? 'Play' : 'Pause'} onClick={togglePlay}>
                  {!player.paused ? <Pause size={26} className="fill-white" aria-hidden="true" /> : <Play size={26} className="ml-0.5 fill-white" aria-hidden="true" />}
                </Ctl>
                {!touch && (
                  <>
                    <Ctl label="Back 10 seconds" onClick={() => { flashIcon('back'); seekBy(-10); }}><RotateCcw size={22} aria-hidden="true" /><span className="absolute text-[8px] font-bold mt-0.5">10</span></Ctl>
                    <Ctl label="Forward 10 seconds" onClick={() => { flashIcon('fwd'); seekBy(10); }}><RotateCw size={22} aria-hidden="true" /><span className="absolute text-[8px] font-bold mt-0.5">10</span></Ctl>
                  </>
                )}
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
                {isTV && !inline && <Ctl label="Episodes" onClick={() => setPanel(panel === 'episodes' ? null : 'episodes')} active={panel === 'episodes'}><ListVideo size={22} aria-hidden="true" /></Ctl>}
                <Ctl label={subUrl ? 'Turn subtitles off' : 'Turn subtitles on'} onClick={toggleSubtitles} active={!!subUrl} aria-pressed={!!subUrl}>
                  <Captions size={22} aria-hidden="true" />
                  {subUrl && <span className="absolute bottom-1.5 h-0.5 w-4 rounded-full bg-accent" aria-hidden="true" />}
                </Ctl>
                <Ctl label="Servers and settings" onClick={() => setPanel(panel === 'settings' ? null : 'settings')} active={panel === 'settings'} data-settings-toggle><Settings size={22} aria-hidden="true" /></Ctl>
                {showFullscreenButton && (
                  <Ctl label={fullscreenOn ? 'Exit full screen' : 'Full screen'} onClick={toggleFullscreen}>
                    {fullscreenOn ? <Minimize size={22} aria-hidden="true" /> : <Maximize size={22} aria-hidden="true" />}
                  </Ctl>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PANELS */}
        <AnimatePresence>
          {(panel === 'settings' || panel === 'subtitles') && !inline && (
            <SettingsMenu key={panel} initialTab={panel === 'subtitles' ? 'subtitles' : 'servers'} {...settingsProps} position={custom ? 'bottom-24 right-3 sm:right-6' : isAniPm ? 'top-[76px] right-3' : 'top-20 right-3 sm:right-6'} />
          )}
          {panel === 'find' && !inline && <FindOnAniPm key="find" {...findProps} position={isAniPm ? 'top-[76px] right-3' : 'top-20 right-3 sm:right-6'} />}
          {panel === 'episodes' && isTV && !inline && (
            <EpisodesPanel
              key="episodes"
              title={title}
              tvId={movie.id}
              seasons={seasonsData}
              playingSeason={season}
              playingEpisode={episode}
              onPick={goToEpisode}
              onClose={closePanel}
              docked={isAniPm}
            />
          )}
        </AnimatePresence>

        {/* Movie finished */}
        {custom && player.ended && !isTV && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70">
            <div className="text-center">
              <p className="text-sm text-white/60">You finished</p>
              <h2 className={`mt-1 font-display uppercase ${inline ? 'text-3xl' : 'text-5xl'}`}>{title}</h2>
              <div className={`flex justify-center gap-3 ${inline ? 'mt-3' : 'mt-6'}`}>
                <button type="button" onClick={() => { if (!share('seek', { position: 0, playing: true })) return; player.seek(0); player.play(); }} className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black hover:bg-white/90"><RotateCcw size={16} aria-hidden="true" /> Watch again</button>
                <button type="button" onClick={onClose} className="h-11 rounded-full border border-white/20 px-5 text-sm font-semibold hover:bg-white/10">Back to browsing</button>
              </div>
            </div>
          </div>
        )}

        {!isFrameX && !isAniPm && failedSources.length >= STREAM_SOURCES.filter((src) => !src.anime).length - 1 && !backupLoading && (
          <p className="pointer-events-none absolute bottom-4 left-4 z-30 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white/70">
            <AlertTriangle size={14} className="text-rating" aria-hidden="true" /> Other sources failed for this title
          </p>
        )}
      </div>

      {inline && (
        <MobileWatchDetails
          movie={movie}
          title={title}
          isTV={isTV}
          season={season}
          episode={episode}
          episodeInfo={currentEp}
          seasons={seasonsData}
          onPickEpisode={goToEpisode}
          serverName={serverName}
          onSettings={openSettings}
          onReload={reloadStable}
          onNext={hasNext ? handleNextEpisode : undefined}
          notice={detailsNotice}
          noticeActionLabel={!custom ? 'Back to our player' : undefined}
          onNoticeAction={backToOurPlayer}
          onOpenTitle={openTitle}
        />
      )}

      {/* Phone layout: settings open as a sheet over the page, not inside the small player */}
      <AnimatePresence>
        {inline && sidePanel && (
          <div key="settings-sheet" className="fixed inset-0 z-[510] pointer-events-none">
            {/* On ani.pm nothing may dim its frame: the sheet opens below the player instead */}
            {!isAniPm && <div className="pointer-events-auto absolute inset-0 bg-black/50" aria-hidden="true" />}
            {panel === 'find' ? (
              <FindOnAniPm
                key="find"
                {...findProps}
                position="pointer-events-auto inset-x-0 mx-auto bottom-[calc(env(safe-area-inset-bottom)+12px)]"
                style={isAniPm ? { top: `calc(${belowPlayer} + 8px)`, maxHeight: `calc(100svh - ${belowPlayer} - 20px)` } : undefined}
              />
            ) : (
              <SettingsMenu
                key={panel}
                initialTab={panel === 'subtitles' ? 'subtitles' : 'servers'}
                {...settingsProps}
                position="pointer-events-auto inset-x-0 mx-auto bottom-[calc(env(safe-area-inset-bottom)+12px)]"
                style={isAniPm ? { top: `calc(${belowPlayer} + 8px)`, maxHeight: `calc(100svh - ${belowPlayer} - 20px)` } : undefined}
              />
            )}
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTogether && roomId && together.room && (
          <TogetherPanel
            key="together"
            together={together}
            user={currentUser}
            onClose={() => setShowTogether(false)}
            onLeave={leaveTogether}
            onEnd={() => together.endForEveryone().then(leaveTogether, () => toast.error('Could not end the room. Try again.'))}
            onSyncNow={syncNow}
            style={isAniPm && inline ? { top: belowPlayer } : undefined}
          />
        )}
      </AnimatePresence>
    </Motion.div>
  );
};

export default WatchPage;
