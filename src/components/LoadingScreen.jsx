"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import "./Loadingscreen.css";

export default function Loadingscreen({
  minDuration = 3400,
  onComplete,
  logoText = "MovieHub",
}) {
  const [phase, setPhase] = useState("idle");
  const overlayRef = useRef(null);
  const firedRef = useRef(false);

  const triggerFade = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    setPhase("fading");
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const raf = requestAnimationFrame(() => setPhase("animating"));
    const t = setTimeout(triggerFade, minDuration);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [minDuration, triggerFade]);

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