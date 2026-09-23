#!/usr/bin/env python3
"""Adapt ThreeUI complete-shelf-v2.html into a 6-volume Chikkamagaluru Places shelf."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "complete-shelf-v2.source.html"
OUT = ROOT / "dist" / "places-shelf.html"

# Six volumes — category ids match CKM.destinations[].category
BOOKS_JS = r"""BOOKS = [
      {
        id: "waterfalls",
        title: "Waterfalls",
        roman: "I",
        discipline: "Cascades",
        note: "Monsoon veils and forest plunge pools across the district.",
        deck: "Thirteen named falls from Hebbe and Jhari to hidden Elaneer and Bandaje — fuller after the rains, quieter in summer heat.",
        binding: "Moss cloth · pearl foil",
        format: "Places volume · Chikkamagaluru Companion",
        theme: "Water · monsoon · spray",
        motif: "Veil of pearls",
        motifKey: "brackets",
        paletteLabel: "Fern · mist · river stone",
        color: "#1f4a34",
        foil: "#c8b48a",
        palette: {
          paper: "#0f2418",
          paperDeep: "#0a1810",
          paperPale: "#e8f0e4",
          ink: "#f2f6ef",
          inkSoft: "#a8b8a6",
          wall: "#0f2418",
          shelf: "#2a3d28",
          shelfDark: "#121a12",
          light: "#d9e8c8",
          fill: "#7ea88a"
        },
        categories: ["waterfalls"],
        width: 1.02,
        height: 1.58,
        depth: 0.26,
        chapters: ["Cascades", "Monsoon", "Forest paths"],
        seed: 11
      },
      {
        id: "temples",
        title: "Temples",
        roman: "II",
        discipline: "Living shrines",
        note: "From Tunga terraces to Hoysala stone in the east.",
        deck: "Sringeri, Horanadu, Amruthapura, Belavadi and village shrines — living worship, not museum rooms.",
        binding: "Saffron cloth · temple-gold foil",
        format: "Places volume · Chikkamagaluru Companion",
        theme: "Stone · lamp · river",
        motif: "Kalasha",
        motifKey: "paths",
        paletteLabel: "Saffron · cream · deep red",
        color: "#8b3a1a",
        foil: "#efc16d",
        palette: {
          paper: "#4a2214",
          paperDeep: "#2e140c",
          paperPale: "#ffe8d0",
          ink: "#fff6ec",
          inkSoft: "#d2b49a",
          wall: "#4a2214",
          shelf: "#3a2118",
          shelfDark: "#1c0e0a",
          light: "#f4d7b9",
          fill: "#d4a574"
        },
        categories: ["temples"],
        width: 1.08,
        height: 1.52,
        depth: 0.28,
        chapters: ["Shrines", "Hoysala", "Mathas"],
        seed: 22
      },
      {
        id: "lakes",
        title: "Lakes",
        roman: "III",
        discipline: "Water & dams",
        note: "Evening tanks and working reservoirs under the Baba Budan skyline.",
        deck: "Hirekolale, Ayyanakere, Madagada Kere and the Bhadra / Lakya waters — irrigation, backwaters, and quiet shore light.",
        binding: "Slate-blue cloth · silver foil",
        format: "Places volume · Chikkamagaluru Companion",
        theme: "Still water · reflection",
        motif: "Ripple ring",
        motifKey: "paths",
        paletteLabel: "Lake blue · reed · cloud",
        color: "#1a3d4a",
        foil: "#b8c9d4",
        palette: {
          paper: "#132830",
          paperDeep: "#0c181e",
          paperPale: "#e4eef2",
          ink: "#f0f6f8",
          inkSoft: "#9eb0b8",
          wall: "#132830",
          shelf: "#2a3830",
          shelfDark: "#121816",
          light: "#c5dce6",
          fill: "#7aa0b0"
        },
        categories: ["lakes", "dams"],
        width: 1.0,
        height: 1.48,
        depth: 0.24,
        chapters: ["Tanks", "Reservoirs", "Shore"],
        seed: 33
      },
      {
        id: "ridges",
        title: "Ridges & Views",
        roman: "IV",
        discipline: "Hills · peaks · ghats",
        note: "Grass-and-shola ridges, road-head notches, and coffee-country saddles.",
        deck: "Mullayanagiri to Kudremukh, Kemmanagundi gardens, Charmadi shelves, and viewpoints where daylight decides the walk.",
        binding: "Highland cloth · brass foil",
        format: "Places volume · Chikkamagaluru Companion",
        theme: "Ridge · mist · ghat",
        motif: "Contour line",
        motifKey: "brackets",
        paletteLabel: "Shola green · mist · brass",
        color: "#2d4a28",
        foil: "#c9a227",
        palette: {
          paper: "#1a2e18",
          paperDeep: "#0f1a0e",
          paperPale: "#eaf2e4",
          ink: "#f4f8f0",
          inkSoft: "#a8b89c",
          wall: "#1a2e18",
          shelf: "#334028",
          shelfDark: "#161c12",
          light: "#dce8c8",
          fill: "#8aaa70"
        },
        categories: ["peaks", "viewpoints", "hill-station", "heritage"],
        width: 1.12,
        height: 1.62,
        depth: 0.3,
        chapters: ["Peaks", "Ghats", "Overlooks"],
        seed: 44
      },
      {
        id: "wildlife",
        title: "Wildlife",
        roman: "V",
        discipline: "Forests",
        note: "Tiger country and national park — enter only with a forest permit.",
        deck: "Bhadra Tiger Reserve and Kudremukh National Park: shola, grassland, and rules that keep the forest wild.",
        binding: "Canopy cloth · leaf-gold foil",
        format: "Places volume · Chikkamagaluru Companion",
        theme: "Forest · permit · quiet",
        motif: "Leaf vein",
        motifKey: "paths",
        paletteLabel: "Canopy · umber · gold",
        color: "#1a3820",
        foil: "#d4b86a",
        palette: {
          paper: "#122018",
          paperDeep: "#0a1410",
          paperPale: "#e6efe4",
          ink: "#f0f6ee",
          inkSoft: "#9ab89a",
          wall: "#122018",
          shelf: "#2a3828",
          shelfDark: "#121812",
          light: "#c8dcb0",
          fill: "#6a9068"
        },
        categories: ["wildlife"],
        width: 0.98,
        height: 1.5,
        depth: 0.27,
        chapters: ["Reserve", "Park", "Permit"],
        seed: 55
      },
      {
        id: "treks-forts",
        title: "Treks & Forts",
        roman: "VI",
        discipline: "On foot",
        note: "Walked ridges and hill forts — weather and daylight first.",
        deck: "Ettina Bhuja, Bandaje Arbi, Ballalarayana Durga and kin: serious walks, not packaged hikes sold here.",
        binding: "Trail cloth · iron foil",
        format: "Places volume · Chikkamagaluru Companion",
        theme: "Footpath · fort · ridge",
        motif: "Boot print",
        motifKey: "brackets",
        paletteLabel: "Laterite · khaki · iron",
        color: "#4a3420",
        foil: "#c0b8a8",
        palette: {
          paper: "#2a2018",
          paperDeep: "#18120e",
          paperPale: "#f0e8dc",
          ink: "#f8f4ec",
          inkSoft: "#b8a890",
          wall: "#2a2018",
          shelf: "#3a3020",
          shelfDark: "#1a1610",
          light: "#e0d4b8",
          fill: "#a89070"
        },
        categories: ["treks", "forts"],
        width: 1.05,
        height: 1.56,
        depth: 0.25,
        chapters: ["Ridges", "Forts", "Weather"],
        seed: 66
      }
    ];"""

PLACES_PANEL = """
      <div class="ckm-places-block" id="ckm-places-block">
        <p class="eyebrow ckm-places-eyebrow">Places in this volume</p>
        <div class="ckm-places-list" id="ckm-places-list" role="list"></div>
        <p class="microcopy ckm-places-hint" id="ckm-places-hint">Select a place to open its note.</p>
      </div>
"""

PLACES_CSS = """
    .ckm-places-block {
      margin-top: 22px;
      padding-top: 18px;
      border-top: 1px solid var(--rule);
      max-height: min(42vh, 360px);
      overflow: auto;
      pointer-events: auto;
    }
    .ckm-places-eyebrow {
      margin: 0 0 10px;
    }
    .ckm-places-list {
      display: grid;
      gap: 8px;
    }
    .ckm-place-card {
      display: grid;
      grid-template-columns: 72px 1fr;
      gap: 10px;
      align-items: center;
      width: 100%;
      padding: 0;
      border: 1px solid var(--rule);
      background: rgba(255, 255, 255, 0.04);
      text-align: left;
      cursor: pointer;
      color: inherit;
      font: inherit;
      transition: border-color 180ms var(--ease-out), background 180ms var(--ease-out);
    }
    .ckm-place-card:hover,
    .ckm-place-card:focus-visible {
      border-color: var(--accent);
      background: rgba(255, 255, 255, 0.08);
    }
    .ckm-place-card img {
      width: 72px;
      height: 54px;
      object-fit: cover;
      display: block;
    }
    .ckm-place-card .ckm-place-copy {
      padding: 6px 10px 6px 0;
    }
    .ckm-place-card .ckm-place-name {
      margin: 0;
      font-size: 15px;
      line-height: 1.25;
    }
    .ckm-place-card .ckm-place-meta {
      margin: 2px 0 0;
      font-family: var(--mono);
      font-size: 10px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--ink-soft);
    }
    .ckm-places-hint {
      margin: 12px 0 0;
    }
    .ckm-back-classic {
      position: fixed;
      top: 28px;
      right: 28px;
      z-index: 20;
      pointer-events: auto;
      font-family: var(--mono);
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--ink-soft);
      text-decoration: none;
      border-bottom: 1px solid transparent;
    }
    .ckm-back-classic:hover {
      color: var(--ink);
      border-bottom-color: var(--accent);
    }
    .detail-panel {
      pointer-events: auto;
    }
"""

CKM_HELPERS = r"""
    function renderCKMPlaces(book) {
      const listEl = document.querySelector("#ckm-places-list");
      const hintEl = document.querySelector("#ckm-places-hint");
      if (!listEl || !hintEl || !book) return;
      const cats = new Set(book.categories || [book.id]);
      const all = (window.CKM && window.CKM.destinations) || [];
      const places = all.filter((d) => cats.has(d.category));
      listEl.innerHTML = "";
      if (!places.length) {
        hintEl.textContent = "No places mapped to this volume yet.";
        return;
      }
      hintEl.textContent = places.length + " place" + (places.length === 1 ? "" : "s") + " · tap a card";
      places.forEach((place) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ckm-place-card";
        btn.setAttribute("role", "listitem");
        const img = document.createElement("img");
        img.src = place.image || "";
        img.alt = "";
        img.width = 72;
        img.height = 54;
        img.loading = "lazy";
        const copy = document.createElement("span");
        copy.className = "ckm-place-copy";
        const name = document.createElement("span");
        name.className = "ckm-place-name";
        name.textContent = place.name;
        const meta = document.createElement("span");
        meta.className = "ckm-place-meta";
        meta.textContent = place.taluk || place.category || "";
        copy.append(name, meta);
        btn.append(img, copy);
        btn.addEventListener("click", () => {
          window.location.href = "places.html?id=" + encodeURIComponent(place.id) + "&from=shelf";
        });
        listEl.appendChild(btn);
      });
    }

"""


def replace_books(html: str) -> str:
    start = html.find("BOOKS = [")
    if start < 0:
        raise SystemExit("BOOKS array not found")
    j = html.find("[", start)
    depth = 0
    end = None
    for k, ch in enumerate(html[j:], j):
        if ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                end = k + 1
                break
    if end is None:
        raise SystemExit("BOOKS array end not found")
    # keep trailing semicolon if present
    return html[:start] + BOOKS_JS + html[end:]


def main() -> None:
    html = SOURCE.read_text(encoding="utf-8")

    html = html.replace(
        "<title>Working Volumes — Seven Tools for Making</title>",
        "<title>Places · Working Volumes — Chikkamagaluru Companion</title>",
    )
    html = html.replace(
        "Working Volumes is an original interactive Three.js library of seven tactile field guides for contemporary creative tools.",
        "Browse Chikkamagaluru places as six field volumes — waterfalls, temples, lakes, ridges, wildlife, and treks.",
    )
    html = html.replace("Working Volumes", "Malnad Volumes")
    html = html.replace("Seven tools for making.", "Six volumes for the district.")
    html = html.replace("Seven Tools for Making", "Six Volumes for Chikkamagaluru")
    html = html.replace("seven tactile field guides", "six place volumes")
    html = html.replace("SEVEN FIELD GUIDES", "SIX PLACE VOLUMES")
    html = html.replace("Seven field guides", "Six place volumes")
    html = html.replace("seven field guides", "six place volumes")
    html = html.replace("Seven Volumes", "Six Volumes")
    html = html.replace(
        'aria-label="Seven conceptual hardcovers"',
        'aria-label="Six conceptual hardcovers"',
    )
    html = html.replace(
        "// Seven 2:3 cover artworks arranged left to right in one embedded atlas.",
        "// Six 2:3 cover artworks arranged left to right in one embedded atlas.",
    )
    html = html.replace("7 / 07", "6 / 06")
    html = html.replace("--accent: #c87046;", "--accent: #c8b48a;")

    html = replace_books(html)

    # Inject places panel before closing aside
    html = html.replace(
        '          <button class="text-button reset-button" id="reset-view" type="button">Reset view</button>\n        </div>\n      </div>\n    </aside>',
        '          <button class="text-button reset-button" id="reset-view" type="button">Reset view</button>\n        </div>\n      </div>\n'
        + PLACES_PANEL
        + "    </aside>",
    )

    # Inject CSS before </style> that closes main stylesheet - find first large style block end
    # Insert before the last </style> in head area - actually inject after :root block's parent
    style_close = html.find("</style>")
    if style_close < 0:
        raise SystemExit("style not found")
    html = html[:style_close] + PLACES_CSS + "\n  " + html[style_close:]

    # Load companion data before module script
    mod = html.find('<script type="module">')
    if mod < 0:
        raise SystemExit("module script not found")
    data_tag = '  <script src="data.js?v=shelves1"></script>\n'
    html = html[:mod] + data_tag + html[mod:]

    # Back link
    body = html.find("<body>")
    if body < 0:
        body = html.find("<body ")
    insert_at = html.find(">", body) + 1
    html = (
        html[:insert_at]
        + '\n  <a class="ckm-back-classic" href="places.html">Classic places list</a>\n'
        + html[insert_at:]
    )

    # Inject helper before async function initialize
    init_at = html.find("async function initialize")
    if init_at < 0:
        init_at = html.find("function initialize")
    if init_at < 0:
        raise SystemExit("initialize not found")
    html = html[:init_at] + CKM_HELPERS + html[init_at:]

    # Call renderCKMPlaces at end of populateDetail
    marker = "detailMotif.textContent = book.motif;"
    if marker not in html:
        raise SystemExit("populateDetail marker missing")
    html = html.replace(
        marker,
        marker + "\n      renderCKMPlaces(book);",
        1,
    )

    OUT.write_text(html, encoding="utf-8")
    print("wrote", OUT, "bytes", OUT.stat().st_size)


if __name__ == "__main__":
    main()
