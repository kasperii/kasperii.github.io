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
  // Sections were later regrouped by theme; map the retired ids.
  const RENAMED = { "#section-phd": "#section-sleep", "#section-master": "#section-xr", "#section-other": "#section-personal" };
  if (location.pathname === "/" && location.hash.startsWith("#section-")) {
    location.replace("/projects/" + (RENAMED[location.hash] || location.hash));
    return;
  }
  if (location.pathname === "/projects/" && RENAMED[location.hash]) history.replaceState(history.state, "", RENAMED[location.hash]);

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
      const t0 = performance.now(), DUR = 500;
      const step = (now) => {
        const p = Math.min(1, (now - t0) / DUR);
        const e = 1 - Math.pow(1 - p, 3); // ease out: moves at once, settles softly
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
  //
  // The rainbow of light across the face also spills out past the frame,
  // above the hair and below the bottom edge, fading out with a little
  // chromatic aberration. BEAM is its colour profile across the beam (violet
  // → red, every 2px of the 300×441 photo from 30px left of the axis), measured
  // from img/me.webp as each pixel's ratio to the unlit skin beside it:
  // RGB + strength.
  const BEAM = "f0e4ff00 e4d7ff06 d5c6ff31 c3b6ff65 b2a8ff9c a39bffd1 9692fffd 8993ffff 7f9effff 79b1ffff 75c7ffff 79e1ffff 86feffeb 9bfffdaa b5ffd976 d1ffb772 e7ff9ea5 fbff87cc ffff7ad9 ffff76e4 ffea7ae3 ffd884d3 ffcc96af ffc7a984 ffcdbd55 ffdbd121 ffece800 fff8f200"
    .split(" ").map((h) => [0, 2, 4, 6].map((i) => parseInt(h.slice(i, i + 2), 16)));
  const PHOTO = { w: 300, h: 441, top: [173, 40], bottom: [165, 441], t0: -30, step: 2, reach: 150 };

  function grainBlob(fig) {
    const img = fig.querySelector("img");
    if (!img || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    fig.append(canvas);
    const ctx = canvas.getContext("2d");
    let col = null, out = null, x = 0, y = 0, r = 0, target = 0, raf = 0, inside = false;
    const R = () => col.iw * 0.55; // full blob radius, in canvas pixels

    // Beam colour at a point given in photo pixels, or null. `t` runs across
    // the beam, `s` along it from the top of the hair (negative above).
    const [ax0, ay0] = PHOTO.top, [ax1, ay1] = PHOTO.bottom;
    const len = Math.hypot(ax1 - ax0, ay1 - ay0), dx = (ax1 - ax0) / len, dy = (ay1 - ay0) / len;
    const sBottom = (PHOTO.h - ay0) / dy; // where the beam leaves the bottom edge
    const profile = (t) => {
      const f = (t - PHOTO.t0) / PHOTO.step, i = Math.floor(f), u = f - i;
      const a = BEAM[Math.max(0, Math.min(BEAM.length - 1, i))], b = BEAM[Math.max(0, Math.min(BEAM.length - 1, i + 1))];
      return a.map((v, c) => v + (b[c] - v) * u);
    };
    function beamAt(px, py) {
      const qx = px - ax0, qy = py - ay0, s = qx * dx + qy * dy, t = qx * dy - qy * dx;
      const beyond = s < 0 ? -s : s > sBottom ? s - sBottom : 0;
      if (!beyond || beyond > PHOTO.reach) return null;
      const fade = 1 - beyond / PHOTO.reach;
      const ab = 1 + beyond * 0.05, spread = 1 + beyond * 0.004; // aberration, slight widening
      const red = profile(t / spread + ab), mid = profile(t / spread), blue = profile(t / spread - ab);
      return [red[0], mid[1], blue[2], (mid[3] / 255) * fade * fade];
    }

    function prepare() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const iw = Math.round(fig.clientWidth * dpr), ih = Math.round(img.clientHeight * dpr);
      const k = iw / PHOTO.w; // canvas px per photo px
      const bx = Math.round(iw * 0.15), by = Math.round(PHOTO.reach * k); // bleed around the photo
      const W = iw + 2 * bx, H = ih + 2 * by;
      canvas.width = W; canvas.height = H;
      Object.assign(canvas.style, { left: -bx / dpr + "px", top: -by / dpr + "px", width: W / dpr + "px", height: H / dpr + "px" });
      const off = document.createElement("canvas");
      off.width = iw; off.height = ih;
      const o = off.getContext("2d");
      o.drawImage(img, 0, 0, iw, ih);
      const src = o.getImageData(0, 0, iw, ih).data;
      // col: what each canvas pixel shows when revealed; alpha = how likely.
      const c = new Uint8ClampedArray(W * H * 4);
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        const n = (j * W + i) * 4, pi = i - bx, pj = j - by;
        const inPhoto = pi >= 0 && pj >= 0 && pi < iw && pj < ih;
        const beam = beamAt(pi / k, pj / k);
        if (inPhoto) {
          const m = (pj * iw + pi) * 4, a = beam ? beam[3] : 0;
          for (let ch = 0; ch < 3; ch++) { // screen the beam over the photo
            const p = src[m + ch], b = beam ? beam[ch] : 0;
            c[n + ch] = p + (255 - p) * (b / 255) * a;
          }
          c[n + 3] = 255;
        } else if (beam) {
          c[n] = beam[0]; c[n + 1] = beam[1]; c[n + 2] = beam[2]; c[n + 3] = beam[3] * 255;
        }
      }
      col = { data: c, W, H, iw, bx, by };
      out = ctx.createImageData(W, H);
    }
    function frame() {
      r += (target - r) * 0.18;
      const s = col.data, d = out.data, w = col.W, h = col.H;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const k = (j * w + i) * 4, a = s[k + 3];
        if (!a) { d[k + 3] = 0; continue; }
        const dist = Math.hypot(i - x, j - y) / (r || 1);
        const keep = dist < 1 && Math.random() * 255 < ((1 - dist) * 1.9 - 0.15) * a;
        d[k] = s[k]; d[k + 1] = s[k + 1]; d[k + 2] = s[k + 2]; d[k + 3] = keep ? 255 : 0;
      }
      ctx.putImageData(out, 0, 0);
      if (target > 0 || r > 0.5) raf = requestAnimationFrame(frame);
      else { ctx.clearRect(0, 0, w, h); raf = 0; }
    }
    // Listen on the window: the hover area includes the bleed around the photo.
    function move(e) {
      if (e.pointerType === "touch" && e.type !== "pointerdown" && !inside) return;
      if (!col) { try { prepare(); } catch { return; } }
      const b = canvas.getBoundingClientRect();
      const over = e.clientX >= b.left && e.clientX < b.right && e.clientY >= b.top && e.clientY < b.bottom;
      if (!over) { if (inside) { inside = false; target = 0; } return; }
      inside = true;
      x = (e.clientX - b.left) * canvas.width / b.width;
      y = (e.clientY - b.top) * canvas.height / b.height;
      target = R();
      if (!raf) raf = requestAnimationFrame(frame);
    }
    const ac = new AbortController();
    addEventListener("pointermove", move, { passive: true, signal: ac.signal });
    addEventListener("pointerdown", move, { passive: true, signal: ac.signal });
    document.documentElement.addEventListener("pointerleave", () => { inside = false; target = 0; }, { signal: ac.signal });
    addEventListener("resize", () => { col = null; }, { passive: true, signal: ac.signal });
    // Stop listening once the home view is swapped out.
    new MutationObserver((_, mo) => { if (!fig.isConnected) { ac.abort(); mo.disconnect(); } })
      .observe(document.body, { childList: true, subtree: true });
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
