import { fetchSyncPost } from "siyuan";
import { formatTime } from './formatOp';

/**
 * 通过 forwardProxy 直连豆瓣图片 CDN
 */
async function fetchImageViaProxy(url: string, referrer: string, timeout: number = 10000): Promise<string> {
    const response = await fetchSyncPost("/api/network/forwardProxy", {
        url: url,
        method: "GET",
        timeout: timeout,
        contentType: "image/jpeg",
        headers: [
            { name: "User-Agent", value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0" },
            { name: "sec-ch-ua", value: '"Chromium";v="148", "Microsoft Edge";v="148", "Not/A)Brand";v="99"' },
            { name: "sec-ch-ua-mobile", value: "?0" },
            { name: "sec-ch-ua-platform", value: '"Windows"' },
            { name: "Referer", value: referrer },
        ],
        payload: {},
        payloadEncoding: "text",
        responseEncoding: "base64",
    });
    if (response?.data?.body && response.data.status === 200) {
        const contentType = response.data.headers?.["Content-Type"]?.[0] || response.data.contentType || "image/jpeg";
        return `data:${contentType};base64,${response.data.body}`;
    }
    return "";
}

/**
 * 尝试从豆瓣图片CDN（img1~img9）下载封面
 * @param url 封面图片URL
 * @param referrer 豆瓣书籍页面URL（用作Referer头）
 */
export async function getImage(url: string, referrer: string = "https://book.douban.com/"): Promise<string> {
    if (!url) {
        console.warn("封面 URL 为空，跳过下载");
        return "";
    }

    // 生成多个CDN主机地址（img1~img9）
    const imgHosts = ['img9', 'img1', 'img2', 'img3'];
    const urlsToTry: string[] = [url];
    const match = url.match(/https:\/\/img(\d)\.doubanio\.com/);
    if (match) {
        const currentHost = parseInt(match[1]);
        for (const host of imgHosts) {
            const hostNum = parseInt(host.replace('img', ''));
            if (hostNum !== currentHost) {
                urlsToTry.push(url.replace(`img${currentHost}.doubanio.com`, `${host}.doubanio.com`));
            }
        }
    }

    // 依次尝试各CDN主机
    for (const tryUrl of urlsToTry) {
        try {
            const result = await fetchImageViaProxy(tryUrl, referrer, 8000);
            if (result) return result;
        } catch (e) {
            // 忽略错误，尝试下一个
        }
    }

    console.warn("所有豆瓣图片CDN主机均无法下载封面");
    return "";
}

export async function downloadCover(base64Data: string, title: string,) {
    // 从base64数据中提取MIME类型
    const matches = base64Data.match(/^data:(image\/\w+);base64,/);
    if (!matches || matches.length < 2) {
        throw new Error('无效的Base64图片数据');
    }

    const mimeType = matches[1];
    const fileExt = mimeType.split('/')[1] || 'jpg';
    const cleanTitle = title.replace(/[^\w\u4e00-\u9fa5]/g, '_');
    const timestamp = formatTime();

    // 生成文件名（保持与原逻辑一致）
    const fileName = `${cleanTitle}_${timestamp}.${fileExt}`;
    const filePath = `/data/assets/covers/${fileName}`;

    // 创建文件对象
    const byteString = atob(base64Data.split(',')[1]);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
    }
    const imageFile = new File([uint8Array], fileName, { type: mimeType });

    // 使用思源 API 上传文件
    const formData = new FormData();
    formData.append("path", filePath);
    formData.append("file", imageFile);
    const response = await fetchSyncPost('/api/file/putFile', formData);

    if (response.code !== 0) {
        throw new Error(response.msg || "封面保存失败");
    }

    return `assets/covers/${fileName}`;
}