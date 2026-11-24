import { chromium } from 'playwright-core';

const mode = process.argv[2] ?? 'software';
const args =
  mode === 'hardware'
    ? ['--ignore-gpu-blocklist', '--enable-gpu', '--enable-webgl', '--use-angle=d3d11']
    : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.goto(process.env.APP_URL ?? 'http://127.0.0.1:4173/?debug=1', {
  waitUntil: 'networkidle',
  timeout: 90000,
});
await page.waitForSelector('canvas', { timeout: 60000 });
await page.waitForTimeout(5000);

const sample = async (label) => {
  const value = await page.evaluate(() => ({
    fps: window.__uiStore?.getState().renderFps,
    quality: window.__settingsStore?.getState().quality,
    stats: window.__labDebug?.stats(),
    renderer: (() => {
      try {
        const canvas = document.querySelector('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
      } catch (error) {
        return `error: ${error.message}`;
      }
    })(),
  }));
  console.log(label, JSON.stringify(value));
};

await sample('WARM');
await page.waitForTimeout(9000);
await sample('AFTER_9S');
await page.waitForTimeout(9000);
await sample('AFTER_18S');

// Switch to performance explicitly and measure again.
await page.evaluate(() => window.__settingsStore.getState().setQuality('performance'));
await page.waitForTimeout(4000);
await sample('PERFORMANCE_PRESET');
await page.screenshot({ path: `artifacts/performance-${mode}.png` });
console.log('ERRORS', errors.slice(0, 10));
await browser.close();
