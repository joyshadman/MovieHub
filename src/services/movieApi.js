const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const BACKDROP_BASE = "https://image.tmdb.org/t/p/original";
const FALLBACK = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1000";

const MOCK_FALLBACKS = [
  {
    id: "mock1",
    title: "Interstellar",
    backdrop_path: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=2000",
    poster_path: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1000",
    overview: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    release_date: "2014-11-05",
    vote_average: 8.7
  }
];

const getOptions = () => ({
  method: 'GET',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${import.meta.env.VITE_TMDB_READ_TOKEN}`
  }
});

const formatItem = (item, typeOverride = null) => {
  if (!item) return null;
  const mediaType = typeOverride || item.media_type || (item.first_air_date ? 'tv' : 'movie');
  
  const getImageUrl = (path, base) => {
    if (!path) return FALLBACK;
    if (path.startsWith('http')) return path;
    return `${base}${path}`;
  };

  return {
    id: item.id,
    title: item.title || item.name || "Untitled",
    image: getImageUrl(item.poster_path, IMAGE_BASE),
    backdrop: getImageUrl(item.backdrop_path, BACKDROP_BASE),
    year: (item.release_date || item.first_air_date || "2026").split("-")[0],
    type: mediaType,
    rating: item.vote_average || 0,
    overview: item.overview || "No description available."
  };
};

export const movieApi = {
  getTrending: async (type = "movie") => {
    try {
      const response = await fetch(`${BASE_URL}/trending/${type}/day`, getOptions());
      if (!response.ok) throw new Error("API Failure");
      const data = await response.json();
      if (!data.results || data.results.length === 0) return MOCK_FALLBACKS.map(i => formatItem(i, type));
      return data.results.map((item) => formatItem(item, type));
    } catch (error) {
      return MOCK_FALLBACKS.map(i => formatItem(i, type));
    }
  },

  search: async (query) => {
    try {
      const response = await fetch(`${BASE_URL}/search/multi?query=${encodeURIComponent(query)}`, getOptions());
      const data = await response.json();
      return (data.results || []).filter(i => i.media_type !== "person").map(i => formatItem(i));
    } catch (error) { 
      return []; 
    }
  },

  // FIXED: Added page parameter and returns object with results + totalPages
  getByGenre: async (genreId, type = "movie", page = 1) => {
    try {
      const response = await fetch(
        `${BASE_URL}/discover/${type}?with_genres=${genreId}&sort_by=popularity.desc&page=${page}`, 
        getOptions()
      );
      const data = await response.json();
      return {
        results: (data.results || []).map(i => formatItem(i, type)),
        totalPages: data.total_pages || 1
      };
    } catch (error) {
      return { results: [], totalPages: 0 };
    }
  },

  getExternalIds: async (id, type) => {
    try {
      const endpoint = type === "tv" ? "tv" : "movie";
      const response = await fetch(`${BASE_URL}/${endpoint}/${id}/external_ids`, getOptions());
      const data = await response.json();
      return data.imdb_id || null; 
    } catch (error) { 
      return null; 
    }
  },

  getTVDetails: async (id) => {
    try {
      const response = await fetch(`${BASE_URL}/tv/${id}`, getOptions());
      return await response.json();
    } catch (error) { 
      return null; 
    }
  },

  getSeasonDetails: async (id, seasonNum) => {
    try {
      const response = await fetch(`${BASE_URL}/tv/${id}/season/${seasonNum}`, getOptions());
      return await response.json();
    } catch (error) { 
      return null; 
    }
  }
};