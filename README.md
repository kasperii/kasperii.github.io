# kasperii.github.io

Portfolio of Kasper Karlgren → **https://kasperii.github.io**

A Jekyll site that GitHub Pages builds automatically on every push to `master`.

## Adding a project

Create `_projects/<name>.md`. It will be served at `/work/<name>/` and appear in its section on `/projects/`:

```markdown
---
title: "My project"
section: other        # phd | netlight | master | other  (see _data/sections.yml)
order: 10             # position within the section
thumbnail: /img/work/MyProject/thumb-thumb.webp
---
Some intro text, written in **Markdown** (HTML works too).

![Description of the image](/img/work/MyProject/picture.webp)
```

Use root-absolute image paths (`/img/...`) and WebP images (max ~1600px wide; thumbnails ~640px).
To hide a project without deleting it, add `published: false`.

## Editing other content

| What | Where |
| --- | --- |
| Landing text, role lines, links | `index.html` |
| Project sections (title, years, intro) | `_data/sections.yml` |
| Speaking & media | `_data/speaking.yml` |
| Publications | auto: `python3 scripts/update_publications.py`; extra/hidden entries in `_data/publications_manual.yml` |
| Styles | `css/style.css` |
| Behaviour (view swapping, project panels, folds) | `js/main.js` |

## Preview and test locally (before pushing!)

Pushing to `master` publishes immediately, so check it locally first:

```
bundle install
bundle exec jekyll serve           # http://localhost:4000 - have a look
node test/smoke.mjs                # automated checks in headless Chrome
```

After the push, `node test/smoke.mjs https://kasperii.github.io/` checks the live site.
