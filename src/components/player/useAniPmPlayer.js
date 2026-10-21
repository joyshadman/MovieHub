import { useCallback, useEffect, useRef, useState } from 'react';
import { aniPmPlayer } from '../../services/aniPm';

const NO_RESPONSE_MS = 15000; // no answer to hello by then: "ani.pm did not respond" (AC-9)
const HELLO_EVERY_MS = 3000; // hello again until it answers (its page may still be starting)
const ECHO_MS = 1500; // an event this soon after our own matching command is our echo, not a person
const SEEK_JUMP_SEC = 2; // a time jump this much beyond the wall clock is a seek

const fresh = (key, lang) => ({
  key, connected: false, ready: false, currentTime: 0, duration: 0, paused: true, buffering: false,
  ended: false, failed: null, noResponse: false, autoplayBlocked: false, lang,
});

// Playback state for ani.pm's own player frame (spec 0009), through its v1 message protocol.
// Same shape as useFrameXPlayer (paused, currentTime, duration, play, pause, seek), so Watch
// Together follows it the same way. ani.pm stays unmodified: we only send commands and read events.
// `onUserAction(action, data)` gets the viewer's own play, pause, seek and language changes made
// inside ani.pm's controls; echoes of our own commands are never reported.
export const useAniPmPlayer = ({ frameRef, active, loadKey, lang, onUserAction }) => {
  const [state, setState] = useState(() => fresh(loadKey, lang));
  if (state.key !== loadKey) setState(fresh(loadKey, lang));

  const channel = useRef(null);
  const readyRef = useRef(false);
  const sentAt = useRef({});
  const lastTick = useRef(null);
  const lastSeekReport = useRef(0);
  const clock = useRef({ t: 0, duration: 0, ended: false }); // the latest reported time, for event checks
  const autoPlay = useRef(true); // the load's own autoplay start is not a person pressing play
  const onUserRef = useRef(onUserAction);
  useEffect(() => { onUserRef.current = onUserAction; }, [onUserAction]);

  useEffect(() => {
    if (!active) return undefined;
    readyRef.current = false;
    sentAt.current = {};
    lastTick.current = null;
    autoPlay.current = true;
    clock.current = { t: 0, duration: 0, ended: false };
    const c = aniPmPlayer(() => frameRef.current?.contentWindow);
    channel.current = c;
    const echo = (cmd) => Date.now() - (sentAt.current[cmd] || 0) < ECHO_MS;
    const user = (action, data) => onUserRef.current?.(action, data);
    const markReady = () => { readyRef.current = true; };
    const off = c.on(({ event, data }) => {
      if (event === 'ready') {
        markReady();
        setState((s) => ({ ...s, connected: true, ready: true, noResponse: false, failed: null, duration: Number(data.duration) || s.duration }));
      } else if (event === 'timeupdate') {
        const t = Number(data.currentTime) || 0;
        const now = Date.now();
        const prev = lastTick.current;
        lastTick.current = { t, at: now };
        clock.current = { ...clock.current, t, duration: Number(data.duration) || clock.current.duration };
        if (prev && !echo('seek') && now - lastSeekReport.current > ECHO_MS) {
          const jump = (t - prev.t) - (now - prev.at) / 1000;
          if (Math.abs(jump) > SEEK_JUMP_SEC) { lastSeekReport.current = now; user('seek', { position: t }); }
        }
        setState((s) => ({
          ...s, ready: true, currentTime: t, duration: Number(data.duration) || s.duration,
          paused: typeof data.paused === 'boolean' ? data.paused : s.paused, buffering: false,
          ended: s.ended && t >= (Number(data.duration) || s.duration) - 1.5,
        }));
      } else if (event === 'seeked') {
        const t = Number(data.currentTime);
        lastTick.current = Number.isFinite(t) ? { t, at: Date.now() } : null;
        if (Number.isFinite(t) && !echo('seek') && Date.now() - lastSeekReport.current > ECHO_MS) {
          lastSeekReport.current = Date.now();
          user('seek', { position: t });
        }
        if (Number.isFinite(t)) {
          clock.current = { ...clock.current, t, ended: false };
          setState((s) => ({ ...s, currentTime: t, ended: false }));
        }
      } else if (event === 'play') {
        const auto = autoPlay.current;
        autoPlay.current = false;
        lastTick.current = null;
        setState((s) => ({ ...s, paused: false, ended: false, autoplayBlocked: false }));
        if (!auto && !echo('play')) user('play', {});
      } else if (event === 'playing') {
        setState((s) => ({ ...s, paused: false, buffering: false, autoplayBlocked: false }));
      } else if (event === 'waiting') {
        setState((s) => ({ ...s, buffering: true }));
      } else if (event === 'pause') {
        lastTick.current = null;
        const { t, duration, ended } = clock.current;
        setState((s) => ({ ...s, paused: true }));
        // ani.pm pauses at the end of an episode by itself: not a person pausing.
        if (!ended && !(duration > 0 && t >= duration - 1.5) && !echo('pause')) user('pause', {});
      } else if (event === 'ended') {
        clock.current = { ...clock.current, ended: true };
        setState((s) => ({ ...s, ended: true, paused: true }));
      } else if (event === 'languagechange') {
        const next = data.lang === 'dub' ? 'dub' : 'sub';
        setState((s) => ({ ...s, lang: next }));
        if (!echo('setLanguage')) user('language', { lang: next });
      } else if (event === 'autoplayblocked') {
        autoPlay.current = false; // the press that follows is the viewer's own
        setState((s) => ({ ...s, autoplayBlocked: true, paused: true }));
      } else if (event === 'error') {
        setState((s) => ({ ...s, failed: data?.code || 'error' }));
      }
    });
    const noResponse = setTimeout(() => {
      if (!readyRef.current) setState((s) => (s.ready ? s : { ...s, noResponse: true }));
    }, NO_RESPONSE_MS);
    return () => { off(); clearTimeout(noResponse); c.destroy(); if (channel.current === c) channel.current = null; };
  }, [active, loadKey, frameRef]);

  // The frame finished loading: say hello (ani.pm only sends events after it), and again until it answers.
  const helloTimer = useRef(null);
  const connect = useCallback(() => {
    clearInterval(helloTimer.current);
    const hello = () => channel.current?.send('hello').then((result) => {
      clearInterval(helloTimer.current);
      const st = result?.state || {};
      if (st.status === 'ready') readyRef.current = true;
      setState((s) => ({
        ...s, connected: true, ready: s.ready || st.status === 'ready', noResponse: false,
        currentTime: Number(st.currentTime) || s.currentTime, duration: Number(st.duration) || s.duration,
        paused: typeof st.paused === 'boolean' ? st.paused : s.paused,
        lang: st.lang === 'dub' ? 'dub' : st.lang === 'sub' ? 'sub' : s.lang,
        autoplayBlocked: s.autoplayBlocked || !!st.awaitingPress,
      }));
    }).catch(() => {});
    hello();
    const started = Date.now();
    helloTimer.current = setInterval(() => {
      if (readyRef.current || Date.now() - started > NO_RESPONSE_MS) clearInterval(helloTimer.current);
      else hello();
    }, HELLO_EVERY_MS);
  }, []);
  useEffect(() => () => clearInterval(helloTimer.current), [loadKey]);

  // Commands wait for ready (ani.pm's rule); before it they are dropped and the room loop retries.
  const send = useCallback((cmd, args) => {
    if (!readyRef.current || !channel.current) return Promise.resolve(null);
    sentAt.current[cmd] = Date.now();
    return channel.current.send(cmd, args).catch(() => null);
  }, []);
  const play = useCallback(() => { setState((s) => ({ ...s, paused: false })); send('play'); }, [send]);
  const pause = useCallback(() => { setState((s) => ({ ...s, paused: true })); send('pause'); }, [send]);
  const seek = useCallback((time) => {
    const t = Math.max(0, Number(time) || 0);
    lastTick.current = null;
    setState((s) => ({ ...s, currentTime: t, ended: false }));
    send('seek', { time: t });
  }, [send]);
  const setLanguage = useCallback((next) => { setState((s) => ({ ...s, lang: next })); send('setLanguage', { lang: next }); }, [send]);
  const toggle = useCallback(() => (state.paused ? play() : pause()), [state.paused, play, pause]);

  const isFresh = state.key === loadKey;
  return {
    ...state,
    ready: isFresh && state.ready,
    ended: isFresh && state.ended,
    playing: isFresh && state.ready && !state.paused,
    connect, send, play, pause, toggle, seek, setLanguage,
  };
};
