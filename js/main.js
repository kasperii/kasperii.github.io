// Site behaviour: menu toggle, scroll-driven logo, project "work belts".
// No dependencies. Loaded with `defer`, so the DOM is ready when this runs.

(() => {
  const root = document.documentElement;

  // ---- Menu -------------------------------------------------------------
  // All visual state (overlay, colours, hamburger morph) lives in CSS under
  // `.menu-open`; JS only flips the class and the ARIA state.
  const menuButton = document.querySelector(".hamburgerbutton");
  const menu = document.getElementById("myMenu");

  function setMenu(open) {
    root.classList.toggle("menu-open", open);
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  menuButton.addEventListener("click", () => setMenu(!root.classList.contains("menu-open")));
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  // ---- Scroll-driven logo ------------------------------------------------
  // The header monogram is four copies of the same path; scrolling slides
  // them past each other. Elements are looked up once inside the header logo
  // (previously a class-name lookup that broke after opening the menu).
  const logo = document.querySelector(".logo svg");
  if (logo) {
    const [top, bottom, back1, back2] = ["toplogo", "bottomlogo", "logobackground1", "logobackground2"]
      .map((c) => logo.querySelector("." + c));
    let queued = false;
    const draw = () => {
      queued = false;
      const s = Math.floor((window.scrollY * 15) / 2 % 700);
      const half = 1 - Math.abs(2 * (s / 700 - 0.5));
      top.style.transform = `translate(0px,-${s}px)`;
      bottom.style.transform = `translate(0px,${700 - s}px)`;
      back1.style.transform = `translate(0px,${-700 - 200 * half}px)`;
      back2.style.transform = `translate(0px,${700 + 200 * half}px)`;
    };
    window.addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(draw); } }, { passive: true });
  }

  // ---- Work belts --------------------------------------------------------
  // Each section's `.work-belt` holds a thumbnail grid and a project panel
  // side by side; opening a project slides the belt left (CSS transition on
  // `.is-open`). Thumbnails link to the standalone project pages
  // (/work/<name>/); on the home page we fetch that page, show its
  // `.project-body` in the panel and push its URL, so links are shareable and
  // the browser's back button closes the panel.
  const SLIDE_MS = 800;
  const homeTitle = document.title;
  if (!document.querySelector(".work-belt")) return; // project pages: nothing more to wire up

  // `instant` skips the slide so the page height settles immediately (needed
  // before scrolling elsewhere, or the collapsing panel shifts the target).
  function closeBelt(belt, instant = false) {
    if (!belt.classList.contains("is-open")) return;
    belt.classList.remove("is-open");
    const panel = belt.querySelector(".work-container");
    if (instant) panel.hidden = true;
    else setTimeout(() => { if (!belt.classList.contains("is-open")) panel.hidden = true; }, SLIDE_MS);
  }

  // innerHTML does not execute <script> tags (CodePen embeds need them), so
  // re-create each one as a live element.
  function runScripts(container) {
    container.querySelectorAll("script").forEach((old) => {
      const s = document.createElement("script");
      [...old.attributes].forEach((a) => s.setAttribute(a.name, a.value));
      s.textContent = old.textContent;
      old.replaceWith(s);
    });
  }

  const closeAll = (instant = false) =>
    document.querySelectorAll(".work-belt.is-open").forEach((b) => closeBelt(b, instant));
  const thumbFor = (path) =>
    [...document.querySelectorAll(".thumb-unit")].find((a) => new URL(a.href).pathname === path);

  async function openProject(thumb, { push = true } = {}) {
    const belt = thumb.closest(".work-belt");
    document.querySelectorAll(".work-belt.is-open").forEach((b) => b !== belt && closeBelt(b));

    const url = new URL(thumb.href);
    const title = thumb.querySelector("strong").textContent;
    if (push) history.pushState({ project: url.pathname }, "", url.pathname);
    document.title = `${title} | ${homeTitle.split(" | ")[0]}`;

    const panel = belt.querySelector(".work-container");
    const body = panel.querySelector(".project-load");
    panel.querySelector(".project-title").textContent = title;
    body.innerHTML = '<div class="loader">Loading...</div>';
    panel.hidden = false;
    requestAnimationFrame(() => belt.classList.add("is-open"));

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.status);
      const page = new DOMParser().parseFromString(await res.text(), "text/html");
      body.innerHTML = page.querySelector(".project-body").innerHTML;
      runScripts(body);
    } catch {
      body.innerHTML = `<p>Couldn't load this project. <a href="${url.pathname}">Open it directly</a>.</p>`;
    }
    panel.querySelector(".work-return").focus({ preventScroll: true });
  }

  document.addEventListener("click", (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // let "open in new tab" work

    const thumb = e.target.closest(".thumb-unit");
    if (thumb) {
      e.preventDefault();
      openProject(thumb);
      return;
    }

    if (e.target.closest(".work-return")) {
      // Opened via pushState -> go back (popstate closes it); otherwise just close.
      if (history.state && history.state.project) history.back();
      else closeAll();
      return;
    }

    // Menu links point at "/#section-…"; while a project URL is showing, keep
    // it a same-page jump instead of a full reload.
    const link = e.target.closest('a[href*="#section-"]');
    const target = link && document.getElementById(link.hash.slice(1));
    if (target && location.pathname !== "/") {
      e.preventDefault();
      closeAll(true);
      history.pushState(null, "", "/" + link.hash);
      document.title = homeTitle;
      target.scrollIntoView();
    }
  });

  window.addEventListener("popstate", (e) => {
    const thumb = e.state && e.state.project && thumbFor(e.state.project);
    if (thumb) {
      openProject(thumb, { push: false });
    } else {
      closeAll();
      document.title = homeTitle;
    }
  });
})();
