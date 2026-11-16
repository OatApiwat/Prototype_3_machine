// jsdom has no canvas: give every canvas a 2D context whose methods do nothing, so drawing code can run in smoke tests
const ctx = new Proxy(
  { measureText: () => ({ width: 10 }), createLinearGradient: () => ({ addColorStop() {} }) },
  { get: (t, k) => (k in t ? t[k] : () => {}), set: () => true }
);
HTMLCanvasElement.prototype.getContext = () => ctx;
Object.defineProperty(HTMLElement.prototype, 'clientWidth', { get: () => 800 });
Object.defineProperty(HTMLElement.prototype, 'clientHeight', { get: () => 300 });
globalThis.requestAnimationFrame = (f) => setTimeout(() => f(performance.now()), 16);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
