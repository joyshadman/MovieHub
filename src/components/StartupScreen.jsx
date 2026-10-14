import { useCallback, useEffect, useRef, useState } from 'react';
import './StartupScreen.css';

/**
 * Boot overlay shown once per browser tab session.
 *
 * Dismissal is driven by real readiness, not a fixed delay: it waits for
 * webfonts to settle plus two animation frames for a paint, floored by
 * `minDuration` so the brand beat registers at all, and capped by
 * `maxDuration` so a readiness signal that never fires can never trap the
 * user behind an animation.
 *
 * It renders *over* an already-mounted app, so it costs no layout shift and
 * the fade reveals already-finished content.
 */
const StartupScreen = ({
  logoText = 'MovieHub',
  tagline = 'Stream Everything',
  loadingLabel = 'Loading',
  minDuration = 700,
  maxDuration = 2600,
  onComplete,
}) => {
  const [phase, setPhase] = useState('enter');
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(false);

  const overlayRef = useRef(null);
  const doneRef = useRef(false);

  // Match the project's reduced-motion convention (see Home.jsx): honour the
  // OS setting, and read it once here rather than per frame.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Ready = fonts settled + the browser has actually painted twice. This is
  // the shortest honest signal that "the app is ready", and it deliberately
  // never waits on the network, so a slow TMDB response cannot lengthen boot.
  useEffect(() => {
    let cancelled = false;
    let raf2 = 0;
    const fonts = document.fonts?.ready ?? Promise.resolve();

    fonts.then(() => {
      if (cancelled) return;
      requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          if (!cancelled) setReady(true);
        });
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf2);
    };
  }, []);

  // Release when genuinely ready, or at the hard cap — whichever comes first.
  useEffect(() => {
    if (phase !== 'enter') return;

    let floorTimer = 0;
    let ceilTimer = 0;
    let exitTimer = 0;

    const exit = () => {
      clearTimeout(floorTimer);
      clearTimeout(ceilTimer);
      exitTimer = setTimeout(() => setPhase('exit'), 0);
    };

    // Floor: never flash the brand for a single frame.
    floorTimer = setTimeout(exit, minDuration);
    // Ceil: a readiness signal that never fires must not trap the user.
    ceilTimer = setTimeout(exit, maxDuration);
    // Real readiness — cancel both guards and go.
    if (ready) {
      clearTimeout(floorTimer);
      floorTimer = setTimeout(exit, 0);
    }

    return () => {
      clearTimeout(floorTimer);
      clearTimeout(ceilTimer);
      clearTimeout(exitTimer);
    };
  }, [phase, ready, minDuration, maxDuration]);

  // Hold body scroll for the short window between "app is ready" and
  // "overlay is gone", then restore whatever was there before, untouched.
  useEffect(() => {
    if (phase === 'enter') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [phase]);

  const handleTransitionEnd = useCallback(
    (e) => {
      if (e.target !== overlayRef.current) return;
      if (e.propertyName !== 'opacity') return;
      if (doneRef.current) return;
      doneRef.current = true;
      setPhase('done');
      onComplete?.();
    },
    [onComplete]
  );

  if (phase === 'done') return null;

  return (
    <div
      ref={overlayRef}
      className={`mh-startup ${phase === 'exit' ? 'mh-startup--exit' : ''} ${
        reduced ? 'mh-startup--reduced' : ''
      }`}
      style={{ '--mh-startup-floor': `${minDuration}ms` }}
      onTransitionEnd={handleTransitionEnd}
      // Announced once, politely. The wordmark is decorative, so it is hidden
      // from assistive tech and the label below carries the meaning.
      role="status"
      aria-live="polite"
      aria-label={`${loadingLabel} ${logoText}`}
    >
      <div className="mh-startup__inner" aria-hidden="true">
        <div className="mh-startup__mark">
          <span className="mh-startup__mark-fill" />
        </div>

        <div className="mh-startup__word">
          {logoText.split('').map((letter, i) => (
            <span className="mh-startup__letter" key={`${letter}-${i}`} style={{ '--i': i }}>
              {letter}
            </span>
          ))}
          <span className="mh-startup__word-glow" />
        </div>

        <p className="mh-startup__tagline">{tagline}</p>

        <div className="mh-startup__track">
          <span className="mh-startup__bar" />
        </div>

        <p className="mh-startup__label">{loadingLabel}</p>
      </div>
    </div>
  );
};

export default StartupScreen;
