import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';

const YT_ORIGIN = 'https://www.youtube-nocookie.com';
const REVEAL_DELAY = 900; // ms after YouTube reports "playing", so its start overlay has faded
const START_AT = 6; // s; skips the rating card ("approved for audiences") most trailers open with

// Full bleed hero background: the backdrop art (slow zoom), replaced by a muted, looping, chromeless
// YouTube trailer once the player reports it is actually playing. If the trailer is missing,
// blocked, not embeddable, or the visitor prefers reduced motion, the art simply stays.
// Talks to the embed through YouTube's postMessage protocol, so no SDK script is loaded.
// soundless: always muted with no sound button (hover previews).
// revealDelay / crop: small boxes need a longer wait (YouTube's title bar fades ~3s into playback)
// and a deeper crop so its corner badges fall outside the frame.
const TrailerBackdrop = ({
  videoKey, image, fallbackStyle, paused = false, title = 'trailer', soundless = false,
  revealDelay = REVEAL_DELAY, crop = 1.18,
}) => {
  const reducedMotion = useReducedMotion();
  const frameRef = useRef(null);
  const wrapRef = useRef(null);
  const readyRef = useRef(false);
  const [state, setState] = useState({ key: videoKey, ready: false, playing: false, failed: false, muted: true });
  const [revealed, setRevealed] = useState(false);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(() => typeof document === 'undefined' || !document.hidden);

  // A new title means a fresh player state (adjusted during render, not in an effect).
  if (state.key !== videoKey) {
    setState({ key: videoKey, ready: false, playing: false, failed: false, muted: true });
    setRevealed(false);
  }

  const enabled = !!videoKey && !reducedMotion && !state.failed;

  const send = useCallback((func, args = []) => {
    frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), YT_ORIGIN);
  }, []);

  // Player events: ready, state changes, real mute state, errors (e.g. embedding disabled).
  useEffect(() => {
    if (!enabled) return undefined;
    const onMessage = (e) => {
      if (e.origin !== YT_ORIGIN || e.source !== frameRef.current?.contentWindow) return;
      let data;
      try { data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
      if (!data?.event) return;
      readyRef.current = true;
      const playerState = data.event === 'onStateChange' ? data.info : data.info?.playerState;
      // Loop by hand back to START_AT (YouTube's own loop restarts at 0, replaying the rating card).
      if (playerState === 0) {
        send('seekTo', [START_AT, true]);
        send('playVideo');
      }
      setState((s) => {
        const next = { ...s, ready: true };
        if (data.event === 'onError') next.failed = true;
        if (playerState === 1) next.playing = true;
        if (playerState === 0) next.playing = false; // ended: show the art while the loop restarts
        if (typeof data.info?.muted === 'boolean') next.muted = data.info.muted;
        return next;
      });
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [enabled, send]);

  // The embed only starts reporting after it hears "listening"; repeat until it answers
  // (the official IFrame API does the same), capped so a dead embed is not pinged forever.
  const handleLoad = () => {
    let tries = 0;
    readyRef.current = false;
    const ping = () => {
      frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: videoKey, channel: 'widget' }), YT_ORIGIN);
    };
    ping();
    const timer = setInterval(() => {
      tries += 1;
      if (readyRef.current || tries > 40 || !frameRef.current) { clearInterval(timer); return; }
      ping();
    }, 250);
  };

  // Reveal the video a beat after it starts so YouTube's own start overlay is never seen.
  useEffect(() => {
    if (!state.playing) return undefined;
    const t = setTimeout(() => setRevealed(true), revealDelay);
    return () => { clearTimeout(t); setRevealed(false); };
  }, [state.playing, revealDelay]);

  // Pause when scrolled away, when the tab is hidden, or when the parent asks (player or modal open).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onVis = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const shouldPlay = !paused && inView && pageVisible;
  // Only resume what this component paused: a redundant playVideo after autoplay makes
  // YouTube flash its centre play/pause indicator over the hero.
  const pausedByUs = useRef(false);
  useEffect(() => {
    if (!enabled || !state.ready) return;
    if (!shouldPlay) {
      send('pauseVideo');
      pausedByUs.current = true;
    } else if (pausedByUs.current) {
      send('playVideo');
      pausedByUs.current = false;
    }
  }, [enabled, state.ready, shouldPlay, send]);

  // A second player opening (full player, trailer modal) should never fight this one for sound.
  useEffect(() => {
    if (paused && !state.muted) send('mute');
  }, [paused, state.muted, send]);

  const toggleMute = () => {
    if (state.muted) {
      send('unMute');
      send('setVolume', [70]);
    } else {
      send('mute');
    }
    // Optimistic; the player's next report corrects it if the browser refused sound.
    setState((s) => ({ ...s, muted: !s.muted }));
  };

  const src = enabled
    ? `${YT_ORIGIN}/embed/${videoKey}?autoplay=1&mute=1&controls=0&start=${START_AT}` +
      `&playsinline=1&rel=0&iv_load_policy=3&disablekb=1&fs=0&modestbranding=1&enablejsapi=1` +
      `&origin=${encodeURIComponent(window.location.origin)}`
    : null;
  const showVideo = enabled && revealed;

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <div className="absolute inset-0 overflow-hidden bg-canvas [container-type:size]" aria-hidden="true">
        {image ? (
          <img
            src={image}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover motion-safe:animate-kenburns motion-safe:transition-opacity duration-1000 ${showVideo ? 'opacity-0' : 'opacity-100'}`}
          />
        ) : (
          <div className="absolute inset-0" style={fallbackStyle} />
        )}

        {src && (
          <iframe
            ref={frameRef}
            key={videoKey}
            src={src}
            title={`${title} preview`}
            tabIndex={-1}
            allow="autoplay; encrypted-media; picture-in-picture"
            onLoad={handleLoad}
            // Cover sizing for a 16:9 video in any box, scaled up a little to crop YouTube's edges.
            style={{ width: 'max(100cqw, 177.78cqh)', height: 'max(100cqh, 56.25cqw)', scale: crop }}
            className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-0 motion-safe:transition-opacity duration-1000 ${showVideo ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
      </div>

      {showVideo && !soundless && (
        <button
          type="button"
          onClick={toggleMute}
          aria-label={state.muted ? 'Unmute trailer preview' : 'Mute trailer preview'}
          title={state.muted ? 'Unmute' : 'Mute'}
          className={`absolute right-4 md:right-8 lg:right-16 top-24 md:top-28 z-30 h-11 w-11 rounded-full glass flex items-center justify-center text-white hover:bg-white/20 motion-safe:transition-all duration-300 motion-safe:active:scale-90 ${state.muted ? 'motion-safe:animate-rise' : 'motion-safe:animate-glow'}`}
        >
          {state.muted ? <VolumeX size={19} aria-hidden="true" /> : <Volume2 size={19} aria-hidden="true" />}
        </button>
      )}
    </div>
  );
};

export default TrailerBackdrop;
