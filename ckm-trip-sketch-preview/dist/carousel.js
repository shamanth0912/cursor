(function (global) {
  const DRAG_BUFFER = 12;
  const VELOCITY_THRESHOLD = 500;
  const GAP = 16;
  const SPRING = { duration: 0.55, ease: "power3.out" };

  function prefersReduced() {
    return Boolean(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function interpolate(value, input, output) {
    if (value <= input[0]) {
      const t = input[1] === input[0] ? 0 : (value - input[0]) / (input[1] - input[0]);
      return output[0] + (output[1] - output[0]) * t;
    }
    if (value >= input[input.length - 1]) {
      const i = input.length - 1;
      const t = input[i] === input[i - 1] ? 0 : (value - input[i - 1]) / (input[i] - input[i - 1]);
      return output[i - 1] + (output[i] - output[i - 1]) * t;
    }
    for (let i = 0; i < input.length - 1; i += 1) {
      if (value >= input[i] && value <= input[i + 1]) {
        const t = input[i + 1] === input[i] ? 0 : (value - input[i]) / (input[i + 1] - input[i]);
        return output[i] + (output[i + 1] - output[i]) * t;
      }
    }
    return output[0];
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function gsapLib() {
    return global.gsap;
  }

  function measureBaseWidth(root, requested) {
    const host = root.parentElement || root;
    const available = host.clientWidth || requested;
    const floor = global.innerWidth < 520 ? 232 : 260;
    return Math.round(clamp(Math.min(requested, available), floor, requested));
  }

  function mount(root, options) {
    if (!root) return { destroy() {} };
    const items = Array.isArray(options.items) ? options.items : [];
    if (!items.length) return { destroy() {} };

    const loop = options.loop !== false;
    const autoplay = options.autoplay !== false && !prefersReduced();
    const autoplayDelay = options.autoplayDelay ?? 2800;
    const pauseOnHover = options.pauseOnHover !== false;
    const round = Boolean(options.round);
    const requestedWidth = options.baseWidth ?? 320;
    const onChange = typeof options.onChange === "function" ? options.onChange : null;

    const containerPadding = 0;
    let baseWidth = measureBaseWidth(root, requestedWidth);
    let itemWidth = baseWidth - containerPadding * 2;
    let trackItemOffset = itemWidth + GAP;
    const itemsForRender = loop && items.length ? [items[items.length - 1], ...items, items[0]] : items.slice();

    let position = loop ? 1 : 0;
    let x = -position * trackItemOffset;
    let isHovered = false;
    let isJumping = false;
    let isAnimating = false;
    let dragArmed = false;
    let dragging = false;
    let dragStartX = 0;
    let dragOrigin = 0;
    let lastMoveX = 0;
    let lastMoveT = 0;
    let velocityX = 0;
    let autoplayTimer = null;
    let destroyed = false;
    let tween = null;

    root.className = `carousel-container${round ? " round" : ""}`;
    root.setAttribute("role", "region");
    root.setAttribute("aria-roledescription", "carousel");
    root.setAttribute("aria-label", options.label || "Popular places");
    applySize();

    root.innerHTML = `
      <div class="carousel-track" style="width:${itemWidth}px;gap:${GAP}px">
        ${itemsForRender
          .map((item, index) => {
            const href = item.link ? `href="${esc(item.link)}"` : "";
            const tag = item.link ? "a" : "div";
            return `
          <${tag} class="carousel-item${round ? " round" : ""}" ${href} data-carousel-index="${index}" aria-label="${esc(item.title || item.name || "")}">
            <span class="carousel-item-media">
              <img src="${esc(item.image)}" alt="${esc(item.alt || item.title || "")}" draggable="false" width="900" height="1200" />
            </span>
            <span class="carousel-item-content">
              <span class="carousel-item-kicker">${esc(item.kicker || "")}</span>
              <span class="carousel-item-title">${esc(item.title || item.name || "")}</span>
              <span class="carousel-item-description">${esc(item.description || "")}</span>
            </span>
          </${tag}>`;
          })
          .join("")}
      </div>
      <div class="carousel-indicators-container${round ? " round" : ""}">
        <div class="carousel-indicators" role="tablist" aria-label="Slides">
          ${items
            .map(
              (_, index) =>
                `<button type="button" class="carousel-indicator" data-go="${index}" aria-label="Go to slide ${index + 1}"></button>`
            )
            .join("")}
        </div>
      </div>`;

    const track = root.querySelector(".carousel-track");
    const itemEls = Array.from(root.querySelectorAll(".carousel-item"));
    const indicators = Array.from(root.querySelectorAll(".carousel-indicator"));

    function applySize() {
      root.style.width = `${baseWidth}px`;
      if (round) {
        root.style.height = `${baseWidth}px`;
        root.style.borderRadius = "50%";
      }
    }

    function activeIndex() {
      if (!items.length) return 0;
      return loop ? (position - 1 + items.length) % items.length : Math.min(position, items.length - 1);
    }

    function setX(nextX, immediate) {
      x = nextX;
      const gsap = gsapLib();
      const snap = immediate || isJumping || prefersReduced();
      if (gsap) {
        if (tween) {
          tween.kill();
          isAnimating = false;
        }
        if (snap) {
          gsap.set(track, { x });
          paintTransforms();
          handleAnimationComplete();
          return;
        }
        isAnimating = true;
        tween = gsap.to(track, {
          x,
          duration: SPRING.duration,
          ease: SPRING.ease,
          onUpdate: paintTransforms,
          onComplete: handleAnimationComplete,
        });
        return;
      }
      track.style.transition = snap ? "none" : "transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)";
      track.style.transform = `translate3d(${x}px,0,0)`;
      paintTransforms();
      if (snap) {
        handleAnimationComplete();
      } else {
        isAnimating = true;
        window.setTimeout(handleAnimationComplete, 560);
      }
    }

    function paintTransforms() {
      const gsap = gsapLib();
      const currentX = gsap ? Number(gsap.getProperty(track, "x")) || x : x;
      itemEls.forEach((el, index) => {
        const range = [-(index + 1) * trackItemOffset, -index * trackItemOffset, -(index - 1) * trackItemOffset];
        const rotateY = prefersReduced() ? 0 : interpolate(currentX, range, [90, 0, -90]);
        el.style.width = `${itemWidth}px`;
        el.style.height = round ? `${itemWidth}px` : "100%";
        el.style.transform = `rotateY(${rotateY}deg)`;
      });
      track.style.perspectiveOrigin = `${position * trackItemOffset + itemWidth / 2}px 50%`;
    }

    function paintIndicators() {
      const active = activeIndex();
      indicators.forEach((btn, index) => {
        const on = index === active;
        btn.classList.toggle("active", on);
        btn.classList.toggle("inactive", !on);
        btn.setAttribute("aria-current", on ? "true" : "false");
      });
    }

    function emit() {
      if (destroyed) return;
      paintIndicators();
      if (onChange) onChange(items[activeIndex()], activeIndex());
    }

    function goTo(next, immediate) {
      const max = itemsForRender.length - 1;
      position = clamp(next, 0, max);
      setX(-position * trackItemOffset, immediate);
    }

    function handleAnimationComplete() {
      isAnimating = false;
      if (isJumping) return;
      if (loop && itemsForRender.length > 1) {
        const lastCloneIndex = itemsForRender.length - 1;
        if (position === lastCloneIndex) {
          isJumping = true;
          position = 1;
          setX(-position * trackItemOffset, true);
          isJumping = false;
          emit();
          return;
        }
        if (position === 0) {
          isJumping = true;
          position = items.length;
          setX(-position * trackItemOffset, true);
          isJumping = false;
          emit();
          return;
        }
      }
      emit();
    }

    function stopAutoplay() {
      if (autoplayTimer) {
        global.clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    }

    function startAutoplay() {
      stopAutoplay();
      if (!autoplay || itemsForRender.length <= 1 || destroyed) return;
      autoplayTimer = global.setInterval(() => {
        if (pauseOnHover && isHovered) return;
        if (dragging || isAnimating) return;
        goTo(position + 1);
      }, autoplayDelay);
    }

    function onPointerDown(event) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (isAnimating && !prefersReduced()) return;
      dragArmed = true;
      dragging = false;
      dragStartX = event.clientX;
      dragOrigin = x;
      lastMoveX = event.clientX;
      lastMoveT = performance.now();
      velocityX = 0;
      root.setPointerCapture?.(event.pointerId);
    }

    function onPointerMove(event) {
      if (!dragArmed) return;
      const dx = event.clientX - dragStartX;
      const now = performance.now();
      const dt = Math.max(now - lastMoveT, 1);
      velocityX = ((event.clientX - lastMoveX) / dt) * 1000;
      lastMoveX = event.clientX;
      lastMoveT = now;
      if (Math.abs(dx) > 6) {
        dragging = true;
        event.preventDefault();
      }
      if (!dragging) return;
      const gsap = gsapLib();
      x = dragOrigin + dx;
      if (gsap) gsap.set(track, { x });
      else track.style.transform = `translate3d(${x}px,0,0)`;
      paintTransforms();
    }

    function onPointerUp(event) {
      if (!dragArmed) return;
      dragArmed = false;
      const dx = event.clientX - dragStartX;
      const direction =
        dx < -DRAG_BUFFER || velocityX < -VELOCITY_THRESHOLD ? 1 : dx > DRAG_BUFFER || velocityX > VELOCITY_THRESHOLD ? -1 : 0;
      dragging = false;
      if (direction === 0) {
        goTo(position);
        return;
      }
      goTo(position + direction);
    }

    function onClickCapture(event) {
      if (dragging && event.target.closest(".carousel-item")) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    function onKey(event) {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(position + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(position - 1);
      }
    }

    function onResize() {
      baseWidth = measureBaseWidth(root, requestedWidth);
      itemWidth = baseWidth - containerPadding * 2;
      trackItemOffset = itemWidth + GAP;
      applySize();
      track.style.width = `${itemWidth}px`;
      goTo(position, true);
    }

    function onEnter() {
      isHovered = true;
    }
    function onLeave() {
      isHovered = false;
    }

    indicators.forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = Number(btn.getAttribute("data-go"));
        goTo(loop ? index + 1 : index);
      });
    });

    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerup", onPointerUp);
    root.addEventListener("pointercancel", onPointerUp);
    root.addEventListener("click", onClickCapture, true);
    root.addEventListener("keydown", onKey);
    root.tabIndex = 0;
    if (pauseOnHover) {
      root.addEventListener("mouseenter", onEnter);
      root.addEventListener("mouseleave", onLeave);
    }
    global.addEventListener("resize", onResize);

    goTo(position, true);
    startAutoplay();

    return {
      destroy() {
        destroyed = true;
        stopAutoplay();
        if (tween && tween.kill) tween.kill();
        root.removeEventListener("pointerdown", onPointerDown);
        root.removeEventListener("pointermove", onPointerMove);
        root.removeEventListener("pointerup", onPointerUp);
        root.removeEventListener("pointercancel", onPointerUp);
        root.removeEventListener("click", onClickCapture, true);
        root.removeEventListener("keydown", onKey);
        root.removeEventListener("mouseenter", onEnter);
        root.removeEventListener("mouseleave", onLeave);
        global.removeEventListener("resize", onResize);
      },
    };
  }

  global.CKMCarousel = { mount };
})(typeof window !== "undefined" ? window : globalThis);
