import { forwardProxy } from "@/api";

/**
 * 通过 ISBN 或豆瓣 subject ID 获取书籍详情页 HTML
 * @param id ISBN 或豆瓣 subject ID
 */
export async function fetchBookHtml(id: string) {
    const SEARCH_ENGINES = [
        "https://www.google.com",
        "https://www.bing.com",
        "https://yandex.com",
        "https://search.naver.com",
        "https://www.baidu.com",
        "https://www.sogou.com",
        "https://duckduckgo.com",
        "https://startpage.com",
    ];

    // 判断是 ISBN 还是 subject ID
    const isISBN = /^(97(8|9))?\d{9}(\d|X)$/.test(id);
    const url = isISBN
        ? `https://book.douban.com/isbn/${id}`
        : `https://book.douban.com/subject/${id}/`;

    try {
        const response = await forwardProxy(
            url,
            "GET",
            {},
            [
                { name: "User-Agent", value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0" },
                { name: "Referer", value: "https://www.douban.com/" },
                { name: "Accept-Language", value: "zh-CN,zh;q=0.9" },
                { name: "Accept-Encoding", value: "gzip, deflate, br" },
                { name: "Connection", value: "keep-alive" },
                { name: "Referer", value: SEARCH_ENGINES[Math.floor(Math.random() * SEARCH_ENGINES.length)] }
            ],
            10000,
            "text/html"
        );

        if (response?.body) {
            return response.body;
        }
        throw new Error("请求失败");
    } catch (error) {
        const prefix = isISBN ? "通过ISBN号获取豆瓣书籍失败" : "通过豆瓣ID获取书籍失败";
        throw new Error(`${prefix}: ${error.message}`);
    }
}