import {
  applyMosaicsToContext,
  applySignatureToContext,
  applyTextsToContext,
  applyWatermarkPatternToContext,
  ImageEditOptions,
} from './imageEditor';

export interface WorkerEditRequest {
  id: string;
  bitmap?: ImageBitmap;
  blob?: Blob;
  options: ImageEditOptions;
}

export interface WorkerEditResponse {
  id: string;
  success: boolean;
  blob?: Blob;
  error?: string;
}

self.onmessage = async (e: MessageEvent<WorkerEditRequest>) => {
  const { id, bitmap, blob, options } = e.data;

  try {
    let sourceBitmap = bitmap;
    if (!sourceBitmap && blob) {
      sourceBitmap = await createImageBitmap(blob);
    }

    if (!sourceBitmap) {
      throw new Error('No valid bitmap or blob provided to worker');
    }

    const {
      crop = null,
      rotate = 0,
      flipHorizontal = false,
      adjustments = { brightness: 100, contrast: 100, saturation: 100 },
      mosaics = [],
      texts = [],
      quality = 0.85,
    } = options;

    const sourceWidth = sourceBitmap.width;
    const sourceHeight = sourceBitmap.height;

    const isRotated90or270 = rotate === 90 || rotate === 270;
    const stageWidth = isRotated90or270 ? sourceHeight : sourceWidth;
    const stageHeight = isRotated90or270 ? sourceWidth : sourceHeight;

    const canvas = new OffscreenCanvas(stageWidth, stageHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable');

    // フィルター
    const { brightness = 100, contrast = 100, saturation = 100 } = adjustments;
    if (brightness !== 100 || contrast !== 100 || saturation !== 100) {
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    }

    // 回転・反転
    ctx.save();
    ctx.translate(stageWidth / 2, stageHeight / 2);
    if (rotate !== 0) ctx.rotate((rotate * Math.PI) / 180);
    if (flipHorizontal) ctx.scale(-1, 1);
    ctx.drawImage(sourceBitmap, -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight);
    ctx.restore();
    ctx.filter = 'none';

    // モザイク
    if (mosaics && mosaics.length > 0) {
      applyMosaicsToContext(ctx, mosaics);
    }

    // 文字入れ（テキスト合成）
    if (texts && texts.length > 0) {
      applyTextsToContext(ctx, stageWidth, stageHeight, texts);
    }

    // クロップ
    let finalCanvas: OffscreenCanvas = canvas;
    if (crop && crop.width > 0 && crop.height > 0) {
      const cx = Math.max(0, Math.min(stageWidth - 1, Math.round(crop.x)));
      const cy = Math.max(0, Math.min(stageHeight - 1, Math.round(crop.y)));
      const cw = Math.max(1, Math.min(stageWidth - cx, Math.round(crop.width)));
      const ch = Math.max(1, Math.min(stageHeight - cy, Math.round(crop.height)));

      const cropCanvas = new OffscreenCanvas(cw, ch);
      const cropCtx = cropCanvas.getContext('2d');
      if (cropCtx) {
        cropCtx.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
        finalCanvas = cropCanvas;
      }
    }

    // 盗作防止透かしおよび署名
    const { watermark = null, signature = null } = options;
    const finalCtx = finalCanvas.getContext('2d');
    if (finalCtx) {
      if (watermark && watermark.text && watermark.text.trim()) {
        applyWatermarkPatternToContext(finalCtx, finalCanvas.width, finalCanvas.height, watermark);
      }
      if (signature && signature.text && signature.text.trim()) {
        applySignatureToContext(finalCtx, finalCanvas.width, finalCanvas.height, signature);
      }
    }

    const resultBlob = await finalCanvas.convertToBlob({ type: 'image/webp', quality });
    sourceBitmap.close();

    const response: WorkerEditResponse = {
      id,
      success: true,
      blob: resultBlob,
    };
    self.postMessage(response);
  } catch (err) {
    const response: WorkerEditResponse = {
      id,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(response);
  }
};
