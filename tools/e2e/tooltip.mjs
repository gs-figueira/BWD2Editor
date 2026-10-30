// Hover an item and screenshot its tooltip:  node tooltip.mjs <save.d2s> <css-selector> <out.png>
import puppeteer from "puppeteer-core";
const [save, selector, out] = process.argv.slice(2);
const browser = await puppeteer.launch({ browser: "firefox", executablePath: process.env.FIREFOX ?? "/usr/bin/firefox", headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 1500 });
await page.goto(process.env.EDITOR_URL ?? "http://localhost:8088/", { waitUntil: "networkidle0" });
await (await page.$("#d2sFile")).uploadFile(save);
await new Promise((r) => setTimeout(r, 3000));
const el = (await page.$$(selector))[0];
if (!el) { console.log("no element", selector); process.exit(1); }
await el.hover();
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: out, fullPage: true });
console.log(await page.evaluate(() => [...document.querySelectorAll("[data-tippy-root]")].map((t) => t.innerText).join("\n---\n")));
await browser.close();
