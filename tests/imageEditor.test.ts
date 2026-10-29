import { describe, it, expect, vi } from 'vitest';
import { applyMosaicsToContext, MosaicRect } from '../src/utils/imageEditor';

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
});
