import { useCallback, useEffect, useRef, useState } from 'react';
import { readFrameXMessage, sendFrameX } from '../../services/frameX';

const ADVANCE_WINDOW_MS = 1500; // time still moving within this window = playing
const READY_TIMEOUT_MS = 15000; // no frameXTV:ready by then = the embed failed to load
const STALL_TIMEOUT_MS = 25000; // ready, but no duration by then = no playable stream on this server
const STUCK_MS = 8000; // asked to play but time frozen this long = treat as paused (autoplay blocked, stopped in frame).
// frameXTV cannot tell buffering from paused, so this is long enough to ride out a slow server.

// Playback state for a frameXTV iframe, driven only by its documented messages.
// frameXTV never says "playing" or "paused", so: playing = currentTime advanced recently;
// buffering = we asked to play but time is not moving; stuck = frozen for STUCK_MS, so we show
// a Play button again instead of spinning forever.
export const useFrameXPlayer = ({ frameRef, active, loadKey, onFail }) => {
  const [state, setState] = useState({ key: loadKey, ready: false, currentTime: 0, duration: 0, ended: false, failed: null });
  const [wantPlay, setWantPlay] = useState(true); // autoplay=1 is in the URL
  const [moving, setMoving] = useState(false);
  const [stuck, setStuck] = useState(false);
  const since = useRef(0);
  const lastAdvance = useRef(0);
  const lastTime = useRef(0);
  const onFailRef = useRef(onFail);
  useEffect(() => { onFailRef.current = onFail; }, [onFail]);

  // New title, episode, server or reload: fresh state (adjusted during render, not in an effect).
  if (state.key !== loadKey) {
    setState({ key: loadKey, ready: false, currentTime: 0, duration: 0, ended: false, failed: null });
    setWantPlay(true);
    setMoving(false);
    setStuck(false);
  }

  useEffect(() => {
    if (!active) return undefined;
    lastAdvance.current = 0;
    lastTime.current = 0;
    since.current = Date.now();
    const onMessage = (e) => {
      const msg = readFrameXMessage(e, frameRef.current?.contentWindow);
      if (!msg) return;
      if (msg.type === 'timeupdate') {
        if (msg.currentTime > lastTime.current + 0.05 || msg.currentTime < lastTime.current - 1) {
          if (msg.currentTime > lastTime.current) lastAdvance.current = Date.now();
        }
        lastTime.current = msg.currentTime;
      }
      setState((s) => {
        if (msg.type === 'ready') return s.ready ? s : { ...s, ready: true };
        if (msg.type === 'ended') return { ...s, ended: true };
        if (msg.type === 'timeupdate') {
          // Once ended, stay ended until a new load or a seek: frameXTV plays the NEXT episode
          // inside its own frame right after, and those updates must not be shown as this one.
          if (s.ended) return s;
          const duration = msg.duration || s.duration;
          // frameXTV only sends 'ended' for some of its servers, so detect the end ourselves too:
          // time reached the end, or it rolled over to a new video (time back near 0 or a new
          // duration) right after being close to the end.
          const atEnd = duration > 0 && msg.currentTime >= duration - 1.5;
          const nearEndBefore = s.duration > 0 && s.currentTime >= s.duration - 20;
          const rolledOver = nearEndBefore && (msg.currentTime < 5 || (msg.duration > 0 && Math.abs(msg.duration - s.duration) > 2));
          if (atEnd || rolledOver) return { ...s, ready: true, ended: true, currentTime: rolledOver ? s.duration : msg.currentTime };
          return { ...s, ready: true, failed: null, currentTime: msg.currentTime, duration };
        }
        return s;
      });
    };
    window.addEventListener('message', onMessage);
    const tick = setInterval(() => {
      const now = Date.now();
      setMoving(now - lastAdvance.current < ADVANCE_WINDOW_MS);
      setStuck(now - Math.max(lastAdvance.current, since.current) > STUCK_MS);
    }, 500);
    return () => { window.removeEventListener('message', onMessage); clearInterval(tick); };
  }, [active, loadKey, frameRef]);

  // Failure watchdogs: the embed never answered, or answered but found no stream.
  useEffect(() => {
    if (!active || state.duration > 0) return undefined;
    const limit = state.ready ? STALL_TIMEOUT_MS : READY_TIMEOUT_MS;
    const reason = state.ready ? 'no-stream' : 'no-response';
    const t = setTimeout(() => {
      setState((s) => (s.duration > 0 ? s : { ...s, failed: reason }));
      onFailRef.current?.(reason);
    }, limit);
    return () => clearTimeout(t);
  }, [active, loadKey, state.ready, state.duration]);

  const send = useCallback((action, payload) => sendFrameX(frameRef.current?.contentWindow, action, payload), [frameRef]);

  // On the render where loadKey changes, state still belongs to the previous video until the reset
  // above lands; never report its "ended" for the new one (it would chain a second countdown).
  const fresh = state.key === loadKey;
  const frozen = fresh && state.duration > 0 && wantPlay && stuck && !moving; // only once a stream exists
  const ended = fresh && (state.ended || (frozen && state.duration > 0 && state.currentTime >= state.duration - 6));
  const playing = moving && wantPlay;
  const paused = !wantPlay || frozen;
  const buffering = active && wantPlay && !moving && !frozen && !ended && !state.failed;

  const play = useCallback(() => { since.current = Date.now(); setStuck(false); setWantPlay(true); send('play'); }, [send]);
  const pause = useCallback(() => { setWantPlay(false); send('pause'); }, [send]);
  const toggle = useCallback(() => (paused ? play() : pause()), [paused, pause, play]);
  const seek = useCallback((time) => {
    const t = Math.max(0, state.duration ? Math.min(time, state.duration - 0.5) : time);
    lastTime.current = t;
    setState((s) => ({ ...s, currentTime: t, ended: false }));
    since.current = Date.now();
    send('seek', { time: t });
  }, [send, state.duration]);
  const seekBy = useCallback((seconds) => seek(state.currentTime + seconds), [seek, state.currentTime]);

  return { ...state, ended, playing, paused, buffering, wantPlay, play, pause, toggle, seek, seekBy, send };
};
