# 📚 SiYuan Reading & Watching Notes (siyuan-douban)

> A [SiYuan](https://b3log.org/siyuan/) plugin that fetches **book / movie / TV series** metadata,
> writes it into SiYuan **attribute-view databases**, and generates note documents from templates.
> It also syncs your WeRead (微信读书) highlights.

**🇨🇳 中文文档：[README_zh_CN.md](README_zh_CN.md)**（完整、详细，推荐阅读）
Detailed Chinese docs live in [`docs/`](docs/).

<p align="center">
  <img src="preview.png" alt="preview" width="720">
</p>

---

## What this fork adds

This project is a fork of [Glaube-TY/siyuan-douban](https://github.com/Glaube-TY/siyuan-douban) **v2.8.1**, with three additions:

| Change | Description |
| --- | --- |
| 🌐 **Web frontend support** | Book search now scrapes the Douban search page through SiYuan's `forwardProxy` and parses the embedded `window.__DATA__` JSON, so it works in the **browser-desktop / browser-mobile** frontends instead of relying on Electron-only APIs. |
| 🎬 **Movie notes** | Integrates the **TMDB API**: a dedicated *Movie Search* tab that searches TMDB, lets you edit every field, writes into a separate **movie database**, and generates a review note. |
| 📺 **TV series notes** | Same flow for TV shows, with TV-specific fields (first air date, seasons, episodes, episode runtime, network), a separate **TV database**, and a generated note. |

Branch: `web-movie-tv`. `main` mirrors upstream and is left untouched.

---

## Features

- **🔍 Book search (Douban)** — query by ISBN or by title (search dialog), auto-fill ~22 metadata fields, download the cover, generate a reading note.
- **🎬 Movie search (TMDB)** — search, pick, edit, choose rating/category/status, write to the movie database, generate a review note. Deduplicated by IMDb ID (falls back to the TMDB URL).
- **📺 TV search (TMDB)** — same as movies, plus seasons / episodes / episode runtime / network / first air date.
- **📗 WeRead sync** — QR login or cookie, full & incremental sync, custom-ISBN / ignored-books / bookID management, optional auto-sync on startup.
- **⚙️ Settings** — three database IDs, per-module rating / category / status option lists, and three note templates.

## Quick start

1. **Create an attribute-view database** in SiYuan (`/属性视图`), then copy its **block ID**.
2. Open the plugin (top-bar 📚 or `⌘/Ctrl + Shift + ;` on desktop) → **User Settings** → paste the block ID for each module you need → **Save**.
   The plugin auto-creates every required column.
3. **Get a free TMDB API key** at <https://www.themoviedb.org/settings/api> (type: Developer) and paste the **API Key (v3 auth)** into the settings. Movies and TV share one key.
4. Use the **Book / Movie / TV Search** tabs, then click **Add**.

Full instructions (Chinese): [docs/使用指南.md](docs/使用指南.md)

## Documentation

| Document | Contents |
| --- | --- |
| [README_zh_CN.md](README_zh_CN.md) | 中文总览：功能、安装、快速上手 |
| [docs/使用指南.md](docs/使用指南.md) | 完整操作手册：配置、各模块使用、微信读书、设置项 |
| [docs/数据库字段说明.md](docs/数据库字段说明.md) | 三个数据库的列名 / 类型 / 数据来源 / 去重规则 |
| [docs/模板变量参考.md](docs/模板变量参考.md) | 读书 / 观影 / 追剧 / 微信读书 四套模板变量清单 |
| [docs/常见问题.md](docs/常见问题.md) | FAQ 与故障排查 |
| [docs/开发文档.md](docs/开发文档.md) | 架构、数据流、内核 API、新增媒体类型、与上游同步 |

## Build

```bash
npm install
npm run build        # -> dist/ + package.zip
npm run dev          # watch mode -> dev/
npm run sync         # build & copy dist/ into the SiYuan plugins dir
```

Stack: **Vite 5 + Svelte 4 + TypeScript**, CJS plugin output, `siyuan` always external, `@/` → `src/`.

## Disclaimer

Book data comes from public Douban pages; movie/TV data comes from [TMDB](https://www.themoviedb.org/).
This product uses the TMDB API but is not endorsed or certified by TMDB.
For personal data management only — **no commercial use**. Use at your own risk.

## Credits & License

Forked from [Glaube-TY/siyuan-douban](https://github.com/Glaube-TY/siyuan-douban).
WeRead integration inspired by [obsidian-weread-plugin](https://github.com/zhaohongxuan/obsidian-weread-plugin).
Licensed under [MIT](LICENSE).
