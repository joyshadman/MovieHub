import React, { useEffect, useRef, useState } from 'react';
import { motion as Motion, useReducedMotion } from 'framer-motion';
import { Search, X, RotateCcw } from 'lucide-react';
import { aniPm } from '../../services/aniPm';
import { searchForTitle } from '../../services/animeMatch';
import { Spinner } from '../ui/feedback';

const MAX_CANDIDATES = 5;

// One pickable show: AniList media or an ani.pm title, in one shape.
const fromAniList = (m) => ({
  id: m.id,
  title: m.title?.english || m.title?.romaji || m.title?.native || `AniList ${m.id}`,
  poster: m.coverImage?.large || null,
  year: m.startDate?.year || null,
  format: m.format || null,
  media: m,
});
const fromAniPm = (t) => ({
  id: t.anilistId,
  title: t.title,
  poster: t.poster || null,
  year: t.year || null,
  format: t.format || null,
  media: { id: t.anilistId, episodes: t.episodes?.total ?? null, startDate: t.year ? { year: t.year } : null },
});

// Find on ani.pm (spec 0009, AC-4): the top AniList results for this title that ani.pm can play,
// plus a search box over ani.pm's own titles. The pick plays and is remembered in this browser for
// this TMDB title and season; Reset drops it.
const FindOnAniPm = ({ title, originalTitle, seasonLabel, onPick, onReset, canReset, onClose, position = 'top-20 right-3 sm:right-6', style }) => {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const [attempt, setAttempt] = useState(0);
  const lookupKey = `${title}|${originalTitle || ''}|${attempt}`;
  const [found, setFound] = useState({ key: null, status: 'loading', list: [] });
  const candidates = found.key === lookupKey ? found : { status: 'loading', list: [] };
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null); // { q, status, list } after a search

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const found = await searchForTitle({ title, originalTitle });
      const playable = new Set((await aniPm.lookup(found.map((m) => m.id))).filter((x) => x.available).map((x) => x.anilistId));
      return found.filter((m) => playable.has(m.id)).slice(0, MAX_CANDIDATES).map(fromAniList);
    })().then(
      (list) => { if (!cancelled) setFound({ key: lookupKey, status: 'ready', list }); },
      () => { if (!cancelled) setFound({ key: lookupKey, status: 'error', list: [] }); },
    );
    return () => { cancelled = true; };
  }, [lookupKey, title, originalTitle]);

  const runSearch = (e) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) { setResults(null); return; }
    setResults({ q: term, status: 'loading', list: [] });
    aniPm.search(term).then(
      (r) => setResults((cur) => (cur?.q === term ? { q: term, status: 'ready', list: r.items.slice(0, 10).map(fromAniPm) } : cur)),
      () => setResults((cur) => (cur?.q === term ? { q: term, status: 'error', list: [] } : cur)),
    );
  };

  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target) && !e.target.closest?.('[data-settings-toggle]')) onCloseRef.current?.(); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current?.(); } };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey, true);
    ref.current?.querySelector('h2')?.focus({ preventScroll: true });
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey, true); };
  }, []);

  const shown = results || { status: candidates.status, list: candidates.list };
  return (
    <Motion.div
      ref={ref}
      role="dialog"
      aria-labelledby="find-anipm-title"
      initial={reduce ? false : { opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      style={style}
      className={`absolute ${position} z-40 flex w-[min(340px,calc(100vw-24px))] max-h-[min(520px,calc(100%-100px))] flex-col overflow-hidden rounded-panel border border-white/10 bg-[#111116]/95 font-body text-white shadow-[0_24px_60px_-12px_rgb(0_0_0/0.9)] backdrop-blur-xl`}
    >
      <div className="flex items-start justify-between gap-2 border-b border-white/10 px-4 pt-3 pb-2.5">
        <div className="min-w-0">
          <h2 id="find-anipm-title" tabIndex={-1} className="text-sm font-semibold outline-none">Find on ani.pm</h2>
          <p className="mt-0.5 truncate text-[11px] text-white/50">Pick the show that matches {title}{seasonLabel ? `, ${seasonLabel}` : ''}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="-mr-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"><X size={18} aria-hidden="true" /></button>
      </div>

      <form onSubmit={runSearch} className="flex items-center gap-2 px-3 pt-3" role="search">
        <label htmlFor="find-anipm-q" className="sr-only">Search ani.pm</label>
        <input
          id="find-anipm-q"
          type="search"
          value={q}
          onChange={(e) => { setQ(e.target.value); if (!e.target.value.trim()) setResults(null); }}
          placeholder="Search ani.pm"
          className="h-9 min-w-0 flex-1 rounded-full bg-white/[0.07] px-3.5 text-sm text-white placeholder:text-white/40 outline-none focus-visible:ring-2 focus-visible:ring-accent-text"
        />
        <button type="submit" aria-label="Search" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/15"><Search size={16} aria-hidden="true" /></button>
      </form>

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5 hide-scrollbar" aria-live="polite">
        {results && <p className="px-2.5 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">Results for “{results.q}”</p>}
        {shown.status === 'loading' && <div className="flex justify-center py-8"><Spinner size={28} /></div>}
        {shown.status === 'error' && (
          <div className="px-3 py-6 text-center text-sm text-white/60">
            <p>Could not reach ani.pm.</p>
            <button type="button" onClick={() => (results ? runSearch({ preventDefault() {} }) : setAttempt((a) => a + 1))} className="mt-3 inline-flex h-9 items-center rounded-full border border-white/20 px-4 text-xs font-semibold text-white hover:bg-white/10">Try again</button>
          </div>
        )}
        {shown.status === 'ready' && shown.list.length === 0 && <p className="px-3 py-6 text-center text-sm text-white/60">Nothing found on ani.pm</p>}
        {shown.status === 'ready' && shown.list.length > 0 && (
          <ul className="space-y-0.5">
            {shown.list.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => onPick(c.media)} className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-text">
                  <span className="h-14 w-10 shrink-0 overflow-hidden rounded-md bg-white/[0.06]">
                    {c.poster && <img src={c.poster} alt="" loading="lazy" className="h-full w-full object-cover" />}
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-sm font-semibold leading-snug">{c.title}</span>
                    <span className="mt-0.5 block text-xs text-white/50">{[c.year, c.format?.replace('_', ' ')].filter(Boolean).join(' · ')}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canReset && (
        <div className="border-t border-white/10 p-1.5">
          <button type="button" onClick={onReset} className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold text-white/80 hover:bg-white/[0.06] hover:text-white">
            <RotateCcw size={14} aria-hidden="true" /> Reset <span className="font-normal text-white/50">· back to the automatic match</span>
          </button>
        </div>
      )}
    </Motion.div>
  );
};

export default FindOnAniPm;
