import { describe, it, expect, vi } from 'vitest';
import {
  applyMosaicsToContext,
  applyWatermarkToContext,
  MosaicRect,
  WatermarkOptions,
} from '../src/utils/imageEditor';

describe('imageEditor utility', () => {
  it('applyMosaicsToContext が指定領域のピクセルを正しくモザイク化すること', () => {
    // 4x4 のピクセルデータ（RGBA）を作成
    const width = 4;
    const height = 4;
    const data = new Uint8ClampedArray(width * height * 4);
    // すべて白 (255) で埋める
    data.fill(255);

    const mockCtx = {
      getImageData: vi.fn((x, y, w, h) => ({
        data,
        width: w,
        height: h,
      })),
      putImageData: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    const mosaics: MosaicRect[] = [
      { x: 0, y: 0, width: 4, height: 4, blockSize: 2 },
    ];

    applyMosaicsToContext(mockCtx, mosaics);

    expect(mockCtx.getImageData).toHaveBeenCalledWith(0, 0, 4, 4);
    expect(mockCtx.putImageData).toHaveBeenCalled();
  });

  it('不正な座標や幅0のモザイクでもクラッシュしないこと', () => {
    const mockCtx = {
      getImageData: vi.fn(),
      putImageData: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    const invalidMosaics: MosaicRect[] = [
      { x: -10, y: -10, width: 0, height: 0 },
      { x: 100, y: 100, width: -5, height: 10 },
    ];

    expect(() => applyMosaicsToContext(mockCtx, invalidMosaics)).not.toThrow();
    expect(mockCtx.getImageData).not.toHaveBeenCalled();
  });

  it('applyWatermarkToContext がテキストを正しく描画すること', () => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      measureText: vi.fn((text: string) => ({ width: text.length * 10 })),
      beginPath: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    const watermark: WatermarkOptions = {
      text: '@Mizui_Miduki@misskey.io',
      position: 'bottom-right',
      opacity: 0.8,
    };

    applyWatermarkToContext(mockCtx, 800, 600, watermark);

    expect(mockCtx.save).toHaveBeenCalled();
    expect(mockCtx.measureText).toHaveBeenCalledWith('@Mizui_Miduki@misskey.io');
    expect(mockCtx.fillText).toHaveBeenCalled();
    expect(mockCtx.restore).toHaveBeenCalled();
  });

  it('空文字や未指定の透かしでは描画が行われないこと', () => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      fillText: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    applyWatermarkToContext(mockCtx, 800, 600, { text: '   ' });
    expect(mockCtx.save).not.toHaveBeenCalled();
    expect(mockCtx.fillText).not.toHaveBeenCalled();

    applyWatermarkToContext(mockCtx, 800, 600, null);
    expect(mockCtx.save).not.toHaveBeenCalled();
  });
});
