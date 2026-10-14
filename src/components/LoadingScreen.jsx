"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import startupSound from "../assets/startup-sound.mp3";
import "./Loadingscreen.css";

const STARTUP_SOUND_VOLUME = 0.4;

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
      className={`mh-loader-container ${phase === "fading" ? "mh-fade-out" : ""}`}
      onTransitionEnd={handleTransitionEnd}
    >
      <div className="loader-wrapper">
        {logoText.split("").map((letter, idx) => (
          <span key={idx} className="loader-letter">
            {letter}
          </span>
        ))}
        <div className="loader"></div>
      </div>
    </div>
  );
}