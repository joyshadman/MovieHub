import React, { memo, useEffect, useRef, useState } from 'react';
import { motion as Motion, useReducedMotion } from 'framer-motion';
import { X, Play, CalendarClock, RefreshCcw } from 'lucide-react';
import { movieApi } from '../../services/movieApi';
import { loadProgress } from '../../services/frameX';

const fmtDate = (iso) => {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};
// Center a child inside ITS OWN scroll box. Never scrollIntoView here: it also scrolls every
// ancestor, including the player stage (overflow hidden but still scrollable by code), which shifted
// the whole player sideways on phones.
const centerIn = (box, el, axis) => {
  if (!box || !el) return;
  if (axis === 'x') box.scrollLeft = el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2;
  else box.scrollTop = el.offsetTop - (box.clientHeight - el.offsetHeight) / 2;
};
const isFuture = (iso) => !!iso && new Date(`${iso}T00:00:00`).getTime() > Date.now();

// Small animated bars marking the episode that is playing.
const NowPlaying = () => (
  <span className="inline-flex h-3 items-end gap-[2px]" aria-hidden="true">
    {[0, 1, 2].map((i) => (
      <span key={i} className="w-[3px] origin-bottom rounded-sm bg-accent-text motion-safe:animate-[ui-eq_0.9s_ease-in-out_infinite]" style={{ height: `${[60, 100, 40][i]}%`, animationDelay: `${i * 0.15}s` }} />
    ))}
  </span>
);

// Netflix style episode chooser.
// - Browsing a season here does NOT change what is playing; only picking an episode does.
// - It scrolls to the playing episode and moves focus once, when it opens (not on every render:
//   the player re-renders several times a second while a video plays).
// - memo + stable props from Watch keep it from re-rendering with playback updates.
// - variant="inline" (phone layout) is a plain page section under the player: no backdrop, no close
//   button, no focus move, and the list flows with the page instead of scrolling on its own.
const EpisodesPanel = ({ tvId, title, seasons, playingSeason, playingEpisode, onPick, onClose, variant = 'panel' }) => {
  const inline = variant === 'inline';
  const reduce = useReducedMotion();
  const panelRef = useRef(null);
  const listRef = useRef(null);
  const pillsRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const [viewSeason, setViewSeason] = useState(playingSeason);
  // The inline list stays mounted while episodes change (resume from history, next episode), so it
  // follows the playing season; the panel opens fresh each time and does not need this.
  const [followed, setFollowed] = useState(playingSeason);
  if (inline && followed !== playingSeason) {
    setFollowed(playingSeason);
    setViewSeason(playingSeason);
  }
  const [data, setData] = useState({ key: null, episodes: [], error: false });
  const [retry, setRetry] = useState(0);
  const loadKey = `${viewSeason}|${retry}`;
  const loading = data.key !== loadKey;
  const episodes = loading ? [] : data.episodes;

  useEffect(() => {
    let cancelled = false;
    movieApi.getSeason(tvId, viewSeason)
      .then((eps) => { if (!cancelled) setData({ key: loadKey, episodes: eps, error: false }); })
      .catch(() => { if (!cancelled) setData({ key: loadKey, episodes: [], error: true }); });
    return () => { cancelled = true; };
  }, [tvId, viewSeason, loadKey]);

  // Escape closes; focus moves into the panel once (without scrolling anything).
  useEffect(() => {
    if (inline) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current?.(); } };
    document.addEventListener('keydown', onKey, true);
    panelRef.current?.focus({ preventScroll: true });
    centerIn(pillsRef.current, pillsRef.current?.querySelector('[aria-pressed="true"]'), 'x');
    return () => document.removeEventListener('keydown', onKey, true);
  }, [inline]);
  // Inline: keep the season shown centered in the pill row (it follows the playing season).
  useEffect(() => {
    if (inline) centerIn(pillsRef.current, pillsRef.current?.querySelector('[aria-pressed="true"]'), 'x');
  }, [inline, viewSeason]);

  // Position the list once per season shown: the playing season centers the playing episode,
  // any other season starts at its top.
  const positioned = useRef(null);
  useEffect(() => {
    if (inline || loading || positioned.current === viewSeason || !listRef.current) return;
    positioned.current = viewSeason;
    const current = viewSeason === playingSeason ? listRef.current.querySelector('[aria-current="true"]') : null;
    if (current) centerIn(listRef.current, current.closest('li'), 'y');
    else listRef.current.scrollTop = 0;
  }, [inline, loading, viewSeason, playingSeason]);

  const seasonInfo = seasons.find((s) => s.season_number === viewSeason);
  const seasonLine = (
    <>
      Season {viewSeason}
      {seasonInfo?.episode_count ? ` · ${seasonInfo.episode_count} episodes` : ''}
      {seasonInfo?.air_date ? ` · ${seasonInfo.air_date.slice(0, 4)}` : ''}
    </>
  );

  const renderList = (className) => (
    <ul ref={listRef} className={className} aria-busy={loading || undefined}>
      {loading && [0, 1, 2, 3, 4].map((i) => (
        <li key={i} className="flex gap-3 p-2">
          <span className="aspect-video w-36 shrink-0 rounded-lg bg-white/[0.06] motion-safe:animate-pulse" />
          <span className="flex-1 space-y-2 py-1">
            <span className="block h-3 w-20 rounded bg-white/[0.06] motion-safe:animate-pulse" />
            <span className="block h-4 w-3/4 rounded bg-white/[0.06] motion-safe:animate-pulse" />
            <span className="block h-3 w-full rounded bg-white/[0.06] motion-safe:animate-pulse" />
          </span>
        </li>
      ))}

      {!loading && data.error && (
        <li className="px-4 py-12 text-center">
          <p className="text-sm text-white/70">Episodes did not load.</p>
          <button type="button" onClick={() => setRetry((r) => r + 1)} className="mt-3 inline-flex h-9 items-center gap-2 rounded-full border border-white/20 px-4 text-sm hover:bg-white/10">
            <RefreshCcw size={14} aria-hidden="true" /> Try again
          </button>
        </li>
      )}

      {!loading && !data.error && episodes.length === 0 && (
        <li className="px-4 py-12 text-center text-sm text-white/60">No episodes listed for this season yet.</li>
      )}

      {episodes.map((ep) => {
        const playing = viewSeason === playingSeason && ep.episode_number === playingEpisode;
        const upcoming = isFuture(ep.air_date);
        const saved = !playing && !upcoming ? loadProgress({ id: tvId, isTV: true, season: viewSeason, episode: ep.episode_number }) : null;
        const pct = saved?.duration ? Math.min(100, Math.round((saved.t / saved.duration) * 100)) : 0;
        return (
          <li key={ep.id || ep.episode_number}>
            <button
              type="button"
              aria-current={playing ? 'true' : undefined}
              disabled={upcoming}
              onClick={() => (playing ? onClose?.() : onPick(viewSeason, ep.episode_number))}
              className={`group flex w-full gap-3 rounded-card p-2 text-left motion-safe:transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${playing ? 'bg-white/[0.09] ring-1 ring-accent/50' : 'hover:bg-white/[0.06]'}`}
            >
              <span className={`relative aspect-video shrink-0 overflow-hidden rounded-lg bg-white/[0.06] ${inline ? 'w-32 self-start' : 'w-36'}`}>
                {ep.still_path && (
                  <img src={`https://image.tmdb.org/t/p/w300${ep.still_path}`} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover motion-safe:transition-transform duration-500 group-hover:scale-105" />
                )}
                <span className="absolute left-1.5 top-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-bold">E{ep.episode_number}</span>
                {!upcoming && (
                  <span className={`absolute inset-0 flex items-center justify-center bg-black/40 motion-safe:transition-opacity ${playing ? 'opacity-0' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'}`}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90"><Play size={15} className="ml-0.5 fill-black text-black" aria-hidden="true" /></span>
                  </span>
                )}
                {pct > 0 && <span className="absolute inset-x-0 bottom-0 h-1 bg-white/25"><span className="block h-full bg-accent" style={{ width: `${pct}%` }} /></span>}
                {playing && <span className="absolute inset-x-0 bottom-0 h-1 bg-accent" />}
              </span>
              <span className="min-w-0 flex-1 py-0.5">
                <span className="flex items-center gap-2 text-[11px] font-medium text-white/50">
                  {playing ? <><NowPlaying /><span className="font-semibold uppercase tracking-[0.08em] text-accent-text">Now playing</span></> : null}
                  {upcoming
                    ? <span className="inline-flex items-center gap-1"><CalendarClock size={12} aria-hidden="true" /> Coming {fmtDate(ep.air_date)}</span>
                    : <span>{[ep.runtime ? `${ep.runtime}m` : null, fmtDate(ep.air_date)].filter(Boolean).join(' · ')}</span>}
                </span>
                <span className={`mt-0.5 block truncate text-sm font-semibold ${playing ? 'text-white' : 'text-white/90'}`}>{ep.name || `Episode ${ep.episode_number}`}</span>
                {ep.overview && <span className={`mt-0.5 text-xs leading-5 text-white/50 line-clamp-2 ${inline ? '' : 'block'}`}>{ep.overview}</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  if (inline) {
    return (
      <section aria-labelledby="episodes-heading" className="font-body">
        <div className="flex items-end justify-between gap-3 px-4">
          <h2 id="episodes-heading" className="text-lg font-semibold">Episodes</h2>
          <p className="pb-0.5 text-xs text-white/50">{seasonLine}</p>
        </div>
        {seasons.length > 1 && (
          <div ref={pillsRef} role="group" aria-label="Seasons" className="mt-3 flex gap-2 overflow-x-auto hide-scrollbar px-4 overscroll-x-contain">
            {seasons.map((s) => {
              const active = s.season_number === viewSeason;
              return (
                <button
                  key={s.id || s.season_number}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setViewSeason(s.season_number)}
                  className={`relative h-9 shrink-0 rounded-full px-4 text-sm font-semibold motion-safe:transition-colors ${active ? 'bg-white text-black' : 'bg-white/[0.07] text-white/75 active:bg-white/15'}`}
                >
                  Season {s.season_number}
                  {s.season_number === playingSeason && !active && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" aria-label="playing" />}
                </button>
              );
            })}
          </div>
        )}
        {renderList('mt-2 px-2 space-y-1')}
      </section>
    );
  }

  return (
    <>
      <Motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 z-40 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <Motion.aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-label={`Episodes of ${title}`}
        initial={reduce ? { opacity: 0 } : { x: '100%' }}
        animate={reduce ? { opacity: 1 } : { x: 0 }}
        exit={reduce ? { opacity: 0 } : { x: '100%' }}
        transition={{ type: 'tween', duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-y-0 right-0 z-50 flex w-full @min-[560px]:w-[440px] flex-col border-l border-white/10 bg-[#0c0c11] font-body outline-none shadow-[-30px_0_60px_-20px_rgb(0_0_0/0.8)]"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">Episodes</p>
            <h2 className="mt-0.5 truncate text-lg font-semibold">{title}</h2>
            <p className="text-xs text-white/50">{seasonLine}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close episodes" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white motion-safe:transition-colors">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Season pills */}
        {seasons.length > 1 && (
          <div ref={pillsRef} role="group" aria-label="Seasons" className="relative flex gap-2 overflow-x-auto hide-scrollbar px-5 pb-4 border-b border-white/10 overscroll-x-contain">
            {seasons.map((s) => {
              const active = s.season_number === viewSeason;
              return (
                <button
                  key={s.id || s.season_number}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setViewSeason(s.season_number)}
                  className={`relative h-9 shrink-0 rounded-full px-4 text-sm font-semibold motion-safe:transition-colors ${active ? 'bg-white text-black' : 'bg-white/[0.07] text-white/75 hover:bg-white/15 hover:text-white'}`}
                >
                  Season {s.season_number}
                  {s.season_number === playingSeason && !active && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" aria-label="playing" />}
                </button>
              );
            })}
          </div>
        )}
        {seasons.length <= 1 && <div className="border-b border-white/10" />}

        {/* Episode list */}
        {renderList('relative flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-1.5 hide-scrollbar')}
      </Motion.aside>
    </>
  );
};

export default memo(EpisodesPanel);
