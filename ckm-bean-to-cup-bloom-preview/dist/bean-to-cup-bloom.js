/* Bean-to-cup Bloom walk preview — ScrollCraft mount + chapter rail.
   Local preview only. */
(function () {
  "use strict";

  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var worldRoot = document.querySelector(".world");
  var rail = document.querySelector(".wrail");
  var veil = document.querySelector(".wveil");
  var buttons = rail ? Array.prototype.slice.call(rail.querySelectorAll("button[data-stop]")) : [];
  var flashTimer = 0;
  var current = 0;

  function clamp(n, a, b) {
    return n < a ? a : n > b ? b : n;
  }

  function stopTop(i) {
    var api = window.ScrollCraft && window.ScrollCraft.instances[0];
    var W = api && api.worlds && api.worlds[0];
    if (W && W.segs && W.segs[i]) {
      var s = W.segs[i];
      var mid = s.c0 + Math.max(s.w, 0.1) * 0.42;
      return Math.round((W.top || 0) + mid * innerHeight);
    }
    var n = buttons.length || 1;
    var max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    return Math.round((i / Math.max(n - 1, 1)) * max);
  }

  function setCurrent(i, flash) {
    i = clamp(i | 0, 0, Math.max(buttons.length - 1, 0));
    current = i;
    buttons.forEach(function (btn, idx) {
      if (idx === i) btn.setAttribute("aria-current", "step");
      else btn.removeAttribute("aria-current");
    });
    if (rail && flash !== false) {
      rail.setAttribute("data-flash", "true");
      clearTimeout(flashTimer);
      flashTimer = setTimeout(function () {
        rail.removeAttribute("data-flash");
      }, 2200);
    }
  }

  function goTo(i, instant) {
    i = clamp(i | 0, 0, Math.max(buttons.length - 1, 0));
    setCurrent(i, true);
    var top = stopTop(i);
    if (instant || reduce) {
      scrollTo({ top: top, behavior: "instant" });
      return;
    }
    if (veil) {
      veil.setAttribute("data-on", "");
      setTimeout(function () {
        scrollTo({ top: top, behavior: "instant" });
        requestAnimationFrame(function () {
          veil.removeAttribute("data-on");
        });
      }, 180);
    } else {
      scrollTo({ top: top, behavior: "smooth" });
    }
  }

  function onWaypoint(e) {
    var idx = e && e.detail && typeof e.detail.index === "number" ? e.detail.index : -1;
    if (idx < 0) return;
    if (idx !== current) setCurrent(idx, true);
  }

  function syncScrims() {
    var copies = document.querySelectorAll("[data-sc-copy][data-copy-id]");
    for (var i = 0; i < copies.length; i++) {
      var copy = copies[i];
      var id = copy.getAttribute("data-copy-id");
      var scrim = document.querySelector('[data-scrim-for="' + id + '"]');
      if (!scrim) continue;
      var op = parseFloat(getComputedStyle(copy).opacity || "0");
      if (isNaN(op)) op = 0;
      scrim.style.opacity = op.toFixed(3);
    }
    requestAnimationFrame(syncScrims);
  }

  function mount() {
    if (!window.ScrollCraft || !worldRoot) {
      console.warn("[ckm-bloom] ScrollCraft missing");
      return;
    }
    window.ScrollCraft.mount(worldRoot, { lerp: 0.12 });
    document.addEventListener("sc:waypoint", onWaypoint);
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        goTo(parseInt(btn.getAttribute("data-stop") || "0", 10));
      });
    });
    setCurrent(0, true);
    requestAnimationFrame(syncScrims);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
