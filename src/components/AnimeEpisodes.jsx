import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import Chip from './ui/Chip';

const PAGE = 100; // long series (One Piece has 1,100+) are split into ranges of 100

const mins = (s) => (s > 0 ? `${Math.round(s / 60)} min` : null);

// Every episode of an ani.pm title with its sub and dub availability (spec 0008). Each row opens
// the episode in the anime player; `lang` carries the viewer's Sub/Dub choice when that version
// exists for the episode.
const AnimeEpisodes = ({ id, episodes, current, lang = 'sub', compact = false }) => {
  const ranges = Math.ceil(episodes.length / PAGE);
  const currentIndex = Math.max(0, episodes.findIndex((e) => e.number === current));
  const [picked, setPicked] = useState(null);
  const range = picked ?? Math.floor(currentIndex / PAGE);
  const shown = episodes.slice(range * PAGE, range * PAGE + PAGE);

  if (!episodes.length) return <p className="text-sm text-muted">No episodes are available yet.</p>;
  return (
    <div>
      {ranges > 1 && (
        <div role="group" aria-label="Episode range" className="hide-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
          {Array.from({ length: ranges }).map((_, i) => {
            const from = episodes[i * PAGE]?.number;
            const to = episodes[Math.min(episodes.length, (i + 1) * PAGE) - 1]?.number;
            return <Chip key={i} selected={range === i} onClick={() => setPicked(i)}>{from}–{to}</Chip>;
          })}
        </div>
      )}
      <ol className={compact ? 'grid grid-cols-1 gap-1.5' : 'grid gap-2 sm:grid-cols-2 lg:grid-cols-3'}>
        {shown.map((e) => {
          const playing = e.number === current;
          const version = lang === 'dub' && e.available?.dub ? 'dub' : 'sub';
          return (
            <li key={e.number}>
              <Link
                to={`/anime/${id}/${e.number}${version === 'dub' ? '?lang=dub' : ''}`}
                aria-current={playing ? 'true' : undefined}
                className={`group flex items-center gap-3 rounded-control border px-3 py-2.5 motion-safe:transition-colors ${playing ? 'border-accent/60 bg-accent/10' : 'border-line bg-card hover:border-line-strong hover:bg-white/[0.04]'}`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${playing ? 'bg-accent text-white' : 'bg-raised text-white/80 group-hover:bg-white/15'}`}>
                  {playing ? <Play size={14} className="ml-0.5 fill-white" aria-hidden="true" /> : e.number}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{e.title || `Episode ${e.number}`}</span>
                  <span className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
                    {playing && <span className="sr-only">Now playing,</span>}
                    {e.title && <span>Episode {e.number}</span>}
                    {mins(e.runtimeSeconds) && <span>{mins(e.runtimeSeconds)}</span>}
                  </span>
                </span>
                <span className="flex shrink-0 gap-1 text-[10px] font-bold uppercase">
                  {e.available?.sub && <span className="rounded bg-white/10 px-1.5 py-0.5">Sub</span>}
                  {e.available?.dub && <span className="rounded bg-accent/20 px-1.5 py-0.5 text-accent-text">Dub</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default AnimeEpisodes;
