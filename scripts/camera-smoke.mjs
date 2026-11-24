import { chromium } from 'playwright-core';

const exe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const errors = [];

const browser = await chromium.launch({
  executablePath: exe,
  headless: true,
  args: [
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream',
  ],
});

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ['camera'],
  });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`CONSOLE ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`PAGEERROR ${error.message}`));

  await page.goto(process.env.APP_URL ?? 'http://127.0.0.1:4173/?debug=1', {
    waitUntil: 'networkidle',
    timeout: 90000,
  });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForTimeout(2500);

  await page.getByRole('button', { name: /Enable camera/i }).click();
  console.log('CAMERA_CLICKED');

  await page.waitForFunction(
    () => document.body.innerText.includes('Stop camera') || /Camera unavailable|Hand tracker could not start|Permission denied/i.test(document.body.innerText),
    { timeout: 60000 },
  );
  await page.waitForTimeout(4000);
  const body = await page.locator('body').innerText();
  console.log('CAMERA_BODY\n', body.slice(0, 1200));
  await page.screenshot({ path: 'artifacts/06-camera.png' });
  console.log('HAS_STOP_BUTTON', (await page.getByRole('button', { name: /Stop camera/i }).count()) > 0);
  console.log('HAS_ERROR_CARD', /Camera unavailable|Hand tracker could not start|Permission denied/i.test(body));

  // Switch to dropwise and back to validate flow controls with camera active.
  await page.getByRole('button', { name: /Drop/i }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /Stream/i }).click();
  await page.waitForTimeout(300);
  console.log('FLOW_STATE', await page.evaluate(() => window.__labStore.getState().flow));

  console.log('ERRORS', JSON.stringify(errors.slice(0, 20), null, 2));
} catch (error) {
  console.error('CAMERA SMOKE FAILED', error);
  console.log('ERRORS', JSON.stringify(errors.slice(0, 20), null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
