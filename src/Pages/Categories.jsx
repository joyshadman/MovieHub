import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { movieApi } from '../services/movieApi';
import { CATEGORY_GENRES, TV_GENRE_MAP } from '../utils/genres';
import { COLLECTIONS } from '../utils/collections';
import Chip from '../components/ui/Chip';
import SectionHeader from '../components/ui/SectionHeader';

const countCache = {};

const TYPE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'movie', label: 'Movies' },
  { id: 'tv', label: 'TV Shows' },
];

// Decorative tilted "cards" from the Figma category and collection tiles.
const TiltedCards = ({ colors, count = 1 }) => (
  <div aria-hidden="true" className="absolute right-4 top-1/2 -translate-y-1/2 h-[85%] w-[45%]">
    {Array.from({ length: count }).map((_, i) => (
      <span
        key={i}
        className="absolute top-[8%] h-[84%] aspect-[2/3] rounded-card border border-white/15 shadow-card rotate-(--r) motion-safe:transition-[rotate,translate] duration-500 ease-out group-hover:rotate-(--r2) group-hover:[translate:var(--dx)_-6px]"
        style={{
          right: `${i * 18}%`,
          // Cards fan out a little further when the tile is hovered.
          '--r': `${10 - i * 6}deg`,
          '--r2': `${(10 - i * 6) * 1.6 + 4}deg`,
          '--dx': `${-i * 10 + 6}px`,
          backgroundImage: `linear-gradient(160deg, ${colors[i % colors.length]}, #0a0a0f)`,
          zIndex: count - i,
        }}
      />
    ))}
  </div>
);

// Figma "Categories": genre tiles with live title counts, plus curated (regional) collections.
const Categories = () => {
  const [typeFilter, setTypeFilter] = useState('all');
  const countType = typeFilter === 'tv' ? 'tv' : 'movie';
  const [countsByType, setCountsByType] = useState(() => ({ ...countCache }));
  const counts = countsByType[countType] || {};

  useEffect(() => {
    let cancelled = false;
    if (countCache[countType]) return undefined;
    Promise.all(
      CATEGORY_GENRES.map(async (g) => {
        const gid = countType === 'tv' ? TV_GENRE_MAP[g.id] || g.id : g.id;
        return [g.id, await movieApi.getGenreCount(gid, countType)];
      })
    ).then((pairs) => {
      const map = Object.fromEntries(pairs);
      countCache[countType] = map;
      if (!cancelled) setCountsByType((prev) => ({ ...prev, [countType]: map }));
    });
    return () => { cancelled = true; };
  }, [countType]);

  const total = Object.values(counts).reduce((sum, n) => sum + (n || 0), 0);

  return (
    <div className="font-body text-white">
      <section className="relative pt-28 md:pt-36 pb-10 px-4 md:px-8 lg:px-16 bg-[radial-gradient(ellipse_at_top_left,rgb(159_18_57/0.35),transparent_55%),radial-gradient(ellipse_at_top_right,rgb(91_33_182/0.3),transparent_50%)]">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold">Browse Categories</h1>
            <p className="mt-3 text-base md:text-lg text-muted">
              Find your next favourite: {CATEGORY_GENRES.length} genres{total ? `, ${total.toLocaleString()}+ titles` : ''}.
            </p>
          </div>
          <div role="group" aria-label="Show counts for" className="flex flex-wrap gap-2">
            {TYPE_FILTERS.map((t) => (
              <Chip key={t.id} selected={typeFilter === t.id} onClick={() => setTypeFilter(t.id)}>{t.label}</Chip>
            ))}
          </div>
        </div>

        <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
          {CATEGORY_GENRES.map((g, i) => (
            <li key={g.id} className="motion-safe:animate-rise" style={{ animationDelay: `${i * 40}ms` }}>
              <Link
                to={`/categories/${g.id}${typeFilter === 'tv' ? '?type=tv' : ''}`}
                className="group relative flex h-32 md:h-40 items-end overflow-hidden rounded-panel border border-line p-4 md:p-5 motion-safe:transition-[transform,box-shadow,border-color] duration-300 ease-out motion-safe:hover:-translate-y-1 hover:border-line-strong hover:shadow-card"
                style={{ backgroundImage: `linear-gradient(120deg, #0a0a0f 15%, ${g.from}cc 70%, ${g.to})` }}
              >
                <TiltedCards colors={[g.to, g.from]} />
                <span className="relative z-10">
                  <span className="block font-display text-display-md uppercase motion-safe:transition-transform motion-safe:group-hover:translate-x-1">{g.name}</span>
                  <span className="block text-xs text-white/75 mt-1">
                    {counts[g.id] == null ? <span className="inline-block h-3 w-16 rounded bg-white/15 motion-safe:animate-pulse align-middle" /> : `${counts[g.id] >= 20000 ? '20,000+' : counts[g.id].toLocaleString()} titles`}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="collections-heading" className="px-4 md:px-8 lg:px-16 pt-6">
        <SectionHeader id="collections-heading" title="Curated Collections" />
        <ul className="grid gap-4 md:gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {COLLECTIONS.map((c, i) => (
            <li key={c.slug} className="motion-safe:animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
              <Link
                to={`/collection/${c.slug}`}
                className="group relative flex h-48 md:h-52 overflow-hidden rounded-panel border border-line bg-card p-6 motion-safe:transition-[transform,box-shadow,border-color] duration-300 ease-out motion-safe:hover:-translate-y-1 hover:border-line-strong hover:shadow-card"
                style={{ backgroundImage: `linear-gradient(110deg, #0f0f14 35%, ${c.colors[0]}99 85%, ${c.colors[1]})` }}
              >
                <TiltedCards colors={c.colors} count={3} />
                <span className="relative z-10 max-w-[60%] self-center">
                  <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] font-medium text-rating">
                    <Sparkles size={13} aria-hidden="true" /> Collection
                  </span>
                  <span className="block mt-2 text-2xl md:text-3xl font-bold leading-tight">{c.title}</span>
                  <span className="block mt-2 text-sm text-muted">{c.blurb}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default Categories;
