const TMDB_API_BASE = "https://api.themoviedb.org/3";

export interface TvSearchResult {
    title: string;
    url: string;
    cover: string;
    director: string;
    rating: string;
    ratingCount: string;
    abstract: string;
    tmdbId: number;
    firstAirDate?: string;
}

export async function searchTMDBTvs(keyword: string, apiKey: string, plugin?: any): Promise<TvSearchResult[]> {
    if (!apiKey) {
        throw new Error("请先在设置中填写 TMDB API Key");
    }

    const url = `${TMDB_API_BASE}/search/tv?api_key=${apiKey}&query=${encodeURIComponent(keyword)}&language=zh-CN&page=1`;

    let data: any;
    if (plugin?.client?.$fetch) {
        const res = await plugin.client.$fetch(url, { method: "GET" });
        if (!res.ok) {
            if (res.status === 401) throw new Error("TMDB API Key 无效");
            if (res.status === 429) throw new Error("TMDB 请求过于频繁，请稍后重试");
            throw new Error(`TMDB 请求失败 (${res.status})`);
        }
        data = await res.json();
    } else {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 401) throw new Error("TMDB API Key 无效");
            if (response.status === 429) throw new Error("TMDB 请求过于频繁，请稍后重试");
            throw new Error(`TMDB 请求失败 (${response.status})`);
        }
        data = await response.json();
    }

    return (data.results || []).map(parseSearchResult).filter(Boolean) as TvSearchResult[];
}

interface TMDBTvResult {
    id: number;
    name: string;
    original_name: string;
    poster_path: string | null;
    vote_average: number;
    vote_count: number;
    overview: string;
    first_air_date: string;
    genre_ids: number[];
}

function parseSearchResult(item: TMDBTvResult): TvSearchResult | null {
    if (!item.name?.trim()) return null;

    const posterPath = item.poster_path
        ? `https://image.tmdb.org/t/p/w185${item.poster_path}`
        : "";

    return {
        title: item.name.trim(),
        url: `https://www.themoviedb.org/tv/${item.id}`,
        cover: posterPath,
        director: "",
        rating: item.vote_average ? item.vote_average.toFixed(1) : "",
        ratingCount: item.vote_count ? String(item.vote_count) : "",
        abstract: item.overview?.trim() || "",
        tmdbId: item.id,
        firstAirDate: item.first_air_date || "",
    };
}
