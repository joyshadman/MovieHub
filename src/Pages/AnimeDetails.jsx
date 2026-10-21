import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ChevronRight, Play, Star } from 'lucide-react';
import { aniPm, loadLastEpisode } from '../services/aniPm';
import AnimeEpisodes from '../components/AnimeEpisodes';
import Button from '../components/ui/Button';
import { Badge } from '../components/ui/Chip';
import { ErrorState, PageLoader } from '../components/ui/feedback';
import { fallbackGradient } from '../utils/fallbackArt';

// One anime title (spec 0008): ani.pm's /series/{anilistId}, with every episode and its versions.
const AnimeDetails = () => {
  const { id } = useParams();
  const [state, setState] = useState({ id: null, data: null, error: false });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    aniPm.series(id).then(
      (data) => { if (!cancelled) setState({ id, data, error: !data }); },
      () => { if (!cancelled) setState({ id, data: null, error: true }); },
    );
    return () => { cancelled = true; };
  }, [id, retry]);

  if (state.id !== id) return <PageLoader className="min-h-[70vh] pt-24" />;
  if (state.error) {
    return (
      <div className="px-4 pb-16 pt-28 md:px-8 lg:px-16">
        <ErrorState title="This anime did not load" message="It may not be on ani.pm, or ani.pm did not answer." onRetry={() => setRetry((n) => n + 1)} />
      </div>
    );
  }

  const a = state.data;
  if (a.adult) return <div className="px-4 pb-16 pt-28 md:px-8 lg:px-16"><ErrorState title="Not available" message="Adult titles are not shown on MovieHub." /></div>;
  const episodes = (a.episodeList || []).filter((e) => e.available?.sub || e.available?.dub);
  const last = loadLastEpisode(a.anilistId);
  const resumeEp = last && episodes.some((e) => e.number === last.episode) ? last.episode : null;
  const firstEp = episodes[0]?.number || 1;
  const lang = last?.lang === 'dub' ? 'dub' : 'sub';
  const meta = [a.year, a.season && a.year ? `${a.season[0].toUpperCase()}${a.season.slice(1)}` : null, a.status, a.durationMinutes ? `${a.durationMinutes} min` : null].filter(Boolean);

  return (
    <div className="font-body text-white">
      <Helmet><title>{`${a.title} · Anime · MovieHub`}</title></Helmet>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={a.poster ? undefined : { backgroundImage: fallbackGradient(a.anilistId) }} aria-hidden="true">
          {(a.banner || a.poster) && <img src={a.banner || a.poster} alt="" className="h-full w-full scale-110 object-cover opacity-30 blur-2xl" />}
          <div className="absolute inset-0 bg-gradient-to-b from-canvas/40 via-canvas/70 to-canvas" />
        </div>
        <div className="relative px-4 pb-10 pt-24 md:px-8 md:pt-32 lg:px-16">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-1.5 text-xs text-muted">
              <li><Link to="/anime" className="hover:text-white">Anime</Link></li>
              <li className="flex min-w-0 items-center gap-1.5"><ChevronRight size={14} aria-hidden="true" /><span aria-current="page" className="truncate text-white">{a.title}</span></li>
            </ol>
          </nav>
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end md:gap-10">
            <div className="aspect-[2/3] w-36 shrink-0 overflow-hidden rounded-card border border-line bg-card shadow-card sm:w-48 md:w-56">
              {a.poster && <img src={a.poster} alt={`${a.title} poster`} className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                {a.format && <Badge>{a.format}</Badge>}
                {a.rating && <Badge>{a.rating}</Badge>}
                {a.score > 0 && (
                  <span className="inline-flex items-center gap-1 text-sm font-semibold"><Star size={15} className="fill-rating text-rating" aria-hidden="true" /> {Number(a.score).toFixed(1)}</span>
                )}
              </div>
              <h1 className="mt-3 font-display text-4xl uppercase leading-[0.95] md:text-6xl">{a.title}</h1>
              {a.nativeTitle && a.nativeTitle !== a.title && <p className="mt-1 text-sm text-muted">{a.nativeTitle}</p>}
              <p className="mt-3 text-sm text-muted">{meta.join(' • ')}</p>
              {a.genres?.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2" aria-label="Genres">
                  {a.genres.map((g) => <li key={g} className="rounded-full border border-line bg-raised/70 px-3 py-1 text-xs">{g}</li>)}
                </ul>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                {episodes.length > 0 ? (
                  <>
                    <Button variant="light" size="lg" to={`/anime/${a.anilistId}/${resumeEp || firstEp}${lang === 'dub' ? '?lang=dub' : ''}`} icon={<Play size={18} className="fill-black" aria-hidden="true" />}>
                      {resumeEp ? `Continue episode ${resumeEp}` : `Watch episode ${firstEp}`}
                    </Button>
                    {resumeEp && resumeEp !== firstEp && <Button variant="glass" size="lg" to={`/anime/${a.anilistId}/${firstEp}`}>From episode {firstEp}</Button>}
                  </>
                ) : <p className="text-sm text-muted">No episodes are on ani.pm yet.</p>}
              </div>
              <p className="mt-4 text-xs text-muted">
                {a.episodes?.sub || 0} subbed{a.episodes?.dub ? ` • ${a.episodes.dub} dubbed` : ''}{a.studios?.length ? ` • ${a.studios.join(', ')}` : ''}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-10 px-4 pb-16 md:px-8 lg:px-16">
        {a.synopsis && (
          <section aria-labelledby="anime-story">
            <h2 id="anime-story" className="text-lg font-semibold">Story</h2>
            <p className="mt-2 max-w-3xl whitespace-pre-line text-sm leading-7 text-muted">{a.synopsis}</p>
          </section>
        )}
        <section aria-labelledby="anime-episodes">
          <h2 id="anime-episodes" className="mb-4 text-lg font-semibold">Episodes <span className="text-muted">· {episodes.length}</span></h2>
          <AnimeEpisodes id={a.anilistId} episodes={episodes} current={resumeEp} lang={lang} />
        </section>
      </div>
    </div>
  );
};

export default AnimeDetails;
