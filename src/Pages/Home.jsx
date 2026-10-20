import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { movieApi } from '../services/movieApi';
import { auth } from '../components/firebase';
import Hero from '../components/Hero';
import MovieRow from '../components/MovieRow';
import Watch from './Watch';
import ContinueWatching from './ContinueWatching';
import { getRegion, regionName } from '../utils/region';

// --- LOW-END DEVICE DETECTION ---
// navigator.deviceMemory (RAM in GB) and hardwareConcurrency (CPU cores) are
// reliable, cheap signals available on most Android Chrome browsers.
// Defaults to "not low-end" if unsupported (iOS Safari, etc.)
const isLowEndDevice = () => {
  if (typeof navigator === 'undefined') return false;
  const mem = navigator.deviceMemory;
  const cores = navigator.hardwareConcurrency;
  if (mem && mem <= 4) return true;
  if (cores && cores <= 4) return true;
  return false;
};

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Content States
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [trendingSeries, setTrendingSeries] = useState([]);
  const [topRatedMovies, setTopRatedMovies] = useState([]);
  const [topRatedSeries, setTopRatedSeries] = useState([]);
  const [actionMovies, setActionMovies] = useState([]);
  const [comedyMovies, setComedyMovies] = useState([]);
  const [thrillerMovies, setThrillerMovies] = useState([]);
  const [horrorMovies, setHorrorMovies] = useState([]);
  const [bollywood, setBollywood] = useState([]);
  const [banglaMovies, setBanglaMovies] = useState([]);
  const [animeSeries, setAnimeSeries] = useState([]);
  const [animeMovies, setAnimeMovies] = useState([]);
  const [romanceMovies, setRomanceMovies] = useState([]);
  const [topInRegion, setTopInRegion] = useState([]);
  // { movie, resume? }: the title open in the player, and where to start it.
  const [playing, setPlaying] = useState(null);
  const [loading, setLoading] = useState(true);

  const isLowEnd = useMemo(() => isLowEndDevice(), []);
  const region = useMemo(() => getRegion(), []);

  // 1. AUTH (watch history is read by ContinueWatching and written by the player itself)
  useEffect(() => auth.onAuthStateChanged((u) => setUser(u)), []);

  // 2. DATA FETCHING: show the hero once trending loads; fill rows in the
  // background. On low-end devices, secondary rows are fetched in smaller
  // batches with a short pause between each so the main thread isn't flooded.
  useEffect(() => {
    let cancelled = false;

    const secondaryFetchers = [
      { fn: () => movieApi.getPopularInRegion(region), set: setTopInRegion },
      { fn: () => movieApi.getTopRated('movie'), set: setTopRatedMovies },
      { fn: () => movieApi.getTopRated('tv'), set: setTopRatedSeries },
      { fn: () => movieApi.getByGenre(28), set: setActionMovies },
      { fn: () => movieApi.getByGenre(35), set: setComedyMovies },
      { fn: () => movieApi.getByGenre(53), set: setThrillerMovies },
      { fn: () => movieApi.getByGenre(27), set: setHorrorMovies },
      { fn: () => movieApi.getBollywood(1), set: setBollywood },
      { fn: () => movieApi.getByGenre(10749), set: setRomanceMovies },
      { fn: () => movieApi.getBanglaMovies(1), set: setBanglaMovies },
      { fn: () => movieApi.getAnime('tv', 1), set: setAnimeSeries },
      { fn: () => movieApi.getAnime('movie', 1), set: setAnimeMovies },
    ];

    const unwrap = (settled) => {
      if (!settled || settled.status !== 'fulfilled') return [];
      const v = settled.value;
      return Array.isArray(v) ? v : v?.results || [];
    };

    const loadSecondaryBatched = async () => {
      const idle = (cb) => (window.requestIdleCallback || ((c) => setTimeout(c, 50)))(cb);
      const chunkSize = isLowEnd ? 2 : 4;
      for (let i = 0; i < secondaryFetchers.length; i += chunkSize) {
        if (cancelled) return;
        const chunk = secondaryFetchers.slice(i, i + chunkSize);
        const settled = await Promise.allSettled(chunk.map((c) => c.fn()));
        if (cancelled) return;
        settled.forEach((res, idx) => chunk[idx].set(unwrap(res)));
        await new Promise((resolve) => idle(resolve));
      }
    };

    const loadSecondaryUnbatched = () => {
      Promise.allSettled(secondaryFetchers.map((c) => c.fn())).then((results) => {
        if (cancelled) return;
        results.forEach((res, idx) => secondaryFetchers[idx].set(unwrap(res)));
      });
    };

    (async () => {
      setLoading(true);
      try {
        const [tM, tS] = await Promise.all([
          movieApi.getTrending('movie'),
          movieApi.getTrending('tv'),
        ]);
        if (cancelled) return;
        setTrendingMovies(Array.isArray(tM) ? tM : []);
        setTrendingSeries(Array.isArray(tS) ? tS : []);
      } catch (err) {
        console.error('Home Data Fetch Error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }

      if (isLowEnd) loadSecondaryBatched();
      else loadSecondaryUnbatched();
    })();

    return () => { cancelled = true; };
  }, [isLowEnd, region]);

  // 3. HANDLERS
  const handleMovieSelect = (movie) => {
    if (!movie || !movie.id) return;
    const type = movie.type || movie.media_type || (movie.first_air_date ? 'tv' : 'movie');
    navigate(`/${type}/${movie.id}`);
  };

  // The player looks up the resume point and records history itself (services/watchHistory.js).
  const handlePlay = (movie) => setPlaying({ movie });
  // Continue Watching: straight back into the player at the saved episode and second.
  const handleResume = (item, resume) => setPlaying({ movie: item, resume });

  const rows = [
    { title: 'Trending Now', data: trendingMovies, to: '/movies' },
    { title: `Top 10 Movies in ${regionName(region)} Today`, data: topInRegion, ranked: true },
    { title: 'Trending Series', data: trendingSeries, to: '/tv' },
    { title: 'Top Rated Movies', data: topRatedMovies, to: '/movies' },
    { title: 'Top Rated Series', data: topRatedSeries, to: '/tv' },
    { title: 'Action Packed', data: actionMovies, to: '/categories/28' },
    { title: 'Comedy Favourites', data: comedyMovies, to: '/categories/35' },
    { title: 'Edge of Your Seat', data: thrillerMovies, to: '/categories/53' },
    { title: 'Horror Essentials', data: horrorMovies, to: '/categories/27' },
    { title: 'Bollywood Specials', data: bollywood, to: '/collection/bollywood' },
    { title: 'Best of Bangla', data: banglaMovies, to: '/collection/bangla' },
    { title: 'Anime Series', data: animeSeries, to: '/collection/anime' },
    { title: 'Anime Movies', data: animeMovies, to: '/collection/anime?type=movie' },
    { title: 'Romantic Escapes', data: romanceMovies, to: '/categories/10749' },
  ];

  return (
    <div className="font-body text-white">
      <Hero movies={trendingMovies} pending={loading} onPlay={handlePlay} onInfo={handleMovieSelect} label="Trending" />

      <div className="relative z-10 -mt-6 md:-mt-10 space-y-10 md:space-y-12">
        {user && <ContinueWatching user={user} onMovieClick={handleMovieSelect} onResume={handleResume} />}
        {rows.map((row) =>
          row.data && row.data.length > 0 ? (
            <MovieRow key={row.title} title={row.title} movies={row.data} onMovieClick={handleMovieSelect} to={row.to} ranked={row.ranked} />
          ) : null
        )}
      </div>

      <AnimatePresence>
        {playing && (
          <Watch movie={playing.movie} resume={playing.resume} user={user} onClose={() => setPlaying(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Home;
