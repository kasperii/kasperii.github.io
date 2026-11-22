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

- **Content is data-driven.** `index.html` loops over `_data/sections.yml` (PhD / Netlight / Master / Other, in display order) and, for each section, the `_projects` documents whose `section:` matches, sorted by `order:`. The menu (`_includes/topbar.html`) is generated from the same sections file. The skill meters come from `_data/skills.yml`.
- **One file per project:** `_projects/<name>.html|.md` becomes `/work/<name>/` through `_layouts/project.html`. The front matter fields are `title`, `section`, `order`, `thumbnail` (a `-thumb.webp` path), an optional `redirect_from` (the old `/work/proj-*.html` URLs) and an optional `published: false` (Tokyo modelling is hidden that way). Existing projects are HTML bodies. New ones can be Markdown.
- **Two ways a project is shown, same markup:** the standalone page renders the body inside `.project-body`. On the home page, `js/main.js` intercepts thumbnail clicks, fetches the project page, takes its `.project-body`, and slides it into that section's `.work-belt` panel.
  - It uses `history.pushState`, so the URL is shareable and Back closes the panel (a `popstate` handler).
  - `innerHTML` doesn't execute scripts, so `runScripts()` re-creates `<script>` tags. The CodePen embeds in mandelbrot and game-of-life depend on this.
  - Keep `.project-body` as the content wrapper in `_layouts/project.html`, or the panel breaks.
- **Paths:** project bodies are also injected into `/`, so asset paths inside them must be root-absolute (`/img/...`). Relative paths break on one of the two views.
- **Styling:** a single hand-maintained `css/style.css`. There's no Sass any more. Visual state lives in classes:
  - `.menu-open` on `<html>` drives the menu overlay, the hamburger morph and the logo colour.
  - `.work-belt.is-open` slides a belt.
  - The `[hidden]` attribute hides a panel.
  - `body.project-page` (set through `_config.yml` defaults) styles standalone project pages.
- **The logo** is four copies of one SVG path (`_includes/logo-paths.html`). `main.js` slides the header copy's paths on scroll. The footer uses the same include without the `logoblack` class.

## Assets

- **Fonts:** `/fonts/*.woff2` are Latin subsets. Iosevka Aile SemiBold was extracted from a 19 MB `.ttc`. The originals are in `_originals/`.
- **Images:** WebP, max 1600px wide, converted to sRGB. Thumbnails are separate 640px `*-thumb.webp` files. When adding images, convert the same way (many source PNGs are Display P3 and lose colour if the profile is just dropped).
- **`_originals/`** is git-ignored and holds local full-resolution masters, `.ai` design files and the old fonts. It's never committed or deployed, and `.gitignore` also blocks `*.ai`, `*.zip` and `*.heic`.
- **CV:** the current CV is `img/CV_Kasper_Karlgren.pdf`, linked from the bio. The other PDFs in `img/` are older CVs. They're kept out of the sitemap.
