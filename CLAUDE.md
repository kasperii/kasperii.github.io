# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Kasper Karlgren's portfolio, a Jekyll site that GitHub Pages builds and serves from the `master` branch at https://kasperii.github.io. There's no build pipeline in the repo: GitHub Pages runs Jekyll 3.10 with its whitelisted plugins (`jekyll-seo-tag`, `jekyll-sitemap`, `jekyll-redirect-from`) on push.

## Local preview

```
bundle install            # once; Gemfile pins the github-pages gem
bundle exec jekyll serve  # http://localhost:4000
```

The `github-pages` gem's dependencies need a newer Ruby than the macOS system Ruby (2.6), so use a Homebrew or rbenv Ruby.

## Before every push to master (it deploys immediately)

1. Build and serve locally, then run `node test/smoke.mjs http://127.0.0.1:4000/`. It drives headless Chrome through the real interactions (thumbnails, panel, back/forward, menu, project pages, mobile overflow, broken links, JS errors) and must print "All checks passed". Add `SHOTS=<dir>` to get screenshots, and look at them.
2. Have the user look at the local build when the change is visual.
3. After pushing, wait for the Pages build, then run `node test/smoke.mjs https://kasperii.github.io/` against the live site.

Deploy-only problems a fresh local browser won't show: GitHub Pages serves everything with `Cache-Control: max-age=600`. The `?v={{ site.time }}` on the CSS and JS in `_includes/head.html` prevents visitors from getting new HTML with the previous deploy's CSS. The first deploy shipped without it, and the layout looked broken (stretched images, clicks doing nothing) for anyone with the old CSS cached. Keep any new CSS or JS files versioned the same way.

## Architecture

- **Views, no reloads.** Every page is a real Jekyll page whose content sits in `<main id="view" data-view="…">` (`_layouts/default.html`). The views are home `/`, `/projects/`, `/timeline/`, `/publications/`, `/speaking/` and `/work/<name>/`. `js/main.js` intercepts internal links to them, fetches the target page, swaps `#view` and calls `pushState`. Back and Forward use the same path (`popstate` → `go()`, which restores the scroll position). The fixed KK logo (`_includes/topbar.html`) links home. Its scroll animation slides the four copies of the path in `_includes/logo-paths.html`.
- **Projects are data-driven.** `_includes/projects.html` loops over `_data/sections.yml` and the `_projects` documents with a matching `section:`, sorted by `order:`. Each section is a `<details>` that folds (remembered in `localStorage`): the intro on the left third, `.work-area` on the right two-thirds.
- **Opening a project.** `/work/<name>/` (`_layouts/project.html`) renders the *same* Projects view with that project's `.panel .project-body` in place of its section's grid. Between two Projects views `main.js` swaps only the `.work-area`s that differ, so a click "opens" the project next to its section. A shared link lands in the same state.
  - `importNode` doesn't execute scripts, so `runScripts()` re-creates `<script>` tags. The CodePen embeds in mandelbrot and game-of-life depend on this.
  - Project front matter fields: `title`, `section`, `order`, `thumbnail` (a `-thumb.webp` path), an optional `redirect_from` (the old `/work/proj-*.html` URLs) and an optional `published: false` (Tokyo modelling is hidden that way). `view: projects` comes from `_config.yml` defaults: front matter in a layout isn't visible as `page.*`.
  - Old `/#section-x` links are redirected to `/projects/#section-x` by `main.js`.
- **Paths:** project bodies are shown under `/work/<name>/`, so asset paths inside them must be root-absolute (`/img/...`).
- **Publications:** `scripts/update_publications.py` (standard library) writes `_data/publications.json` from OpenAlex author `A5059244389`. `_data/publications_manual.yml` adds missing entries and hides wrong DOIs. KTH student theses are listed separately.
- **Speaking:** `_data/speaking.yml`. **Timeline:** a placeholder, still to be built.
- **Styling:** a single hand-maintained `css/style.css` with tokens on `:root`. Off-white background, black ink, no accent colour; hover is a bold black outline. Fonts: Urbscape (Kasper's own typeface, used for the name), Instrument Sans (text) and Iosevka (mono `.tag` labels).

## Assets

- **Fonts:** `/fonts/*.woff2` are Latin subsets. Instrument Sans is OFL, from Google Fonts. Iosevka Aile SemiBold was extracted from a 19 MB `.ttc`. The originals are in `_originals/`.
- **Images:** WebP, max 1600px wide, converted to sRGB. Thumbnails are separate 640px `*-thumb.webp` files. When adding images, convert the same way (many source PNGs are Display P3 and lose colour if the profile is just dropped).
- **`_originals/`** is git-ignored and holds local full-resolution masters, `.ai` design files and the old fonts. It's never committed or deployed, and `.gitignore` also blocks `*.ai`, `*.zip` and `*.heic`.
- **CV:** the current CV is `img/CV_Kasper_Karlgren.pdf`, linked from the bio. The other PDFs in `img/` are older CVs. They're kept out of the sitemap.
