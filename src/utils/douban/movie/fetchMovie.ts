const TMDB_API_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG_BASE = "https://image.tmdb.org/t/p/w500";

export interface MovieInfo {
    title: string;
    originalTitle?: string;
    director: string[];
    screenwriter: string[];
    cast: string[];
    genre: string[];
    country: string[];
    language: string[];
    releaseDate?: string;
    runtime?: string;
    alsoKnownAs: string[];
    imdbId?: string;
    tmdbUrl?: string;
    rating?: string;
    ratingCount?: string;
    cover?: string;
    description?: string;
}

export async function fetchTMDBMovie(tmdbId: number, apiKey: string, plugin?: any): Promise<MovieInfo> {
    if (!apiKey) {
        throw new Error("请先在设置中填写 TMDB API Key");
    }

    const url = `${TMDB_API_BASE}/movie/${tmdbId}?api_key=${apiKey}&language=zh-CN&append_to_response=credits`;

    let data: any;
    if (plugin?.client?.$fetch) {
        const res = await plugin.client.$fetch(url, { method: "GET" });
        if (!res.ok) {
            if (res.status === 401) throw new Error("TMDB API Key 无效");
            if (res.status === 404) throw new Error("未找到该电影");
            throw new Error(`TMDB 请求失败 (${res.status})`);
        }
        data = await res.json();
    } else {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 401) throw new Error("TMDB API Key 无效");
            if (response.status === 404) throw new Error("未找到该电影");
            throw new Error(`TMDB 请求失败 (${response.status})`);
        }
        data = await response.json();
    }

    return parseTMDBMovie(data);
}

interface TMDBMovieDetail {
    id: number;
    title: string;
    original_title: string;
    poster_path: string | null;
    vote_average: number;
    vote_count: number;
    overview: string;
    release_date: string;
    runtime: number | null;
    imdb_id: string | null;
    genres: { id: number; name: string }[];
    production_countries: { iso_3166_1: string; name: string }[];
    spoken_languages: { iso_639_1: string; name: string }[];
    credits: {
        cast: { name: string; character: string; order: number }[];
        crew: { name: string; job: string; department: string }[];
    };
}

function parseTMDBMovie(data: TMDBMovieDetail): MovieInfo {
    const credits = data.credits || { cast: [], crew: [] };

    const directors = credits.crew
        .filter((c) => c.job === "Director")
        .map((c) => c.name);

    const writers = credits.crew
        .filter((c) => c.department === "Writing")
        .map((c) => c.name);

    const topCast = credits.cast
        .sort((a, b) => a.order - b.order)
        .slice(0, 8)
        .map((c) => c.name);

    const genres = (data.genres || []).map((g) => g.name);
    const countries = (data.production_countries || []).map((c) => c.name);
    const languages = (data.spoken_languages || []).map((l) => l.name);

    const posterPath = data.poster_path
        ? `${TMDB_IMG_BASE}${data.poster_path}`
        : "";

    const runtime = data.runtime ? `${data.runtime}分钟` : "";

    return {
        title: data.title?.trim() || "未知片名",
        originalTitle: data.original_title?.trim() || undefined,
        director: directors.length > 0 ? directors : [""],
        screenwriter: writers.length > 0 ? writers : [""],
        cast: topCast.length > 0 ? topCast : [""],
        genre: genres.length > 0 ? genres : [""],
        country: countries.length > 0 ? countries : [""],
        language: languages.length > 0 ? languages : [""],
        releaseDate: data.release_date || undefined,
        runtime: runtime || undefined,
        alsoKnownAs: [],
        imdbId: data.imdb_id || undefined,
        tmdbUrl: `https://www.themoviedb.org/movie/${data.id}`,
        rating: data.vote_average ? data.vote_average.toFixed(1) : undefined,
        ratingCount: data.vote_count ? String(data.vote_count) : undefined,
        cover: posterPath || undefined,
        description: data.overview?.trim() || undefined,
    };
}
