// Smoke test for the site, run in headless Chrome. No npm dependencies.
//
//   bundle exec jekyll serve            # in one terminal
//   node test/smoke.mjs                 # tests http://127.0.0.1:4000/
//   node test/smoke.mjs https://kasperii.github.io/   # after deploying
//
// Run it before every push. Exits non-zero if anything fails.
// Set SHOTS=<dir> to also save desktop/mobile screenshots for a visual check.

import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = (process.argv[2] || "http://127.0.0.1:4000/").replace(/\/?$/, "/");
const CHROME = process.env.CHROME || [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
].find((p) => existsSync(p));
if (!CHROME) { console.error("Chrome not found; set CHROME=/path/to/chrome"); process.exit(2); }

// ---- tiny DevTools-protocol driver ---------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9400 + Math.floor(Math.random() * 400);
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars",
  `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "smoke-"))}`, "about:blank"], { stdio: "ignore" });
let target;
for (let i = 0; i < 50 && !target; i++) {
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch {}
  if (!target) await sleep(200);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let seq = 0; const pending = new Map(); const pageErrors = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  if (m.method === "Runtime.exceptionThrown") pageErrors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === "Network.responseReceived") {
    const { status, url } = m.params.response;
    if (status >= 400 && url.startsWith(new URL(BASE).origin)) pageErrors.push(`HTTP ${status} ${url}`);
  }
});
const send = (method, params = {}) => new Promise((r) => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const run = async (fn, ...args) => {
  const r = await send("Runtime.evaluate", { expression: `(${fn})(...${JSON.stringify(args)})`, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const goto = async (path, settle = 1500) => { await send("Page.navigate", { url: new URL(path, BASE).href }); await sleep(settle); };
const viewport = (w, h, mobile = false) => send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile });
const shot = async (name) => {
  if (!process.env.SHOTS) return;
  const r = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(process.env.SHOTS, name + ".png"), Buffer.from(r.data, "base64"));
};
await send("Runtime.enable"); await send("Network.enable"); await send("Page.enable");
await send("Network.setCacheDisabled", { cacheDisabled: true });

// ---- checks ------------------------------------------------------------------
const results = [];
async function check(name, fn) {
  try { const detail = await fn(); results.push([true, name, detail]); }
  catch (e) { results.push([false, name, e.message]); }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
// A marker on window survives in-page view swaps but not a real page load.
const mark = () => run(() => { window.__noReload = true; });
const reloaded = async () => !(await run(() => window.__noReload === true));
const clickLink = (sel) => run((s) => { const a = document.querySelector(s); if (!a) throw new Error("no " + s); a.click(); }, sel);
const state = () => run(() => ({
  path: location.pathname, view: document.getElementById("view")?.dataset.view, title: document.title,
  open: [...document.querySelectorAll(".panel")].map((p) => p.closest("details").id),
}));

await viewport(1280, 900);
await goto("", 2500);

await check("CSS and JS URLs carry a cache-busting ?v=", async () => {
  const urls = await run(() => [...document.querySelectorAll('link[rel=stylesheet], script[src]')].map((e) => e.getAttribute("href") || e.getAttribute("src")).filter((u) => !/^https?:/.test(u)));
  assert(urls.length >= 2 && urls.every((u) => /\?v=\d+/.test(u)), "unversioned: " + urls.join(", "));
  return urls.join(" ");
});

await check("home: fonts, name in Urbscape, portrait, link row", async () => {
  const r = await run(async () => {
    await document.fonts.ready;
    const me = document.querySelector(".portrait .bw"), name = document.querySelector(".name");
    return { fonts: [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family),
      nameFont: getComputedStyle(name).fontFamily, bw: getComputedStyle(me).filter,
      portraitRatio: +(me.offsetHeight / me.offsetWidth).toFixed(2),
      links: [...document.querySelectorAll(".links a")].map((a) => a.textContent.trim()) };
  });
  assert(["Iosevka", "Urbscape", "Instrument Sans"].every((f) => r.fonts.includes(f)), "fonts loaded: " + r.fonts);
  assert(/Urbscape/.test(r.nameFont), "name font " + r.nameFont);
  assert(/grayscale/.test(r.bw), "portrait not black and white");
  assert(Math.abs(r.portraitRatio - 1.47) < 0.05, "portrait is distorted, ratio " + r.portraitRatio);
  assert(r.links.join() === "Projects,Timeline,Publications,Speaking,Email", "links: " + r.links);
  return `portrait ratio ${r.portraitRatio}`;
});
await shot("home-desktop");

await check("link row opens each view in place, logo returns home, no reloads", async () => {
  await mark();
  const seen = [];
  for (const [label, path, view] of [["Timeline", "/timeline/", "timeline"], ["Publications", "/publications/", "publications"], ["Speaking", "/speaking/", "speaking"], ["Projects", "/projects/", "projects"]]) {
    await clickLink(`.links a[href="${path}"]`); await sleep(900);
    const s = await state();
    assert(s.path === path && s.view === view, `${label}: ${JSON.stringify(s)}`);
    if (view === "publications" || view === "speaking") assert(await run(() => document.querySelectorAll(".row").length > 0), `${label} list is empty`);
    seen.push(label);
    if (view !== "projects") { await clickLink(".logo"); await sleep(700); const h = await state(); assert(h.path === "/" && h.view === "home", "logo: " + JSON.stringify(h)); }
  }
  assert(!(await reloaded()), "a full page load happened");
  return seen.join(", ");
});
await shot("projects");

await check("every project page, thumbnail and image resolves", async () => {
  const r = await run(async () => {
    const bad = []; let imgs = 0; const links = [...document.querySelectorAll(".thumb")];
    for (const a of links) {
      const res = await fetch(a.href);
      if (!res.ok) { bad.push("page " + a.pathname); continue; }
      const doc = new DOMParser().parseFromString(await res.text(), "text/html");
      if (!doc.querySelector(".panel .project-body")) bad.push("no open .project-body in " + a.pathname);
      const srcs = [a.querySelector("img").getAttribute("src"), ...[...doc.querySelectorAll(".project-body img")].map((i) => i.getAttribute("src"))];
      for (const s of srcs) {
        const u = new URL(s, a.href); if (u.origin !== location.origin) continue; imgs++;
        if (!(await fetch(u, { method: "HEAD" })).ok) bad.push(a.pathname + " -> " + u.pathname);
      }
    }
    return { pages: links.length, imgs, bad };
  });
  assert(r.pages > 0 && r.bad.length === 0, r.bad.join("; ") || "no projects found");
  return `${r.pages} projects, ${r.imgs} images`;
});

await check("clicking a thumbnail opens the project in its section's right column", async () => {
  const href = await run(() => { const a = document.querySelector("#section-sleep .thumb"); a.click(); return new URL(a.href).pathname; });
  await sleep(1200);
  const s = await state();
  const r = await run(() => {
    const sec = document.getElementById("section-sleep"), panel = sec.querySelector(".panel"), intro = sec.querySelector(".sec-intro");
    return { grid: !!sec.querySelector(".grid"), text: panel?.querySelector(".project-body").textContent.trim().length,
      rightOfIntro: panel && panel.getBoundingClientRect().left > intro.getBoundingClientRect().right };
  });
  assert(s.path === href && s.open.join() === "section-sleep", JSON.stringify(s));
  assert(!r.grid && r.text > 20 && r.rightOfIntro, JSON.stringify(r));
  assert(!(await reloaded()), "page reloaded");
  return href;
});
await shot("project-open");

await check("browser Back closes the project, Forward reopens it", async () => {
  await run(() => history.back()); await sleep(900);
  const a = await state();
  await run(() => history.forward()); await sleep(900);
  const b = await state();
  assert(a.path === "/projects/" && a.open.length === 0, "after Back: " + JSON.stringify(a));
  assert(b.path.startsWith("/work/") && b.open.length === 1, "after Forward: " + JSON.stringify(b));
});

await check("Close button closes the project", async () => {
  await clickLink(".panel-close"); await sleep(900);
  const s = await state();
  assert(s.path === "/projects/" && s.open.length === 0, JSON.stringify(s));
});

await check("sections fold and unfold, and remember it", async () => {
  await clickLink("#section-netlight > summary"); await sleep(200);
  const folded = await run(() => !document.getElementById("section-netlight").open);
  await goto("projects/", 1500);
  const still = await run(() => !document.getElementById("section-netlight").open);
  await clickLink("#section-netlight > summary"); await sleep(200);
  const again = await run(() => document.getElementById("section-netlight").open);
  assert(folded && still && again, JSON.stringify({ folded, still, again }));
});

await check("a shared /work/<name>/ link loads with the project open", async () => {
  await goto("work/kintsugi-vr/", 1500);
  const s = await state();
  assert(s.view === "projects" && s.open.join() === "section-xr" && /Kintsugi/.test(s.title), JSON.stringify(s));
});

await check("old /#section-… links land on the Projects view", async () => {
  await goto("#section-master", 2000); // retired id, maps to #section-xr
  const r = await run(() => ({ path: location.pathname, hash: location.hash, top: Math.round(document.getElementById("section-xr").getBoundingClientRect().top) }));
  assert(r.path === "/projects/" && r.hash === "#section-xr" && Math.abs(r.top - 64) < 30, JSON.stringify(r));
});

await check("landing page fits one screen without scrolling", async () => {
  const bad = [];
  for (const [w, h, m] of [[1440, 900], [1280, 720], [390, 844, true], [375, 667, true]]) {
    await viewport(w, h, m); await goto("", 1200);
    const r = await run(async () => { await document.fonts.ready; return { sh: document.documentElement.scrollHeight, ih: innerHeight }; });
    if (r.sh > r.ih + 1) bad.push(`${w}×${h}: page is ${r.sh}px tall`);
    if (w === 1280) await shot("home-1280x720");
    if (w === 375) await shot("home-375x667");
  }
  await viewport(1280, 900);
  assert(bad.length === 0, bad.join("; "));
});

await check("mobile layout: no horizontal overflow (home, projects, open project)", async () => {
  await viewport(390, 844, true);
  const out = [];
  for (const p of ["", "projects/", "work/awari/", "publications/"]) {
    await goto(p, 1500);
    const r = await run(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth }));
    if (r.sw > r.w + 1) out.push(`/${p} is ${r.sw}px wide`);
    if (p === "") await shot("home-mobile");
    if (p === "work/awari/") await shot("project-mobile");
  }
  assert(out.length === 0, out.join("; "));
});

await check("no JavaScript errors or broken same-site requests", async () => {
  assert(pageErrors.length === 0, pageErrors.join("\n"));
});

// ---- report --------------------------------------------------------------------
ws.close(); chrome.kill();
console.log(`Smoke test: ${BASE}`);
for (const [ok, name, detail] of results) console.log(`${ok ? "  ✓" : "  ✗"} ${name}${detail ? "  — " + detail : ""}`);
const failed = results.filter((r) => !r[0]).length;
console.log(failed ? `\n${failed} check(s) FAILED - do not push.` : "\nAll checks passed.");
process.exit(failed ? 1 : 0);
