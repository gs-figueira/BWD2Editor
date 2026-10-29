// Editor smoke test: load a save, check grids, context menu on the inventory,
// item editor fields for a magic armor and a ring, and report page errors.
//
//   (dev server running on :8088)  cd tools/e2e && npm install && node smoke.mjs [save.d2s] [out-dir]
import puppeteer from "puppeteer-core";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const save = process.argv[2] || `${root}/reference/saves/PracticeSorc.d2s`;
const out = process.argv[3] || "/tmp";
const url = process.env.EDITOR_URL ?? "http://localhost:8088/";
// pre-existing upstream warnings, not regressions
const known = /Feature flag|tippy|already defined in Methods|"onEvent" was accessed|Invalid prop: type check failed for prop "items"/;

const browser = await puppeteer.launch({ browser: "firefox", executablePath: process.env.FIREFOX ?? "/usr/bin/firefox", headless: true });
const page = await browser.newPage();
const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
page.on("console", (m) => { if (["error", "warn"].includes(m.type()) && !known.test(m.text())) problems.push(`${m.type()}: ${m.text().slice(0, 300)}`); });
await page.setViewport({ width: 1400, height: 1300 });
await page.goto(url, { waitUntil: "networkidle0" });
await (await page.$("#d2sFile")).uploadFile(save);
await new Promise((r) => setTimeout(r, 3000));

const results = {};
results.grids = await page.evaluate(() => [...document.querySelectorAll(".d2p-InventoryGrid")].map((g) => g.className.match(/w-\d+ h-\d+/)?.[0]));

const inv = (await page.$$(".equippedInventoryGrid img"))[0];
if (inv) {
  await inv.click({ button: "right" });
  await new Promise((r) => setTimeout(r, 400));
  results.inventoryContextMenu = await page.evaluate(() => [...document.querySelectorAll("*")].some((e) => /^Select$/.test(e.textContent.trim()) && e.offsetParent !== null));
  await page.mouse.click(1300, 1250);
}

const editorFields = async (sel) => {
  const el = (await page.$$(sel))[0];
  if (!el) return null;
  await el.click();
  await new Promise((r) => setTimeout(r, 1000));
  return page.evaluate(() => ({
    options: [...document.querySelectorAll(".item-options > span > li > label, .item-options > li > label")].map((l) => l.textContent.trim()),
    stats: [...document.querySelectorAll(".item-stats .multiselect-single-label")].map((e) => e.textContent.trim()),
  }));
};
results.torso = await editorFields(".torso img");
results.ring = await editorFields(".right-finger img");
await page.screenshot({ path: `${out}/bwd2editor-smoke.png`, fullPage: true });
await browser.close();

console.log(JSON.stringify(results, null, 2));
console.log(problems.length ? `PROBLEMS:\n${problems.join("\n")}` : "no page errors");
console.log(`screenshot: ${out}/bwd2editor-smoke.png`);
process.exit(problems.length ? 1 : 0);
