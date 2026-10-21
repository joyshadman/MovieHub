import { movieApi } from '../services/movieApi';

// Regional and anime collections (spec 0002, feature 10).
// `types` lists the media types a collection offers; the first one is the default. `to` sends a
// collection to its own section instead (Anime lives at /anime on ani.pm, spec 0008).
export const COLLECTIONS = [
  {
    slug: 'bangla',
    title: 'Best of Bangla',
    blurb: 'The best of Dhallywood and Tollywood, from classics to new releases.',
    colors: ['#065F46', '#9F1239'],
    types: ['movie'],
    fetch: (type, page) => movieApi.getBanglaMovies(page),
  },
  {
    slug: 'hollywood',
    title: 'Hollywood',
    blurb: 'Blockbusters and award winners from the American studios.',
    colors: ['#1E3A8A', '#B45309'],
    types: ['movie', 'tv'],
    fetch: (type, page) => movieApi.discoverAdvanced({ type, language: 'en', originCountry: 'US', page }),
  },
  {
    slug: 'bollywood',
    title: 'Bollywood',
    blurb: 'Big songs, bigger stories: the most loved Hindi films.',
    colors: ['#C2410C', '#BE185D'],
    types: ['movie'],
    fetch: (type, page) => movieApi.getBollywood(page),
  },
  {
    slug: 'korean',
    title: 'Korean Wave',
    blurb: 'K dramas and Korean cinema everyone is talking about.',
    colors: ['#0E7490', '#6D28D9'],
    types: ['tv', 'movie'],
    fetch: (type, page) => movieApi.discoverAdvanced({ type, language: 'ko', page }),
  },
  {
    slug: 'japanese',
    title: 'Japanese Cinema',
    blurb: 'Live action films and series from Japan.',
    colors: ['#9F1239', '#1F2937'],
    types: ['movie', 'tv'],
    fetch: (type, page) => movieApi.discoverAdvanced({ type, language: 'ja', withoutGenres: 16, page }),
  },
  {
    slug: 'anime',
    to: '/anime',
    title: 'Anime',
    blurb: 'Japanese animation, from shonen epics to quiet slice of life.',
    colors: ['#6D28D9', '#BE185D'],
    types: ['tv', 'movie'],
    fetch: (type, page) => movieApi.getAnime(type, page),
  },
];

export const findCollection = (slug) => COLLECTIONS.find((c) => c.slug === slug) || null;
