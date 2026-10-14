import { fetchSyncPost } from "siyuan";
import { sql, setBlockAttrs } from "@/api";
import { changeMovieMainKeyName } from './changeMainKeyName';
import { generateUniqueBlocked, parseDateToTimestamp } from '../core/formatOp';
import { getImage, downloadCover } from "@/utils/core/getImg";

export async function loadAVMovieData(avID: string, fullData: any, plugin: any) {
    try {
        let originalDatabase = await fetchSyncPost("/api/av/getAttributeView", { "id": avID });
        if (!originalDatabase?.data?.av) {
            throw new Error("未找到数据库属性视图，请确保已创建观影笔记数据库");
        }
        let originalDatabasekeyValues = originalDatabase.data.av.keyValues;

        // 去重：按 IMDb编号 列检查
        if (originalDatabasekeyValues && Array.isArray(originalDatabasekeyValues)) {
            const imdbKey = originalDatabasekeyValues.find((kv: any) => kv.key?.name === "IMDb编号");
            const movieNameKey = originalDatabasekeyValues.find((kv: any) => kv.key?.name === "电影名");

            // 清理孤儿 block
            if (imdbKey && movieNameKey) {
                const imdbColumn = imdbKey.values || [];
                const nameColumn = movieNameKey.values || [];

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
                        return { code: 1, msg: "电影已存在，跳过添加操作" };
                    }
                }
            }
        }

        let databaseKeys: any;
        await fetchSyncPost("/api/av/getAttributeViewKeysByAvID", { avID }).then((res) => databaseKeys = res.data);

        // 确保主键为"电影名"
        if (databaseKeys[0].name !== "电影名") { await changeMovieMainKeyName(avID); }

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

        // 定义电影属性列
        const requiredMovieAttributes = [
            "电影名", "原名", "封面", "导演", "编剧", "主演", "类型",
            "制片国家/地区", "语言", "上映日期", "片长", "IMDb编号",
            "链接", "评分", "评分人数", "我的评分", "观影状态",
            "电影分类", "开始日期", "看完日期", "剧情简介"
        ].reverse();

        // 添加缺失列
        for (const attributeName of requiredMovieAttributes) {
            const existingAttribute = databaseKeys.find(key => key.name === attributeName);
            if (!existingAttribute) {
                await fetchSyncPost("/api/av/addAttributeViewKey", {
                    avID,
                    keyID: generateUniqueBlocked(),
                    keyName: attributeName,
                    keyType: getMovieAttributeType(attributeName),
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
        const blocksValues = buildMovieBlocksValues(databaseKeys, fullData);

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
        const movieNameKeyNew = updatedKeyValues.find((kv: any) => kv.key?.name === "电影名");
        let blockID: string | null = null;

        if (movieNameKeyNew) {
            const matchingValue = movieNameKeyNew.values.find((value: any) =>
                value.block && value.block.content === fullData.title
            );
            if (matchingValue) {
                blockID = matchingValue.blockID;
            }
        }

        if (!blockID) {
            throw new Error("无法找到新添加电影的 blockID");
        }

        // 创建观影笔记
        if (fullData.addNotes) {
            const sqlresult = await sql(`SELECT * FROM blocks WHERE id = "${fullData.databaseBlockId}"`);

            const setting = await plugin.loadData("settings.json");
            const isSYTemplateRender = setting.isSYTemplateRender;

            const renderTemplate = (tmpl: string) =>
                tmpl
                    .replace(/{{电影名}}/g, fullData.title || '无标题')
                    .replace(/{{原名}}/g, fullData.originalTitle || '')
                    .replace(/{{导演}}/g, Array.isArray(fullData.director) ? fullData.director.join('、') : fullData.director || '')
                    .replace(/{{编剧}}/g, Array.isArray(fullData.screenwriter) ? fullData.screenwriter.join('、') : fullData.screenwriter || '')
                    .replace(/{{主演}}/g, Array.isArray(fullData.cast) ? fullData.cast.join('、') : fullData.cast || '')
                    .replace(/{{类型}}/g, Array.isArray(fullData.genre) ? fullData.genre.join('、') : fullData.genre || '')
                    .replace(/{{制片国家\/地区}}/g, Array.isArray(fullData.country) ? fullData.country.join('、') : fullData.country || '')
                    .replace(/{{语言}}/g, Array.isArray(fullData.language) ? fullData.language.join('、') : fullData.language || '')
                    .replace(/{{上映日期}}/g, fullData.releaseDate || '')
                    .replace(/{{片长}}/g, fullData.runtime || '')
                    .replace(/{{IMDb编号}}/g, fullData.imdbId || '')
                    .replace(/{{链接}}/g, fullData.tmdbUrl || fullData.doubanUrl || '')
                    .replace(/{{评分}}/g, fullData.rating ? `${fullData.rating}` : '无评分')
                    .replace(/{{评分人数}}/g, fullData.ratingCount ? `${fullData.ratingCount}` : '0')
                    .replace(/{{我的评分}}/g, fullData.myRating || '未评分')
                    .replace(/{{观影状态}}/g, fullData.watchingStatus || '未看')
                    .replace(/{{电影分类}}/g, fullData.movieCategory || '默认分类')
                    .replace(/{{开始日期}}/g, fullData.startDate || '未开始')
                    .replace(/{{看完日期}}/g, fullData.finishDate || '未完成')
                    .replace(/{{封面}}/g, fullData.cover || '')
                    .replace(/{{剧情简介}}/g, fullData.description || '');

            if (!isSYTemplateRender) {
                const response = await fetchSyncPost('/api/filetree/createDocWithMd', {
                    id: blockID,
                    parentID: sqlresult[0].root_id,
                    notebook: sqlresult[0].box,
                    path: sqlresult[0].hpath + "/" + fullData.title,
                    markdown: renderTemplate(fullData.noteTemplate)
                });

                if (response.code !== 0) {
                    throw new Error(response.msg || "创建观影笔记失败");
                }
            } else {
                await fetchSyncPost('/api/filetree/createDocWithMd', {
                    id: blockID,
                    parentID: sqlresult[0].root_id,
                    notebook: sqlresult[0].box,
                    path: sqlresult[0].hpath + "/" + fullData.title,
                    markdown: ""
                });

                await plugin.saveData("movieNoteTemplate.md", renderTemplate(fullData.noteTemplate));

                const res = await plugin.client.getConf();
                const dataDir = res.data.conf.system.dataDir;
                const respo = await plugin.client.render({
                    id: blockID,
                    path: dataDir + "/storage/petal/siyuan-douban/movieNoteTemplate.md",
                });
                await plugin.client.updateBlock({
                    id: blockID,
                    data: respo.data.content,
                    dataType: "dom",
                });
            }

            await setBlockAttrs(blockID, { 'custom-avs': avID });

            const matchingRow = movieNameKeyNew.values.find((v: any) => v.blockID === blockID);
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

        return { code: 0, msg: "电影添加成功" };
    } catch (error) {
        return { code: 1, msg: error.message || "未知错误", stack: error.stack };
    }
}

function getMovieAttributeType(attributeName: string): string {
    switch (attributeName) {
        case "原名":
        case "导演":
        case "编剧":
        case "主演":
        case "类型":
        case "制片国家/地区":
        case "语言":
        case "片长":
        case "剧情简介":
            return "text";
        case "IMDb编号":
            return "text";
        case "评分":
        case "评分人数":
            return "number";
        case "我的评分":
        case "观影状态":
        case "电影分类":
            return "select";
        case "上映日期":
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

function buildMovieBlocksValues(databaseKeys: any[], fullData: any) {
    const blockValues = [];

    for (const key of databaseKeys) {
        const keyValue: any = { keyID: key.id, name: key.name };

        switch (key.name) {
            case "电影名":
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
            case "上映日期":
                keyValue.date = {
                    content: fullData.releaseDate ? parseDateToTimestamp(fullData.releaseDate) : null,
                    isNotEmpty: !!fullData.releaseDate,
                    isNotTime: true
                };
                break;
            case "片长":
                keyValue.text = { content: fullData.runtime || "" };
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
            case "观影状态":
                keyValue.mSelect = [{ content: fullData.watchingStatus || "" }];
                break;
            case "电影分类":
                keyValue.mSelect = [{ content: fullData.movieCategory || "" }];
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
