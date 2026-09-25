(function (global) {
  const GEOJSON = "assets/taluks.geojson";
  const VB = { w: 760, h: 820, pad: 36 };
  const SELECTED = "#2C5A38";
  const HOVER = "#C5D8C2";
  const FILL_LO = "#E3EDE2";
  const FILL_HI = "#7FA87C";
  const LABEL_IDLE = "#4A5548";
  const LABEL_ON = "#F4F7F2";
  const LABEL_AT = {
    chikkamagaluru: [75.77, 13.36],
    tarikere: [75.79, 13.70],
    kadur: [76.13, 13.53],
    mudigere: [75.58, 13.07],
    koppa: [75.385, 13.448],
    nrpura: [75.545, 13.675],
    sringeri: [75.225, 13.365],
    kalasa: [75.305, 13.205],
    ajjampura: [76.07, 13.80],
  };
  const MAP_LABEL = {
    chikkamagaluru: "Chikkamagaluru",
    tarikere: "Tarikere",
    kadur: "Kadur",
    mudigere: "Mudigere",
    koppa: "Koppa",
    nrpura: "N.R. Pura",
    sringeri: "Sringeri",
    kalasa: "Kalasa",
    ajjampura: "Ajjampura",
  };
  const LABEL_SIZE = {
    chikkamagaluru: 18,
    tarikere: 18,
    kadur: 18,
    mudigere: 18,
    koppa: 16,
    nrpura: 16,
    sringeri: 16,
    kalasa: 16,
    ajjampura: 17,
  };

  let geoCache = null;

  function listOrder() {
    const preferred = [
      "chikkamagaluru",
      "tarikere",
      "kadur",
      "mudigere",
      "koppa",
      "nrpura",
      "sringeri",
      "kalasa",
      "ajjampura",
    ];
    const byId = Object.fromEntries((global.CKM.taluks || []).map((t) => [t.id, t]));
    return preferred.map((id) => byId[id]).filter(Boolean);
  }

  function loadGeo() {
    if (geoCache) return Promise.resolve(geoCache);
    return fetch(GEOJSON)
      .then((r) => {
        if (!r.ok) throw new Error("Could not load taluk map");
        return r.json();
      })
      .then((json) => {
        geoCache = json;
        return json;
      });
  }

  function walkCoords(feature, fn) {
    const rings = feature.geometry.type === "Polygon" ? feature.geometry.coordinates : feature.geometry.coordinates.flat();
    rings.forEach((ring) => ring.forEach(fn));
  }

  function boundsOf(fc) {
    let minLon = Infinity,
      minLat = Infinity,
      maxLon = -Infinity,
      maxLat = -Infinity;
    fc.features.forEach((f) => {
      walkCoords(f, ([lon, lat]) => {
        if (lon < minLon) minLon = lon;
        if (lat < minLat) minLat = lat;
        if (lon > maxLon) maxLon = lon;
        if (lat > maxLat) maxLat = lat;
      });
    });
    return { minLon, minLat, maxLon, maxLat };
  }

  function expandBounds(b, pad) {
    const lon = (b.maxLon - b.minLon) * pad;
    const lat = (b.maxLat - b.minLat) * pad;
    return {
      minLon: b.minLon - lon,
      minLat: b.minLat - lat,
      maxLon: b.maxLon + lon,
      maxLat: b.maxLat + lat,
    };
  }

  function pinFill(category) {
    const colors = (global.CKMSections && global.CKMSections.CATEGORY_COLOR) || {};
    return colors[category] || "#2F6B3F";
  }

  function project(lon, lat, b) {
    const midLat = ((b.minLat + b.maxLat) / 2) * (Math.PI / 180);
    const xRatio = Math.cos(midLat);
    const usableW = VB.w - VB.pad * 2;
    const usableH = VB.h - VB.pad * 2;
    const dx = (b.maxLon - b.minLon) * xRatio;
    const dy = b.maxLat - b.minLat;
    const scale = Math.min(usableW / dx, usableH / dy);
    const ox = (VB.w - dx * scale) / 2;
    const oy = (VB.h - dy * scale) / 2;
    return [(lon - b.minLon) * xRatio * scale + ox, (b.maxLat - lat) * scale + oy];
  }

  function perpDist(p, a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    if (!len2) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  }

  function simplifyRing(points, epsilon) {
    if (points.length < 8) return points;
    const closed = points[0][0] === points[points.length - 1][0] && points[0][1] === points[points.length - 1][1];
    const line = closed ? points.slice(0, -1) : points.slice();
    function rdp(pts) {
      if (pts.length < 3) return pts;
      const first = pts[0];
      const last = pts[pts.length - 1];
      let maxD = 0;
      let idx = 0;
      for (let i = 1; i < pts.length - 1; i += 1) {
        const d = perpDist(pts[i], first, last);
        if (d > maxD) {
          maxD = d;
          idx = i;
        }
      }
      if (maxD > epsilon) {
        const left = rdp(pts.slice(0, idx + 1));
        const right = rdp(pts.slice(idx));
        return left.slice(0, -1).concat(right);
      }
      return [first, last];
    }
    const simple = rdp(line);
    if (closed) simple.push(simple[0]);
    return simple;
  }

  function ringPath(ring, b) {
    return (
      simplifyRing(ring, 0.0035)
        .map((pt, i) => {
          const [x, y] = project(pt[0], pt[1], b);
          return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(" ") + " Z"
    );
  }

  function featurePath(feature, b) {
    const rings = feature.geometry.type === "Polygon" ? feature.geometry.coordinates : feature.geometry.coordinates.flat();
    return rings.map((ring) => ringPath(ring, b)).join(" ");
  }

  function featureArea(feature) {
    const bb = feature.bbox;
    if (bb) return (bb[2] - bb[0]) * (bb[3] - bb[1]);
    return 0;
  }

  function splitLabel(text) {
    if (text === "Chikkamagaluru") return ["Chikkamagaluru"];
    if (text === "NR Pura" || text === "N.R. Pura") return ["N.R. Pura"];
    if (text.length <= 10 || !text.includes(" ")) return [text];
    const parts = text.split(" ");
    if (parts.length === 2) return parts;
    return [parts.slice(0, -1).join(" "), parts[parts.length - 1]];
  }

  function hexMix(a, b, t) {
    const parse = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const [ar, ag, ab] = parse(a);
    const [br, bg, bb] = parse(b);
    const ch = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
    return `#${ch(ar, br)}${ch(ag, bg)}${ch(ab, bb)}`;
  }

  function countFill(id, max) {
    const n = placesInTaluk(id).length;
    const t = max ? n / max : 0;
    return hexMix(FILL_LO, FILL_HI, t);
  }

  function mount(root, options) {
    if (!root) return null;
    const opts = options || {};
    const state = {
      root,
      selected: opts.selected || opts.focus || "",
      focus: opts.focus || "",
      onSelect: opts.onSelect,
      onActivate: opts.onActivate,
      onPlace: opts.onPlace,
    };

    root.innerHTML = `<p class="map-loading">Drawing the district…</p>`;

    loadGeo()
      .then((fc) => {
        const focusFeature = state.focus ? fc.features.find((f) => f.properties.id === state.focus) : null;
        const b = focusFeature ? expandBounds(boundsOf({ features: [focusFeature] }), 0.22) : boundsOf(fc);
        const features = fc.features.slice().sort((a, c) => featureArea(c) - featureArea(a));
        const max = Math.max(1, ...features.map((f) => placesInTaluk(f.properties.id).length));
        const paths = features
          .map((feature) => {
            const id = feature.properties.id;
            const name = MAP_LABEL[id] || feature.properties.name;
            const d = featurePath(feature, b);
            const focused = !state.focus || id === state.focus;
            const fill = focused ? countFill(id, max) : hexMix(FILL_LO, "#F3F6F1", 0.55);
            const [lx, ly] = project((LABEL_AT[id] || [0, 0])[0], (LABEL_AT[id] || [0, 0])[1], b);
            const size = LABEL_SIZE[id] || 11;
            const n = placesInTaluk(id).length;
            const lines = splitLabel(name);
            const lineH = Math.round(size * 1.15);
            const tspans = lines
              .map((line, i) => `<tspan x="${lx.toFixed(1)}" dy="${i === 0 ? 0 : lineH}">${escapeXml(line)}</tspan>`)
              .join("");
            const countY = ly + lines.length * (lineH * 0.55) + 10;
            const tab = focused && !state.focus ? `tabindex="0" role="button" aria-pressed="false"` : `tabindex="-1"`;
            const countText = "";
            const nameText = state.focus && id !== state.focus ? "" : `<text class="taluk-name" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="${size}">${tspans}</text>`;
            return `
              <g class="taluk-g${focused ? "" : " is-dim"}" data-taluk-shape="${escapeXml(id)}">
                <path d="${d}" fill="${fill}" data-fill="${fill}" ${tab} aria-label="${escapeXml(name)} taluk, ${n} places" />
                ${nameText}
                ${countText}
              </g>`;
          })
          .join("");
        const places = state.focus ? placesInTaluk(state.focus) : [];
        const pins = places
          .map((place, i) => {
            if (place.lng == null || place.lat == null) return "";
            const [x, y] = project(place.lng, place.lat, b);
            const fill = pinFill(place.category);
            const side = i % 2 === 0 ? 1 : -1;
            const lift = (i % 5) * 11;
            const tx = x + side * 14;
            const ty = y - 8 - lift;
            const anchor = side > 0 ? "start" : "end";
            return `
              <g class="place-pin" data-place-pin="${escapeXml(place.id)}">
                <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.2" fill="${fill}" stroke="#fbfaf5" stroke-width="1.4" />
                <text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="${anchor}" font-size="11">${escapeXml(place.name)}</text>
              </g>`;
          })
          .join("");

        root.innerHTML = `
          <div class="map-canvas">
            <svg class="choropleth-svg" viewBox="0 0 ${VB.w} ${VB.h}" aria-label="${state.focus ? "Places in this taluk" : "Chikkamagaluru district, nine taluks"}">
              ${paths}
              ${pins}
            </svg>
            <div class="map-tooltip" data-map-tooltip hidden></div>
          </div>`;

        const tooltip = root.querySelector("[data-map-tooltip]");

        root.querySelectorAll("[data-taluk-shape]").forEach((g) => {
          const path = g.querySelector("path");
          const id = g.getAttribute("data-taluk-shape");
          if (state.focus) return;
          path.addEventListener("click", () => choose(id, true));
          path.addEventListener("mouseenter", (event) => {
            hover(id, true);
            showTip(id, event);
          });
          path.addEventListener("mouseleave", () => {
            hover(id, false);
            hideTip();
          });
          path.addEventListener("mousemove", (event) => showTip(id, event));
          path.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              choose(id, true);
            }
          });
        });

        root.querySelectorAll("[data-place-pin]").forEach((g) => {
          const id = g.getAttribute("data-place-pin");
          g.addEventListener("click", (event) => {
            event.stopPropagation();
            if (typeof state.onPlace === "function") state.onPlace(id);
          });
        });

        function showTip(id, event) {
          const taluk = talukById(id);
          if (!taluk || !tooltip) return;
          const n = placesInTaluk(id).length;
          tooltip.innerHTML = `
            <p class="map-tip-name">${escapeXml(MAP_LABEL[id] || taluk.name)}</p>
            <p class="map-tip-kn">${escapeXml(taluk.kannada || "")}</p>
            <p class="map-tip-meta">${n} place${n === 1 ? "" : "s"}, click to open this taluk</p>
            <p class="map-tip-blurb">${escapeXml(taluk.blurb || "")}</p>`;
          tooltip.hidden = false;
          const canvas = root.querySelector(".map-canvas");
          const box = canvas.getBoundingClientRect();
          let left = event.clientX - box.left + 14;
          let top = event.clientY - box.top + 14;
          if (left + tooltip.offsetWidth > box.width - 8) left = event.clientX - box.left - tooltip.offsetWidth - 12;
          if (top + tooltip.offsetHeight > box.height - 8) top = event.clientY - box.top - tooltip.offsetHeight - 12;
          tooltip.style.left = `${Math.max(8, left)}px`;
          tooltip.style.top = `${Math.max(8, top)}px`;
        }

        function hideTip() {
          if (tooltip) tooltip.hidden = true;
        }

        paint();
      })
      .catch(() => {
        root.innerHTML = `<p class="map-error">The taluk map could not load. Check that <code>assets/taluks.geojson</code> is present.</p>`;
      });

    function paint() {
      root.querySelectorAll("[data-taluk-shape]").forEach((g) => {
        const id = g.getAttribute("data-taluk-shape");
        const on = id === state.selected;
        const path = g.querySelector("path");
        const name = g.querySelector(".taluk-name");
        const count = g.querySelector(".taluk-count");
        const idle = path.getAttribute("data-fill");
        path.setAttribute("fill", on ? SELECTED : idle);
        path.setAttribute("aria-pressed", on ? "true" : "false");
        g.classList.toggle("is-selected", on);
        if (name) name.setAttribute("fill", on ? LABEL_ON : LABEL_IDLE);
        if (count) count.setAttribute("fill", on ? "#B8CDBC" : "#7C7563");
      });
      const selectedG = root.querySelector(`[data-taluk-shape="${CSS.escape(state.selected)}"]`);
      if (selectedG && selectedG.parentNode) selectedG.parentNode.appendChild(selectedG);
    }

    function choose(id, activate) {
      if (!id) return;
      state.selected = id;
      paint();
      if (typeof state.onSelect === "function") state.onSelect(id);
      if (activate && typeof state.onActivate === "function") state.onActivate(id);
    }

    function setSelected(id) {
      state.selected = id || "";
      paint();
    }

    function hover(id, on) {
      const g = root.querySelector(`[data-taluk-shape="${CSS.escape(id)}"]`);
      if (!g || id === state.selected) return;
      const path = g.querySelector("path");
      path.setAttribute("fill", on ? HOVER : path.getAttribute("data-fill"));
    }

    return {
      choose,
      setSelected,
      hover,
      get selected() {
        return state.selected;
      },
    };
  }

  function escapeXml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function placesInTaluk(id) {
    return (global.CKM.destinations || []).filter((p) => p.talukId === id);
  }

  function talukById(id) {
    return (global.CKM.taluks || []).find((t) => t.id === id);
  }

  global.CKMMap = {
    mount,
    listOrder,
    placesInTaluk,
    talukById,
    MAP_LABEL,
    loadGeo,
  };
})(window);
