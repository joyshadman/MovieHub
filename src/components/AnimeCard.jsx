import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Eye } from 'lucide-react';
import { fallbackGradient } from '../utils/fallbackArt';

const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });

// Poster card for the anime section (spec 0008), in the same look as MovieCard: 2:3 art, rating
// pill, Bebas title, meta line. `to` defaults to the title page; latest episodes link straight to
// the episode. `badge` is an optional corner label (for example "EP 12").
const AnimeCard = React.memo(({ anime, to, badge, meta }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const score = Number(anime.score);
  const showArt = anime.poster && !imgFailed;
  const line = meta ?? [anime.year, anime.format].filter(Boolean).join(' • ');
  return (
    <Link to={to || `/anime/${anime.anilistId}`} className="group block w-full rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-text">
      <div
        className="relative aspect-[2/3] w-full overflow-hidden rounded-card border border-line bg-card motion-safe:transition-[transform,box-shadow,border-color] duration-300 ease-out motion-safe:group-hover:-translate-y-1.5 group-hover:border-accent/40 group-hover:shadow-[0_18px_40px_-14px_rgb(0_0_0/0.8),0_0_0_1px_rgb(225_29_72/0.25)]"
        style={showArt ? undefined : { backgroundImage: fallbackGradient(anime.anilistId) }}
      >
        {showArt && <img src={anime.poster} alt="" loading="lazy" decoding="async" onError={() => setImgFailed(true)} className="h-full w-full object-cover motion-safe:transition-transform duration-500 motion-safe:group-hover:scale-105" />}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" aria-hidden="true" />
        {score > 0 && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold backdrop-blur-sm">
            <Star size={11} className="fill-rating text-rating" aria-hidden="true" /> {score.toFixed(1)}
          </span>
        )}
        {badge && <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold">{badge}</span>}
        {anime.views > 0 && (
          <span className="absolute left-2 bottom-2 inline-flex items-center gap-1 text-[11px] font-medium text-white/80">
            <Eye size={12} aria-hidden="true" /> {compact.format(anime.views)}
          </span>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-white group-hover:text-accent-text">{anime.title}</p>
      {line && <p className="mt-0.5 truncate text-xs text-muted">{line}</p>}
    </Link>
  );
});

export default AnimeCard;
