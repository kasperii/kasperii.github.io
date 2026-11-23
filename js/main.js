// Site behaviour. No dependencies; loaded with `defer`.
//
// Every page is a real Jekyll page with its content in <main id="view">.
// Clicking an internal link fetches the target page and swaps #view in place
// (pushState), so the logo stays put and nothing reloads; Back/Forward and
// direct links work the same way. Between two Projects views (/projects/ and
// /work/<name>/) only the affected section's right column is swapped, which
// is how a project "opens" next to its section.

(() => {
  // Old links to the one-page site (/#section-phd) now live on /projects/.
  if (location.pathname === "/" && location.hash.startsWith("#section-")) {
    location.replace("/projects/" + location.hash);
    return;
  }

  // ---- Scroll-driven logo ------------------------------------------------
  const logo = document.querySelector(".logo svg");
  if (logo) {
    const [top, bottom, back1, back2] = ["toplogo", "bottomlogo", "logobackground1", "logobackground2"]
      .map((c) => logo.querySelector("." + c));
    const drawAt = (s) => {
      const half = 1 - Math.abs(2 * (s / 700 - 0.5));
      top.style.transform = `translate(0px,-${s}px)`;
      bottom.style.transform = `translate(0px,${700 - s}px)`;
      back1.style.transform = `translate(0px,${-700 - 200 * half}px)`;
      back2.style.transform = `translate(0px,${700 + 200 * half}px)`;
    };
    let queued = false, spinning = false;
    const draw = () => { queued = false; if (!spinning) drawAt(Math.floor((window.scrollY * 15) / 2 % 700)); };
    window.addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(draw); } }, { passive: true });

    // Clicking the logo plays one full cycle of the scroll animation, then
    // hands back to the scroll position (navigation home happens alongside).
    logo.closest("a").addEventListener("click", () => {
      if (spinning || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      spinning = true;
      const t0 = performance.now(), DUR = 900;
      const step = (now) => {
        const p = Math.min(1, (now - t0) / DUR);
        const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; // ease in-out
        drawAt(Math.floor(e * 699));
        if (p < 1) requestAnimationFrame(step);
        else { spinning = false; draw(); }
      };
      requestAnimationFrame(step);
    });
  }

  // ---- Per-view setup (runs on load and after every swap) -----------------
  const FOLD = "fold:";
  function setupView(view) {
    // Folded sections are remembered per visitor; an open project's section stays open.
    view.querySelectorAll("details[data-fold]").forEach((d) => {
      try {
        const v = localStorage.getItem(FOLD + d.dataset.fold);
        if (v !== null && !d.querySelector(".panel")) d.open = v === "1";
      } catch {}
      d.addEventListener("toggle", () => { try { localStorage.setItem(FOLD + d.dataset.fold, d.open ? "1" : "0"); } catch {} });
    });
    const p = view.querySelector(".portrait");
    if (p) grainBlob(p);
  }

  // Portrait: a grainy blob of the colour photo follows the pointer over the
  // black-and-white one. Each frame keeps a colour pixel with a probability
  // that falls off from the pointer, so the edge dithers like film grain.
  function grainBlob(fig) {
    const img = fig.querySelector("img");
    if (!img || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    fig.append(canvas);
    const ctx = canvas.getContext("2d");
    let src = null, out = null, x = 0, y = 0, r = 0, target = 0, raf = 0;
    const R = () => canvas.width * 0.55; // full blob radius, in canvas pixels
    function prepare() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(fig.clientWidth * dpr);
      canvas.height = Math.round(img.clientHeight * dpr);
      const off = document.createElement("canvas");
      off.width = canvas.width; off.height = canvas.height;
      const o = off.getContext("2d");
      o.drawImage(img, 0, 0, off.width, off.height);
      src = o.getImageData(0, 0, off.width, off.height);
      out = ctx.createImageData(off.width, off.height);
    }
    function frame() {
      r += (target - r) * 0.18;
      const s = src.data, d = out.data, w = canvas.width, h = canvas.height;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const k = (j * w + i) * 4, dist = Math.hypot(i - x, j - y) / (r || 1);
        const keep = dist < 1 && Math.random() < (1 - dist) * 1.9 - 0.15;
        d[k] = s[k]; d[k + 1] = s[k + 1]; d[k + 2] = s[k + 2]; d[k + 3] = keep ? 255 : 0;
      }
      ctx.putImageData(out, 0, 0);
      if (target > 0 || r > 0.5) raf = requestAnimationFrame(frame);
      else { ctx.clearRect(0, 0, w, h); raf = 0; }
    }
    function move(e) {
      if (!src) { try { prepare(); } catch { return; } }
      const b = canvas.getBoundingClientRect();
      x = (e.clientX - b.left) * canvas.width / b.width;
      y = (e.clientY - b.top) * canvas.height / b.height;
      target = R();
      if (!raf) raf = requestAnimationFrame(frame);
    }
    fig.addEventListener("pointerenter", move);
    fig.addEventListener("pointermove", move);
    fig.addEventListener("pointerleave", () => { target = 0; });
    addEventListener("resize", () => { src = null; }, { passive: true });
  }

  // innerHTML/importNode don't execute <script> (CodePen embeds need it).
  function runScripts(container) {
    container.querySelectorAll("script").forEach((old) => {
      const s = document.createElement("script");
      [...old.attributes].forEach((a) => s.setAttribute(a.name, a.value));
      s.textContent = old.textContent;
      old.replaceWith(s);
    });
  }

  function scrollToHash(hash) {
    const el = hash && document.getElementById(decodeURIComponent(hash.slice(1)));
    if (el) { if (el.tagName === "DETAILS") el.open = true; el.scrollIntoView(); }
    return !!el;
  }

  // ---- Navigation ---------------------------------------------------------
  const pages = new Map(); // pathname -> Promise<Document>
  const load = (path) => {
    if (!pages.has(path)) {
      pages.set(path, fetch(path).then((r) => {
        if (!r.ok) throw new Error(r.status);
        return r.text();
      }).then((t) => new DOMParser().parseFromString(t, "text/html")));
      pages.get(path).catch(() => pages.delete(path));
    }
    return pages.get(path);
  };

  const isView = (url) => url.origin === location.origin &&
    (/^\/(projects|timeline|publications|speaking)\/$/.test(url.pathname) || url.pathname === "/" || /^\/work\/[^/]+\/$/.test(url.pathname));

  // Remember where we were, so Back restores the scroll position.
  const saveScroll = () => history.replaceState({ ...history.state, y: scrollY }, "");

  async function go(url, { push = true, y = null } = {}) {
    let doc;
    try { doc = await load(url.pathname); } catch { location.href = url.href; return; }
    const next = doc.getElementById("view");
    if (!next) { location.href = url.href; return; }

    const view = document.getElementById("view");
    const from = location.pathname;
    if (push) { saveScroll(); history.pushState({ prev: from }, "", url.pathname + url.hash); }
    document.title = doc.title;

    if (view.dataset.view === "projects" && next.dataset.view === "projects") {
      // Swap only the sections whose right column changes (a project opens/closes).
      let opened = null;
      view.querySelectorAll(".work-area").forEach((area) => {
        const sec = area.closest("details");
        const fresh = next.querySelector(`#${sec.id} .work-area`);
        if (area.dataset.open === fresh.dataset.open) return;
        const copy = document.importNode(fresh, true);
        area.replaceWith(copy);
        runScripts(copy);
        if (copy.dataset.open) { sec.open = true; opened = sec; }
      });
      if (y !== null) scrollTo(0, y);
      else if (opened) {
        opened.querySelector(".panel-close").focus({ preventScroll: true });
        if (opened.getBoundingClientRect().top < 0) opened.scrollIntoView();
      } else if (!scrollToHash(url.hash)) {
        const back = from.startsWith("/work/") && view.querySelector(`.thumb[href="${from}"]`);
        if (back) { back.focus({ preventScroll: true }); if (back.getBoundingClientRect().top < 0) back.scrollIntoView({ block: "center" }); }
      }
      return;
    }

    const copy = document.importNode(next, true);
    view.replaceWith(copy);
    document.body.className = doc.body.className;
    runScripts(copy);
    setupView(copy);
    if (y !== null) scrollTo(0, y);
    else if (!scrollToHash(url.hash)) scrollTo(0, 0);
  }

  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const a = e.target.closest("a[href]");
    if (!a || a.target || a.hasAttribute("download")) return;
    const url = new URL(a.href);
    if (!isView(url)) return;
    // Same page, just a hash: let the browser jump (but unfold the section).
    if (url.pathname === location.pathname && url.hash) { scrollToHash(url.hash); return; }
    e.preventDefault();
    // Closing a project you opened from /projects/ = going back, so the
    // history doesn't fill up with open/close pairs.
    if (a.classList.contains("panel-close") && history.state && history.state.prev === "/projects/") { history.back(); return; }
    go(url);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { const c = document.querySelector(".panel-close"); if (c) c.click(); }
  });

  history.scrollRestoration = "manual";
  window.addEventListener("popstate", (e) => go(new URL(location.href), { push: false, y: e.state && e.state.y != null ? e.state.y : null }));

  // Warm the cache on hover/focus so views swap instantly.
  const warm = (e) => { const a = e.target.closest && e.target.closest("a[href]"); if (a) { const u = new URL(a.href); if (isView(u) && u.pathname !== location.pathname) load(u.pathname); } };
  document.addEventListener("pointerover", warm, { passive: true });
  document.addEventListener("focusin", warm);

  const first = document.getElementById("view");
  pages.set(location.pathname, Promise.resolve(document.cloneNode(true)));
  setupView(first);
  if (location.hash) scrollToHash(location.hash);
})();
