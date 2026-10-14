<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import { showMessage } from "siyuan";
    import { searchDoubanBooks, type SearchResult } from "../../utils/douban/book/searchBook";
    import { fetchDoubanBook, fetchBookHtml } from "../../utils/douban/book";
    const dispatch = createEventDispatcher();

    export let plugin: any;
    export let showSearchDialog: boolean;
    export let searchKeyword: string;

    let searchResults: SearchResult[] = [];
    let isLoading = false;
    let errorMessage = "";
    // 记录上一次搜索的关键词，用于响应式检测变化
    let lastKeyword = "";

    // 当对话框打开且关键词变化时，自动触发搜索
    $: if (showSearchDialog && searchKeyword && searchKeyword !== lastKeyword) {
        lastKeyword = searchKeyword;
        loadSearchResults(true);
    }

    async function loadSearchResults(retryOnFailure = false) {
        isLoading = true;
        errorMessage = "";
        searchResults = [];
        try {
            const keyword = decodeURIComponent(searchKeyword);
            searchResults = await searchDoubanBooks(keyword);
            if (searchResults.length === 0) {
                errorMessage = plugin.i18n?.searchNoResults || "未找到相关书籍";
            }
        } catch (error) {
            if (retryOnFailure) {
                console.error("Search failed, retrying once:", error);
                // 自动重试一次
                try {
                    const keyword = decodeURIComponent(searchKeyword);
                    searchResults = await searchDoubanBooks(keyword);
                    if (searchResults.length === 0) {
                        errorMessage = plugin.i18n?.searchNoResults || "未找到相关书籍";
                    }
                } catch (retryError) {
                    errorMessage = `${retryError.message}`;
                    console.error("Search retry also failed:", retryError);
                }
            } else {
                errorMessage = `${error.message}`;
                console.error("Search failed:", error);
            }
        } finally {
            isLoading = false;
        }
    }

    async function handleSelectBook(result: SearchResult) {
        try {
            // 从搜索结果链接中提取 subject ID
            const subjectMatch = result.url.match(/subject\/(\d+)/);
            if (!subjectMatch) {
                showMessage("无法获取书籍详情页链接", 3000);
                return;
            }

            // 通过 ISBN 页面获取（更可靠）
            // 先通过搜索页面的链接获取书籍详情页 HTML
            const html = await fetchBookHtml(subjectMatch[1]);
            const bookInfo = await fetchDoubanBook(html);
            dispatch("select", bookInfo);
            dispatch("close");
        } catch (error) {
            showMessage(`获取书籍详情失败: ${error.message}`, 5000);
            console.error("Failed to get book detail:", error);
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
        <div
            class="b3-dialog-scrim"
            role="button"
            tabindex="0"
            on:click|self={() => dispatch("close")}
            on:keydown={(e) =>
                (e.key === "Enter" || e.key === " ") && dispatch("close")}
        ></div>
        <div class="b3-dialog-card" style="width: 90vw; max-width: 900px;">
            <div class="b3-dialog__header">
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span>🔍</span>
                        <p class="b3-dialog__title">
                            {plugin.i18n.searchBook} - 《{decodeURIComponent(searchKeyword)}》
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
                        <span style="color: var(--b3-theme-on-surface);">{plugin.i18n.searchBookLoading}</span>
                    </div>
                {:else if errorMessage}
                    <div style="display: flex; justify-content: center; align-items: center; padding: 60px 0; flex-direction: column; gap: 16px;">
                        <span style="font-size: 48px;">😥</span>
                        <span style="color: var(--b3-theme-error);">{errorMessage}</span>
                        <button class="b3-button b3-button--outline" on:click={loadSearchResults}>
                            重试
                        </button>
                    </div>
                {:else}
                    <div style="display: flex; flex-direction: column; gap: 12px; padding: 8px 0;">
                        {#each searchResults as result}
                            <button
                                class="b3-list-item"
                                style="display: flex; gap: 16px; padding: 12px; cursor: pointer; text-align: left; width: 100%; border: 1px solid var(--b3-theme-surface-lighter); border-radius: 8px; background: var(--b3-theme-surface); transition: all 0.2s;"
                                on:click={() => handleSelectBook(result)}
                                on:keydown={(e) => e.key === "Enter" && handleSelectBook(result)}
                            >
                                <!-- 封面 -->
                                <div style="width: 80px; height: 112px; flex-shrink: 0; border-radius: 4px; overflow: hidden; {getCoverStyle(result.cover)}"></div>
                                <!-- 书籍信息 -->
                                <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px;">
                                    <div style="font-size: 15px; font-weight: 600; color: var(--b3-theme-on-background); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                        {result.title}
                                    </div>
                                    <div style="font-size: 12px; color: var(--b3-theme-on-surface); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                        {result.author}
                                    </div>
                                    {#if result.publisher}
                                        <div style="font-size: 12px; color: var(--b3-theme-on-surface); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                            {result.publisher}{result.publishDate ? ` / ${result.publishDate}` : ''}
                                        </div>
                                    {/if}
                                    <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                                        {#if result.rating}
                                            <span style="color: #E09040; font-size: 14px; font-weight: 600;">{result.rating}</span>
                                            {#if result.ratingCount}
                                                <span style="color: var(--b3-theme-on-surface); font-size: 12px;">({result.ratingCount}人评价)</span>
                                            {/if}
                                        {:else}
                                            <span style="color: var(--b3-theme-on-surface); font-size: 12px;">暂无评分</span>
                                        {/if}
                                    </div>
                                    {#if result.abstract}
                                        <div style="font-size: 12px; color: var(--b3-theme-on-surface); margin-top: 2px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.5;">
                                            {result.abstract}
                                        </div>
                                    {/if}
                                </div>
                                <!-- 选择提示 -->
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

<style>
    .b3-list-item:hover {
        background: var(--b3-theme-surface-lighter) !important;
        border-color: var(--b3-theme-primary) !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .b3-list-item:focus-visible {
        outline: 2px solid var(--b3-theme-primary);
        outline-offset: 2px;
    }
</style>
