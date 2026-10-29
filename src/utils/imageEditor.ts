export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MosaicRect {
  x: number;
  y: number;
  width: number;
  height: number;
  blockSize?: number;
}

export interface ImageAdjustments {
  brightness: number; // 100% が標準 (50 - 150)
  contrast: number;   // 100% が標準 (50 - 150)
  saturation: number; // 100% が標準 (0 - 200)
}

export type WatermarkPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';

export interface WatermarkOptions {
  text: string;
  position?: WatermarkPosition;
  opacity?: number; // 0.0 - 1.0 (default: 0.75)
}

export interface ImageEditOptions {
  crop?: CropRect | null;
  rotate?: number; // 0, 90, 180, 270
  flipHorizontal?: boolean;
  adjustments?: ImageAdjustments;
  mosaics?: MosaicRect[];
  watermark?: WatermarkOptions | null;
  quality?: number; // 0.0 - 1.0 (default 0.85)
}

/**
 * Canvasに対してモザイク処理を適用する（GPU/OffscreenCanvas対応）
 */
export function applyMosaicsToContext(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  mosaics: MosaicRect[]
): void {
  if (!mosaics || mosaics.length === 0) return;

  for (const m of mosaics) {
    const rx = Math.max(0, Math.round(m.x));
    const ry = Math.max(0, Math.round(m.y));
    const rw = Math.round(m.width);
    const rh = Math.round(m.height);
    if (rw <= 0 || rh <= 0) continue;

    const blockSize = Math.max(6, Math.min(32, m.blockSize || Math.round(Math.min(rw, rh) / 8) || 12));

    try {
      const imgData = ctx.getImageData(rx, ry, rw, rh);
      const data = imgData.data;

      for (let y = 0; y < rh; y += blockSize) {
        for (let x = 0; x < rw; x += blockSize) {
          const blockW = Math.min(blockSize, rw - x);
          const blockH = Math.min(blockSize, rh - y);

          let rTotal = 0;
          let gTotal = 0;
          let bTotal = 0;
          let aTotal = 0;
          const pixelCount = blockW * blockH;

          for (let by = 0; by < blockH; by++) {
            for (let bx = 0; bx < blockW; bx++) {
              const idx = ((y + by) * rw + (x + bx)) * 4;
              rTotal += data[idx];
              gTotal += data[idx + 1];
              bTotal += data[idx + 2];
              aTotal += data[idx + 3];
            }
          }

          const rAvg = Math.round(rTotal / pixelCount);
          const gAvg = Math.round(gTotal / pixelCount);
          const bAvg = Math.round(bTotal / pixelCount);
          const aAvg = Math.round(aTotal / pixelCount);

          for (let by = 0; by < blockH; by++) {
            for (let bx = 0; bx < blockW; bx++) {
              const idx = ((y + by) * rw + (x + bx)) * 4;
              data[idx] = rAvg;
              data[idx + 1] = gAvg;
              data[idx + 2] = bAvg;
              data[idx + 3] = aAvg;
            }
          }
        }
      }

      ctx.putImageData(imgData, rx, ry);
    } catch (e) {
      console.warn('Mosaic processing fallback error:', e);
    }
  }
}

/**
 * Canvasに対して透かし（ウォーターマーク）を描画する
 */
export function applyWatermarkToContext(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  watermark?: WatermarkOptions | null
): void {
  if (!watermark || !watermark.text || !watermark.text.trim()) return;

  const text = watermark.text.trim();
  const shortSide = Math.min(width, height);
  const fontSize = Math.max(13, Math.round(shortSide * 0.038));
  const paddingH = Math.round(fontSize * 0.55);
  const paddingV = Math.round(fontSize * 0.32);
  const margin = Math.max(10, Math.round(shortSide * 0.025));

  ctx.save();
  ctx.font = `600 ${fontSize}px "IBM Plex Sans JP", "Inter", system-ui, sans-serif`;
  ctx.textBaseline = 'middle';

  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const pillWidth = textWidth + paddingH * 2;
  const pillHeight = fontSize + paddingV * 2;
  const radius = Math.round(pillHeight / 2);

  let x = width - pillWidth - margin;
  let y = height - pillHeight - margin;

  const pos = watermark.position ?? 'bottom-right';
  if (pos === 'bottom-left') {
    x = margin;
    y = height - pillHeight - margin;
  } else if (pos === 'top-right') {
    x = width - pillWidth - margin;
    y = margin;
  } else if (pos === 'top-left') {
    x = margin;
    y = margin;
  } else if (pos === 'center') {
    x = (width - pillWidth) / 2;
    y = (height - pillHeight) / 2;
  }

  const opacity = Math.max(0.1, Math.min(1.0, watermark.opacity ?? 0.75));
  ctx.globalAlpha = opacity;

  // 半透明背景カプセル
  ctx.fillStyle = 'rgba(15, 23, 42, 0.68)';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, pillWidth, pillHeight, radius);
  } else {
    ctx.rect(x, y, pillWidth, pillHeight);
  }
  ctx.fill();

  // 枠線
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // テキスト
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x + paddingH, y + pillHeight / 2);

  ctx.restore();
}

/**
 * 簡易画像加工処理（クロップ・回転・反転・色調・モザイク・透かし）を実行し、新しいWebP Fileを返す
 * ブラウザ環境では OffscreenCanvas / Web Worker を活用してメインスレッドをブロックせずに処理
 */
export async function processImageEdits(
  file: File,
  options: ImageEditOptions
): Promise<File> {
  const {
    crop = null,
    rotate = 0,
    flipHorizontal = false,
    adjustments = { brightness: 100, contrast: 100, saturation: 100 },
    mosaics = [],
    watermark = null,
    quality = 0.85,
  } = options;

  // 1. 画像のデコード (createImageBitmap を優先)
  let sourceWidth = 0;
  let sourceHeight = 0;
  let bitmapSource: ImageBitmap | null = null;
  let imgSource: HTMLImageElement | null = null;

  if (typeof createImageBitmap === 'function') {
    try {
      bitmapSource = await createImageBitmap(file);
      sourceWidth = bitmapSource.width;
      sourceHeight = bitmapSource.height;
    } catch {
      bitmapSource = null;
    }
  }

  if (!bitmapSource) {
    const objectUrl = URL.createObjectURL(file);
    try {
      imgSource = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Image decode failed'));
        img.src = objectUrl;
      });
      sourceWidth = imgSource.naturalWidth || imgSource.width;
      sourceHeight = imgSource.naturalHeight || imgSource.height;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  try {
    // 2. 中間キャンバスで回転・反転・色調・モザイクを適用
    const isRotated90or270 = rotate === 90 || rotate === 270;
    const stageWidth = isRotated90or270 ? sourceHeight : sourceWidth;
    const stageHeight = isRotated90or270 ? sourceWidth : stageWidth === sourceHeight ? sourceWidth : sourceHeight;

    // OffscreenCanvas または標準 Canvas を作成
    let canvas: HTMLCanvasElement | OffscreenCanvas;
    let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;

    if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(stageWidth, stageHeight);
      ctx = canvas.getContext('2d');
    } else {
      canvas = document.createElement('canvas');
      canvas.width = stageWidth;
      canvas.height = stageHeight;
      ctx = canvas.getContext('2d');
    }

    if (!ctx) {
      throw new Error('Failed to create 2D canvas context');
    }

    // 色調調整フィルター (GPUアクセラレーション)
    const { brightness = 100, contrast = 100, saturation = 100 } = adjustments;
    if (brightness !== 100 || contrast !== 100 || saturation !== 100) {
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    }

    // 座標変換 (回転 & 反転)
    ctx.save();
    ctx.translate(stageWidth / 2, stageHeight / 2);
    if (rotate !== 0) {
      ctx.rotate((rotate * Math.PI) / 180);
    }
    if (flipHorizontal) {
      ctx.scale(-1, 1);
    }

    const drawW = sourceWidth;
    const drawH = sourceHeight;
    const drawImg = bitmapSource || imgSource!;
    ctx.drawImage(drawImg, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // フィルターをリセット
    ctx.filter = 'none';

    // モザイク処理を適用
    if (mosaics && mosaics.length > 0) {
      applyMosaicsToContext(ctx, mosaics);
    }

    // 3. クロップ処理
    let finalCanvas: HTMLCanvasElement | OffscreenCanvas = canvas;
    if (crop && crop.width > 0 && crop.height > 0) {
      const cx = Math.max(0, Math.min(stageWidth - 1, Math.round(crop.x)));
      const cy = Math.max(0, Math.min(stageHeight - 1, Math.round(crop.y)));
      const cw = Math.max(1, Math.min(stageWidth - cx, Math.round(crop.width)));
      const ch = Math.max(1, Math.min(stageHeight - cy, Math.round(crop.height)));

      let cropCanvas: HTMLCanvasElement | OffscreenCanvas;
      let cropCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;

      if (typeof OffscreenCanvas !== 'undefined') {
        cropCanvas = new OffscreenCanvas(cw, ch);
        cropCtx = cropCanvas.getContext('2d');
      } else {
        cropCanvas = document.createElement('canvas');
        cropCanvas.width = cw;
        cropCanvas.height = ch;
        cropCtx = cropCanvas.getContext('2d');
      }

      if (cropCtx) {
        cropCtx.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
        finalCanvas = cropCanvas;
      }
    }

    // 4. 透かし（ウォーターマーク）を合成
    if (watermark && watermark.text && watermark.text.trim()) {
      const finalCtx = finalCanvas.getContext('2d') as
        | CanvasRenderingContext2D
        | OffscreenCanvasRenderingContext2D
        | null;
      if (finalCtx) {
        applyWatermarkToContext(finalCtx, finalCanvas.width, finalCanvas.height, watermark);
      }
    }

    // 5. WebP Blob にエクスポート
    let blob: Blob;
    if ('convertToBlob' in finalCanvas && typeof finalCanvas.convertToBlob === 'function') {
      blob = await finalCanvas.convertToBlob({ type: 'image/webp', quality });
    } else if ('toBlob' in finalCanvas && typeof finalCanvas.toBlob === 'function') {
      blob = await new Promise<Blob>((resolve, reject) => {
        (finalCanvas as HTMLCanvasElement).toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Canvas export failed'));
          },
          'image/webp',
          quality
        );
      });
    } else {
      throw new Error('Canvas blob export unsupported in this environment');
    }

    // ファイル名生成 (元の拡張子にかかわらず .webp 化)
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const newName = `${baseName}_edited.webp`;
    return new File([blob], newName, { type: 'image/webp' });
  } finally {
    if (bitmapSource) {
      bitmapSource.close();
    }
  }
}

let sharedWorker: Worker | null = null;

function getSharedWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return null;
  if (sharedWorker) return sharedWorker;
  try {
    sharedWorker = new Worker(new URL('./imageEditorWorker.ts', import.meta.url), {
      type: 'module',
    });
    return sharedWorker;
  } catch (e) {
    console.warn('Failed to initialize Web Worker for image editing:', e);
    return null;
  }
}

/**
 * マルチスレッド (Web Worker) & GPU (OffscreenCanvas) を最優先し、
 * 非対応環境ではメインスレッド Canvas 2D へフォールバックする最適化エディタ関数
 */
export async function editImageOptimized(
  file: File,
  options: ImageEditOptions
): Promise<File> {
  const worker = getSharedWorker();

  if (worker && typeof createImageBitmap === 'function' && typeof OffscreenCanvas !== 'undefined') {
    return new Promise<File>((resolve, reject) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const handleMessage = (e: MessageEvent) => {
        if (e.data && e.data.id === id) {
          worker.removeEventListener('message', handleMessage);
          worker.removeEventListener('error', handleError);

          if (e.data.success && e.data.blob) {
            const baseName = file.name.replace(/\.[^/.]+$/, '');
            const newName = `${baseName}_edited.webp`;
            resolve(new File([e.data.blob], newName, { type: 'image/webp' }));
          } else {
            // Worker 側でのエラー時はフォールバック
            console.warn('Worker edit failed, falling back to main thread:', e.data.error);
            processImageEdits(file, options).then(resolve).catch(reject);
          }
        }
      };

      const handleError = (err: ErrorEvent) => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        console.warn('Worker error, falling back to main thread:', err);
        processImageEdits(file, options).then(resolve).catch(reject);
      };

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);

      createImageBitmap(file)
        .then((bitmap) => {
          worker.postMessage(
            { id, bitmap, options },
            [bitmap] // Transferable でゼロコピー転送
          );
        })
        .catch(() => {
          // Bitmap生成失敗時は直接 Blob を送信
          worker.postMessage({ id, blob: file, options });
        });
    });
  }

  // フォールバック: メインスレッドで処理
  return processImageEdits(file, options);
}
