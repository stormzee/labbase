import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: [
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--use-fake-device-for-media-stream',
    '--deny-permission-prompts',
  ],
});
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
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
await page.waitForTimeout(2500);
await page.getByRole('button', { name: /Enable camera/i }).click();
await page.waitForFunction(
  () => /permission denied|allow camera|camera unavailable/i.test(document.body.innerText),
  { timeout: 30000 },
);
console.log('FAILURE_BODY', (await page.locator('body').innerText()).slice(-1600));
await page.screenshot({ path: 'artifacts/08-camera-denied.png' });
const retry = await page.getByRole('button', { name: /Retry/i }).count();
const continueButton = await page.getByRole('button', { name: /Continue without camera/i }).count();
console.log({ retry, continueButton });
if (continueButton) {
  await page.getByRole('button', { name: /Continue without camera/i }).click();
  await page.waitForTimeout(500);
}
console.log('AFTER_CONTINUE_CAMERA_OFF', (await page.locator('body').innerText()).includes('Camera is off'));
console.log('ERRORS', errors.slice(0, 10));
await browser.close();
