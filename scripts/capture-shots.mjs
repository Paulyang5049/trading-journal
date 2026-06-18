// Capture README screenshots against a running dev server (default :3000).
// Usage: npm run dev (in another terminal), then `npm run shots`.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = path.join(process.cwd(), "docs", "img");

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Dashboard
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800); // let charts animate in
  await page.screenshot({ path: path.join(OUT, "dashboard.png"), fullPage: true });

  // Trade form — fill a few fields so the live calculation panel shows.
  await page.goto(`${BASE}/trades/new`, { waitUntil: "networkidle" });
  await page.fill('input[name="size"]', "10000");
  await page.fill('input[name="entryPrice"]', "1.1000");
  await page.fill('input[name="stopLoss"]', "1.0950");
  await page.fill('input[name="takeProfit"]', "1.1150");
  await page.fill('input[name="exitPrice"]', "1.1130");
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, "trade-form.png"), fullPage: true });

  // Position calculator — fill inputs so outputs are populated.
  await page.goto(`${BASE}/preparation`, { waitUntil: "networkidle" });
  const calc = page.locator("text=Position-size calculator").locator("..");
  await calc.locator('input').nth(2).fill("100");   // entry
  await calc.locator('input').nth(3).fill("95");    // stop
  await calc.locator('input').nth(4).fill("115");   // take profit
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, "calculator.png"), fullPage: true });

  await browser.close();
  console.log(`Saved screenshots to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
