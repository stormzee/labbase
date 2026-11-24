import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});

await page.goto(process.env.APP_URL ?? 'http://127.0.0.1:4173/?debug=1', {
  waitUntil: 'networkidle',
  timeout: 90000,
});
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForTimeout(3500);
await page.screenshot({ path: 'artifacts/mobile-01-lab.png' });

for (const [label, name] of [
  ['experiment', /Lab/],
  ['equipment', /Equipment/],
  ['measure', /Data/],
  ['camera', /Camera/],
]) {
  const button = page.getByRole('button', { name }).last();
  await button.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `artifacts/mobile-02-${label}.png` });
  await page.getByRole('button', { name: /Close panel/i }).click();
  await page.waitForTimeout(300);
}

// Verify the dock remains reachable on a phone viewport.
const dockVisible = await page.getByRole('button', { name: /Arrange apparatus/i }).isVisible();
console.log('DOCK_VISIBLE', dockVisible);
console.log('PAGE_ERRORS', JSON.stringify(errors.slice(0, 10)));
await browser.close();
