# siyuan-douban

SiYuan note plugin for fetching Douban book / TMDB movie & TV series info and syncing WeRead notes.

Fork of [Glaube-TY/siyuan-douban](https://github.com/Glaube-TY/siyuan-douban) v2.8.1 (this fork ships as plugin version 2.9.0).
Active work happens on the `web-movie-tv` branch; `main` mirrors upstream and is not modified.
See `docs/开发文档.md` §10 for the upstream-sync workflow and §11 for release gotchas.

## Build & dev

```bash
npm run dev        # watch → dev/  (CJS library output)
npm run build      # production → dist/ + package.zip
npm run make-link  # symlink dev/ to SiYuan workspace plugins dir (requires SiYuan running at localhost:6806)
npm run make-install  # build dist/ + copy to SiYuan plugins dir
npm run sync       # build + copy dist/ into the hard-coded docker plugins dir
npm run update-version  # interactive version bump for plugin.json + package.json
```

CI (`v*` tags) uses `pnpm install && pnpm build` and uploads `package.zip` as a release artifact.
There is no typecheck script, but `npx tsc --noEmit -p tsconfig.json` passes.

Release gotchas specific to this fork (details in `docs/开发文档.md` §11):
- Tag as **`vX.Y.Z-fork`** — upstream already owns `v2.9.0`…`v4.x`, and this branch descends from v2.8.1, so reusing `v2.9.0` would be wrong and would require force-pushing over an upstream tag.
- A fresh fork's workflows are **unregistered**; `gh api /actions/workflows` returns `total_count: 0` and tag pushes do nothing until `PUT /actions/permissions` is called once. Re-push the tag afterwards.
- `release.yml` declares `permissions: contents: write` because fork `GITHUB_TOKEN`s default to read-only.

## Architecture

- **Entry**: `src/index.ts` — exports `PluginDouban extends Plugin` (from `siyuan` npm package)
- **Build**: Vite 5, outputs **CJS only** (SiYuan plugin format). `siyuan` is marked external, never bundled.
- **UI**: Svelte 4 components; dialogs managed via `svelteDialog()` in `src/libs/dialog.ts`
- **Path alias**: `@/` → `src/`
- **I18n**: JSON files in `public/i18n/` (YAML → JSON conversion via `yaml-plugin.js` for dev mode).
  Both `zh_CN.json` and `en_US.json` must stay key-identical; 4-space indent, no `\uXXXX` escapes.
- **Settings**: Persisted via `plugin.loadData/saveData`; `src/libs/setting-utils.ts` defines a generic settings framework (unused)
- **No tests** exist in this repo. Verify manually: `npm run build` + `npx tsc --noEmit`.

## Features

Three media types share one pattern: **search (dialog) → editable form tab → `loadAV*Data()` persistence → templated note doc**.
The three modules are near-independent copies; when changing one, check whether the other two need the same fix.

### 读书笔记 (Books)
- **Douban crawler**: `src/utils/douban/book/` — `fetchBookHtml` (accepts ISBN *or* Douban subject ID), `fetchDoubanBook`, `searchDoubanBooks`
- **Search**: scrapes `search.douban.com/book/subject_search` through `forwardProxy` and parses embedded `window.__DATA__` (DOM fallback) — this is the browser-frontend adaptation, do not replace it with Electron APIs
- **Data persistence**: `src/utils/bookHandling/index.ts` — `loadAVData()` adds book rows to the attribute view database (`bookDatabassID`)
- **Dedup key**: ISBN column
- **Template placeholders**: `{{书名}}`, `{{作者}}`, `{{出版社}}`, `{{豆瓣评分}}`, … (see `docs/模板变量参考.md`)
- **Form**: `src/components/tabs/BookSearchTab.svelte`

### 观影笔记 (Movies)
- **TMDB API**: `src/utils/douban/movie/` — `searchTMDBMovies`, `fetchTMDBMovie`. Uses `plugin.client.$fetch` when available, else `fetch()`. Requires user-provided `tmdbApiKey` in settings.
- **Data persistence**: `src/utils/movieHandling/index.ts` — `loadAVMovieData()` adds movie rows to a **separate** attribute view database (`movieDatabassID`)
- **Dedup key**: IMDb编号 column (from TMDB `imdb_id`); falls back to TMDB URL
- **Template placeholders**: `{{电影名}}`, `{{导演}}`, `{{主演}}`, `{{类型}}`, `{{评分}}`, … — note it is `{{评分}}`, **not** `{{豆瓣评分}}`
- **Form**: `src/components/tabs/MovieSearchTab.svelte`

### 追剧笔记 (TV series)
- **TMDB API**: `src/utils/douban/tv/` — `searchTMDBTvs`, `fetchTMDBTv` (endpoints `/search/tv` and `/tv/{id}?append_to_response=credits,external_ids`)
- **Data persistence**: `src/utils/tvHandling/index.ts` — `loadAVTvData()` writes to `tvDatabassID`
- **Dedup key**: IMDb编号 (from `external_ids.imdb_id`), falls back to TMDB URL
- **TV-specific fields**: 首播日期, 季数, 集数, 单集片长, 电视台. Director prefers TMDB `created_by` (creators), falling back to `crew[job=Director]`.
- **Template placeholders**: `{{剧名}}`, `{{首播日期}}`, `{{季数}}`, `{{电视台}}`, …
- **Form**: `src/components/tabs/TvSearchTab.svelte`
- **Optional per-episode notes**: checkbox `tvInfo.addEpisodeNotes` → `generateEpisodeNotes()` in `tvHandling/index.ts`.
  `fetchTMDBTvSeasons()` (`douban/tv/fetchEpisodes.ts`) pulls every season (concurrency 4) and **skips season 0 (specials)**.
  One doc per episode at `{db hpath}/{剧名}/{第N季}/{第NN集 集标题}`; season folders are auto-created by SiYuan.
  Episode docs are NOT bound to the database row. Episode template is `tvEpisodeNoteTemplate` (`DEFAULT_TV_EPISODE_TEMPLATE` is the fallback).
  Episode-only vars: `{{当前季}} {{当前集}} {{季集}} {{集标题}} {{集简介}} {{集播出日期}} {{集时长}} {{集剧照}} {{集评分}} {{集评分人数}}`, layered on top of all TV-level vars (`renderTvTemplate()` then episode vars).
  `{{季数}}`/`{{集数}}` stay the series totals — do not overload them for episode numbers.

### 微信读书同步 (WeRead)
- `src/utils/weread/`: QR login, cookie auth, note sync engine
- Uses `loadAVData()` to insert synced books into the book database
- Template engine supports section syntax `{{#chapters}}…{{/chapters}}`, `{{#notes}}`, `{{#bookInfo}}`, `{{#AISummary}}`, `{{#bestHighlights}}` — see `docs/模板变量参考.md` §4
- Gotcha: a line containing `{{highlightComment}}` is dropped entirely for highlights that have no comment

## Custom select component

- `src/libs/components/CustomSelect.svelte` — div-based dropdown used in book / movie / TV forms (avoids native `<select>` quirks in browser frontend)

## Key conventions

- `"type": "module"` throughout — all scripts are ESM
- `strict: false` in tsconfig, but `noUnusedLocals` and `noUnusedParameters` are on — unused imports fail the build
- Svelte a11y warnings suppressed for `a11y-click-events-have-key-events`, `a11y-no-static-element-interactions`, `a11y-no-noninteractive-element-interactions`
- Version is kept in sync between `plugin.json` and `package.json`
- Keyboard shortcut: `⌘⇧;` opens the plugin (desktop only; mobile shows error toast)
- Main panel tabs are index-based (`activeTab === tabs[n]`); inserting a tab means shifting every later index
- Four settings groups (book + movie + TV + WeRead) saved together into `settings.json`
- Attribute-view column names are matched literally; adding a field means updating `getXAttributeType`, `buildXBlocksValues`, the template renderer, the form tab, and the i18n files

## Documentation

User & dev docs live in `docs/` (`使用指南`, `数据库字段说明`, `模板变量参考`, `常见问题`, `开发文档`).
Keep them in sync when changing features, field names, or placeholders.
