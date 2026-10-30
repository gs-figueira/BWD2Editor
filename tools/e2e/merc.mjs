// Merc panel check: all 10 slots render, and drag an item from the char inventory onto a merc slot.
//   node merc.mjs <save.d2s> <out-dir>
import puppeteer from "puppeteer-core";
const [save, out = "/tmp"] = process.argv.slice(2);
const browser = await puppeteer.launch({ browser: "firefox", executablePath: process.env.FIREFOX ?? "/usr/bin/firefox", headless: true });
const page = await browser.newPage(); const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
await page.setViewport({ width: 1400, height: 1500 });
await page.goto(process.env.EDITOR_URL ?? "http://localhost:8088/", { waitUntil: "networkidle0" });
await (await page.$("#d2sFile")).uploadFile(save);
await new Promise((r) => setTimeout(r, 3000));
const slots = await page.evaluate(() => [...document.querySelectorAll(".merc-inventory .equipped > span")].map((s) => `${s.className}:${s.querySelector("img") ? "item" : "empty"}`));
console.log("merc slots:", slots.join(" | "));
// drag the char's ring (slot 6) and amulet (slot 2) onto the merc's ring / amulet slots
const dnd = async (fromSel, toSel) => page.evaluate((fromSel, toSel) => {
  const src = document.querySelector(fromSel), dst = document.querySelector(toSel);
  if (!src || !dst) return `missing ${!src ? fromSel : toSel}`;
  const dt = new DataTransfer();
  src.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: dt }));
  dst.dispatchEvent(new DragEvent("dragenter", { bubbles: true, dataTransfer: dt }));
  dst.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: dt }));
  return "ok";
}, fromSel, toSel);
console.log("ring ->", await dnd(".inventory:not(.merc-inventory) .right-finger [draggable], .inventory:not(.merc-inventory) .right-finger .item, .inventory:not(.merc-inventory) .right-finger [tabindex]", ".merc-inventory .right-finger"));
console.log("amulet ->", await dnd(".inventory:not(.merc-inventory) .neck [tabindex]", ".merc-inventory .neck"));
await new Promise((r) => setTimeout(r, 800));
const after = await page.evaluate(() => [...document.querySelectorAll(".merc-inventory .equipped > span")].map((s) => `${s.className.split(" ")[0]}:${s.querySelector("img") ? "item" : "-"}`).join(" "));
console.log("merc after:", after);
console.log("char ring/neck after:", await page.evaluate(() => ["right-finger", "neck"].map((c) => c + ":" + (document.querySelector(`.inventory:not(.merc-inventory) .${c} img`) ? "item" : "-")).join(" ")));
// write the save in-page and re-read it with d2s to prove it serializes
console.log("re-read:", await page.evaluate(async () => {
  const vm = document.querySelector("#app").__vue_app__._instance.proxy;
  const bytes = await d2s.write(vm.save);
  const back = await d2s.read(bytes);
  return JSON.stringify({ merc: back.merc_items.map((i) => `${i.type}@${i.equipped_id}`), charEquipped: back.items.filter((i) => i.location_id === 1).map((i) => `${i.type}@${i.equipped_id}`) });
}));
await page.screenshot({ path: `${out}/merc.png`, fullPage: true });
console.log(errs.length ? "errors: " + errs.join("; ") : "no page errors");
await browser.close();
