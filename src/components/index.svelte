<script lang="ts">
    import { onMount } from "svelte";
    import { I18N, showMessage, fetchPost } from "siyuan";
    import { sql } from "../api";
    import { fetchDoubanBook, fetchBookHtml } from "../utils/douban/book";
    import "./styles/main.scss";
    import { loadAVData } from "../utils/bookHandling";
    import { loadAVMovieData } from "../utils/movieHandling";
    import SearchBookDialog from "./common/searchBookDialog.svelte";
    import SearchMovieDialog from "./common/searchMovieDialog.svelte";
    import TemplateEditorDialog from "./common/templateEditorDialog.svelte";
    import BookSearchTab from "./tabs/BookSearchTab.svelte";
    import MovieSearchTab from "./tabs/MovieSearchTab.svelte";
    import UserSettingsTab from "./tabs/UserSettingsTab.svelte";
    import WereadTab from "./tabs/WereadTab.svelte";
    import AboutTab from "./tabs/AboutTab.svelte";

    export let i18n: I18N;
    export let plugin: any;

    let inputVales = "";
    let bookInfo: BookInfo | null = null;
    let statusMessage = "";
    let addNotes1 = true;
    let isSYTemplateRender = false;

    let customRatings = ['⭐⭐⭐⭐⭐', '⭐⭐⭐⭐☆', '⭐⭐⭐⭐', '⭐⭐⭐☆', '⭐⭐⭐', '⭐⭐☆', '⭐⭐', '⭐☆', '⭐'];
    let customCategories = ['小说', '非虚构', '历史', '科技', '艺术', '哲学', '生活', '其他'];
    let customReadingStatuses = ['想读', '在读', '已读'];
    let tempRatings = customRatings.join(", ");
    let tempCategories = customCategories.join(", ");
    let tempStatuses = customReadingStatuses.join(", ");

    let bookDatabassID = "";
    let databaseStatusMessage = "";
    let avID = "";

    let myRatingIndex = 0;
    let bookCategoryIndex = 0;
    let readingStatusIndex = 0;

    let showTemplateEditor = false;
    let noteTemplate = `# 📖 {{书名}}-{{副标题}}

![]({{封面}})

## 基本信息
| 🏷️ 属性       | 📝 内容                  |
|-------------|-------------------------|
| 原作名       | {{原作名}}               |
| 作者         | {{作者}}                |
| 译者         | {{译者}}                |
| 出版社       | {{出版社}}               |
| 出版日期     | {{出版年}}             |
| ISBN        | \`{{ISBN}}\`              |
| 页数         | {{页数}}                |
| 定价         | {{定价}}                |
| 装帧         | {{装帧}}                |

---

## 豆瓣信息
⭐ **{{豆瓣评分}}**（基于 {{评分人数}} 人评价）
🎴 出品方：{{出品方}}
📚 丛书系列：{{丛书}}

---

## 我的阅读记录
**阅读状态**：{{阅读状态}}
**我的评分**：{{我的评分}}
**开始阅读**：{{开始日期}}
**完成阅读**：{{读完日期}}

---

## 读书笔记
### ✍️ 读书心得
（在此记录你的读书体会）

### 🔖 摘录精选
| # | 原句 | 感想 | 页码 |
|---|------|------|------|
| 1 | _在此粘贴原文句子或段落_ | _写下你的思考、共鸣或批注_ | p. ? |
| 2 | | | |
| 3 | | | |
| … | | | |`;
    let originalTemplate = "";

    let showSearchDialog = false;
    let searchKeyword = "";

    // === 电影状态 ===
    let movieInputVales = "";
    let movieInfo: any = null;
    let movieStatusMessage = "";
    let movieDatabassID = "";
    let movieAvID = "";
    let movieNoteTemplate = `# 🎬 {{电影名}}-{{原名}}

![]({{封面}})

## 基本信息
| 🏷️ 属性       | 📝 内容                  |
|-------------|-------------------------|
| 原名         | {{原名}}                 |
| 导演         | {{导演}}                |
| 编剧         | {{编剧}}                |
| 主演         | {{主演}}                |
| 类型         | {{类型}}                 |
| 制片国家/地区  | {{制片国家/地区}}          |
| 语言         | {{语言}}                 |
| 上映日期     | {{上映日期}}             |
| 片长         | {{片长}}                |
| IMDb编号     | \`{{IMDb编号}}\`           |

---

## 评分信息
⭐ **{{评分}}**（基于 {{评分人数}} 人评价）
🔗 链接：[查看详情]({{链接}})

---

## 我的观影记录
**观影状态**：{{观影状态}}
**我的评分**：{{我的评分}}
**开始观看**：{{开始日期}}
**看完日期**：{{看完日期}}

---

## 剧情简介
{{剧情简介}}

---

## 观影笔记
### ✍️ 观影心得
（在此记录你的观影体会）

### 🖼️ 电影截图
| # | 截图 | 说明 |
|---|------|------|
| 1 | _在此粘贴电影截图_ | _写下对截图画面的说明或感受_ |
| 2 | | |
| 3 | | |
| … | | |`;
    let movieRatings = ['⭐⭐⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐', '⭐⭐', '⭐'];
    let movieCategories = ['剧情', '喜剧', '动作', '科幻', '爱情', '悬疑', '动画', '纪录片', '其他'];
    let movieStatuses = ['想看', '在看', '已看'];
    let tempMovieRatings = movieRatings.join(", ");
    let tempMovieCategories = movieCategories.join(", ");
    let tempMovieStatuses = movieStatuses.join(", ");
    let movieRatingIndex = 0;
    let movieCategoryIndex = 0;
    let movieStatusIndex = 0;
    let showMovieSearchDialog = false;
    let movieSearchKeyword = "";
    let movieDatabaseStatusMessage = "";
    let showMovieTemplateEditor = false;
    let originalMovieTemplate = "";
    let tmdbApiKey = "";

    const tabs = [
        "🔍 " + i18n.topTabname1,
        "🎬 " + i18n.topTabname5,
        "⚙️ " + i18n.topTabname2,
        "📗 " + i18n.topTabname3,
        "ℹ️ " + i18n.topTabname4,
    ];
    let activeTab = tabs[0];

    interface BookInfo {
        title: string;
        subtitle?: string;
        authors?: string[];
        translators?: string[];
        isbn: string;
        publisher?: string;
        publishDate?: string;
        pages?: string;
        price?: string;
        originalTitle?: string;
        binding?: string;
        series?: string;
        producer?: string;
        rating?: string;
        ratingCount?: string;
        cover?: string;
        myRating?: string;
        bookCategory?: string;
        readingStatus?: string;
        startDate?: string;
        finishDate?: string;
        addNotes?: boolean;
        description?: string;
        authorBio?: string;
    }

    async function fetchBookData() {
        try {
            // 检查空值
            if (!inputVales) {
                throw new Error(i18n.Error4);
            }

            // ISBN格式判断
            const isISBN = /^(97(8|9))?\d{9}(\d|X)$/.test(inputVales);

            if (isISBN) {
                // ISBN 模式：获取页面并解析
                statusMessage = i18n.statusMessage2;
                const html = await fetchBookHtml(inputVales);
                bookInfo = await fetchDoubanBook(html);
                statusMessage = i18n.statusMessage1;
                bookInfo.addNotes = addNotes1;
                inputVales = bookInfo.isbn;
            } else {
                // 书名搜索模式：打开搜索弹窗
                searchKeyword = encodeURIComponent(inputVales);
                showSearchDialog = true;
            }

            console.log(bookInfo);
        } catch (error) {
            statusMessage = error.message || i18n.statusMessage3;
            console.error("Book acquisition failed:", error);
        }
    }

    async function fetchMovieData() {
        try {
            if (!movieInputVales) {
                throw new Error(i18n.Error4);
            }
            movieSearchKeyword = encodeURIComponent(movieInputVales);
            showMovieSearchDialog = true;
        } catch (error) {
            movieStatusMessage = error.message || i18n.statusMessage3;
        }
    }

    async function handleAddMovie() {
        if (!movieInfo) return;

        const fullData = {
            ...movieInfo,
            databaseBlockId: movieDatabassID,
            myRating: movieRatings[movieRatingIndex],
            movieCategory: movieCategories[movieCategoryIndex],
            watchingStatus: movieStatuses[movieStatusIndex],
            startDate: movieInfo.startDate || "",
            finishDate: movieInfo.finishDate || "",
            addNotes: movieInfo.addNotes,
            noteTemplate: movieNoteTemplate,
        };

        try {
            const result = await loadAVMovieData(movieAvID, fullData, plugin);
            if (result.code === 1) {
                showMessage(`${i18n.showMessage1} ${result.msg}`, 5000);
            } else if (result.code === 0) {
                showMessage(`✅《${movieInfo.title}》已添加`, 3000);
                await fetchPost("/api/ui/reloadAttributeView", { id: movieAvID });
                movieInfo = null;
                movieInputVales = "";
                movieStatusMessage = "";
            }
        } catch (error) {
            showMessage(`${i18n.showMessage1} ${error.message}`, 5000);
        }
    }

    async function handleAddBook() {
        if (!bookInfo) return;

        const fullData = {
            ...bookInfo,
            ISBN: inputVales,
            databaseBlockId: bookDatabassID,
            myRating: customRatings[myRatingIndex],
            bookCategory: customCategories[bookCategoryIndex],
            readingStatus: customReadingStatuses[readingStatusIndex],
            startDate: bookInfo.startDate || "",
            finishDate: bookInfo.finishDate || "",
            publishDate: bookInfo.publishDate || "",
            addNotes: bookInfo.addNotes,
            noteTemplate: noteTemplate,
        };

        try {
            const result = await loadAVData(avID, fullData, plugin);
            if (result.code === 1) {
                showMessage(`${i18n.showMessage1} ${result.msg}`, 5000);
            } else if (result.code === 0) {
                showMessage(
                    `✅《${bookInfo.title}》${i18n.showMessage2}`,
                    3000,
                );
                await fetchPost("/api/ui/reloadAttributeView", { id: avID });
                // 添加成功后清空表单
                bookInfo = null;
                inputVales = "";
                statusMessage = "";
            }
        } catch (error) {
            showMessage(`${i18n.showMessage1} ${error.message}`, 5000);
        }
    }

    function parseCSV(input: string): string[] {
        return input.split(/[，,]/).map((s) => s.trim()).filter(Boolean);
    }

    async function handleSaveSettings() {
        customRatings = parseCSV(tempRatings);
        customCategories = parseCSV(tempCategories);
        customReadingStatuses = parseCSV(tempStatuses);
        if (tempMovieRatings) movieRatings = parseCSV(tempMovieRatings);
        if (tempMovieCategories) movieCategories = parseCSV(tempMovieCategories);
        if (tempMovieStatuses) movieStatuses = parseCSV(tempMovieStatuses);

        try {
            await plugin.saveData("settings.json", {
                ratings: customRatings,
                categories: customCategories,
                statuses: customReadingStatuses,
                addNotes: addNotes1,
                isSYTemplateRender: isSYTemplateRender,
                bookDatabaseID: bookDatabassID,
                noteTemplate: noteTemplate,
                movieDatabaseID: movieDatabassID,
                movieNoteTemplate: movieNoteTemplate,
                movieRatings: movieRatings,
                movieCategories: movieCategories,
                movieStatuses: movieStatuses,
                tmdbApiKey: tmdbApiKey,
            });
            showMessage(i18n.showMessage5, 3000);
            await validateDatabaseID();
            if (movieDatabassID) await validateMovieDatabaseID();
        } catch (error) {
            showMessage(`${i18n.showMessage6} ${error.message}`, 5000);
        }
    }

    async function validateMovieDatabaseID() {
        if (!movieDatabassID) return;
        try {
            movieDatabaseStatusMessage = i18n.databaseStatusMessage1;
            const query = `SELECT * FROM blocks WHERE id = "${movieDatabassID}"`;
            const result = await sql(query);
            if (result.length === 0 || !result[0]?.markdown) {
                throw new Error(i18n.Error1);
            }
            const avDivMatch = result[0].markdown.match(/data-av-id="([^"]+)"/);
            if (!avDivMatch) {
                throw new Error(i18n.Error2);
            }
            movieAvID = avDivMatch[1];
            movieDatabaseStatusMessage = i18n.databaseStatusMessage2;
        } catch (error) {
            showMessage(`${i18n.showMessage4} ${error.message}`, 5000);
            movieDatabaseStatusMessage = `${i18n.showMessage4} ${error.message}`;
            movieDatabassID = "";
            movieAvID = "";
        }
    }

    // 验证数据库ID
    async function validateDatabaseID() {
        if (!bookDatabassID) {
            showMessage(i18n.showMessage3, 3000);
            return;
        }

        try {
            databaseStatusMessage = i18n.databaseStatusMessage1;
            const query = `SELECT * FROM blocks WHERE id = "${bookDatabassID}"`;
            const result = await sql(query);

            if (result.length === 0 || !result[0]?.markdown) {
                throw new Error(i18n.Error1);
            }

            const avDivMatch = result[0].markdown.match(/data-av-id="([^"]+)"/);
            if (!avDivMatch) {
                throw new Error(i18n.Error2);
            }

            avID = avDivMatch[1];
            databaseStatusMessage = i18n.databaseStatusMessage2;
        } catch (error) {
            showMessage(`${i18n.showMessage4} ${error.message}`, 5000);
            databaseStatusMessage = `${i18n.showMessage4} ${error.message}`;
            bookDatabassID = "";
            avID = "";
        }
    }

    onMount(() => {
        const savedISBN = localStorage.getItem("lastISBN");
        if (savedISBN) inputVales = savedISBN;

        plugin.loadData("settings.json").then(async (savedSettings) => {
            if (savedSettings) {
                noteTemplate = savedSettings.noteTemplate || ``;
                if (savedSettings.ratings?.length) {
                    const filtered = savedSettings.ratings.filter(Boolean);
                    if (filtered.length) customRatings = filtered;
                }
                if (savedSettings.categories?.length) {
                    const filtered = savedSettings.categories.filter(Boolean);
                    if (filtered.length) customCategories = filtered;
                }
                if (savedSettings.statuses?.length) {
                    const filtered = savedSettings.statuses.filter(Boolean);
                    if (filtered.length) customReadingStatuses = filtered;
                }
                addNotes1 = savedSettings.addNotes ?? true;
                isSYTemplateRender = savedSettings.isSYTemplateRender ?? false;
                bookDatabassID = savedSettings.bookDatabaseID || "";
                movieDatabassID = savedSettings.movieDatabaseID || "";
                movieNoteTemplate = savedSettings.movieNoteTemplate || "";
                tmdbApiKey = savedSettings.tmdbApiKey || "";

                tempRatings = customRatings.join(", ");
                tempCategories = customCategories.join(", ");
                tempStatuses = customReadingStatuses.join(", ");

                if (savedSettings.movieRatings?.length) {
                    const filtered = savedSettings.movieRatings.filter(Boolean);
                    if (filtered.length) movieRatings = filtered;
                }
                if (savedSettings.movieCategories?.length) {
                    const filtered = savedSettings.movieCategories.filter(Boolean);
                    if (filtered.length) movieCategories = filtered;
                }
                if (savedSettings.movieStatuses?.length) {
                    const filtered = savedSettings.movieStatuses.filter(Boolean);
                    if (filtered.length) movieStatuses = filtered;
                }

                tempMovieRatings = movieRatings.join(", ");
                tempMovieCategories = movieCategories.join(", ");
                tempMovieStatuses = movieStatuses.join(", ");

                if (bookDatabassID) {
                    await validateDatabaseID();
                }
                if (movieDatabassID) {
                    await validateMovieDatabaseID();
                }
            }
        });
    });
</script>

<div class="tab-container">
    <ul class="tab-nav">
        {#each tabs as tab}
            <button
                class:active={tab === activeTab}
                role="tab"
                tabindex="0"
                on:click={() => (activeTab = tab)}
                on:keydown={(e) => e.key === "Enter" && (activeTab = tab)}
            >
                {tab}
            </button>
        {/each}
    </ul>

    <!-- 内容区域 -->
    <div class="tab-content">
        <!-- 第一个标签页 - 书籍查询 -->
        {#if activeTab === tabs[0]}
            <BookSearchTab
                bind:inputVales
                bind:bookInfo
                bind:i18n
                {statusMessage}
                {customRatings}
                {customCategories}
                {customReadingStatuses}
                bind:myRatingIndex
                bind:bookCategoryIndex
                bind:readingStatusIndex
                on:fetchBookData={fetchBookData}
                on:addBook={handleAddBook}
            />

            <!-- 第二个标签页 - 电影查询 -->
        {:else if activeTab === tabs[1]}
            <MovieSearchTab
                bind:inputVales={movieInputVales}
                bind:movieInfo
                bind:i18n
                statusMessage={movieStatusMessage}
                {movieRatings}
                {movieCategories}
                {movieStatuses}
                bind:myRatingIndex={movieRatingIndex}
                bind:categoryIndex={movieCategoryIndex}
                bind:statusIndex={movieStatusIndex}
                on:fetchMovieData={fetchMovieData}
                on:addMovie={handleAddMovie}
            />

            <!-- 第三个标签页 - 用户设置 -->
        {:else if activeTab === tabs[2]}
            <UserSettingsTab
                bind:bookDatabassID
                bind:i18n
                bind:tempRatings
                bind:tempCategories
                bind:tempStatuses
                bind:addNotes1
                bind:isSYTemplateRender
                {databaseStatusMessage}
                bind:movieDatabassID
                bind:tempMovieRatings
                bind:tempMovieCategories
                bind:tempMovieStatuses
                {movieDatabaseStatusMessage}
                bind:tmdbApiKey
                on:validate={validateDatabaseID}
                on:save={handleSaveSettings}
                on:openTemplate={() => {
                    originalTemplate = noteTemplate;
                    showTemplateEditor = true;
                }}
                on:openMovieTemplate={() => {
                    originalMovieTemplate = movieNoteTemplate;
                    showMovieTemplateEditor = true;
                }}
            />
            <!-- 第四个标签页 - 微信读书设置-->
        {:else if activeTab === tabs[3]}
            <WereadTab bind:plugin bind:i18n />

            <!-- 第五个标签页 - 关于插件 -->
        {:else}
            <AboutTab bind:i18n />
        {/if}
    </div>
</div>

<SearchBookDialog
    bind:plugin
    bind:showSearchDialog
    bind:searchKeyword
    on:close={() => (showSearchDialog = false)}
    on:select={async ({ detail }) => {
        try {
            statusMessage = i18n.statusMessage1;
            const selectedBook = detail;
            selectedBook.addNotes = addNotes1;
            bookInfo = selectedBook;
            inputVales = selectedBook.isbn;
            showMessage(`${i18n.showMessage7}《${selectedBook.title}》`, 3000);
        } catch (error) {
            showMessage(`${i18n.showMessage8} ${error.message}`, 5000);
            console.error("Book analysis failed:", error);
        }
    }}
/>

<SearchMovieDialog
    bind:plugin
    bind:showSearchDialog={showMovieSearchDialog}
    bind:searchKeyword={movieSearchKeyword}
    {tmdbApiKey}
    on:close={() => (showMovieSearchDialog = false)}
    on:select={async ({ detail }) => {
        try {
            movieStatusMessage = "成功获取电影信息";
            const selectedMovie = detail;
            selectedMovie.addNotes = true;
            selectedMovie.doubanUrl = selectedMovie.tmdbUrl || selectedMovie.doubanUrl;
            movieInfo = selectedMovie;
            movieInputVales = selectedMovie.title;
            showMessage(`✅ 成功获取《${selectedMovie.title}》`, 3000);
        } catch (error) {
            showMessage(`❌ 解析失败: ${error.message}`, 5000);
            console.error("Movie analysis failed:", error);
        }
    }}
/>

<TemplateEditorDialog
    bind:showTemplateEditor
    bind:noteTemplate
    bind:plugin
    on:close={() => {
        noteTemplate = originalTemplate;
        showTemplateEditor = false;
    }}
    on:save={async () => {
        try {
            const currentSettings =
                (await plugin.loadData("settings.json")) || {};
            currentSettings.noteTemplate = noteTemplate;
            await plugin.saveData("settings.json", currentSettings);
            originalTemplate = noteTemplate;
            showTemplateEditor = false;
            showMessage(i18n.showMessage9, 3000);
        } catch (error) {
            showMessage(`${i18n.showMessage10} ${error.message}`, 5000);
        }
    }}
/>

<TemplateEditorDialog
    bind:showTemplateEditor={showMovieTemplateEditor}
    bind:noteTemplate={movieNoteTemplate}
    bind:plugin
    on:close={() => {
        movieNoteTemplate = originalMovieTemplate;
        showMovieTemplateEditor = false;
    }}
    on:save={async () => {
        try {
            const currentSettings =
                (await plugin.loadData("settings.json")) || {};
            currentSettings.movieNoteTemplate = movieNoteTemplate;
            await plugin.saveData("settings.json", currentSettings);
            originalMovieTemplate = movieNoteTemplate;
            showMovieTemplateEditor = false;
            showMessage("✅ 电影笔记模板保存成功", 3000);
        } catch (error) {
            showMessage(`❌ 模板保存失败: ${error.message}`, 5000);
        }
    }}
/>
