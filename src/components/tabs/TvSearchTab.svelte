<script lang="ts">
    import type { I18N } from "siyuan";
    import { fetchSyncPost } from "siyuan";
    import { createEventDispatcher } from "svelte";
    import { getImage } from "@/utils/core/getImg";
    import CustomSelect from "@/libs/components/CustomSelect.svelte";

    export let i18n: I18N;
    export let inputVales: string;
    export let tvInfo: any;
    export let statusMessage: string;
    export let tvRatings: string[];
    export let tvCategories: string[];
    export let tvStatuses: string[];
    export let myRatingIndex: number;
    export let categoryIndex: number;
    export let statusIndex: number;

    const dispatch = createEventDispatcher<{
        fetchTvData: void;
        addTv: void;
    }>();

    let coverData = "";
    let coverUploadError = "";

    $: if (tvInfo?.cover && !tvInfo.cover.startsWith("assets/")) {
        coverData = "";
        (async () => {
            try {
                const data = await getImage(
                    tvInfo.cover,
                    tvInfo.doubanUrl || "https://www.themoviedb.org/",
                );
                if (data) coverData = data;
            } catch (error) {
                console.error("Cover loading failed:", error);
            }
        })();
    }

    async function handleUploadCover() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            coverUploadError = "上传中...";
            try {
                const ext = file.name.split(".").pop() || "jpg";
                const cleanName = (tvInfo?.title || "cover").replace(
                    /[^\w\u4e00-\u9fa5]/g,
                    "_",
                );
                const timestamp = Date.now();
                const fileName = `${cleanName}_manual_${timestamp}.${ext}`;
                const savePath = `/data/assets/covers/${fileName}`;
                const refPath = `assets/covers/${fileName}`;
                const renamedFile = new File(
                    [file.slice(0, file.size, file.type)],
                    fileName,
                    { type: file.type },
                );
                const formData = new FormData();
                formData.append("path", savePath);
                formData.append("file", renamedFile);
                const response = await fetchSyncPost(
                    "/api/file/putFile",
                    formData,
                );
                if (response.code === 0) {
                    tvInfo.cover = refPath;
                    coverData = URL.createObjectURL(file);
                    coverUploadError = "✅ 封面上传成功";
                } else {
                    coverUploadError = `❌ 上传失败: ${response.msg || "未知错误"}`;
                }
            } catch (error) {
                coverUploadError = `❌ 上传失败: ${error.message}`;
            }
        };
        input.click();
    }
</script>

<div class="b3-dialog__content book-info">
    <div class="input-group">
        <input
            type="text"
            bind:value={inputVales}
            placeholder={i18n.tvSearchPlaceholder || "输入电视剧名搜索"}
            on:keydown={(e) => e.key === "Enter" && dispatch("fetchTvData")}
        />
        <button on:click={() => dispatch("fetchTvData")}>🔍</button>
        <div class="loading-spinner">{statusMessage}</div>
        <button class="addBookButton" on:click={() => dispatch("addTv")}>
            {i18n.tvAddButton || "✅添加电视剧"}
        </button>
    </div>

    {#if tvInfo}
        <div class="book-layout">
            <div class="book-top-area">
                <div class="cover-column">
                    {#if tvInfo.cover}
                        <img
                            src={coverData || tvInfo.cover}
                            alt={i18n.tvCover || "封面"}
                            class="book-cover"
                            style={!coverData && !tvInfo.cover
                                ? "display: none;"
                                : ""}
                        />
                    {/if}
                    <div class="cover-upload-area">
                        <button
                            class="b3-button b3-button--outline"
                            on:click={handleUploadCover}
                            style="font-size: 12px; margin-top: 6px; padding: 4px 10px;"
                        >
                            📁 {i18n.uploadCover || "上传封面"}
                        </button>
                        {#if coverUploadError}
                            <div
                                style="font-size: 11px; margin-top: 4px; color: #666;"
                            >
                                {coverUploadError}
                            </div>
                        {/if}
                    </div>
                </div>
                <div class="info-column">
                    <div class="mf-row">
                        <label class="mf-label">
                            <span class="mf-text"
                                >{i18n.tvTitle || "剧名："}</span
                            >
                            <input class="mf-input" bind:value={tvInfo.title} />
                        </label>
                        <label class="mf-label">
                            <span class="mf-text"
                                >{i18n.tvOriginalTitle || "原名："}</span
                            >
                            <input
                                class="mf-input"
                                bind:value={tvInfo.originalTitle}
                            />
                        </label>
                    </div>
                    <div class="mf-row mf-row-dual">
                        <label class="mf-label">
                            <span class="mf-text"
                                >{i18n.tvDirector || "导演："}</span
                            >
                            <input
                                class="mf-input"
                                bind:value={tvInfo.director}
                            />
                        </label>
                        <label class="mf-label">
                            <span class="mf-text"
                                >{i18n.tvScreenwriter || "编剧："}</span
                            >
                            <input
                                class="mf-input"
                                bind:value={tvInfo.screenwriter}
                            />
                        </label>
                    </div>
                    <div class="mf-row mf-row-dual">
                        <label class="mf-label">
                            <span class="mf-text"
                                >{i18n.tvCast || "主演："}</span
                            >
                            <input class="mf-input" bind:value={tvInfo.cast} />
                        </label>
                        <label class="mf-label">
                            <span class="mf-text"
                                >{i18n.tvGenre || "类型："}</span
                            >
                            <input class="mf-input" bind:value={tvInfo.genre} />
                        </label>
                    </div>
                    <div class="mf-row mf-row-dual">
                        <label class="mf-label">
                            <span class="mf-text"
                                >{i18n.tvCountry || "制片国家/地区："}</span
                            >
                            <input
                                class="mf-input"
                                bind:value={tvInfo.country}
                            />
                        </label>
                        <label class="mf-label">
                            <span class="mf-text"
                                >{i18n.tvLanguage || "语言："}</span
                            >
                            <input
                                class="mf-input"
                                bind:value={tvInfo.language}
                            />
                        </label>
                    </div>
                    <div class="mf-row mf-row-dual">
                        <label class="mf-label">
                            <span class="mf-text"
                                >{i18n.tvFirstAirDate || "首播日期："}</span
                            >
                            <input
                                class="mf-input"
                                bind:value={tvInfo.firstAirDate}
                            />
                        </label>
                        <label class="mf-label">
                            <span class="mf-text"
                                >{i18n.tvSeasons || "季数："}</span
                            >
                            <input
                                class="mf-input"
                                bind:value={tvInfo.seasons}
                            />
                        </label>
                    </div>
                    <div class="mf-row mf-row-dual">
                        <label class="mf-label">
                            <span class="mf-text"
                                >{i18n.tvEpisodes || "集数："}</span
                            >
                            <input
                                class="mf-input"
                                bind:value={tvInfo.episodes}
                            />
                        </label>
                        <label class="mf-label">
                            <span class="mf-text"
                                >{i18n.tvEpisodeRuntime || "单集片长："}</span
                            >
                            <input
                                class="mf-input"
                                bind:value={tvInfo.episodeRuntime}
                            />
                        </label>
                    </div>
                    <div class="mf-row mf-row-dual">
                        <label class="mf-label">
                            <span class="mf-text"
                                >{i18n.tvNetworks || "电视台："}</span
                            >
                            <input
                                class="mf-input"
                                bind:value={tvInfo.networks}
                            />
                        </label>
                        <label class="mf-label">
                            <span class="mf-text"
                                >{i18n.tvIMDbId || "IMDb："}</span
                            >
                            <input
                                class="mf-input"
                                bind:value={tvInfo.imdbId}
                            />
                        </label>
                    </div>
                    <div class="mf-row mf-row-dual">
                        <label class="mf-label">
                            <span class="mf-text"
                                >{i18n.tvRating || "评分："}</span
                            >
                            <input class="mf-input" bind:value={tvInfo.rating} />
                        </label>
                        <label class="mf-label">
                            <span class="mf-text"
                                >{i18n.tvRatingCount || "人数："}</span
                            >
                            <input
                                class="mf-input"
                                bind:value={tvInfo.ratingCount}
                            />
                        </label>
                    </div>
                    <div class="mf-row">
                        <label class="mf-label">
                            <span class="mf-text"
                                >{i18n.tvDoubanLink || "链接："}</span
                            >
                            <input
                                class="mf-input"
                                bind:value={tvInfo.doubanUrl}
                            />
                        </label>
                    </div>
                </div>
            </div>

            <div class="book-middle-down-area">
                <div class="mf-row mf-row-triple">
                    <label class="mf-label">
                        <span class="mf-text"
                            >{i18n.tvMyRating || "我的评分："}</span
                        >
                        <CustomSelect
                            items={tvRatings}
                            bind:selectedIndex={myRatingIndex}
                        />
                    </label>
                    <label class="mf-label">
                        <span class="mf-text"
                            >{i18n.tvCategory || "电视剧分类："}</span
                        >
                        <CustomSelect
                            items={tvCategories}
                            bind:selectedIndex={categoryIndex}
                        />
                    </label>
                    <label class="mf-label">
                        <span class="mf-text"
                            >{i18n.tvWatchingStatus || "追剧状态："}</span
                        >
                        <CustomSelect
                            items={tvStatuses}
                            bind:selectedIndex={statusIndex}
                        />
                    </label>
                </div>
                <div class="mf-row mf-row-dual">
                    <label class="mf-label">
                        <span class="mf-text"
                            >{i18n.tvStartDate || "开始日期："}</span
                        >
                        <input
                            class="mf-input"
                            type="date"
                            bind:value={tvInfo.startDate}
                        />
                    </label>
                    <label class="mf-label">
                        <span class="mf-text"
                            >{i18n.tvFinishDate || "看完日期："}</span
                        >
                        <input
                            class="mf-input"
                            type="date"
                            bind:value={tvInfo.finishDate}
                        />
                    </label>
                    <label class="mf-label">
                        <span class="mf-text"></span>
                        <label class="mf-checkbox">
                            <input
                                type="checkbox"
                                bind:checked={tvInfo.addNotes}
                            />
                            {i18n.tvAddNotes || "生成追剧笔记"}
                        </label>
                    </label>
                    <label class="mf-label">
                        <span class="mf-text"></span>
                        <label
                            class="mf-checkbox"
                            title={i18n.tvAddEpisodeNotesTip ||
                                "为每一集生成一个独立笔记文档（放在总笔记之下）"}
                        >
                            <input
                                type="checkbox"
                                bind:checked={tvInfo.addEpisodeNotes}
                            />
                            {i18n.tvAddEpisodeNotes || "生成分集笔记"}
                        </label>
                    </label>
                </div>
            </div>

            <div class="book-bottom-area">
                <div class="mf-row">
                    <label class="mf-label">
                        <span class="mf-text"
                            >{i18n.tvDescription || "剧情简介："}</span
                        >
                        <textarea
                            class="mf-input"
                            bind:value={tvInfo.description}
                            rows="4"
                        ></textarea>
                    </label>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .mf-row {
        display: flex;
        gap: 4px;
        margin-bottom: 4px;
        width: 90%;
    }

    .mf-label {
        display: flex;
        align-items: center;
        gap: 4px;
        flex: 1;
        min-width: 0;
    }

    .mf-text {
        flex: 0 0 auto;
        min-width: 3.5em;
        white-space: nowrap;
        font-size: 13px;
        color: var(--b3-theme-on-surface);
        text-align: right;
    }

    .mf-input {
        flex: 1 1 40px;
        min-width: 20px;
        padding: 4px 6px;
        border: 1px solid var(--b3-border-color);
        border-radius: 3px;
        font-size: 13px;
        background: var(--b3-theme-background);
        color: var(--b3-theme-on-background);
        outline: none;
        transition: border-color 0.2s;
        box-sizing: border-box;
    }

    .mf-input:focus {
        border-color: var(--b3-theme-primary);
        box-shadow: 0 0 0 2px rgba(var(--b3-theme-primary-rgb), 0.15);
    }

    .mf-input:hover {
        border-color: var(--b3-theme-primary);
    }

    textarea.mf-input {
        min-height: 80px;
        resize: vertical;
    }

    .mf-checkbox {
        display: flex;
        align-items: center;
        gap: 3px;
        white-space: nowrap;
        font-size: 13px;
        color: var(--b3-theme-on-surface);
        cursor: pointer;
    }

    .mf-checkbox input {
        margin: 0;
    }
</style>
