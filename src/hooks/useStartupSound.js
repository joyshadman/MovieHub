import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Startup sound: preference, plus a single non-blocking play attempt during
 * boot.
 *
 * Autoplay policy — degrade, never circumvent:
 *   1. one `play()` attempt, whose rejection is swallowed
 *   2. if the browser blocked it, at most ONE retry bound to the first real
 *      user gesture (the mechanism browsers actually sanction)
 *   3. otherwise permanent give-up
 * There is no polling, no retry loop, and nothing is ever thrown. A silent
 * boot is a completely acceptable outcome, so audio is never load-bearing.
 *
 * The file is deliberately NOT preloaded in index.html: it is only fetched
 * when the preference is on, so muting it costs the user zero bytes and
 * keeps it off the critical path for LCP.
 */

const STORAGE_KEY = 'moviehub:sound';
const SOURCE = '/assets/audio/startup.mp3';
const VOLUME = 0.35;

function readPreference() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    // Storage blocked (private mode, disabled cookies) — default to on and
    // stay silent about it rather than throwing during boot.
    return true;
  }
}

function writePreference(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // Preference stays session-only. Not worth surfacing to the user.
  }
}

export const useStartupSound = () => {
  const [enabled, setEnabled] = useState(readPreference);
  const enabledRef = useRef(enabled);
  const attemptedRef = useRef(false);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // Stable identity, so the boot effect below runs exactly once.
  const play = useCallback(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    const audio = new Audio(SOURCE);
    audio.preload = 'auto';
    audio.volume = VOLUME;

    const result = audio.play();
    if (result && typeof result.catch === 'function') {
      // NotAllowedError = autoplay blocked. Anything else = decode/network.
      // Either way: swallowed, because the boot must not care.
      result.catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!enabledRef.current) return;

    play();

    // StrictMode double-invokes effects in dev; attemptedRef makes that a
    // no-op, so dev and production behave identically (exactly one play).
    const unlock = () => play();
    const opts = { once: true, passive: true, capture: true };
    window.addEventListener('pointerdown', unlock, opts);
    window.addEventListener('keydown', unlock, opts);
    window.addEventListener('touchend', unlock, opts);

    return () => {
      window.removeEventListener('pointerdown', unlock, opts);
      window.removeEventListener('keydown', unlock, opts);
      window.removeEventListener('touchend', unlock, opts);
    };
  }, [play]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      writePreference(next);
      return next;
    });
  }, []);

  return { soundEnabled: enabled, toggleSound: toggle, setSoundEnabled: setEnabled };
};

export default useStartupSound;
