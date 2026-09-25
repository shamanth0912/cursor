/* Three ridges trip sketch — routes & itinerary only. No stays / budget.
   Preview module for Chikku. EN only. */
(function (global) {
  "use strict";

  var RIDGES = [
    {
      id: "cloud",
      title: "Cloud line",
      blurb: "Peaks, viewpoints, mist ridges",
      cats: ["peaks", "viewpoints", "hill-station"],
      seed: ["mullayanagiri", "baba-budangiri", "seethalayyanagiri", "kemmanagundi", "z-point", "devaramane-viewpoint", "galikere"],
    },
    {
      id: "water",
      title: "Water & shade",
      blurb: "Falls, lakes, forest edge",
      cats: ["waterfalls", "lakes", "dams", "wildlife"],
      seed: ["jhari-falls", "hebbe-falls", "hirekolale", "ayyanakere", "manikyadhara", "sirimane-falls", "bandaje-falls", "bhadra-wls"],
    },
    {
      id: "peetha",
      title: "Peetha & prayer",
      blurb: "Mathas, temples, stone",
      cats: ["temples", "heritage", "forts"],
      seed: ["sringeri", "horanadu", "kalasa", "belavadi", "vidyashankara", "amruthapura", "ballalarayana-durga"],
    },
  ];

  var PACE = {
    soft: { stops: 2, label: "Soft mornings" },
    full: { stops: 3, label: "Full days" },
    trek: { stops: 2, label: "Trek-ready" },
  };

  var PERMIT_IDS = {
    "kudremukh-np": true,
    "kudremukh-peak": true,
    "bhadra-wls": true,
    "hebbe-falls": true,
  };

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function byId(ckm) {
    var map = {};
    (ckm.destinations || []).forEach(function (p) {
      map[p.id] = p;
    });
    return map;
  }

  function haversine(a, b) {
    if (!a || !b || a.lat == null || b.lat == null) return 999;
    var R = 6371;
    var dLat = ((b.lat - a.lat) * Math.PI) / 180;
    var dLng = ((b.lng - a.lng) * Math.PI) / 180;
    var la1 = (a.lat * Math.PI) / 180;
    var la2 = (b.lat * Math.PI) / 180;
    var h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function poolForRidges(ckm, ridgeIds) {
    var map = byId(ckm);
    var selected = RIDGES.filter(function (r) {
      return ridgeIds.indexOf(r.id) >= 0;
    });
    if (!selected.length) selected = RIDGES.slice();
    var pool = [];
    var seen = {};
    selected.forEach(function (ridge) {
      ridge.seed.forEach(function (id) {
        if (map[id] && !seen[id]) {
          seen[id] = true;
          pool.push({ place: map[id], ridge: ridge.id });
        }
      });
      (ckm.destinations || []).forEach(function (p) {
        if (seen[p.id]) return;
        if (ridge.cats.indexOf(p.category) >= 0) {
          seen[p.id] = true;
          pool.push({ place: p, ridge: ridge.id });
        }
      });
    });
    return pool;
  }

  function clusterKey(place) {
    var t = (place.taluk || "District").toLowerCase();
    if (/chikkamagaluru|chikmagalur/.test(t)) return "ckm";
    if (/mudigere|kalasa/.test(t)) return "south-west";
    if (/sringeri|koppa/.test(t)) return "west";
    if (/tarikere|nr|narasimha|ajjampura/.test(t)) return "north";
    if (/kadur/.test(t)) return "east";
    return t.slice(0, 8);
  }

  function pickDayStops(pool, used, count, preferCluster, pace) {
    var candidates = pool.filter(function (row) {
      return !used[row.place.id];
    });
    if (preferCluster) {
      var local = candidates.filter(function (row) {
        return clusterKey(row.place) === preferCluster;
      });
      if (local.length >= Math.min(2, count)) candidates = local.concat(
        candidates.filter(function (row) {
          return clusterKey(row.place) !== preferCluster;
        })
      );
    }
    if (pace === "trek") {
      candidates.sort(function (a, b) {
        var at = (a.place.tags || []).join(" ");
        var bt = (b.place.tags || []).join(" ");
        return (/trek|peak|waterfall/.test(bt) ? 1 : 0) - (/trek|peak|waterfall/.test(at) ? 1 : 0);
      });
    }
    var picked = [];
    var anchor = null;
    for (var i = 0; i < candidates.length && picked.length < count; i++) {
      var row = candidates[i];
      if (anchor && haversine(anchor, row.place) > 95 && picked.length) continue;
      picked.push(row);
      used[row.place.id] = true;
      if (!anchor) anchor = row.place;
    }
    // fill if thin
    for (var j = 0; j < candidates.length && picked.length < count; j++) {
      var row2 = candidates[j];
      if (used[row2.place.id]) continue;
      picked.push(row2);
      used[row2.place.id] = true;
    }
    return picked;
  }

  function dayTitle(dayIndex, ridgeHint) {
    var titles = {
      cloud: ["Ridge light", "Above the mist", "Summit air", "Grass & cloud", "Last look up"],
      water: ["Water country", "Falls & shade", "Lake pause", "Forest water", "Slow water"],
      peetha: ["Temple terrace", "Along the Tunga", "Stone & prayer", "Matha day", "Quiet peetha"],
      mix: ["Coffee hills", "Across the district", "Two corners, carefully", "Slow Malnad", "Weather room"],
    };
    var key = ridgeHint || "mix";
    var list = titles[key] || titles.mix;
    return list[Math.min(dayIndex, list.length - 1)];
  }

  function build(prefs, ckm) {
    var days = Math.max(1, Math.min(5, parseInt(prefs.days, 10) || 2));
    var pace = PACE[prefs.pace] ? prefs.pace : "full";
    var ridges = (prefs.ridges || []).filter(Boolean);
    if (!ridges.length) ridges = ["cloud"];
    var pool = poolForRidges(ckm, ridges);
    var used = {};
    var itinerary = [];
    var stopsPerDay = PACE[pace].stops;

    // Prefer starting in Chikkamagaluru cluster on day 1
    for (var d = 0; d < days; d++) {
      var ridgeHint = ridges[d % ridges.length];
      var prefer = d === 0 ? "ckm" : null;
      if (ridgeHint === "peetha" && d > 0) prefer = "west";
      if (ridgeHint === "water" && d > 0) prefer = d % 2 ? "north" : "south-west";
      var stops = pickDayStops(pool, used, stopsPerDay, prefer, pace);
      // if peetha day and empty, force west temple seeds
      if (!stops.length) {
        stops = pickDayStops(pool, used, stopsPerDay, null, pace);
      }
      var notes = [];
      var clusters = {};
      stops.forEach(function (s) {
        clusters[clusterKey(s.place)] = true;
        if (PERMIT_IDS[s.place.id]) {
          notes.push("Forest / estate permission may apply for " + s.place.name + " — confirm on the ground.");
        }
      });
      if (Object.keys(clusters).length > 1) {
        notes.push("These stops sit in different corners. Leave buffer for mist and ghat traffic — do not chase dusk.");
      }
      if (pace === "soft") {
        notes.push("Soft pace: keep an open afternoon if the ridge clouds in.");
      }
      itinerary.push({
        day: d + 1,
        title: dayTitle(d, ridges.length === 1 ? ridges[0] : ridgeHint),
        ridge: ridgeHint,
        stops: stops.map(function (s) {
          return {
            id: s.place.id,
            name: s.place.name,
            taluk: s.place.taluk,
            category: s.place.category,
            blurb: s.place.blurb || "",
            image: (s.place.image || "").replace(/\?.*$/, ""),
            href: "places.html?id=" + encodeURIComponent(s.place.id),
          };
        }),
        notes: notes,
      });
    }

    return {
      days: days,
      pace: pace,
      paceLabel: PACE[pace].label,
      ridges: ridges,
      ridgeLabels: ridges.map(function (id) {
        var r = RIDGES.find(function (x) {
          return x.id === id;
        });
        return r ? r.title : id;
      }),
      itinerary: itinerary,
      disclaimer: "This companion does not list beds, quote budgets, or take property enquiries. Weather and forest gates rewrite every sketch.",
    };
  }

  function renderCard(sketch) {
    var beads = sketch.itinerary
      .map(function (day, i) {
        return (
          '<span class="ts-bead' +
          (i === 0 ? " is-on" : "") +
          '" data-day="' +
          day.day +
          '"><b>D' +
          day.day +
          "</b></span>"
        );
      })
      .join('<span class="ts-rail" aria-hidden="true"></span>');

    var daysHtml = sketch.itinerary
      .map(function (day) {
        var stops = day.stops
          .map(function (s, idx) {
            var when = idx === 0 ? "Morning" : idx === 1 ? "Midday" : "Later";
            return (
              '<a class="ts-stop" href="' +
              esc(s.href) +
              '">' +
              (s.image
                ? '<img src="' + esc(s.image) + '" alt="" loading="lazy" />'
                : '<span class="ts-ph"></span>') +
              "<div><em>" +
              esc(when) +
              "</em><strong>" +
              esc(s.name) +
              "</strong><span>" +
              esc(s.taluk) +
              " · " +
              esc(s.category) +
              "</span></div></a>"
            );
          })
          .join("");
        var notes = (day.notes || [])
          .map(function (n) {
            return "<li>" + esc(n) + "</li>";
          })
          .join("");
        return (
          '<article class="ts-day" id="ts-day-' +
          day.day +
          '">' +
          "<header><span>Day " +
          day.day +
          "</span><h4>" +
          esc(day.title) +
          "</h4></header>" +
          '<div class="ts-stops">' +
          stops +
          "</div>" +
          (notes ? '<ul class="ts-notes">' + notes + "</ul>" : "") +
          "</article>"
        );
      })
      .join("");

    return (
      '<div class="ts-card">' +
      '<p class="ts-kicker">Route sketch · ' +
      esc(String(sketch.days)) +
      " day" +
      (sketch.days > 1 ? "s" : "") +
      " · " +
      esc(sketch.paceLabel) +
      "</p>" +
      "<p class=\"ts-ridges\">Ridges: <strong>" +
      esc(sketch.ridgeLabels.join(" · ")) +
      "</strong></p>" +
      '<div class="ts-ribbon" aria-label="Days">' +
      beads +
      "</div>" +
      daysHtml +
      "<p class=\"ts-disclaimer\">" +
      esc(sketch.disclaimer) +
      "</p>" +
      '<p class="ts-actions"><a href="plan.html">Open Plan page</a> · <a href="visit.html">Visitor notes</a></p>' +
      "</div>"
    );
  }

  function mountIntoChikku(api) {
    var root = api.root;
    var push = api.push;
    var openPanel = api.openPanel;
    var dataReady = api.dataReady;

    var composer = root.querySelector(".chikku-composer");
    if (!composer || root.querySelector(".ts-launch")) return;

    var launch = document.createElement("button");
    launch.type = "button";
    launch.className = "ts-launch";
    launch.id = "ts-launch";
    launch.setAttribute("data-ts-open", "1");
    launch.innerHTML = "<span aria-hidden=\"true\">✦</span> Sketch my route";
    composer.insertBefore(launch, composer.firstChild);

    var sheet = document.createElement("div");
    sheet.className = "ts-sheet";
    sheet.id = "ts-sheet";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-label", "Sketch my route");
    sheet.hidden = true;
    sheet.innerHTML =
      '<div class="ts-sheet-head">' +
      "<div><p class=\"ts-sheet-kicker\">Three ridges</p><h3>Sketch my route</h3></div>" +
      '<button type="button" class="ts-sheet-x" data-ts-close aria-label="Close">×</button>' +
      "</div>" +
      '<p class="ts-sheet-lead">Routes and day beats only. No stays, no budget, no property desk.</p>' +
      '<fieldset class="ts-field">' +
      "<legend>How many days?</legend>" +
      '<div class="ts-seg" data-ts-days>' +
      [1, 2, 3, 4, 5]
        .map(function (n) {
          return (
            '<button type="button" data-days="' +
            n +
            '"' +
            (n === 2 ? ' aria-pressed="true"' : ' aria-pressed="false"') +
            ">" +
            n +
            "</button>"
          );
        })
        .join("") +
      "</div></fieldset>" +
      '<fieldset class="ts-field">' +
      "<legend>What calls you?</legend>" +
      '<div class="ts-ridges-pick" data-ts-ridges>' +
      RIDGES.map(function (r, i) {
        return (
          '<button type="button" data-ridge="' +
          r.id +
          '" aria-pressed="' +
          (i === 0 ? "true" : "false") +
          '"><strong>' +
          esc(r.title) +
          "</strong><span>" +
          esc(r.blurb) +
          "</span></button>"
        );
      }).join("") +
      "</div></fieldset>" +
      '<fieldset class="ts-field">' +
      "<legend>Pace</legend>" +
      '<div class="ts-seg" data-ts-pace>' +
      '<button type="button" data-pace="soft" aria-pressed="false">Soft</button>' +
      '<button type="button" data-pace="full" aria-pressed="true">Full</button>' +
      '<button type="button" data-pace="trek" aria-pressed="false">Trek</button>' +
      "</div></fieldset>" +
      '<button type="button" class="ts-go" id="ts-go">Compose sketch</button>';

    var panel = root.querySelector(".chikku-panel");
    if (panel) panel.appendChild(sheet);

    var state = { days: 2, ridges: ["cloud"], pace: "full" };

    function syncSeg(container, attr, value, multi) {
      container.querySelectorAll("button").forEach(function (btn) {
        var v = btn.getAttribute(attr);
        if (multi) {
          btn.setAttribute("aria-pressed", state.ridges.indexOf(v) >= 0 ? "true" : "false");
        } else {
          btn.setAttribute("aria-pressed", v === String(value) ? "true" : "false");
        }
      });
    }

    function openSheet(event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      openPanel(true);
      sheet.hidden = false;
      sheet.removeAttribute("hidden");
      root.classList.add("ts-open");
      window.setTimeout(function () {
        var go = sheet.querySelector("#ts-go");
        if (go) go.focus({ preventScroll: true });
      }, 40);
    }
    function closeSheet(event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      sheet.hidden = true;
      root.classList.remove("ts-open");
    }

    // Capture-phase so mobile scrim / overlays cannot swallow the open action
    root.addEventListener(
      "click",
      function (event) {
        var openBtn = event.target.closest("[data-ts-open], #ts-launch");
        if (openBtn && root.contains(openBtn)) openSheet(event);
      },
      true
    );
    launch.addEventListener("click", openSheet);
    sheet.querySelector("[data-ts-close]").addEventListener("click", closeSheet);

    sheet.querySelector("[data-ts-days]").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-days]");
      if (!btn) return;
      state.days = parseInt(btn.getAttribute("data-days"), 10);
      syncSeg(sheet.querySelector("[data-ts-days]"), "data-days", state.days, false);
    });
    sheet.querySelector("[data-ts-pace]").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-pace]");
      if (!btn) return;
      state.pace = btn.getAttribute("data-pace");
      syncSeg(sheet.querySelector("[data-ts-pace]"), "data-pace", state.pace, false);
    });
    sheet.querySelector("[data-ts-ridges]").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-ridge]");
      if (!btn) return;
      var id = btn.getAttribute("data-ridge");
      var i = state.ridges.indexOf(id);
      if (i >= 0) {
        if (state.ridges.length > 1) state.ridges.splice(i, 1);
      } else state.ridges.push(id);
      syncSeg(sheet.querySelector("[data-ts-ridges]"), "data-ridge", null, true);
    });

    sheet.querySelector("#ts-go").addEventListener("click", async function () {
      try {
        var ckm = await dataReady();
        var sketch = build(state, ckm || {});
        closeSheet();
        push("user", "<p>Sketch my route — " + esc(String(state.days)) + " day(s), " + esc(state.ridges.join(", ")) + ", " + esc(state.pace) + ".</p>");
        push("bot", renderCard(sketch));
      } catch (err) {
        push("bot", "<p>I could not compose the sketch just then. Try again.</p>", "is-refuse");
      }
    });

    function maybeHashOpen() {
      var hash = String(location.hash || "").toLowerCase();
      if (hash === "#sketch" || hash === "#trip-sketch" || hash === "#route") {
        openSheet();
      }
    }
    maybeHashOpen();
    window.addEventListener("hashchange", maybeHashOpen);
  }

  global.CKMTripSketch = {
    RIDGES: RIDGES,
    build: build,
    renderCard: renderCard,
    mountIntoChikku: mountIntoChikku,
  };
})(window);
