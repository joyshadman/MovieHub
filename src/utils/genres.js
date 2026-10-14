// TMDB genre ids → display names (movie and TV lists merged; ids do not collide).
export const GENRE_NAMES = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
  10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News', 10764: 'Reality',
  10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics',
};

export const genreName = (id) => GENRE_NAMES[id] || null;

// First readable genre for a title (list items carry genreIds, detail items carry genres).
export const primaryGenre = (movie) => {
  if (movie?.genres?.length) return movie.genres[0];
  const id = (movie?.genreIds || movie?.genre_ids || []).find((g) => GENRE_NAMES[g]);
  return id ? GENRE_NAMES[id] : null;
};

// Movie genre id → closest TV genre id (TV uses its own ids for some genres).
export const TV_GENRE_MAP = {
  28: 10759, 12: 10759, 878: 10765, 14: 10765, 27: 9648, 53: 9648,
  10749: 10766, 35: 35, 18: 18, 16: 16, 99: 99, 10751: 10751, 9648: 9648, 80: 80,
};

// Genres shown as tiles on the Categories page, with Figma style tile colors.
export const CATEGORY_GENRES = [
  { id: 28, name: 'Action', from: '#9F1239', to: '#1E3A8A', blurb: 'Explosive set pieces, high speed chases and heroes who never back down.' },
  { id: 35, name: 'Comedy', from: '#B45309', to: '#7C2D12', blurb: 'Big laughs, sharp writing and feel good stories for any night.' },
  { id: 18, name: 'Drama', from: '#6D28D9', to: '#065F46', blurb: 'Powerful performances and stories that stay with you.' },
  { id: 27, name: 'Horror', from: '#1F2937', to: '#6D28D9', blurb: 'Dread, jump scares and things that go bump in the night.' },
  { id: 878, name: 'Sci-Fi', from: '#0E7490', to: '#9F1239', blurb: 'Distant worlds, future tech and big ideas about where we are going.' },
  { id: 10749, name: 'Romance', from: '#BE185D', to: '#0E7490', blurb: 'Love stories, sweeping and small, happy and heartbreaking.' },
  { id: 53, name: 'Thriller', from: '#0F766E', to: '#B45309', blurb: 'Twists, tension and edge of your seat suspense.' },
  { id: 16, name: 'Animation', from: '#15803D', to: '#BE185D', blurb: 'Hand drawn, stop motion and CGI worlds for every age.' },
  { id: 99, name: 'Documentary', from: '#B45309', to: '#374151', blurb: 'True stories about real people, places and events.' },
  { id: 10751, name: 'Family', from: '#C2410C', to: '#15803D', blurb: 'Stories the whole family can enjoy together.' },
  { id: 9648, name: 'Mystery', from: '#3730A3', to: '#9F1239', blurb: 'Clues, secrets and puzzles waiting to be solved.' },
  { id: 12, name: 'Adventure', from: '#A16207', to: '#1E3A8A', blurb: 'Epic journeys, lost worlds and daring quests.' },
];

export const findCategoryGenre = (id) => CATEGORY_GENRES.find((g) => String(g.id) === String(id)) || null;
