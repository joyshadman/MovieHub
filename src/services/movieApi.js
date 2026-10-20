const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const BACKDROP_BASE = "https://image.tmdb.org/t/p/original";
// Missing images return null; components render fallbackGradient() instead (spec 0001).
const FALLBACK = null;

// TMDB auth: the v4 read token (VITE_TMDB_READ_TOKEN) when it is set, else the v3 key
// (VITE_TMDB_API_KEY) as an api_key query param. Never both: a "Bearer undefined" header makes
// TMDB answer 401 even with a valid key.
const READ_TOKEN = import.meta.env.VITE_TMDB_READ_TOKEN;
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

export const tmdbAuthHeaders = () => ({
  accept: 'application/json',
  ...(READ_TOKEN ? { Authorization: `Bearer ${READ_TOKEN}` } : {}),
});

export const withTmdbKey = (url) => {
  if (READ_TOKEN || !API_KEY || !String(url).startsWith(BASE_URL)) return url;
  const u = new URL(url);
  u.searchParams.set('api_key', API_KEY);
  return u.toString();
};

const tmdbFetch = (url, options) => fetch(withTmdbKey(url), options);

const getOptions = () => ({
  method: 'GET',
  headers: tmdbAuthHeaders(),
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
    genreIds: item.genre_ids || item.genres?.map(g => g.id) || [],
    votes: item.vote_count || 0,
    language: item.original_language || null,
    runtime: item.runtime || (item.episode_run_time ? item.episode_run_time[0] : null),
    tagline: item.tagline || "",
    status: item.status || "Unknown"
  };
};

// Hover preview trailer keys, cached per title (a pending promise is cached too, so two quick
// hovers on the same card share one request).
const trailerCache = new Map();
const seasonCache = new Map();

export const movieApi = {
  // YouTube key of a title's trailer (teaser as fallback), or null.
  getTrailerKey: (type, id) => {
    const cacheKey = `${type}:${id}`;
    if (!trailerCache.has(cacheKey)) {
      const endpoint = type === "tv" ? "tv" : "movie";
      const request = tmdbFetch(`${BASE_URL}/${endpoint}/${id}/videos`, getOptions())
        .then((res) => (res.ok ? res.json() : { results: [] }))
        .then((data) => {
          const vids = (data.results || []).filter((v) => v.site === "YouTube");
          const pick = vids.find((v) => v.type === "Trailer") || vids.find((v) => v.type === "Teaser") || null;
          return pick?.key || null;
        })
        .catch(() => {
          trailerCache.delete(cacheKey); // let a later hover retry after a network blip
          return null;
        });
      trailerCache.set(cacheKey, request);
    }
    return trailerCache.get(cacheKey);
  },

  // FETCH FULL DETAILS
  getDetails: async (type, id) => {
    try {
      let endpoint = type === "tv" ? "tv" : "movie";
      let response = await tmdbFetch(
        `${BASE_URL}/${endpoint}/${id}?append_to_response=credits,similar,videos,images&include_image_language=en,null`, 
        getOptions()
      );

      if (response.status === 404) {
        endpoint = endpoint === "tv" ? "movie" : "tv";
        response = await tmdbFetch(
          `${BASE_URL}/${endpoint}/${id}?append_to_response=credits,similar,videos,images&include_image_language=en,null`, 
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
        trailer: data.videos?.results?.find(v => v.type === "Trailer")?.key || null,
        videos: (data.videos?.results || [])
          .filter(v => v.site === "YouTube")
          .map(v => ({ key: v.key, name: v.name, type: v.type })),
        directors: (data.credits?.crew || []).filter(c => c.job === "Director").map(c => c.name),
        writers: [...new Set((data.credits?.crew || [])
          .filter(c => c.department === "Writing").map(c => c.name))].slice(0, 3),
        creators: (data.created_by || []).map(c => c.name),
        releaseDate: data.release_date || data.first_air_date || null,
        // Title artwork (transparent logo) for the details hero; English first, then language neutral.
        logo: (() => {
          const logos = data.images?.logos || [];
          const pick = logos.find(l => l.iso_639_1 === "en") || logos.find(l => !l.iso_639_1);
          return pick ? `https://image.tmdb.org/t/p/w500${pick.file_path}` : null;
        })(),
        seasons: data.number_of_seasons || null,
        episodes: data.number_of_episodes || null
      };
    } catch (error) {
      console.error("Fetch Details Error:", error);
      return null;
    }
  },

  getTrending: async (type = "movie") => {
    try {
      const response = await tmdbFetch(`${BASE_URL}/trending/${type}/day`, getOptions());
      if (!response.ok) throw new Error("API Failure");
      const data = await response.json();
      if (!data.results || data.results.length === 0) return [];
      return data.results.map((item) => formatItem(item, type));
    } catch {
      return []; // the row hides and the hero picks a genre instead of a fake card
    }
  },

  // TOP RATED (Movies / TV)
  getTopRated: async (type = "movie") => {
    try {
      const endpoint = type === "tv" ? "tv" : "movie";
      const response = await tmdbFetch(`${BASE_URL}/${endpoint}/top_rated`, getOptions());
      if (!response.ok) throw new Error("API Failure");
      const data = await response.json();
      return {
        results: (data.results || []).map(item => formatItem(item, type)),
        total_pages: data.total_pages || 1
      };
    } catch {
      return { results: [], total_pages: 1 };
    }
  },

  // POPULAR (Movies / TV)
  getPopular: async (type = "movie") => {
    try {
      const endpoint = type === "tv" ? "tv" : "movie";
      const response = await tmdbFetch(`${BASE_URL}/${endpoint}/popular`, getOptions());
      if (!response.ok) throw new Error("API Failure");
      const data = await response.json();
      return {
        results: (data.results || []).map(item => formatItem(item, type)),
        total_pages: data.total_pages || 1
      };
    } catch {
      return { results: [], total_pages: 1 };
    }
  },

  search: async (query, page = 1) => {
    try {
      const response = await tmdbFetch(
        `${BASE_URL}/search/multi?query=${encodeURIComponent(query)}&page=${page}`, 
        getOptions()
      );
      const data = await response.json();
      return {
        results: (data.results || []).filter(i => i.media_type !== "person").map(i => formatItem(i)),
        total_pages: data.total_pages || 1
      };
    } catch { 
      return { results: [], total_pages: 1 }; 
    }
  },

  getByGenre: async (genreId, type = "movie", page = 1) => {
    try {
      const response = await tmdbFetch(
        `${BASE_URL}/discover/${type}?with_genres=${genreId}&sort_by=popularity.desc&page=${page}`, 
        getOptions()
      );
      const data = await response.json();
      return {
        results: (data.results || []).map(i => formatItem(i, type)),
        totalPages: data.total_pages || 1
      };
    } catch {
      return { results: [], totalPages: 0 };
    }
  },

  // NEW: BOLLYWOOD SPECIALIZED DISCOVER
  getBollywood: async (page = 1) => {
    try {
      // Using Hindi language and India origin country filters
      const response = await tmdbFetch(
        `${BASE_URL}/discover/movie?with_original_language=hi&with_origin_country=IN&sort_by=popularity.desc&page=${page}`, 
        getOptions()
      );
      const data = await response.json();
      return {
        results: (data.results || []).map(i => formatItem(i, "movie")),
        totalPages: data.total_pages || 1
      };
    } catch {
      return { results: [], totalPages: 0 };
    }
  },

  // BANGLA MOVIES SPECIALIZED DISCOVER
  getBanglaMovies: async (page = 1) => {
    try {
      const response = await tmdbFetch(
        `${BASE_URL}/discover/movie?with_original_language=bn&sort_by=popularity.desc&page=${page}`,
        getOptions()
      );
      const data = await response.json();
      return {
        results: (data.results || []).map(i => formatItem(i, "movie")),
        totalPages: data.total_pages || 1
      };
    } catch {
      return { results: [], totalPages: 0 };
    }
  },

  // ANIME DISCOVER (movies or TV)
  getAnime: async (type = "tv", page = 1) => {
    try {
      const endpoint = type === "movie" ? "movie" : "tv";
      const response = await tmdbFetch(
        `${BASE_URL}/discover/${endpoint}?with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=${page}`,
        getOptions()
      );
      const data = await response.json();
      return {
        results: (data.results || []).map(i => formatItem(i, endpoint)),
        totalPages: data.total_pages || 1
      };
    } catch {
      return { results: [], totalPages: 0 };
    }
  },

  // NEW: ADVANCED DISCOVER (For Search Page Filters)
  discover: async (type, { genre, year, page = 1 }) => {
    try {
      const genreParam = genre ? `&with_genres=${genre}` : '';
      const yearParam = year ? `&primary_release_year=${year}` : '';
      const endpoint = type === 'all' ? 'movie' : type;

      const response = await tmdbFetch(
        `${BASE_URL}/discover/${endpoint}?sort_by=popularity.desc${genreParam}${yearParam}&page=${page}`,
        getOptions()
      );
      const data = await response.json();
      return {
        results: (data.results || []).map(i => formatItem(i, endpoint)),
        total_pages: data.total_pages || 1
      };
    } catch {
      return { results: [], total_pages: 1 };
    }
  },

  getExternalIds: async (id, type) => {
    try {
      let endpoint = type === "tv" ? "tv" : "movie";
      let response = await tmdbFetch(`${BASE_URL}/${endpoint}/${id}/external_ids`, getOptions());
      if (response.status === 404) {
        endpoint = endpoint === "tv" ? "movie" : "tv";
        response = await tmdbFetch(`${BASE_URL}/${endpoint}/${id}/external_ids`, getOptions());
      }
      const data = await response.json();
      return data.imdb_id || null; 
    } catch { return null; }
  },

  // FILTERED DISCOVER (category pages and collections)
  discoverAdvanced: async ({
    type = "movie", genre, yearFrom, yearTo, minRating, language,
    originCountry, withoutGenres, sort = "popular", page = 1
  }) => {
    const endpoint = type === "tv" ? "tv" : "movie";
    const dateField = endpoint === "tv" ? "first_air_date" : "primary_release_date";
    const today = new Date().toISOString().slice(0, 10);
    const sortBy = {
      popular: "popularity.desc",
      rating: "vote_average.desc",
      newest: `${dateField}.desc`,
    }[sort] || "popularity.desc";

    const params = new URLSearchParams({ sort_by: sortBy, page: String(page) });
    if (genre) params.set("with_genres", String(genre));
    if (withoutGenres) params.set("without_genres", String(withoutGenres));
    if (yearFrom) params.set(`${dateField}.gte`, `${yearFrom}-01-01`);
    if (yearTo) params.set(`${dateField}.lte`, `${yearTo}-12-31`);
    if (sort === "newest" && !yearTo) params.set(`${dateField}.lte`, today);
    if (minRating) params.set("vote_average.gte", String(minRating));
    if (sort === "rating" || minRating) params.set("vote_count.gte", "100");
    if (language) params.set("with_original_language", language);
    if (originCountry) params.set("with_origin_country", originCountry);

    try {
      const response = await tmdbFetch(`${BASE_URL}/discover/${endpoint}?${params}`, getOptions());
      if (!response.ok) throw new Error("API Failure");
      const data = await response.json();
      return {
        results: (data.results || []).map(i => formatItem(i, endpoint)),
        totalPages: Math.min(data.total_pages || 1, 500),
        totalResults: data.total_results || 0
      };
    } catch {
      return { results: [], totalPages: 0, totalResults: 0, error: true };
    }
  },

  // GENRE TITLE COUNT (Categories tiles). TMDB caps unfiltered totals at 20,001,
  // so count titles with at least 10 ratings, which gives real, distinct numbers.
  getGenreCount: async (genreId, type = "movie") => {
    try {
      const endpoint = type === "tv" ? "tv" : "movie";
      const response = await tmdbFetch(`${BASE_URL}/discover/${endpoint}?with_genres=${genreId}&vote_count.gte=10`, getOptions());
      if (!response.ok) throw new Error("API Failure");
      const data = await response.json();
      return data.total_results || 0;
    } catch {
      return null;
    }
  },

  // MOST POPULAR IN A COUNTRY (Top 10 row)
  getPopularInRegion: async (region = "US") => {
    try {
      const response = await tmdbFetch(`${BASE_URL}/movie/popular?region=${encodeURIComponent(region)}`, getOptions());
      if (!response.ok) throw new Error("API Failure");
      const data = await response.json();
      return (data.results || []).slice(0, 10).map(item => formatItem(item, "movie"));
    } catch {
      return [];
    }
  },

  // REVIEWS (read only, TMDB review text)
  getReviews: async (type, id) => {
    try {
      const endpoint = type === "tv" ? "tv" : "movie";
      const response = await tmdbFetch(`${BASE_URL}/${endpoint}/${id}/reviews`, getOptions());
      if (!response.ok) throw new Error("API Failure");
      const data = await response.json();
      return (data.results || []).map(r => ({
        id: r.id,
        author: r.author_details?.name || r.author || "Anonymous",
        rating: r.author_details?.rating ?? null,
        content: r.content || "",
        createdAt: r.created_at || null,
        url: r.url || null
      }));
    } catch {
      return null;
    }
  },

  // One TV season's episodes, cached per show and season (the player and its episode panel share it).
  getSeason: (tvId, season) => {
    const key = `${tvId}:${season}`;
    if (!seasonCache.has(key)) {
      const request = tmdbFetch(`${BASE_URL}/tv/${tvId}/season/${season}`, getOptions())
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`Season ${season} failed`))))
        .then((data) => (data.episodes || []).map((ep) => ({
          id: ep.id,
          episode_number: ep.episode_number,
          name: ep.name,
          overview: ep.overview,
          runtime: ep.runtime,
          air_date: ep.air_date,
          still_path: ep.still_path,
        })))
        .catch((err) => {
          seasonCache.delete(key); // allow a retry later
          throw err;
        });
      seasonCache.set(key, request);
    }
    return seasonCache.get(key);
  },

  getCredits: async (type, id) => {
    try {
      const endpoint = type === "tv" ? "tv" : "movie";
      const response = await tmdbFetch(`${BASE_URL}/${endpoint}/${id}/credits`, getOptions());
      const data = await response.json();
      return (data.cast || []).slice(0, 10).map(actor => ({
        name: actor.name,
        character: actor.character,
        profile: actor.profile_path ? `${IMAGE_BASE}${actor.profile_path}` : FALLBACK
      }));
    } catch { return []; }
  }
};