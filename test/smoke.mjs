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
const panelState = () => run(() => {
  const open = [...document.querySelectorAll(".work-belt.is-open")];
  return { path: location.pathname, open: open.map((b) => b.closest("section").id),
    visible: open.map((b) => { const p = b.querySelector(".work-container"); return !p.hidden && getComputedStyle(p).display !== "none" && p.getBoundingClientRect().left < innerWidth; }) };
});

await viewport(1280, 900);
await goto("", 2500);

await check("CSS and JS URLs carry a cache-busting ?v=", async () => {
  const urls = await run(() => [...document.querySelectorAll('link[rel=stylesheet], script[src]')].map((e) => e.getAttribute("href") || e.getAttribute("src")).filter((u) => !/^https?:/.test(u)));
  assert(urls.length >= 2 && urls.every((u) => /\?v=\d+/.test(u)), "unversioned: " + urls.join(", "));
  return urls.join(" ");
});

await check("fonts load and layout CSS is applied", async () => {
  const r = await run(async () => {
    await document.fonts.ready;
    const t = document.querySelector(".thumb-unit"), img = t.querySelector("img"), me = document.querySelector(".mypicture img");
    return { fonts: [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family),
      thumbSquare: Math.abs(t.offsetWidth - t.offsetHeight) <= 2, imgFills: img.offsetWidth === t.offsetWidth && img.offsetHeight === t.offsetHeight,
      portraitRatio: +(me.offsetHeight / me.offsetWidth).toFixed(2), menuHidden: getComputedStyle(document.getElementById("myMenu")).display === "none" };
  });
  assert(["Iosevka", "Urbesc", "Druk Wide"].every((f) => r.fonts.includes(f)), "fonts loaded: " + r.fonts);
  assert(r.thumbSquare && r.imgFills, "thumbnails are not square tiles filled by their image");
  assert(Math.abs(r.portraitRatio - 1.47) < 0.05, "portrait is distorted, ratio " + r.portraitRatio);
  assert(r.menuHidden, "menu overlay visible on load");
  return `fonts ok, thumbnails square, portrait ratio ${r.portraitRatio}`;
});
await shot("home-desktop");

await check("every project page, thumbnail and image resolves", async () => {
  const r = await run(async () => {
    const bad = []; let imgs = 0; const links = [...document.querySelectorAll(".thumb-unit")];
    for (const a of links) {
      const res = await fetch(a.href);
      if (!res.ok) { bad.push("page " + a.pathname); continue; }
      const doc = new DOMParser().parseFromString(await res.text(), "text/html");
      if (!doc.querySelector(".project-body")) bad.push("no .project-body in " + a.pathname);
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

await check("clicking a thumbnail opens its project panel and changes the URL", async () => {
  const href = await run(() => { const a = document.querySelector("#section-phd .thumb-unit"); scrollTo(0, a.closest("section").offsetTop); a.click(); return new URL(a.href).pathname; });
  await sleep(1800);
  const s = await panelState();
  const filled = await run(() => document.querySelector("#section-phd .project-load").textContent.trim().length > 20);
  assert(s.path === href, `URL is ${s.path}, expected ${href}`);
  assert(s.open[0] === "section-phd" && s.visible[0], "panel not visible: " + JSON.stringify(s));
  assert(filled, "panel has no content");
  return href;
});
await shot("project-panel");

await check("browser Back closes the panel, Forward reopens it", async () => {
  await run(() => history.back()); await sleep(1200);
  const a = await panelState();
  await run(() => history.forward()); await sleep(1500);
  const b = await panelState();
  assert(a.path === "/" && a.open.length === 0, "after Back: " + JSON.stringify(a));
  assert(b.path.startsWith("/work/") && b.visible[0], "after Forward: " + JSON.stringify(b));
});

await check("panel back button closes it", async () => {
  await run(() => document.querySelector(".work-belt.is-open .work-return").click()); await sleep(1200);
  const s = await panelState();
  assert(s.path === "/" && s.open.length === 0, JSON.stringify(s));
});

await check("menu opens, and a menu link closes it and scrolls to the section", async () => {
  await run(() => document.querySelector(".hamburgerbutton").click()); await sleep(400);
  const open = await run(() => getComputedStyle(document.getElementById("myMenu")).display);
  await run(() => document.querySelector('#menulinks a[href$="#section-master"]').click()); await sleep(1500);
  const r = await run(() => ({ cls: document.documentElement.className, top: Math.round(document.getElementById("section-master").getBoundingClientRect().top) }));
  assert(open === "block", "menu did not open");
  assert(!r.cls.includes("menu-open") && Math.abs(r.top - 50) < 20, JSON.stringify(r));
});

await check("standalone project page renders", async () => {
  const path = await run(() => new URL(document.querySelector(".thumb-unit").href).pathname);
  await goto(path);
  const r = await run(() => ({ title: document.querySelector(".project-title")?.textContent, body: document.querySelector(".project-body")?.textContent.trim().length, cls: document.body.className }));
  assert(r.title && r.body > 20 && r.cls.includes("project-page"), JSON.stringify(r));
  return path;
});

await check("mobile layout: no horizontal overflow", async () => {
  await viewport(390, 844, true); await goto("", 2000);
  const r = await run(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth }));
  assert(r.sw <= r.w + 1, `page is ${r.sw}px wide in a ${r.w}px viewport`);
});
await shot("home-mobile");

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
