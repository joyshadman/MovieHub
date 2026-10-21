import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  animeEmbedUrl, aniPm, helloAniPm, loadAnimeProgress, loadLastEpisode, readAniPmMessage, saveAnimeProgress,
} from '../services/aniPm';
import AnimeEpisodes from '../components/AnimeEpisodes';

const SAVE_EVERY_S = 5;

// Anime player (spec 0008). ani.pm's own player, unmodified and not sandboxed (its terms): nothing
// is drawn over it, so its controls handle play, seek, subtitles, quality, intro skip and full
// screen. Around it: back, the title, Sub/Dub (only when a dub exists), previous and next, and the
// episode list. The second where it stopped is kept in this browser and used on the next load.
const AnimeWatch = () => {
  const { id, episode: epParam } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const episode = Math.max(1, Number(epParam) || 1);
  const [series, setSeries] = useState({ id: null, data: null });

  useEffect(() => {
    let cancelled = false;
    aniPm.series(id).then((data) => { if (!cancelled) setSeries({ id, data }); }, () => { if (!cancelled) setSeries({ id, data: null }); });
    return () => { cancelled = true; };
  }, [id]);

  const data = series.id === id ? series.data : null;
  const episodes = useMemo(() => (data?.episodeList || []).filter((e) => e.available?.sub || e.available?.dub), [data]);
  const info = episodes.find((e) => e.number === episode);
  const index = episodes.findIndex((e) => e.number === episode);
  const prev = index > 0 ? episodes[index - 1] : null;
  const next = index >= 0 && index < episodes.length - 1 ? episodes[index + 1] : null;
  // Dub only where this episode has one (ani.pm would fall back to sub anyway).
  const wanted = params.get('lang') || loadLastEpisode(id)?.lang || 'sub';
  const hasDub = !!info?.available?.dub;
  const lang = wanted === 'dub' && (hasDub || !info) ? 'dub' : 'sub';

  // The frame loads once per title, episode and version, starting where this browser stopped.
  const src = useMemo(
    () => animeEmbedUrl({ id, episode, lang, start: loadAnimeProgress(id, episode)?.t || 0 }),
    [id, episode, lang]
  );

  // Progress from the player: saved every few seconds, and the next episode when one ends.
  const frameRef = useRef(null);
  const nextRef = useRef(null);
  useEffect(() => {
    nextRef.current = next ? () => navigate(`/anime/${id}/${next.number}${lang === 'dub' && next.available?.dub ? '?lang=dub' : ''}`) : null;
  }, [next, id, lang, navigate]);
  useEffect(() => {
    let lastSaved = -SAVE_EVERY_S;
    const onMessage = (event) => {
      const msg = readAniPmMessage(event, frameRef.current?.contentWindow);
      if (!msg) return;
      if (msg.event === 'timeupdate') {
        const t = Number(msg.data.currentTime);
        const duration = Number(msg.data.duration);
        if (Number.isFinite(t) && Math.abs(t - lastSaved) >= SAVE_EVERY_S) {
          lastSaved = t;
          saveAnimeProgress(id, episode, lang, t, duration);
        }
      }
      if (msg.event === 'ended') {
        saveAnimeProgress(id, episode, lang, 1, 1); // finished: next time from the top
        nextRef.current?.(); // ani.pm's own auto next is off (aniPm.js), so this page stays in step
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [id, episode, lang]);

  const setLang = (l) => setParams(l === 'dub' ? { lang: 'dub' } : {}, { replace: true });
  const title = data?.title || 'Anime';
  const epLabel = info?.title ? `Episode ${episode} · ${info.title}` : `Episode ${episode}`;

  return (
    <div className="font-body text-white">
      <Helmet><title>{`${title} ${epLabel} · MovieHub`}</title></Helmet>
      <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-20 md:px-8 md:pt-24">
        <div className="mb-4 flex items-center gap-3">
          <Link to={`/anime/${id}`} aria-label={`Back to ${title}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10">
            <ArrowLeft size={22} aria-hidden="true" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold md:text-xl">{title}</h1>
            <p className="truncate text-sm text-muted">{epLabel}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            <div className="relative aspect-video w-full overflow-hidden rounded-panel bg-black">
              <iframe
                ref={frameRef}
                key={src}
                src={src}
                title={`${title}, ${epLabel}`}
                className="absolute inset-0 h-full w-full border-0"
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media; screen-wake-lock"
                allowFullScreen
                referrerPolicy="origin"
                onLoad={() => helloAniPm(frameRef.current?.contentWindow)}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div role="group" aria-label="Audio" className="inline-flex rounded-full border border-line bg-raised/70 p-1">
                {['sub', 'dub'].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    disabled={l === 'dub' && info && !hasDub}
                    aria-pressed={lang === l}
                    title={l === 'dub' && info && !hasDub ? 'No dub for this episode' : undefined}
                    className={`h-8 rounded-full px-4 text-xs font-bold uppercase motion-safe:transition-colors disabled:opacity-35 ${lang === l ? 'bg-accent text-white' : 'text-white/75 hover:text-white'}`}
                  >
                    {l === 'sub' ? 'Sub' : 'Dub'}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex gap-2">
                {prev && (
                  <Link to={`/anime/${id}/${prev.number}${lang === 'dub' && prev.available?.dub ? '?lang=dub' : ''}`} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line-strong px-4 text-sm font-semibold hover:bg-white/5">
                    <ChevronLeft size={16} aria-hidden="true" /> Episode {prev.number}
                  </Link>
                )}
                {next && (
                  <Link to={`/anime/${id}/${next.number}${lang === 'dub' && next.available?.dub ? '?lang=dub' : ''}`} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-black hover:bg-white/90">
                    Episode {next.number} <ChevronRight size={16} aria-hidden="true" />
                  </Link>
                )}
              </div>
            </div>
            <p className="mt-3 text-xs text-subtle">Player by ani.pm. Subtitles, quality and skip intro are in its own controls.</p>
          </div>

          <aside aria-labelledby="anime-watch-episodes" className="min-w-0 lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto lg:pr-1">
            <h2 id="anime-watch-episodes" className="mb-3 text-base font-semibold">Episodes</h2>
            {data ? <AnimeEpisodes id={id} episodes={episodes} current={episode} lang={lang} compact /> : <div className="h-40 rounded-panel border border-line bg-card motion-safe:animate-pulse" aria-hidden="true" />}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default AnimeWatch;
