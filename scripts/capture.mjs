import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const url = process.env.CAPTURE_URL || "http://127.0.0.1:5175/";
const outPath = process.env.OUT || "assets/orb-preview.png";

await mkdir(dirname(outPath), { recursive: true });

const browser = await chromium.launch({
  args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 1280 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();
page.on("console", (msg) => console.log(`[${msg.type()}]`, msg.text()));
page.on("pageerror", (err) => console.log("[pageerror]", err.message));
page.on("requestfailed", (req) => console.log("[reqfail]", req.url(), req.failure()?.errorText));
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(3500);

const html = await page.content();
console.log("--- DOM length:", html.length);
console.log("--- root has children?", await page.evaluate(() => document.getElementById("root")?.children.length));
console.log("--- canvases:", await page.evaluate(() => document.querySelectorAll("canvas").length));

await page.screenshot({ path: outPath, fullPage: true });
await browser.close();
console.log(`saved: ${outPath}`);
