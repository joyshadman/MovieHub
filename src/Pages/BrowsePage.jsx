import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { movieApi } from '../services/movieApi';
import { auth } from '../components/firebase';
import Hero from '../components/Hero';
import MovieRow from '../components/MovieRow';
import Watch from './Watch';
import { ErrorState } from '../components/ui/feedback';

const CONFIG = {
  movie: {
    title: 'Movies',
    rows: [
      { title: 'Trending Movies', key: 'trending' },
      { title: 'Popular Movies', key: 'popular' },
      { title: 'Top Rated Movies', key: 'topRated' },
      { title: 'Action', key: 'g28', genre: 28, to: '/categories/28' },
      { title: 'Comedy', key: 'g35', genre: 35, to: '/categories/35' },
      { title: 'Sci-Fi', key: 'g878', genre: 878, to: '/categories/878' },
      { title: 'Drama', key: 'g18', genre: 18, to: '/categories/18' },
    ],
  },
  tv: {
    title: 'TV Shows',
    rows: [
      { title: 'Trending Series', key: 'trending' },
      { title: 'Popular Series', key: 'popular' },
      { title: 'Top Rated Series', key: 'topRated' },
      { title: 'Action & Adventure', key: 'g10759', genre: 10759, to: '/categories/28?type=tv' },
      { title: 'Comedy', key: 'g35', genre: 35, to: '/categories/35?type=tv' },
      { title: 'Sci-Fi & Fantasy', key: 'g10765', genre: 10765, to: '/categories/878?type=tv' },
      { title: 'Drama', key: 'g18', genre: 18, to: '/categories/18?type=tv' },
    ],
  },
};

const fetchRow = (type, row) => {
  if (row.key === 'trending') return movieApi.getTrending(type);
  if (row.key === 'popular') return movieApi.getPopular(type);
  if (row.key === 'topRated') return movieApi.getTopRated(type);
  return movieApi.getByGenre(row.genre, type);
};

// Movies (/movies) and TV Shows (/tv) pages (spec 0002, feature 9).
const BrowsePage = ({ type = 'movie' }) => {
  const navigate = useNavigate();
  const config = CONFIG[type];
  const [rows, setRows] = useState({});
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled(config.rows.map((r) => fetchRow(type, r))).then((settled) => {
      if (cancelled) return;
      const next = {};
      settled.forEach((s, i) => {
        const v = s.status === 'fulfilled' ? s.value : [];
        next[config.rows[i].key] = Array.isArray(v) ? v : v?.results || [];
      });
      setRows(next);
      setFailed(Object.values(next).every((list) => list.length === 0));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [type, config, reload]);

  const openTitle = (m) => navigate(`/${m.type || type}/${m.id}`);
  const heroSlides = useMemo(() => (rows.trending || []).filter((m) => m.backdrop), [rows.trending]);

  return (
    <div className="font-body text-white">
      <h1 className="sr-only">{config.title}</h1>
      {failed ? (
        <div className="pt-28 px-4 md:px-8 lg:px-16">
          <ErrorState title={`${config.title} did not load`} onRetry={() => { setLoading(true); setFailed(false); setRows({}); setReload((n) => n + 1); }} />
        </div>
      ) : (
        <>
          <Hero movies={heroSlides} pending={loading} onPlay={setPlaying} onInfo={openTitle} label={config.title} />
          <div className="relative z-10 -mt-6 md:-mt-10 space-y-10 md:space-y-12">
            {config.rows.map((r) => (
              <MovieRow key={r.key} title={r.title} movies={rows[r.key]} onMovieClick={openTitle} to={r.to} />
            ))}
          </div>
        </>
      )}
      <AnimatePresence>
        {playing && <Watch movie={playing} user={auth.currentUser} onClose={() => setPlaying(null)} />}
      </AnimatePresence>
    </div>
  );
};

export default BrowsePage;
