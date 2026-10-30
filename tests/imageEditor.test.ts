import { describe, it, expect, vi } from 'vitest';
import {
  applyMosaicsToContext,
  applySignatureToContext,
  applyWatermarkPatternToContext,
  applyWatermarkToContext,
  createCanvas2D,
  MosaicRect,
  SignatureOptions,
  WatermarkOptions,
} from '../src/utils/imageEditor';

describe('imageEditor utility', () => {
  it('applyMosaicsToContext が指定領域のピクセルを正しくモザイク化（ブロック / すりガラス）すること', () => {
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

    // 1. ブロックモザイク
    const blockMosaics: MosaicRect[] = [
      { x: 0, y: 0, width: 4, height: 4, blockSize: 2, type: 'pixelate' },
    ];
    applyMosaicsToContext(mockCtx, blockMosaics);
    expect(mockCtx.getImageData).toHaveBeenCalledWith(0, 0, 4, 4);
    expect(mockCtx.putImageData).toHaveBeenCalled();

    // 2. すりガラス（ブラー）モザイク
    const blurMosaics: MosaicRect[] = [
      { x: 0, y: 0, width: 4, height: 4, type: 'blur' },
    ];
    applyMosaicsToContext(mockCtx, blurMosaics);
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

  it('applySignatureToContext が署名を正しく描画すること', () => {
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

    const signature: SignatureOptions = {
      text: '@Mizui_Miduki@misskey.io',
      position: 'bottom-right',
      opacity: 0.8,
    };

    applySignatureToContext(mockCtx, 800, 600, signature);

    expect(mockCtx.save).toHaveBeenCalled();
    expect(mockCtx.measureText).toHaveBeenCalledWith('@Mizui_Miduki@misskey.io');
    expect(mockCtx.fillText).toHaveBeenCalled();
    expect(mockCtx.restore).toHaveBeenCalled();
  });

  it('applyWatermarkPatternToContext が全面透かしパターンを正しく描画すること', () => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      measureText: vi.fn((text: string) => ({ width: text.length * 10 })),
      translate: vi.fn(),
      rotate: vi.fn(),
      fillText: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    const watermark: WatermarkOptions = {
      text: 'DO NOT REPOST',
      pattern: 'diagonal',
      opacity: 0.2,
    };

    applyWatermarkPatternToContext(mockCtx, 800, 600, watermark);

    expect(mockCtx.save).toHaveBeenCalled();
    expect(mockCtx.measureText).toHaveBeenCalledWith('DO NOT REPOST');
    expect(mockCtx.fillText).toHaveBeenCalled();
    expect(mockCtx.restore).toHaveBeenCalled();
  });

  it('applyWatermarkToContext (後方互換関数) が正常に動作すること', () => {
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

    applyWatermarkToContext(mockCtx, 800, 600, {
      text: '@User@example.com',
      position: 'bottom-left',
    });

    expect(mockCtx.save).toHaveBeenCalled();
    expect(mockCtx.fillText).toHaveBeenCalled();
  });

  it('空文字や未指定の署名・透かしでは描画が行われないこと', () => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      fillText: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    applySignatureToContext(mockCtx, 800, 600, { text: '   ' });
    expect(mockCtx.save).not.toHaveBeenCalled();
    expect(mockCtx.fillText).not.toHaveBeenCalled();

    applySignatureToContext(mockCtx, 800, 600, null);
    expect(mockCtx.save).not.toHaveBeenCalled();

    applyWatermarkPatternToContext(mockCtx, 800, 600, null);
    expect(mockCtx.save).not.toHaveBeenCalled();
  });

  it('createCanvas2D で Canvas が正常に生成できること', () => {
    const { canvas, ctx } = createCanvas2D(100, 200);
    expect(canvas).toBeDefined();
    expect(ctx).toBeDefined();
    expect(canvas.width).toBe(100);
    expect(canvas.height).toBe(200);
  });
});
