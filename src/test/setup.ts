import '@testing-library/jest-dom/vitest';

// jsdom does not implement matchMedia, which the responsive shell uses.
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// jsdom has no canvas implementation. The hand overlay checks for a null context.
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
}

if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(performance.now()), 16);
  window.cancelAnimationFrame = (id: number) => window.clearTimeout(id);
}
