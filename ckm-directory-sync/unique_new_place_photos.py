#!/usr/bin/env python3
"""Fetch unique CC photos for brochure-added destinations; no shared placeholders."""
from __future__ import annotations

import io
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageOps

UA = "ChikkamagaluruCompanion/1.0 (educational static site; https://chikkamagaluru-companion.vercel.app)"
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "dist" / "assets"
DATA = ROOT / "dist" / "data.js"
W, H = 1800, 1200

# dest_id -> (local jpg, commons File: name OR direct https url, crop, credit)
JOBS = {
    "bandaje-falls": (
        "bandaje-falls.jpg",  # keep authentic Bandaje file already in tree; ensure only this place + traverse can share? We'll give traverse its own crop name below
        "Bandagge falls.jpg",
        "upper",
        {
            "place": "Bandaje Falls",
            "file": "Bandagge falls.jpg",
            "artist": "Mallanagoud017",
            "license": "CC BY-SA 4.0",
            "url": "https://commons.wikimedia.org/wiki/File:Bandagge_falls.jpg",
        },
    ),
    "bandaje-arbi-traverse": (
        "bandaje-arbi.jpg",
        "Bandaje falls.jpg",
        "center",
        {
            "place": "Bandaje Falls ridge country (Arbi traverse)",
            "file": "Bandaje falls.jpg",
            "artist": "see Commons file page",
            "license": "CC BY-SA 4.0",
            "url": "https://commons.wikimedia.org/wiki/File:Bandaje_falls.jpg",
        },
    ),
    "soor-mane-falls": (
        "soor-mane-falls.jpg",
        "Surmane falls (51375587803).jpg",
        "upper",
        {
            "place": "Surmane / Soor Mane Falls, Kudremukh side",
            "file": "Surmane falls (51375587803).jpg",
            "artist": "see Commons file page",
            "license": "CC BY-SA 2.0",
            "url": "https://commons.wikimedia.org/wiki/File:Surmane_falls_(51375587803).jpg",
        },
    ),
    "elaneer-falls": (
        "elaneer-falls.jpg",
        "Western ghats waterfall.jpg",
        "center",
        {
            "place": "Western Ghats waterfall (Elaneer / Samse forest country stand-in — replace when a verified Elaneer still is licensed)",
            "file": "Western ghats waterfall.jpg",
            "artist": "see Commons file page",
            "license": "CC BY-SA 4.0",
            "url": "https://commons.wikimedia.org/wiki/File:Western_ghats_waterfall.jpg",
        },
    ),
    "kodige-falls": (
        "kodige-falls.jpg",
        "Kodekallu gudda - Charmadi ghat.jpg",
        "center",
        {
            "place": "Kodekallu Gudda waterfall, Charmadi Ghat (Mudigere country — nearest licensed cascade still for Kodige / Durgadahalli)",
            "file": "Kodekallu gudda - Charmadi ghat.jpg",
            "artist": "Simple-man-everyday",
            "license": "CC BY-SA 4.0",
            "url": "https://commons.wikimedia.org/wiki/File:Kodekallu_gudda_-_Charmadi_ghat.jpg",
        },
    ),
    "ukkada-falls": (
        "ukkada-falls.jpg",
        "Santhosh falls.jpeg",
        "upper",
        {
            "place": "Santhosh Falls, Chikkamagaluru district (licensed district cascade — replace when a verified Ukkada Falls still is available)",
            "file": "Santhosh falls.jpeg",
            "artist": "PD-self (Commons)",
            "license": "Public domain",
            "url": "https://commons.wikimedia.org/wiki/File:Santhosh_falls.jpeg",
        },
    ),
    "madagada-kere": (
        "madagada-kere.jpg",
        "Madagadakere.jpg",
        "center",
        {
            "place": "Madagadakere / Madagada Kere, Kadur",
            "file": "Madagadakere.jpg",
            "artist": "see Commons file page",
            "license": "CC BY-SA 4.0",
            "url": "https://commons.wikimedia.org/wiki/File:Madagadakere.jpg",
        },
    ),
    "rani-jhari-viewpoint": (
        "rani-jhari.jpg",
        "Rani Jhari view point (51376090824).jpg",
        "center",
        {
            "place": "Rani Jhari viewpoint",
            "file": "Rani Jhari view point (51376090824).jpg",
            "artist": "see Commons file page",
            "license": "CC BY-SA 2.0",
            "url": "https://commons.wikimedia.org/wiki/File:Rani_Jhari_view_point_(51376090824).jpg",
        },
    ),
    "devaramane-viewpoint": (
        "devaramane.jpg",
        "Devaramane hills.jpg",
        "center",
        {
            "place": "Devaramane hills",
            "file": "Devaramane hills.jpg",
            "artist": "see Commons file page",
            "license": "CC BY-SA 4.0",
            "url": "https://commons.wikimedia.org/wiki/File:Devaramane_hills.jpg",
        },
    ),
    "panchami-kallu": (
        "panchami-kallu.jpg",
        "Sleeping Hills.jpg",
        "center",
        {
            "place": "Sleeping Hills near Devaramane / Mudigere (Panchami Kallu rock-viewpoint country)",
            "file": "Sleeping Hills.jpg",
            "artist": "see Commons file page",
            "license": "CC BY-SA 4.0",
            "url": "https://commons.wikimedia.org/wiki/File:Sleeping_Hills.jpg",
        },
    ),
    "narasimha-parvatha": (
        "narasimha-parvatha.jpg",
        "Narsimha Parvata, Agumbe (51993730472).jpg",
        "center",
        {
            "place": "Narasimha Parvatha / Narsimha Parvata, Agumbe–Kigga country",
            "file": "Narsimha Parvata, Agumbe (51993730472).jpg",
            "artist": "see Commons file page",
            "license": "CC BY-SA 2.0",
            "url": "https://commons.wikimedia.org/wiki/File:Narsimha_Parvata,_Agumbe_(51993730472).jpg",
        },
    ),
    "kyatanamakki": (
        "kyatanamakki.jpg",
        "Kyatanmakki.jpg",
        "center",
        {
            "place": "Kyatanmakki / Kyatanamakki",
            "file": "Kyatanmakki.jpg",
            "artist": "see Commons file page",
            "license": "CC BY-SA 4.0",
            "url": "https://commons.wikimedia.org/wiki/File:Kyatanmakki.jpg",
        },
    ),
    "marle-twin-temples": (
        "marle-twin-temples.jpg",
        "Chennakesava temple, Marale, Karnataka.jpg",
        "center",
        {
            "place": "Chennakesava temple, Marale (Marle)",
            "file": "Chennakesava temple, Marale, Karnataka.jpg",
            "artist": "see Commons file page",
            "license": "CC BY-SA 4.0",
            "url": "https://commons.wikimedia.org/wiki/File:Chennakesava_temple,_Marale,_Karnataka.jpg",
        },
    ),
    "baggavalli-yoganarasimha": (
        "baggavalli-yoganarasimha.jpg",
        "Yoga Narasimha temple at Baggavalli.JPG",
        "center",
        {
            "place": "Yoga Narasimha temple at Baggavalli",
            "file": "Yoga Narasimha temple at Baggavalli.JPG",
            "artist": "see Commons file page",
            "license": "CC BY-SA 3.0",
            "url": "https://commons.wikimedia.org/wiki/File:Yoga_Narasimha_temple_at_Baggavalli.JPG",
        },
    ),
    "hirenallur-mallikarjuna": (
        "hirenallur-mallikarjuna.jpg",
        "Mallikarjuna temple at Hirenallur.JPG",
        "center",
        {
            "place": "Mallikarjuna temple at Hirenallur",
            "file": "Mallikarjuna temple at Hirenallur.JPG",
            "artist": "see Commons file page",
            "license": "CC BY-SA 3.0",
            "url": "https://commons.wikimedia.org/wiki/File:Mallikarjuna_temple_at_Hirenallur.JPG",
        },
    ),
    "devarunda-rameshwara": (
        "devarunda-rameshwara.jpg",
        "KALBIRESHWARA DEVALYA, DEVARAMANE.jpg",
        "center",
        {
            "place": "Kalbireshwara Devalya, Devaramane (Mudigere temple country for Devarunda)",
            "file": "KALBIRESHWARA DEVALYA, DEVARAMANE.jpg",
            "artist": "see Commons file page",
            "license": "CC BY-SA 4.0",
            "url": "https://commons.wikimedia.org/wiki/File:KALBIRESHWARA_DEVALYA,_DEVARAMANE.jpg",
        },
    ),
    "khandya-markandeshwara": (
        "khandya-markandeshwara.jpg",
        "Khandya Bhadra.jpg",
        "center",
        {
            "place": "Bhadra River at Khandya (Markandeshwara temple country)",
            "file": "Khandya Bhadra.jpg",
            "artist": "Shyamal",
            "license": "CC BY-SA 4.0",
            "url": "https://commons.wikimedia.org/wiki/File:Khandya_Bhadra.jpg",
        },
    ),
}


def cover_crop(im: Image.Image, tw: int, th: int, focus: str = "center") -> Image.Image:
    im = ImageOps.exif_transpose(im).convert("RGB")
    scale = max(tw / im.width, th / im.height)
    nw, nh = max(tw, round(im.width * scale)), max(th, round(im.height * scale))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    leftover_x = nw - tw
    leftover_y = nh - th
    left = leftover_x // 2
    top = leftover_y // 2
    if focus == "upper":
        top = int(leftover_y * 0.18)
    elif focus == "top":
        top = 0
    left = max(0, min(left, leftover_x))
    top = max(0, min(top, leftover_y))
    return im.crop((left, top, left + tw, top + th))


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read()


def commons_url(filename: str) -> str:
    params = {
        "action": "query",
        "format": "json",
        "titles": f"File:{filename}",
        "prop": "imageinfo",
        "iiprop": "url",
    }
    api = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(api, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=40) as r:
        data = json.loads(r.read().decode())
    for p in data["query"]["pages"].values():
        info = (p.get("imageinfo") or [{}])[0]
        url = info.get("url")
        if url:
            return url.split("?")[0]
    raise RuntimeError(f"no commons url for {filename}")


def load_ckm():
    text = DATA.read_text(encoding="utf-8")
    m = re.search(r"window\.CKM = ({[\s\S]*})\s*;?\s*$", text)
    if not m:
        raise SystemExit("could not parse data.js")
    return json.loads(m.group(1)), text


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    credits_new = []
    mapping = {}
    for dest_id, (name, src, focus, credit) in JOBS.items():
        dest = OUT / name
        print("fetch", dest_id, name, flush=True)
        try:
            if src.startswith("https://"):
                file_url = src
            else:
                file_url = commons_url(src)
            raw = fetch(file_url)
            im = Image.open(io.BytesIO(raw))
            out = cover_crop(im, W, H, focus)
            out.save(dest, "JPEG", quality=90, optimize=True, progressive=True, subsampling=1)
            print(f"  wrote {dest.name} {out.size} {dest.stat().st_size // 1024}KB", flush=True)
            mapping[dest_id] = f"assets/{name}"
            credits_new.append({"local": name, **credit})
        except Exception as e:
            print("  FAIL", e, flush=True)

    ckm, _ = load_ckm()
    for d in ckm["destinations"]:
        if d["id"] in mapping:
            d["image"] = mapping[d["id"]]

    # Replace or append credits by local filename so re-runs update authenticity notes
    by_local = {c.get("local"): i for i, c in enumerate(ckm.get("credits") or [])}
    for c in credits_new:
        if c["local"] in by_local:
            ckm["credits"][by_local[c["local"]]] = c
        else:
            ckm.setdefault("credits", []).append(c)
            by_local[c["local"]] = len(ckm["credits"]) - 1
    # bump cache on each successful authenticity refresh
    cache_tag = "uniqphotos2"

    used = {}
    for d in ckm["destinations"]:
        used.setdefault((d.get("image") or "").split("?")[0], []).append(d["id"])
    print("\nRemaining shared destination photos:")
    shared = 0
    for img, ids in sorted(used.items(), key=lambda x: -len(x[1])):
        if len(ids) > 1:
            shared += 1
            print(f"  {len(ids)} {img}: {', '.join(ids)}")
    if shared == 0:
        print("  none")

    DATA.write_text(
        "window.CKM = " + json.dumps(ckm, indent=2, ensure_ascii=False) + ";\n",
        encoding="utf-8",
    )
    # bump cache on html
    for html in (ROOT / "dist").glob("*.html"):
        text = html.read_text(encoding="utf-8")
        new = re.sub(r"data\.js\?v=[^\"]+", f"data.js?v={cache_tag}", text)
        if new != text:
            html.write_text(new, encoding="utf-8")
            print("cache bump", html.name)
    print("updated", DATA)


if __name__ == "__main__":
    main()
