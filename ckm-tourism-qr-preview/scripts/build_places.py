#!/usr/bin/env python3
"""Build World Tourism Day 2026 QR visit-page preview (not production)."""
from __future__ import annotations

import json
from pathlib import Path

import qrcode

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
ASSETS = DIST / "assets"
QR_DIR = DIST / "qr"

# Public tunnel URL is injected at generate time; placeholder until tunnel starts.
PUBLIC_BASE = "http://127.0.0.1:8790"

PLACES = [
    {
        "id": "mullayanagiri",
        "taluk": "Chikkamagaluru",
        "taluk_kn": "ಚಿಕ್ಕಮಗಳೂರು",
        "category": "peaks",
        "hero": "assets/mullayanagiri.jpg",
        "photos": [
            {"src": "assets/mullayanagiri.jpg", "cap_en": "Summit ridge", "cap_kn": "ಶಿಖರ ರಿಡ್ಜ್"},
            {"src": "assets/seethalayyanagiri.jpg", "cap_en": "Neighbour peak", "cap_kn": "ಪಕ್ಕದ ಶಿಖರ"},
            {"src": "assets/baba-budangiri.jpg", "cap_en": "Baba Budan range", "cap_kn": "ಬಾಬಾ ಬುದನ್ ಶ್ರೇಣಿ"},
            {"src": "assets/coffee-hills.jpg", "cap_en": "Coffee hills below", "cap_kn": "ಕೆಳಗಿನ ಕಾಫಿ ಬೆಟ್ಟ"},
            {"src": "assets/jhari-falls.jpg", "cap_en": "Nearby Jhari Falls", "cap_kn": "ಹತ್ತಿರದ ಝರಿ ಜಲಪಾತ"},
        ],
        "maps": "https://www.google.com/maps?q=13.3909,75.7214",
        "booking": "",
        "en": {
            "name": "Mullayanagiri",
            "kicker": "Karnataka’s highest peak · 1,930 m",
            "history": "Mullayanagiri is Karnataka’s highest peak at 1,930 m, about 20 km from Chikkamagaluru town. Mist, coffee hills and Mullappa Swamy Temple at the summit make it the district’s signature viewpoint for sunrise and sunset.",
            "timings": "Daylight visit recommended. Last stretch often walked. Confirm road/weather locally before you go.",
            "facilities": {
                "parking": "Limited roadside / estate-edge parking — arrive early on weekends.",
                "washrooms": "Basic facilities near approach points; do not expect summit toilets.",
                "hotels": "Stays mainly in Chikkamagaluru town (~20 km).",
                "mitra": "Ask Tourist Mitra / Tourism counter in town for current road advice.",
            },
            "conduct": [
                "Single-use plastic ban — carry water in steel/reusable bottles.",
                "No outside snacks in plastic covers on the ridge.",
                "Obey speed limits on hairpin roads; mist reduces visibility.",
                "No drugs, alcohol or smoking at the summit shrine area.",
            ],
            "faqs": [
                {
                    "q": "How hard is the climb?",
                    "a": "The drive is steep and narrow; the last stretch is usually a short walk to the temple. Wear shoes with grip — rock can be wet in mist.",
                },
                {
                    "q": "Best time to visit?",
                    "a": "Clear winter mornings for sunrise views. Monsoon brings heavy mist and slippery roads — check locally.",
                },
                {
                    "q": "Is parking free?",
                    "a": "Roadside space is limited. Prefer early arrival; follow any local/estate guidance and never block hairpins.",
                },
            ],
        },
        "kn": {
            "name": "ಮುಳ್ಳಯ್ಯನಗಿರಿ",
            "kicker": "ಕರ್ನಾಟಕದ ಅತ್ಯುನ್ನತ ಶಿಖರ · ೧,೯೩೦ ಮೀ",
            "history": "ಮುಳ್ಳಯ್ಯನಗಿರಿ ಕರ್ನಾಟಕದ ಅತ್ಯುನ್ನತ ಶಿಖರ (೧,೯೩೦ ಮೀ), ಚಿಕ್ಕಮಗಳೂರು ನಗರದಿಂದ ಸುಮಾರು ೨೦ ಕಿ.ಮೀ. ಮಂಜು, ಕಾಫಿ ಬೆಟ್ಟಗಳು ಮತ್ತು ಶಿಖರದ ಮುಳ್ಳಪ್ಪ ಸ್ವಾಮಿ ದೇವಸ್ಥಾನ — ಜಿಲ್ಲೆಯ ಪ್ರಮುಖ ಸೂರ್ಯೋದಯ/ಸೂರ್ಯಾಸ್ತ ದೃಶ್ಯಸ್ಥಳ.",
            "timings": "ಹಗಲಿನಲ್ಲಿ ಭೇಟಿ ಉತ್ತಮ. ಕೊನೆಯ ಭಾಗವನ್ನು ಸಾಮಾನ್ಯವಾಗಿ ನಡೆದು ಹೋಗುತ್ತಾರೆ. ಹೋಗುವ ಮೊದಲು ರಸ್ತೆ/ಹವಾಮಾನ ಖಚಿತಪಡಿಸಿ.",
            "facilities": {
                "parking": "ಸೀಮಿತ ರಸ್ತೆಬದಿ ಪಾರ್ಕಿಂಗ್ — ವಾರಾಂತ್ಯದಲ್ಲಿ ಬೇಗ ಬನ್ನಿ.",
                "washrooms": "ಮಾರ್ಗದ ಬಳಿ ಮೂಲ ಸೌಕರ್ಯ; ಶಿಖರದಲ್ಲಿ ಶೌಚಾಲಯ ನಿರೀಕ್ಷಿಸಬೇಡಿ.",
                "hotels": "ವಸತಿ ಮುಖ್ಯವಾಗಿ ಚಿಕ್ಕಮಗಳೂರು ನಗರದಲ್ಲಿ (~೨೦ ಕಿ.ಮೀ).",
                "mitra": "ರಸ್ತೆ ಸಲಹೆಗಾಗಿ ಪ್ರವಾಸೋದ್ಯಮ ಕೌಂಟರ್ / ಟೂರಿಸ್ಟ್ ಮಿತ್ರರನ್ನು ಕೇಳಿ.",
            },
            "conduct": [
                "ಏಕಬಳಕೆ ಪ್ಲಾಸ್ಟಿಕ್ ನಿಷೇಧ — ಉಕ್ಕು/ಮರುಬಳಕೆ ಬಾಟಲಿ ತನ್ನಿ.",
                "ರಿಡ್ಜ್ ಮೇಲೆ ಪ್ಲಾಸ್ಟಿಕ್ ಕವರ್‌ನಲ್ಲಿ ಹೊರಗಿನ ತಿಂಡಿ ಬೇಡ.",
                "ಸುತ್ತು ರಸ್ತೆಯಲ್ಲಿ ವೇಗ ಮಿತಿ; ಮಂಜಿನಲ್ಲಿ ದೃಷ್ಟಿ ಕಡಿಮೆ.",
                "ಶಿಖರ ದೇವಸ್ಥಾನ ಪ್ರದೇಶದಲ್ಲಿ ಮಾದಕ, ಮದ್ಯ, ಧೂಮಪಾನ ನಿಷೇಧ.",
            ],
            "faqs": [
                {
                    "q": "ಏರಿಕೆ ಎಷ್ಟು ಕಷ್ಟ?",
                    "a": "ರಸ್ತೆ ಇಳಿಜಾರು ಮತ್ತು ಇಕ್ಕಟ್ಟು; ಕೊನೆಯ ಭಾಗ ಸಾಮಾನ್ಯವಾಗಿ ನಡಿಗೆ. ಮಂಜಿನಲ್ಲಿ ಕಲ್ಲು ಜಾರು — ಹಿಡಿತವಿರುವ ಶೂ ಧರಿಸಿ.",
                },
                {
                    "q": "ಯಾವಾಗ ಹೋಗುವುದು ಉತ್ತಮ?",
                    "a": "ಚಳಿಗಾಲದ ಬೆಳಗು ಸೂರ್ಯೋದಯಕ್ಕೆ ಉತ್ತಮ. ಮಳೆಗಾಲದಲ್ಲಿ ಮಂಜು/ಜಾರು ರಸ್ತೆ — ಸ್ಥಳೀಯವಾಗಿ ಖಚಿತಪಡಿಸಿ.",
                },
                {
                    "q": "ಪಾರ್ಕಿಂಗ್ ಉಚಿತವೇ?",
                    "a": "ಜಾಗ ಕಡಿಮೆ. ಬೇಗ ಬನ್ನಿ; ಸ್ಥಳೀಯ ನಿಯಮ ಪಾಲಿಸಿ, ಸುತ್ತು ರಸ್ತೆ ಅಡ್ಡಗಟ್ಟಬೇಡಿ.",
                },
            ],
        },
    },
    {
        "id": "horanadu",
        "taluk": "Kalasa",
        "taluk_kn": "ಕಳಸ",
        "category": "temples",
        "hero": "assets/horanadu.jpg",
        "photos": [
            {"src": "assets/horanadu.jpg", "cap_en": "Temple town", "cap_kn": "ದೇವಸ್ಥಾನ ಪಟ್ಟಣ"},
            {"src": "assets/kalasa.jpg", "cap_en": "Kalasa nearby", "cap_kn": "ಹತ್ತಿರದ ಕಳಸ"},
            {"src": "assets/kalasa-stream.jpg", "cap_en": "Ghat streams", "cap_kn": "ಘಟ್ಟದ ಹೊಳೆ"},
            {"src": "assets/soor-mane-falls.jpg", "cap_en": "Soor Mane Falls", "cap_kn": "ಸೂರ್ ಮನೆ ಜಲಪಾತ"},
            {"src": "assets/kudremukh-np.jpg", "cap_en": "Kudremukh forests", "cap_kn": "ಕುದುರೆಮುಖ ಅರಣ್ಯ"},
        ],
        "maps": "https://www.google.com/maps?q=13.2766,75.3452",
        "booking": "",
        "en": {
            "name": "Horanadu Annapoorneshwari",
            "kicker": "Kalasa taluk · Annadana pilgrimage",
            "history": "Sri Annapoorneshwari Temple at Horanadu sits amid Western Ghats forests and coffee hills, about 100 km from Chikkamagaluru. It is widely known for serving free meals (annadana) to all visitors.",
            "timings": "Follow temple / matha notices for darshan and meal timings. Dress modestly.",
            "facilities": {
                "parking": "Temple-area parking — follow volunteer / police guidance on festival days.",
                "washrooms": "Available in the temple complex area.",
                "hotels": "Lodges and temple guest options around Horanadu / Kalasa.",
                "mitra": "Tourist Mitra / temple office for seva and queue guidance.",
            },
            "conduct": [
                "Single-use plastic ban in temple premises.",
                "No outside snacks in plastic covers inside the complex.",
                "Drive slowly on ghat roads from Mudigere / Kalasa.",
                "No drugs, alcohol or smoking in and around the temple.",
            ],
            "faqs": [
                {
                    "q": "Is annadana free for visitors?",
                    "a": "Horanadu is known for serving meals to devotees. Confirm today’s meal timings at the temple counter on arrival.",
                },
                {
                    "q": "How do I reach from Chikkamagaluru?",
                    "a": "About 100 km via Mudigere / Kalasa ghat roads. Start early; roads are winding.",
                },
                {
                    "q": "Dress code?",
                    "a": "Modest temple dress. Follow notices at the entrance for darshan rules.",
                },
            ],
        },
        "kn": {
            "name": "ಹೊರನಾಡು ಅನ್ನಪೂರ್ಣೇಶ್ವರಿ",
            "kicker": "ಕಳಸ ತಾಲ್ಲೂಕು · ಅನ್ನದಾನ ಯಾತ್ರೆ",
            "history": "ಹೊರನಾಡಿನ ಶ್ರೀ ಅನ್ನಪೂರ್ಣೇಶ್ವರಿ ದೇವಸ್ಥಾನ ಪಶ್ಚಿಮ ಘಟ್ಟದ ಕಾಡು ಮತ್ತು ಕಾಫಿ ಬೆಟ್ಟಗಳ ನಡುವೆ, ಚಿಕ್ಕಮಗಳೂರಿನಿಂದ ಸುಮಾರು ೧೦೦ ಕಿ.ಮೀ. ಎಲ್ಲಾ ಭಕ್ತರಿಗೆ ಅನ್ನದಾನಕ್ಕೆ ಹೆಸರುವಾಸಿ.",
            "timings": "ದರ್ಶನ/ಊಟದ ವೇಳೆಗೆ ದೇವಸ್ಥಾನ ನೋಟೀಸ್ ನೋಡಿ. ಸರಳ ಉಡುಪು ಧರಿಸಿ.",
            "facilities": {
                "parking": "ದೇವಸ್ಥಾನ ಪ್ರದೇಶದ ಪಾರ್ಕಿಂಗ್ — ಹಬ್ಬದ ದಿನಗಳಲ್ಲಿ ಸ್ವಯಂಸೇವಕ/ಪೊಲೀಸ್ ಸೂಚನೆ ಪಾಲಿಸಿ.",
                "washrooms": "ದೇವಸ್ಥಾನ ಸಂಕೀರ್ಣದಲ್ಲಿ ಲಭ್ಯ.",
                "hotels": "ಹೊರನಾಡು/ಕಳಸ ಸುತ್ತಲೂ ವಸತಿ ಲಾಡ್ಜ್‌ಗಳು.",
                "mitra": "ಸೇವೆ/ಸರತಿ ಮಾಹಿತಿಗೆ ಟೂರಿಸ್ಟ್ ಮಿತ್ರ / ದೇವಸ್ಥಾನ ಕಚೇರಿ.",
            },
            "conduct": [
                "ದೇವಸ್ಥಾನ ಪ್ರಾಂಗಣದಲ್ಲಿ ಏಕಬಳಕೆ ಪ್ಲಾಸ್ಟಿಕ್ ನಿಷೇಧ.",
                "ಸಂಕೀರ್ಣದೊಳಗೆ ಪ್ಲಾಸ್ಟಿಕ್ ಕವರ್ ತಿಂಡಿ ಬೇಡ.",
                "ಮೂಡಿಗೆರೆ/ಕಳಸ ಘಟ್ಟ ರಸ್ತೆಯಲ್ಲಿ ನಿಧಾನವಾಗಿ ಚಲಿಸಿ.",
                "ದೇವಸ್ಥಾನ ಸುತ್ತಲೂ ಮಾದಕ, ಮದ್ಯ, ಧೂಮಪಾನ ನಿಷೇಧ.",
            ],
            "faqs": [
                {
                    "q": "ಅನ್ನದಾನ ಉಚಿತವೇ?",
                    "a": "ಹೊರನಾಡು ಅನ್ನದಾನಕ್ಕೆ ಹೆಸರು. ಇಂದಿನ ಊಟದ ವೇಳೆ ಬಂದು ಕೌಂಟರ್‌ನಲ್ಲಿ ಖಚಿತಪಡಿಸಿ.",
                },
                {
                    "q": "ಚಿಕ್ಕಮಗಳೂರಿನಿಂದ ಹೇಗೆ?",
                    "a": "ಸುಮಾರು ೧೦೦ ಕಿ.ಮೀ, ಮೂಡಿಗೆರೆ/ಕಳಸ ಘಟ್ಟ ಮಾರ್ಗ. ಬೇಗ ಹೊರಡಿ; ರಸ್ತೆ ಸುತ್ತುಸುತ್ತು.",
                },
                {
                    "q": "ಉಡುಪು ನಿಯಮ?",
                    "a": "ಸರಳ ದೇವಸ್ಥಾನ ಉಡುಪು. ದರ್ಶನ ನಿಯಮಕ್ಕೆ ಪ್ರವೇಶದ ನೋಟೀಸ್ ನೋಡಿ.",
                },
            ],
        },
    },
    {
        "id": "sringeri",
        "taluk": "Sringeri",
        "taluk_kn": "ಶೃಂಗೇರಿ",
        "category": "temples",
        "hero": "assets/sringeri.jpg",
        "photos": [
            {"src": "assets/sringeri.jpg", "cap_en": "Sharadamba Peetha", "cap_kn": "ಶಾರದಾಂಬಾ ಪೀಠ"},
            {"src": "assets/vidyashankara.jpg", "cap_en": "Vidyashankara Temple", "cap_kn": "ವಿದ್ಯಾಶಂಕರ ದೇವಸ್ಥಾನ"},
            {"src": "assets/hariharapura-tunga.jpg", "cap_en": "Tunga river country", "cap_kn": "ತುಂಗಾ ನದಿ ಪ್ರದೇಶ"},
            {"src": "assets/sirimane-falls.jpg", "cap_en": "Sirimane Falls nearby", "cap_kn": "ಹತ್ತಿರದ ಸಿರಿಮನೆ ಜಲಪಾತ"},
            {"src": "assets/sringeri.jpg", "cap_en": "Living matha town", "cap_kn": "ಜೀವಂತ ಮಠ ಪಟ್ಟಣ"},
        ],
        "maps": "https://www.google.com/maps?q=13.4157,75.2515",
        "booking": "https://www.sringeri.net/",
        "en": {
            "name": "Sringeri Sharadamba",
            "kicker": "Adi Shankara’s Peetha on the Tunga",
            "history": "Sringeri Sharadamba Temple on the Tunga River was established by Sri Adi Shankaracharya in the 8th century as one of the four Amnaya Peethas. It is dedicated to Goddess Sharadamba — wisdom and learning — and remains a living religious centre.",
            "timings": "Follow official Sringeri matha / sringeri.net notices for darshan timings.",
            "facilities": {
                "parking": "Town / matha parking zones — follow local guidance.",
                "washrooms": "Available near temple / town facilities.",
                "hotels": "Many lodges and matha guest options in Sringeri town.",
                "mitra": "Tourist Mitra / matha information for darshan queues.",
            },
            "conduct": [
                "Single-use plastic ban in temple and matha areas.",
                "No outside snacks in plastic covers inside sacred premises.",
                "Respect speed limits through town and river roads.",
                "No drugs, alcohol or smoking near the Peetha.",
            ],
            "faqs": [
                {
                    "q": "What should I see besides Sharadamba?",
                    "a": "Vidyashankara Temple is beside the Peetha. Sirimane Falls and Kigga are popular nearby day trips.",
                },
                {
                    "q": "Is there an official website?",
                    "a": "Yes — sringeri.net publishes darshan and seva information. Prefer that over third-party claims.",
                },
                {
                    "q": "How far from Chikkamagaluru?",
                    "a": "About 90 km. Plan half a day including darshan and the river town walk.",
                },
            ],
        },
        "kn": {
            "name": "ಶೃಂಗೇರಿ ಶಾರದಾಂಬಾ",
            "kicker": "ತುಂಗಾ ತೀರದಲ್ಲಿ ಆದಿ ಶಂಕರರ ಪೀಠ",
            "history": "ತುಂಗಾ ನದಿ ತೀರದ ಶೃಂಗೇರಿ ಶಾರದಾಂಬಾ ದೇವಸ್ಥಾನವನ್ನು ಆದಿ ಶಂಕರಾಚಾರ್ಯರು ೮ನೇ ಶತಮಾನದಲ್ಲಿ ನಾಲ್ಕು ಆಮ್ನಾಯ ಪೀಠಗಳಲ್ಲಿ ಒಂದಾಗಿ ಸ್ಥಾಪಿಸಿದರು. ಜ್ಞಾನದ ದೇವತೆ ಶಾರದಾಂಬೆಗೆ ಸಮರ್ಪಿತ; ಇಂದಿಗೂ ಜೀವಂತ ಧಾರ್ಮಿಕ ಕೇಂದ್ರ.",
            "timings": "ದರ್ಶನ ವೇಳೆಗೆ ಅಧಿಕೃತ ಶೃಂಗೇರಿ ಮಠ / sringeri.net ನೋಟೀಸ್ ನೋಡಿ.",
            "facilities": {
                "parking": "ಪಟ್ಟಣ/ಮಠ ಪಾರ್ಕಿಂಗ್ — ಸ್ಥಳೀಯ ಸೂಚನೆ ಪಾಲಿಸಿ.",
                "washrooms": "ದೇವಸ್ಥಾನ/ಪಟ್ಟಣ ಸೌಕರ್ಯಗಳು ಲಭ್ಯ.",
                "hotels": "ಶೃಂಗೇರಿ ಪಟ್ಟಣದಲ್ಲಿ ಲಾಡ್ಜ್ ಮತ್ತು ಮಠ ಅತಿಥಿ ವಸತಿ.",
                "mitra": "ದರ್ಶನ ಸರತಿಗೆ ಟೂರಿಸ್ಟ್ ಮಿತ್ರ / ಮಠ ಮಾಹಿತಿ.",
            },
            "conduct": [
                "ದೇವಸ್ಥಾನ ಮತ್ತು ಮಠ ಪ್ರದೇಶದಲ್ಲಿ ಏಕಬಳಕೆ ಪ್ಲಾಸ್ಟಿಕ್ ನಿಷೇಧ.",
                "ಪವಿತ್ರ ಪ್ರಾಂಗಣದಲ್ಲಿ ಪ್ಲಾಸ್ಟಿಕ್ ಕವರ್ ತಿಂಡಿ ಬೇಡ.",
                "ಪಟ್ಟಣ ಮತ್ತು ನದಿ ರಸ್ತೆಯಲ್ಲಿ ವೇಗ ಮಿತಿ ಪಾಲಿಸಿ.",
                "ಪೀಠ ಸುತ್ತಲೂ ಮಾದಕ, ಮದ್ಯ, ಧೂಮಪಾನ ನಿಷೇಧ.",
            ],
            "faqs": [
                {
                    "q": "ಶಾರದಾಂಬೆಯ ಜೊತೆ ಇನ್ನೇನು ನೋಡಬೇಕು?",
                    "a": "ವಿದ್ಯಾಶಂಕರ ದೇವಸ್ಥಾನ ಪೀಠದ ಪಕ್ಕದಲ್ಲಿದೆ. ಸಿರಿಮನೆ ಜಲಪಾತ ಮತ್ತು ಕಿಗ್ಗ ದಿನದ ಪ್ರವಾಸಕ್ಕೆ ಜನಪ್ರಿಯ.",
                },
                {
                    "q": "ಅಧಿಕೃತ ವೆಬ್‌ಸೈಟ್ ಉಂಟೇ?",
                    "a": "ಹೌದು — sringeri.net ದರ್ಶನ/ಸೇವೆ ಮಾಹಿತಿ ಪ್ರಕಟಿಸುತ್ತದೆ. ಮೂರನೇ ವ್ಯಕ್ತಿ ಹೇಳಿಕೆಗಿಂತ ಅದನ್ನೇ ನಂಬಿ.",
                },
                {
                    "q": "ಚಿಕ್ಕಮಗಳೂರಿನಿಂದ ಎಷ್ಟು ದೂರ?",
                    "a": "ಸುಮಾರು ೯೦ ಕಿ.ಮೀ. ದರ್ಶನ ಮತ್ತು ಪಟ್ಟಣ ನಡಿಗೆ ಸೇರಿಸಿ ಅರ್ಧ ದಿನ ಯೋಜಿಸಿ.",
                },
            ],
        },
    },
    {
        "id": "bandaje-falls",
        "taluk": "Mudigere",
        "taluk_kn": "ಮೂಡಿಗೆರೆ",
        "category": "waterfalls",
        "hero": "assets/bandaje-falls.jpg",
        "photos": [
            {"src": "assets/bandaje-falls.jpg", "cap_en": "Bandaje Falls", "cap_kn": "ಬಂಡಾಜೆ ಜಲಪಾತ"},
            {"src": "assets/bandaje-arbi.jpg", "cap_en": "Bandaje Arbi ridge", "cap_kn": "ಬಂಡಾಜೆ ಅರ್ಬಿ ರಿಡ್ಜ್"},
            {"src": "assets/rani-jhari.jpg", "cap_en": "Rani Jhari side", "cap_kn": "ರಾಣಿ ಝರಿ ಭಾಗ"},
            {"src": "assets/charmadi.jpg", "cap_en": "Charmadi ghat country", "cap_kn": "ಚಾರ್ಮಾಡಿ ಘಟ್ಟ"},
            {"src": "assets/kodige-falls.jpg", "cap_en": "Kodige Falls nearby", "cap_kn": "ಹತ್ತಿರದ ಕೊಡಿಗೆ ಜಲಪಾತ"},
        ],
        "maps": "https://www.google.com/maps?q=13.12,75.42",
        "booking": "",
        "en": {
            "name": "Bandaje Falls",
            "kicker": "Mudigere · Trek waterfall near Rani Jhari",
            "history": "Bandaje (Bandajje) Falls near Rani Jhari / Sunkasale is a Western Ghats trek reward — forest trails, streams and a dramatic fall. It is not a casual roadside stop; treat it as a serious day trek with local guidance.",
            "timings": "Start early; plan to return before dark. Monsoon trails can be closed or dangerous — confirm locally.",
            "facilities": {
                "parking": "Limited trailhead parking near approach villages — ask locals.",
                "washrooms": "Not on the trail; use facilities before you start.",
                "hotels": "Base in Mudigere / Charmadi / estate stays — book ahead on weekends.",
                "mitra": "Tourist Mitra / local guides for trail status and permits if any.",
            },
            "conduct": [
                "Single-use plastic ban — pack out everything you bring.",
                "No outside snacks left as litter; no plastic covers on the trail.",
                "Slow driving on Charmadi / SH approach roads.",
                "No drugs, alcohol or smoking on forest trails.",
            ],
            "faqs": [
                {
                    "q": "Is this a short walk?",
                    "a": "No. Expect a proper trek with elevation and stream crossings. Carry water, wear grip shoes, and prefer a local guide.",
                },
                {
                    "q": "Best season?",
                    "a": "Post-monsoon to winter for fuller falls and safer footing. Peak monsoon can make trails unsafe.",
                },
                {
                    "q": "Do I need a permit?",
                    "a": "Rules change with forest season. Confirm with Tourism / local forest contacts before you go.",
                },
            ],
        },
        "kn": {
            "name": "ಬಂಡಾಜೆ ಜಲಪಾತ",
            "kicker": "ಮೂಡಿಗೆರೆ · ರಾಣಿ ಝರಿ ಬಳಿ ಟ್ರೆಕ್ ಜಲಪಾತ",
            "history": "ರಾಣಿ ಝರಿ / ಸುಂಕಸಾಲೆ ಬಳಿಯ ಬಂಡಾಜೆ ಜಲಪಾತ ಪಶ್ಚಿಮ ಘಟ್ಟದ ಟ್ರೆಕ್ ಬಹುಮಾನ — ಕಾಡು ಹಾದಿ, ಹೊಳೆ ಮತ್ತು ವಿಶಾಲ ಜಲಪಾತ. ಸಾಮಾನ್ಯ ರಸ್ತೆಬದಿ ನಿಲುಕು ಅಲ್ಲ; ಸ್ಥಳೀಯ ಮಾರ್ಗದರ್ಶನದೊಂದಿಗೆ ಗಂಭೀರ ದಿನದ ಟ್ರೆಕ್ ಎಂದು ಪರಿಗಣಿಸಿ.",
            "timings": "ಬೇಗ ಪ್ರಾರಂಭಿಸಿ; ಕತ್ತಲೆಗೂ ಮುನ್ನ ಹಿಂತಿರುಗಿ. ಮಳೆಗಾಲದ ಹಾದಿ ಮುಚ್ಚಿರಬಹುದು — ಸ್ಥಳೀಯವಾಗಿ ಖಚಿತಪಡಿಸಿ.",
            "facilities": {
                "parking": "ಮಾರ್ಗಾರಂಭದ ಬಳಿ ಸೀಮಿತ ಪಾರ್ಕಿಂಗ್ — ಸ್ಥಳೀಯರನ್ನು ಕೇಳಿ.",
                "washrooms": "ಹಾದಿಯಲ್ಲಿ ಇಲ್ಲ; ಹೊರಡುವ ಮೊದಲು ಬಳಸಿ.",
                "hotels": "ಮೂಡಿಗೆರೆ/ಚಾರ್ಮಾಡಿ/ಎಸ್ಟೇಟ್ ವಸತಿ — ವಾರಾಂತ್ಯದಲ್ಲಿ ಮುಂಚಿತವಾಗಿ ಕಾದಿರಿಸಿ.",
                "mitra": "ಹಾದಿ/ಅನುಮತಿ ಸ್ಥಿತಿಗೆ ಟೂರಿಸ್ಟ್ ಮಿತ್ರ / ಸ್ಥಳೀಯ ಗೈಡ್.",
            },
            "conduct": [
                "ಏಕಬಳಕೆ ಪ್ಲಾಸ್ಟಿಕ್ ನಿಷೇಧ — ತಂದಿದ್ದನ್ನೂ ಹಿಂದಕ್ಕೆ ತೆಗೆದುಕೊಂಡು ಹೋಗಿ.",
                "ಹಾದಿಯಲ್ಲಿ ತಿಂಡಿ ಕಸ/ಪ್ಲಾಸ್ಟಿಕ್ ಕವರ್ ಬಿಡಬೇಡಿ.",
                "ಚಾರ್ಮಾಡಿ / ರಾಜ್ಯ ಹೆದ್ದಾರಿ ಮಾರ್ಗದಲ್ಲಿ ನಿಧಾನ.",
                "ಅರಣ್ಯ ಹಾದಿಯಲ್ಲಿ ಮಾದಕ, ಮದ್ಯ, ಧೂಮಪಾನ ನಿಷೇಧ.",
            ],
            "faqs": [
                {
                    "q": "ಇದು ಚಿಕ್ಕ ನಡಿಗೆಯೇ?",
                    "a": "ಇಲ್ಲ. ಎತ್ತರ ಮತ್ತು ಹೊಳೆ ದಾಟುವಿಕೆಯಿರುವ ಟ್ರೆಕ್. ನೀರು ತನ್ನಿ, ಹಿಡಿತದ ಶೂ ಧರಿಸಿ, ಸ್ಥಳೀಯ ಗೈಡ್ ಉತ್ತಮ.",
                },
                {
                    "q": "ಯಾವ ಋತು ಉತ್ತಮ?",
                    "a": "ಮಳೆ ನಂತರದಿಂದ ಚಳಿಗಾಲ — ಜಲಪಾತ ತುಂಬಾ, ಹಾದಿ ಸುರಕ್ಷಿತ. ತೀವ್ರ ಮಳೆಯಲ್ಲಿ ಹಾದಿ ಅಪಾಯಕಾರಿ.",
                },
                {
                    "q": "ಅನುಮತಿ ಬೇಕೇ?",
                    "a": "ಅರಣ್ಯ ಋತುವಿನಂತೆ ನಿಯಮ ಬದಲಾಗುತ್ತದೆ. ಹೋಗುವ ಮೊದಲು ಪ್ರವಾಸೋದ್ಯಮ/ಅರಣ್ಯ ಸಂಪರ್ಕ ಖಚಿತಪಡಿಸಿ.",
                },
            ],
        },
    },
]

HELPLINES = [
    {"id": "tourism", "en": "Tourism Department", "kn": "ಪ್ರವಾಸೋದ್ಯಮ ಇಲಾಖೆ", "tel": "08262-220000"},
    {"id": "police", "en": "Police / Highway patrol", "kn": "ಪೊಲೀಸ್ / ಹೆದ್ದಾರಿ ಪಹರೆ", "tel": "08262-220100"},
    {"id": "hospital", "en": "Hospital", "kn": "ಆಸ್ಪತ್ರೆ", "tel": "08262-220200"},
    {"id": "fire", "en": "Fire Station", "kn": "ಅಗ್ನಿಶಾಮಕ", "tel": "08262-220101"},
    {"id": "women", "en": "Women & Child helpline", "kn": "ಮಹಿಳೆ ಮತ್ತು ಮಕ್ಕಳ ಸಹಾಯವಾಣಿ", "tel": "08262-220109"},
    {"id": "local", "en": "Local body", "kn": "ಸ್ಥಳೀಯ ಸಂಸ್ಥೆ", "tel": "08262-220300"},
]


def write_places_json() -> None:
    DIST.mkdir(parents=True, exist_ok=True)
    payload = {
        "meta": {
            "event": "World Tourism Day 2026",
            "theme_en": "Digital Agenda and Artificial Intelligence to Redesign Tourism",
            "theme_kn": "ಪ್ರವಾಸೋದ್ಯಮವನ್ನು ಮರುವಿನ್ಯಾಸಗೊಳಿಸಲು ಡಿಜಿಟಲ್ ಅಜೆಂಡಾ ಮತ್ತು ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ",
            "dept_en": "Chikkamagaluru Tourism Department",
            "dept_kn": "ಚಿಕ್ಕಮಗಳೂರು ಪ್ರವಾಸೋದ್ಯಮ ಇಲಾಖೆ",
            "preview": True,
            "helpline_note_en": "Placeholder numbers using 08262 — replace with official lines before print.",
            "helpline_note_kn": "೦೮೨೬೨ ಸ್ಥಳಧಾರಕ ಸಂಖ್ಯೆಗಳು — ಮುದ್ರಣಕ್ಕೂ ಮುನ್ನ ಅಧಿಕೃತ ಸಂಖ್ಯೆಗಳನ್ನು ಹಾಕಿ.",
        },
        "helplines": HELPLINES,
        "places": PLACES,
    }
    (DIST / "places.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print("wrote places.json", len(PLACES))


def make_qr(url: str, path: Path) -> None:
    qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=12, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0b1a12", back_color="#f4f1e8")
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)


def generate_qrs(base: str) -> None:
    base = base.rstrip("/")
    QR_DIR.mkdir(parents=True, exist_ok=True)
    mapping = {}
    for p in PLACES:
        url = f"{base}/visit.html?id={p['id']}"
        out = QR_DIR / f"{p['id']}.png"
        make_qr(url, out)
        mapping[p["id"]] = {"url": url, "qr": f"qr/{p['id']}.png"}
        print("qr", p["id"], url)
    # hub QR
    hub = f"{base}/index.html"
    make_qr(hub, QR_DIR / "hub.png")
    mapping["hub"] = {"url": hub, "qr": "qr/hub.png"}
    (DIST / "qr-map.json").write_text(json.dumps(mapping, indent=2), encoding="utf-8")


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default=PUBLIC_BASE, help="Public base URL for QR targets")
    args = ap.parse_args()
    write_places_json()
    generate_qrs(args.base)
