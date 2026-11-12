import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const output = process.argv[2] ?? "artifacts/visual-audit";
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || execFileSync("which", ["chromium"], { encoding: "utf8" }).trim();
const browser = await chromium.launch({ executablePath });
const baseUrl = process.env.VISUAL_BASE_URL ?? "http://127.0.0.1:5173";
const meetingId = process.env.VISUAL_MEETING_ID ?? "meeting-023";
const routes = ["/", "/dashboard", "/schedule", "/archive", `/meetings/${meetingId}`, "/analytics", "/decisions", "/about"];
const sizes = [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 375, height: 812 }];
await mkdir(output, { recursive: true });
const errors = [];
for (const size of sizes) {
  const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1 });
  page.on("pageerror", error => errors.push(`${size.width}: ${error.message}`));
  page.on("console", message => { if (message.type() === "error") errors.push(`${size.width}: console: ${message.text()}`); });
  for (const route of routes) {
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(750);
    await page.screenshot({ path: `${output}/${size.width}-${route === "/" ? "home" : route.slice(1).replaceAll("/", "-")}.png`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    console.log(`${size.width} ${route} HTTP ${response?.status()} overflow ${overflow}px`);
    if (overflow > 2) errors.push(`${size.width} ${route}: horizontal overflow ${overflow}px`);
  }
  await page.close();
}
await browser.close();
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
}
