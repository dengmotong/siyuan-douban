const TMDB_API_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG_BASE = "https://image.tmdb.org/t/p/w500";

export interface TvInfo {
    title: string;
    originalTitle?: string;
    director: string[];
    screenwriter: string[];
    cast: string[];
    genre: string[];
    country: string[];
    language: string[];
    firstAirDate?: string;
    lastAirDate?: string;
    seasons?: string;
    episodes?: string;
    episodeRuntime?: string;
    networks: string[];
    alsoKnownAs: string[];
    imdbId?: string;
    tmdbUrl?: string;
    rating?: string;
    ratingCount?: string;
    cover?: string;
    description?: string;
}

export async function fetchTMDBTv(tmdbId: number, apiKey: string, plugin?: any): Promise<TvInfo> {
    if (!apiKey) {
        throw new Error("请先在设置中填写 TMDB API Key");
    }

    const url = `${TMDB_API_BASE}/tv/${tmdbId}?api_key=${apiKey}&language=zh-CN&append_to_response=credits,external_ids`;

    let data: any;
    if (plugin?.client?.$fetch) {
        const res = await plugin.client.$fetch(url, { method: "GET" });
        if (!res.ok) {
            if (res.status === 401) throw new Error("TMDB API Key 无效");
            if (res.status === 404) throw new Error("未找到该电视剧");
            throw new Error(`TMDB 请求失败 (${res.status})`);
        }
        data = await res.json();
    } else {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 401) throw new Error("TMDB API Key 无效");
            if (response.status === 404) throw new Error("未找到该电视剧");
            throw new Error(`TMDB 请求失败 (${response.status})`);
        }
        data = await response.json();
    }

    return parseTMDBTv(data);
}

interface TMDBTvDetail {
    id: number;
    name: string;
    original_name: string;
    poster_path: string | null;
    vote_average: number;
    vote_count: number;
    overview: string;
    first_air_date: string;
    last_air_date: string;
    number_of_seasons: number | null;
    number_of_episodes: number | null;
    episode_run_time: number[] | null;
    imdb_id?: string | null;
    genres: { id: number; name: string }[];
    production_countries: { iso_3166_1: string; name: string }[];
    spoken_languages: { iso_639_1: string; name: string }[];
    networks: { id: number; name: string }[];
    created_by: { id: number; name: string }[];
    external_ids?: { imdb_id?: string | null };
    credits?: {
        cast: { name: string; character: string; order: number }[];
        crew: { name: string; job: string; department: string }[];
    };
}

function parseTMDBTv(data: TMDBTvDetail): TvInfo {
    const credits = data.credits || { cast: [], crew: [] };

    // 电视剧通常没有单一"导演"，TMDB 用 created_by 记录创作者
    const creators = (data.created_by || []).map((c) => c.name);

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
    const networks = (data.networks || []).map((n) => n.name);

    const posterPath = data.poster_path
        ? `${TMDB_IMG_BASE}${data.poster_path}`
        : "";

    const singleRuntime = (data.episode_run_time || [])[0];
    const episodeRuntime = singleRuntime ? `${singleRuntime}分钟` : "";

    const imdbId = data.external_ids?.imdb_id || data.imdb_id || undefined;

    return {
        title: data.name?.trim() || "未知剧名",
        originalTitle: data.original_name?.trim() || undefined,
        director: directors.length > 0 ? directors : (creators.length > 0 ? creators : [""]),
        screenwriter: writers.length > 0 ? writers : (creators.length > 0 ? creators : [""]),
        cast: topCast.length > 0 ? topCast : [""],
        genre: genres.length > 0 ? genres : [""],
        country: countries.length > 0 ? countries : [""],
        language: languages.length > 0 ? languages : [""],
        firstAirDate: data.first_air_date || undefined,
        lastAirDate: data.last_air_date || undefined,
        seasons: data.number_of_seasons ? String(data.number_of_seasons) : undefined,
        episodes: data.number_of_episodes ? String(data.number_of_episodes) : undefined,
        episodeRuntime: episodeRuntime || undefined,
        networks: networks.length > 0 ? networks : [""],
        alsoKnownAs: [],
        imdbId,
        tmdbUrl: `https://www.themoviedb.org/tv/${data.id}`,
        rating: data.vote_average ? data.vote_average.toFixed(1) : undefined,
        ratingCount: data.vote_count ? String(data.vote_count) : undefined,
        cover: posterPath || undefined,
        description: data.overview?.trim() || undefined,
    };
}
