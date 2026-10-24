"use client";

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import startupSound from "../assets/startup-sound.mp3";
import "./Loadingscreen.css";

const STARTUP_SOUND_VOLUME = 0.4;
// How much shorter the middle letters are than the ends (Netflix's arched wordmark).
const ARCH = 0.13;

export default function Loadingscreen({
  minDuration = 3400,
  onComplete,
  logoText = "MovieHub",
}) {
  const [phase, setPhase] = useState("idle");
  const overlayRef = useRef(null);
  const firedRef = useRef(false);
  const soundTriedRef = useRef(false);
  const soundStateRef = useRef("idle");
  const audioRef = useRef(null);
  const logoRef = useRef(null);
  const markRef = useRef(null);

  // The swoop starts with the M centered on screen: measure how far right of its resting place
  // that is (half the wordmark minus half the M). Again once Bebas Neue has loaded, since the
  // fallback font is a different width.
  useLayoutEffect(() => {
    const measure = () => {
      const logo = logoRef.current;
      const mark = markRef.current;
      if (!logo || !mark || !overlayRef.current) return;
      overlayRef.current.style.setProperty("--mh-dx", `${(logo.offsetWidth - mark.offsetWidth) / 2}px`);
    };
    measure();
    document.fonts?.ready.then(measure);
  }, []);

  const triggerFade = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    setPhase("fading");
  }, []);

  const tryPlayStartupSound = useCallback(() => {
    if (soundStateRef.current === "playing" || soundStateRef.current === "done") return;
    soundStateRef.current = "playing";
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    try {
      const audio = new Audio(startupSound);
      audio.volume = STARTUP_SOUND_VOLUME;
      audio.preload = "auto";
      audioRef.current = audio;
      const playing = audio.play();
      if (playing && typeof playing.catch === "function") {
        playing.then(
          () => { soundStateRef.current = "done"; },
          () => { soundStateRef.current = "failed"; }
        );
      } else {
        soundStateRef.current = "done";
      }
    } catch {
      soundStateRef.current = "failed";
    }
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (!soundTriedRef.current) {
      soundTriedRef.current = true;
      tryPlayStartupSound();
    }

    const resumeOnGesture = () => tryPlayStartupSound();
    window.addEventListener("pointerdown", resumeOnGesture, { once: true });
    window.addEventListener("keydown", resumeOnGesture, { once: true });

    const raf = requestAnimationFrame(() => setPhase("animating"));
    const t = setTimeout(triggerFade, minDuration);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      window.removeEventListener("pointerdown", resumeOnGesture);
      window.removeEventListener("keydown", resumeOnGesture);
      document.body.style.overflow = prev;
    };
  }, [minDuration, triggerFade, tryPlayStartupSound]);

  const handleTransitionEnd = useCallback(
    (e) => {
      if (e.target !== overlayRef.current) return;
      if (e.propertyName !== "opacity") return;
      if (phase !== "fading") return;
      setPhase("gone");
      document.body.style.overflow = "";
      onComplete?.();
    },
    [phase, onComplete]
  );

  if (phase === "gone") return null;

  return (
    <div
      ref={overlayRef}
      className={`mh-loader-container ${phase === "animating" || phase === "fading" ? "is-animating" : ""} ${phase === "fading" ? "mh-fade-out" : ""}`}
      onTransitionEnd={handleTransitionEnd}
      role="img"
      aria-label={logoText}
    >
      {/* Ribbon M leading the wordmark (see Loadingscreen.css for the timeline). */}
      <div ref={logoRef} className="mh-logo" aria-hidden="true">
        <div ref={markRef} className="mh-mark">
          <span className="mh-stroke mh-leg-l"><i /></span>
          <span className="mh-stroke mh-leg-r"><i /></span>
          <span className="mh-stroke mh-diag-l"><i /></span>
          <span className="mh-stroke mh-diag-r"><i /></span>
        </div>
        <div className="mh-rest">
          {logoText.slice(1).toUpperCase().split("").map((letter, idx, rest) => {
            // Position along the whole word, M included: 0 at the M, 1 at the last letter.
            const x = (idx + 1) / rest.length;
            const s = 1 - ARCH * (1 - (2 * x - 1) ** 2);
            return (
              <span key={idx} className="mh-letter" style={{ "--s": s.toFixed(3), "--d": `${idx * 0.04}s` }}>
                {letter}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}