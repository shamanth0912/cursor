/* Ask Chikku: page-mascot tiger + district-only answers from this companion. */
(function () {
  "use strict";

  const DIRECTIONS = ["up-left", "up", "up-right", "left", "center", "right", "down-left", "down", "down-right"];
  const REACTIONS = ["blink", "heart", "sparkle", "surprised", "wink", "bashful", "sleepy", "dizzy", "delighted"];
  const CLOCKWISE = ["right", "down-right", "down", "down-left", "left", "up-left", "up", "up-right"];
  const SECTOR = (Math.PI * 2) / CLOCKWISE.length;
  const HYSTERESIS = 0.12;
  const DEAD_ZONE = 32;
  const PAYOFFS = ["heart", "sparkle", "delighted"];
  const CHIPS = ["Mullayanagiri", "Bengaluru distance", "2-day sketch", "Hebbe Falls", "Coffee", "Best months", "Sringeri"];

  const DISTRICT = /\b(chikk?a?ma[gk]alur[ua]?|chikmagalur|chikkamagaluru|chikku)\b/i;
  const FROM_CITY = /\b(bangalore|bengaluru|bangla|bengalooru|mysuru|mysore|mangaluru|mangalore|hubballi|hubli|hassan|kadur)\b/i;
  const REACH = /\b(distance|how far|how long|hours?|km|kilometre|kilometer|drive|reach|route|from|to get there)\b/i;
  const PLAN =
    /\b(itinerary|itinary|itenary|weekend|trip sketch|plan (a |my |our )?trip|\d+\s*[- ]?days?|one[- ]day|two[- ]day|three[- ]day|2[- ]day|3[- ]day)\b/i;
  const ON_TOPIC =
    /\b(chikk?a?ma[gk]alur[ua]?|chikmagalur|chikku|malnad|malanadu|karnataka coffee|baba budan|mullayanagiri|kemman|hebbe|sringeri|horanadu|kudremukh|bhadra|datta peetha|jhari|z[\s-]?point|charmadi|ayyanakere|hirekolale|kalasa|koppa|mudigere|kadur|tarikere|nr[\s.]?pura|ajjampura|western ghats|ghat|waterfall|temple|peak|trek|hill station|coffee|davara|filter coffee|permit|forest|shola|hoysala|taluk|monsoon|when to (go|visit)|how to (reach|go)|best time|food|neer dosa|akki|pathrode|bangalore|bengaluru|bangla|distance|itinerary|itinary|weekend|trip sketch)\b/i;
  const OFF_TOPIC =
    /\b(python|javascript|react|bitcoin|crypto|stock market|ipl|premier league|netflix|iphone|android|recipe for pasta|capital of france|who is messi|taylor swift|chatgpt prompt|write (me )?code|homework)\b/i;

  const GREET = /^(hi|hello|hey|yo|namaste|namaskara|vanakkam)\b/i;

  function cell(index) {
    const i = Math.max(0, index);
    return `${(i % 3) * 50}% ${Math.floor(i / 3) * 50}%`;
  }

  function wrap(angle) {
    return Math.atan2(Math.sin(angle), Math.cos(angle));
  }

  function fold(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9\u0c80-\u0cff]+/g, " ")
      .trim();
  }

  function tokens(value) {
    return fold(value)
      .split(/\s+/)
      .filter((w) => w && w.length > 2 && !/^(the|and|for|from|with|what|whats|where|when|how|best|tell|about|between)$/.test(w));
  }

  function esc(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function dataReady() {
    if (window.CKM) return Promise.resolve(window.CKM);
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "data.js?v=sage27";
      s.onload = () => resolve(window.CKM);
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function scorePlace(place, qTokens, raw) {
    const hay = fold([place.name, place.kannada, place.id, place.taluk, place.blurb, ...(place.tags || [])].join(" "));
    let score = 0;
    qTokens.forEach((t) => {
      if (hay.includes(t)) score += t.length > 5 ? 3 : 2;
    });
    if (fold(place.name).includes(raw) || fold(place.id.replace(/-/g, " ")).includes(raw)) score += 8;
    return score;
  }

  function placeAnswer(place) {
    const href = `places.html?id=${encodeURIComponent(place.id)}`;
    const bits = [
      `<p><strong>${esc(place.name)}</strong> sits in ${esc(place.taluk)} taluk${place.elevation ? `, ${esc(place.elevation)}` : ""}.</p>`,
      `<p>${esc(place.summary || place.blurb || "")}</p>`,
    ];
    if (place.visit) bits.push(`<p>${esc(place.visit)}</p>`);
    if (place.bestTime) bits.push(`<p>Typical visiting window named here: ${esc(place.bestTime)}. Confirm on the ground.</p>`);
    bits.push(`<p><a href="${esc(href)}">Open this place</a></p>`);
    return bits.join("");
  }

  function blockAnswer(title, items) {
    const rows = (items || [])
      .slice(0, 3)
      .map((item) => `<p><strong>${esc(item.title)}</strong> ${esc(item.text)}</p>`)
      .join("");
    return `<p><strong>${esc(title)}</strong></p>${rows}`;
  }

  function refuse() {
    return {
      refuse: true,
      html: "<p>I only talk about Chikkamagaluru. Ask me about peaks, coffee, temples, falls, food, seasons, or how to reach this district. I will not answer anything outside that.</p>",
    };
  }

  function inDistrict(q, qTokens, ckm) {
    if (OFF_TOPIC.test(q) && !DISTRICT.test(q) && !FROM_CITY.test(q)) return false;
    if (GREET.test(q) || ON_TOPIC.test(q) || DISTRICT.test(q) || PLAN.test(q)) return true;
    if (FROM_CITY.test(q) && REACH.test(q)) return true;
    if ((ckm.destinations || []).some((p) => scorePlace(p, qTokens, fold(q)) >= 4)) return true;
    if ((ckm.malnadFoods || []).some((d) => fold((d.name || "") + " " + (d.id || "")).split(/\s+/).some((t) => qTokens.includes(t)))) return true;
    if (qTokens.length <= 2 && /^(help|hi|hello)$/.test(fold(q))) return true;
    return false;
  }

  function reachAnswer(q, ckm) {
    const access = ckm.essentials && ckm.essentials.access;
    const byRoad = (access && access.items || []).find((item) => /road/i.test(item.title));
    const byRail = (access && access.items || []).find((item) => /rail/i.test(item.title));
    const byAir = (access && access.items || []).find((item) => /air/i.test(item.title));
    const fromBlr = FROM_CITY.test(q) || /\b(distance|how far|bangla|drive)\b/i.test(q);
    if (!fromBlr && !REACH.test(q)) return null;
    return {
      html: [
        "<p>From <strong>Bengaluru</strong> (Bangalore, often said Bangla) to Chikkamagaluru town is about <strong>240 km by road</strong>. This companion quotes around <strong>five and a half hours</strong> via Hassan or Kadur. Ghats, mist and Sunday traffic stretch that. Treat any hour-count as weather-dependent.</p>",
        byRoad ? `<p>${esc(byRoad.text)}</p>` : "",
        byRail ? `<p>${esc(byRail.text)}</p>` : "",
        byAir ? `<p>${esc(byAir.text)}</p>` : "",
        "<p>Mysuru and Mangaluru also have regular buses. There is no airport in the district.</p>",
        '<p><a href="visit.html">Visitor information</a></p>',
      ].join(""),
    };
  }

  function itineraryDays(q) {
    if (/\bweekend\b/i.test(q)) return 2;
    const named = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 };
    const match = String(q).match(/\b(one|two|three|four|five|six|seven|\d+)\s*[- ]?days?\b/i);
    if (match) {
      const n = named[match[1].toLowerCase()] || parseInt(match[1], 10);
      if (n >= 1 && n <= 7) return n;
    }
    if (/\b(2[- ]day|two[- ]day)\b/i.test(q)) return 2;
    if (/\b(3[- ]day|three[- ]day)\b/i.test(q)) return 3;
    if (PLAN.test(q)) return 2;
    return null;
  }

  function circuitText(ckm, id) {
    const row = (ckm.circuits || []).find((c) => c.id === id);
    return row && row.text ? row.text : "";
  }

  function itineraryAnswer(q, ckm) {
    if (!PLAN.test(q)) return null;
    const days = itineraryDays(q) || 2;
    const wantsTemple = /\b(temple|sringeri|horanadu|pilgrim|matha)\b/i.test(q);
    const wantsForest = /\b(trek|forest|kudremukh|hebbe|waterfall|kemman)\b/i.test(q);
    const hills = circuitText(ckm, "coffee-hills");
    const temples = circuitText(ckm, "temple-terrace");
    const forest = circuitText(ckm, "forest-edge");
    const bits = [
      `<p>I do not sell a booked trip. Here is a <strong>${days}-day sketch</strong> from this companion’s circuits. Weather, jeeps and forest gates rewrite it.</p>`,
    ];
    if (days === 1) {
      bits.push(
        "<p><strong>One day.</strong> Give the peaks a morning. <a href=\"places.html?id=mullayanagiri\">Mullayanagiri</a> at first light, then Hirekolale or town coffee before dusk. Do not stack Hebbe, Jhari and Sirimane into the same tired drive.</p>"
      );
    } else {
      bits.push(
        `<p><strong>Day 1 · Coffee hills.</strong> ${esc(hills) || "Mullayanagiri at first light, Baba Budangiri and Jhari only if the jeep track is open."}</p>`
      );
      if (wantsTemple && !wantsForest) {
        bits.push(
          `<p><strong>Day 2 · Temple terrace.</strong> ${esc(temples) || "Sringeri, Horanadu and Kalasa as pilgrimages with dress codes, not selfie stops bolted onto a trek."}</p>`
        );
      } else {
        bits.push(
          "<p><strong>Day 2 · Gardens or one fall, not every corner.</strong> <a href=\"places.html?id=kemmanagundi\">Kemmanagundi</a>, Z Point, and <a href=\"places.html?id=hebbe-falls\">Hebbe</a> if the estate road allows. Hebbe, Jhari and Sirimane sit in different corners of the district. Pick one waterfall day.</p>"
        );
      }
      if (days >= 3) {
        bits.push(
          `<p><strong>Day 3 · ${wantsTemple ? "Forest edge" : "Temple terrace"}.</strong> ${esc(wantsTemple ? forest : temples)}</p>`
        );
      }
      if (days >= 4) {
        bits.push(
          `<p><strong>Day 4 · Forest edge.</strong> ${esc(forest)} Kudremukh and Bhadra need forest-department permission. This is a reminder, not a ticket.</p>`
        );
      }
      if (days >= 5) {
        bits.push(
          "<p><strong>Later days.</strong> Keep them slow: town coffee, a second matha, or weather. Extra days are not for stacking more waterfalls into dusk.</p>"
        );
      }
    }
    bits.push("<p>This companion does not list rooms. For a bed, use official or on-the-ground sources.</p>");
    bits.push('<p><a href="plan.html">Open trip sketches</a> · <a href="visit.html">Visitor notes</a></p>');
    return { html: bits.join("") };
  }

  function answer(raw, ckm) {
    const q = String(raw || "").trim();
    const qTokens = tokens(q);
    if (!q) return { html: "<p>Ask me a Chikkamagaluru question.</p>" };
    if (!inDistrict(q, qTokens, ckm)) return refuse();

    if (GREET.test(q) && qTokens.length < 3) {
      return {
        html: "<p>Namaskara. I am <strong>Chikku</strong>, the companion tiger for this district. Ask about Mullayanagiri, coffee, Hebbe, Sringeri, a 2-day sketch, seasons, or how to reach Chikkamagaluru. I stay on this map.</p>",
      };
    }

    if (/\b(who are you|your name|what are you)\b/i.test(q)) {
      return {
        html: "<p>I am Ask Chikku. I read this independent companion, not a booking desk and not a government counter. I answer only Chikkamagaluru questions.</p>",
      };
    }

    if (/\b(hotel|homestay|resort|book a room|airbnb|stay options)\b/i.test(q)) {
      return {
        html: "<p>This companion does not sell rooms or list homestays. For hill air, read Kemmanagundi on the Hill air page. For a bed, use official or on-the-ground sources, not me.</p><p><a href=\"stay.html\">Open Hill air</a></p>",
      };
    }

    if (/\b(entry fee|ticket price|permit fee)\b/i.test(q)) {
      return {
        html: "<p>I do not quote fees. Permits, jeeps and garden tickets change. Check the district tourism page or the forest counter that day.</p><p><a href=\"visit.html\">Visitor notes</a></p>",
      };
    }

    const plan = itineraryAnswer(q, ckm);
    if (plan) return plan;

    const reach = reachAnswer(q, ckm);
    if (reach && (REACH.test(q) || FROM_CITY.test(q))) return reach;

    const scored = (ckm.destinations || [])
      .map((p) => ({ p, s: scorePlace(p, qTokens, fold(q)) }))
      .filter((row) => row.s >= 4)
      .sort((a, b) => b.s - a.s);
    if (scored[0] && scored[0].s >= 5) {
      return { html: placeAnswer(scored[0].p) };
    }

    if (/\b(coffee|mocha|baba budan|davara|bean to cup|arabica)\b/i.test(q)) {
      return {
        html: "<p>Coffee did not arrive here as a cup. Lore says Baba Budan brought seven Mocha seeds to this ridge. Shade, cherry, roast, filter coffee is the walk this companion tells. Not a shop.</p><p><a href=\"bean-to-cup.html\">Bean to cup</a> · <a href=\"coffee.html\">Coffee chapter</a></p>",
      };
    }

    if (/\b(best time|when to (go|visit)|season|monsoon|winter|weather)\b/i.test(q)) {
      const seasons = ckm.seasons || [];
      const html = seasons
        .slice(0, 4)
        .map((s) => `<p><strong>${esc(s.title)}</strong> (${esc(s.months)}). ${esc(s.text)}</p>`)
        .join("");
      return { html: html || "<p>Winter ridges are the classic window. Confirm weather on the day.</p>" };
    }

    if (/\b(how to (reach|go)|get there|from bangalore|from bengaluru|from bangla|train|airport|ksrtc)\b/i.test(q)) {
      return reachAnswer(q, ckm) || { html: '<p><a href="visit.html">Visitor information</a></p>' };
    }

    if (/\b(permit|safari|kudremukh|bhadra tiger|forest)\b/i.test(q)) {
      const permits = ckm.essentials && ckm.essentials.permits;
      return { html: blockAnswer(permits ? permits.title : "Permits", permits ? permits.items : []) + '<p><a href="visit.html">Visitor information</a></p>' };
    }

    if (/\b(food|eat|dosa|akki|pathrode|kadubu|cuisine|kitchen)\b/i.test(q)) {
      const dishes = (ckm.malnadFoods || []).slice(0, 4);
      const rows = dishes.map((d) => `<p><strong>${esc(d.name)}</strong>. ${esc((d.story || "").split(". ").slice(0, 2).join(". "))}.</p>`).join("");
      return { html: `<p>Malnad cooking is rice-first, not a restaurant list.</p>${rows}<p><a href="food.html">Food hub</a></p>` };
    }

    if (scored[0]) return { html: placeAnswer(scored[0].p) };

    return {
      html: "<p>That still sounds like this district, but I need a place or a topic I hold: a peak, a fall, a temple, coffee, food, a season, a 2-day sketch, or how to reach Chikkamagaluru.</p>",
    };
  }

  function mount() {
    if (document.getElementById("chikku")) return;
    const root = document.createElement("aside");
    root.id = "chikku";
    root.className = "chikku";
    root.innerHTML = `
      <button class="chikku-scrim" type="button" data-chikku-close aria-label="Close Ask Chikku"></button>
      <div class="chikku-panel" id="chikku-panel" role="dialog" aria-modal="true" aria-labelledby="chikku-title" hidden>
        <div class="chikku-head">
          <div class="chikku-head-copy">
            <span class="chikku-head-face" aria-hidden="true">
              <span class="chikku-sheet is-dir"></span>
            </span>
            <div>
              <h2 id="chikku-title">Ask Chikku</h2>
              <p>Chikkamagaluru only</p>
            </div>
          </div>
          <button class="chikku-x" type="button" data-chikku-close aria-label="Close Ask Chikku">×</button>
        </div>
        <div class="chikku-log" id="chikku-log" aria-live="polite"></div>
        <div class="chikku-composer">
          <div class="chikku-chips" id="chikku-chips"></div>
          <form class="chikku-form" id="chikku-form">
            <label class="sr-only" for="chikku-q">Ask Chikku</label>
            <input id="chikku-q" name="q" type="text" inputmode="search" enterkeyhint="send" maxlength="240" autocomplete="off" autocorrect="off" autocapitalize="sentences" placeholder="Ask about this district…" />
            <button type="submit">Ask</button>
          </form>
        </div>
      </div>
      <div class="chikku-dock">
        <button class="chikku-mascot" type="button" id="chikku-mascot" aria-expanded="false" aria-controls="chikku-panel" aria-label="Boop Chikku, open Ask Chikku">
          <span class="chikku-squash" id="chikku-squash">
            <span class="chikku-sheet is-dir" id="chikku-dir"></span>
            <span class="chikku-sheet is-react" id="chikku-react"></span>
          </span>
        </button>
        <p class="chikku-tag" id="chikku-tag">Chikku</p>
      </div>
    `;
    document.body.appendChild(root);

    const panel = root.querySelector("#chikku-panel");
    const log = root.querySelector("#chikku-log");
    const form = root.querySelector("#chikku-form");
    const input = root.querySelector("#chikku-q");
    const mascot = root.querySelector("#chikku-mascot");
    const dirEl = root.querySelector("#chikku-dir");
    const reactEl = root.querySelector("#chikku-react");
    const squash = root.querySelector("#chikku-squash");
    const chips = root.querySelector("#chikku-chips");

    chips.innerHTML = CHIPS.map((c) => `<button class="chikku-chip" type="button" data-chip="${esc(c)}">${esc(c)}</button>`).join("");

    let direction = "center";
    let reaction = null;
    let sector = -1;
    let pointer = null;
    let open = false;
    let focusTimer = 0;
    const timers = [];
    const boops = { count: 0, at: 0 };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 820px), (hover: none), (pointer: coarse)").matches;
    let lifeTimer = 0;

    function setDir(name) {
      direction = name;
      dirEl.style.backgroundPosition = cell(DIRECTIONS.indexOf(name));
    }
    function setReact(name) {
      reaction = name;
      const on = Boolean(name);
      reactEl.classList.toggle("is-on", on);
      dirEl.classList.toggle("is-off", on);
      reactEl.style.backgroundPosition = cell(REACTIONS.indexOf(name || "blink"));
    }
    setDir("center");
    setReact(null);

    function later(ms, fn) {
      timers.push(window.setTimeout(fn, ms));
    }
    function clearTimers() {
      timers.splice(0).forEach(clearTimeout);
    }

    function boop() {
      clearTimers();
      const now = Date.now();
      boops.count = now - boops.at < 1600 ? boops.count + 1 : 1;
      boops.at = now;
      if (boops.count >= 4) {
        boops.count = 0;
        setReact("dizzy");
        later(1100, () => setReact(null));
      } else {
        setReact("blink");
        later(120, () => setReact(PAYOFFS[(boops.count - 1) % PAYOFFS.length]));
        later(560, () => setReact(null));
      }
      if (!reduced && squash.animate) {
        squash.animate(
          [
            { transform: "scale(1, 1)", easing: "ease-in" },
            { transform: "scale(1.10, 0.86)", offset: 0.18, easing: "ease-out" },
            { transform: "scale(0.95, 1.08)", offset: 0.45 },
            { transform: "scale(1, 1)" },
          ],
          { duration: 420, easing: "linear" }
        );
      }
    }

    function aim() {
      if (!pointer) return;
      const box = mascot.getBoundingClientRect();
      const dx = pointer.x - (box.left + box.width / 2);
      const dy = pointer.y - (box.top + box.height / 2);
      if (Math.hypot(dx, dy) < DEAD_ZONE) {
        sector = -1;
        setDir("center");
        return;
      }
      const angle = Math.atan2(dy, dx);
      if (sector !== -1 && Math.abs(wrap(angle - sector * SECTOR)) < SECTOR / 2 + HYSTERESIS) return;
      sector = (Math.round(angle / SECTOR) + CLOCKWISE.length) % CLOCKWISE.length;
      setDir(CLOCKWISE[sector]);
    }

    function clearTilt() {
      squash.classList.remove("is-tilt-left", "is-tilt-right");
    }

    function scheduleLife(ms, fn) {
      window.clearTimeout(lifeTimer);
      lifeTimer = window.setTimeout(fn, ms);
    }

    function playMobileLife() {
      const acts = [
        () => {
          setReact("blink");
          later(220, () => setReact(null));
        },
        () => setDir("left"),
        () => setDir("center"),
        () => {
          squash.classList.add("is-tilt-left");
          later(640, clearTilt);
        },
        () => setDir("right"),
        () => {
          setReact("wink");
          later(280, () => setReact(null));
        },
        () => setDir("up-left"),
        () => setDir("up-right"),
        () => {
          squash.classList.add("is-tilt-right");
          later(640, clearTilt);
        },
        () => setDir("center"),
        () => {
          setReact("sleepy");
          later(480, () => setReact(null));
        },
        () => setDir("down-left"),
        () => setDir("down-right"),
        () => setDir("center"),
      ];
      let i = 0;
      const tick = () => {
        if (document.hidden) {
          scheduleLife(1800, tick);
          return;
        }
        clearTilt();
        acts[i % acts.length]();
        i += 1;
        scheduleLife(1500 + Math.floor(Math.random() * 1400), tick);
      };
      scheduleLife(500, tick);
    }

    if (!reduced && mobile) {
      playMobileLife();
    } else if (!reduced) {
      window.addEventListener("pointermove", (event) => {
        pointer = { x: event.clientX, y: event.clientY };
        aim();
      }, { passive: true });
    }

    function wrapStreamWords(block) {
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      const spans = [];
      nodes.forEach((node) => {
        const value = node.nodeValue;
        if (!value || !value.trim()) return;
        const parts = value.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part));
            return;
          }
          const s = document.createElement("span");
          s.className = "t-stream-w is-wait";
          s.textContent = part;
          frag.appendChild(s);
          spans.push(s);
        });
        node.parentNode.replaceChild(frag, node);
      });
      return spans;
    }

    function openStreamWord(span) {
      span.classList.remove("is-wait");
      let parent = span.parentElement;
      while (parent && !parent.classList.contains("chikku-msg")) {
        if (parent.tagName === "P") parent.classList.add("is-live");
        parent = parent.parentElement;
      }
      void span.offsetWidth;
      span.classList.add("is-in");
    }

    function streamWords(block, spans) {
      if (!spans.length) return;
      if (reduced) {
        spans.forEach((s) => openStreamWord(s));
        return;
      }
      const gap = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--stream-gap")
      ) || 60;
      (function next(n) {
        if (n >= spans.length) return;
        openStreamWord(spans[n]);
        log.scrollTop = log.scrollHeight;
        window.setTimeout(() => next(n + 1), gap);
      })(0);
    }

    function push(role, html, extra) {
      const div = document.createElement("div");
      div.className = `chikku-msg is-${role}${extra ? ` ${extra}` : ""}`;
      div.innerHTML = html;
      if (role === "bot") {
        div.classList.add("t-stream");
        const spans = wrapStreamWords(div);
        log.appendChild(div);
        streamWords(div, spans);
      } else {
        log.appendChild(div);
      }
      log.scrollTop = log.scrollHeight;
    }

    function pinToViewport() {
      if (!open || !mobile) {
        root.style.top = "";
        root.style.left = "";
        root.style.width = "";
        root.style.height = "";
        root.style.right = "";
        root.style.bottom = "";
        return;
      }
      const vv = window.visualViewport;
      const top = vv ? Math.round(vv.offsetTop) : 0;
      const left = vv ? Math.round(vv.offsetLeft) : 0;
      const height = vv ? Math.round(vv.height) : window.innerHeight;
      const width = vv ? Math.round(vv.width) : window.innerWidth;
      root.style.top = `${top}px`;
      root.style.left = `${left}px`;
      root.style.width = `${width}px`;
      root.style.height = `${height}px`;
      root.style.right = "auto";
      root.style.bottom = "auto";
    }

    function setOpen(next) {
      open = next;
      root.classList.toggle("is-open", open);
      panel.hidden = !open;
      document.documentElement.classList.toggle("chikku-sheet-open", open && mobile);
      mascot.setAttribute("aria-expanded", open ? "true" : "false");
      window.clearTimeout(focusTimer);
      pinToViewport();
      if (open) {
        if (!log.children.length) {
          push(
            "bot",
            "<p>Namaskara. I am <strong>Chikku</strong>. I answer questions about Chikkamagaluru, peaks, coffee, temples, falls, food and how to reach. Nothing else.</p>"
          );
        }
        log.scrollTop = log.scrollHeight;
        focusTimer = window.setTimeout(() => {
          pinToViewport();
          input.focus({ preventScroll: true });
        }, mobile ? 320 : 0);
      }
    }

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", pinToViewport);
      window.visualViewport.addEventListener("scroll", pinToViewport);
    }
    window.addEventListener("resize", pinToViewport);

    async function ask(text) {
      const q = String(text || "").trim();
      if (!q) return;
      push("user", `<p>${esc(q)}</p>`);
      input.value = "";
      try {
        const ckm = await dataReady();
        const out = answer(q, ckm || {});
        push("bot", out.html, out.refuse ? "is-refuse" : "");
        setReact(out.refuse ? "surprised" : "delighted");
        later(700, () => setReact(null));
      } catch (err) {
        push("bot", "<p>I could not open the companion notes just then. Try again.</p>", "is-refuse");
      }
    }

    mascot.addEventListener("click", () => {
      boop();
      setOpen(!open);
    });
    root.querySelector("#chikku-tag").addEventListener("click", () => {
      boop();
      setOpen(true);
    });
    root.querySelectorAll("[data-chikku-close]").forEach((el) => {
      el.addEventListener("click", () => setOpen(false));
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      ask(input.value);
    });
    chips.addEventListener("click", (event) => {
      const chip = event.target.closest("[data-chip]");
      if (chip) ask(chip.getAttribute("data-chip"));
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
