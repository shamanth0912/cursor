/* Tourism Day QR visit page — EN/KN + Ask this place */
(function () {
  "use strict";

  var params = new URLSearchParams(location.search);
  var id = params.get("id") || "mullayanagiri";
  var lang = localStorage.getItem("ckm-qr-lang") || "en";
  var data = null;
  var place = null;

  var chrome = {
    en: {
      preview: "Preview only · not production",
      back: "All places",
      history: "Brief history",
      photos: "Best photos",
      timings: "Timings",
      facilities: "Basic facilities",
      parking: "Parking",
      wash: "Wash rooms",
      hotels: "Hotels",
      mitra: "Tourist Mitra",
      help: "Helpline numbers",
      helpNote: "Placeholder 08262 lines — replace before print.",
      conduct: "How to behave in the mountains",
      pledge: "I will follow the mountain code on this visit.",
      ask: "Ask this place",
      askBadge: "AI demo · canned answers",
      maps: "Maps",
      call: "Mitra",
      book: "Book",
      share: "Share",
      bookingSoon: "Booking link to be confirmed by Tourism Dept.",
    },
    kn: {
      preview: "ಪೂರ್ವವೀಕ್ಷಣೆ ಮಾತ್ರ · ಉತ್ಪಾದನೆಯಲ್ಲ",
      back: "ಎಲ್ಲಾ ಸ್ಥಳಗಳು",
      history: "ಸಂಕ್ಷಿಪ್ತ ಇತಿಹಾಸ",
      photos: "ಉತ್ತಮ ಛಾಯಾಚಿತ್ರಗಳು",
      timings: "ಸಮಯ",
      facilities: "ಮೂಲ ಸೌಕರ್ಯಗಳು",
      parking: "ಪಾರ್ಕಿಂಗ್",
      wash: "ಶೌಚಾಲಯ",
      hotels: "ಹೋಟೆಲ್‌ಗಳು",
      mitra: "ಟೂರಿಸ್ಟ್ ಮಿತ್ರ",
      help: "ಸಹಾಯವಾಣಿ ಸಂಖ್ಯೆಗಳು",
      helpNote: "ತಾತ್ಕಾಲಿಕ ೦೮೨೬೨ ಸಂಖ್ಯೆಗಳು — ಮುದ್ರಣಕ್ಕೂ ಮುನ್ನ ಬದಲಾಯಿಸಿ.",
      conduct: "ಪರ್ವತದಲ್ಲಿ ಹೇಗೆ ನಡೆದುಕೊಳ್ಳುವುದು",
      pledge: "ಈ ಭೇಟಿಯಲ್ಲಿ ಪರ್ವತ ನಿಯಮಗಳನ್ನು ಪಾಲಿಸುತ್ತೇನೆ.",
      ask: "ಈ ಸ್ಥಳವನ್ನು ಕೇಳಿ",
      askBadge: "AI ಡೆಮೊ · ಸಿದ್ಧ ಉತ್ತರಗಳು",
      maps: "ನಕ್ಷೆ",
      call: "ಮಿತ್ರ",
      book: "ಬುಕ್",
      share: "ಹಂಚು",
      bookingSoon: "ಬುಕಿಂಗ್ ಲಿಂಕ್ ಪ್ರವಾಸೋದ್ಯಮ ಇಲಾಖೆಯಿಂದ ಖಚಿತವಾಗಲಿದೆ.",
    },
  };

  function t() {
    return chrome[lang] || chrome.en;
  }

  function L() {
    return place[lang] || place.en;
  }

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function telHref(num) {
    return "tel:" + String(num).replace(/[^\d+]/g, "");
  }

  function render() {
    if (!place) {
      document.getElementById("app").innerHTML =
        '<p style="padding:2rem;color:#b7c4b8">Place not found. <a href="index.html">Back</a></p>';
      return;
    }
    var C = t();
    var P = L();
    var taluk = lang === "kn" ? place.taluk_kn : place.taluk;
    var mitra = (data.helplines || []).find(function (h) {
      return h.id === "tourism";
    });
    var booking = place.booking
      ? '<a href="' + esc(place.booking) + '" rel="noopener noreferrer" target="_blank"><span class="ico">✦</span>' + C.book + "</a>"
      : '<button type="button" id="book-soon"><span class="ico">✦</span>' + C.book + "</button>";

    var photos = (place.photos || [])
      .map(function (ph) {
        return (
          "<figure><img src=\"" +
          esc(ph.src) +
          '" alt="" loading="lazy" /><figcaption>' +
          esc(lang === "kn" ? ph.cap_kn : ph.cap_en) +
          "</figcaption></figure>"
        );
      })
      .join("");

    var faqs = (P.faqs || [])
      .map(function (f, i) {
        return (
          '<button class="faq" type="button" data-faq="' +
          i +
          '"><div class="q"><span>' +
          esc(f.q) +
          '</span><span class="chev">›</span></div><div class="a">' +
          esc(f.a) +
          "</div></button>"
        );
      })
      .join("");

    var helps = (data.helplines || [])
      .map(function (h) {
        return (
          '<a href="' +
          telHref(h.tel) +
          '"><b>' +
          esc(lang === "kn" ? h.kn : h.en) +
          "</b><span>" +
          esc(h.tel) +
          "</span></a>"
        );
      })
      .join("");

    var conduct = (P.conduct || [])
      .map(function (c) {
        return "<li>" + esc(c) + "</li>";
      })
      .join("");

    document.title = P.name + " · Tourism Day QR";
    document.documentElement.lang = lang === "kn" ? "kn" : "en";

    document.getElementById("app").innerHTML =
      '<div class="preview-pill">' +
      esc(C.preview) +
      "</div>" +
      '<section class="hero">' +
      '<div class="topbar">' +
      '<a href="index.html">' +
      esc(C.back) +
      "</a>" +
      '<button type="button" id="lang-btn">' +
      (lang === "en" ? "ಕನ್ನಡ" : "English") +
      "</button>" +
      "</div>" +
      '<div class="hero-media"><img src="' +
      esc(place.hero) +
      '" alt="" /></div>' +
      '<div class="hero-scrim"></div>' +
      '<div class="hero-copy">' +
      '<div class="meta"><span class="chip gold">' +
      esc(taluk) +
      '</span><span class="chip">' +
      esc(place.category) +
      "</span></div>" +
      "<h1>" +
      esc(P.name) +
      "</h1>" +
      '<p class="kicker">' +
      esc(P.kicker) +
      "</p>" +
      "</div></section>" +
      '<section class="panel"><h2>' +
      esc(C.history) +
      "</h2><p>" +
      esc(P.history) +
      "</p></section>" +
      "<h2 class=\"panel\" style=\"margin-bottom:0.5rem;padding-bottom:0;border:0;background:transparent\">" +
      esc(C.photos) +
      "</h2>" +
      '<div class="photo-rail">' +
      photos +
      "</div>" +
      '<section class="panel"><h2>' +
      esc(C.timings) +
      "</h2><p>" +
      esc(P.timings) +
      "</p></section>" +
      '<section class="panel"><h2>' +
      esc(C.facilities) +
      '</h2><div class="facility-grid">' +
      fac("🅿", C.parking, P.facilities.parking) +
      fac("🚻", C.wash, P.facilities.washrooms) +
      fac("🏨", C.hotels, P.facilities.hotels) +
      fac("🤝", C.mitra, P.facilities.mitra) +
      "</div></section>" +
      '<section class="panel ask"><div class="ai-badge">◎ ' +
      esc(C.askBadge) +
      "</div><h2>" +
      esc(C.ask) +
      "</h2>" +
      faqs +
      "</section>" +
      '<section class="panel"><h2>' +
      esc(C.help) +
      '</h2><p style="margin-bottom:0.7rem">' +
      esc(C.helpNote) +
      '</p><div class="help-list">' +
      helps +
      "</div></section>" +
      '<section class="panel conduct"><h2>' +
      esc(C.conduct) +
      "</h2><ol>" +
      conduct +
      '</ol><label class="pledge"><input type="checkbox" id="pledge" /> <span>' +
      esc(C.pledge) +
      "</span></label></section>" +
      '<p class="foot-mini">Chikkamagaluru Tourism · WTD 2026 QR demo</p>' +
      '<nav class="sticky-actions" aria-label="Quick actions">' +
      '<a class="primary" href="' +
      esc(place.maps) +
      '" target="_blank" rel="noopener noreferrer"><span class="ico">⌖</span>' +
      C.maps +
      "</a>" +
      '<a href="' +
      telHref(mitra ? mitra.tel : "08262-220000") +
      '"><span class="ico">☎</span>' +
      C.call +
      "</a>" +
      booking +
      '<button type="button" id="share-btn"><span class="ico">⤴</span>' +
      C.share +
      "</button>" +
      "</nav>";

    document.getElementById("lang-btn").addEventListener("click", function () {
      lang = lang === "en" ? "kn" : "en";
      localStorage.setItem("ckm-qr-lang", lang);
      render();
    });

    document.querySelectorAll(".faq").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var open = btn.hasAttribute("open");
        document.querySelectorAll(".faq").forEach(function (b) {
          b.removeAttribute("open");
        });
        if (!open) btn.setAttribute("open", "");
      });
    });

    var bookSoon = document.getElementById("book-soon");
    if (bookSoon) {
      bookSoon.addEventListener("click", function () {
        alert(C.bookingSoon);
      });
    }

    document.getElementById("share-btn").addEventListener("click", function () {
      var shareData = {
        title: P.name,
        text: P.kicker,
        url: location.href,
      };
      if (navigator.share) navigator.share(shareData).catch(function () {});
      else if (navigator.clipboard) {
        navigator.clipboard.writeText(location.href);
        alert(lang === "kn" ? "ಲಿಂಕ್ ನಕಲಿಸಲಾಗಿದೆ" : "Link copied");
      }
    });
  }

  function fac(icon, title, body) {
    return (
      '<div class="facility"><div class="dot" aria-hidden="true">' +
      icon +
      "</div><div><strong>" +
      esc(title) +
      "</strong><span>" +
      esc(body) +
      "</span></div></div>"
    );
  }

  fetch("places.json")
    .then(function (r) {
      return r.json();
    })
    .then(function (j) {
      data = j;
      place = (j.places || []).find(function (p) {
        return p.id === id;
      });
      render();
    })
    .catch(function (e) {
      document.getElementById("app").innerHTML =
        '<p style="padding:2rem;color:#c45a4a">Failed to load places.json</p>';
      console.error(e);
    });
})();
