(function () {
  const STORAGE_LANG = "ckm-lang";
  const PAGE = document.body.getAttribute("data-page") || "home";

  const state = {
    lang: localStorage.getItem(STORAGE_LANG) || "en",
    filter: "all",
    taluk: "all",
    query: "",
    selectedTaluk: "",
    lastFocus: null,
    mapApi: null,
    queryApplied: false,
  };

  function placeById(id) {
    return CKM.destinations.find((p) => p.id === id);
  }

  function toast(message) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.classList.remove("is-open");
    void el.offsetWidth;
    el.classList.add("is-open");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => {
      el.classList.remove("is-open");
    }, 2400);
  }

  function t(key) {
    return CKMSections.t(state.lang, key);
  }

  function applyI18n() {
    document.documentElement.lang = state.lang === "kn" ? "kn" : "en";
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      node.textContent = t(node.getAttribute("data-i18n"));
    });
    const toggle = document.querySelector("[data-lang-toggle]");
    if (toggle) toggle.textContent = t("lang");
  }

  function markNav() {
    document.querySelectorAll("[data-nav]").forEach((link) => {
      const nav = link.getAttribute("data-nav");
      const pageKey =
        PAGE === "coffee"
          ? "stories"
          : PAGE === "beantocup"
            ? "beantocup"
          : PAGE === "food" || PAGE === "nature" || PAGE === "stay" || PAGE === "heritage" || PAGE === "tourism"
            ? "explore"
            : PAGE === "taluk"
              ? "map"
              : PAGE;
      const on = nav === pageKey;
      link.classList.toggle("is-active", on);
      if (on) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function applyQuery() {
    if (state.queryApplied) return;
    state.queryApplied = true;
    const q = new URLSearchParams(location.search);
    if (PAGE === "places") {
      state.jumpTo = q.get("category") || "";
      if (state.jumpTo) state.filter = state.jumpTo;
      state.taluk = q.get("taluk") || "all";
      state.query = q.get("q") || "";
      const id = q.get("id");
      if (id) window.setTimeout(() => openModal(id), 80);
    }
    if (PAGE === "popular") {
      const id = q.get("id");
      if (id) window.setTimeout(() => openModal(id), 80);
    }
    if (PAGE === "map") {
      state.selectedTaluk = "";
    }
    if (PAGE === "taluk") {
      state.selectedTaluk = q.get("id") || "";
    }
  }

  const SEARCH_STOP = new Set(["the", "a", "an", "of", "in", "on", "at", "to", "from", "and", "or", "for", "with"]);
  const SEARCH_INTENT = {
    hill: ["hill-station", "peaks", "viewpoints"],
    mountain: ["peaks"],
    peak: ["peaks"],
    summit: ["peaks"],
    ridge: ["peaks", "treks"],
    waterfall: ["waterfalls"],
    fall: ["waterfalls"],
    cascade: ["waterfalls"],
    temple: ["temples"],
    shrine: ["temples"],
    matha: ["temples"],
    lake: ["lakes"],
    kere: ["lakes"],
    dam: ["dams"],
    reservoir: ["dams"],
    forest: ["wildlife"],
    wildlife: ["wildlife"],
    park: ["wildlife"],
    tiger: ["wildlife"],
    trek: ["treks"],
    hike: ["treks"],
    trail: ["treks"],
    fort: ["forts"],
    coffee: ["heritage"],
    ghat: ["heritage", "viewpoints"],
    viewpoint: ["viewpoints", "peaks"],
    station: ["hill-station"],
  };

  function foldText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9\u0c80-\u0cff]+/g, " ")
      .trim();
  }

  function stemWord(word) {
    if (word.length <= 3) return word;
    if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
    if (word.endsWith("sses")) return word.slice(0, -2);
    if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
    return word;
  }

  function queryTokens(value) {
    return foldText(value)
      .split(/\s+/)
      .filter((word) => word && !SEARCH_STOP.has(word))
      .map(stemWord);
  }

  function categoryLabel(id) {
    const cat = (CKM.categories || []).find((item) => item.id === id);
    return cat ? `${cat.label} ${cat.kn || ""}` : id;
  }

  function intentCategories(token) {
    const ids = new Set(SEARCH_INTENT[token] || []);
    (CKM.categories || []).forEach((cat) => {
      if (cat.id === "all") return;
      const hay = queryTokens(`${cat.id.replace(/-/g, " ")} ${cat.label}`);
      if (hay.includes(token)) ids.add(cat.id);
    });
    return ids;
  }

  function placeHaystack(place) {
    return foldText(
      [
        place.name,
        place.kannada,
        place.taluk,
        place.talukId,
        String(place.id || "").replace(/-/g, " "),
        place.category,
        categoryLabel(place.category),
        ...(place.tags || []),
      ].join(" ")
    );
  }

  function placeMatchesQuery(place, query) {
    const tokens = queryTokens(query);
    if (!tokens.length) return true;
    const hay = placeHaystack(place);
    const hayTokens = queryTokens(hay);
    return tokens.every((token) => {
      if (hay.includes(token) || hayTokens.includes(token)) return true;
      return intentCategories(token).has(place.category);
    });
  }

  function matches(place) {
    if (state.filter !== "all" && place.category !== state.filter) return false;
    if (state.taluk !== "all" && place.talukId !== state.taluk && place.taluk !== state.taluk) return false;
    return placeMatchesQuery(place, state.query);
  }

  function renderPlaces() {
    if (PAGE !== "places") return;
    const root = document.getElementById("place-sections");
    const empty = document.getElementById("place-empty");
    const count = document.getElementById("result-count");
    if (!root) return;
    const list = CKM.destinations.filter(matches);
    root.innerHTML = CKMSections.renderPlaceSections(state.lang, list);
    if (count) count.textContent = String(list.length);
    if (empty) empty.hidden = list.length > 0;
    const searching = Boolean(state.query.trim());
    document.querySelectorAll("[data-jump-category]").forEach((link) => {
      const id = link.getAttribute("data-jump-category");
      const has = list.some((place) => place.category === id);
      const on = state.filter === id || (searching && state.filter === "all" && has);
      link.classList.toggle("is-active", on);
      link.hidden = searching && !has;
    });
    renderTalukContext();
  }

  function driftTheme(place) {
    const cat = place.category || "";
    const tags = (place.tags || []).join(" ");
    if (place.theme === "food" || cat === "food") return "food";
    if (cat === "waterfalls") return "falls";
    if (cat === "peaks" || cat === "hill-station" || cat === "viewpoints" || cat === "treks") return "mountains";
    if (cat === "lakes" || cat === "dams") return "water";
    if (cat === "wildlife") return "wildlife";
    if (place.id === "coffee-hills" || place.id === "coffee-museum" || /\bcoffee\b/.test(tags)) return "food";
    if (cat === "temples" || cat === "forts" || cat === "heritage") return "heritage";
    return "heritage";
  }

  function interleaveDriftItems(places, foods) {
    const order = ["falls", "mountains", "heritage", "food", "water", "wildlife"];
    const buckets = Object.fromEntries(order.map((key) => [key, []]));
    (places || []).forEach((place) => {
      const key = driftTheme(place);
      (buckets[key] || buckets.heritage).push(place);
    });
    (foods || []).forEach((dish) => {
      buckets.food.push({
        id: `food-${dish.id}`,
        theme: "food",
        image: dish.image,
        name: dish.name,
        kannada: dish.kannada,
        blurb: dish.story || dish.kicker || "",
        category: "food",
      });
    });
    const items = [];
    let added = true;
    while (added) {
      added = false;
      order.forEach((key) => {
        if (buckets[key].length) {
          items.push(buckets[key].shift());
          added = true;
        }
      });
    }
    return items;
  }

  function initHomeDrift() {
    if (PAGE !== "home" || !window.CKMDriftWall) return;
    const el = document.querySelector("[data-drift-wall]");
    if (!el) return;
    if (el._ckmDrift) {
      el._ckmDrift.destroy();
      el._ckmDrift = null;
    }
    const stream = interleaveDriftItems(CKM.destinations || [], CKM.malnadFoods || []);
    const items = stream.map((place) => ({
      placeId: place.id,
      openPlace: !String(place.id || "").startsWith("food-"),
      image: place.image,
      title: state.lang === "kn" ? place.kannada : place.name,
      kannada: state.lang === "kn" ? place.name : place.kannada,
      blurb: place.blurb || place.summary || "",
    }));
    if (!items.length) return;
    const stageW = el.clientWidth || window.innerWidth;
    const narrow = window.innerWidth < 720;
    const tileWidth = narrow ? 148 : 200;
    const tileHeight = narrow ? 98 : 132;
    const columns = Math.min(narrow ? 4 : 7, Math.max(narrow ? 3 : 5, Math.ceil(stageW / tileWidth) + 1));
    el._ckmDrift = window.CKMDriftWall.mount(el, {
      items,
      fill: "columns",
      columns,
      tileWidth,
      tileHeight,
      gap: 0,
      radius: 10,
      tilt: narrow ? 10 : 18,
      turn: narrow ? -4 : -11,
      roll: narrow ? 0 : -1,
      perspective: narrow ? 1100 : 980,
      depth: narrow ? 36 : 160,
      speed: 44,
      direction: "up",
      variance: 0.22,
      parallax: narrow ? 0.18 : 0.7,
      pauseOnHover: false,
      lift: narrow ? 28 : 64,
      fade: 0.08,
      dim: 1,
      grayscale: false,
      overlayColor: "transparent",
      scale: narrow ? 1.08 : 1.34,
      shiftX: narrow ? -48 : -220,
      originX: narrow ? "32%" : "22%",
      onOpenPlace(id) {
        openModal(id);
      },
    });
    if (!initHomeDrift.onResize) {
      initHomeDrift.onResize = () => {
        window.clearTimeout(initHomeDrift.resizeTimer);
        initHomeDrift.resizeTimer = window.setTimeout(() => initHomeDrift(), 180);
      };
      window.addEventListener("resize", initHomeDrift.onResize);
    }
  }

  function initHeroSlides() {
    if (PAGE !== "home") return;
    const root = document.querySelector("[data-hero-slides]");
    const slides = root ? Array.from(root.querySelectorAll("img")) : [];
    if (!root || slides.length < 2) return;
    if (prefersReduced()) return;
    let index = 0;
    let timer = 0;
    const HOLD = 2200;
    const FADE = 1200;
    const go = (next) => {
      const cur = slides[index];
      const nxt = slides[next];
      nxt.classList.remove("is-leaving", "is-active");
      void nxt.offsetWidth;
      nxt.classList.add("is-active");
      if (cur !== nxt) {
        cur.classList.remove("is-active");
        cur.classList.add("is-leaving");
        window.setTimeout(() => cur.classList.remove("is-leaving"), FADE);
      }
      index = next;
    };
    const tick = () => go((index + 1) % slides.length);
    const play = () => {
      window.clearInterval(timer);
      timer = window.setInterval(tick, HOLD);
    };
    const pause = () => window.clearInterval(timer);
    play();
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) pause();
      else if (!prefersReduced()) play();
    });
  }

  function initHeroVideo() {
    if (PAGE !== "home") return;
    const hero = document.querySelector(".hero--video");
    const video = hero && hero.querySelector(".hero-video");
    if (!hero || !video) return;
    const play = () => {
      const run = video.play();
      if (run && typeof run.then === "function") {
        run.then(() => hero.classList.add("is-playing")).catch(() => hero.classList.remove("is-playing"));
      }
    };
    const stop = () => {
      video.pause();
      hero.classList.remove("is-playing");
    };
    video.addEventListener("playing", () => hero.classList.add("is-playing"));
    video.addEventListener("error", stop);
    video.querySelector("source")?.addEventListener("error", stop);
    if (prefersReduced()) {
      stop();
      return;
    }
    play();
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) video.pause();
      else if (!prefersReduced()) play();
    });
  }

  function placeCoffeeBeforePopular() {
    if (PAGE !== "home") return;
    const coffee = document.getElementById("bean-to-cup");
    const popular = document.getElementById("popular-places");
    if (!coffee || !popular) return;
    if (popular.previousElementSibling !== coffee) popular.before(coffee);
  }

  function initExploreAccordion() {
    if (PAGE !== "home" || !window.CKMAccordionGallery) return;
    const el = document.querySelector("[data-explore-accordion]");
    if (!el) return;
    if (el._ckmAccordion) {
      el._ckmAccordion.destroy();
      el._ckmAccordion = null;
    }
    const kn = state.lang === "kn";
    const items = (CKM.explore || []).map((item) => ({
      image: item.image,
      link: item.href,
      kicker: kn ? item.labelKn || item.label : item.label,
      title: kn ? item.titleKn || item.title : item.title,
      lede: kn ? item.ledeKn || item.lede : item.lede,
      more: kn ? "ಇನ್ನಷ್ಟು ನೋಡಿ" : "View more",
      alt: kn ? item.titleKn || item.title : item.title,
    }));
    if (!items.length) return;
    el._ckmAccordion = window.CKMAccordionGallery.mount(el, {
      items,
      defaultIndex: 0,
      expandRatio: 0.46,
      trigger: "hover",
      height: window.innerWidth < 720 ? 520 : 430,
      gap: 12,
      radius: 22,
      tilt: 7,
      parallax: 0.45,
      grayscale: false,
      overlayColor: "#0c1f13",
      accentColor: "#c8ae6e",
      textColor: "#fcfbf8",
      label: kn ? "ಚಿಕ್ಕಮಗಳೂರು ಅನ್ವೇಷಣೆ" : "Explore Chikkamagaluru",
    });
  }

  function renderTalukContext() {
    const title = document.getElementById("places-title");
    const kicker = document.getElementById("places-kicker");
    const lead = document.getElementById("places-lead");
    const bar = document.getElementById("places-taluk-bar");
    const mapLink = document.getElementById("places-map-link");
    if (!title) return;
    const taluk = (CKM.taluks || []).find((t) => t.id === state.taluk);
    if (!taluk || state.taluk === "all") {
      if (bar) bar.hidden = true;
      return;
    }
    const name = state.lang === "kn" ? taluk.kannada : taluk.listName || taluk.name;
    if (kicker) kicker.textContent = name;
    title.textContent = `Places in ${name}`;
    if (lead) lead.textContent = taluk.blurb || "";
    if (bar) bar.hidden = false;
    if (mapLink) mapLink.setAttribute("href", `taluk.html?id=${encodeURIComponent(taluk.id)}`);
  }

  function openModal(placeId) {
    const place = placeById(placeId);
    const modal = document.getElementById("place-modal");
    const img = document.getElementById("modal-image");
    const body = document.getElementById("modal-body");
    if (!place || !modal || !img || !body) return;
    state.lastFocus = document.activeElement;
    img.src = place.image;
    img.alt = place.name;
    const sources = (place.sources || [])
      .map((s) => `<a href="${CKMSections.esc(s.url)}" rel="noopener noreferrer">${CKMSections.esc(s.label)}</a>`)
      .join("");
    const extra = (CKM.popularPlaces || []).find((p) => p.id === place.id);
    const hoursBlock = extra
      ? `<div class="visitor-card">
           <h3 class="kicker">Published visitor hours</h3>
           <p><strong>${CKMSections.esc(extra.hours)}</strong></p>
           <p>${CKMSections.esc(extra.hoursDetail)}</p>
           ${
             extra.hoursSource
               ? `<p class="visitor-source"><a href="${CKMSections.esc(extra.hoursSource.url)}" rel="noopener noreferrer">${CKMSections.esc(extra.hoursSource.label)}</a></p>`
               : ""
           }
         </div>
         <h3 class="kicker" style="margin-top:1.1rem">Why travellers stop here</h3>
         <p>${CKMSections.esc(extra.why)}</p>`
      : "";
    body.innerHTML = `
      <p class="kicker">${CKMSections.esc(CKMSections.catLabel(place.category, state.lang))} · ${CKMSections.esc(place.taluk)}${place.elevation ? " · " + CKMSections.esc(place.elevation) : ""}</p>
      <h2 id="modal-title">${CKMSections.esc(place.name)}</h2>
      <p class="kn">${CKMSections.esc(place.kannada)}</p>
      <p>${CKMSections.esc(place.summary)}</p>
      ${hoursBlock}
      <h3 class="kicker" style="margin-top:1.1rem">${t("visit_notes")}</h3>
      <p>${CKMSections.esc(place.visit)}</p>
      <p class="visitor-disclaimer">Public notes only, not a ticket, permit, fee table or live gate status. Confirm on the official page before you go.</p>
      <div class="modal-actions">
        <a class="btn btn-dark" href="taluk.html?id=${encodeURIComponent(place.talukId || "")}#place-${encodeURIComponent(place.id)}">${t("open_map")}</a>
      </div>
      <div class="source-list">${sources}</div>
    `;
    modal.hidden = false;
    modal.classList.add("is-open");
    const panel = modal.querySelector(".modal-panel");
    panel?.classList.remove("is-closing");
    requestAnimationFrame(() => panel?.classList.add("is-open"));
    document.body.style.overflow = "hidden";
    panel?.focus();
  }

  function closeModal() {
    const modal = document.getElementById("place-modal");
    if (!modal || modal.hidden) return;
    const panel = modal.querySelector(".modal-panel");
    panel?.classList.remove("is-open");
    panel?.classList.add("is-closing");
    modal.classList.remove("is-open");
    const closeMs = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--modal-close-dur")) || 150;
    window.setTimeout(() => {
      panel?.classList.remove("is-closing");
      modal.hidden = true;
      document.body.style.overflow = "";
      if (state.lastFocus && typeof state.lastFocus.focus === "function") state.lastFocus.focus();
    }, prefersReduced() ? 0 : closeMs);
  }

  function talukLabel(taluk) {
    if (!taluk) return "";
    if (state.lang === "kn") return taluk.kannada;
    return taluk.listName || taluk.name;
  }

  function updateTalukUi(id) {
    const taluk = CKMMap.talukById(id);
    if (!taluk) return;
    state.selectedTaluk = id;
    const places = CKMMap.placesInTaluk(id);
    const label = talukLabel(taluk);
    const summary = document.getElementById("taluk-summary");
    if (summary) {
      summary.textContent =
        places.length === 0
          ? `${label}, no places in this companion yet. Open the taluk page for the boundary.`
          : `${label}, ${places.length} place${places.length === 1 ? "" : "s"}. Click to open the taluk page.`;
    }
    const metrics = document.getElementById("taluk-metrics");
    if (metrics && window.CKMStatistics) {
      const m = CKMStatistics.talukMetrics(id);
      metrics.hidden = false;
      const cats = m.categories
        .slice(0, 4)
        .map((c) => `${c.label} ${c.count}`)
        .join(" · ");
      const featured = m.featured.map((p) => p.name).join(", ");
      const permit = m.permitCount ? ` ${m.permitCount} permit-noted.` : "";
      metrics.innerHTML = `<p>${m.places.length} documented${cats ? `, ${cats}` : ""}.${permit}</p>${
        featured ? `<p>Featured: ${featured}.</p>` : ""
      }`;
    }
    document.querySelectorAll("[data-select-taluk]").forEach((btn) => {
      const on = btn.getAttribute("data-select-taluk") === id;
      btn.setAttribute("aria-current", on ? "true" : "false");
      btn.closest("li")?.classList.toggle("is-active", on);
    });
    const cta = document.querySelector("[data-map-cta]");
    if (cta) cta.setAttribute("href", `taluk.html?id=${encodeURIComponent(id)}`);
    const browse = document.getElementById("taluk-places-cta");
    if (browse && id) browse.setAttribute("href", `taluk.html?id=${encodeURIComponent(id)}`);
  }

  function initDistrictMap() {
    const root = document.querySelector("[data-map-root]");
    if (!root || !window.CKMMap) return;
    const focus = root.getAttribute("data-focus-taluk") || (PAGE === "taluk" ? state.selectedTaluk : "");
    state.mapApi = CKMMap.mount(root, {
      selected: focus || "",
      focus,
      onSelect: (id) => updateTalukUi(id),
      onActivate: (id) => {
        location.href = `taluk.html?id=${encodeURIComponent(id)}`;
      },
      onPlace: (id) => {
        const target = document.getElementById(`place-${id}`);
        if (target) {
          target.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth", block: "start" });
          return;
        }
        openModal(id);
      },
    });
    if (focus) updateTalukUi(focus);
  }

  function prefersReduced() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function movePill(bar, tab, animate) {
    const pill = bar?.querySelector(".t-tabs-pill");
    if (!pill || !tab) return;
    const apply = () => {
      pill.style.transform = `translateX(${tab.offsetLeft}px)`;
      pill.style.width = `${tab.offsetWidth}px`;
    };
    if (!animate || prefersReduced()) {
      const prev = pill.style.transition;
      pill.style.transition = "none";
      apply();
      void pill.offsetWidth;
      pill.style.transition = prev;
    } else {
      apply();
    }
  }

  function filterPopular() {
    const stack = document.getElementById("popular-stack");
    if (!stack) return;
    const q = (document.getElementById("popular-search")?.value || "").trim().toLowerCase();
    const group =
      document.querySelector("[data-popular-group][aria-selected='true']")?.getAttribute("data-popular-group") || "all";
    let n = 0;
    stack.querySelectorAll("[data-popular-card]").forEach((card) => {
      const g = card.getAttribute("data-popular-group") || "";
      const name = (card.getAttribute("data-name") || "").toLowerCase();
      const hay = `${name} ${g.replace(/-/g, " ")}`;
      const show = (group === "all" || g === group) && (!q || hay.includes(q) || placeMatchesQuery({
        name,
        category: g,
        id: "",
        tags: [g],
      }, q));
      card.hidden = !show;
      card.classList.toggle("is-alt", show && n % 2 === 1);
      if (show) n += 1;
    });
    const empty = document.getElementById("popular-empty");
    if (empty) empty.hidden = n > 0;
    const count = document.querySelector("[data-popular-count]");
    if (count) count.textContent = `${n} popular place${n === 1 ? "" : "s"} in this slice`;
  }

  function selectTab(tab) {
    const bar = tab?.closest("[data-tabs]");
    if (!bar || !tab) return;
    bar.querySelectorAll(".t-tab").forEach((item) => {
      item.setAttribute("aria-selected", item === tab ? "true" : "false");
    });
    movePill(bar, tab, true);
  }

  function initTabs() {
    document.querySelectorAll("[data-tabs]").forEach((bar) => {
      const tabs = [...bar.querySelectorAll(".t-tab")];
      const active = tabs.find((tab) => tab.getAttribute("aria-selected") === "true") || tabs[0];
      requestAnimationFrame(() => movePill(bar, active, false));
    });
    if (!initTabs.bound) {
      initTabs.bound = true;
      window.addEventListener("resize", () => initTabs());
    }
  }

  function initMagnetic() {
    if (prefersReduced() || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    document.querySelectorAll("[data-magnetic]").forEach((btn) => {
      btn.addEventListener("pointermove", (event) => {
        const box = btn.getBoundingClientRect();
        const x = event.clientX - box.left - box.width / 2;
        const y = event.clientY - box.top - box.height / 2;
        btn.style.transform = `translate(${x * 0.22}px, ${y * 0.22}px)`;
      });
      btn.addEventListener("pointerleave", () => {
        btn.style.transform = "";
      });
    });
  }

  function initSpotlight() {
    if (prefersReduced() || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    document.querySelectorAll("[data-spotlight]").forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const box = card.getBoundingClientRect();
        card.style.setProperty("--spot-x", `${((event.clientX - box.left) / box.width) * 100}%`);
        card.style.setProperty("--spot-y", `${((event.clientY - box.top) / box.height) * 100}%`);
      });
    });
  }

  function initMotion() {
    const reduce = prefersReduced();
    initInterestRail();
    initTabs();
    initMagnetic();
    initSpotlight();
    document.querySelectorAll(".reveal-on-scroll").forEach((el) => {
      if (reduce) {
        el.classList.add("is-in");
        return;
      }
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
      );
      io.observe(el);
    });

    document.querySelectorAll("[data-count]").forEach((el) => {
      const target = Number(el.getAttribute("data-count"));
      if (!Number.isFinite(target)) return;
      if (reduce) {
        el.textContent = String(target);
        return;
      }
      const start = performance.now();
      const dur = 880;
      const tick = (now) => {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = String(Math.round(target * eased));
        if (t < 1) requestAnimationFrame(tick);
      };
      el.textContent = "0";
      requestAnimationFrame(tick);
    });

    if (reduce || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    document.querySelectorAll("[data-tilt]").forEach((card) => {
      let glare = card.querySelector(".tilt-glare");
      if (!glare) {
        glare = document.createElement("span");
        glare.className = "tilt-glare";
        glare.setAttribute("aria-hidden", "true");
        card.appendChild(glare);
      }
      card.addEventListener("pointermove", (event) => {
        const box = card.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width;
        const y = (event.clientY - box.top) / box.height;
        card.style.transform = `perspective(920px) rotateX(${(0.5 - y) * 7}deg) rotateY(${(x - 0.5) * 9}deg) translateY(-5px)`;
        glare.style.opacity = "1";
        glare.style.background = `radial-gradient(420px circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.32), transparent 56%)`;
      });
      card.addEventListener("pointerleave", () => {
        card.style.transform = "";
        glare.style.opacity = "0";
      });
    });
  }

  let interestCleanup = null;

  function initInterestRail() {
    if (interestCleanup) {
      interestCleanup();
      interestCleanup = null;
    }
    const rail = document.querySelector("[data-interest-rail]");
    if (!rail) return;
    const track = rail.querySelector(".interest-track");
    const dotsRoot = document.querySelector("[data-interest-dots]");
    const cards = track ? [...track.querySelectorAll("[data-interest-card]")] : [];
    if (!cards.length) return;

    let index = 0;
    let timer = 0;
    let paused = false;
    const dwell = 3000;
    const reduce = prefersReduced();

    if (dotsRoot) {
      dotsRoot.innerHTML = cards
        .map(
          (card, i) =>
            `<button type="button" class="interest-dot" data-interest-dot="${i}" aria-label="${card.querySelector("strong")?.textContent || `Card ${i + 1}`}"></button>`
        )
        .join("");
    }

    function shown() {
      const n = Number.parseFloat(getComputedStyle(track).getPropertyValue("--interest-shown"));
      return Number.isFinite(n) && n > 0 ? n : 3;
    }

    function step() {
      const gap = Number.parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
      return cards[0].getBoundingClientRect().width + gap;
    }

    function mark() {
      cards.forEach((card, i) => {
        const on = i === index;
        card.classList.toggle("is-active", on);
        card.setAttribute("aria-current", on ? "true" : "false");
        const bar = card.querySelector(".interest-progress");
        if (bar) {
          bar.classList.remove("is-running");
          void bar.offsetWidth;
          if (on && !paused && !reduce) bar.classList.add("is-running");
        }
      });
      dotsRoot?.querySelectorAll("[data-interest-dot]").forEach((dot, i) => {
        const on = i === index;
        dot.classList.toggle("is-active", on);
        dot.setAttribute("aria-current", on ? "true" : "false");
      });
    }

    function go(n, instant) {
      const max = Math.max(0, cards.length - shown());
      if (n > max) index = 0;
      else if (n < 0) index = max;
      else index = n;
      const x = index * step();
      track.style.transition = instant || reduce ? "none" : "";
      track.style.transform = `translate3d(-${x}px, 0, 0)`;
      mark();
    }

    function stop() {
      window.clearTimeout(timer);
      timer = 0;
      cards.forEach((card) => card.querySelector(".interest-progress")?.classList.remove("is-running"));
    }

    function play() {
      stop();
      if (reduce || paused || document.hidden) {
        mark();
        return;
      }
      mark();
      timer = window.setTimeout(() => {
        go(index + 1);
        play();
      }, dwell);
    }

    function pause() {
      paused = true;
      stop();
      mark();
    }

    function resume() {
      paused = false;
      play();
    }

    const onPrev = (event) => {
      if (!event.target.closest("[data-interest-prev]")) return;
      event.preventDefault();
      go(index - 1);
      play();
    };
    const onNext = (event) => {
      if (!event.target.closest("[data-interest-next]")) return;
      event.preventDefault();
      go(index + 1);
      play();
    };
    const onDot = (event) => {
      const dot = event.target.closest("[data-interest-dot]");
      if (!dot) return;
      event.preventDefault();
      go(Number(dot.getAttribute("data-interest-dot")) || 0);
      play();
    };
    const onKey = (event) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        go(index + 1);
        play();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(index - 1);
        play();
      }
    };

    const section = rail.closest(".interest-section") || document.getElementById("main");
    section.addEventListener("click", onPrev);
    section.addEventListener("click", onNext);
    dotsRoot?.addEventListener("click", onDot);
    rail.addEventListener("keydown", onKey);
    rail.addEventListener("mouseenter", pause);
    rail.addEventListener("mouseleave", resume);
    rail.addEventListener("focusin", pause);
    rail.addEventListener("focusout", (event) => {
      if (!rail.contains(event.relatedTarget)) resume();
    });
    const onVis = () => (document.hidden ? pause() : resume());
    document.addEventListener("visibilitychange", onVis);

    go(0, true);
    play();
    const onResize = () => go(index, true);
    window.addEventListener("resize", onResize);

    interestCleanup = () => {
      stop();
      section.removeEventListener("click", onPrev);
      section.removeEventListener("click", onNext);
      dotsRoot?.removeEventListener("click", onDot);
      rail.removeEventListener("keydown", onKey);
      rail.removeEventListener("mouseenter", pause);
      rail.removeEventListener("mouseleave", resume);
      rail.removeEventListener("focusin", pause);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", onResize);
    };
  }

  function bindUi() {
    if (bindUi.done) return;
    bindUi.done = true;
    const main = document.getElementById("main");

    main.addEventListener("click", (event) => {
      const explorePrev = event.target.closest("[data-explore-prev]");
      const exploreNext = event.target.closest("[data-explore-next]");
      if (explorePrev || exploreNext) {
        const gallery = document.querySelector("[data-explore-accordion]");
        const api = gallery && gallery._ckmAccordion;
        if (api) {
          if (exploreNext) api.next();
          else api.prev();
        }
        return;
      }
      const popToggle = event.target.closest("[data-pop-toggle]");
      if (popToggle) {
        const card = popToggle.closest(".t-acc, .pop-card");
        const willOpen = card && card.getAttribute("data-open") !== "true";
        document.querySelectorAll(".pop-card.t-acc").forEach((openCard) => {
          if (openCard === card) return;
          openCard.setAttribute("data-open", "false");
          openCard.classList.remove("is-open");
          openCard.querySelector("[data-pop-toggle]")?.setAttribute("aria-expanded", "false");
        });
        if (card) {
          card.setAttribute("data-open", willOpen ? "true" : "false");
          card.classList.toggle("is-open", Boolean(willOpen));
          popToggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
        }
        return;
      }
      const accHead = event.target.closest(".t-acc-head");
      if (accHead) {
        const acc = accHead.closest(".t-acc");
        if (acc) {
          const willOpen = acc.getAttribute("data-open") !== "true";
          acc.setAttribute("data-open", String(willOpen));
          accHead.setAttribute("aria-expanded", String(willOpen));
        }
        return;
      }
      const talukFilter = event.target.closest("[data-taluk]");
      if (talukFilter) {
        event.preventDefault();
        state.taluk = talukFilter.getAttribute("data-taluk");
        if (talukFilter.classList.contains("t-tab")) selectTab(talukFilter);
        document.querySelectorAll("[data-taluk]").forEach((btn) => {
          const on = btn === talukFilter;
          btn.setAttribute("aria-pressed", on ? "true" : "false");
          btn.setAttribute("aria-selected", on ? "true" : "false");
        });
        renderPlaces();
        return;
      }
      const tab = event.target.closest(".t-tab");
      if (tab && tab.closest("[data-tabs]")) {
        selectTab(tab);
        filterPopular();
        return;
      }
      const open = event.target.closest("[data-open-place]");
      if (open) {
        openModal(open.getAttribute("data-open-place"));
        return;
      }
      const jump = event.target.closest("[data-jump-category]");
      if (jump) {
        event.preventDefault();
        const id = jump.getAttribute("data-jump-category");
        state.filter = state.filter === id ? "all" : id;
        renderPlaces();
        const section = document.getElementById(`section-${id}`);
        if (section) {
          section.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth", block: "start" });
        }
        return;
      }
      const selectTaluk = event.target.closest("[data-select-taluk]");
      if (selectTaluk) {
        const id = selectTaluk.getAttribute("data-select-taluk");
        if (selectTaluk.tagName === "A") {
          if (state.mapApi) state.mapApi.choose(id, false);
          return;
        }
        event.preventDefault();
        if (state.mapApi) state.mapApi.choose(id, true);
        else location.href = `taluk.html?id=${encodeURIComponent(id)}`;
        return;
      }
      const seasonBtn = event.target.closest("[data-season-index]");
      if (seasonBtn) {
        CKMSections.renderSeason(Number(seasonBtn.getAttribute("data-season-index")), state.lang);
        initTabs();
        return;
      }
    });

    main.addEventListener("mouseover", (event) => {
      const row = event.target.closest("[data-select-taluk]");
      if (row && state.mapApi) state.mapApi.hover(row.getAttribute("data-select-taluk"), true);
    });
    main.addEventListener("mouseout", (event) => {
      const row = event.target.closest("[data-select-taluk]");
      if (row && state.mapApi) state.mapApi.hover(row.getAttribute("data-select-taluk"), false);
    });

    main.addEventListener("input", (event) => {
      if (event.target.id === "place-search") {
        state.query = event.target.value;
        renderPlaces();
      }
      if (event.target.id === "popular-search") filterPopular();
      if (event.target.id === "season-slider") {
        CKMSections.renderSeason(Number(event.target.value), state.lang);
        initTabs();
      }
    });

    const modal = document.getElementById("place-modal");
    modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-modal]")) closeModal();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeModal();
    });
  }

  function initHeader() {
    if (initHeader.done) return;
    initHeader.done = true;
    const toggle = document.querySelector(".nav-toggle");
    const header = document.querySelector(".site-header");
    toggle?.addEventListener("click", () => {
      const open = header.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    header.querySelectorAll(".site-nav a").forEach((a) => {
      a.addEventListener("click", () => {
        header.classList.remove("is-open");
        toggle?.setAttribute("aria-expanded", "false");
      });
    });
    document.querySelector("[data-lang-toggle]")?.addEventListener("click", () => {
      state.lang = state.lang === "en" ? "kn" : "en";
      localStorage.setItem(STORAGE_LANG, state.lang);
      paint();
    });
  }

  function registerWebMCP() {
    const ctx = document.modelContext || navigator.modelContext;
    if (!ctx || typeof ctx.registerTool !== "function") return;
    const envelope = (text) => ({ content: [{ type: "text", text }] });
    ctx.registerTool({
      name: "search_destinations",
      description: "Search Chikkamagaluru reference destinations by name, taluk, Kannada name or category.",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string", description: "Search text" } },
        required: ["query"],
      },
      execute: async ({ query }) => {
        const q = String(query || "").toLowerCase();
        const hits = CKM.destinations.filter((p) => placeMatchesQuery(p, q));
        return envelope(JSON.stringify(hits.map((p) => ({ id: p.id, name: p.name, taluk: p.taluk, category: p.category })), null, 2));
      },
    });
  }

  function popularDepthItems() {
    return (CKM.popularPlaces || [])
      .filter((item) => item.featured)
      .slice(0, 8)
      .map((item) => {
        const place = (CKM.destinations || []).find((p) => p.id === item.id);
        if (!place) return null;
        return {
          id: place.id,
          image: place.image,
          alt: place.name,
          kicker: item.kicker,
          name: place.name,
          hours: item.hours,
          hoursDetail: item.hoursDetail,
          why: item.why,
          hoursSource: item.hoursSource,
        };
      })
      .filter(Boolean);
  }

  function renderPopDepthNote(item) {
    const note = document.querySelector("[data-pop-depth-note]");
    if (!note || !item) return;
    const src = item.hoursSource || {};
    note.innerHTML = `
      <p class="kicker">${CKMSections.esc(item.kicker || "")}</p>
      <h3>${CKMSections.esc(item.name || "")}</h3>
      <p><span class="pop-hours">${CKMSections.esc(item.hours || "")}</span></p>
      <p>${CKMSections.esc(item.hoursDetail || "")}</p>
      <p class="kicker" style="margin-top:0.9rem">Why people come</p>
      <p>${CKMSections.esc(item.why || "")}</p>
      <p class="pop-source">Hours and access change. Confirm on <a href="${CKMSections.esc(src.url || "#")}" rel="noopener noreferrer">${CKMSections.esc(src.label || "the official page")}</a>, this companion does not list fees.</p>
      <div class="pop-actions">
        <button class="btn btn-dark shine" type="button" data-open-place="${CKMSections.esc(item.id)}" data-magnetic>Open this place</button>
        <a class="btn btn-line t-learn" href="places.html?id=${CKMSections.esc(item.id)}">Go to places</a>
      </div>`;
  }

  function initPopularGallery() {
    const el = document.querySelector("[data-popular-carousel]");
    if (!el || !window.CKMCarousel) return;
    if (el._ckmCarousel && typeof el._ckmCarousel.destroy === "function") {
      el._ckmCarousel.destroy();
    }
    const items = popularDepthItems().map((item) => ({
      ...item,
      title: item.name,
      description: item.hours || "",
      link: `places.html?id=${item.id}`,
    }));
    if (!items.length) return;
    renderPopDepthNote(items[0]);
    el._ckmCarousel = window.CKMCarousel.mount(el, {
      items,
      baseWidth: 380,
      autoplay: true,
      autoplayDelay: 2800,
      pauseOnHover: true,
      loop: true,
      round: false,
      onChange(item) {
        renderPopDepthNote(item);
      },
    });
  }

  function wireBeanStory() {
    if (PAGE !== "beantocup") return;
    const steps = Array.from(document.querySelectorAll("[data-story-step]"));
    const links = Array.from(document.querySelectorAll(".story-film a"));
    if (!steps.length || !links.length) return;
    const setOn = (n) => {
      links.forEach((a) => a.classList.toggle("is-on", a.getAttribute("data-film") === n));
    };
    setOn(steps[0].getAttribute("data-story-step"));
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (vis) setOn(vis.target.getAttribute("data-story-step"));
      },
      { rootMargin: "-32% 0px -48% 0px", threshold: [0.2, 0.45, 0.7] }
    );
    steps.forEach((el) => io.observe(el));
  }

  function paint() {
    const main = document.getElementById("main");
    main.innerHTML = CKMSections.renderPage(PAGE, state.lang);
    applyI18n();
    markNav();
    applyQuery();
    const search = document.getElementById("place-search");
    if (search) search.value = state.query;
    document.querySelectorAll("[data-taluk]").forEach((btn) => {
      const on = btn.getAttribute("data-taluk") === state.taluk;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    renderPlaces();
    initDistrictMap();
    bindUi();
    initHeroSlides();
    initHeroVideo();
    initMotion();
    initPopularGallery();
    initHomeDrift();
    placeCoffeeBeforePopular();
    initExploreAccordion();
    initNumbers();
    wireBeanStory();
    filterPopular();
    if (PAGE === "taluk" && state.selectedTaluk) {
      const taluk = CKMMap.talukById(state.selectedTaluk);
      if (taluk) document.title = `${taluk.listName || taluk.name} · Chikkamagaluru`;
    }
    if (PAGE === "taluk" && location.hash.startsWith("#place-")) {
      window.setTimeout(() => {
        document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth", block: "start" });
      }, 80);
    }
    if (PAGE === "places" && state.jumpTo) {
      window.setTimeout(() => {
        document.getElementById(`section-${state.jumpTo}`)?.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth", block: "start" });
      }, 60);
    }
  }

  function warmupDriftImages() {
    const seen = new Set();
    const add = (src) => {
      if (!src || seen.has(src)) return;
      seen.add(src);
      const img = new Image();
      img.decoding = "async";
      img.src = src;
    };
    (CKM.destinations || []).forEach((place) => add(place.image));
    (CKM.malnadFoods || []).forEach((dish) => add(dish.image));
  }

  function initNumbers() {
    const root = document.getElementById("chikkamagaluru-in-numbers");
    if (!root || !window.CKMNumbers) return;
    CKMNumbers.onTaluk = (id) => {
      if (state.mapApi && typeof state.mapApi.choose === "function") state.mapApi.choose(id, false);
      else updateTalukUi(id);
    };
    CKMNumbers.bind(root);
  }

  function start() {
    if (!window.CKM || !window.CKMSections) return;
    if (PAGE === "home") warmupDriftImages();
    initHeader();
    paint();
    registerWebMCP();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
