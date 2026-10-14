# siyuan-douban

SiYuan note plugin for fetching Douban book/movie info and syncing WeRead notes.

## Build & dev

```bash
npm run dev        # watch → dev/  (CJS library output)
npm run build      # production → dist/ + package.zip
npm run make-link  # symlink dev/ to SiYuan workspace plugins dir (requires SiYuan running at localhost:6806)
npm run make-install  # build dist/ + copy to SiYuan plugins dir
npm run update-version  # interactive version bump for plugin.json + package.json
```

CI (`v*` tags) uses `pnpm install && pnpm build` and uploads `package.zip` as a release artifact.

## Architecture

- **Entry**: `src/index.ts` — exports `PluginDouban extends Plugin` (from `siyuan` npm package)
- **Build**: Vite 5, outputs **CJS only** (SiYuan plugin format). `siyuan` is marked external, never bundled.
- **UI**: Svelte 4 components; dialogs managed via `svelteDialog()` in `src/libs/dialog.ts`
- **Path alias**: `@/` → `src/`
- **I18n**: JSON files in `public/i18n/` (YAML → JSON conversion via `yaml-plugin.js` for dev mode)
- **Settings**: Persisted via `plugin.loadData/saveData`; `src/libs/setting-utils.ts` defines a generic settings framework (unused)
- **No tests** exist in this repo.

## Features

### 读书笔记 (Books)
- **Douban crawler**: `src/utils/douban/book/` — `fetchBookHtml`, `fetchDoubanBook`, `searchDoubanBooks`
- **Data persistence**: `src/utils/bookHandling/index.ts` — `loadAVData()` adds book rows to the SiYuan attribute view database (shared `bookDatabassID`)
- **Dedup key**: ISBN column
- **Template placeholders**: `{{书名}}`, `{{作者}}`, `{{出版社}}`, `{{豆瓣评分}}`, etc.
- **Form**: `src/components/tabs/BookSearchTab.svelte`

### 观影笔记 (Movies)
- **TMDB API**: `src/utils/douban/movie/` — `searchTMDBMovies`, `fetchTMDBMovie`. Uses direct `fetch()` (not `forwardProxy`). Requires user-provided `tmdbApiKey` in settings.
- **Data persistence**: `src/utils/movieHandling/index.ts` — `loadAVMovieData()` adds movie rows to a **separate** SiYuan attribute view database (`movieDatabassID`)
- **Dedup key**: IMDb编号 column (from TMDB `imdb_id`); falls back to TMDB URL
- **Template placeholders**: `{{电影名}}`, `{{导演}}`, `{{主演}}`, `{{类型}}`, `{{豆瓣评分}}`, etc.
- **Form**: `src/components/tabs/MovieSearchTab.svelte`
- **Dropdown options**: Separate configurable movie ratings, categories (剧情/喜剧/动作…), and watching statuses (想看/在看/已看) in settings
- **API Key**: User must set TMDB API Key in Settings → 电影数据库 section

### 微信读书同步 (WeRead)
- `src/utils/weread/`: QR login, cookie auth, note sync engine
- Uses `loadAVData()` to insert synced books into the book database

## Custom select component

- `src/libs/components/CustomSelect.svelte` — div-based dropdown used in both book and movie forms (avoids native `<select>` quirks in browser frontend)

## Key conventions

- `"type": "module"` throughout — all scripts are ESM
- `strict: false` in tsconfig, but `noUnusedLocals` and `noUnusedParameters` are on
- Svelte a11y warnings suppressed for `a11y-click-events-have-key-events`, `a11y-no-static-element-interactions`, `a11y-no-noninteractive-element-interactions`
- Version is kept in sync between `plugin.json` and `package.json`
- Keyboard shortcut: `⌘⇧;` opens the plugin (desktop only; mobile shows error toast)
- Two separate settings groups (book + movie) saved together into `settings.json`
