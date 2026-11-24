import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

for (const [width, height] of [
  [1024, 768],
  [1280, 800],
  [1512, 900],
]) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto(process.env.APP_URL ?? 'http://127.0.0.1:4173/?debug=1', {
    waitUntil: 'networkidle',
    timeout: 90000,
  });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `artifacts/layout-${width}x${height}.png` });
  const metrics = await page.evaluate(() => {
    const rect = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width), height: Math.round(r.height) };
    };
    const dock = [...document.querySelectorAll('div')].find((el) => el.textContent?.includes('Space') && el.textContent?.includes('Arrange apparatus') && el.className.includes('fixed bottom'));
    return {
      dock: dock ? (() => { const r = dock.getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom) }; })() : null,
      experiment: rect('aside section'),
      viewport: { width: innerWidth, height: innerHeight },
    };
  });
  console.log(width, height, metrics);
  await page.close();
}
await browser.close();
