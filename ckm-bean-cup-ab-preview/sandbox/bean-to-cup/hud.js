/* Admin HUD, sandbox only. */
(function () {
  "use strict";

  var GROUPS = [
    {
      id: "world",
      title: "World",
      fields: [
        { path: "world.background", label: "Background", type: "color" },
        { path: "world.fogColor", label: "Fog color", type: "color" },
        { path: "world.fogDensity", label: "Fog density", type: "range", min: 0, max: 0.16, step: 0.001 },
        { path: "world.grainOpacity", label: "Grain", type: "range", min: 0, max: 0.2, step: 0.005 },
        { path: "world.vignette", label: "Vignette", type: "range", min: 0, max: 1, step: 0.02 },
        { path: "world.scrollHeightVh", label: "Scroll length (vh)", type: "range", min: 200, max: 1200, step: 10 },
        { path: "world.pixelRatioCap", label: "Pixel ratio cap", type: "range", min: 1, max: 3, step: 0.25, rebuild: true },
      ],
    },
    {
      id: "camera",
      title: "Camera",
      fields: [
        { path: "camera.startX", label: "Start X", type: "range", min: -3, max: 2, step: 0.05 },
        { path: "camera.startY", label: "Start Y", type: "range", min: -1, max: 1.5, step: 0.05 },
        { path: "camera.startZ", label: "Start Z", type: "range", min: 2, max: 16, step: 0.1, rebuild: true },
        { path: "camera.fov", label: "FOV", type: "range", min: 24, max: 80, step: 1 },
        { path: "camera.near", label: "Near", type: "range", min: 0.05, max: 1, step: 0.01 },
        { path: "camera.far", label: "Far", type: "range", min: 40, max: 400, step: 5 },
        { path: "camera.rightBias", label: "Look right (desktop)", type: "range", min: 0, max: 5, step: 0.05 },
        { path: "camera.rightBiasMobile", label: "Look right (mobile)", type: "range", min: 0, max: 4, step: 0.05 },
        { path: "camera.mobileBreakpoint", label: "Mobile breakpoint", type: "range", min: 480, max: 1200, step: 10 },
        { path: "camera.lookY", label: "Look Y", type: "range", min: -1, max: 1.5, step: 0.02 },
        { path: "camera.lookAhead", label: "Look ahead Z", type: "range", min: 2, max: 18, step: 0.1 },
        { path: "camera.weave", label: "Weave", type: "range", min: 0, max: 1, step: 0.01 },
        { path: "camera.lerpPower", label: "Dolly lag", type: "range", min: 0.0001, max: 0.08, step: 0.0001 },
        { path: "camera.pointerX", label: "Pointer X", type: "range", min: 0, max: 1, step: 0.01 },
        { path: "camera.pointerY", label: "Pointer Y", type: "range", min: 0, max: 1, step: 0.01 },
      ],
    },
    {
      id: "motion",
      title: "Motion",
      fields: [
        {
          path: "motion.easing",
          label: "Scroll easing",
          type: "select",
          options: ["linear", "smoothstep", "easeInOutCubic"],
        },
        { path: "motion.gap", label: "Plate spacing Z", type: "range", min: 4, max: 22, step: 0.2, rebuild: true },
        { path: "motion.dollyExtra", label: "Dolly extra", type: "range", min: 0, max: 16, step: 0.1 },
        { path: "motion.plateFloat", label: "Plate float", type: "range", min: 0, max: 0.3, step: 0.005 },
        { path: "motion.shardFloat", label: "Shard float", type: "range", min: 0, max: 0.6, step: 0.01 },
        { path: "motion.beanBob", label: "Particle bob", type: "range", min: 0, max: 0.4, step: 0.01 },
      ],
    },
    {
      id: "focus",
      title: "Focus",
      fields: [
        { path: "focus.ahead", label: "Focus distance", type: "range", min: 2, max: 16, step: 0.1 },
        { path: "focus.range", label: "Focus falloff", type: "range", min: 1, max: 16, step: 0.1 },
        { path: "focus.growAhead", label: "Grow distance", type: "range", min: 2, max: 14, step: 0.1 },
        { path: "focus.growRange", label: "Grow falloff", type: "range", min: 1, max: 12, step: 0.1 },
        { path: "focus.growAmount", label: "Grow amount", type: "range", min: 0, max: 0.5, step: 0.01 },
        { path: "focus.opacityIdle", label: "Idle opacity", type: "range", min: 0, max: 1, step: 0.01 },
        { path: "focus.opacityGain", label: "Focus opacity gain", type: "range", min: 0, max: 1, step: 0.01 },
        { path: "focus.idleDriftX", label: "Unfocused drift X", type: "range", min: 0, max: 1.2, step: 0.02 },
        { path: "focus.rotY", label: "Plate rot Y", type: "range", min: -0.6, max: 0.2, step: 0.01 },
        { path: "focus.rotYIdle", label: "Idle extra rot", type: "range", min: 0, max: 0.4, step: 0.01 },
      ],
    },
    {
      id: "plates",
      title: "Plates",
      fields: [
        { path: "plates.width", label: "Width", type: "range", min: 3, max: 12, step: 0.1, rebuild: true },
        { path: "plates.baseX", label: "Base X (keep right)", type: "range", min: 0.5, max: 5, step: 0.05, rebuild: true },
        { path: "plates.altA", label: "Even offset", type: "range", min: -0.6, max: 0.6, step: 0.02, rebuild: true },
        { path: "plates.altB", label: "Odd offset", type: "range", min: -0.6, max: 0.6, step: 0.02, rebuild: true },
        { path: "plates.baseY", label: "Base Y", type: "range", min: -1, max: 1.2, step: 0.02, rebuild: true },
        { path: "plates.ySine", label: "Y stagger", type: "range", min: 0, max: 0.4, step: 0.01, rebuild: true },
        { path: "plates.rotY", label: "Built rot Y", type: "range", min: -0.5, max: 0.2, step: 0.01, rebuild: true },
        { path: "plates.fallbackShift", label: "2D shift", type: "range", min: 0, max: 0.4, step: 0.01 },
      ],
    },
    {
      id: "shards",
      title: "Shards",
      fields: [
        { path: "shards.enabled", label: "Enabled", type: "toggle", rebuild: true },
        { path: "shards.x", label: "X", type: "range", min: 2, max: 8, step: 0.05 },
        { path: "shards.y", label: "Y", type: "range", min: 0, max: 3, step: 0.02 },
        { path: "shards.zOffset", label: "Z offset", type: "range", min: 0, max: 5, step: 0.1, rebuild: true },
        { path: "shards.scale", label: "Scale", type: "range", min: 0.1, max: 0.8, step: 0.02, rebuild: true },
        { path: "shards.opacity", label: "Opacity", type: "range", min: 0, max: 1, step: 0.01 },
        { path: "shards.rotY", label: "Rot Y", type: "range", min: -1, max: 0, step: 0.02 },
      ],
    },
    {
      id: "particles",
      title: "Particles",
      fields: [
        { path: "particles.enabled", label: "Enabled", type: "toggle", rebuild: true },
        { path: "particles.count", label: "Count", type: "range", min: 0, max: 80, step: 1, rebuild: true },
        { path: "particles.minX", label: "Min X", type: "range", min: 0, max: 4, step: 0.05, rebuild: true },
        { path: "particles.spreadX", label: "Spread X", type: "range", min: 1, max: 10, step: 0.1, rebuild: true },
        { path: "particles.bean", label: "Bean color", type: "color", rebuild: true },
        { path: "particles.cherry", label: "Cherry color", type: "color", rebuild: true },
      ],
    },
    {
      id: "copy",
      title: "Copy rail",
      fields: [
        { path: "copyRail.side", label: "Side", type: "select", options: ["left", "right"] },
        { path: "copyRail.maxWidth", label: "Max width", type: "text" },
        { path: "copyRail.overlayGradient", label: "Gradient", type: "text" },
        { path: "copyRail.passLow", label: "Hold fade low", type: "range", min: 0, max: 0.4, step: 0.01 },
        { path: "copyRail.passHigh", label: "Hold fade high", type: "range", min: 0.5, max: 1, step: 0.01 },
        { path: "copyRail.stageIndexVisible", label: "Frame index", type: "toggle" },
        { path: "copyRail.dotsVisible", label: "Beat dots", type: "toggle" },
        { path: "copyRail.chipsVisible", label: "Act chips", type: "toggle" },
      ],
    },
    {
      id: "nav",
      title: "Navigation",
      fields: [
        { path: "nav.hideOnScroll", label: "Hide header on scroll", type: "toggle" },
        { path: "nav.hideThreshold", label: "Hide after px", type: "range", min: 40, max: 400, step: 10 },
        { path: "nav.jumpSmooth", label: "Smooth jumps", type: "toggle" },
        { path: "nav.actIIIndex", label: "Act II beat index", type: "range", min: 0, max: 14, step: 1 },
      ],
    },
    {
      id: "a11y",
      title: "A11y / debug",
      fields: [
        {
          path: "a11y.reducedMotion",
          label: "Reduced motion",
          type: "select",
          options: ["auto", "force", "off"],
          rebuild: true,
        },
        { path: "debug.force2d", label: "Force 2D fallback", type: "toggle", rebuild: true },
      ],
    },
  ];

  function getPath(obj, path) {
    return path.split(".").reduce(function (o, k) {
      return o ? o[k] : undefined;
    }, obj);
  }
  function setPath(obj, path, val) {
    var parts = path.split(".");
    var cur = obj;
    for (var i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
    cur[parts[parts.length - 1]] = val;
  }
  function fmt(v) {
    if (typeof v === "number") return String(Math.round(v * 1000) / 1000);
    return String(v);
  }

  function mount(cfg) {
    var root = document.getElementById("hud-root");
    if (!root) return;
    root.innerHTML =
      '<button class="hud-toggle" type="button" id="hud-toggle">Admin</button>' +
      '<div class="hud-panel" role="dialog" aria-label="Sandbox admin">' +
      '<div class="hud-head"><strong>Sandbox admin</strong><span class="hud-beat" id="hud-beat">00</span></div>' +
      '<div class="hud-actions">' +
      '<button type="button" id="hud-reset">Reset</button>' +
      '<button type="button" id="hud-export">Export JSON</button>' +
      '<label>Import<input type="file" id="hud-import" accept="application/json" hidden></label>' +
      "</div>" +
      '<div id="hud-body"></div>' +
      '<p class="hud-note">This panel is not on the live site. Tweaks stay in this browser (localStorage). Export JSON when a setting should move into production later.</p>' +
      "</div>";

    var body = document.getElementById("hud-body");
    GROUPS.forEach(function (g) {
      var sec = document.createElement("section");
      sec.className = "hud-section";
      sec.innerHTML = "<h3>" + g.title + "</h3>";
      g.fields.forEach(function (f) {
        var row = document.createElement("div");
        row.className = "hud-row" + (f.type === "text" ? " wide" : "");
        var val = getPath(cfg, f.path);
        var control = "";
        if (f.type === "range") {
          control =
            '<input type="range" data-path="' +
            f.path +
            '" min="' +
            f.min +
            '" max="' +
            f.max +
            '" step="' +
            f.step +
            '" value="' +
            val +
            '"><span class="val">' +
            fmt(val) +
            "</span>";
        } else if (f.type === "color") {
          control = '<input type="color" data-path="' + f.path + '" value="' + val + '">';
        } else if (f.type === "toggle") {
          control = '<input type="checkbox" data-path="' + f.path + '"' + (val ? " checked" : "") + ">";
        } else if (f.type === "select") {
          control =
            "<select data-path=\"" +
            f.path +
            '">' +
            f.options
              .map(function (o) {
                return "<option value=\"" + o + "\"" + (o === val ? " selected" : "") + ">" + o + "</option>";
              })
              .join("") +
            "</select>";
        } else {
          control = '<input type="text" data-path="' + f.path + '" value="' + String(val).replace(/"/g, "&quot;") + '">';
        }
        row.innerHTML = "<label>" + f.label + "</label>" + control;
        if (f.rebuild) row.querySelector("[data-path]").setAttribute("data-rebuild", "1");
        sec.appendChild(row);
      });
      body.appendChild(sec);
    });

    function open(on) {
      root.classList.toggle("open", on);
      document.getElementById("hud-toggle").textContent = on ? "Hide admin" : "Admin";
    }
    open(cfg.debug && cfg.debug.hudOpen !== false);

    document.getElementById("hud-toggle").addEventListener("click", function () {
      open(!root.classList.contains("open"));
    });
    window.addEventListener("keydown", function (e) {
      if (e.key === "h" || e.key === "H") {
        if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT"))
          return;
        open(!root.classList.contains("open"));
      }
    });

    root.addEventListener("input", onChange);
    root.addEventListener("change", onChange);

    function onChange(e) {
      var el = e.target;
      var path = el.getAttribute && el.getAttribute("data-path");
      if (!path) return;
      var next = window.WalkSandbox.get();
      var val;
      if (el.type === "checkbox") val = el.checked;
      else if (el.type === "range" || el.type === "number") val = Number(el.value);
      else val = el.value;
      setPath(next, path, val);
      var span = el.parentElement.querySelector(".val");
      if (span) span.textContent = fmt(val);
      window.WalkSandbox.set(next);
    }

    document.getElementById("hud-reset").addEventListener("click", function () {
      window.WalkSandbox.reset();
    });
    document.getElementById("hud-export").addEventListener("click", function () {
      var blob = new Blob([JSON.stringify(window.WalkSandbox.get(), null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "bean-to-cup.walk.json";
      a.click();
    });
    document.getElementById("hud-import").addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          window.WalkSandbox.rebuild(JSON.parse(reader.result));
        } catch (err) {
          alert("Could not read JSON");
        }
      };
      reader.readAsText(file);
    });
  }

  window.BTCHud = {
    mount: mount,
    sync: function () {},
  };
})();
