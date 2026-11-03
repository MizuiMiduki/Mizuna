import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { vi, afterEach } from 'vitest';
import { configure } from '@solidjs/testing-library';
import gsap from 'gsap';

// 非同期テストの安定化のためタイムアウトを調整
configure({ asyncUtilTimeout: 4000 });

// Material Dynamic Colors mock
vi.mock('material-dynamic-colors', () => ({
  default: vi.fn().mockResolvedValue({
    light: {
      primary: '#00658e',
      surface: '#f9f9fc',
      onSurface: '#191c1e',
    },
    dark: {
      primary: '#85cfff',
      surface: '#111416',
      onSurface: '#e2e2e5',
    },
  }),
}));

// PointerEvent mock for jsdom
if (typeof window !== 'undefined' && typeof window.PointerEvent === 'undefined') {
  class MockPointerEvent extends MouseEvent {
    pointerId: number;
    width: number;
    height: number;
    pressure: number;
    pointerType: string;
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 1;
      this.width = params.width ?? 1;
      this.height = params.height ?? 1;
      this.pressure = params.pressure ?? 0;
      this.pointerType = params.pointerType ?? 'touch';
    }
  }
  (window as any).PointerEvent = MockPointerEvent;
  (globalThis as any).PointerEvent = MockPointerEvent;
}

// scrollIntoView mock for jsdom
if (typeof Element !== 'undefined' && typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = vi.fn();
}

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
