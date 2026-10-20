import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion as Motion, useReducedMotion } from 'framer-motion';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { Play, Star, Film, Plus, Check, Share2, ChevronRight, ExternalLink, MessageSquare, Home } from 'lucide-react';
import toast from 'react-hot-toast';
import { movieApi } from '../services/movieApi';
import WatchPage from './Watch';
import { auth } from '../components/firebase';
import { useWatchlist } from '../context/WatchlistContext';
import Button, { IconButton } from '../components/ui/Button';
import { Badge } from '../components/ui/Chip';
import { PageLoader, EmptyState, ErrorState } from '../components/ui/feedback';
import Modal from '../components/ui/Modal';
import SectionHeader from '../components/ui/SectionHeader';
import MovieRow from '../components/MovieRow';
import TrailerBackdrop from '../components/TrailerBackdrop';
import { fallbackGradient } from '../utils/fallbackArt';
import { findCategoryGenre } from '../utils/genres';
import { subscribeHistory, findHistoryItem, resumeFrom, formatLeft } from '../services/watchHistory';

const formatRuntime = (min) => {
  if (!min) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
};

const languageName = (code) => {
  if (!code) return null;
  try { return new Intl.DisplayNames(['en'], { type: 'language' }).of(code); } catch { return code; }
};

const formatDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

// Five star display for a 0 to 10 score.
const Stars = ({ score, size = 16 }) => {
  const filled = Math.round((Number(score) || 0) / 2);
  return (
    <span className="inline-flex gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={size} className={i < filled ? 'fill-rating text-rating' : 'fill-white/15 text-white/15'} />
      ))}
    </span>
  );
};

// Hero copy rises in one line at a time.
const HERO_LIST = { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.2 } } };
const HERO_ITEM = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'trailers', label: 'Trailers & Clips' },
  { id: 'cast', label: 'Cast & Crew' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'similar', label: 'More Like This' },
];

const MovieDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const watchlist = useWatchlist();

  const [movie, setMovie] = useState(null);
  const [imdbId, setImdbId] = useState(null);
  const [cast, setCast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPlayer, setShowPlayer] = useState(false);
  const [playFrom, setPlayFrom] = useState(undefined); // the player's `resume`; undefined = let it look up
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [reviews, setReviews] = useState(undefined); // undefined loading, null error, [] none
  const [video, setVideo] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [reloadKey, setReloadKey] = useState(0);
  const [failedLogo, setFailedLogo] = useState(null);
  const reducedMotion = useReducedMotion();

  const type = location.pathname.includes('/tv/') ? 'tv' : 'movie';
  const coarsePointer = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;

  useEffect(() => {
    // Sync auth state to pass to WatchPage
    const unsub = auth.onAuthStateChanged((u) => setUser(u));

    const fetchFullDetails = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [details, externalData, creditsData] = await Promise.all([
          movieApi.getDetails(type, id),
          movieApi.getExternalIds(id, type),
          movieApi.getCredits(type, id)
        ]);

        if (details) {
          // Normalize the movie object so Firebase history works correctly
          const normalizedMovie = {
            ...details,
            id: details.id,
            type: type,
            title: details.title || details.name,
            poster_path: details.poster_path || details.image?.replace('https://image.tmdb.org/t/p/w500', ''),
            backdrop_path: details.backdrop_path || details.backdrop?.replace('https://image.tmdb.org/t/p/original', ''),
            vote_average: details.vote_average || details.rating,
            release_date: details.release_date || details.year,
            first_air_date: type === 'tv' ? (details.first_air_date || details.year) : null
          };
          setMovie(normalizedMovie);
          setImdbId(externalData);
          setCast((details.cast?.length ? details.cast : creditsData) || []);
        } else {
          setMovie(null);
        }
      } catch (error) {
        console.error("Transmission Error:", error);
        setMovie(null);
      } finally {
        setLoading(false);
      }
    };

    fetchFullDetails();
    setActiveTab('overview');
    window.scrollTo(0, 0);
    return () => unsub();
  }, [id, type, reloadKey]);

  // This viewer's history, live: the Resume button follows the player as it saves (spec 0004).
  useEffect(() => {
    if (!user) { setHistory([]); return undefined; }
    return subscribeHistory(user.uid, setHistory);
  }, [user]);

  const loadReviews = useCallback(async () => {
    setReviews(undefined);
    setReviews(await movieApi.getReviews(type, id));
  }, [type, id]);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  const scrollToSection = (tabId) => {
    setActiveTab(tabId);
    document.getElementById(`section-${tabId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: movie.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') toast.error('Could not share this link');
    }
  };

  const openSimilar = (m) => navigate(`/${m.type || type}/${m.id}`);

  if (loading) return <PageLoader label="Loading title" className="min-h-screen pt-20" />;

  if (!movie) {
    return (
      <div className="font-body min-h-screen pt-28 px-4 md:px-8 lg:px-16">
        <ErrorState
          title="We could not find this title"
          message="It may have been removed, or the connection dropped."
          onRetry={() => setReloadKey((k) => k + 1)}
        />
        <div className="flex justify-center mt-6">
          <Button variant="outline" to="/" icon={<Home size={16} aria-hidden="true" />}>Back to Home</Button>
        </div>
      </div>
    );
  }

  const saved = watchlist?.isSaved(movie.id);
  const year = String(movie.releaseDate || movie.release_date || movie.year || '').slice(0, 4);
  const rating = Number(movie.vote_average || movie.rating || 0);
  const posterUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null;
  const backdropUrl = movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null;
  const trailer = movie.videos?.find((v) => v.type === 'Trailer') || movie.videos?.find((v) => v.type === 'Teaser') || (movie.trailer ? { key: movie.trailer, name: 'Official Trailer' } : null) || movie.videos?.[0];
  const showLogo = !!movie.logo && failedLogo !== movie.logo;
  const typeLabel = type === 'tv' ? 'TV Shows' : 'Movies';
  const firstGenreId = movie.genreIds?.[0];
  const genreLink = firstGenreId && findCategoryGenre(firstGenreId);
  const leadCredits = [
    movie.directors?.length ? { label: movie.directors.length > 1 ? 'Directors' : 'Director', value: movie.directors.join(', ') } : null,
    !movie.directors?.length && movie.creators?.length ? { label: 'Created by', value: movie.creators.join(', ') } : null,
    movie.writers?.length ? { label: 'Writers', value: movie.writers.join(', ') } : null,
    cast.length ? { label: 'Starring', value: cast.slice(0, 3).map((c) => c.name).join(', ') } : null,
  ].filter(Boolean);
  const facts = [
    { label: 'Released', value: formatDate(movie.releaseDate) || year || null },
    { label: type === 'tv' ? 'Seasons' : 'Runtime', value: type === 'tv' ? (movie.seasons ? `${movie.seasons} season${movie.seasons > 1 ? 's' : ''}${movie.episodes ? `, ${movie.episodes} episodes` : ''}` : null) : formatRuntime(movie.runtime) },
    { label: 'Language', value: languageName(movie.language) },
    { label: 'Status', value: movie.status !== 'Unknown' ? movie.status : null },
  ].filter((f) => f.value);
  const resume = resumeFrom(findHistoryItem(history, movie.id, type));
  const canResume = !!resume && (resume.t > 0 || (type === 'tv' && (resume.season > 1 || resume.episode > 1)));
  const resumeLabel = resume ? [type === 'tv' ? `S${resume.season} · E${resume.episode}` : null, resume.t > 0 ? formatLeft(resume.leftSec) : null].filter(Boolean).join(' · ') : '';
  const openPlayer = (from) => { setPlayFrom(from); setShowPlayer(true); };
  const visibleTabs = TABS.filter((t) => (t.id === 'trailers' ? movie.videos?.length : t.id === 'similar' ? movie.similar?.length : t.id === 'cast' ? cast.length : true));

  return (
    <div className="font-body text-white">
      <AnimatePresence>
        {showPlayer && <WatchPage movie={movie} user={user} resume={playFrom} onClose={() => setShowPlayer(false)} />}
      </AnimatePresence>

      {/* HERO: full bleed muted trailer preview with a sound toggle, centered title art */}
      <section aria-label={`${movie.title} preview`} className="relative flex h-[86svh] min-h-[560px] max-h-[980px] items-end overflow-hidden">
        <TrailerBackdrop
          // Touch screens: drop the trailer's YouTube frame while the player covers it. Phones play
          // the first tap inside the player's own frame, and a second video frame under it only
          // costs data and battery there.
          videoKey={showPlayer && coarsePointer ? null : trailer?.key}
          image={backdropUrl}
          fallbackStyle={{ backgroundImage: fallbackGradient(movie.id) }}
          paused={showPlayer || !!video}
          title={movie.title}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-canvas via-canvas/50 to-transparent" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgb(10_10_15/0.6)_100%)]" aria-hidden="true" />

        <Motion.div
          variants={HERO_LIST}
          initial={reducedMotion ? false : 'hidden'}
          animate="show"
          className="relative z-10 w-full px-4 md:px-8 lg:px-16 pb-10 md:pb-14 flex flex-col items-center text-center"
        >
          <Motion.h1 variants={HERO_ITEM} className="flex w-full justify-center">
            {showLogo ? (
              <img
                src={movie.logo}
                alt={movie.title}
                onError={() => setFailedLogo(movie.logo)}
                className="h-auto max-h-28 sm:max-h-36 md:max-h-44 w-auto max-w-[85%] md:max-w-[560px] object-contain drop-shadow-[0_8px_30px_rgb(0_0_0/0.7)]"
              />
            ) : (
              <span className="font-display text-display-lg uppercase break-words max-w-4xl drop-shadow-[0_6px_24px_rgb(0_0_0/0.6)]">{movie.title}</span>
            )}
          </Motion.h1>

          {movie.genres?.length > 0 && (
            <Motion.ul variants={HERO_ITEM} className="mt-4 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-base md:text-lg font-semibold" aria-label="Genres">
              {movie.genres.slice(0, 3).map((g, i) => {
                const cat = findCategoryGenre(movie.genreIds?.[i]);
                return (
                  <li key={g} className="flex items-center gap-2.5">
                    {i > 0 && <span className="text-white/40 text-sm" aria-hidden="true">•</span>}
                    {cat ? <Link to={`/categories/${cat.id}${type === 'tv' ? '?type=tv' : ''}`} className="hover:text-accent-text motion-safe:transition-colors">{g}</Link> : <span>{g}</span>}
                  </li>
                );
              })}
            </Motion.ul>
          )}

          {movie.overview && (
            <Motion.p variants={HERO_ITEM} className="mt-4 max-w-2xl text-sm md:text-base text-white/85 line-clamp-3">{movie.overview}</Motion.p>
          )}

          <Motion.div variants={HERO_ITEM} className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm md:text-base text-white/85">
            {year && <span>{year}</span>}
            {type === 'movie' && movie.runtime ? <span>{formatRuntime(movie.runtime)}</span> : null}
            {type === 'tv' && movie.seasons ? <span>{movie.seasons} season{movie.seasons > 1 ? 's' : ''}</span> : null}
            <Badge>{type === 'tv' ? 'Series' : 'Movie'}</Badge>
          </Motion.div>

          {rating > 0 && (
            <Motion.p variants={HERO_ITEM} className="mt-3 inline-flex items-center gap-1.5 text-base font-semibold text-rating">
              <Star size={16} className="fill-rating text-rating" aria-hidden="true" />
              {rating.toFixed(1)}
              <span className="sr-only"> out of 10</span>
            </Motion.p>
          )}

          <Motion.div variants={HERO_ITEM} className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="light"
              size="lg"
              onClick={() => openPlayer(canResume ? resume : undefined)}
              icon={<Play size={18} className="fill-black" aria-hidden="true" />}
              className="min-w-[132px]"
              aria-label={canResume ? `Resume ${movie.title}, ${resumeLabel}` : `Play ${movie.title}`}
            >
              {canResume ? (type === 'tv' ? `Resume S${resume.season} E${resume.episode}` : 'Resume') : 'Play'}
            </Button>
            {/* Phones get an icon only trailer button so all four controls fit on one row. */}
            <span className="contents sm:hidden">
              <IconButton
                label={trailer ? 'Trailer' : 'No trailer'}
                size="lg"
                onClick={() => trailer && setVideo(trailer)}
                disabled={!trailer}
              >
                <Film size={19} aria-hidden="true" />
              </IconButton>
            </span>
            <span className="hidden sm:contents">
              <Button
                size="lg"
                variant="glass"
                onClick={() => trailer && setVideo(trailer)}
                disabled={!trailer}
                icon={<Film size={18} aria-hidden="true" />}
              >
                {trailer ? 'Trailer' : 'No trailer'}
              </Button>
            </span>
            {watchlist && (
              <IconButton
                label={saved ? 'Remove from My List' : 'Add to My List'}
                aria-pressed={!!saved}
                active={saved}
                size="lg"
                disabled={watchlist.isPending(movie.id)}
                onClick={() => watchlist.toggle(movie)}
              >
                {saved ? <Check size={20} aria-hidden="true" /> : <Plus size={20} aria-hidden="true" />}
              </IconButton>
            )}
            <IconButton label="Share" size="lg" onClick={handleShare}>
              <Share2 size={18} aria-hidden="true" />
            </IconButton>
          </Motion.div>

          {/* Where you left off (spec 0004): episode, time left, progress, and a fresh start */}
          {canResume && (
            <Motion.div variants={HERO_ITEM} className="mt-5 w-full max-w-xs">
              <div className="flex items-center justify-between gap-3 text-xs text-white/75">
                <span>{resumeLabel || 'Continue watching'}</span>
                <button type="button" onClick={() => openPlayer({ season: resume.season, episode: resume.episode, t: 0 })} className="font-semibold text-white/60 underline-offset-2 hover:text-white hover:underline">
                  Start over
                </button>
              </div>
              {resume.percent > 0 && (
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/20" role="progressbar" aria-label="Watched so far" aria-valuenow={resume.percent} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-accent" style={{ width: `${resume.percent}%` }} />
                </div>
              )}
            </Motion.div>
          )}
        </Motion.div>
      </section>

      {/* TABS */}
      <div className="sticky top-16 md:top-20 z-30 bg-canvas/90 backdrop-blur-xl border-b border-line">
        <nav aria-label="Title sections" className="px-4 md:px-8 lg:px-16 flex gap-6 overflow-x-auto hide-scrollbar">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => scrollToSection(t.id)}
              aria-current={activeTab === t.id ? 'true' : undefined}
              className={`relative py-4 text-sm whitespace-nowrap motion-safe:transition-colors ${activeTab === t.id ? 'text-white font-semibold' : 'text-muted hover:text-white'}`}
            >
              {t.label}
              {activeTab === t.id && <Motion.span layoutId="details-tab-underline" className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-accent" aria-hidden="true" />}
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-12 pt-10">
        {/* ABOUT: everything the old hero carried (breadcrumb, poster, tagline, credits, rating panel) */}
        <section id="section-overview" aria-labelledby="about-heading" className="scroll-mt-36 px-4 md:px-8 lg:px-16">
          <nav aria-label="Breadcrumb" className="mb-5">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
              <li><Link to={type === 'tv' ? '/tv' : '/movies'} className="hover:text-white">{typeLabel}</Link></li>
              {genreLink && (
                <li className="flex items-center gap-1.5">
                  <ChevronRight size={14} aria-hidden="true" />
                  <Link to={`/categories/${genreLink.id}${type === 'tv' ? '?type=tv' : ''}`} className="hover:text-white">{genreLink.name}</Link>
                </li>
              )}
              <li className="flex items-center gap-1.5 min-w-0">
                <ChevronRight size={14} aria-hidden="true" />
                <span aria-current="page" className="text-white truncate max-w-[50vw]">{movie.title}</span>
              </li>
            </ol>
          </nav>

          <div className="grid gap-8 lg:gap-10 md:grid-cols-[200px_1fr] xl:grid-cols-[220px_1fr_300px] items-start">
            <div
              className="relative hidden md:block aspect-[2/3] rounded-card overflow-hidden border border-line shadow-card motion-safe:animate-rise"
              style={posterUrl ? undefined : { backgroundImage: fallbackGradient(movie.id) }}
            >
              {posterUrl && <img src={posterUrl} alt={`${movie.title} poster`} className="h-full w-full object-cover" />}
              {rating > 0 && (
                <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/60 border border-line px-2 py-0.5 text-[11px] font-semibold">
                  <Star size={11} className="fill-rating text-rating" aria-hidden="true" /> {rating.toFixed(1)}
                </span>
              )}
            </div>

            <div className="min-w-0 motion-safe:animate-rise [animation-delay:80ms]">
              <h2 id="about-heading" className="text-lg md:text-xl font-semibold">About {movie.title}</h2>
              {movie.tagline && <p className="mt-2 text-base italic text-muted">“{movie.tagline}”</p>}
              <p className="mt-4 text-base text-muted max-w-2xl">{movie.overview}</p>

              {movie.genres?.length > 0 && (
                <ul className="mt-5 flex flex-wrap gap-2" aria-label="All genres">
                  {movie.genres.map((g, i) => {
                    const cat = findCategoryGenre(movie.genreIds?.[i]);
                    const cls = 'inline-flex items-center h-8 px-3.5 rounded-full border border-line-strong text-xs font-medium text-white motion-safe:transition-colors';
                    return (
                      <li key={g}>
                        {cat ? <Link to={`/categories/${cat.id}${type === 'tv' ? '?type=tv' : ''}`} className={`${cls} hover:bg-white/10 hover:border-white/30`}>{g}</Link> : <span className={cls}>{g}</span>}
                      </li>
                    );
                  })}
                </ul>
              )}

              {leadCredits.length > 0 && (
                <dl className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
                  {leadCredits.map((c) => (
                    <div key={c.label}>
                      <dt className="text-xs text-muted">{c.label}</dt>
                      <dd className="text-sm text-white">{c.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>

            {/* Rating panel */}
            <aside aria-label="Rating and details" className="glass rounded-panel p-6 md:col-span-2 xl:col-span-1 motion-safe:animate-rise [animation-delay:160ms]">
              <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-muted">MovieHub rating</p>
              <p className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-6xl leading-none">{rating ? rating.toFixed(1) : '—'}</span>
                <span className="text-sm text-muted">/10</span>
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Stars score={rating} />
                <span className="text-xs text-muted">{(movie.votes || 0).toLocaleString()} ratings</span>
              </div>
              <dl className="mt-5 pt-5 border-t border-line space-y-2.5 text-sm">
                {facts.map((f) => (
                  <div key={f.label} className="flex justify-between gap-4">
                    <dt className="text-muted">{f.label}</dt>
                    <dd className="text-white text-right">{f.value}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">IMDb</dt>
                  <dd>
                    {imdbId ? (
                      <a href={`https://www.imdb.com/title/${imdbId}/`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent-text hover:underline">
                        {imdbId} <ExternalLink size={13} aria-hidden="true" />
                      </a>
                    ) : <span className="text-white">Not listed</span>}
                  </dd>
                </div>
              </dl>
            </aside>
          </div>
        </section>

        {/* TRAILERS */}
        {movie.videos?.length > 0 && (
          <section id="section-trailers" aria-labelledby="trailers-heading" className="scroll-mt-36 px-4 md:px-8 lg:px-16">
            <SectionHeader id="trailers-heading" title="Trailers & Clips" />
            <ul className="flex overflow-x-auto hide-scrollbar gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible">
              {movie.videos.slice(0, 8).map((v) => (
                <li key={v.key} className="w-[260px] shrink-0 sm:w-auto">
                  <button type="button" onClick={() => setVideo(v)} className="group relative block w-full aspect-video rounded-card overflow-hidden border border-line bg-card text-left">
                    <img src={`https://i.ytimg.com/vi/${v.key}/hqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover motion-safe:transition-transform duration-500 motion-safe:group-hover:scale-105" />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <span className="absolute inset-0 m-auto h-12 w-12 rounded-full glass flex items-center justify-center">
                      <Play size={18} className="ml-0.5 fill-white text-white" aria-hidden="true" />
                    </span>
                    <span className="absolute inset-x-0 bottom-0 p-3">
                      <span className="block text-sm font-semibold text-white truncate">{v.name}</span>
                      <span className="block text-[11px] text-muted">{v.type}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* CAST */}
        {cast.length > 0 && (
          <section id="section-cast" aria-labelledby="cast-heading" className="scroll-mt-36 px-4 md:px-8 lg:px-16">
            <SectionHeader id="cast-heading" title="Cast & Crew" />
            <ul className="flex gap-5 overflow-x-auto hide-scrollbar pb-2">
              {(movie.directors || []).slice(0, 1).map((name) => (
                <li key={`dir-${name}`} className="w-24 shrink-0 text-center">
                  <span className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-accent to-violet-700 border border-line flex items-center justify-center text-xl font-semibold">{initials(name)}</span>
                  <p className="mt-2 text-xs font-semibold text-white truncate">{name}</p>
                  <p className="text-[11px] text-muted truncate">Director</p>
                </li>
              ))}
              {cast.slice(0, 12).map((actor, i) => (
                <li key={`${actor.id || actor.name}-${i}`} className="w-24 shrink-0 text-center">
                  {actor.profile ? (
                    <img src={actor.profile} alt="" loading="lazy" className="mx-auto h-20 w-20 rounded-full object-cover border border-line" />
                  ) : (
                    <span className="mx-auto h-20 w-20 rounded-full border border-line flex items-center justify-center text-xl font-semibold" style={{ backgroundImage: fallbackGradient(actor.name) }}>{initials(actor.name)}</span>
                  )}
                  <p className="mt-2 text-xs font-semibold text-white truncate">{actor.name}</p>
                  <p className="text-[11px] text-muted truncate">{actor.character}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* REVIEWS */}
        <section id="section-reviews" aria-labelledby="reviews-heading" className="scroll-mt-36 px-4 md:px-8 lg:px-16">
          <SectionHeader id="reviews-heading" title="Reviews" />
          {reviews === undefined ? (
            <div className="grid gap-4 md:grid-cols-3" aria-busy="true">
              {[0, 1, 2].map((i) => <div key={i} className="h-44 rounded-panel bg-card border border-line motion-safe:animate-pulse" />)}
            </div>
          ) : reviews === null ? (
            <ErrorState title="Reviews did not load" message="Check your connection and try again." onRetry={loadReviews} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
              <div className="rounded-panel bg-card border border-line p-6">
                <p className="font-display text-6xl leading-none">{rating ? rating.toFixed(1) : '—'}</p>
                <div className="mt-3"><Stars score={rating} size={18} /></div>
                <p className="mt-3 text-xs text-muted">Average of {(movie.votes || 0).toLocaleString()} TMDB ratings</p>
              </div>
              {reviews.length === 0 ? (
                <EmptyState icon={<MessageSquare size={26} aria-hidden="true" />} title="No reviews yet" message="Nobody has reviewed this title on TMDB yet." className="py-10" />
              ) : (
                <ul className="grid gap-4 md:grid-cols-2">
                  {reviews.slice(0, 4).map((r) => (
                    <li key={r.id} className="rounded-panel bg-card border border-line p-5 flex flex-col">
                      <div className="flex items-center gap-3">
                        <span className="h-9 w-9 rounded-[10px] flex items-center justify-center text-sm font-semibold" style={{ backgroundImage: fallbackGradient(r.author) }} aria-hidden="true">{initials(r.author)}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{r.author}</p>
                          {r.createdAt && <p className="text-[11px] text-muted">{formatDate(r.createdAt)}</p>}
                        </div>
                      </div>
                      {r.rating != null && <div className="mt-3 flex items-center gap-2"><Stars score={r.rating} size={14} /><span className="text-xs text-muted">{r.rating}/10</span></div>}
                      <p className="mt-3 text-sm text-muted line-clamp-4 whitespace-pre-line">{r.content}</p>
                      {r.url && (
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-accent-text hover:underline self-start">
                          Read full review <ExternalLink size={12} aria-hidden="true" />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        {/* MORE LIKE THIS */}
        {movie.similar?.length > 0 && (
          <div id="section-similar" className="scroll-mt-36">
            <MovieRow title="More Like This" movies={movie.similar} onMovieClick={openSimilar} />
          </div>
        )}
      </div>

      {/* TRAILER MODAL */}
      <Modal open={!!video} onClose={() => setVideo(null)} title={video?.name} className="max-w-4xl">
        {video && (
          <div className="mt-2 aspect-video w-full overflow-hidden rounded-card bg-black">
            <iframe
              title={video.name}
              src={`https://www.youtube-nocookie.com/embed/${video.key}?autoplay=1&rel=0`}
              className="h-full w-full"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MovieDetails;
