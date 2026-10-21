import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion as Motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { AudioLines, Captions, ListVideo, MonitorSmartphone, Settings, Sparkles, Users } from 'lucide-react';
import Button from './ui/Button';
import { TOUR_EVENT, markTourSeen, seenTour } from '../utils/tour';

// First visit tour (spec 0007). Replaces the old welcome popup: the welcome text is step 1, then it
// spotlights the real UI one element at a time. Targets are marked with data-tour="<id>"; the first
// VISIBLE one wins, so desktop and phone each get their own (the top nav or the bottom tab bar).
// A step whose target is not on screen shows as a centered card.
const START_DELAY_MS = 1500; // let the home page and its rows settle first
const PAD = 8; // space between the spotlight ring and its target
const GAP = 14; // space between the spotlight and the card
const GUTTER = 16;

const PLAYER_TIPS = [
  { icon: Settings, text: 'Servers: if a video does not start, pick another server. We also switch for you.' },
  { icon: Captions, text: 'Subtitles: pick a language, then change size, color and timing.' },
  { icon: AudioLines, text: 'Audio: some titles have Hindi and other dubs. Find them in Settings, Audio.' },
  { icon: Users, text: 'Watch Together: watch in sync with friends from a shared link, and chat.' },
  { icon: ListVideo, text: 'Episodes: jump to any season and episode of a show.' },
];

const stepsFor = (user) => [
  {
    icon: MonitorSmartphone,
    title: 'Welcome to MovieHub',
    body: 'Glad you are here. MovieHub works on mobile, tablet and desktop. Take a quick tour of what is where, or skip it and start exploring.',
  },
  { target: 'browse', title: 'Browse', body: 'Movies, TV Shows and Categories live here: genres, Bollywood, Bangla, anime, regional collections and more.' },
  { target: 'search', title: 'Search', body: 'Find any movie or show by name.' },
  { target: 'mylist', title: 'My List', body: 'Save titles with the + button and find them here on any device you sign in on.' },
  user
    ? { target: 'account', title: 'Your account', body: 'Your My List count and sign out are here.' }
    : { target: 'account', title: 'Sign in', body: 'Sign in with Google or email to keep My List, Continue Watching and Watch Together.' },
  { target: 'hero', title: 'Start watching', body: 'Play starts the featured title right away. More Info shows the cast, trailer, seasons and reviews.' },
  { target: 'card', title: 'Title cards', body: 'Open any poster for its details. On a computer, rest the pointer on it for a quick preview.' },
  { target: 'ai', icon: Sparkles, title: 'Ask AI', body: 'Not sure what to watch? Describe a mood and MovieHub AI picks titles for you.' },
  { title: 'Inside the player', tips: PLAYER_TIPS },
  { title: 'You are all set', body: 'Enjoy the show. You can replay this tour any time from the About page.' },
];

const findTarget = (id) => {
  if (!id) return null;
  return [...document.querySelectorAll(`[data-tour="${id}"]`)].find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  }) || null;
};

const sameRect = (a, b) => a && b && ['top', 'left', 'width', 'height'].every((k) => Math.abs(a[k] - b[k]) < 0.5);

const Tour = ({ isAppReady, user }) => {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [step, setStep] = useState(null); // index into steps, null when closed
  const [firstVisit, setFirstVisit] = useState(() => !seenTour());
  const [replay, setReplay] = useState(false);
  // The spotlight box, tagged with the step it belongs to (a step with no target has none).
  const [spot, setSpot] = useState({ step: null, rect: null });
  const [cardSize, setCardSize] = useState({ w: 360, h: 220 });
  const steps = stepsFor(user);
  const current = step === null ? null : steps[step];
  const target = current?.target;
  const last = step === steps.length - 1;
  const rect = spot.step === step ? spot.rect : null;

  // First visit: once the startup screen is gone. Replay: the About page's button. Either way it
  // starts on the home page, where every target lives.
  const wanted = replay || (isAppReady && firstVisit);
  useEffect(() => {
    const onStart = () => { setReplay(true); navigate('/'); };
    window.addEventListener(TOUR_EVENT, onStart);
    return () => window.removeEventListener(TOUR_EVENT, onStart);
  }, [navigate]);
  useEffect(() => {
    if (!wanted || step !== null || pathname !== '/') return undefined;
    const t = setTimeout(() => { setReplay(false); setFirstVisit(false); setStep(0); }, START_DELAY_MS);
    return () => clearTimeout(t);
  }, [wanted, step, pathname]);

  const close = useCallback((how) => {
    markTourSeen(how);
    setStep(null);
  }, []);
  const next = useCallback(() => (last ? close('done') : setStep((s) => s + 1)), [last, close]);
  const back = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

  // Follow the target while the step is open (page scroll, resize, rows animating in).
  useEffect(() => {
    const el = findTarget(target);
    if (step === null || !el) return undefined;
    const r0 = el.getBoundingClientRect();
    if (r0.top < 72 || r0.bottom > window.innerHeight - 80) el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    let raf = 0;
    let shown = null;
    const tick = () => {
      const r = el.getBoundingClientRect();
      const box = { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
      if (!sameRect(box, shown)) { shown = box; setSpot({ step, rect: box }); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step, target, reduce]);

  // Each step's card: measured (to place it beside the spotlight) and focused on its main button.
  const cardRef = useRef(null);
  const observer = useRef(null);
  const attachCard = useCallback((node) => {
    observer.current?.disconnect();
    cardRef.current = node;
    if (!node) return;
    const measure = () => setCardSize((s) => (s.w === node.offsetWidth && s.h === node.offsetHeight ? s : { w: node.offsetWidth, h: node.offsetHeight }));
    measure();
    observer.current = new ResizeObserver(measure);
    observer.current.observe(node);
    node.querySelector('[data-tour-next]')?.focus({ preventScroll: true });
  }, []);
  useEffect(() => () => observer.current?.disconnect(), []);

  // Keyboard: Esc skips, arrows move, Tab stays in the card.
  useEffect(() => {
    if (step === null) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close('skipped'); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); back(); return; }
      const card = cardRef.current;
      if (e.key === 'Tab' && card) {
        const els = [...card.querySelectorAll('button:not([disabled])')];
        if (!els.length) return;
        const [first, end] = [els[0], els[els.length - 1]];
        if (!card.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); end.focus(); }
        else if (!e.shiftKey && document.activeElement === end) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [step, next, back, close]);

  if (!current) return null;

  // Card below the spotlight when it fits, else above, else centered; kept inside the screen.
  let cardStyle;
  if (rect) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.min(Math.max(GUTTER, rect.left + rect.width / 2 - cardSize.w / 2), vw - cardSize.w - GUTTER);
    const below = rect.top + rect.height + GAP;
    const above = rect.top - GAP - cardSize.h;
    const top = below + cardSize.h <= vh - GUTTER ? below : above >= GUTTER ? above : Math.max(GUTTER, (vh - cardSize.h) / 2);
    cardStyle = { top, left };
  }
  const Icon = current.icon;
  const move = reduce ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 30 };

  return createPortal(
    <div className="fixed inset-0 z-[1100] font-body text-white" role="presentation">
      {/* Dim everything; the spotlight cuts a hole with its huge shadow. Clicks on the page are blocked. */}
      {rect ? (
        <>
          <div className="absolute inset-0" aria-hidden="true" />
          <Motion.div
            aria-hidden="true"
            className="pointer-events-none absolute rounded-2xl ring-2 ring-accent shadow-[0_0_0_9999px_rgb(0_0_0/0.72)]"
            initial={false}
            animate={rect}
            transition={move}
          />
        </>
      ) : (
        <Motion.div aria-hidden="true" className="absolute inset-0 bg-black/75 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduce ? 0 : 0.2 }} />
      )}

      <div className={rect ? '' : 'absolute inset-0 flex items-center justify-center p-4'}>
        <AnimatePresence mode="wait" initial={false}>
          <Motion.div
            key={step}
            ref={attachCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tour-title"
            aria-describedby="tour-body"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -4, transition: { duration: 0.12 } }}
            transition={{ duration: reduce ? 0 : 0.2, ease: 'easeOut' }}
            style={rect ? cardStyle : undefined}
            className={`${rect ? 'absolute' : 'relative'} w-[min(360px,calc(100vw-32px))] rounded-panel border border-line bg-sheet p-5 shadow-card`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Step {step + 1} of {steps.length}</p>
            {Icon && (
              <span className="mt-3 flex h-11 w-11 items-center justify-center rounded-full border border-accent/40 bg-accent/15 text-accent-text">
                <Icon size={22} aria-hidden="true" />
              </span>
            )}
            <h2 id="tour-title" className="mt-3 text-lg font-semibold">{current.title}</h2>
            <div id="tour-body" className="mt-1.5 text-sm leading-6 text-muted">
              {current.body && <p>{current.body}</p>}
              {current.tips && (
                <ul className="mt-1 space-y-2.5">
                  {current.tips.map((tip) => (
                    <li key={tip.text} className="flex gap-3">
                      <tip.icon size={18} className="mt-0.5 shrink-0 text-accent-text" aria-hidden="true" />
                      <span>{tip.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-4 flex gap-1" aria-hidden="true">
              {steps.map((s, i) => <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-accent' : 'bg-white/15'}`} />)}
            </div>

            <div className="mt-4 flex items-center gap-2">
              {!last && (
                <button type="button" onClick={() => close('skipped')} className="mr-auto rounded-full px-2 py-2 text-sm font-medium text-muted hover:text-white">
                  Skip tour
                </button>
              )}
              <Button variant="outline" size="sm" onClick={back} disabled={step === 0} className={last ? 'mr-auto' : ''}>Back</Button>
              <Button size="sm" onClick={next} data-tour-next>{step === 0 ? 'Take the tour' : last ? 'Start exploring' : 'Next'}</Button>
            </div>
          </Motion.div>
        </AnimatePresence>
      </div>
    </div>,
    document.body
  );
};

export default Tour;
