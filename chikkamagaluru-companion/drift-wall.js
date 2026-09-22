(function (global) {
  const preloadCache = new Map();

  function preloadSrc(src) {
    if (!src) return Promise.resolve();
    if (preloadCache.has(src)) return preloadCache.get(src);
    const done = new Promise((resolve) => {
      const img = new Image();
      img.decoding = "async";
      const finish = () => resolve(src);
      img.onload = finish;
      img.onerror = () => {
        const retry = new Image();
        retry.onload = finish;
        retry.onerror = finish;
        retry.src = src;
      };
      img.src = src;
    });
    preloadCache.set(src, done);
    return done;
  }

  function prefersReducedMotion() {
    return Boolean(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function columnFactor(index, variance) {
    const pseudo = ((index * 0.6180339887 + 0.35) % 1) * 2 - 1;
    return 1 + variance * pseudo;
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function mount(root, options) {
    if (!root) return { destroy() {} };
    const items = Array.isArray(options.items) ? options.items.filter((item) => item && item.image) : [];
    if (!items.length) {
      root.innerHTML = "";
      return { destroy() {} };
    }

    const columns = Math.max(1, options.columns ?? 5);
    const tileWidth = options.tileWidth ?? 200;
    const tileHeight = options.tileHeight ?? 132;
    const gap = options.gap ?? 18;
    const radius = options.radius ?? 14;
    const tilt = options.tilt ?? 16;
    const turn = options.turn ?? -14;
    const roll = options.roll ?? 0;
    const perspective = options.perspective ?? 1200;
    const depth = options.depth ?? 120;
    const speed = options.speed ?? 42;
    const direction = options.direction === "down" ? "down" : "up";
    const variance = options.variance ?? 0.45;
    const parallax = options.parallax ?? 0.6;
    const pauseOnHover = Boolean(options.pauseOnHover);
    const lift = options.lift ?? 64;
    const fade = options.fade ?? 0.6;
    const dim = options.dim ?? 0.55;
    const grayscale = Boolean(options.grayscale);
    const overlayColor = options.overlayColor || "#0c1f13";
    const scale = options.scale ?? 1.18;
    const shiftX = Number.isFinite(options.shiftX) ? options.shiftX : 0;
    const originX = options.originX ?? "50%";
    const onOpenPlace = typeof options.onOpenPlace === "function" ? options.onOpenPlace : null;

    let reduced = prefersReducedMotion();
    let containerHeight = root.clientHeight || 600;
    let activeId = null;
    let flippedPlace = null;
    let pausedByFlip = false;
    let destroyed = false;

    const columnItems = Array.from({ length: columns }, () => []);
    if (options.fill === "columns") {
      const per = Math.ceil(items.length / columns);
      items.forEach((item, i) => columnItems[Math.min(columns - 1, Math.floor(i / per))].push(item));
    } else {
      items.forEach((item, i) => columnItems[i % columns].push(item));
    }
    columnItems.forEach((col, i) => {
      if (!col.length) columnItems[i] = items.slice(0, 1);
    });

    const unit = tileHeight + gap;
    const columnMeta = columnItems.map((col) => {
      const copyHeight = Math.max(unit, col.length * unit);
      const copies = Math.min(3, Math.max(2, Math.ceil(containerHeight / copyHeight) + 1));
      return { copyHeight, copies };
    });

    const dirSign = direction === "up" ? 1 : -1;
    const baseVelocities = columnItems.map((_, c) => {
      const altSign = c % 2 === 0 ? 1 : -1;
      return speed * columnFactor(c, variance) * dirSign * altSign;
    });

    const offsets = columnMeta.map(() => 0);
    const velocities = baseVelocities.slice();
    const trackEls = [];
    let hoveredCol = -1;
    let wallHovered = false;
    const pointer = { x: 0, y: 0 };
    const pointerDamped = { x: 0, y: 0 };
    let lastTs = null;
    let raf = null;
    let plane = null;
    let press = null;
    let panX = shiftX;
    let panY = 0;
    let panTargetX = shiftX;
    let panTargetY = 0;

    root.className = ["drift-wall", reduced ? "drift-wall--reduced" : "", options.className || ""].filter(Boolean).join(" ");
    root.style.setProperty("--dw-tile-w", `${tileWidth}px`);
    root.style.setProperty("--dw-tile-h", `${tileHeight}px`);
    root.style.setProperty("--dw-gap", `${gap}px`);
    root.style.setProperty("--dw-radius", `${radius}px`);
    root.style.setProperty("--dw-perspective", `${perspective}px`);
    root.style.setProperty("--dw-lift", `${lift}px`);
    root.style.setProperty("--dw-dim", String(dim));
    root.style.setProperty("--dw-gray", grayscale ? "1" : "0");
    root.style.setProperty("--dw-overlay", overlayColor);
    root.style.setProperty("--dw-overlay-opacity", overlayColor === "transparent" ? "0" : "0.42");
    root.style.setProperty("--dw-edge", `${Math.max(0, (1 - fade) * 100)}%`);
    root.style.setProperty("--dw-origin-x", String(originX));
    root.setAttribute("role", "group");
    root.setAttribute("aria-label", "Drifting wall of places. Click a still to pause and read.");

    function renderTile(item, id, colIndex, copyIndex) {
      const blurb = esc(item.blurb || "");
      const title = esc(item.title || "");
      const kn = item.kannada ? `<span class="kn">${esc(item.kannada)}</span>` : "";
      const more = item.openPlace && item.placeId
        ? `<span class="drift-wall__more" data-open-place="${esc(item.placeId)}">Visitor notes</span>`
        : "";
      const eager = copyIndex === 0 ? ' fetchpriority="high"' : "";
      return `<button type="button" class="drift-wall__tile" data-tile-id="${esc(id)}" data-col="${colIndex}" data-place-id="${esc(item.placeId || "")}" aria-label="${title}">
        <span class="drift-wall__flip">
          <span class="drift-wall__face drift-wall__inner">
            <img src="${esc(item.image)}" alt="${title}" width="600" height="400" loading="eager" decoding="async"${eager} draggable="false" />
            <span class="drift-wall__overlay" aria-hidden="true"></span>
          </span>
          <span class="drift-wall__face drift-wall__face--back">
            <strong>${title}</strong>
            ${kn}
            <p>${blurb}</p>
            ${more}
          </span>
        </span>
      </button>`;
    }

    const colsHtml = columnItems
      .map((col, c) => {
        const meta = columnMeta[c];
        let copies = "";
        for (let copyIndex = 0; copyIndex < meta.copies; copyIndex += 1) {
          copies += col.map((item, itemIndex) => renderTile(item, `${c}-${copyIndex}-${itemIndex}`, c, copyIndex)).join("");
        }
        return `<div class="drift-wall__col"><div class="drift-wall__track" data-track="${c}">${copies}</div></div>`;
      })
      .join("");

    root.innerHTML = `<div class="drift-wall__plane">${colsHtml}</div>`;
    plane = root.querySelector(".drift-wall__plane");
    root.querySelectorAll("[data-track]").forEach((el) => {
      trackEls[Number(el.getAttribute("data-track"))] = el;
    });

    const uniqueSrc = Array.from(new Set(items.map((item) => item.image).filter(Boolean)));
    uniqueSrc.forEach(preloadSrc);

    function markReady(img) {
      if (img && img.naturalWidth) img.classList.add("is-ready");
    }
    function onImgLoad(e) {
      if (e.target && e.target.tagName === "IMG") markReady(e.target);
    }
    function onImgError(e) {
      const img = e.target;
      if (!img || img.tagName !== "IMG") return;
      const n = Number(img.getAttribute("data-retries") || 0);
      if (n >= 2) return;
      img.setAttribute("data-retries", String(n + 1));
      const src = img.getAttribute("src");
      img.removeAttribute("src");
      preloadSrc(src).then(() => {
        if (!destroyed && src) img.src = src;
      });
    }
    root.addEventListener("load", onImgLoad, true);
    root.addEventListener("error", onImgError, true);
    root.querySelectorAll("img").forEach((img) => {
      if (img.complete) markReady(img);
    });

    function applyPlaneTransform(px, py) {
      if (!plane) return;
      const yaw = pausedByFlip ? turn * 0.15 : turn;
      const pitch = pausedByFlip ? tilt * 0.35 : tilt;
      plane.style.transform =
        `translate(-50%, -46%) translate(${panX.toFixed(1)}px, ${panY.toFixed(1)}px) scale(${scale}) ` +
        `rotateX(${pitch + py}deg) rotateY(${yaw + px}deg) rotateZ(${roll}deg) ` +
        `translateZ(${-depth}px)`;
    }

    function aimFlippedCard() {
      if (!flippedPlace) {
        panTargetX = shiftX;
        panTargetY = 0;
        return;
      }
      const mid = (columns - 1) / 2;
      const col = Number.isFinite(hoveredCol) ? hoveredCol : 0;
      panTargetX = shiftX + (mid - col) * tileWidth * 0.82;
      panTargetY = 0;
    }

    function syncTileState() {
      root.querySelectorAll(".drift-wall__tile").forEach((tile) => {
        const id = tile.getAttribute("data-tile-id");
        const placeId = tile.getAttribute("data-place-id");
        tile.classList.toggle("is-active", id === activeId || (flippedPlace && placeId === flippedPlace));
        tile.classList.toggle("is-flipped", Boolean(flippedPlace) && placeId === flippedPlace);
      });
    }

    function animate(ts) {
      if (destroyed) return;
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(0.05, Math.max(0, ts - lastTs) / 1000);
      lastTs = ts;

      const maxTilt = parallax * 8;
      const targetX = pointer.x * maxTilt;
      const targetY = -pointer.y * maxTilt;
      const damp = 1 - Math.exp(-dt / 0.12);
      pointerDamped.x += (targetX - pointerDamped.x) * damp;
      pointerDamped.y += (targetY - pointerDamped.y) * damp;
      if (pausedByFlip) {
        pointerDamped.x += (0 - pointerDamped.x) * damp;
        pointerDamped.y += (0 - pointerDamped.y) * damp;
      }
      aimFlippedCard();
      panX += (panTargetX - panX) * (1 - Math.exp(-dt / 0.18));
      panY += (panTargetY - panY) * (1 - Math.exp(-dt / 0.18));
      applyPlaneTransform(pausedByFlip ? 0 : pointerDamped.x, pausedByFlip ? 0 : pointerDamped.y);

      if (!reduced) {
        for (let c = 0; c < trackEls.length; c += 1) {
          const meta = columnMeta[c];
          if (!meta) continue;
          const paused = pausedByFlip || Boolean(press) || (wallHovered && pauseOnHover);
          const factor = paused ? 0 : 1;
          const target = baseVelocities[c] * factor;
          if (pausedByFlip) {
            velocities[c] = 0;
          } else if (paused) {
            const ease = 1 - Math.exp(-dt / 0.16);
            velocities[c] += (target - velocities[c]) * ease;
          } else {
            velocities[c] = target;
          }
          let next = (offsets[c] ?? 0) + velocities[c] * dt;
          next = ((next % meta.copyHeight) + meta.copyHeight) % meta.copyHeight;
          offsets[c] = next;
          const el = trackEls[c];
          const z = (c - (trackEls.length - 1) / 2) * 36;
          if (el) el.style.transform = `translate3d(0, ${-next}px, ${z}px)`;
        }
      } else {
        for (let c = 0; c < trackEls.length; c += 1) {
          const el = trackEls[c];
          const meta = columnMeta[c];
          if (el && meta) {
            const z = (c - (trackEls.length - 1) / 2) * 36;
            el.style.transform = `translate3d(0, ${-(offsets[c] ?? 0)}px, ${z}px)`;
          }
        }
      }

      raf = global.requestAnimationFrame(animate);
    }

    function tileAtPoint(x, y) {
      const tiles = root.querySelectorAll(".drift-wall__tile");
      let best = null;
      let bestDist = Infinity;
      tiles.forEach((tile) => {
        const r = tile.getBoundingClientRect();
        if (r.width < 8 || r.height < 8) return;
        const pad = 10;
        const inside = x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
        const cx = (r.left + r.right) / 2;
        const cy = (r.top + r.bottom) / 2;
        const dist = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (inside && dist < bestDist) {
          bestDist = dist;
          best = tile;
        }
      });
      if (best) return best;
      tiles.forEach((tile) => {
        const r = tile.getBoundingClientRect();
        const cx = (r.left + r.right) / 2;
        const cy = (r.top + r.bottom) / 2;
        const dist = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (dist < bestDist && dist < 110 * 110) {
          bestDist = dist;
          best = tile;
        }
      });
      return best;
    }

    function flipTile(tile) {
      if (!tile || !root.contains(tile)) return;
      const placeId = tile.getAttribute("data-place-id") || tile.getAttribute("data-tile-id");
      if (!placeId) return;
      if (flippedPlace === placeId) {
        clearFlip();
        return;
      }
      flippedPlace = placeId;
      pausedByFlip = true;
      activeId = tile.getAttribute("data-tile-id");
      hoveredCol = Number(tile.getAttribute("data-col"));
      syncTileState();
    }

    function onPointerMove(e) {
      const rect = root.getBoundingClientRect();
      if (parallax > 0 && !reduced) {
        pointer.x = (e.clientX - rect.left) / rect.width - 0.5;
        pointer.y = (e.clientY - rect.top) / rect.height - 0.5;
      }
      if (press) {
        const dx = e.clientX - press.x;
        const dy = e.clientY - press.y;
        if (dx * dx + dy * dy > 144) press.moved = true;
      }
      if (pausedByFlip) return;
      const tile = tileAtPoint(e.clientX, e.clientY);
      if (!tile) return;
      const id = tile.getAttribute("data-tile-id");
      if (id === activeId) return;
      activeId = id;
      hoveredCol = Number(tile.getAttribute("data-col"));
      syncTileState();
    }

    function clearFlip() {
      flippedPlace = null;
      pausedByFlip = false;
      hoveredCol = -1;
      activeId = null;
      panTargetX = shiftX;
      panTargetY = 0;
      syncTileState();
    }

    function onPointerDown(e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      press = { x: e.clientX, y: e.clientY, moved: false, tile: tileAtPoint(e.clientX, e.clientY) };
    }

    function onPointerUp(e) {
      const start = press;
      press = null;
      if (destroyed || !start || start.moved) return;
      const openHit = document.elementFromPoint(e.clientX, e.clientY);
      const open = openHit && openHit.closest ? openHit.closest("[data-open-place]") : null;
      if (open && root.contains(open)) {
        const placeId = open.getAttribute("data-open-place");
        if (placeId && onOpenPlace) onOpenPlace(placeId);
        return;
      }
      const tile = tileAtPoint(e.clientX, e.clientY) || start.tile;
      if (!tile || !root.contains(tile)) {
        if (pausedByFlip) clearFlip();
        return;
      }
      flipTile(tile);
    }

    function onClick(e) {
      const open = e.target.closest("[data-open-place]");
      if (open && root.contains(open)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.target.closest("[data-tile-id]") && root.contains(e.target)) {
        e.preventDefault();
      }
    }

    function onKey(e) {
      if (e.key === "Escape" && pausedByFlip) {
        clearFlip();
      }
    }

    function onPointerEnter() {
      wallHovered = true;
    }

    function onPointerLeave() {
      wallHovered = false;
      pointer.x = 0;
      pointer.y = 0;
      if (!pausedByFlip) {
        activeId = null;
        hoveredCol = -1;
        syncTileState();
      }
    }

    function onPointerCancel() {
      press = null;
    }

    const mq = global.matchMedia("(prefers-reduced-motion: reduce)");
    const onMq = (event) => {
      reduced = event.matches;
      root.classList.toggle("drift-wall--reduced", reduced);
    };

    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerdown", onPointerDown);
    global.addEventListener("pointerup", onPointerUp);
    root.addEventListener("pointercancel", onPointerCancel);
    root.addEventListener("pointerenter", onPointerEnter);
    root.addEventListener("pointerleave", onPointerLeave);
    root.addEventListener("click", onClick);
    global.addEventListener("keydown", onKey);
    if (mq.addEventListener) mq.addEventListener("change", onMq);
    else mq.addListener(onMq);

    applyPlaneTransform(0, 0);
    raf = global.requestAnimationFrame(animate);

    return {
      destroy() {
        destroyed = true;
        if (raf) global.cancelAnimationFrame(raf);
        root.removeEventListener("pointermove", onPointerMove);
        root.removeEventListener("pointerdown", onPointerDown);
        global.removeEventListener("pointerup", onPointerUp);
        root.removeEventListener("pointercancel", onPointerCancel);
        root.removeEventListener("pointerenter", onPointerEnter);
        root.removeEventListener("pointerleave", onPointerLeave);
        root.removeEventListener("click", onClick);
        root.removeEventListener("load", onImgLoad, true);
        root.removeEventListener("error", onImgError, true);
        global.removeEventListener("keydown", onKey);
        if (mq.removeEventListener) mq.removeEventListener("change", onMq);
        else mq.removeListener(onMq);
        root.innerHTML = "";
      },
    };
  }

  global.CKMDriftWall = { mount };
})(window);
