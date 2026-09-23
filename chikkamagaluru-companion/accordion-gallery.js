(function (global) {
  function gsapLib() {
    return global.gsap;
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function mount(root, options) {
    if (!root) return { destroy() {} };
    const items = Array.isArray(options.items) ? options.items : [];
    const count = items.length;
    if (!count) return { destroy() {} };

    const defaultIndex = Math.min(Math.max(options.defaultIndex ?? 0, 0), count - 1);
    const accentColor = options.accentColor ?? "#c8ae6e";
    const overlayColor = options.overlayColor ?? "#0c1f13";
    const textColor = options.textColor ?? "#fcfbf8";
    const height = options.height ?? 420;
    const gap = options.gap ?? 12;
    const radius = options.radius ?? 22;
    const expandRatio = options.expandRatio ?? 0.48;
    const orientation = options.orientation ?? "horizontal";
    const duration = options.duration ?? 0.78;
    const ease = options.ease ?? "power3.out";
    const parallax = options.parallax ?? 0.5;
    const tilt = options.tilt ?? 8;
    const stagger = options.stagger ?? 0.06;
    const trigger = options.trigger ?? "hover";
    const showLabels = options.showLabels !== false;
    const grayscale = options.grayscale === true;
    const vertical = orientation === "vertical";
    const prefersReduced =
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false;

    let active = defaultIndex;
    let firstRun = true;
    let mediaSize = 320;
    let tl = null;
    const stackQuery = global.matchMedia ? global.matchMedia("(max-width: 720px)") : { matches: false, addEventListener() {}, removeEventListener() {} };

    function isStack() {
      return !!stackQuery.matches;
    }

    root.className = `accordion-gallery${vertical ? " accordion-gallery--vertical" : ""}${isStack() ? " accordion-gallery--stack" : ""}${options.className ? ` ${options.className}` : ""}`;
    root.style.setProperty("--ag-accent", accentColor);
    root.style.setProperty("--ag-overlay", overlayColor);
    root.style.setProperty("--ag-text", textColor);
    root.style.setProperty("--ag-gap", `${gap}px`);
    root.style.setProperty("--ag-radius", `${radius}px`);
    root.style.height = vertical ? `${Math.round(height * 1.6)}px` : `${height}px`;
    root.setAttribute("role", "list");
    root.setAttribute("aria-label", options.label || "Explore Chikkamagaluru");

    root.innerHTML = items
      .map((item, i) => {
        const href = item.link ? ` href="${esc(item.link)}"` : "";
        const tagOpen = item.link ? `<a${href}` : "<div";
        const tagClose = item.link ? "</a>" : "</div>";
        const kicker = item.kicker || item.label || "";
        const title = item.title || item.label || "";
        const lede = item.lede || "";
        const more = item.more || "";
        const copy = showLabels
          ? `<span class="ag-panel__label" aria-hidden="true">
              <span class="ag-panel__copy">
                ${kicker ? `<span class="ag-panel__kicker">${esc(kicker)}</span>` : ""}
                ${title ? `<span class="ag-panel__title">${esc(title)}</span>` : ""}
                ${lede ? `<span class="ag-panel__lede">${esc(lede)}</span>` : ""}
                ${more ? `<span class="ag-panel__more">${esc(more)} <span aria-hidden="true">→</span></span>` : ""}
              </span>
            </span>`
          : "";
        return `${tagOpen} class="ag-panel" style="border-radius:${radius}px" role="listitem" tabindex="0" data-ag-index="${i}" aria-label="${esc(title || kicker)}">
          <span class="ag-panel__frame">
            <span class="ag-panel__media">
              <img src="${esc(item.image)}" alt="${esc(item.alt || title || kicker)}" draggable="false" />
            </span>
            <span class="ag-panel__overlay" aria-hidden="true"></span>
          </span>
          ${copy}
        ${tagClose}`;
      })
      .join("");

    const panels = Array.from(root.querySelectorAll(".ag-panel"));
    const medias = Array.from(root.querySelectorAll(".ag-panel__media"));
    const copies = Array.from(root.querySelectorAll(".ag-panel__copy"));

    function applyLayout(animate) {
      const gsap = gsapLib();
      const stack = isStack();
      const r = Math.min(Math.max(expandRatio, 0.2), 0.9);
      const grow = count > 1 ? (r * (count - 1)) / (1 - r) : 1;
      const dur = animate && !prefersReduced ? duration : 0;
      root.classList.toggle("accordion-gallery--stack", stack);

      if (stack) {
        applyStackHeights();
        panels.forEach((panel, i) => {
          const isActive = i === active;
          panel.classList.toggle("ag-panel--active", isActive);
          if (isActive) panel.setAttribute("aria-current", "true");
          else panel.removeAttribute("aria-current");
          panel.style.flexGrow = "0";
          panel.style.transform = "none";
          panel.style.setProperty("--ag-dim", isActive ? "0.12" : "0.42");
          const copy = copies[i];
          if (copy) {
            copy.style.opacity = isActive ? "1" : "0";
            copy.style.transform = isActive ? "none" : "translateY(8px)";
          }
        });
        return;
      }

      tl?.kill();
      if (gsap) tl = gsap.timeline();

      panels.forEach((panel, i) => {
        const isActive = i === active;
        panel.classList.toggle("ag-panel--active", isActive);
        if (isActive) panel.setAttribute("aria-current", "true");
        else panel.removeAttribute("aria-current");
        const rot = isActive ? 0 : i < active ? tilt : -tilt;
        const rotProp = vertical ? { rotateX: -rot } : { rotateY: rot };
        const media = medias[i];
        const copy = copies[i];
        const drift = Math.max(-1.5, Math.min(1.5, active - i));
        const shift = drift * parallax * mediaSize * 0.06;
        const gray = grayscale ? (isActive ? 0 : 1) : 0;
        const dim = isActive ? 0.12 : 0.42;
        const panelGrow = isActive ? grow : 1;

        if (gsap && tl) {
          tl.to(
            panel,
            { flexGrow: panelGrow, ...rotProp, "--ag-dim": dim, duration: dur, ease },
            0
          );
          if (media) {
            tl.to(
              media,
              {
                xPercent: -50,
                yPercent: -50,
                x: vertical ? 0 : isActive ? 0 : shift,
                y: vertical ? (isActive ? 0 : shift) : 0,
                scale: 1,
                "--ag-gray": gray,
                duration: dur,
                ease,
              },
              0
            );
          }
          if (showLabels && copy) {
            if (isActive) {
              tl.to(copy, { opacity: 1, y: 0, duration: dur, ease }, 0);
            } else {
              tl.to(copy, { opacity: 0, y: 12, duration: dur * 0.45, ease }, 0);
            }
          }
        } else {
          panel.style.flexGrow = String(panelGrow);
          panel.style.setProperty("--ag-dim", String(dim));
          if (media) media.style.setProperty("--ag-gray", String(gray));
          if (copy) {
            copy.style.opacity = isActive ? "1" : "0";
            copy.style.transform = isActive ? "none" : "translateY(12px)";
          }
        }
      });
    }

    function setActive(i) {
      const next = ((i % count) + count) % count;
      if (next === active && !firstRun) return;
      active = next;
      applyLayout(!firstRun);
      options.onChange?.(active, items[active]);
    }

    function pinWrap() {
      return root.closest(".explore-accordion-wrap") || root.parentElement;
    }

    function viewBox() {
      const vv = window.visualViewport;
      if (vv && vv.height) return { top: vv.offsetTop || 0, height: vv.height };
      return { top: 0, height: window.innerHeight || 800 };
    }

    function pickStackIndex() {
      const box = viewBox();
      const line = box.top + box.height * 0.22;
      let best = 0;
      panels.forEach((panel, i) => {
        if (panel.getBoundingClientRect().top <= line) best = i;
      });
      const chosen = panels[best].getBoundingClientRect();
      if (chosen.bottom < line + 48 && best < count - 1) {
        const next = panels[best + 1].getBoundingClientRect();
        if (next.top < box.top + box.height * 0.78) best += 1;
      }
      return best;
    }

    function applyStackHeights() {
      const box = viewBox();
      const compact = 76;
      const open = Math.max(280, Math.round(Math.min(box.height * 0.62, box.height - 120)));
      root.style.setProperty("--ag-open-h", `${open}px`);
      root.style.setProperty("--ag-compact-h", `${compact}px`);
      panels.forEach((panel, i) => {
        panel.style.height = `${i === active ? open : compact}px`;
        panel.style.minHeight = "0";
        panel.style.maxHeight = "none";
      });
    }

    function measure() {
      const stack = isStack();
      const wrap = pinWrap();
      root.classList.toggle("accordion-gallery--stack", stack);
      if (wrap) {
        wrap.classList.remove("explore-accordion-wrap--pin");
        wrap.style.minHeight = "";
        wrap.style.position = "";
      }
      root.classList.remove("is-pinned");
      root.style.position = "";
      root.style.top = "";
      root.style.left = "";
      root.style.width = "";
      root.style.right = "";
      root.style.bottom = "";
      root.style.zIndex = "";
      if (stack) {
        root.style.height = "auto";
        root.style.setProperty("--ag-media-size", "100%");
        applyLayout(false);
        return;
      }
      panels.forEach((panel) => {
        panel.style.height = "";
        panel.style.minHeight = "";
        panel.style.maxHeight = "";
      });
      const rect = root.getBoundingClientRect();
      const total = vertical ? rect.height : rect.width;
      const usable = Math.max(total - gap * (count - 1), 120);
      const size = Math.max(140, usable * Math.min(Math.max(expandRatio, 0.2), 0.9) * 1.22);
      mediaSize = size;
      root.style.height = vertical ? `${Math.round(height * 1.6)}px` : `${height}px`;
      root.style.setProperty("--ag-media-size", `${size}px`);
      applyLayout(!firstRun);
    }

    function syncFromScroll() {
      if (!isStack()) return;
      setActive(pickStackIndex());
    }

    panels.forEach((panel, i) => {
      panel.addEventListener("mouseenter", () => {
        if (trigger === "hover") setActive(i);
      });
      panel.addEventListener("focus", () => setActive(i));
      panel.addEventListener("click", (e) => {
        if (i !== active) {
          e.preventDefault();
          setActive(i);
        }
      });
      panel.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          setActive(i + 1);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          setActive(i - 1);
        }
      });
    });

    let lastWidth = root.clientWidth;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0] && entries[0].contentRect ? entries[0].contentRect.width : root.clientWidth;
      if (Math.abs(w - lastWidth) < 8 && isStack()) return;
      lastWidth = w;
      measure();
    });
    ro.observe(root);
    measure();
    firstRun = false;
    options.onChange?.(active, items[active]);

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        syncFromScroll();
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    if (window.visualViewport) window.visualViewport.addEventListener("resize", onScroll, { passive: true });
    syncFromScroll();

    const onStackChange = () => measure();
    if (stackQuery.addEventListener) stackQuery.addEventListener("change", onStackChange);
    else if (stackQuery.addListener) stackQuery.addListener(onStackChange);

    return {
      setActive,
      next() {
        setActive(active + 1);
      },
      prev() {
        setActive(active - 1);
      },
      destroy() {
        tl?.kill();
        ro.disconnect();
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        if (window.visualViewport) window.visualViewport.removeEventListener("resize", onScroll);
        const wrap = pinWrap();
        if (wrap) {
          wrap.classList.remove("explore-accordion-wrap--pin");
          wrap.style.minHeight = "";
          wrap.style.position = "";
        }
        if (stackQuery.removeEventListener) stackQuery.removeEventListener("change", onStackChange);
        else if (stackQuery.removeListener) stackQuery.removeListener(onStackChange);
      },
    };
  }

  global.CKMAccordionGallery = { mount };
})(window);
