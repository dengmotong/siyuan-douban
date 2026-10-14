<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { showMessage } from "siyuan";
    import { searchTMDBMovies, fetchTMDBMovie, type SearchResult } from "../../utils/douban/movie";

    const dispatch = createEventDispatcher();

    export let plugin: any;
    export let showSearchDialog: boolean;
    export let searchKeyword: string;
    export let tmdbApiKey: string;

    let searchResults: SearchResult[] = [];
    let isLoading = false;
    let errorMessage = "";
    let lastKeyword = "";

    $: if (showSearchDialog && searchKeyword && searchKeyword !== lastKeyword) {
        lastKeyword = searchKeyword;
        loadSearchResults(true);
    }

    async function loadSearchResults(retryOnFailure = false) {
        if (!tmdbApiKey) {
            showMessage("⚠️ 请先在设置中填写 TMDB API Key", 5000);
            return;
        }
        isLoading = true;
        errorMessage = "";
        searchResults = [];
        try {
            const keyword = decodeURIComponent(searchKeyword);
            searchResults = await searchTMDBMovies(keyword, tmdbApiKey, plugin);
            if (searchResults.length === 0) {
                errorMessage = plugin.i18n?.searchNoResultsMovie || "未找到相关电影";
            }
        } catch (error) {
            if (retryOnFailure) {
                try {
                    const keyword = decodeURIComponent(searchKeyword);
                    searchResults = await searchTMDBMovies(keyword, tmdbApiKey, plugin);
                    if (searchResults.length === 0) {
                        errorMessage = plugin.i18n?.searchNoResultsMovie || "未找到相关电影";
                    }
                } catch (retryError) {
                    errorMessage = `${retryError.message}`;
                }
            } else {
                errorMessage = `${error.message}`;
            }
        } finally {
            isLoading = false;
        }
    }

    async function handleSelectMovie(result: SearchResult) {
        if (!tmdbApiKey) {
            showMessage("⚠️ 请先在设置中填写 TMDB API Key", 5000);
            return;
        }
        try {
            const movieInfo = await fetchTMDBMovie(result.tmdbId, tmdbApiKey, plugin);
            movieInfo.addNotes = true;
            dispatch("select", movieInfo);
            dispatch("close");
        } catch (error) {
            showMessage(`获取电影详情失败: ${error.message}`, 5000);
            console.error("Failed to get movie detail:", error);
        }
    }

    function getCoverStyle(cover: string): string {
        if (cover) {
            return `background-image: url('${cover}'); background-size: cover; background-position: center;`;
        }
        return "background: var(--b3-theme-surface);";
    }
</script>

{#if showSearchDialog}
    <div class="b3-dialog-container" style="z-index: 9999;">
        <div class="b3-dialog-scrim" role="button" tabindex="0"
            on:click|self={() => dispatch("close")}
            on:keydown={(e) => (e.key === "Enter" || e.key === " ") && dispatch("close")}>
        </div>
        <div class="b3-dialog-card" style="width: 90vw; max-width: 900px;">
            <div class="b3-dialog__header">
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span>🎬</span>
                        <p class="b3-dialog__title">
                            电影搜索 - 《{decodeURIComponent(searchKeyword)}》
                        </p>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="b3-button dialog-btn" on:click={() => dispatch("close")}>
                            {plugin.i18n.cancel}
                        </button>
                    </div>
                </div>
            </div>
            <div class="b3-dialog__body" style="max-height: 70vh; overflow-y: auto; padding: 16px;">
                {#if isLoading}
                    <div style="display: flex; justify-content: center; align-items: center; padding: 60px 0; flex-direction: column; gap: 16px;">
                        <div class="b3-loading" style="transform: scale(1.5);"></div>
                        <span style="color: var(--b3-theme-on-surface);">正在搜索电影...</span>
                    </div>
                {:else if errorMessage}
                    <div style="display: flex; justify-content: center; align-items: center; padding: 60px 0; flex-direction: column; gap: 16px;">
                        <span style="font-size: 48px;">😥</span>
                        <span style="color: var(--b3-theme-error);">{errorMessage}</span>
                        <button class="b3-button b3-button--outline" on:click={loadSearchResults}>重试</button>
                    </div>
                {:else}
                    <div style="display: flex; flex-direction: column; gap: 12px; padding: 8px 0;">
                        {#each searchResults as result}
                            <button class="b3-list-item"
                                style="display: flex; gap: 16px; padding: 12px; cursor: pointer; text-align: left; width: 100%; border: 1px solid var(--b3-theme-surface-lighter); border-radius: 8px; background: var(--b3-theme-surface); transition: all 0.2s;"
                                on:click={() => handleSelectMovie(result)}
                                on:keydown={(e) => e.key === "Enter" && handleSelectMovie(result)}>
                                <div style="width: 80px; height: 112px; flex-shrink: 0; border-radius: 4px; overflow: hidden; {getCoverStyle(result.cover)}"></div>
                                <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px;">
                                    <div style="font-size: 15px; font-weight: 600; color: var(--b3-theme-on-background); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                        {result.title}
                                    </div>
                                    {#if result.rating}
                                        <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                                            <span style="color: #E09040; font-size: 14px; font-weight: 600;">{result.rating}</span>
                                            {#if result.ratingCount}
                                                <span style="color: var(--b3-theme-on-surface); font-size: 12px;">({result.ratingCount}人评价)</span>
                                            {/if}
                                        </div>
                                    {/if}
                                    {#if result.abstract}
                                        <div style="font-size: 12px; color: var(--b3-theme-on-surface); margin-top: 2px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.5;">
                                            {result.abstract}
                                        </div>
                                    {/if}
                                </div>
                                <div style="display: flex; align-items: center; color: var(--b3-theme-primary); font-size: 13px; flex-shrink: 0;">
                                    选择 →
                                </div>
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}
