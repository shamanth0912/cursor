#!/usr/bin/env python3
"""Build Bloom-style Scrollcraft worldflight bean-to-cup preview page.

Preview only — do not deploy to production / aroha main.
"""
from __future__ import annotations

import html
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "dist" / "bean-to-cup.html"

# 00–14 beats from companion kage-walk.js (EN copy).
BEATS = [
    {
        "id": "saint",
        "src": "assets/bean-to-cup/story-00-baba-budan.webp",
        "rail": "Saint",
        "act": "I",
        "k": "00 · The saint",
        "h": "Baba Budan, the name on this ridge",
        "p1": "Coffee did not arrive in this district as a cup. It arrived as a story about a Sufi: seven Mocha seeds, carried home and set in courtyard earth on Chandra Drona.",
        "p2": "The years disagree. The ridge does not. This page is not a shop. Two acts: first the saint, then the crop as it is still grown and drunk here.",
    },
    {
        "id": "plant",
        "src": "assets/bean-to-cup/story-01-plant.webp",
        "rail": "Plant",
        "act": "I",
        "k": "01 · The plant",
        "h": "A shrub that liked mist",
        "p1": "Before it was a cup on the Chikkamagaluru bus, coffee was a red cherry in highland weather, a shrub that preferred cloud to open sun.",
        "p2": "What took root on Chandra Drona is still that same highland thing: shade-hungry, slow, and particular about rain.",
    },
    {
        "id": "mocha",
        "src": "assets/bean-to-cup/story-02-mocha.webp",
        "rail": "Mocha",
        "act": "I",
        "k": "02 · Mocha",
        "h": "The harbour that sold the cup",
        "p1": "On the Yemeni shore, Mocha became the name people used when they meant coffee itself. The city sold the roasted drink freely enough. Live seed was another matter.",
        "p2": "Keep the tree at home, and the world stays a customer. What left that harbour as cargo was meant to be drunk, not planted.",
    },
    {
        "id": "seeds",
        "src": "assets/bean-to-cup/story-03-seeds.webp",
        "rail": "Seeds",
        "act": "I",
        "k": "03 · Seven seeds",
        "h": "A courtyard on this ridge",
        "p1": "Then a Sufi from these hills is said to have come home with seven Mocha seeds and set them in the courtyard of his hermitage on Baba Budan Giri. Some tellings put that planting near 1600. Others nearer 1670.",
        "p2": "The years argue. The ridge does not. It still carries his name, and the trees still like the same mist.",
    },
    {
        "id": "voyage",
        "src": "assets/bean-to-cup/story-04-voyage.webp",
        "rail": "Voyage",
        "act": "I",
        "k": "04 · The Hajj lore",
        "h": "What the hills still tell",
        "p1": "The story that travels with the seeds is a smuggler's story: seven raw beans, because seven is sacred, tucked away so a port would not notice a future forest leaving in a pilgrim's clothes.",
        "p2": "No ship's book confirms it. The district tells it anyway. Believe the slope. Treat the beard as lore.",
    },
    {
        "id": "hermitage",
        "src": "assets/bean-to-cup/story-05-hermitage.webp",
        "rail": "Hermitage",
        "act": "I",
        "k": "05 · Chandra Drona",
        "h": "A garden before it was a crop",
        "p1": "Those first plants did not become a landscape overnight. For a long time they were a curiosity in courtyard earth, a few trees behind a house, not yet the silver-oak rows on the Charmadi road.",
        "p2": "Chandra Drona held a garden before it held an estate. The shrine is still on that ridge. The crop learned patience here.",
    },
    {
        "id": "estate",
        "src": "assets/bean-to-cup/story-06-estate.webp",
        "rail": "Estate",
        "act": "I",
        "k": "06 · Estate country",
        "h": "When the forest learned rows",
        "p1": "Rows came later. In the 1820s planters opened country beside this same ridge, and the crop walked on into Wayanad, the Shevaroys, the Nilgiris.",
        "p2": "What had been a hermitage tree became a hillside of labour, shade measured, paths named, a bungalow on the shoulder of the hill.",
    },
    {
        "id": "shade-work",
        "src": "assets/bean-to-cup/story-07-shade-work.webp",
        "rail": "Shade work",
        "act": "I",
        "k": "07 · Shade work",
        "h": "What you see from the bus",
        "p1": "Look out between Mudigere and Balehonnur and you are looking at work: two roofs of shade, pepper on the trunks, arabica underneath. Karnataka still grows the largest share of the Indian crop.",
        "p2": "In 1925 an experiment station opened near Balehonnur. The green you photograph from the window is someone's season.",
    },
    {
        "id": "guest",
        "src": "assets/bean-to-cup/story-08-guest.webp",
        "rail": "Guest",
        "act": "I",
        "k": "08 · This companion",
        "h": "Walk as a guest",
        "p1": "This page will not sell you a cupping, a bungalow, or a jeep through someone else's silver oak. If a planter opens a path, that is their door. Stay on it.",
        "p2": "The seven seeds are a story people keep. The canopy is a living crop in a living forest. Drink the cup. Leave the rows as you found them.",
    },
    {
        "id": "shade",
        "src": "assets/bean-to-cup/01-shade.webp",
        "rail": "Shade",
        "act": "II",
        "k": "09 · Shade",
        "h": "A path the canopy keeps",
        "p1": "The crop begins where the tar road stops. Arabica sits under silver oak. Mist still hangs in the valley. The path is wet from last night’s rain.",
        "p2": "Chikkamagaluru coffee is a shade crop. The hill prefers cloud to open sun. This companion does not sell a tour of anyone’s estate.",
    },
    {
        "id": "cherry",
        "src": "assets/bean-to-cup/02-cherry.webp",
        "rail": "Cherry",
        "act": "II",
        "k": "10 · Cherry",
        "h": "The bean still dressed as fruit",
        "p1": "Coffee is not a cup first. It is a red fruit in the leaf. The skin is sweet. Inside sit two seeds, pressed together like palms.",
        "p2": "Pickers wait for that colour. Green cherries taste thin. This is not a recipe. It is the plant, still on the hill.",
    },
    {
        "id": "seed",
        "src": "assets/bean-to-cup/03-seed.webp",
        "rail": "Seed",
        "act": "II",
        "k": "11 · Seed",
        "h": "Three names for one seed",
        "p1": "Strip the fruit and a pale husk remains. Dry that, and you hold a green bean. Cherry, parchment, green, three names, one journey.",
        "p2": "Mills still do this work in the district. This page does not name a brand or a price.",
    },
    {
        "id": "roast",
        "src": "assets/bean-to-cup/04-roast.webp",
        "rail": "Fire",
        "act": "II",
        "k": "12 · Fire",
        "h": "The drum that names the cup",
        "p1": "A green bean has almost no smell. Fire draws the sugar out. Only then does the seed begin to sound like a cup.",
        "p2": "Roast is local taste, not a single law. What you see here is the drum, the turn from plant to the filter on a verandah.",
    },
    {
        "id": "brew",
        "src": "assets/bean-to-cup/05-brew.webp",
        "rail": "Filter",
        "act": "II",
        "k": "13 · Filter",
        "h": "Two steel barrels, hot water",
        "p1": "Malnad drinks it this way: grounds in the upper barrel, decoction collecting below. Steam is the clock.",
        "p2": "This is house coffee, not a café list. The companion will not sell you a cup.",
    },
    {
        "id": "cup",
        "src": "assets/bean-to-cup/06-cup.webp",
        "rail": "Cup",
        "act": "II",
        "k": "14 · Filter coffee",
        "h": "Filter coffee, and the hill still there",
        "p1": "Here the cup is filter coffee. Milk is a household choice. The hill is still in the window.",
        "p2": "From seven Mocha seeds to this metal is one walk. Not a shop. The saint first. Then the crop.",
    },
]

SEG_W = 1.18
SEAM = 0.16


def esc(s: str) -> str:
    return html.escape(s, quote=True)


def copy_window(i: int, n: int) -> str:
    """Fractional progress window inside equal-weight worldflight."""
    if i == 0:
        return "hero"
    if i == n - 1:
        return "finale"
    # Stay inside the segment with margin for seam crossfade.
    start = (i + 0.18) / n
    end = (i + 0.82) / n
    return f"{start:.4f} {end:.4f}"


def build() -> None:
    n = len(BEATS)
    legs = []
    copies = []
    rail_items = []

    for i, b in enumerate(BEATS):
        side = "lead" if i % 2 == 0 else "trail"
        deep = " wscrim--deep" if i in (4, 7, 12) else ""
        win = copy_window(i, n)
        title_cls = "wtitle wtitle--hero" if i == 0 else "wtitle"
        body = (
            f'<p class="wkicker">{esc(b["k"])}</p>'
            f'<h{"1" if i == 0 else "2"} class="{title_cls}">{esc(b["h"])}</h{"1" if i == 0 else "2"}>'
            f'<p class="wbody">{esc(b["p1"])}</p>'
            f'<p class="wbody wbody--soft">{esc(b["p2"])}</p>'
        )
        if i == 0:
            body += (
                '<div class="wactions">'
                '<a class="btn btn-ghost" href="#close">Skip to close</a>'
                "</div>"
            )
        if i == n - 1:
            body += (
                '<div class="wactions">'
                '<a class="btn btn-primary" href="index.html">Back to companion</a>'
                '<a class="btn btn-ghost" href="places.html?id=baba-budangiri">Baba Budangiri</a>'
                "</div>"
            )

        legs.append(
            f'        <div class="world-leg" data-sc-segment="true" data-sc-w="{SEG_W}" '
            f'data-sc-waypoint="{esc(b["rail"])}">\n'
            f'          <img class="sc-world__poster" src="{esc(b["src"])}" alt="" '
            f'decoding="async" {"fetchpriority=\"high\"" if i == 0 else "fetchpriority=\"low\""} />\n'
            f"        </div>"
        )
        copies.append(
            f'        <div class="wscrim wscrim--{side}{deep}" data-scrim-for="{esc(b["id"])}" aria-hidden="true"></div>\n'
            f'        <div data-sc-copy="true" data-sc-window="{win}" data-copy-id="{esc(b["id"])}" '
            f'data-stop="{i}" class="wcopy wcopy--{side}">\n'
            f"          {body}\n"
            f"        </div>"
        )

        ground = ""
        if i == 8:  # after Guest / before Act II Shade
            ground = '\n            <span class="wrail__ground" aria-hidden="true"></span>'
        rail_items.append(
            f"          <li>\n"
            f'            <button type="button" data-stop="{i}"{" aria-current=\"step\"" if i == 0 else ""}>\n'
            f'              <span class="wrail__tick" aria-hidden="true"></span>\n'
            f'              <span class="wrail__name">{esc(b["rail"])}</span>\n'
            f"            </button>{ground}\n"
            f"          </li>"
        )

    hero_src = BEATS[0]["src"]
    page = f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Bean to cup · Bloom walk preview · Chikkamagaluru</title>
    <meta
      name="description"
      content="Preview only. Bean to cup rebuilt with Scrollcraft worldflight — not production."
    />
    <meta name="robots" content="noindex,nofollow" />
    <meta name="theme-color" content="#05070a" />
    <link rel="icon" href="assets/favicon.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="secret-pathways-assets/fonts.css" />
    <link rel="stylesheet" href="bean-to-cup-bloom.css?v=1" />
    <script>
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
      window.scrollTo(0, 0);
      (function () {{
        var w = window, d = document, h = d.documentElement;
        try {{
          if (sessionStorage.getItem("ckm-bloom-entered")) return;
          sessionStorage.setItem("ckm-bloom-entered", "1");
        }} catch (e) {{}}
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        w.__entrance = "wait";
        h.classList.add("entering");
        function done() {{
          w.__entrance = "done";
          h.classList.remove("entering", "lens-open");
        }}
        function open() {{
          if (w.__entrance !== "wait") return;
          w.__entrance = "open";
          h.classList.add("lens-open");
          setTimeout(function () {{
            if (w.__entrance !== "done") done();
          }}, 4000);
        }}
        d.addEventListener(
          "load",
          function (e) {{
            var t = e.target;
            if (t && t.classList && t.classList.contains("ap-img")) open();
          }},
          true
        );
        d.addEventListener(
          "error",
          function (e) {{
            var t = e.target;
            if (t && t.classList && t.classList.contains("ap-img")) open();
          }},
          true
        );
        d.addEventListener("animationend", function (e) {{
          if (e.animationName === "ap-out") done();
        }});
        setTimeout(open, 1500);
      }})();
    </script>
  </head>
  <body>
    <a class="skip" href="#main">Skip to story</a>
    <div class="preview-banner" role="status">
      Preview only — Scrollcraft worldflight · not production
    </div>

    <div class="ap" aria-hidden="true">
      <div class="ap-frame">
        <img class="ap-img" src="{esc(hero_src)}" alt="" fetchpriority="high" />
      </div>
    </div>

    <header class="site-header">
      <div class="glass-bar">
        <a class="glass-brand" href="index.html" aria-label="Chikkamagaluru Companion, home">
          <span class="brand-mark" aria-hidden="true"></span>
          <span class="brand-tx"><b>Chikkamagaluru</b><i>ಚಿಕ್ಕಮಗಳೂರು</i></span>
        </a>
        <nav class="glass-nav" aria-label="Primary">
          <a class="nav-link" href="index.html">Home</a>
          <a class="nav-link" href="places.html">Places</a>
          <a class="nav-link" href="stories.html">Stories</a>
          <a class="nav-link on" href="bean-to-cup.html">Bean to cup</a>
          <a class="nav-link" href="plan.html">Plan</a>
        </nav>
      </div>
    </header>

    <main id="main">
      <div class="world" data-sc-lerp="0.12">
        <nav class="wrail" aria-label="Chapters" data-flash="true">
          <ol>
{chr(10).join(rail_items)}
          </ol>
        </nav>

        <div data-sc-mode="worldflight" data-sc-seam="{SEAM}">
          <div data-sc-world="true">
{chr(10).join(legs)}
          </div>
          <div data-sc-world-copy="true">
{chr(10).join(copies)}
          </div>
          <div data-sc-spacer="true" aria-hidden="true"></div>
        </div>
        <div class="wveil" aria-hidden="true"></div>
      </div>

      <section class="close" id="close">
        <p class="eyebrow">Close · Preview</p>
        <h2>Drink. Leave the rows.</h2>
        <p>
          From seven Mocha seeds to filter coffee is one walk. This page is not a shop.
          Believe the slope. Treat the beard as lore.
        </p>
        <div class="cta-row">
          <a class="cta" href="index.html">Back to the companion</a>
          <a class="cta" href="places.html?id=baba-budangiri">Baba Budangiri</a>
        </div>
      </section>
    </main>

    <footer class="foot">
      <p>Bean to cup · Bloom walk preview · 00–14 · Not for production</p>
    </footer>

    <script src="scrollcraft.js"></script>
    <script src="bean-to-cup-bloom.js?v=1"></script>
  </body>
</html>
"""
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(page, encoding="utf-8")
    print("wrote", OUT, "beats", n)


if __name__ == "__main__":
    build()
