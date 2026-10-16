import React, { memo, useState } from 'react';
import { Star, Plus, Check, RefreshCcw, SkipForward, ChevronDown, Info } from 'lucide-react';
import { useWatchlist } from '../../context/WatchlistContext';
import { fallbackGradient } from '../../utils/fallbackArt';
import EpisodesPanel from './EpisodesPanel';

const fmtRuntime = (min) => (min ? (min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min}m`) : null);

// Pill button for the action strip under the player.
const Action = ({ label, onClick, children, active = false, disabled = false, ...rest }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold motion-safe:transition-colors disabled:opacity-50 ${active ? 'border-white bg-white text-black' : 'border-line bg-raised/70 text-white active:bg-white/15'}`}
    {...rest}
  >
    {children}
  </button>
);

// Phone layout, everything under the inline player: title and meta, an action strip (server,
// reload, next episode, My List), the overview, the episode list, cast and related titles.
// memo + stable props from Watch: it does not re-render with every playback update.
const MobileWatchDetails = ({
  movie, title, isTV, season, episode, episodeInfo, seasons, onPickEpisode,
  serverName, onSettings, onReload, onNext, notice, noticeActionLabel, onNoticeAction, onOpenTitle,
}) => {
  const watchlist = useWatchlist();
  const [more, setMore] = useState(false);
  const saved = watchlist?.isSaved?.(movie.id);
  const year = movie.year || String(movie.release_date || movie.first_air_date || '').slice(0, 4);
  const length = isTV
    ? (movie.seasons ? `${movie.seasons} season${movie.seasons > 1 ? 's' : ''}` : null)
    : fmtRuntime(movie.runtime);
  const rating = Number(movie.rating || movie.vote_average || 0);
  const genres = (movie.genres || []).map((g) => (typeof g === 'string' ? g : g?.name)).filter(Boolean).slice(0, 4);
  const about = (isTV && episodeInfo?.overview) || movie.overview;
  const cast = (movie.cast || []).slice(0, 12);
  const related = (movie.similar || []).filter((m) => m?.id).slice(0, 12);

  return (
    <div className="pb-[calc(env(safe-area-inset-bottom)+48px)] font-body text-white">
      {/* Title and meta */}
      <header className="px-4 pt-4">
        {isTV && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-text">
            Season {season} · Episode {episode}
          </p>
        )}
        <h1 className="mt-1 font-display text-[2.25rem] uppercase leading-[0.95] break-words">{title}</h1>
        {isTV && episodeInfo?.name && <p className="mt-1 text-[15px] font-semibold text-white/90">{episodeInfo.name}</p>}
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
          {rating > 0 && (
            <span className="inline-flex items-center gap-1 font-semibold text-white">
              <Star size={13} className="fill-rating text-rating" aria-hidden="true" />
              {rating.toFixed(1)}
            </span>
          )}
          {[year, length, isTV ? 'Series' : 'Movie'].filter(Boolean).map((t) => (
            <span key={t} className="before:mr-2 before:text-white/30 before:content-['·'] first:before:hidden">{t}</span>
          ))}
        </p>
        {genres.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Genres">
            {genres.map((g) => <li key={g} className="rounded-full bg-white/[0.07] px-2.5 py-1 text-xs text-white/75">{g}</li>)}
          </ul>
        )}
      </header>

      {/* Action strip */}
      <div className="mt-4 flex gap-2 overflow-x-auto px-4 pb-1 hide-scrollbar" role="group" aria-label="Player actions">
        <Action label={`Server: ${serverName}. Change server and settings`} onClick={onSettings} data-settings-toggle>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
          <span className="max-w-[9rem] truncate">{serverName}</span>
          <ChevronDown size={15} className="-mr-1 text-white/60" aria-hidden="true" />
        </Action>
        {onNext && (
          <Action label="Next episode" onClick={onNext}>
            <SkipForward size={16} className="fill-white" aria-hidden="true" /> Next
          </Action>
        )}
        {watchlist && (
          <Action
            label={saved ? 'Remove from My List' : 'Add to My List'}
            aria-pressed={!!saved}
            disabled={watchlist.isPending(movie.id)}
            onClick={() => watchlist.toggle(movie)}
          >
            {saved ? <Check size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />} My List
          </Action>
        )}
        <Action label="Reload video" onClick={onReload}>
          <RefreshCcw size={15} aria-hidden="true" /> Reload
        </Action>
      </div>

      {notice && (
        <p className="mx-4 mt-3 flex items-start gap-2 rounded-panel border border-line bg-card px-3 py-2.5 text-xs leading-5 text-white/70" role="status">
          <Info size={15} className="mt-0.5 shrink-0 text-white/50" aria-hidden="true" />
          <span>
            {notice}
            {noticeActionLabel && (
              <>
                {' '}
                <button type="button" onClick={onNoticeAction} className="font-semibold text-white underline underline-offset-2">{noticeActionLabel}</button>
              </>
            )}
          </span>
        </p>
      )}

      {/* Overview */}
      {about && (
        <div className="mt-4 px-4">
          <p className={`text-sm leading-6 text-white/75 ${more ? '' : 'line-clamp-3'}`}>{about}</p>
          {about.length > 150 && (
            <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="mt-1 text-sm font-semibold text-white">
              {more ? 'Less' : 'More'}
            </button>
          )}
        </div>
      )}

      {isTV && (
        <div className="mt-6 border-t border-line pt-5">
          <EpisodesPanel
            variant="inline"
            title={title}
            tvId={movie.id}
            seasons={seasons}
            playingSeason={season}
            playingEpisode={episode}
            onPick={onPickEpisode}
          />
        </div>
      )}

      {cast.length > 0 && (
        <section aria-labelledby="watch-cast" className="mt-6 border-t border-line pt-5">
          <h2 id="watch-cast" className="px-4 text-lg font-semibold">Cast</h2>
          <ul className="mt-3 flex gap-3 overflow-x-auto px-4 pb-1 hide-scrollbar">
            {cast.map((p) => (
              <li key={p.id || p.name} className="w-[72px] shrink-0 text-center">
                <span className="mx-auto block h-[72px] w-[72px] overflow-hidden rounded-full bg-raised" style={p.profile ? undefined : { backgroundImage: fallbackGradient(p.id || p.name) }}>
                  {p.profile && <img src={p.profile.replace('/w500/', '/w185/')} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />}
                </span>
                <span className="mt-1.5 block truncate text-xs font-medium text-white/90">{p.name}</span>
                {p.character && <span className="block truncate text-[11px] text-white/45">{p.character}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {related.length > 0 && (
        <section aria-labelledby="watch-related" className="mt-6 border-t border-line pt-5">
          <h2 id="watch-related" className="px-4 text-lg font-semibold">More like this</h2>
          <ul className="mt-3 grid grid-cols-3 gap-2 px-4">
            {related.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => onOpenTitle(m)} className="group block w-full text-left">
                  <span
                    className="relative block aspect-[2/3] overflow-hidden rounded-card bg-raised"
                    style={m.image ? undefined : { backgroundImage: fallbackGradient(m.id) }}
                  >
                    {m.image
                      ? <img src={m.image.replace('/w500/', '/w342/')} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover motion-safe:transition-transform group-active:scale-95" />
                      : <span className="absolute inset-0 flex items-end p-2 text-xs font-semibold leading-tight">{m.title}</span>}
                  </span>
                  <span className="mt-1.5 block truncate text-xs font-medium text-white/85">{m.title}</span>
                  <span className="block text-[11px] text-white/45">{[m.year, m.rating ? `★ ${Number(m.rating).toFixed(1)}` : null].filter(Boolean).join(' · ')}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default memo(MobileWatchDetails);
