const TMDB_API_BASE = "https://api.themoviedb.org/3";
const TMDB_STILL_BASE = "https://image.tmdb.org/t/p/w300";

export interface TvEpisode {
    seasonNumber: number;
    episodeNumber: number;
    name: string;
    overview?: string;
    airDate?: string;
    runtime?: string;
    still?: string;
    rating?: string;
    ratingCount?: string;
}

export interface TvSeason {
    seasonNumber: number;
    seasonName: string;
    episodes: TvEpisode[];
}

interface TMDBSeasonBrief {
    season_number: number;
    name: string;
    episode_count: number;
}

interface TMDBEpisodeRaw {
    episode_number: number;
    name: string;
    overview: string;
    air_date: string | null;
    runtime: number | null;
    still_path: string | null;
    vote_average: number;
    vote_count: number;
}

/**
 * 依次拉取电视剧每一季的分集列表（用于生成分集笔记）。
 * 会先请求剧集详情拿到 season 列表，再逐季请求 /tv/{id}/season/{n}。
 */
export async function fetchTMDBTvSeasons(tmdbId: number, apiKey: string, plugin?: any): Promise<TvSeason[]> {
    if (!apiKey) {
        throw new Error("请先在设置中填写 TMDB API Key");
    }

    const detail = await tmdbGet(
        `${TMDB_API_BASE}/tv/${tmdbId}?api_key=${apiKey}&language=zh-CN`,
        plugin,
    );

    const seasonBriefs: TMDBSeasonBrief[] = Array.isArray(detail?.seasons) ? detail.seasons : [];
    if (seasonBriefs.length === 0) return [];

    const sorted = [...seasonBriefs].sort((a, b) => a.season_number - b.season_number);

    // 限制并发，避免一次打爆 TMDB 限流
    const results = await mapLimit(sorted, 4, async (brief) => {
        try {
            const data = await tmdbGet(
                `${TMDB_API_BASE}/tv/${tmdbId}/season/${brief.season_number}?api_key=${apiKey}&language=zh-CN`,
                plugin,
            );
            const episodes: TvEpisode[] = (data?.episodes || []).map((ep: TMDBEpisodeRaw) =>
                parseEpisode(brief.season_number, ep),
            );
            return {
                seasonNumber: brief.season_number,
                seasonName: brief.name || `第 ${brief.season_number} 季`,
                episodes,
            } as TvSeason;
        } catch (error) {
            console.warn(`拉取第 ${brief.season_number} 季分集失败:`, error);
            return {
                seasonNumber: brief.season_number,
                seasonName: brief.name || `第 ${brief.season_number} 季`,
                episodes: [],
            } as TvSeason;
        }
    });

    return results.filter((s) => s.episodes.length > 0);
}

async function tmdbGet(url: string, plugin?: any): Promise<any> {
    if (plugin?.client?.$fetch) {
        const res = await plugin.client.$fetch(url, { method: "GET" });
        if (!res.ok) {
            if (res.status === 401) throw new Error("TMDB API Key 无效");
            if (res.status === 404) throw new Error("未找到该季信息");
            if (res.status === 429) throw new Error("TMDB 请求过于频繁，请稍后重试");
            throw new Error(`TMDB 请求失败 (${res.status})`);
        }
        return await res.json();
    }

    const response = await fetch(url);
    if (!response.ok) {
        if (response.status === 401) throw new Error("TMDB API Key 无效");
        if (response.status === 404) throw new Error("未找到该季信息");
        if (response.status === 429) throw new Error("TMDB 请求过于频繁，请稍后重试");
        throw new Error(`TMDB 请求失败 (${response.status})`);
    }
    return await response.json();
}

function parseEpisode(seasonNumber: number, ep: TMDBEpisodeRaw): TvEpisode {
    return {
        seasonNumber,
        episodeNumber: ep.episode_number,
        name: (ep.name || "").trim(),
        overview: ep.overview?.trim() || undefined,
        airDate: ep.air_date || undefined,
        runtime: ep.runtime ? `${ep.runtime}分钟` : undefined,
        still: ep.still_path ? `${TMDB_STILL_BASE}${ep.still_path}` : undefined,
        rating: ep.vote_average ? ep.vote_average.toFixed(1) : undefined,
        ratingCount: ep.vote_count ? String(ep.vote_count) : undefined,
    };
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let cursor = 0;

    const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
        while (cursor < items.length) {
            const index = cursor++;
            results[index] = await fn(items[index]);
        }
    });

    await Promise.all(workers);
    return results;
}
