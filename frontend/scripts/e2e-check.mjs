import { chromium } from "/Users/sunggat/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(7000);
page.on("pageerror", (error) => console.log("PAGE_ERROR", error.message));
console.log("STEP home");
await page.addInitScript(() => localStorage.clear());
await page.goto("http://localhost:5174/", { waitUntil: "networkidle" });
const languages = await page.locator(".language button").allTextContents();
if (languages.join(",") !== "ҚАЗ,RU") throw new Error(`Language order: ${languages}`);
if (!(await page.locator("html").getAttribute("lang"))?.startsWith("kk")) throw new Error("Kazakh is not default");
await page.screenshot({ path: "/tmp/adam-home-checked.png", fullPage: true });

console.log("STEP login");
await page.locator(".actions .ant-btn-primary").click();
await page.waitForURL("**/login");
await page.locator(".login-card .ant-input").fill("ADAM-STUDENT-7K9M-4Q2X-8V6P");
await page.locator(".login-card .ant-btn-primary").click();
await page.waitForURL("**/profile");
await page.locator(".profile-form-grid input").nth(0).fill("Аян");
await page.locator(".profile-form-grid input").nth(1).fill("Серік");
await page.locator(".profile-form-card .ant-btn-primary").click();
await page.waitForURL("**/test");
console.log("STEP test");
for (let index = 0; index < 36; index += 1) {
  await page.locator(".answer-grid button").nth(index % 2).click();
  if (index < 35) await page.waitForTimeout(300);
}
await page.locator(".test-controls .ant-btn-primary").click();
await page.waitForURL("**/results");
console.log("STEP results");
await page.waitForTimeout(750);
const recommendationCount = await page.locator(".recommendations article").count();
if (recommendationCount !== 10) throw new Error(`Expected 10 recommendations, got ${recommendationCount}`);
await page.screenshot({ path: "/tmp/adam-results-checked.png", fullPage: true });

await page.getByRole("button", { name: /PDF (есебін ашу|отчёт)/ }).click();
await page.waitForURL("**/report/**");
await page.locator(".report-page").first().waitFor();
if (await page.locator(".report-page").count() !== 9) throw new Error("Expected 9 report pages");
if (!(await page.locator(".pdf-gop b").first().innerText()).includes("B")) throw new Error("GOP missing in report");
await page.locator(".report-page").nth(5).screenshot({ path: "/tmp/adam-report-professions-checked.png" });

await page.goto("http://localhost:5174/professions", { waitUntil: "networkidle" });
console.log("STEP catalog");
if (await page.locator(".profession-card").count() !== 60) throw new Error("Expected 60 catalog cards");
if (!(await page.locator(".profession-description").first().innerText()).trim()) throw new Error("Missing description");
if (!(await page.locator(".profession-gop").first().innerText()).includes("B057")) throw new Error("Missing GOP");
await page.screenshot({ path: "/tmp/adam-catalog-checked.png", fullPage: true });

await page.setViewportSize({ width: 390, height: 844 });
console.log("STEP mobile");
await page.goto("http://localhost:5174/", { waitUntil: "networkidle" });
if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) throw new Error("Mobile horizontal overflow");
await page.screenshot({ path: "/tmp/adam-mobile-checked.png", fullPage: true });
console.log("E2E_OK: home → login → profile → 36 answers → results; catalog and mobile verified");
await browser.close();
