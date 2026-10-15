import React, { useEffect, useRef } from 'react';
import { motion as Motion, useReducedMotion } from 'framer-motion';
import { X, ChevronDown, Play } from 'lucide-react';

// Netflix style episode drawer: season picker and episode list with stills. Slides in from the
// right on desktop and covers the screen on phones.
const EpisodesPanel = ({ seasons, season, episodes, episode, onSeason, onEpisode, onClose, title }) => {
  const reduce = useReducedMotion();
  const ref = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('keydown', onKey, true);
    ref.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'center' });
    ref.current?.querySelector('select')?.focus();
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <>
      <Motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <Motion.aside
        ref={ref}
        role="dialog"
        aria-label={`Episodes of ${title}`}
        initial={reduce ? { opacity: 0 } : { x: '100%' }}
        animate={reduce ? { opacity: 1 } : { x: 0 }}
        exit={reduce ? { opacity: 0 } : { x: '100%' }}
        transition={{ type: 'tween', duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-y-0 right-0 z-50 flex w-full sm:w-[420px] flex-col border-l border-white/10 bg-[#0d0d12]/95 backdrop-blur-xl font-body"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
          <div className="relative">
            <label htmlFor="player-season" className="sr-only">Season</label>
            <select
              id="player-season"
              value={season}
              onChange={(e) => onSeason(Number(e.target.value))}
              className="h-10 appearance-none rounded-control border border-white/15 bg-white/[0.06] pl-4 pr-10 text-sm font-semibold text-white hover:bg-white/10"
            >
              {seasons.map((s) => <option key={s.id} value={s.season_number} className="bg-sheet">Season {s.season_number}</option>)}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/60" aria-hidden="true" />
          </div>
          <button type="button" onClick={onClose} aria-label="Close episodes" className="flex h-10 w-10 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <ul className="flex-1 overflow-y-auto p-3 space-y-2 hide-scrollbar">
          {episodes.length === 0 && (
            <li className="space-y-2" aria-busy="true">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 rounded-card bg-white/[0.05] motion-safe:animate-pulse" />)}
            </li>
          )}
          {episodes.map((ep) => {
            const active = ep.episode_number === episode;
            return (
              <li key={ep.id}>
                <button
                  type="button"
                  aria-current={active ? 'true' : undefined}
                  onClick={() => onEpisode(ep.episode_number)}
                  className={`group flex w-full gap-3 rounded-card p-2 text-left motion-safe:transition-colors ${active ? 'bg-white/10 ring-1 ring-accent/60' : 'hover:bg-white/[0.06]'}`}
                >
                  <span className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-white/[0.06]">
                    {ep.still_path && <img src={`https://image.tmdb.org/t/p/w300${ep.still_path}`} alt="" loading="lazy" className="h-full w-full object-cover motion-safe:transition-transform duration-500 group-hover:scale-105" />}
                    <span className={`absolute inset-0 flex items-center justify-center bg-black/40 motion-safe:transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      <Play size={18} className="fill-white text-white" aria-hidden="true" />
                    </span>
                    {active && <span className="absolute inset-x-0 bottom-0 h-1 bg-accent" aria-hidden="true" />}
                  </span>
                  <span className="min-w-0 py-0.5">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-white/50">
                      Episode {ep.episode_number}{ep.runtime ? ` · ${ep.runtime}m` : ''}{active ? ' · Now playing' : ''}
                    </span>
                    <span className="block truncate text-sm font-semibold text-white">{ep.name || `Episode ${ep.episode_number}`}</span>
                    {ep.overview && <span className="mt-0.5 block text-xs leading-5 text-white/55 line-clamp-2">{ep.overview}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Motion.aside>
    </>
  );
};

export default EpisodesPanel;
