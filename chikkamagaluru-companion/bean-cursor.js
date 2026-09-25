/* Roasted-bean pointer, fine pointers only. */
(function () {
  "use strict";
  if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.add("bean-cursor-static");
    return;
  }

  var src = "assets/cursor-roast-bean.svg";
  var el = document.createElement("img");
  el.src = src;
  el.alt = "";
  el.width = 36;
  el.height = 36;
  el.className = "bean-cursor";
  el.setAttribute("aria-hidden", "true");
  document.documentElement.classList.add("has-bean-cursor");
  document.body.appendChild(el);

  var x = window.innerWidth / 2;
  var y = window.innerHeight / 2;
  var cx = x;
  var cy = y;
  var angle = -28;
  var hovering = false;

  function isInteractive(node) {
    if (!node || node === document || node === document.documentElement) return false;
    if (node.closest && node.closest("a, button, [role='button'], input, textarea, select, label, .chip, summary")) return true;
    return false;
  }

  window.addEventListener(
    "pointermove",
    function (e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      hovering = isInteractive(e.target);
      el.classList.toggle("is-hot", hovering);
    },
    { passive: true }
  );

  function tick() {
    cx += (x - cx) * 0.28;
    cy += (y - cy) * 0.28;
    var dx = x - cx;
    var dy = y - cy;
    var speed = Math.min(18, Math.hypot(dx, dy));
    angle = -28 + dx * 0.35 + speed * 0.4;
    el.style.transform =
      "translate3d(" + (cx - 18) + "px," + (cy - 18) + "px,0) rotate(" + angle + "deg) scale(" + (hovering ? 1.18 : 1) + ")";
    requestAnimationFrame(tick);
  }
  tick();
})();
