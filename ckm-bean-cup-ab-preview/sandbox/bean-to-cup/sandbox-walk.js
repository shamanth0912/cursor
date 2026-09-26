/* Sandbox player. Reads window.BTC and live-applies HUD changes. Not used by the public site. */
(function () {
  "use strict";

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }
  function hexNum(h) {
    return parseInt(String(h).replace("#", ""), 16);
  }
  function ease(t, kind) {
    t = Math.min(1, Math.max(0, t));
    if (kind === "smoothstep") return t * t * (3 - 2 * t);
    if (kind === "easeInOutCubic") return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    return t;
  }

  var STORAGE_LANG = "ckm-lang";
  var STORAGE_CFG = "btc-sandbox-cfg";
  var CFG = clone(window.BTC_DEFAULTS);
  try {
    var saved = localStorage.getItem(STORAGE_CFG);
    if (saved) {
      var parsed = JSON.parse(saved);
      CFG = deepMerge(clone(window.BTC_DEFAULTS), parsed);
    }
  } catch (e) {}

  var BEATS = window.BTC_BEATS;
  var UI = window.BTC_UI;
  var lang = localStorage.getItem(STORAGE_LANG) || "en";
  var frames = [];
  var painted = -1;
  var canvas;
  var ctx;
  var world = null;
  var scrollT = 0;
  var pointer = { x: 0, y: 0 };
  var running = true;

  function deepMerge(a, b) {
    if (!b) return a;
    Object.keys(b).forEach(function (k) {
      if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k])) a[k] = deepMerge(a[k] || {}, b[k]);
      else a[k] = b[k];
    });
    return a;
  }

  function reducedNow() {
    if (CFG.a11y.reducedMotion === "force") return true;
    if (CFG.a11y.reducedMotion === "off") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }
  function pack() {
    return lang === "kn" ? "kn" : "en";
  }
  function copyOf(beat) {
    return beat[pack()] || beat.en;
  }

  function applyChrome() {
    var w = CFG.world;
    var rail = CFG.copyRail;
    document.documentElement.style.setProperty("--ink", w.background);
    document.body.style.background = w.background;
    var spacer = $(".reel-spacer");
    if (spacer) spacer.style.height = w.scrollHeightVh + "vh";
    var grain = $("#grain");
    if (grain) grain.style.opacity = String(w.grainOpacity);
    var vig = $("#vignette");
    if (vig) {
      vig.style.background =
        "radial-gradient(120% 90% at 50% 42%, transparent 42%, rgba(2,4,6," + w.vignette + ") 100%)";
    }
    var cr = $(".copy-rail");
    if (cr) {
      cr.style.width = rail.maxWidth;
      cr.style.background = rail.overlayGradient;
      if (rail.side === "right") {
        cr.style.left = "auto";
        cr.style.right = "0";
        cr.style.background = rail.overlayGradient.replace("90deg", "270deg");
      } else {
        cr.style.left = "0";
        cr.style.right = "auto";
      }
    }
    var meta = $(".stage-meta");
    if (meta) meta.style.display = rail.stageIndexVisible ? "" : "none";
    var dots = $(".seq-dots");
    if (dots) dots.style.display = rail.dotsVisible ? "" : "none";
    var chips = $(".chips");
    if (chips) chips.style.display = rail.chipsVisible ? "" : "none";
    document.body.classList.toggle("is-2d", !!CFG.debug.force2d || reducedNow());
  }

  function applyUi() {
    var dict = UI[pack()];
    $$("[data-i]").forEach(function (el) {
      var k = el.getAttribute("data-i");
      if (k && dict[k]) el.textContent = dict[k];
    });
    var tog = $("[data-lang-toggle]");
    if (tog) {
      tog.textContent = lang === "kn" ? "English" : "ಕನ್ನಡ";
      tog.setAttribute("aria-pressed", lang === "kn" ? "true" : "false");
    }
    document.documentElement.lang = lang === "kn" ? "kn" : "en";
    paintCopy(Math.max(0, painted < 0 ? 0 : painted));
  }

  function setProgress(pct) {
    var bar = $("#pre-bar");
    var num = $("#pre-num");
    if (bar) bar.style.right = 100 - pct + "%";
    if (num) num.textContent = String(Math.min(100, Math.round(pct))).padStart(3, "0");
  }

  function makeGrain() {
    var c = document.createElement("canvas");
    c.width = c.height = 180;
    var x = c.getContext("2d");
    var d = x.createImageData(180, 180);
    for (var i = 0; i < d.data.length; i += 4) {
      var v = 160 + Math.random() * 70;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = 42;
    }
    x.putImageData(d, 0, 0);
    var g = $("#grain");
    if (g) g.style.backgroundImage = "url(" + c.toDataURL("image/png") + ")";
  }

  function drawCover(img, w, h, alpha) {
    if (!img || !img.width) return;
    var ir = img.width / img.height;
    var cr = w / h;
    var dw, dh, dx, dy;
    if (ir > cr) {
      dh = h;
      dw = h * ir;
      dx = (w - dw) / 2;
      dy = 0;
    } else {
      dw = w;
      dh = w / ir;
      dx = 0;
      dy = (h - dh) / 2;
    }
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  }

  function scrollProgress() {
    var reel = $("#reel");
    if (!reel) return 0;
    var total = reel.offsetHeight - window.innerHeight;
    if (total <= 0) return 0;
    var y = -reel.getBoundingClientRect().top;
    return Math.min(1, Math.max(0, y / total));
  }

  function beatFromT(t) {
    var n = Math.max(BEATS.length - 1, 1);
    return Math.min(BEATS.length - 1, Math.max(0, Math.round(t * n)));
  }

  function paintCopy(i) {
    var beat = BEATS[i];
    if (!beat) return;
    var c = copyOf(beat);
    if ($("#copy-k")) $("#copy-k").textContent = c.k;
    if ($("#copy-h")) $("#copy-h").textContent = c.h;
    if ($("#copy-p1")) $("#copy-p1").textContent = c.p1;
    if ($("#copy-p2")) $("#copy-p2").textContent = c.p2;
    if ($("#copy-cap")) $("#copy-cap").textContent = c.cap;
    if ($("#copy-lore")) $("#copy-lore").hidden = !beat.lore;
    if ($("#frame-num")) $("#frame-num").textContent = String(i).padStart(2, "0");
    if ($("#frame-act")) $("#frame-act").textContent = beat.act === "II" ? UI[pack()].actII : UI[pack()].actI;
    $$(".seq-dots button").forEach(function (b, n) {
      b.classList.toggle("on", n === i);
    });
    $$(".chip").forEach(function (ch) {
      ch.classList.toggle("on", ch.getAttribute("data-act") === beat.act);
    });
    var hudBeat = $("#hud-beat");
    if (hudBeat) hudBeat.textContent = String(i).padStart(2, "0") + " · t " + scrollT.toFixed(3);
  }

  function setCopyHold(t) {
    var n = Math.max(BEATS.length - 1, 1);
    var f = t * n;
    var frac = f - Math.floor(f);
    var card = $("#copy-card");
    if (!card) return;
    var passing = frac > CFG.copyRail.passHigh || frac < CFG.copyRail.passLow;
    card.classList.toggle("is-pass", passing && t > 0.01 && t < 0.99);
  }

  function paintBlend(t) {
    if (!ctx || !canvas) return;
    var w = window.innerWidth;
    var h = window.innerHeight;
    var n = frames.length;
    if (!n) return;
    t = ease(t, CFG.motion.easing);
    var f = t * Math.max(n - 1, 1);
    var i0 = Math.floor(f);
    var i1 = Math.min(n - 1, i0 + 1);
    var u = f - i0;
    ctx.fillStyle = CFG.world.background;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(Math.round(w * CFG.plates.fallbackShift), 0);
    drawCover(frames[i0], w, h, 1);
    if (i1 !== i0 && frames[i1]) drawCover(frames[i1], w, h, u);
    ctx.restore();
    var idx = beatFromT(t);
    if (idx !== painted) {
      painted = idx;
      paintCopy(idx);
    }
    setCopyHold(t);
  }

  function size2d() {
    if (!canvas || world) return;
    var dpr = Math.min(window.devicePixelRatio || 1, CFG.world.pixelRatioCap);
    var w = window.innerWidth;
    var h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintBlend(scrollT);
  }

  function jumpToFrame(i) {
    var reel = $("#reel");
    if (!reel) return;
    var total = reel.offsetHeight - window.innerHeight;
    var n = Math.max(BEATS.length - 1, 1);
    var y = reel.offsetTop + (i / n) * total + 2;
    window.scrollTo({
      top: y,
      behavior: CFG.nav.jumpSmooth && !reducedNow() ? "smooth" : "auto",
    });
  }

  function preload() {
    var done = 0;
    return new Promise(function (resolve) {
      BEATS.forEach(function (beat, i) {
        var img = new Image();
        img.decoding = "async";
        img.onload = img.onerror = function () {
          frames[i] = img;
          done += 1;
          setProgress(8 + (done / BEATS.length) * 88);
          if (done === BEATS.length) resolve();
        };
        img.src = beat.src;
      });
    });
  }

  function fillLongread() {
    var host = $("#longread");
    if (!host) return;
    host.innerHTML = BEATS.map(function (b) {
      var c = copyOf(b);
      return (
        "<article id=\"beat-" +
        b.id +
        "\"><p class=\"kicker\">" +
        c.k +
        (b.lore ? ' <span class="lore">Lore</span>' : "") +
        "</p><img src=\"" +
        b.src +
        "\" alt=\"" +
        c.cap.replace(/"/g, "") +
        "\" width=\"1600\" height=\"900\"/><h2>" +
        c.h +
        "</h2><p>" +
        c.p1 +
        "</p><p>" +
        c.p2 +
        "</p><p class=\"cap\">" +
        c.cap +
        "</p></article>"
      );
    }).join("");
  }

  function wireNav() {
    var nav = $(".nav");
    var burger = $(".nav-burger");
    var lastY = 0;
    if (burger && nav) {
      burger.addEventListener("click", function () {
        var open = nav.classList.toggle("menu-open");
        burger.classList.toggle("active", open);
        document.documentElement.classList.toggle("nav-open", open);
      });
    }
    window.addEventListener(
      "scroll",
      function () {
        if (!nav) return;
        var y = window.scrollY;
        nav.classList.toggle("stuck", y > 16);
        if (CFG.nav.hideOnScroll && !nav.classList.contains("menu-open")) {
          nav.classList.toggle("hide", y > lastY && y > CFG.nav.hideThreshold);
        } else {
          nav.classList.remove("hide");
        }
        lastY = y;
      },
      { passive: true }
    );
    document.documentElement.style.setProperty("--vw", window.innerWidth + "px");
    window.addEventListener("resize", function () {
      document.documentElement.style.setProperty("--vw", window.innerWidth + "px");
      if (world && world.resize) world.resize();
      else size2d();
    });
  }

  function disposeWorld() {
    running = false;
    if (world && world.dispose) world.dispose();
    world = null;
  }

  function initWorld() {
    if (reducedNow() || CFG.debug.force2d || typeof THREE === "undefined") return null;
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch (err) {
      return null;
    }
    var cam = CFG.camera;
    var mot = CFG.motion;
    var plt = CFG.plates;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CFG.world.pixelRatioCap));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setClearColor(hexNum(CFG.world.background), 1);
    renderer.outputEncoding = THREE.sRGBEncoding;

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(hexNum(CFG.world.fogColor), CFG.world.fogDensity);
    var camera = new THREE.PerspectiveCamera(cam.fov, window.innerWidth / window.innerHeight, cam.near, cam.far);
    camera.position.set(cam.startX, cam.startY, cam.startZ);

    var n = BEATS.length;
    var plates = [];
    var shards = [];
    var beans = [];
    var loader = new THREE.TextureLoader();
    var maxAniso = renderer.capabilities.getMaxAnisotropy();
    var textures = [];

    BEATS.forEach(function (beat, i) {
      var tex = loader.load(beat.src);
      tex.encoding = THREE.sRGBEncoding;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = maxAniso;
      textures.push(tex);
      var aspect = 16 / 9;
      var w = plt.width;
      var h = w / aspect;
      var mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.96,
        depthWrite: true,
        side: THREE.FrontSide,
      });
      var mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      var side = plt.baseX + (i % 2 === 0 ? plt.altA : plt.altB);
      mesh.position.set(side, plt.baseY + Math.sin(i * 0.7) * plt.ySine, -i * mot.gap);
      mesh.rotation.y = plt.rotY;
      mesh.userData.baseX = side;
      mesh.userData.baseY = mesh.position.y;
      mesh.userData.index = i;
      scene.add(mesh);
      plates.push(mesh);

      if (CFG.shards.enabled) {
        var sm = new THREE.Mesh(
          new THREE.PlaneGeometry(w * CFG.shards.scale, h * CFG.shards.scale),
          new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: CFG.shards.opacity, depthWrite: false })
        );
        sm.position.set(CFG.shards.x, CFG.shards.y, -i * mot.gap - CFG.shards.zOffset);
        sm.rotation.y = CFG.shards.rotY;
        sm.userData.phase = i * 0.6;
        scene.add(sm);
        shards.push(sm);
      }
    });

    var floor = new THREE.Mesh(
      new THREE.PlaneGeometry(48, n * mot.gap + 24),
      new THREE.MeshBasicMaterial({ color: 0x0c1014, transparent: true, opacity: 0.55 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -2.35, -((n - 1) * mot.gap) / 2);
    scene.add(floor);

    if (CFG.particles.enabled) {
      var beanGeo = new THREE.SphereGeometry(1, 10, 8);
      var beanMat = new THREE.MeshBasicMaterial({ color: hexNum(CFG.particles.bean) });
      var cherryMat = new THREE.MeshBasicMaterial({ color: hexNum(CFG.particles.cherry) });
      for (var b = 0; b < CFG.particles.count; b++) {
        var m = new THREE.Mesh(beanGeo, b % 5 === 0 ? cherryMat : beanMat);
        var s = 0.035 + Math.random() * 0.05;
        m.scale.set(s * 1.35, s, s * 0.85);
        m.position.set(
          CFG.particles.minX + Math.random() * CFG.particles.spreadX,
          (Math.random() - 0.4) * 3.2,
          -Math.random() * (n * mot.gap)
        );
        m.userData.spin = 0.2 + Math.random() * 0.6;
        m.userData.drift = 0.04 + Math.random() * 0.08;
        m.userData.baseY = m.position.y;
        scene.add(m);
        beans.push(m);
      }
    }

    var look = new THREE.Vector3(0, 0.1, -4);
    var camTarget = new THREE.Vector3(cam.startX, cam.startY, cam.startZ);
    var lookTarget = new THREE.Vector3(2.15, 0.08, -4);
    var clock = new THREE.Clock();
    var alive = true;

    function resize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight, false);
    }

    function tick() {
      if (!alive) return;
      requestAnimationFrame(tick);
      var dt = Math.min(clock.getDelta(), 0.05);
      var c = CFG.camera;
      var mo = CFG.motion;
      var fo = CFG.focus;
      var n1 = Math.max(n - 1, 1);
      var t = ease(scrollT, mo.easing);
      var z = c.startZ - t * (n1 * mo.gap + mo.dollyExtra);
      var weave = Math.sin(t * Math.PI * n1 * 0.35) * c.weave;
      var rightBias = window.innerWidth < c.mobileBreakpoint ? c.rightBiasMobile : c.rightBias;
      camTarget.set(c.startX + weave * 0.12 + pointer.x * c.pointerX, c.startY - 0.03 + pointer.y * c.pointerY, z);
      var nearest = beatFromT(t);
      lookTarget.set(rightBias, c.lookY, z - c.lookAhead);
      camera.fov = c.fov;
      camera.near = c.near;
      camera.far = c.far;
      camera.updateProjectionMatrix();
      camera.position.lerp(camTarget, 1 - Math.pow(c.lerpPower, dt));
      look.lerp(lookTarget, 1 - Math.pow(c.lerpPower, dt));
      camera.lookAt(look);
      scene.fog.density = CFG.world.fogDensity;
      scene.fog.color.setHex(hexNum(CFG.world.fogColor));
      renderer.setClearColor(hexNum(CFG.world.background), 1);

      plates.forEach(function (p, i) {
        var dz = p.position.z - camera.position.z;
        var ahead = -dz;
        var focus = 1 - Math.min(1, Math.abs(ahead - fo.ahead) / fo.range);
        p.material.opacity = fo.opacityIdle + focus * fo.opacityGain;
        var grow = 1 + Math.max(0, 1 - Math.abs(ahead - fo.growAhead) / fo.growRange) * fo.growAmount;
        p.scale.setScalar(grow);
        p.position.x = p.userData.baseX + (1 - focus) * fo.idleDriftX;
        p.position.y = p.userData.baseY + Math.sin(clock.elapsedTime * 0.35 + i) * mo.plateFloat;
        p.rotation.y = fo.rotY - (1 - focus) * fo.rotYIdle;
      });
      shards.forEach(function (s) {
        s.visible = CFG.shards.enabled;
        s.material.opacity = CFG.shards.opacity;
        s.position.x = CFG.shards.x;
        s.position.y = CFG.shards.y + Math.sin(clock.elapsedTime * 0.5 + s.userData.phase) * mo.shardFloat;
        s.rotation.z = Math.sin(clock.elapsedTime * 0.2 + s.userData.phase) * 0.08;
      });
      beans.forEach(function (m) {
        m.visible = CFG.particles.enabled;
        m.rotation.y += m.userData.spin * dt;
        m.position.y = m.userData.baseY + Math.sin(clock.elapsedTime * m.userData.drift * 6 + m.position.z) * mo.beanBob;
      });

      if (nearest !== painted) {
        painted = nearest;
        paintCopy(nearest);
      }
      setCopyHold(t);
      renderer.render(scene, camera);
    }

    running = true;
    tick();
    return {
      resize: resize,
      dispose: function () {
        alive = false;
        textures.forEach(function (tex) {
          tex.dispose();
        });
        plates.forEach(function (p) {
          p.geometry.dispose();
          p.material.dispose();
        });
        renderer.dispose();
      },
    };
  }

  function onScroll() {
    scrollT = scrollProgress();
    if (!world) paintBlend(scrollT);
    var hudBeat = $("#hud-beat");
    if (hudBeat) hudBeat.textContent = String(Math.max(0, painted)).padStart(2, "0") + " · t " + scrollT.toFixed(3);
  }

  var STRUCT = [
    "plates.width",
    "plates.baseX",
    "plates.altA",
    "plates.altB",
    "plates.baseY",
    "plates.ySine",
    "plates.rotY",
    "motion.gap",
    "shards.enabled",
    "shards.scale",
    "shards.zOffset",
    "particles.enabled",
    "particles.count",
    "debug.force2d",
    "a11y.reducedMotion",
    "world.pixelRatioCap",
    "camera.startZ",
  ];

  function pathOf(obj, path) {
    return path.split(".").reduce(function (o, k) {
      return o ? o[k] : undefined;
    }, obj);
  }

  function needsRebuild(prev, next) {
    return STRUCT.some(function (p) {
      return pathOf(prev, p) !== pathOf(next, p);
    });
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_CFG, JSON.stringify(CFG));
    } catch (e) {}
  }

  var rebuildTimer = null;
  function rebuildNow() {
    disposeWorld();
    ctx = null;
    if (canvas && !reducedNow() && !CFG.debug.force2d) {
      world = initWorld();
    }
    if (!world && canvas) {
      ctx = canvas.getContext("2d", { alpha: false });
      size2d();
    }
  }
  function applyConfig(next, opts) {
    opts = opts || {};
    var prev = clone(CFG);
    CFG = deepMerge(clone(window.BTC_DEFAULTS), next);
    applyChrome();
    persist();
    if (opts.rebuild || needsRebuild(prev, CFG)) {
      clearTimeout(rebuildTimer);
      rebuildTimer = setTimeout(rebuildNow, opts.rebuild ? 0 : 160);
    }
    if (window.BTCHud && window.BTCHud.sync) window.BTCHud.sync(CFG);
  }

  function boot() {
    canvas = $("#seq");
    applyChrome();
    makeGrain();
    wireNav();
    fillLongread();
    applyUi();
    $("[data-lang-toggle]") &&
      $("[data-lang-toggle]").addEventListener("click", function () {
        lang = lang === "kn" ? "en" : "kn";
        localStorage.setItem(STORAGE_LANG, lang);
        applyUi();
        fillLongread();
      });
    $$(".seq-dots button").forEach(function (b, i) {
      b.addEventListener("click", function () {
        jumpToFrame(i);
      });
    });
    $$(".chip").forEach(function (ch) {
      ch.addEventListener("click", function () {
        jumpToFrame(ch.getAttribute("data-act") === "II" ? CFG.nav.actIIIndex : 0);
      });
    });
    window.addEventListener(
      "pointermove",
      function (e) {
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
      },
      { passive: true }
    );

    preload().then(function () {
      world = reducedNow() || CFG.debug.force2d ? null : initWorld();
      if (!world && canvas) {
        ctx = canvas.getContext("2d", { alpha: false });
        size2d();
      }
      paintCopy(0);
      document.body.classList.remove("is-locked");
      var pre = $("#pre");
      if (pre) pre.classList.add("done");
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      if (window.BTCHud) window.BTCHud.mount(CFG);
    });
  }

  window.WalkSandbox = {
    get: function () {
      return clone(CFG);
    },
    set: function (next) {
      applyConfig(next, { rebuild: false });
    },
    rebuild: function (next) {
      applyConfig(next || CFG, { rebuild: true });
    },
    reset: function () {
      localStorage.removeItem(STORAGE_CFG);
      applyConfig(clone(window.BTC_DEFAULTS), { rebuild: true });
    },
    jump: jumpToFrame,
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
