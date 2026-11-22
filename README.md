# kasperii.github.io

Portfolio of Kasper Karlgren → **https://kasperii.github.io**

A Jekyll site that GitHub Pages builds automatically on every push to `master`.

## Adding a project

Create `_projects/<name>.md`. It will be served at `/work/<name>/` and appear in its section on the front page:

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
| Work sections (title, dates, intro, menu label) | `_data/sections.yml` |
| Skill meters | `_data/skills.yml` |
| Bio text | `index.html` |
| Menu, header, footer | `_includes/` |
| Styles | `css/style.css` |
| Behaviour (menu, project panels) | `js/main.js` |

## Preview locally

```
bundle install
bundle exec jekyll serve   # http://localhost:4000
```
