<script lang="ts">
    import type { I18N } from "siyuan";
    import { createEventDispatcher } from "svelte";
    const dispatch = createEventDispatcher();

    export let i18n: I18N;
    export let bookDatabassID: string;
    export let tempRatings: string;
    export let tempCategories: string;
    export let tempStatuses: string;
    export let addNotes1: boolean;
    export let isSYTemplateRender: boolean;
    export let databaseStatusMessage: string;
    export let movieDatabassID: string;
    export let tempMovieRatings: string;
    export let tempMovieCategories: string;
    export let tempMovieStatuses: string;
    export let movieDatabaseStatusMessage: string;
    export let tmdbApiKey: string;
    export let tvDatabassID: string;
    export let tempTvRatings: string;
    export let tempTvCategories: string;
    export let tempTvStatuses: string;
    export let tvDatabaseStatusMessage: string;
</script>

<div class="settings">
    <h3>{i18n.bookDatabaseID}</h3>
    <div class="form-row">
        <input
            type="text"
            bind:value={bookDatabassID}
            placeholder={i18n.bookDatabaseIDPlaceholder}
        />
        {databaseStatusMessage}
    </div>

    <h3>{i18n.preferenceSettings}</h3>
    <div class="form-row custom-options">
        <label>{i18n.ratingsLevels} <input bind:value={tempRatings} /></label>
    </div>
    <div class="form-row custom-options">
        <label>{i18n.bookCategories} <input bind:value={tempCategories} /></label>
    </div>
    <div class="form-row custom-options">
        <label>{i18n.readingStatuses} <input bind:value={tempStatuses} /></label>
    </div>

    <div class="form-row template">
        <label>
            <input type="checkbox" bind:checked={addNotes1} />
            {i18n.defaultGenerateNotes}
        </label>
        <button class="b3-button" on:click={() => dispatch("openTemplate")}>
            📝 {i18n.setTemplate}
        </button>
        <label>
            <input type="checkbox" bind:checked={isSYTemplateRender} />
            {i18n.SYTemplateRender}
        </label>
    </div>

    <hr style="margin: 24px 0; border: none; border-top: 1px solid var(--b3-border-color);" />

    <h3>🎬 电影数据库</h3>
    <div class="form-row">
        <input type="text" bind:value={movieDatabassID} placeholder={i18n.movieDatabaseIDPlaceholder || "电影数据库块ID"} />
        {movieDatabaseStatusMessage}
    </div>

    <h3>TMDB API</h3>
    <div class="form-row custom-options">
        <label>TMDB API Key（<a href="https://www.themoviedb.org/settings/api" target="_blank" rel="nofollow">免费获取</a>）：<input type="text" bind:value={tmdbApiKey} placeholder="输入你的 TMDB API Key" /></label>
    </div>

    <h3>{i18n.preferenceSettings}</h3>
    <div class="form-row custom-options">
        <label>{i18n.movieRatingsLabel || "电影评分等级（逗号分隔）："} <input bind:value={tempMovieRatings} /></label>
    </div>
    <div class="form-row custom-options">
        <label>{i18n.movieCategoriesLabel || "电影分类（逗号分隔）："} <input bind:value={tempMovieCategories} /></label>
    </div>
    <div class="form-row custom-options">
        <label>{i18n.movieStatusesLabel || "观影状态（逗号分隔）："} <input bind:value={tempMovieStatuses} /></label>
    </div>

    <div class="form-row template">
        <button class="b3-button" on:click={() => dispatch("openMovieTemplate")}>
            📝 {i18n.movieSetTemplate || "设置电影笔记模板"}
        </button>
    </div>

    <hr style="margin: 24px 0; border: none; border-top: 1px solid var(--b3-border-color);" />

    <h3>📺 电视剧数据库</h3>
    <div class="form-row">
        <input type="text" bind:value={tvDatabassID} placeholder={i18n.tvDatabaseIDPlaceholder || "电视剧数据库块ID"} />
        {tvDatabaseStatusMessage}
    </div>

    <h3>{i18n.tvPreferenceSettings || "电视剧偏好设置"}</h3>
    <div class="form-row custom-options">
        <label>{i18n.tvRatingsLabel || "电视剧评分等级（逗号分隔）："} <input bind:value={tempTvRatings} /></label>
    </div>
    <div class="form-row custom-options">
        <label>{i18n.tvCategoriesLabel || "电视剧分类（逗号分隔）："} <input bind:value={tempTvCategories} /></label>
    </div>
    <div class="form-row custom-options">
        <label>{i18n.tvStatusesLabel || "追剧状态（逗号分隔）："} <input bind:value={tempTvStatuses} /></label>
    </div>

    <div class="form-row template">
        <button class="b3-button" on:click={() => dispatch("openTvTemplate")}>
            📝 {i18n.tvSetTemplate || "设置电视剧笔记模板"}
        </button>
        <button class="b3-button" on:click={() => dispatch("openTvEpisodeTemplate")}>
            📺 {i18n.tvSetEpisodeTemplate || "设置分集笔记模板"}
        </button>
    </div>

    <div class="saveButton">
        <button on:click={() => dispatch("save")}>{i18n.saveSettings}</button>
    </div>
</div>
