import { forwardProxy } from "@/api";

export interface SearchResult {
    title: string;
    url: string;
    cover: string;
    author: string;
    publisher: string;
    publishDate: string;
    rating: string;
    ratingCount: string;
    abstract: string;
}

export async function searchDoubanBooks(keyword: string): Promise<SearchResult[]> {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const response = await forwardProxy(
            `https://search.douban.com/book/subject_search?search_text=${encodedKeyword}&cat=1001`,
            "GET",
            {},
            [
                { name: "User-Agent", value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0" },
                { name: "Referer", value: "https://www.douban.com/" },
                { name: "Accept-Language", value: "zh-CN,zh;q=0.9" },
                { name: "Accept-Encoding", value: "gzip, deflate, br" },
            ],
            15000,
            "text/html"
        );

        if (!response?.body) {
            throw new Error("请求失败");
        }

        return parseSearchResults(response.body);
    } catch (error) {
        throw new Error(`搜索豆瓣书籍失败: ${error.message}`);
    }
}

interface DoubanSearchItem {
    abstract: string;
    abstract_2: string;
    cover_url: string;
    id: number;
    rating: {
        count: number;
        star_count: number;
        value: number;
    };
    title: string;
    url: string;
}

interface DoubanSearchData {
    items: DoubanSearchItem[];
    total: number;
    count: number;
    start: number;
    text: string;
}

function parseSearchResults(html: string): SearchResult[] {
    const results: SearchResult[] = [];

    // 豆瓣新版搜索结果页使用 SPA，数据嵌入在 window.__DATA__ 中
    const match = html.match(/window\.__DATA__\s*=\s*(\{[\s\S]*?\});/);
    if (!match) {
        // 兼容旧版 DOM 解析
        return parseSearchResultsFromDOM(html);
    }

    try {
        const data: DoubanSearchData = JSON.parse(match[1]);
        if (!data?.items || !Array.isArray(data.items)) {
            return results;
        }

        for (const item of data.items) {
            const result = parseSearchItemFromData(item);
            if (result) results.push(result);
        }
    } catch (e) {
        console.error("解析豆瓣搜索 JSON 数据失败:", e);
    }

    return results;
}

function parseSearchItemFromData(item: DoubanSearchItem): SearchResult | null {
    try {
        const title = item.title?.trim() || "";
        if (!title) return null;

        const url = item.url || "";
        const cover = (item.cover_url || "").replace(/^http:/, "https:");

        // 评分
        const rating = item.rating?.value ? String(item.rating.value) : "";
        const ratingCount = item.rating?.count ? String(item.rating.count) : "";

        // abstract 格式: "作者 / 出版社 / 出版日期 / 价格"
        const parts = (item.abstract || "").split("/").map(s => s.trim());
        const author = parts[0] || "";
        // 价格通常在最后一部分，出版信息在倒数第二部分
        const publisher = parts.length > 1 ? parts[parts.length - 2] : "";
        const publishDate = parts.length > 1 ? parts[parts.length - 1] : "";
        const abstract = item.abstract || "";

        return {
            title,
            url,
            cover,
            author,
            publisher,
            publishDate,
            rating,
            ratingCount,
            abstract,
        };
    } catch {
        return null;
    }
}

/**
 * 兼容旧版 DOM 解析方式
 */
function parseSearchResultsFromDOM(html: string): SearchResult[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const results: SearchResult[] = [];

    const items = doc.querySelectorAll(".result");
    if (!items || items.length === 0) {
        const altItems = doc.querySelectorAll(".sc-b7cd25ca-0");
        if (altItems && altItems.length > 0) {
            altItems.forEach((item) => {
                const result = parseSearchItemFromDOM(item);
                if (result) results.push(result);
            });
        }
        return results;
    }

    items.forEach((item) => {
        const result = parseSearchItemFromDOM(item);
        if (result) results.push(result);
    });

    return results;
}

function parseSearchItemFromDOM(item: Element): SearchResult | null {
    try {
        const titleLink = item.querySelector(".title a, h2 a, a[href*='subject']");
        if (!titleLink) return null;

        const title = (titleLink.textContent || "").trim().replace(/\s+/g, " ");
        const href = titleLink.getAttribute("href") || "";
        const url = href.startsWith("http") ? href : `https://book.douban.com${href}`;

        const coverImg = item.querySelector("img[src*='douban'], .pic img, a.nbg img");
        const cover = coverImg?.getAttribute("src")?.replace(/^http:/, "https:") || "";

        const ratingEl = item.querySelector(".rating_nums, .rating-info .rating_nums, .star-rating .rating_nums");
        const rating = ratingEl?.textContent?.trim() || "";
        const ratingCountEl = item.querySelector(".rating_people span, .pl");
        const ratingCountMatch = ratingCountEl?.textContent?.match(/\d+/);
        const ratingCount = ratingCountMatch ? ratingCountMatch[0] : "";

        const pubEl = item.querySelector(".pub, .subject-abstract, .abstract, .pl");
        const pubText = pubEl?.textContent?.trim() || "";

        const parts = pubText.split("/").map(s => s.trim());
        const author = parts[0] || "";
        const publisher = parts.length > 1 ? parts[parts.length - 2] : "";
        const publishDate = parts.length > 1 ? parts[parts.length - 1] : "";

        const abstractEl = item.querySelector(".abstract, .subject-abstract, .detail .abstract");
        const abstract = abstractEl?.textContent?.trim().replace(/\s+/g, " ") || "";

        return {
            title,
            url,
            cover,
            author,
            publisher,
            publishDate,
            rating,
            ratingCount,
            abstract,
        };
    } catch {
        return null;
    }
}
