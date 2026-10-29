import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { vi, afterEach } from 'vitest';
import gsap from 'gsap';

// BeerCSS & Material Dynamic Colors mock
vi.mock('beercss', () => ({}));
vi.mock('material-dynamic-colors', () => ({}));

// 1. window.matchMedia mock
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// 2. HTMLDialogElement mock (jsdom lacks dialog support)
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
}

// 3. Canvas & Image / createImageBitmap / ObjectURL mock
if (typeof window !== 'undefined') {
  window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
  window.URL.revokeObjectURL = vi.fn();

  (globalThis as any).createImageBitmap = vi.fn().mockImplementation(async () => ({
    width: 100,
    height: 100,
    close: vi.fn(),
  }));

  // Canvas toBlob mock (unconditionally defined for jsdom)
  if (typeof HTMLCanvasElement !== 'undefined') {
    HTMLCanvasElement.prototype.toBlob = function (callback, type, _quality) {
      const blob = new Blob(['mock-data'], { type: type || 'image/webp' });
      queueMicrotask(() => callback(blob));
    };

    const origGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: any[]) {
      if (args[0] === '2d') {
        return {
          drawImage: vi.fn(),
          getImageData: vi.fn().mockReturnValue({
            data: new Uint8ClampedArray(48 * 48 * 4),
          }),
        } as any;
      }
      return origGetContext ? (origGetContext as any).apply(this, args) : null;
    };
  }
}

// 4. jsdom の getComputedStyle がアンマウント済み要素でクラッシュするのを防ぐ安全パッチ
const origGetComputedStyle = window.getComputedStyle;
window.getComputedStyle = function (elt: Element, pseudoElt?: string | null) {
  try {
    return origGetComputedStyle(elt, pseudoElt);
  } catch {
    return ((elt as HTMLElement).style || {}) as CSSStyleDeclaration;
  }
};

// 5. デフォルトの fetch モック (ネットワーク遮断環境や非同期リクエストの安全性確保)
if (typeof globalThis.fetch === 'undefined' || !vi.isMockFunction(globalThis.fetch)) {
  globalThis.fetch = vi.fn().mockImplementation(async () => ({
    ok: true,
    status: 200,
    text: async () => '',
    json: async () => [],
    headers: new Headers({
      'x-wp-total': '0',
      'x-wp-totalpages': '0',
    }),
  })) as any;
}

// 6. 各テスト終了時に GSAP のアクティブなトゥイーンをすべて停止
afterEach(() => {
  gsap.killTweensOf('*');
});

// 7. navigator.serviceWorker mock (jsdom lacks serviceWorker implementation)
if (typeof navigator !== 'undefined') {
  Object.defineProperty(navigator as any, 'serviceWorker', {
    writable: true,
    configurable: true,
    value: {
      register: vi.fn().mockResolvedValue({
        waiting: null,
        installing: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        update: vi.fn().mockResolvedValue(undefined),
      }),
      getRegistration: vi.fn().mockResolvedValue(null),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      controller: null,
    },
  });
}
