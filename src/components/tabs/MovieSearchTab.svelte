<script lang="ts">
    import type { I18N } from "siyuan";
    import { fetchSyncPost } from "siyuan";
    import { createEventDispatcher } from "svelte";
    import { getImage } from "@/utils/core/getImg";
    import CustomSelect from "@/libs/components/CustomSelect.svelte";

    export let i18n: I18N;
    export let inputVales: string;
    export let movieInfo: any;
    export let statusMessage: string;
    export let movieRatings: string[];
    export let movieCategories: string[];
    export let movieStatuses: string[];
    export let myRatingIndex: number;
    export let categoryIndex: number;
    export let statusIndex: number;

    const dispatch = createEventDispatcher<{
        fetchMovieData: void;
        addMovie: void;
    }>();

    let coverData = "";
    let coverUploadError = "";

    $: if (movieInfo?.cover && !movieInfo.cover.startsWith("assets/")) {
        coverData = "";
        (async () => {
            try {
                const data = await getImage(
                    movieInfo.cover,
                    movieInfo.doubanUrl || "https://movie.douban.com/",
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
                const cleanName = (movieInfo?.title || "cover").replace(
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
                    movieInfo.cover = refPath;
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
            placeholder={i18n.movieSearchPlaceholder || "输入电影名搜索"}
            on:keydown={(e) => e.key === "Enter" && dispatch("fetchMovieData")}
        />
        <button on:click={() => dispatch("fetchMovieData")}>🔍</button>
        <div class="loading-spinner">{statusMessage}</div>
        <button class="addBookButton" on:click={() => dispatch("addMovie")}>
            {i18n.movieAddButton || "✅添加电影"}
        </button>
    </div>

    {#if movieInfo}
        <div class="book-layout">
            <div class="book-top-area">
                <div class="cover-column">
                    {#if movieInfo.cover}
                        <img
                            src={coverData || movieInfo.cover}
                            alt={i18n.movieCover || "封面"}
                            class="book-cover"
                            style={!coverData && !movieInfo.cover
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
                                >{i18n.movieTitle || "电影名："}</span
                            >
                            <input
                                class="mf-input"
                                bind:value={movieInfo.title}
                            />
                        </label>
                        <label class="mf-label">
                            <span class="mf-text"
                                >{i18n.movieOriginalTitle || "原名："}</span
                            >
                            <input
                                class="mf-input"
                                bind:value={movieInfo.originalTitle}
                            />
                        </label>
                    </div>
                    <div class="mf-row mf-row-dual">
                        <label class="mf-label">
                            <span class="mf-text"
                                >{i18n.movieDirector || "导演："}</span
                            >
                            <input
                                class="mf-input"
                                bind:value={movieInfo.director}
                            />
                        </label>
                        <label class="mf-label">
                            <span class="mf-text"
                                >{i18n.movieScreenwriter || "编剧："}</span
                            >
                            <input
                                class="mf-input"
                                bind:value={movieInfo.screenwriter}
                            />
                        </label>
                    </div>
                    <div class="mf-row mf-row-dual">
                        <label class="mf-label">
                            <span class="mf-text"
                                >{i18n.movieCast || "主演："}</span
                            >
                            <input
                                class="mf-input"
                                bind:value={movieInfo.cast}
                            />
                        </label>
                        <label class="mf-label">
                            <span class="mf-text"
                                >{i18n.movieGenre || "类型："}</span
                            >
                            <input
                                class="mf-input"
                                bind:value={movieInfo.genre}
                            />
                        </label>
                    </div>
                    <div class="mf-row mf-row-dual">
                        <label class="mf-label">
                            <span class="mf-text"
                                >{i18n.movieCountry || "制片国家/地区："}</span
                            >
                            <input
                                class="mf-input"
                                bind:value={movieInfo.country}
                            />
                        </label>
                        <label class="mf-label">
                            <span class="mf-text"
                                >{i18n.movieLanguage || "语言："}</span
                            >
                            <input
                                class="mf-input"
                                bind:value={movieInfo.language}
                            />
                        </label>
                    </div>
                    <div class="mf-row mf-row-dual">
                        <label class="mf-label">
                            <span class="mf-text"
                                >{i18n.movieReleaseDate || "上映日期："}</span
                            >
                            <input
                                class="mf-input"
                                bind:value={movieInfo.releaseDate}
                            />
                        </label>
                        <label class="mf-label">
                            <span class="mf-text"
                                >{i18n.movieRuntime || "片长："}</span
                            >
                            <input
                                class="mf-input"
                                bind:value={movieInfo.runtime}
                            />
                        </label>
                    </div>
                    <div class="mf-row mf-row-dual">
                        <label class="mf-label">
                            <span class="mf-text"
                                >{i18n.movieRating || "评分："}</span
                            >
                            <input class="mf-input" bind:value={movieInfo.rating} />
                        </label>
                        <label class="mf-label">
                            <span class="mf-text"
                                >{i18n.movieRatingCount || "人数："}</span
                            >
                            <input
                                class="mf-input"
                                bind:value={movieInfo.ratingCount}
                            />
                        </label>
                    </div>
                    <div class="mf-row mf-row-dual">
                        <label class="mf-label">
                            <span class="mf-text"
                                >{i18n.movieIMDbId || "IMDb："}</span
                            >
                            <input class="mf-input" bind:value={movieInfo.imdbId} />
                        </label>
                        <label class="mf-label">
                            <span class="mf-text"
                                >{i18n.movieDoubanLink || "链接："}</span
                            >
                            <input
                                class="mf-input"
                                bind:value={movieInfo.doubanUrl}
                            />
                        </label>
                    </div>
                </div>
            </div>

            <div class="book-middle-down-area">
                <div class="mf-row mf-row-triple">
                    <label class="mf-label">
                        <span class="mf-text"
                            >{i18n.movieMyRating || "我的评分："}</span
                        >
                        <CustomSelect
                            items={movieRatings}
                            bind:selectedIndex={myRatingIndex}
                        />
                    </label>
                    <label class="mf-label">
                        <span class="mf-text"
                            >{i18n.movieCategory || "电影分类："}</span
                        >
                        <CustomSelect
                            items={movieCategories}
                            bind:selectedIndex={categoryIndex}
                        />
                    </label>
                    <label class="mf-label">
                        <span class="mf-text"
                            >{i18n.movieWatchingStatus || "观影状态："}</span
                        >
                        <CustomSelect
                            items={movieStatuses}
                            bind:selectedIndex={statusIndex}
                        />
                    </label>
                </div>
                <div class="mf-row mf-row-dual">
                    <label class="mf-label">
                        <span class="mf-text"
                            >{i18n.movieStartDate || "开始日期："}</span
                        >
                        <input
                            class="mf-input"
                            type="date"
                            bind:value={movieInfo.startDate}
                        />
                    </label>
                    <label class="mf-label">
                        <span class="mf-text"
                            >{i18n.movieFinishDate || "看完日期："}</span
                        >
                        <input
                            class="mf-input"
                            type="date"
                            bind:value={movieInfo.finishDate}
                        />
                    </label>
                    <label class="mf-label">
                        <span class="mf-text"></span>
                        <label class="mf-checkbox">
                            <input
                                type="checkbox"
                                bind:checked={movieInfo.addNotes}
                            />
                            {i18n.movieAddNotes || "生成观影笔记"}
                        </label>
                    </label>
                </div>
            </div>

            <div class="book-bottom-area">
                <div class="mf-row">
                    <label class="mf-label">
                        <span class="mf-text"
                            >{i18n.movieDescription || "剧情简介："}</span
                        >
                        <textarea
                            class="mf-input"
                            bind:value={movieInfo.description}
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
