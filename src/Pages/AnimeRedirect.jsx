import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { loadAnimeMap, toTmdb } from '../services/animeMatch';
import { PageLoader } from '../components/ui/feedback';

// Old ani.pm title and watch links (/anime/{anilistId}, /anime/{anilistId}/{episode}). Those pages
// are gone (spec 0010): a title the ID map knows opens its TMDB details page, anything else /anime.
const AnimeRedirect = () => {
  const { id, episode } = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    let cancelled = false;
    loadAnimeMap().then(
      () => {
        if (cancelled) return;
        const t = toTmdb(Number(id), Number(episode) || null);
        if (!t) { navigate('/anime', { replace: true }); return; }
        const q = new URLSearchParams();
        if (t.season) q.set('season', String(t.season));
        if (t.season && t.episode) q.set('episode', String(t.episode));
        navigate(`/${t.type}/${t.tmdbId}${q.size ? `?${q}` : ''}`, { replace: true });
      },
      () => { if (!cancelled) navigate('/anime', { replace: true }); },
    );
    return () => { cancelled = true; };
  }, [id, episode, navigate]);
  return <PageLoader label="Opening the title" className="min-h-screen pt-20" />;
};

export default AnimeRedirect;
