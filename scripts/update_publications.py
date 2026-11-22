#!/usr/bin/env python3
"""Fetch Kasper Karlgren's works from OpenAlex into _data/publications.json.

Standard library only. Run from the repo root:  python3 scripts/update_publications.py
Hand-kept additions and hidden DOIs live in _data/publications_manual.yml
(merged at build time by publications.html, not here).
Exits 0 and leaves the file untouched if nothing changed.
"""
import json, sys, urllib.request

AUTHOR = "A5059244389"  # Kasper Karlgren, Stockholm University
URL = (f"https://api.openalex.org/works?filter=author.id:{AUTHOR}&per-page=100"
       "&select=id,doi,title,publication_year,publication_date,type,authorships,primary_location")
OUT = "_data/publications.json"

req = urllib.request.Request(URL, headers={"User-Agent": "kasperii.github.io publications updater"})
with urllib.request.urlopen(req, timeout=30) as r:
    works = json.load(r)["results"]

pubs = []
for w in works:
    loc = w.get("primary_location") or {}
    src = loc.get("source") or {}
    pubs.append({
        "year": w["publication_year"],
        "date": w.get("publication_date") or "",
        "title": (w.get("title") or "").strip(),
        "authors": [a["author"]["display_name"] for a in w.get("authorships", [])],
        "venue": src.get("display_name") or "",
        "type": w.get("type") or "",
        "doi": (w.get("doi") or "").replace("https://doi.org/", ""),
    })
pubs.sort(key=lambda p: (p["date"], p["title"]), reverse=True)
new = json.dumps(pubs, ensure_ascii=False, indent=1) + "\n"
try:
    old = open(OUT, encoding="utf-8").read()
except FileNotFoundError:
    old = ""
if new == old:
    print("publications unchanged"); sys.exit(0)
open(OUT, "w", encoding="utf-8").write(new)
print(f"wrote {len(pubs)} publications to {OUT}")
