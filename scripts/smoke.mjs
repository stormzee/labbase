import { chromium } from 'playwright-core';
import fs from 'node:fs';

fs.mkdirSync('artifacts', { recursive: true });

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: [
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
    '--disable-dev-shm-usage',
  ],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
const warnings = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
  if (message.type() === 'warning') warnings.push(message.text());
});
page.on('pageerror', (error) => errors.push(`PAGEERROR ${error.stack || error.message}`));

const step = async (label, fn) => {
  try {
    await fn();
    console.log(`OK   ${label}`);
  } catch (error) {
    console.log(`FAIL ${label}: ${error.message}`);
    throw error;
  }
};

try {
  await step('load app', async () => {
    await page.goto(process.env.APP_URL ?? 'http://127.0.0.1:4173/', {
      waitUntil: 'networkidle',
      timeout: 90000,
    });
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForTimeout(4000);
  });

  await step('title and canvas', async () => {
    console.log('TITLE', await page.title());
    console.log('CANVAS', await page.locator('canvas').count());
    const size = await page.locator('canvas').first().evaluate((el) => ({ w: el.width, h: el.height }));
    console.log('CANVAS_SIZE', size);
  });

  await step('initial screenshot', async () => {
    await page.screenshot({ path: 'artifacts/01-initial.png' });
  });

  await step('no page errors after load', async () => {
    if (errors.length) throw new Error(errors.slice(0, 5).join('\n---\n'));
  });

  // Arrange via the contextual primary button (twice: burette then flask).
  await step('arrange apparatus', async () => {
    const primary = page.getByRole('button', { name: /Arrange apparatus/i });
    await primary.click();
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: /Arrange apparatus/i }).click();
    await page.waitForTimeout(900);
    const progressText = await page.locator('body').innerText();
    if (!progressText.includes('Pipette')) throw new Error('Progress did not advance to pipette');
  });

  await step('pipette aliquot', async () => {
    await page.getByRole('button', { name: /Pipette 25/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Add 3 drops/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Fill burette/i }).click();
    await page.waitForTimeout(800);
  });

  await step('enable auto-stop', async () => {
    await page.getByRole('button', { name: /Lab settings/i }).click();
    const autoStop = page.getByRole('switch', { name: /Auto-stop at endpoint/i });
    const checked = await autoStop.getAttribute('aria-checked');
    if (checked !== 'true') await autoStop.click();
    await page.getByRole('button', { name: /Close settings/i }).first().click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'artifacts/02-arranged.png' });
  });

  await step('titrate to endpoint', async () => {
    const start = page.getByRole('button', { name: /Start the flow/i });
    await start.click();
    await page.waitForFunction(
      () => document.body.innerText.includes('Endpoint reached'),
      { timeout: 30000 },
    );
    await page.waitForTimeout(700);
    await page.screenshot({ path: 'artifacts/03-endpoint.png' });
  });

  await step('record and calculate', async () => {
    const bodyNow = await page.locator('body').innerText();
    console.log('BODY_AFTER_ENDPOINT\n', bodyNow.slice(0, 1800));
    const record = page.getByRole('button', { name: /Record reading/i });
    if (await record.count()) {
      await record.first().click();
    } else {
      await page.getByRole('button', { name: /^Record$/i }).click();
    }
    await page.waitForTimeout(700);
    const calculate = page.getByRole('button', { name: /Calculate result/i });
    if (await calculate.count()) await calculate.first().click();
    else await page.getByRole('button', { name: /^Calculate$/i }).click();
    await page.waitForTimeout(1000);
    const body = await page.locator('body').innerText();
    console.log('BODY_FINAL\n', body.slice(0, 2600));
    if (!body.includes('mol dm')) throw new Error('No calculated concentration displayed');
    await page.screenshot({ path: 'artifacts/04-complete.png' });
  });

  await step('open help', async () => {
    await page.getByRole('button', { name: /Gesture and keyboard help/i }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'artifacts/05-help.png' });
    await page.getByRole('button', { name: /Back to the lab/i }).click();
  });

  console.log('ERRORS', JSON.stringify(errors.slice(0, 12), null, 2));
  console.log('WARNINGS', JSON.stringify(warnings.slice(0, 20), null, 2));
} catch (error) {
  console.error('SMOKE FAILED', error);
  await page.screenshot({ path: 'artifacts/failure.png' }).catch(() => {});
  console.log('ERRORS', JSON.stringify(errors.slice(0, 20), null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}

