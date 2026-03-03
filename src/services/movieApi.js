const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const BACKDROP_BASE = "https://image.tmdb.org/t/p/original";
const FALLBACK = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1000";

const MOCK_FALLBACKS = [
  {
    id: "mock1",
    title: "Interstellar",
    backdrop_path: "/xJHbt7SqcBrUrGv8S78p8e49VQC.jpg",
    poster_path: "/gEU2QniE6E77vl6P3pG2G1LpEbA.jpg",
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
    overview: item.overview || "No description available.",
    genres: item.genres?.map(g => g.name) || [],
    runtime: item.runtime || (item.episode_run_time ? item.episode_run_time[0] : null),
    tagline: item.tagline || "",
    status: item.status || "Unknown"
  };
};

export const movieApi = {
  // FETCH FULL DETAILS
  getDetails: async (type, id) => {
    try {
      let endpoint = type === "tv" ? "tv" : "movie";
      let response = await fetch(
        `${BASE_URL}/${endpoint}/${id}?append_to_response=credits,similar,videos`, 
        getOptions()
      );

      if (response.status === 404) {
        endpoint = endpoint === "tv" ? "movie" : "tv";
        response = await fetch(
          `${BASE_URL}/${endpoint}/${id}?append_to_response=credits,similar,videos`, 
          getOptions()
        );
      }

      if (!response.ok) throw new Error("Signal Lost");
      
      const data = await response.json();
      const actualType = data.first_air_date ? 'tv' : 'movie';
      const formatted = formatItem(data, actualType);

      return {
        ...formatted,
        cast: (data.credits?.cast || []).slice(0, 12).map(actor => ({
          id: actor.id,
          name: actor.name,
          character: actor.character,
          profile: actor.profile_path ? `${IMAGE_BASE}${actor.profile_path}` : FALLBACK
        })),
        similar: (data.similar?.results || []).map(s => formatItem(s, actualType)),
        trailer: data.videos?.results?.find(v => v.type === "Trailer")?.key || null
      };
    } catch (error) {
      console.error("Fetch Details Error:", error);
      return null;
    }
  },

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

  // TOP RATED (Movies / TV)
  getTopRated: async (type = "movie") => {
    try {
      const endpoint = type === "tv" ? "tv" : "movie";
      const response = await fetch(`${BASE_URL}/${endpoint}/top_rated`, getOptions());
      if (!response.ok) throw new Error("API Failure");
      const data = await response.json();
      return {
        results: (data.results || []).map(item => formatItem(item, type)),
        total_pages: data.total_pages || 1
      };
    } catch (error) {
      return { results: [], total_pages: 1 };
    }
  },

  // POPULAR (Movies / TV)
  getPopular: async (type = "movie") => {
    try {
      const endpoint = type === "tv" ? "tv" : "movie";
      const response = await fetch(`${BASE_URL}/${endpoint}/popular`, getOptions());
      if (!response.ok) throw new Error("API Failure");
      const data = await response.json();
      return {
        results: (data.results || []).map(item => formatItem(item, type)),
        total_pages: data.total_pages || 1
      };
    } catch (error) {
      return { results: [], total_pages: 1 };
    }
  },

  search: async (query, page = 1) => {
    try {
      const response = await fetch(
        `${BASE_URL}/search/multi?query=${encodeURIComponent(query)}&page=${page}`, 
        getOptions()
      );
      const data = await response.json();
      return {
        results: (data.results || []).filter(i => i.media_type !== "person").map(i => formatItem(i)),
        total_pages: data.total_pages || 1
      };
    } catch (error) { 
      return { results: [], total_pages: 1 }; 
    }
  },

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

  // NEW: BOLLYWOOD SPECIALIZED DISCOVER
  getBollywood: async (page = 1) => {
    try {
      // Using Hindi language and India origin country filters
      const response = await fetch(
        `${BASE_URL}/discover/movie?with_original_language=hi&with_origin_country=IN&sort_by=popularity.desc&page=${page}`, 
        getOptions()
      );
      const data = await response.json();
      return {
        results: (data.results || []).map(i => formatItem(i, "movie")),
        totalPages: data.total_pages || 1
      };
    } catch (error) {
      return { results: [], totalPages: 0 };
    }
  },

  // NEW: ADVANCED DISCOVER (For Search Page Filters)
  discover: async (type, { genre, year, page = 1 }) => {
    try {
      const genreParam = genre ? `&with_genres=${genre}` : '';
      const yearParam = year ? `&primary_release_year=${year}` : '';
      const endpoint = type === 'all' ? 'movie' : type;

      const response = await fetch(
        `${BASE_URL}/discover/${endpoint}?sort_by=popularity.desc${genreParam}${yearParam}&page=${page}`,
        getOptions()
      );
      const data = await response.json();
      return {
        results: (data.results || []).map(i => formatItem(i, endpoint)),
        total_pages: data.total_pages || 1
      };
    } catch (error) {
      return { results: [], total_pages: 1 };
    }
  },

  getExternalIds: async (id, type) => {
    try {
      let endpoint = type === "tv" ? "tv" : "movie";
      let response = await fetch(`${BASE_URL}/${endpoint}/${id}/external_ids`, getOptions());
      if (response.status === 404) {
        endpoint = endpoint === "tv" ? "movie" : "tv";
        response = await fetch(`${BASE_URL}/${endpoint}/${id}/external_ids`, getOptions());
      }
      const data = await response.json();
      return data.imdb_id || null; 
    } catch (error) { return null; }
  },

  getCredits: async (type, id) => {
    try {
      const endpoint = type === "tv" ? "tv" : "movie";
      const response = await fetch(`${BASE_URL}/${endpoint}/${id}/credits`, getOptions());
      const data = await response.json();
      return (data.cast || []).slice(0, 10).map(actor => ({
        name: actor.name,
        character: actor.character,
        profile: actor.profile_path ? `${IMAGE_BASE}${actor.profile_path}` : FALLBACK
      }));
    } catch (error) { return []; }
  }
};