import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (error) => errors.push(`PAGEERROR ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`CONSOLE ${message.text()}`);
});

const state = () =>
  page.evaluate(() => {
    const s = window.__labStore.getState();
    return {
      selected: s.interaction.selectedId,
      grabbed: s.interaction.grabbedId,
      phase: s.interaction.phase,
      burette: s.placements.burette,
      flask: s.placements.flask,
      flow: s.flow,
      filled: s.experiment.buretteFilled,
      endpoint: s.experiment.endpointReached,
      toasts: s.toasts.map((toast) => toast.title),
    };
  });

await page.goto(process.env.APP_URL ?? 'http://127.0.0.1:4173/?debug=1', {
  waitUntil: 'networkidle',
  timeout: 90000,
});
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForTimeout(3000);

try {
  const project = async (point) =>
    page.evaluate((p) => {
      const ndc = window.__labDebug.project(p);
      return { ndc, x: ((ndc.x + 1) / 2) * window.innerWidth, y: ((1 - ndc.y) / 2) * window.innerHeight };
    }, point);

  const flaskPoint = await project([0.36, 0.86, 0.02]);
  const bayPoint = await project([-0.62, 0.8, -0.06]);

  // Mouse drag
  await page.mouse.move(flaskPoint.x, flaskPoint.y);
  await page.waitForTimeout(150);
  await page.mouse.down();
  await page.waitForTimeout(300);
  const down = await state();
  await page.mouse.move(bayPoint.x, bayPoint.y, { steps: 12 });
  await page.waitForTimeout(300);
  await page.mouse.up();
  await page.waitForTimeout(900);
  const released = await state();
  console.log('MOUSE_GRAB', down.grabbed, 'SNAP', released.flask.snappedTo);

  // Reset, then exercise synthetic gesture frames through the real bridge.
  await page.evaluate(() => window.__labStore.getState().reset(777));
  await page.waitForTimeout(1200);
  const gFlask = await project([0.36, 0.86, 0.02]);
  const gBay = await project([-0.62, 0.8, -0.06]);

  const setFrame = async ({
    pinch = false,
    started = false,
    ended = false,
    fistStarted = false,
    point = false,
    pointActivated = false,
    rollDelta = 0,
    hasHand = true,
    trackingLost = false,
    screen,
  }) => {
    await page.evaluate(
      ({ pinch, started, ended, fistStarted, point, pointActivated, rollDelta, hasHand, trackingLost, screen }) => {
        const cursor = { x: (screen.ndc.x + 1) / 2, y: (1 - screen.ndc.y) / 2 };
        window.__labFrameRef.current = {
          timeMs: performance.now(),
          hasHand,
          handCount: hasHand ? 1 : 0,
          primary: null,
          pose: pinch ? 'other' : fistStarted ? 'fist' : point ? 'point' : 'open',
          rawPose: pinch ? 'other' : fistStarted ? 'fist' : point ? 'point' : 'open',
          poseChanged: false,
          pinch,
          pinchStarted: started,
          pinchEnded: ended,
          pinchRatio: pinch ? 0.25 : 1.1,
          pinchThreshold: 0.41,
          point,
          pointActivated,
          fist: fistStarted,
          fistStarted,
          fistEnded: false,
          open: !pinch && !fistStarted && !point,
          openStarted: false,
          cursor,
          cursorRaw: cursor,
          roll: 0,
          rollDelta,
          openness: pinch ? 0.4 : fistStarted ? 0.1 : 0.9,
          twoHand: { active: false, distance: 0, delta: 0, center: cursor },
          aspect: 1.6,
          trackingLost,
        };
      },
      { pinch, started, ended, fistStarted, point, pointActivated, rollDelta, hasHand, trackingLost, screen },
    );
  };

  await setFrame({ pinch: true, started: true, screen: gFlask });
  await page.waitForTimeout(1300);
  const pinchGrab = await state();
  await setFrame({ pinch: true, rollDelta: 0.25, screen: gFlask });
  await page.waitForTimeout(1300);
  const rotated = await state();
  await setFrame({ pinch: true, screen: gBay });
  await page.waitForTimeout(1300);
  await setFrame({ pinch: false, ended: true, screen: gBay });
  await page.waitForTimeout(1300);
  const gestureRelease = await state();
  console.log('GESTURE_GRAB', pinchGrab.grabbed, 'ROTATION', rotated.flask.rotation[1].toFixed(2), 'SNAP', gestureRelease.flask.snappedTo);
  await page.screenshot({ path: 'artifacts/07-interaction.png' });

  // Burette gesture drag from the bench rest into the retort clamp.
  await page.evaluate(() => window.__labStore.getState().reset(555));
  await page.waitForTimeout(1200);
  const buretteTip = await project([0.4, 0.82, 0.27]);
  const clampPoint = await project([-0.62, 0.8, -0.06]);
  await setFrame({ pinch: true, started: true, screen: buretteTip });
  await page.waitForTimeout(1300);
  const buretteGrab = await state();
  await setFrame({ pinch: true, screen: clampPoint });
  await page.waitForTimeout(1300);
  await setFrame({ pinch: false, ended: true, screen: clampPoint });
  await page.waitForTimeout(1300);
  const buretteSnap = await state();
  console.log('GESTURE_BURETTE_GRAB', buretteGrab.grabbed, 'SNAP', buretteSnap.burette.snappedTo);

  // Pinch assist: hover the flask, then pinch slightly away from it. The recent-hover
  // fallback and multi-anchor raycast should still grab the intended apparatus.
  await page.evaluate(() => window.__labStore.getState().reset(333));
  await page.waitForTimeout(1200);
  const hoverFlask = await project([0.36, 0.86, 0.02]);
  const offsetPinch = { ndc: { x: hoverFlask.ndc.x + 0.09, y: hoverFlask.ndc.y } };
  await setFrame({ screen: hoverFlask });
  await page.waitForTimeout(500);
  await setFrame({ pinch: true, started: true, screen: offsetPinch });
  await page.waitForTimeout(1400);
  const assisted = await state();
  console.log('PINCH_ASSIST_GRAB', assisted.grabbed);

  // A one-frame tracking dropout must not drop the carried object.
  await setFrame({ pinch: true, hasHand: false, screen: offsetPinch });
  await page.waitForTimeout(500);
  const dropoutHeld = await state();
  await setFrame({ pinch: false, ended: true, hasHand: false, trackingLost: true, screen: offsetPinch });
  await page.waitForTimeout(500);
  const dropoutReleased = await state();
  console.log('DROPOUT_HELD', dropoutHeld.grabbed, 'AFTER_LOSS', dropoutReleased.grabbed);

  // Fist workflow: clamp the burette, select it, then fill and toggle with synthetic fists.
  await page.evaluate(() => {
    const s = window.__labStore.getState();
    s.reset(888);
    s.selectApparatus('burette');
    s.snapSelectedToHome();
    s.selectApparatus('flask');
    s.snapSelectedToHome();
    s.selectApparatus('burette');
  });
  await page.waitForTimeout(1000);
  await setFrame({ fistStarted: true, screen: gFlask });
  await page.waitForTimeout(1200);
  const filled = await state();
  await setFrame({ fistStarted: true, screen: gFlask });
  await page.waitForTimeout(1200);
  const flowing = await state();
  await setFrame({ fistStarted: true, screen: gFlask });
  await page.waitForTimeout(1200);
  const stopped = await state();
  console.log('FIST_FILL', filled.filled, 'FIST_FLOW', flowing.flow, 'FIST_STOP', stopped.flow);

  // Point-dwell on a DOM control.
  await page.evaluate(() => window.__labStore.getState().reset(999));
  await page.waitForTimeout(1000);
  const pipetteButton = page.getByRole('button', { name: /^Pipette$/ });
  const box = await pipetteButton.boundingBox();
  if (!box) throw new Error('Pipette button not found');
  const screenButton = {
    ndc: {
      x: ((box.x + box.width / 2) / 1280) * 2 - 1,
      y: 1 - ((box.y + box.height / 2) / 800) * 2,
    },
  };
  await setFrame({ point: true, pointActivated: true, screen: screenButton });
  await page.waitForTimeout(1400);
  const afterPoint = await page.evaluate(() => ({
    aliquot: window.__labStore.getState().experiment.aliquotTransferred,
    flask: window.__labStore.getState().containers.flask.volumeMl,
  }));
  console.log('POINT_UI_ALIQUOT', afterPoint);
  console.log('ERRORS', JSON.stringify(errors.slice(0, 10), null, 2));
} catch (error) {
  console.error('INTERACTION SMOKE FAILED', error);
  await page.screenshot({ path: 'artifacts/07-interaction-failure.png' }).catch(() => {});
  console.log('ERRORS', JSON.stringify(errors.slice(0, 20), null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
