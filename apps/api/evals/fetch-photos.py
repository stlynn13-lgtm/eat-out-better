#!/usr/bin/env python3
"""
Re-create the eval menu photos from each restaurant's own PDF.

The photos used to live in the repo; they're the restaurants' menu designs, so
once the repo went public (2026-10-06) they came out. Each menu file records
where its PDF lives (source.url) and which pages were used (source.pages), so
the exact images can be rebuilt on demand instead of republished.

    python3 apps/api/evals/fetch-photos.py            # every menu
    python3 apps/api/evals/fetch-photos.py okada      # one menu

macOS only (renders with `sips`); needs `pip install pypdf`. Pages are rendered
to JPEG at 1600px on the long edge, quality 80 — within a hair of what the app
uploads (MAX_DIMENSION 1568 in apps/mobile/lib/utils/image.ts).

A restaurant can change or remove its PDF; if a download fails, the menu's
transcription and answer key still work for the scoring eval, which never
needed the photos.
"""

import json, os, subprocess, sys, tempfile, urllib.request

import pypdf

HERE = os.path.dirname(os.path.abspath(__file__))
MENUS, PHOTOS = os.path.join(HERE, "menus"), os.path.join(HERE, "photos")


def fetch(menu_id: str) -> None:
    m = json.load(open(os.path.join(MENUS, f"{menu_id}.json")))
    src = m.get("source") or {}
    if not src.get("url") or not src.get("pages"):
        return
    out = os.path.join(PHOTOS, menu_id)
    os.makedirs(out, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        pdf = os.path.join(tmp, "menu.pdf")
        req = urllib.request.Request(src["url"], headers={"User-Agent": "Mozilla/5.0"})
        try:
            with urllib.request.urlopen(req, timeout=60) as r, open(pdf, "wb") as f:
                f.write(r.read())
            reader = pypdf.PdfReader(pdf)
        except Exception as e:
            print(f"  {menu_id}: could not fetch {src['url']} ({e})")
            return
        for i, page in enumerate(src["pages"], 1):
            single = os.path.join(tmp, f"p{page}.pdf")
            w = pypdf.PdfWriter(); w.add_page(reader.pages[page - 1]); w.write(single)
            subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "80", "-Z", "1600",
                            single, "--out", os.path.join(out, f"p{i}.jpg")], capture_output=True, check=True)
    print(f"  {menu_id}: {len(src['pages'])} photo(s)")


if __name__ == "__main__":
    ids = sys.argv[1:] or sorted(f[:-5] for f in os.listdir(MENUS) if f.endswith(".json"))
    for menu_id in ids:
        fetch(menu_id)
