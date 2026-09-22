#!/usr/bin/env python3
"""Merge Department of Tourism brochure facts into Companion data.js.

Does not change UI. Enriches existing destinations and adds missing places.
Brochure is the preferred source for distance / route / official description facts
when stated from Chikkamagaluru; Companion visit/permit caution notes are kept.
"""

from __future__ import annotations

import json
import re
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data.js"
VISION_PATH = Path("/opt/cursor/artifacts/tourism-merge/pdf-places-vision.json")
OUT_REPORT = Path("/opt/cursor/artifacts/tourism-merge/merge-report.json")

BROCHURE_SOURCE = {
    "label": "Chikkamagaluru Dept. of Tourism brochure",
    "url": "https://www.chikkamagalurutourism.in/",
}


def load_data() -> dict:
    raw = DATA_PATH.read_text(encoding="utf-8")
    assert raw.startswith("window.CKM = ")
    body = raw[len("window.CKM = ") :].strip()
    if body.endswith(";"):
        body = body[:-1]
    return json.loads(body)


def save_data(data: dict) -> None:
    # Pretty JSON matching existing style (2-space)
    body = json.dumps(data, indent=2, ensure_ascii=False)
    DATA_PATH.write_text("window.CKM = " + body + ";\n", encoding="utf-8")


def parse_km(distance) -> int | None:
    if not distance:
        return None
    s = str(distance)
    # Prefer explicit "from Chikkamagaluru" numbers; skip "from Kadur/Kemmanagundi-only"
    m = re.search(
        r"(\d+)\s*km.*(chikkamagaluru|chikmagalur)",
        s,
        re.I,
    )
    if m:
        return int(m.group(1))
    if re.search(r"from\s+(kadur|kemman|kemmann)", s, re.I):
        return None
    m = re.search(r"(\d+)\s*km", s, re.I)
    return int(m.group(1)) if m else None


def ensure_source(place: dict) -> None:
    sources = place.setdefault("sources", [])
    if not any(s.get("label") == BROCHURE_SOURCE["label"] for s in sources):
        sources.append(dict(BROCHURE_SOURCE))


def join_facts(facts: list[str]) -> str:
    # Keep companion tone: concise paragraphs from brochure bullets
    cleaned = []
    for f in facts:
        f = re.sub(r"\s+", " ", f).strip().rstrip(".")
        if f:
            cleaned.append(f)
    if not cleaned:
        return ""
    # First sentence as lead, rest as second paragraph when long
    if len(cleaned) == 1:
        return cleaned[0] + "."
    lead = cleaned[0] + "."
    rest = ". ".join(cleaned[1:]) + "."
    return lead + " " + rest


def set_route(place: dict, route: str | None) -> None:
    if not route:
        return
    place["bestRoute"] = re.sub(r"\s+", " ", route).strip()


def set_nearest(place: dict, facts: list[str]) -> None:
    for f in facts:
        if f.lower().startswith("nearest attraction"):
            place["nearestAttractions"] = re.sub(
                r"^Nearest attractions?:\s*", "", f, flags=re.I
            ).strip()
            return


# Manual enrichment map: companion id -> brochure-derived fields
# Prefer brochure "from Chikkamagaluru" distances when present.
ENRICH: dict[str, dict] = {
    "hirekolale": {
        "distanceKm": 10,
        "bestRoute": "Local roads from Chikkamagaluru city",
        "blurb": "A serene lake about 10 km from town, tucked among the hills.",
        "summary": (
            "Hirekolale Lake is a scenic lake amidst the hills and valleys of "
            "Chikkamagaluru, about 10 km from the city. Surrounded by lush greenery, "
            "it is a known spot for picnics, nature walks and boating."
        ),
        "tags_add": ["picnic", "boating"],
    },
    "hebbe-falls": {
        # Keep town distance; brochure highlights distance from Kemmanagundi
        "bestRoute": "Scenic approach via Kemmanagundi; last stretch often by authorised jeep through forest and estate country",
        "blurb": "A two-stage fall near Kemmanagundi — Dodda Hebbe and Chikka Hebbe.",
        "summary": (
            "Hebbe Falls is a mesmerizing waterfall reached from the Kemmanagundi side "
            "(about 10 km from Kemmanagundi). Water drops in two stages, Dodda Hebbe "
            "(Big Falls) and Chikka Hebbe (Small Falls). The Department of Tourism notes "
            "the monsoon months (June–September) as the peak flow season, with swimming "
            "and nature time in a tranquil forest setting when access is open."
        ),
        "bestTime": "June – September (peak flow); also strong through the post-monsoon",
        "tags_add": ["dodda-hebbe", "chikka-hebbe"],
    },
    "hanuman-gundi": {
        "distanceKm": 80,
        "bestRoute": (
            "Take SH66 (Chikkamagaluru–Kudremukha Road) toward Kudremukha National Park; "
            "follow signs to Hanumana Gundi Falls"
        ),
        "blurb": "A high cascade inside Kudremukha National Park, named for Lord Hanuman.",
        "summary": (
            "Hanumanagundi Falls lies in the heart of Kudremukha National Park, about "
            "80 km from Chikkamagaluru city by the tourism brochure. Named after Lord "
            "Hanuman, the fall drops from a considerable height. Reaching it means a trek "
            "through dense Western Ghats forest, with a chance to see the park’s flora and fauna."
        ),
        "visit": (
            "Only with valid Kudremukh / forest access. Confirm permits and trail status "
            "before you go. This is notified forest, not an open roadside waterfall."
        ),
    },
    "sirimane-falls": {
        "distanceKm": 80,
        "bestRoute": "Drive on SH65 toward Sringeri; the falls are near Sringeri",
        "blurb": "A multi-tiered fall in the forests near spiritual Sringeri.",
        "summary": (
            "Sirimane Falls, about 80 km from Chikkamagaluru toward Sringeri, is a "
            "multi-tiered waterfall nestled in lush forest. A short trek through verdant "
            "woods leads to the cascade — quieter than the busier east-side falls, and "
            "often paired with a Sringeri temple visit."
        ),
    },
    "kallathigiri": {
        "bestRoute": "Via the Kemmanagundi / Kalathigiri village approaches",
        "blurb": "A cliff cascade into a natural pool, beside Veerabhadra Temple.",
        "summary": (
            "Kallathigiri Falls (also Kalathigiri / Kalhattagiri) cascades from a rocky "
            "cliff into a natural pool, surrounded by coffee estates and forest. The site "
            "also holds the Veerabhadra Temple, which draws devotees through the year and "
            "hosts an annual fair in March–April."
        ),
        "tags_add": ["veerabhadra-temple", "fair"],
    },
    "manikyadhara": {
        "bestRoute": (
            "Short trek or scenic drive through the Western Ghats near "
            "Shri Guru Dattatreya Bababudan Swamy Dargah"
        ),
        "blurb": "A sacred cascade near Baba Budangiri, known for clear water and pilgrim visits.",
        "summary": (
            "Manikyadhara Falls sits near the Shri Guru Dattatreya Bababudan Swamy Dargah "
            "ridge. The tourism brochure notes its lush setting, picnic and nature-walk appeal, "
            "and a belief in the healing quality of the clear water. A nearby Lord Shiva shrine "
            "also draws pilgrims."
        ),
    },
    "shanti-falls": {
        "distanceKm": 60,
        "bestRoute": "SH57 (Chikkamagaluru–Tarikere Road) toward Kemmanagundi for Shanthi Falls",
        "blurb": "A peaceful cascade in the Kemmanagundi hill country.",
        "summary": (
            "Shanthi (Shanti) Falls is a tranquil oasis in the Kemmanagundi hill station "
            "landscape, about 60 km from Chikkamagaluru city by the brochure. Surrounded by "
            "lush greenery, it is described as a quiet place for rest in pure mountain air."
        ),
    },
    "kemmanagundi": {
        "distanceKm": 60,
        "blurb": "A garden hill station with Western Ghats panoramas — easy for families.",
        "summary": (
            "Kemmanagundi View Point / hill station sits about 60 km from Chikkamagaluru. "
            "The brochure highlights panoramic views of valleys, forests and mountain ranges, "
            "easy access for all ages, and popularity for sunrise, sunset and landscape "
            "photography. Cool mountain weather without a strenuous trek. Nearest attractions "
            "include Z Point, Hebbe Falls, Shanti Falls and Raj Bhavan."
        ),
        "nearestAttractions": "Z Point, Hebbe Falls, Shanti Falls, Raj Bhavan",
    },
    "bhadra-wls": {
        "distanceKm": 38,
        "blurb": "Karnataka tiger country on the Bhadra — 492.46 sq km across 15 state forests.",
        "summary": (
            "Bhadra Wildlife Sanctuary (Bhadra Tiger Reserve) takes its name from the Bhadra "
            "River, which originates near the Kudremukh hills. The Department of Tourism "
            "brochure records an area of 492.46 sq km comprising 15 state forests. It is home "
            "to tigers, leopards, elephants, gaur, deer and many birds, with dense forest, "
            "rolling hills and the scenic river. Popular for wildlife safaris and birdwatching. "
            "Nearest attractions include Muthodi Wildlife Range, Lakkavalli Dam, Bhadra "
            "Reservoir and Kudremukh."
        ),
        "visit": (
            "Safari slots and fees are forest-department matters. Book only through official "
            "channels such as https://tickets.bhadratigerreserve.in — this companion does not "
            "sell tickets."
        ),
        "nearestAttractions": "Muthodi Wildlife Range, Lakkavalli Dam, Bhadra Reservoir, Kudremukh",
        "tags_add": ["492-sq-km", "safari"],
    },
    "bhadra-dam": {
        "distanceKm": 40,
        "bestRoute": "Southeast on SH57 from Tarikere to Lakkavalli Dam",
        "blurb": "The Bhadra dam at Lakkavalli — irrigation, power and tiger-country backwaters.",
        "summary": (
            "Lakkavalli Dam is a major landmark of Chikkamagaluru district, about 40 km from "
            "the city by the tourism brochure (via Tarikere on SH57). Lakkavalli in Tarikere "
            "Taluk holds a substantial dam on the Bhadra River for irrigation and power. Its "
            "verdant surroundings are part of the agriculturally important Malnad landscape "
            "and sit beside Bhadra tiger country."
        ),
    },
    "kudremukh-peak": {
        "distanceKm": 81,
        "bestRoute": (
            "Approach via Kudremukh park routes; summit walks are long grassland/forest treks "
            "(brochure notes ~22 km trail character through grasslands, forests, streams and ridges)"
        ),
        "blurb": "One of Karnataka’s great Western Ghats treks to a high Kudremukh summit.",
        "summary": (
            "Kudremukh Peak, about 81 km from Chikkamagaluru by the brochure, is among the "
            "finest trekking experiences in South India and leads toward the third-highest "
            "peak in Karnataka. Trails pass grasslands, forests, streams and ridges with rich "
            "biodiversity. Nearest attractions: Netravathi Peak, Kalasa, Hanumanagundi Falls."
        ),
        "nearestAttractions": "Netravathi Peak, Kalasa, Hanumanagundi Falls",
    },
    "z-point": {
        "distanceKm": 67,
        "bestRoute": "Trek from Kemmanagundi through forests; the path also passes scenic Shanti Falls country",
        "blurb": "Kemmanagundi’s famous sunrise knife-edge over Western Ghats valleys.",
        "summary": (
            "Z Point is a popular trekking viewpoint near Kemmanagundi, about 67 km from "
            "Chikkamagaluru city in the brochure. It is known for spectacular sunrise views "
            "and panoramic Western Ghats vistas. The walk is generally easy for most visitors "
            "and passes forest and waterfall scenery. Nearest attractions: Kemmanagundi, "
            "Shanti Falls, Hebbe Falls."
        ),
        "nearestAttractions": "Kemmanagundi, Shanti Falls, Hebbe Falls",
    },
    "ballalarayana-durga": {
        "distanceKm": 72,
        "elevation": "1,509 m",
        "blurb": "A Hoysala-era hill fort at 1,509 m above the Western Ghats forests.",
        "summary": (
            "Ballalarayana Durga is a historic hilltop fort in the lush Western Ghats, about "
            "72 km from Chikkamagaluru. Built in the Hoysala period and set at about 1,509 m, "
            "it is a popular trekking and camping destination with panoramic sunset views. "
            "Nearest attractions: Bandaje Falls, Kalabhairaveshwara Temple, Rani Jhari, "
            "Kudremukh, Kalasa."
        ),
        "nearestAttractions": "Bandaje Falls, Kalabhairaveshwara Temple, Rani Jhari, Kudremukh, Kalasa",
    },
    "deviramma": {
        "distanceKm": 25,
        "bestRoute": "Moderate trekking trail to the hilltop shrine / summit",
        "blurb": "A sacred hilltop near the Mullayanagiri country — pilgrimage and ridge views.",
        "summary": (
            "Deviramma Hilltop is a sacred hill destination about 25 km from Chikkamagaluru, "
            "combining spirituality and a moderate trek. The summit rewards panoramic Western "
            "Ghats views and is a noted Deepavali pilgrimage. Nearest attractions: Deviramma "
            "Temple, Mullayanagiri."
        ),
        "nearestAttractions": "Deviramma Temple, Mullayanagiri",
    },
    "deviramma-temple": {
        "distanceKm": 20,
        "bestRoute": "Scenic route toward the Bindiga / Mallenahalli Deviramma shrine",
        "blurb": "Hill-country shrine of Goddess Deviramma — major Deepavali pilgrimage.",
        "summary": (
            "Shri Kshetra Bindiga Deviramma Temple sits in the Western Ghats hills near the "
            "Mullayanagiri country, about 20 km from Chikkamagaluru. Dedicated to Goddess "
            "Deviramma, it is renowned for its hill setting and an annual Deepavali festival "
            "that draws thousands of devotees, with panoramic views of surrounding hills and "
            "valleys."
        ),
        "nearestAttractions": "Deviramma Hill, Mullayanagiri",
    },
    "mullayanagiri": {
        "distanceKm": 20,
        "elevation": "1,930 m",
        "bestRoute": "Scenic mountain roads toward the ridge; last stretch often walked to the summit temple",
        "blurb": "Karnataka’s highest peak at 1,930 m — mist, coffee hills and a summit shrine.",
        "summary": (
            "Mullayanagiri is the highest peak in Karnataka at 1,930 metres above sea level, "
            "about 20 km from Chikkamagaluru. Surrounded by mist-covered hills and coffee "
            "plantations, it is one of the district’s most visited viewpoints for sunrise and "
            "sunset. Mullappa Swamy Temple stands at the summit. Nearest attractions: "
            "Shri Guru Dattatreya Bababudan Swamy Dargah, Jhari Falls, Seethalayanagiri."
        ),
        "nearestAttractions": "Shri Guru Dattatreya Bababudan Swamy Dargah, Jhari Falls, Seethalayanagiri",
    },
    "ettina-bhuja": {
        # Brochure "25 km" conflicts with Mudigere-side geography; keep mapped approach
        # but record brochure elevation and valley facts.
        "elevation": "approx. 4,265 ft",
        "blurb": "“Ox’s Shoulder” — a distinctive Western Ghats trek over Charmadi country.",
        "summary": (
            "Ettina Bhuja, popularly called the Ox’s Shoulder, is one of the most accessible "
            "and rewarding treks in these hills. The brochure records an elevation of about "
            "4,265 feet, an easy-to-moderate trail through dense forest and rolling grassland, "
            "and panoramic views of the Charmadi and Shishila valleys. Nearest attractions: "
            "Mudigere, Devaramane, Charmadi Ghat."
        ),
        "nearestAttractions": "Mudigere, Devaramane, Charmadi Ghat",
        "distanceNote": (
            "Tourism brochure lists 25 km from Chikkamagaluru; practical road+trail access is "
            "usually via the Mudigere / Charmadi side — confirm locally."
        ),
    },
    "netravathi-peak": {
        "distanceKm": 95,
        "elevation": "approx. 4,100 ft",
        "bestRoute": "Trek through Kudremukh Forest Range — shola forests, streams and grasslands",
        "blurb": "A Kudremukh-range trek named for the Netravathi River’s birth hills.",
        "summary": (
            "Netravathi Peak lies in the Kudremukh Forest Range. Named after the sacred "
            "Netravathi River that originates in this region, the trek (brochure elevation "
            "about 4,100 ft) moves through shola forest, streams and rolling grassland with "
            "views toward Kudremukh Peak and Rani Jhari Valley. Nearest attractions: Kudremukh, "
            "Rani Jhari Viewpoint, Kalasa."
        ),
        "nearestAttractions": "Kudremukh, Rani Jhari Viewpoint, Kalasa",
    },
    "balehonnur-rambhapuri-peetha": {
        "distanceKm": 50,
        "blurb": "One of Veerashaivism’s five Pancha Mahapeethas on the Tunga at Balehonnur.",
        "summary": (
            "Shri Jagadhguru Rambhapuri Peetha at Balehonnur stands on the banks of the Tunga "
            "River, about 50 km from Chikkamagaluru. It is one of the five sacred Pancha "
            "Mahapeethas of Veerashaivism, founded by Jagadguru Renukacharya, and preserves "
            "centuries-old Veerashaiva–Lingayat traditions in a serene riverside setting. "
            "Nearest attractions: Bhadra Wildlife Sanctuary, Devaramane, Kalaseshwara Temple."
        ),
        "nearestAttractions": "Bhadra Wildlife Sanctuary, Devaramane, Kalaseshwara Temple",
    },
    "kodandarama-temple-hiremagalur": {
        "distanceKm": 3,
        "blurb": "Hiremagalur’s Rama shrine — life-sized single-stone idols in Kalyana Kolam.",
        "summary": (
            "Kodanda Ramaswamy Temple at Hiremagalur, about 3 km from Chikkamagaluru, is among "
            "Karnataka’s most revered Rama temples. Life-sized idols of Rama, Sita and Lakshmana "
            "are sculpted from a single stone, with Sita standing to Rama’s right in the divine "
            "Kalyana Kolam. The shrine shows Hoysala style with Dravidian influences — ornate "
            "pillars, gopurams and stone carving. Nearest attractions: Hiremagalur Temple "
            "Complex, Mullayanagiri, Mahatma Gandhi Park."
        ),
        "nearestAttractions": "Hiremagalur Temple Complex, Mullayanagiri, Mahatma Gandhi Park",
    },
    "amruthapura": {
        "distanceKm": 74,
        "blurb": "12th-century Hoysala Shiva temple near Tarikere — soapstone epics in stone.",
        "summary": (
            "Amrutheshwara Temple at Amruthapura, about 74 km from Chikkamagaluru near Tarikere, "
            "is a magnificent Hoysala monument of the 12th century dedicated to Lord Shiva. It is "
            "renowned for intricate soapstone carvings of the Ramayana and Mahabharata and "
            "beautifully sculpted pillars. Nearest attractions: Tarikere, Lakkavalli Dam, "
            "Kemmanagundi."
        ),
        "nearestAttractions": "Tarikere, Lakkavalli Dam, Kemmanagundi",
    },
    "kalasa": {
        "distanceKm": 92,
        "blurb": "Kalaseshwara on the Bhadra — Malnad Shiva shrine and famous Rathotsava.",
        "summary": (
            "Kalaseshwara Temple at Kalasa stands on the banks of the Bhadra River, about 92 km "
            "from Chikkamagaluru, surrounded by Malnad hills. Dedicated to Lord Shiva with a "
            "sacred Linga and traditional South Indian architecture, it is known for its annual "
            "Rathotsava festival. Nearest attractions: Horanadu, Kudremukh, Bhadra River."
        ),
        "nearestAttractions": "Horanadu, Kudremukh, Bhadra River",
    },
    "belavadi": {
        "distanceKm": 29,
        "blurb": "13th-century Hoysala trikuta at Belavadi — Veeranarayana, Yoga Narasimha, Venugopala.",
        "summary": (
            "Veeranarayana Temple in historic Belavadi, about 29 km from Chikkamagaluru, is one "
            "of the finest Hoysala temples of the 13th century, dedicated to Lord Vishnu. It "
            "houses shrines of Veeranarayana, Yoga Narasimha and Venugopala, with exquisite "
            "stone carvings and sculpted pillars. Nearest attractions: Halebidu, Belur, Marle "
            "Twin Temples."
        ),
        "nearestAttractions": "Halebidu, Belur, Marle Twin Temples",
    },
    "baba-budangiri": {
        "distanceKm": 33,
        "blurb": "Shared Hindu–Muslim pilgrimage ridge — Datta Peetha and coffee-country legend.",
        "summary": (
            "Shri Guru Dattatreya Bababudan Swamy Dargah (Baba Budangiri / Datta Peetha), about "
            "33 km from Chikkamagaluru, is a revered pilgrimage and trekking site in the Western "
            "Ghats. The brochure notes its spiritual significance, scenic landscapes and unique "
            "blend of traditions — a sacred shrine of Guru Dattatreya revered by both Hindu and "
            "Muslim communities. Nearest attractions: Mullayanagiri, Manikyadhara Falls, Jhari Falls."
        ),
        "nearestAttractions": "Mullayanagiri, Manikyadhara Falls, Jhari Falls",
    },
    "horanadu": {
        "distanceKm": 100,
        "blurb": "Annapoorneshwari at Horanadu — Western Ghats pilgrimage known for annadana.",
        "summary": (
            "Sri Annapoorneshwari Temple at Horanadu, about 100 km from Chikkamagaluru on the "
            "banks of the Bhadra amid Western Ghats forests and coffee hills, draws thousands of "
            "devotees. It is widely known for the tradition of serving free meals to all visitors. "
            "Nearest attractions: Kalasa, Kudremukh, Bhadra River."
        ),
        "nearestAttractions": "Kalasa, Kudremukh, Bhadra River",
    },
    "sringeri": {
        "distanceKm": 90,
        "blurb": "Adi Shankaracharya’s Sharadamba Peetha on the Tunga — wisdom’s southern seat.",
        "summary": (
            "Sringeri Sharadamba Temple, about 90 km from Chikkamagaluru on the Tunga River, was "
            "established by Sri Adi Shankaracharya in the 8th century. It is one of the four "
            "sacred Peethas he founded and is dedicated to Goddess Sharadamba, deity of wisdom "
            "and learning. Nearest attractions: Vidyashankara Temple, Sirimane Falls, Kigga."
        ),
        "nearestAttractions": "Vidyashankara Temple, Sirimane Falls, Kigga",
    },
    "jhari-falls": {
        "distanceKm": 24,
        "bestRoute": "NH173 to Attigundi; short trek from Attigundi to the falls",
        "blurb": "Buttermilk Falls near Attigundi — a short trek into forest spray.",
        "summary": (
            "Jhari Falls at Attigundi is about 24 km from Chikkamagaluru. A short trek from "
            "Attigundi leads to this scenic waterfall in dense forest — a refreshing stop on "
            "the high-ridge side of the district."
        ),
    },
    "ayyanakere": {
        "distanceKm": 22,
        "bestRoute": (
            "Chikkamagaluru–Kadur Road; turn left from Sakarayapattana / Sakharayapatna town"
        ),
        "blurb": "One of Karnataka’s great lakes near Sakharayapatna — hills on the horizon.",
        "summary": (
            "Ayyanakere, near Sakarayapattana about 22 km from Chikkamagaluru by the brochure, "
            "is one of Karnataka’s largest lakes, framed by rolling hills and forest. It is "
            "popular for photography and quiet time; water-sports activities are also organized "
            "during the annual Shakuniranganatha Swamy Jatra Mahotsava in January."
        ),
        "tags_add": ["jatra", "january"],
    },
    "bandaje-arbi-traverse": {
        "bestRoute": "Approaches via SH66 / SH64 toward Sunkasale / Rani Jhari country",
        "summary": (
            "Two days from Sunkasale over Ballalarayana Durga and down past Bandaje Falls toward "
            "Ujire — among the finest ridge walks in these hills. The tourism brochure also "
            "highlights Bandaje Falls itself (near Rani Jhari, Sunkasale Grama Panchayat) as a "
            "spectacular trek destination with forest trails and Western Ghats views."
        ),
    },
}


NEW_PLACES: list[dict] = [
    {
        "id": "ukkada-falls",
        "name": "Ukkada Falls",
        "kannada": "ಉಕ್ಕಡ ಜಲಪಾತ",
        "category": "waterfalls",
        "taluk": "Chikkamagaluru",
        "talukId": "chikkamagaluru",
        "lat": 13.42,
        "lng": 75.68,
        "image": "assets/hebbe-falls.jpg",
        "distanceKm": 40,
        "bestRoute": "Take SH57 to reach Ukkada",
        "bestTime": "July – January",
        "difficulty": "moderate",
        "durationMin": 180,
        "blurb": "A secluded forest fall about 40 km out on the SH57 side — quiet water and birdsong.",
        "summary": (
            "Ukkada Falls, about 40 km from Chikkamagaluru city, is described by the tourism "
            "brochure as a well-kept secret and a sanctuary for peace. The cascade falls gently "
            "into a serene pool. Visitors enjoy about a 2 km forest trek with many bird species "
            "along winding paths and quiet landscapes."
        ),
        "visit": "Forest paths can be slippery after rain. Go in daylight; ask locally for the current trailhead.",
        "seasons": ["monsoon", "post-monsoon"],
        "tags": ["waterfall", "trek", "birds"],
        "near": "Ukkada village",
    },
    {
        "id": "kodige-falls",
        "name": "Kodige Falls",
        "kannada": "ಕೊಡಿಗೆ ಜಲಪಾತ",
        "category": "waterfalls",
        "taluk": "Mudigere",
        "talukId": "mudigere",
        "lat": 13.2,
        "lng": 75.55,
        "image": "assets/bandaje-falls.jpg",
        "distanceKm": 60,
        "bestRoute": "Drive on SH57 toward Durgadahalli, where Kodige Falls is located",
        "bestTime": "July – January",
        "difficulty": "moderate",
        "durationMin": 180,
        "blurb": "A hidden fall in the Durgadahalli forests and coffee country.",
        "summary": (
            "Kodige Falls, about 60 km from Chikkamagaluru near Durgadahalli, is a lesser-known "
            "gem tucked amidst dense forests and coffee plantations. The brochure describes a "
            "journey through lush greenery with the distant sound of flowing water — a serene "
            "escape rather than a crowded viewpoint."
        ),
        "visit": "Confirm the trailhead at Durgadahalli. After heavy rain, paths may be closed or slippery.",
        "seasons": ["monsoon", "post-monsoon"],
        "tags": ["waterfall", "coffee-country"],
        "near": "Durgadahalli",
    },
    {
        "id": "soor-mane-falls",
        "name": "Soor Mane Falls",
        "kannada": "ಸೂರುಮನೆ ಜಲಪಾತ",
        "category": "waterfalls",
        "taluk": "Kalasa",
        "talukId": "kalasa",
        "lat": 13.23,
        "lng": 75.4,
        "image": "assets/hebbe-falls.jpg",
        "distanceKm": 65,
        "bestRoute": "Take NH173 toward Kalasa; the falls are accessible from Kalasa",
        "bestTime": "July – January",
        "difficulty": "easy",
        "durationMin": 120,
        "blurb": "A quiet Kalasa-side fall — short trek, forests, and popular for photography.",
        "summary": (
            "Soor Mane (Soormane) Falls near Kalasa, about 65 km from Chikkamagaluru, is a "
            "serene lesser-known waterfall surrounded by lush forest. Reached by a short trek, "
            "it is a peaceful nature retreat and a popular spot for photography and pre-wedding "
            "shoots. Distinct from Sirimane Falls near Sringeri."
        ),
        "visit": "Not the same place as Sirimane Falls (Sringeri side). Confirm Kalasa-side access locally.",
        "seasons": ["monsoon", "post-monsoon"],
        "tags": ["waterfall", "photography", "kalasa"],
        "near": "Kalasa",
    },
    {
        "id": "elaneer-falls",
        "name": "Elaneer Falls",
        "kannada": "ಏಲನೀರು ಜಲಪಾತ",
        "category": "waterfalls",
        "taluk": "Kalasa",
        "talukId": "kalasa",
        "lat": 13.18,
        "lng": 75.38,
        "image": "assets/bandaje-falls.jpg",
        "distanceKm": 80,
        "bestRoute": "Drive on SH65 toward Samse; Elaneer Falls is near Samse",
        "bestTime": "July – January",
        "difficulty": "moderate",
        "durationMin": 240,
        "blurb": "A hidden cascade near Samse — dense forest trek to high, untouched water.",
        "summary": (
            "Elaneer (Elaneeru) Falls near the village of Samse, about 80 km from Chikkamagaluru, "
            "is a hidden treasure of the district. A trek through dense forest paths leads to "
            "pure water cascading from great heights in undisturbed Western Ghats nature."
        ),
        "visit": "Forest trek — weather and daylight matter. Ask in Samse for the current path.",
        "seasons": ["monsoon", "post-monsoon"],
        "tags": ["waterfall", "trek", "samse"],
        "near": "Samse",
    },
    {
        "id": "bandaje-falls",
        "name": "Bandaje Falls",
        "kannada": "ಬಂಡಾಜೆ ಜಲಪಾತ",
        "category": "waterfalls",
        "taluk": "Mudigere",
        "talukId": "mudigere",
        "lat": 13.12,
        "lng": 75.42,
        "image": "assets/bandaje-falls.jpg",
        "distanceKm": 100,
        "bestRoute": "Typically via SH66 and SH64 toward the Rani Jhari / Sunkasale side",
        "bestTime": "November – February",
        "difficulty": "challenging",
        "durationMin": 480,
        "blurb": "A spectacular trek fall near Rani Jhari and Sunkasale — Western Ghats reward.",
        "summary": (
            "Bandajje / Bandaje Falls near Rani Jhari (Sunkasale Grama Panchayat), about 100 km "
            "from Chikkamagaluru, is a spectacular trekking destination of forest trails and "
            "pristine landscapes. The challenging walk rewards visitors with views of the "
            "waterfall and surrounding Western Ghats. Related ridge walking is also described "
            "under the Bandaje Arbi Traverse."
        ),
        "visit": "Serious trek terrain. Carry water, start early, and prefer local guidance. Not a casual roadside stop.",
        "seasons": ["winter", "post-monsoon"],
        "tags": ["waterfall", "trek", "rani-jhari"],
        "near": "Rani Jhari, Sunkasale Grama Panchayat",
        "nearestAttractions": "Ballalarayana Durga, Rani Jhari, Kudremukh",
    },
    {
        "id": "madagada-kere",
        "name": "Madagada Kere",
        "kannada": "ಮಡಗಡ ಕೆರೆ",
        "category": "lakes",
        "taluk": "Kadur",
        "talukId": "kadur",
        "lat": 13.55,
        "lng": 76.0,
        "image": "assets/ayyanakere.jpg",
        "distanceKm": None,
        "distanceNote": "Brochure: approximately 12 km from Kadur (SH24 south, then southwest)",
        "bestRoute": "From Kadur, head south on SH24 and continue southwest to Madagada Kere",
        "bestTime": "October – February",
        "difficulty": "easy",
        "durationMin": 120,
        "blurb": "A tranquil Kadur-side lake for walks, boating and local cultural days.",
        "summary": (
            "Madagada Kere near Kadur is a picturesque lake and popular recreational place for "
            "locals and visitors. The brochure notes leisurely lakeside walks, boating, and "
            "cultural significance as a source of livelihood and a venue for regional events — "
            "a calm Malnad-east water sheet rather than a ghat trek."
        ),
        "visit": "Open lakeshore setting. Any boating is local — this page does not sell tickets.",
        "seasons": ["winter", "post-monsoon"],
        "tags": ["lake", "boating", "kadur"],
        "near": "Kadur",
    },
    {
        "id": "panchami-kallu",
        "name": "Panchami Kallu",
        "kannada": "ಪಂಚಮಿ ಕಲ್ಲು",
        "category": "viewpoints",
        "taluk": "Mudigere",
        "talukId": "mudigere",
        "lat": 13.1,
        "lng": 75.55,
        "image": "assets/z-point.jpg",
        "distanceKm": 55,
        "bestTime": "September – February",
        "difficulty": "moderate",
        "durationMin": 180,
        "blurb": "A quieter rock viewpoint near Devaramane and Kogre — coffee hills and valleys.",
        "summary": (
            "Panchami Kallu is a lesser-known hilltop viewpoint about 55 km from Chikkamagaluru, "
            "near Devaramane and Kogre village. Surrounded by forests, coffee estates and valleys, "
            "it offers a serene trek away from crowds, with a unique rock viewpoint and panoramic "
            "Western Ghats views. Nearest attractions: Devaramane Viewpoint, Mudigere, "
            "Kalabhairaveshwara Temple."
        ),
        "visit": "Carry water and keep to daylight. Trails can be unclear — ask at Devaramane / Kogre.",
        "seasons": ["winter", "post-monsoon", "monsoon"],
        "tags": ["viewpoint", "trek", "coffee-country"],
        "near": "Devaramane and Kogre village",
        "nearestAttractions": "Devaramane Viewpoint, Mudigere, Kalabhairaveshwara Temple",
    },
    {
        "id": "devaramane-viewpoint",
        "name": "Devaramane Viewpoint",
        "kannada": "ದೇವರಮನೆ",
        "category": "viewpoints",
        "taluk": "Mudigere",
        "talukId": "mudigere",
        "lat": 13.09,
        "lng": 75.54,
        "image": "assets/kemmanagundi.jpg",
        "distanceKm": 52,
        "bestRoute": "Short trek from the Kalabhairaveshwara Temple",
        "bestTime": "Monsoon and post-monsoon",
        "difficulty": "easy",
        "durationMin": 120,
        "blurb": "Grassland views above Mudigere — a short walk from Kalabhairaveshwara Temple.",
        "summary": (
            "Devaramane Viewpoint (Devaramane Betta), about 52 km from Chikkamagaluru near the "
            "Kalabhairaveshwara Temple, is a hidden gem of rolling grasslands and panoramic "
            "Western Ghats views. Ideal in monsoon and post-monsoon. Distinct from Deviramma "
            "Betta near the Mullayanagiri side. Nearest attractions: Kalabhairaveshwara Temple, "
            "Panchami Kallu, Mudigere."
        ),
        "visit": "Short temple-side trek. Mist can erase the view quickly in the rains.",
        "seasons": ["monsoon", "post-monsoon"],
        "tags": ["viewpoint", "grassland", "mudigere"],
        "near": "Kalabhairaveshwara Temple",
        "nearestAttractions": "Kalabhairaveshwara Temple, Panchami Kallu, Mudigere",
    },
    {
        "id": "rani-jhari-viewpoint",
        "name": "Rani Jhari Viewpoint",
        "kannada": "ರಾಣಿ ಝರಿ",
        "category": "viewpoints",
        "taluk": "Mudigere",
        "talukId": "mudigere",
        "lat": 13.15,
        "lng": 75.35,
        "image": "assets/kudremukh-np.jpg",
        "distanceKm": 70,
        "bestTime": "Monsoon and clear winter mornings",
        "difficulty": "moderate",
        "durationMin": 180,
        "blurb": "One of the Western Ghats’ great valley viewpoints — mist, grass and monsoon drama.",
        "summary": (
            "Rani Jhari is among the most breathtaking viewpoints in the Western Ghats, about "
            "70 km from Chikkamagaluru. Surrounded by valleys, forests and grasslands, it is "
            "especially beautiful in the monsoon and a favourite for sunrise, sunset and "
            "photography. Not the same place as Jhari (Buttermilk) Falls near Attigundi. "
            "Nearest attractions: Kudremukh, Netravathi Peak, Durgadahalli."
        ),
        "visit": "Exposed viewpoints — wind and cloud move fast. Keep daylight margin.",
        "seasons": ["monsoon", "winter", "post-monsoon"],
        "tags": ["viewpoint", "photography", "monsoon"],
        "near": "Kudremukh / Netravathi Peak area",
        "nearestAttractions": "Kudremukh, Netravathi Peak, Durgadahalli",
    },
    {
        "id": "narasimha-parvatha",
        "name": "Narasimha Parvatha",
        "kannada": "ನರಸಿಂಹ ಪರ್ವತ",
        "category": "treks",
        "taluk": "Sringeri",
        "talukId": "sringeri",
        "lat": 13.4,
        "lng": 75.2,
        "image": "assets/kudremukh-np.jpg",
        "distanceKm": 110,
        "bestTime": "November – February",
        "difficulty": "challenging",
        "durationMin": 600,
        "blurb": "A classic Sringeri-side Western Ghats trek named in the district trek list.",
        "summary": (
            "Narasimha Parvatha is listed among Chikkamagaluru’s major trekking and viewpoint "
            "trails in the Department of Tourism brochure, alongside Mullayanagiri, Kudremukh "
            "and Netravathi Peak. It is a serious Western Ghats walk on the Sringeri / Agumbe "
            "side of the district — permits, weather and local guidance come first."
        ),
        "visit": "Confirm forest permits and season before attempting. Not a casual day outing from town.",
        "seasons": ["winter", "post-monsoon"],
        "tags": ["trek", "western-ghats"],
    },
    {
        "id": "devarunda-rameshwara",
        "name": "Devarunda Prasanna Rameshwara Temple",
        "kannada": "ದೇವರುಂದ ರಾಮೇಶ್ವರ",
        "category": "temples",
        "taluk": "Mudigere",
        "talukId": "mudigere",
        "lat": 13.14,
        "lng": 75.64,
        "image": "assets/belavadi.jpg",
        "distanceKm": 55,
        "bestTime": "All year",
        "difficulty": "easy",
        "durationMin": 90,
        "blurb": "“Dakshina Kashi” of Mudigere — an ancient Shiva shrine in Malnad green.",
        "summary": (
            "Devarunda Prasanna Rameshwara Temple near Mudigere, about 55 km from Chikkamagaluru, "
            "is popularly known as Dakshina Kashi. The brochure describes a revered ancient "
            "Lord Shiva shrine, believed to be over 500 years old, with several deities in the "
            "complex and a serene cultural setting in lush Mudigere landscapes."
        ),
        "visit": "Living temple — dress and photography follow temple rules.",
        "seasons": ["winter", "post-monsoon", "summer"],
        "tags": ["temple", "shiva", "mudigere"],
        "near": "Mudigere",
    },
    {
        "id": "hirenallur-mallikarjuna",
        "name": "Mallikarjuna Temple, Hirenallur",
        "kannada": "ಹಿರೇನಲ್ಲೂರು ಮಲ್ಲಿಕಾರ್ಜುನ",
        "category": "temples",
        "taluk": "Kadur",
        "talukId": "kadur",
        "lat": 13.55,
        "lng": 76.05,
        "image": "assets/amruthapura.jpg",
        "distanceKm": 57,
        "bestTime": "All year",
        "difficulty": "easy",
        "durationMin": 90,
        "blurb": "ASI-protected Hoysala Shiva temple near Kadur — quieter than the famous twins.",
        "summary": (
            "Mallikarjuna Temple at Hirenallur, about 57 km from Chikkamagaluru (roughly 12 km "
            "from Kadur), is a lesser-known but architecturally significant Hoysala-era temple "
            "dedicated to Lord Shiva as Mallikarjuna. It is protected by the Archaeological "
            "Survey of India. Nearest attractions: Kadur, Belavadi, Amruthapura, Chikkamagaluru."
        ),
        "visit": "Heritage monument — follow ASI / temple guidance on site.",
        "seasons": ["winter", "post-monsoon", "summer"],
        "tags": ["temple", "hoysala", "asi"],
        "near": "Hirenallur village (about 12 km from Kadur)",
        "nearestAttractions": "Kadur, Belavadi, Amruthapura, Chikkamagaluru",
    },
    {
        "id": "baggavalli-yoganarasimha",
        "name": "Yoganarasimhaswamy Temple, Baggavalli",
        "kannada": "ಬಗ್ಗವಳ್ಳಿ ಯೋಗನರಸಿಂಹ",
        "category": "temples",
        "taluk": "Mudigere",
        "talukId": "mudigere",
        "lat": 13.2,
        "lng": 75.58,
        "image": "assets/belavadi.jpg",
        "distanceKm": 61,
        "bestTime": "All year",
        "difficulty": "easy",
        "durationMin": 90,
        "blurb": "Hoysala-period shrine at Baggavalli — once Keshava, now famed for Yoganarasimha.",
        "summary": (
            "Yoganarasimhaswamy Temple in Baggavalli village (Mudigere Taluk), about 61 km from "
            "Chikkamagaluru, is an important Hoysala-period monument. Originally dedicated to "
            "Lord Keshava, it features sculptures of Yoganarasimha, Lakshmi and Ganesha and "
            "stands as a fine example of Hoysala craft in the taluk. Nearest attractions: "
            "Mudigere, Devaramane, Ettina Bhuja."
        ),
        "visit": "Living / heritage temple setting — follow local rules.",
        "seasons": ["winter", "post-monsoon", "summer"],
        "tags": ["temple", "hoysala", "narasimha"],
        "near": "Baggavalli village, Mudigere Taluk",
        "nearestAttractions": "Mudigere, Devaramane, Ettina Bhuja",
    },
    {
        "id": "khandya-markandeshwara",
        "name": "Sri Markandeshwara Temple, Khandya",
        "kannada": "ಖಂಡ್ಯ ಮಾರ್ಕಂಡೇಶ್ವರ",
        "category": "temples",
        "taluk": "Chikkamagaluru",
        "talukId": "chikkamagaluru",
        "lat": 13.4,
        "lng": 75.85,
        "image": "assets/belavadi.jpg",
        "distanceKm": 44,
        "bestTime": "All year",
        "difficulty": "easy",
        "durationMin": 90,
        "blurb": "Post-Vijayanagara Shiva temple in the hills — granite work and local legend.",
        "summary": (
            "Sri Markandeshwara Temple at Khandya, about 44 km from Chikkamagaluru, is a revered "
            "Shiva temple of Post-Vijayanagara architecture in scenic hill surroundings. It is "
            "associated with Sage Mallikarjuna and local legends, with intricate granite carvings "
            "and sculptures — a historic cultural landmark of the region."
        ),
        "visit": "Living temple — dress and conduct follow temple custom.",
        "seasons": ["winter", "post-monsoon", "summer"],
        "tags": ["temple", "shiva", "heritage"],
        "near": "Khandya",
    },
    {
        "id": "marle-twin-temples",
        "name": "Marle Twin Temples",
        "kannada": "ಮರ್ಳೆ ದೇವಾಲಯಗಳು",
        "category": "temples",
        "taluk": "Chikkamagaluru",
        "talukId": "chikkamagaluru",
        "lat": 13.28,
        "lng": 75.85,
        "image": "assets/belavadi.jpg",
        "distanceKm": 12,
        "bestTime": "All year",
        "difficulty": "easy",
        "durationMin": 90,
        "blurb": "Hoysala twin shrines at Marle — Chennakeshava and Siddeshwara, c. 1150 CE.",
        "summary": (
            "Marle Twin Temples, about 12 km from Chikkamagaluru, are hidden Hoysala gems: "
            "Shri Chennakeshava Temple and Siddeshwara Temple, built around 1150 CE and dedicated "
            "to Vishnu and Shiva. Intricate stone carving makes them an excellent example of "
            "medieval Karnataka architecture. Nearest attractions: Belur, Halebeedu, "
            "Veeranarayana Temple."
        ),
        "visit": "Heritage temples — follow on-site ASI / temple guidance.",
        "seasons": ["winter", "post-monsoon", "summer"],
        "tags": ["temple", "hoysala", "twin-temples"],
        "near": "Marle",
        "nearestAttractions": "Belur, Halebeedu, Veeranarayana Temple",
    },
    {
        "id": "kyatanamakki",
        "name": "Kyatanamakki Hill",
        "kannada": "ಕ್ಯಾತನಮಕ್ಕಿ",
        "category": "treks",
        "taluk": "Sringeri",
        "talukId": "sringeri",
        "lat": 13.45,
        "lng": 75.25,
        "image": "assets/kudremukh-np.jpg",
        "bestTime": "November – February",
        "difficulty": "moderate",
        "durationMin": 300,
        "blurb": "A brochure-listed hill trek on the Sringeri / Western Ghats side.",
        "summary": (
            "Kyatanamakki Hill Trek is named in the Department of Tourism brochure’s trekking "
            "and viewpoints list for Chikkamagaluru, together with trails such as Mullayanagiri, "
            "Kudremukh and Narasimha Parvatha. Expect grassland and shola country — confirm "
            "season and any forest guidance before you go."
        ),
        "visit": "Daylight trek. Weather on the ghats changes quickly.",
        "seasons": ["winter", "post-monsoon"],
        "tags": ["trek", "hill"],
    },
]


def apply_enrichment(place: dict, patch: dict) -> list[str]:
    changes = []
    for key, val in patch.items():
        if key == "tags_add":
            tags = place.setdefault("tags", [])
            for t in val:
                if t not in tags:
                    tags.append(t)
                    changes.append(f"+tag:{t}")
            continue
        old = place.get(key)
        if old != val:
            place[key] = val
            changes.append(key)
    ensure_source(place)
    return changes


def recompute_counts(data: dict) -> None:
    dests = data["destinations"]
    cat_counts: dict[str, int] = {}
    taluk_counts: dict[str, int] = {}
    for d in dests:
        cat_counts[d["category"]] = cat_counts.get(d["category"], 0) + 1
        tid = d.get("talukId")
        if tid:
            taluk_counts[tid] = taluk_counts.get(tid, 0) + 1
    for c in data["categories"]:
        if c["id"] == "all":
            continue
        if c["id"] in cat_counts:
            c["count"] = cat_counts[c["id"]]
    for t in data["taluks"]:
        t["count"] = taluk_counts.get(t["id"], 0)


def update_official(data: dict) -> None:
    official = data.setdefault("official", {})
    official["tourism_office_phone"] = "08262-295422"
    official["tourism_office_mobile"] = "7892886875"
    official["tourism_office_email"] = "ckm.tourism@gmail.com"
    official["tourism_office_address"] = (
        "Office of the Assistant Director, Department of Tourism, "
        "Belur Road, Near Kote Circle, Chikkamagaluru – 577101"
    )
    official["tourism_site"] = "https://www.chikkamagalurutourism.in/"
    official["aranyavihaara"] = "https://aranyavihaara.karnataka.gov.in/"
    official["bhadra_tickets"] = "https://tickets.bhadratigerreserve.in/"


def update_essentials_contact(data: dict) -> None:
    essentials = data.get("essentials") or {}
    emergency = essentials.get("emergency")
    if isinstance(emergency, dict):
        items = emergency.setdefault("items", [])
        label = "District tourism office"
        if not any(i.get("title") == label for i in items):
            items.append(
                {
                    "title": label,
                    "text": (
                        "Assistant Director, Department of Tourism — Belur Road, Near Kote Circle, "
                        "Chikkamagaluru 577101. Phone 08262-295422 / 7892886875. "
                        "Email ckm.tourism@gmail.com. "
                        "Brochure and district notes inform place facts on this companion; "
                        "this is not a government booking desk."
                    ),
                }
            )


def main() -> None:
    data = load_data()
    by_id = {d["id"]: d for d in data["destinations"]}
    report = {"enriched": {}, "added": [], "skipped_new": []}

    for pid, patch in ENRICH.items():
        if pid not in by_id:
            report["enriched"][pid] = ["MISSING_ID"]
            continue
        changes = apply_enrichment(by_id[pid], patch)
        report["enriched"][pid] = changes

    for place in NEW_PLACES:
        pid = place["id"]
        if pid in by_id:
            report["skipped_new"].append(pid)
            continue
        new_p = deepcopy(place)
        # fix image ternary leftover
        if new_p.get("image") is True or new_p.get("image") is False:
            new_p["image"] = "assets/hebbe-falls.jpg"
        ensure_source(new_p)
        # default sources also include district tourism
        sources = new_p.setdefault("sources", [])
        if not any(s.get("label") == "District tourism" for s in sources):
            sources.insert(
                0,
                {
                    "label": "District tourism",
                    "url": "https://chikkamagaluru.nic.in/en/tourism/",
                },
            )
        data["destinations"].append(new_p)
        by_id[pid] = new_p
        report["added"].append(pid)

    # Sort destinations by name for stability
    data["destinations"].sort(key=lambda d: (d.get("category") or "", d.get("name") or ""))

    recompute_counts(data)
    update_official(data)
    update_essentials_contact(data)

    # Stamp site description lightly (no UI) — keep independent companion wording
    site = data.setdefault("site", {})
    desc = site.get("description") or ""
    if "Department of Tourism brochure" not in desc:
        site["description"] = (
            "An independent, static companion for discovering Chikkamagaluru district: peaks, "
            "waterfalls, temples, forests and seasons. Place facts are enriched from the "
            "District Department of Tourism brochure and official notes. Not a government site, "
            "not a booking service, and nothing here is downloadable."
        )

    save_data(data)
    report["destination_count"] = len(data["destinations"])
    report["category_counts"] = {
        c["id"]: c.get("count") for c in data["categories"] if c["id"] != "all"
    }
    OUT_REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
