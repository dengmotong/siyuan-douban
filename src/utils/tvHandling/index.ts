import { fetchSyncPost, showMessage } from "siyuan";
import { sql, setBlockAttrs } from "@/api";
import { changeTvMainKeyName } from './changeMainKeyName';
import { generateUniqueBlocked, parseDateToTimestamp } from '../core/formatOp';
import { getImage, downloadCover } from "@/utils/core/getImg";
import { fetchTMDBTvSeasons, type TvEpisode } from "@/utils/douban/tv";

/** 分集笔记默认模板（用户未设置时使用） */
export const DEFAULT_TV_EPISODE_TEMPLATE = `# 📺 {{剧名}} 第{{当前季}}季 第{{当前集}}集 {{集标题}}

![]({{集剧照}})

- 播出日期：{{集播出日期}}
- 时长：{{集时长}}
- 评分：{{集评分}}（{{集评分人数}} 人评价）

---

## 剧情简介
{{集简介}}

---

## 本集笔记
### ✍️ 观剧心得
（在此记录你对本集的感受）

### 🔖 精彩台词
> 在此记录本集台词

### 🖼️ 截图
| # | 截图 | 说明 |
|---|------|------|
| 1 | _在此粘贴剧集截图_ | _写下对截图画面的说明或感受_ |
| 2 | | |
| … | | |`;


export async function loadAVTvData(avID: string, fullData: any, plugin: any) {
    try {
        let originalDatabase = await fetchSyncPost("/api/av/getAttributeView", { "id": avID });
        if (!originalDatabase?.data?.av) {
            throw new Error("未找到数据库属性视图，请确保已创建追剧笔记数据库");
        }
        let originalDatabasekeyValues = originalDatabase.data.av.keyValues;

        // 去重：按 IMDb编号 列检查
        if (originalDatabasekeyValues && Array.isArray(originalDatabasekeyValues)) {
            const imdbKey = originalDatabasekeyValues.find((kv: any) => kv.key?.name === "IMDb编号");
            const tvNameKey = originalDatabasekeyValues.find((kv: any) => kv.key?.name === "剧名");

            // 清理孤儿 block
            if (imdbKey && tvNameKey) {
                const imdbColumn = imdbKey.values || [];
                const nameColumn = tvNameKey.values || [];

                const nameBlockIDs = new Set(nameColumn.map((item: any) => item.blockID));
                const imdbBlockIDs = new Set(imdbColumn.map((item: any) => item.blockID));

                const blockIDsToRemove = Array.from(imdbBlockIDs).filter(
                    id => !nameBlockIDs.has(id) && id !== undefined
                );

                if (blockIDsToRemove.length > 0) {
                    await fetchSyncPost('/api/av/removeAttributeViewBlocks', { avID, srcIDs: blockIDsToRemove });

                    originalDatabase = await fetchSyncPost("/api/av/getAttributeView", { "id": avID });
                    if (!originalDatabase?.data?.av) {
                        throw new Error("重新获取数据库信息失败");
                    }
                    originalDatabasekeyValues = originalDatabase.data.av.keyValues;
                }
            }

            // 查重
            const updatedImdbKey = originalDatabasekeyValues?.find((kv: any) => kv.key?.name === "IMDb编号");
            if (updatedImdbKey && updatedImdbKey.values && Array.isArray(updatedImdbKey.values)) {
                const dedupKey = fullData.imdbId || fullData.tmdbUrl || fullData.doubanUrl;
                if (dedupKey) {
                    const existing = updatedImdbKey.values.find((value: any) =>
                        value.text && value.text.content === dedupKey
                    );
                    if (existing) {
                        return { code: 1, msg: "电视剧已存在，跳过添加操作" };
                    }
                }
            }
        }

        let databaseKeys: any;
        await fetchSyncPost("/api/av/getAttributeViewKeysByAvID", { avID }).then((res) => databaseKeys = res.data);

        // 确保主键为"剧名"
        if (databaseKeys[0].name !== "剧名") { await changeTvMainKeyName(avID); }

        // 清理重复列和废弃列
        const seenNames = new Set<string>();
        const keysToRemove: string[] = [];
        for (const kv of databaseKeys) {
            const name = kv.key?.name;
            if (!name) continue;
            if (name === "单选" || name === "又名") {
                keysToRemove.push(kv.key?.id);
            } else if (seenNames.has(name)) {
                keysToRemove.push(kv.key?.id);
            } else {
                seenNames.add(name);
            }
        }
        if (keysToRemove.length > 0) {
            await fetchSyncPost("/api/av/removeAttributeViewKey", { avID, keyIDs: keysToRemove });
            await fetchSyncPost("/api/av/getAttributeViewKeysByAvID", { avID }).then((res) => databaseKeys = res.data);
        }

        // 定义电视剧属性列
        const requiredTvAttributes = [
            "剧名", "原名", "封面", "导演", "编剧", "主演", "类型",
            "制片国家/地区", "语言", "首播日期", "季数", "集数", "单集片长",
            "电视台", "IMDb编号", "链接", "评分", "评分人数", "我的评分",
            "追剧状态", "电视剧分类", "开始日期", "看完日期", "剧情简介"
        ].reverse();

        // 添加缺失列
        for (const attributeName of requiredTvAttributes) {
            const existingAttribute = databaseKeys.find(key => key.name === attributeName);
            if (!existingAttribute) {
                await fetchSyncPost("/api/av/addAttributeViewKey", {
                    avID,
                    keyID: generateUniqueBlocked(),
                    keyName: attributeName,
                    keyType: getTvAttributeType(attributeName),
                    keyIcon: "",
                    previousKeyID: databaseKeys.at(-1)?.id || "",
                });
            }
        }

        // 获取更新后的列配置
        await fetchSyncPost("/api/av/getAttributeViewKeysByAvID", { avID }).then((res) => databaseKeys = res.data);

        // 下载封面
        if (fullData.cover && fullData.cover.startsWith("http")) {
            const referrer = fullData.tmdbUrl || fullData.doubanUrl || "https://image.tmdb.org/";
            try {
                const coverBase64Data = await getImage(fullData.cover, referrer);
                if (coverBase64Data) {
                    fullData.cover = await downloadCover(coverBase64Data, fullData.title);
                } else {
                    fullData.cover = "";
                    console.warn("封面自动下载失败");
                }
            } catch (error) {
                fullData.cover = "";
                console.warn("封面自动下载异常:", error);
            }
        }

        // 构建数据
        const blocksValues = buildTvBlocksValues(databaseKeys, fullData);

        await fetchSyncPost("/api/av/appendAttributeViewDetachedBlocksWithValues", {
            avID,
            blocksValues: [blocksValues]
        });

        // 获取新添加行的 blockID
        const updatedDatabase = await fetchSyncPost("/api/av/getAttributeView", { "id": avID });
        if (!updatedDatabase?.data?.av?.keyValues) {
            throw new Error("获取更新后的数据库信息失败");
        }
        const updatedKeyValues = updatedDatabase.data.av.keyValues;
        const tvNameKeyNew = updatedKeyValues.find((kv: any) => kv.key?.name === "剧名");
        let blockID: string | null = null;

        if (tvNameKeyNew) {
            const matchingValue = tvNameKeyNew.values.find((value: any) =>
                value.block && value.block.content === fullData.title
            );
            if (matchingValue) {
                blockID = matchingValue.blockID;
            }
        }

        if (!blockID) {
            throw new Error("无法找到新添加电视剧的 blockID");
        }

        // 创建追剧笔记
        if (fullData.addNotes) {
            const sqlresult = await sql(`SELECT * FROM blocks WHERE id = "${fullData.databaseBlockId}"`);

            const setting = await plugin.loadData("settings.json");
            const isSYTemplateRender = setting.isSYTemplateRender;

            const renderTemplate = (tmpl: string) => renderTvTemplate(tmpl, fullData);

            if (!isSYTemplateRender) {
                const response = await fetchSyncPost('/api/filetree/createDocWithMd', {
                    id: blockID,
                    parentID: sqlresult[0].root_id,
                    notebook: sqlresult[0].box,
                    path: sqlresult[0].hpath + "/" + fullData.title,
                    markdown: renderTemplate(fullData.noteTemplate)
                });

                if (response.code !== 0) {
                    throw new Error(response.msg || "创建追剧笔记失败");
                }
            } else {
                await fetchSyncPost('/api/filetree/createDocWithMd', {
                    id: blockID,
                    parentID: sqlresult[0].root_id,
                    notebook: sqlresult[0].box,
                    path: sqlresult[0].hpath + "/" + fullData.title,
                    markdown: ""
                });

                await plugin.saveData("tvNoteTemplate.md", renderTemplate(fullData.noteTemplate));

                const res = await plugin.client.getConf();
                const dataDir = res.data.conf.system.dataDir;
                const respo = await plugin.client.render({
                    id: blockID,
                    path: dataDir + "/storage/petal/siyuan-douban/tvNoteTemplate.md",
                });
                await plugin.client.updateBlock({
                    id: blockID,
                    data: respo.data.content,
                    dataType: "dom",
                });
            }

            await setBlockAttrs(blockID, { 'custom-avs': avID });

            const matchingRow = tvNameKeyNew.values.find((v: any) => v.blockID === blockID);
            if (matchingRow) {
                await fetchSyncPost('/api/av/setAttributeViewBlockAttr', {
                    avID,
                    rowID: blockID,
                    value: {
                        id: matchingRow.id,
                        keyID: matchingRow.keyID,
                        blockID,
                        type: "block",
                        isDetached: false,
                        createdAt: matchingRow.createdAt,
                        updatedAt: matchingRow.updatedAt,
                        block: {
                            id: blockID,
                            content: matchingRow.block.content,
                            created: matchingRow.block.created,
                            updated: matchingRow.block.updated
                        }
                    }
                });
            }
        }

        // 生成分集笔记（可选）
        let episodeCount = 0;
        if (fullData.addEpisodeNotes) {
            episodeCount = await generateEpisodeNotes(fullData, plugin);
        }

        return {
            code: 0,
            msg: episodeCount > 0 ? `电视剧添加成功，已生成 ${episodeCount} 集分集笔记` : "电视剧添加成功"
        };
    } catch (error) {
        return { code: 1, msg: error.message || "未知错误", stack: error.stack };
    }
}

/**
 * 为每集生成一个独立笔记文档。
 * 目录结构：{数据库所在文档}/{剧名}/{第N季|特别篇}/{第NN集 集标题}
 */
async function generateEpisodeNotes(fullData: any, plugin: any): Promise<number> {
    try {
        const setting = await plugin.loadData("settings.json");
        const apiKey = setting?.tmdbApiKey;
        if (!apiKey) {
            showMessage("⚠️ 未配置 TMDB API Key，已跳过分集笔记生成", 5000);
            return 0;
        }

        const tmdbId = fullData.tmdbId || extractTmdbId(fullData.tmdbUrl);
        if (!tmdbId) {
            showMessage("⚠️ 无法识别 TMDB ID，已跳过分集笔记生成", 5000);
            return 0;
        }

        const allSeasons = await fetchTMDBTvSeasons(tmdbId, apiKey, plugin);
        // TMDB 第 0 季是「特别篇」，不属于正片剧集，默认不生成笔记
        const seasons = allSeasons.filter((s) => s.seasonNumber > 0);
        const totalEpisodes = seasons.reduce((sum, s) => sum + s.episodes.length, 0);
        if (totalEpisodes === 0) {
            showMessage("⚠️ 未获取到分集信息，已跳过分集笔记生成", 5000);
            return 0;
        }

        const sqlresult = await sql(`SELECT * FROM blocks WHERE id = "${fullData.databaseBlockId}"`);
        if (!sqlresult?.length) {
            showMessage("❌ 未找到数据库所在文档，已跳过分集笔记生成", 5000);
            return 0;
        }

        const rootPath = `${sqlresult[0].hpath}/${sanitizePathSegment(fullData.title || "未命名剧集")}`;
        const isSYTemplateRender = setting.isSYTemplateRender;
        const template = fullData.episodeNoteTemplate || DEFAULT_TV_EPISODE_TEMPLATE;

        showMessage(`⏳ 正在生成分集笔记（共 ${totalEpisodes} 集）...`, 3000);

        let done = 0;
        for (const season of seasons) {
            const seasonFolder = season.seasonNumber === 0 ? "特别篇" : `第${season.seasonNumber}季`;
            for (const episode of season.episodes) {
                const docPath = `${rootPath}/${seasonFolder}/${sanitizePathSegment(buildEpisodeTitle(episode))}`;
                try {
                    const markdown = renderEpisodeTemplate(template, fullData, episode);
                    const response = await fetchSyncPost('/api/filetree/createDocWithMd', {
                        parentID: sqlresult[0].root_id,
                        notebook: sqlresult[0].box,
                        path: docPath,
                        markdown: isSYTemplateRender ? "" : markdown,
                    });

                    if (response.code !== 0) {
                        console.warn(`创建分集笔记失败（${docPath}）:`, response.msg);
                        continue;
                    }

                    if (isSYTemplateRender && response.data) {
                        await plugin.saveData("tvEpisodeNoteTemplate.md", markdown);
                        const res = await plugin.client.getConf();
                        const dataDir = res.data.conf.system.dataDir;
                        const respo = await plugin.client.render({
                            id: response.data,
                            path: dataDir + "/storage/petal/siyuan-douban/tvEpisodeNoteTemplate.md",
                        });
                        await plugin.client.updateBlock({
                            id: response.data,
                            data: respo.data.content,
                            dataType: "dom",
                        });
                    }

                    done++;
                    if (done % 5 === 0) showMessage(`⏳ 分集笔记 ${done}/${totalEpisodes}`, 2000);
                } catch (error) {
                    console.warn(`创建分集笔记异常（${docPath}）:`, error);
                }
            }
        }

        showMessage(`✅ 已生成 ${done}/${totalEpisodes} 集分集笔记`, 3000);
        return done;
    } catch (error) {
        console.error("生成分集笔记失败:", error);
        showMessage(`❌ 分集笔记生成失败: ${error.message}`, 5000);
        return 0;
    }
}

/** 渲染追剧（总）笔记模板 */
function renderTvTemplate(tmpl: string, fullData: any): string {
    return tmpl
        .replace(/{{剧名}}/g, fullData.title || '无标题')
        .replace(/{{原名}}/g, fullData.originalTitle || '')
        .replace(/{{导演}}/g, Array.isArray(fullData.director) ? fullData.director.join('、') : fullData.director || '')
        .replace(/{{编剧}}/g, Array.isArray(fullData.screenwriter) ? fullData.screenwriter.join('、') : fullData.screenwriter || '')
        .replace(/{{主演}}/g, Array.isArray(fullData.cast) ? fullData.cast.join('、') : fullData.cast || '')
        .replace(/{{类型}}/g, Array.isArray(fullData.genre) ? fullData.genre.join('、') : fullData.genre || '')
        .replace(/{{制片国家\/地区}}/g, Array.isArray(fullData.country) ? fullData.country.join('、') : fullData.country || '')
        .replace(/{{语言}}/g, Array.isArray(fullData.language) ? fullData.language.join('、') : fullData.language || '')
        .replace(/{{首播日期}}/g, fullData.firstAirDate || '')
        .replace(/{{季数}}/g, fullData.seasons || '')
        .replace(/{{集数}}/g, fullData.episodes || '')
        .replace(/{{单集片长}}/g, fullData.episodeRuntime || '')
        .replace(/{{电视台}}/g, Array.isArray(fullData.networks) ? fullData.networks.join('、') : fullData.networks || '')
        .replace(/{{IMDb编号}}/g, fullData.imdbId || '')
        .replace(/{{链接}}/g, fullData.tmdbUrl || fullData.doubanUrl || '')
        .replace(/{{评分}}/g, fullData.rating ? `${fullData.rating}` : '无评分')
        .replace(/{{评分人数}}/g, fullData.ratingCount ? `${fullData.ratingCount}` : '0')
        .replace(/{{我的评分}}/g, fullData.myRating || '未评分')
        .replace(/{{追剧状态}}/g, fullData.watchingStatus || '未看')
        .replace(/{{电视剧分类}}/g, fullData.tvCategory || '默认分类')
        .replace(/{{开始日期}}/g, fullData.startDate || '未开始')
        .replace(/{{看完日期}}/g, fullData.finishDate || '未完成')
        .replace(/{{封面}}/g, fullData.cover || '')
        .replace(/{{剧情简介}}/g, fullData.description || '');
}

/** 分集模板 = 追剧总模板变量 + 分集变量 */
function renderEpisodeTemplate(tmpl: string, fullData: any, episode: TvEpisode): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return renderTvTemplate(tmpl, fullData)
        .replace(/{{当前季}}/g, String(episode.seasonNumber))
        .replace(/{{当前集}}/g, String(episode.episodeNumber))
        .replace(/{{季集}}/g, `S${pad(episode.seasonNumber)}E${pad(episode.episodeNumber)}`)
        .replace(/{{集标题}}/g, episode.name || '')
        .replace(/{{集简介}}/g, episode.overview || '')
        .replace(/{{集播出日期}}/g, episode.airDate || '')
        .replace(/{{集时长}}/g, episode.runtime || '')
        .replace(/{{集剧照}}/g, episode.still || '')
        .replace(/{{集评分}}/g, episode.rating || '无评分')
        .replace(/{{集评分人数}}/g, episode.ratingCount || '0');
}

function buildEpisodeTitle(episode: TvEpisode): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    const name = episode.name ? ` ${episode.name}` : "";
    return `第${pad(episode.episodeNumber)}集${name}`;
}

function extractTmdbId(url?: string): number | null {
    if (!url) return null;
    const match = url.match(/themoviedb\.org\/tv\/(\d+)/);
    return match ? Number(match[1]) : null;
}

/** 去掉不能出现在思源文档路径中的字符 */
function sanitizePathSegment(name: string): string {
    return name.replace(/[\\/:*?"<>|]/g, "_").trim() || "未命名";
}

function getTvAttributeType(attributeName: string): string {
    switch (attributeName) {
        case "原名":
        case "导演":
        case "编剧":
        case "主演":
        case "类型":
        case "制片国家/地区":
        case "语言":
        case "季数":
        case "集数":
        case "单集片长":
        case "电视台":
        case "IMDb编号":
        case "剧情简介":
            return "text";
        case "评分":
        case "评分人数":
            return "number";
        case "我的评分":
        case "追剧状态":
        case "电视剧分类":
            return "select";
        case "首播日期":
        case "开始日期":
        case "看完日期":
            return "date";
        case "封面":
            return "mAsset";
        case "链接":
            return "url";
        default:
            return "text";
    }
}

function buildTvBlocksValues(databaseKeys: any[], fullData: any) {
    const blockValues = [];

    for (const key of databaseKeys) {
        const keyValue: any = { keyID: key.id, name: key.name };

        switch (key.name) {
            case "剧名":
                keyValue.block = { content: fullData.title || "" };
                break;
            case "原名":
                keyValue.text = { content: fullData.originalTitle || "" };
                break;
            case "导演":
                keyValue.text = { content: Array.isArray(fullData.director) ? fullData.director.join(', ') : fullData.director || "" };
                break;
            case "编剧":
                keyValue.text = { content: Array.isArray(fullData.screenwriter) ? fullData.screenwriter.join(', ') : fullData.screenwriter || "" };
                break;
            case "主演":
                keyValue.text = { content: Array.isArray(fullData.cast) ? fullData.cast.join(', ') : fullData.cast || "" };
                break;
            case "类型":
                keyValue.text = { content: Array.isArray(fullData.genre) ? fullData.genre.join(', ') : fullData.genre || "" };
                break;
            case "制片国家/地区":
                keyValue.text = { content: Array.isArray(fullData.country) ? fullData.country.join(', ') : fullData.country || "" };
                break;
            case "语言":
                keyValue.text = { content: Array.isArray(fullData.language) ? fullData.language.join(', ') : fullData.language || "" };
                break;
            case "首播日期":
                keyValue.date = {
                    content: fullData.firstAirDate ? parseDateToTimestamp(fullData.firstAirDate) : null,
                    isNotEmpty: !!fullData.firstAirDate,
                    isNotTime: true
                };
                break;
            case "季数":
                keyValue.text = { content: fullData.seasons || "" };
                break;
            case "集数":
                keyValue.text = { content: fullData.episodes || "" };
                break;
            case "单集片长":
                keyValue.text = { content: fullData.episodeRuntime || "" };
                break;
            case "电视台":
                keyValue.text = { content: Array.isArray(fullData.networks) ? fullData.networks.join(', ') : fullData.networks || "" };
                break;
            case "IMDb编号":
                keyValue.text = { content: fullData.imdbId || "" };
                break;
            case "链接":
                keyValue.url = { content: fullData.tmdbUrl || fullData.doubanUrl || "" };
                break;
            case "评分":
                keyValue.number = {
                    content: fullData.rating ? Number(fullData.rating) : null,
                    formattedContent: fullData.rating || "",
                    isNotEmpty: true
                };
                break;
            case "评分人数":
                keyValue.number = {
                    content: fullData.ratingCount ? Number(fullData.ratingCount) : null,
                    formattedContent: fullData.ratingCount || "",
                    isNotEmpty: true
                };
                break;
            case "我的评分":
                keyValue.mSelect = [{ content: fullData.myRating || "" }];
                break;
            case "追剧状态":
                keyValue.mSelect = [{ content: fullData.watchingStatus || "" }];
                break;
            case "电视剧分类":
                keyValue.mSelect = [{ content: fullData.tvCategory || "" }];
                break;
            case "开始日期":
                keyValue.date = {
                    content: fullData.startDate ? parseDateToTimestamp(fullData.startDate) : null,
                    isNotEmpty: !!fullData.startDate,
                    isNotTime: true
                };
                break;
            case "看完日期":
                keyValue.date = {
                    content: fullData.finishDate ? parseDateToTimestamp(fullData.finishDate) : null,
                    isNotEmpty: !!fullData.finishDate,
                    isNotTime: true
                };
                break;
            case "封面":
                keyValue.mAsset = fullData.cover ? [{ content: fullData.cover, type: "image" }] : [];
                break;
            case "剧情简介":
                keyValue.text = { content: fullData.description || "" };
                break;
            default:
                const keyType = key.type;
                switch (keyType) {
                    case "text": keyValue.text = {}; break;
                    case "number": keyValue.number = {}; break;
                    case "date": keyValue.date = {}; break;
                    case "select": keyValue.mSelect = []; break;
                    case "mAsset": keyValue.mAsset = []; break;
                    case "url": keyValue.url = {}; break;
                    case "block": keyValue.block = {}; break;
                    default: keyValue.text = {};
                }
        }

        blockValues.push(keyValue);
    }

    return blockValues;
}
