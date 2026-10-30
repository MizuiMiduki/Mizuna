export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type MosaicType = 'blur' | 'pixelate';

export interface MosaicRect {
  x: number;
  y: number;
  width: number;
  height: number;
  blockSize?: number;
  granularity?: number;
  type?: MosaicType;
}

export interface ImageAdjustments {
  brightness: number; // 100% が標準 (50 - 150)
  contrast: number;   // 100% が標準 (50 - 150)
  saturation: number; // 100% が標準 (0 - 200)
}

export type SignaturePosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';

export interface SignatureOptions {
  text: string;
  position?: SignaturePosition;
  opacity?: number; // 0.1 - 1.0 (default: 0.85)
  scale?: number;   // 0.5 - 2.0 (default: 1.0)
}

export type WatermarkPattern = 'diagonal' | 'grid' | 'center-huge';

export interface WatermarkOptions {
  text: string;
  pattern?: WatermarkPattern;
  opacity?: number; // 0.05 - 0.7 (default: 0.22)
  scale?: number;   // 0.5 - 2.0 (default: 1.0)
}

export interface ImageTextItem {
  id: string;
  text: string;
  x: number; // 0.0 - 1.0 (相対中心X座標)
  y: number; // 0.0 - 1.0 (相対中心Y座標)
  fontSize: number; // 基準フォントサイズ (14 - 64)
  color: string; // '#ffffff' など
  style?: 'fill-stroke' | 'fill' | 'badge'; // 'fill-stroke': 縁取り, 'fill': 単色, 'badge': 背景帯
}

export type DrawingMode = 'pen' | 'highlighter' | 'mosaic' | 'eraser';

export interface DrawingPoint {
  x: number; // 0.0 - 1.0 (ステージ相対座標)
  y: number; // 0.0 - 1.0 (ステージ相対座標)
}

export interface DrawingStroke {
  id: string;
  points: DrawingPoint[];
  color: string;
  size: number; // 基準太さ (px)
  opacity?: number; // 0.1 - 1.0
  mode?: DrawingMode; // 'pen' | 'highlighter' | 'mosaic' | 'eraser'
  mosaicType?: MosaicType; // 'blur' | 'pixelate'
  granularity?: number;
}

export interface ImageEditOptions {
  crop?: CropRect | null;
  rotate?: number; // 0, 90, 180, 270
  flipHorizontal?: boolean;
  adjustments?: ImageAdjustments;
  mosaics?: MosaicRect[];
  texts?: ImageTextItem[];
  drawings?: DrawingStroke[];
  signature?: SignatureOptions | null;
  watermark?: WatermarkOptions | null;
  quality?: number; // 0.0 - 1.0 (default 0.85)
}

/**
 * ユーザーがエディタ上で設定した加工状態（非破壊・何度でも再編集できるように保持）
 */
export interface ImageEditState {
  rotation: number;
  flipX: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
  aspectRatio: 'free' | '1:1' | '4:3' | '16:9';
  cropBox: { x: number; y: number; w: number; h: number } | null;
  mosaics: { x: number; y: number; w: number; h: number; type?: MosaicType; granularity?: number }[];
  mosaicType?: MosaicType;
  pixelateGranularity?: number;
  blurGranularity?: number;
  texts?: ImageTextItem[];
  drawings?: DrawingStroke[];
  watermarkEnabled: boolean;
  watermarkText: string;
  watermarkPattern: WatermarkPattern;
  watermarkOpacity: number;
  watermarkScale: number;
  signatureEnabled: boolean;
  signatureText: string;
  signaturePosition: SignaturePosition;
  signatureOpacity: number;
  signatureScale: number;
}

/**
 * 3パス Fast Box Blur（ガウシアンブラーの高速・高品質近似アルゴリズム）
 * 純粋な TypedArray 操作のため、Worker / OffscreenCanvas / メインスレッドで極めて高速に動作
 */
export function fastBoxBlur(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  radius: number,
  passes = 3
): void {
  if (w <= 0 || h <= 0 || radius <= 0) return;
  const r = Math.min(Math.floor(radius), Math.min(w - 1, h - 1));
  if (r <= 0) return;

  const buffer = new Uint8ClampedArray(data.length);

  let src = data;
  let dst = buffer;

  for (let p = 0; p < passes; p++) {
    boxBlurH(src, dst, w, h, r);
    boxBlurV(dst, src, w, h, r);
  }
}

function boxBlurH(
  scl: Uint8ClampedArray,
  tcl: Uint8ClampedArray,
  w: number,
  h: number,
  r: number
): void {
  const iarr = 1 / (r + r + 1);
  for (let i = 0; i < h; i++) {
    const rowOffset = i * w;
    let ti = rowOffset;
    let li = rowOffset;
    let ri = rowOffset + r;

    const fIdx = rowOffset * 4;
    const lIdxFinal = (rowOffset + w - 1) * 4;

    const fvR = scl[fIdx];
    const fvG = scl[fIdx + 1];
    const fvB = scl[fIdx + 2];
    const fvA = scl[fIdx + 3];

    const lvR = scl[lIdxFinal];
    const lvG = scl[lIdxFinal + 1];
    const lvB = scl[lIdxFinal + 2];
    const lvA = scl[lIdxFinal + 3];

    let valR = (r + 1) * fvR;
    let valG = (r + 1) * fvG;
    let valB = (r + 1) * fvB;
    let valA = (r + 1) * fvA;

    for (let j = 0; j < r; j++) {
      const idx = (rowOffset + j) * 4;
      valR += scl[idx];
      valG += scl[idx + 1];
      valB += scl[idx + 2];
      valA += scl[idx + 3];
    }

    for (let j = 0; j <= r; j++) {
      const rIdx = (ri < rowOffset + w ? ri++ : rowOffset + w - 1) * 4;
      valR += scl[rIdx] - fvR;
      valG += scl[rIdx + 1] - fvG;
      valB += scl[rIdx + 2] - fvB;
      valA += scl[rIdx + 3] - fvA;
      const outIdx = (ti++) * 4;
      tcl[outIdx] = (valR * iarr + 0.5) | 0;
      tcl[outIdx + 1] = (valG * iarr + 0.5) | 0;
      tcl[outIdx + 2] = (valB * iarr + 0.5) | 0;
      tcl[outIdx + 3] = (valA * iarr + 0.5) | 0;
    }

    for (let j = r + 1; j < w - r; j++) {
      const rIdx = (ri++) * 4;
      const lIdx = (li++) * 4;
      valR += scl[rIdx] - scl[lIdx];
      valG += scl[rIdx + 1] - scl[lIdx + 1];
      valB += scl[rIdx + 2] - scl[lIdx + 2];
      valA += scl[rIdx + 3] - scl[lIdx + 3];
      const outIdx = (ti++) * 4;
      tcl[outIdx] = (valR * iarr + 0.5) | 0;
      tcl[outIdx + 1] = (valG * iarr + 0.5) | 0;
      tcl[outIdx + 2] = (valB * iarr + 0.5) | 0;
      tcl[outIdx + 3] = (valA * iarr + 0.5) | 0;
    }

    for (let j = Math.max(r + 1, w - r); j < w; j++) {
      const lIdx = (li < rowOffset + w ? li++ : rowOffset + w - 1) * 4;
      valR += lvR - scl[lIdx];
      valG += lvG - scl[lIdx + 1];
      valB += lvB - scl[lIdx + 2];
      valA += lvA - scl[lIdx + 3];
      const outIdx = (ti++) * 4;
      tcl[outIdx] = (valR * iarr + 0.5) | 0;
      tcl[outIdx + 1] = (valG * iarr + 0.5) | 0;
      tcl[outIdx + 2] = (valB * iarr + 0.5) | 0;
      tcl[outIdx + 3] = (valA * iarr + 0.5) | 0;
    }
  }
}

function boxBlurV(
  scl: Uint8ClampedArray,
  tcl: Uint8ClampedArray,
  w: number,
  h: number,
  r: number
): void {
  const iarr = 1 / (r + r + 1);
  for (let i = 0; i < w; i++) {
    let ti = i;
    let li = ti;
    let ri = ti + r * w;

    const fIdx = ti * 4;
    const lIdxFinal = (ti + (h - 1) * w) * 4;

    const fvR = scl[fIdx];
    const fvG = scl[fIdx + 1];
    const fvB = scl[fIdx + 2];
    const fvA = scl[fIdx + 3];

    const lvR = scl[lIdxFinal];
    const lvG = scl[lIdxFinal + 1];
    const lvB = scl[lIdxFinal + 2];
    const lvA = scl[lIdxFinal + 3];

    let valR = (r + 1) * fvR;
    let valG = (r + 1) * fvG;
    let valB = (r + 1) * fvB;
    let valA = (r + 1) * fvA;

    for (let j = 0; j < r; j++) {
      const idx = (ti + j * w) * 4;
      valR += scl[idx];
      valG += scl[idx + 1];
      valB += scl[idx + 2];
      valA += scl[idx + 3];
    }

    for (let j = 0; j <= r; j++) {
      const rIdx = (ri < w * h ? ri : ti + (h - 1) * w) * 4;
      ri += w;
      valR += scl[rIdx] - fvR;
      valG += scl[rIdx + 1] - fvG;
      valB += scl[rIdx + 2] - fvB;
      valA += scl[rIdx + 3] - fvA;
      const outIdx = ti * 4;
      ti += w;
      tcl[outIdx] = (valR * iarr + 0.5) | 0;
      tcl[outIdx + 1] = (valG * iarr + 0.5) | 0;
      tcl[outIdx + 2] = (valB * iarr + 0.5) | 0;
      tcl[outIdx + 3] = (valA * iarr + 0.5) | 0;
    }

    for (let j = r + 1; j < h - r; j++) {
      const rIdx = ri * 4;
      const lIdx = li * 4;
      ri += w;
      li += w;
      valR += scl[rIdx] - scl[lIdx];
      valG += scl[rIdx + 1] - scl[lIdx + 1];
      valB += scl[rIdx + 2] - scl[lIdx + 2];
      valA += scl[rIdx + 3] - scl[lIdx + 3];
      const outIdx = ti * 4;
      ti += w;
      tcl[outIdx] = (valR * iarr + 0.5) | 0;
      tcl[outIdx + 1] = (valG * iarr + 0.5) | 0;
      tcl[outIdx + 2] = (valB * iarr + 0.5) | 0;
      tcl[outIdx + 3] = (valA * iarr + 0.5) | 0;
    }

    for (let j = Math.max(r + 1, h - r); j < h; j++) {
      const lIdx = (li < w * h ? li : ti + (h - 1) * w) * 4;
      li += w;
      valR += lvR - scl[lIdx];
      valG += lvG - scl[lIdx + 1];
      valB += lvB - scl[lIdx + 2];
      valA += lvA - scl[lIdx + 3];
      const outIdx = ti * 4;
      ti += w;
      tcl[outIdx] = (valR * iarr + 0.5) | 0;
      tcl[outIdx + 1] = (valG * iarr + 0.5) | 0;
      tcl[outIdx + 2] = (valB * iarr + 0.5) | 0;
      tcl[outIdx + 3] = (valA * iarr + 0.5) | 0;
    }
  }
}

/**
 * Canvasに対してモザイク処理（すりガラス / ブロック）を適用する（GPU/OffscreenCanvas対応）
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

    const mosaicType: MosaicType = m.type || 'pixelate';

    if (mosaicType === 'blur') {
      try {
        const imgData = ctx.getImageData(rx, ry, rw, rh);
        const radius = Math.max(2, Math.min(64, m.granularity || Math.round(Math.min(rw, rh) / 12) || 16));
        fastBoxBlur(imgData.data, rw, rh, radius, 3);
        ctx.putImageData(imgData, rx, ry);
      } catch (e) {
        console.warn('Blur mosaic failed:', e);
      }
    } else {
      // ブロック（ピクセル）モザイク: ガビガビのレトロピクセル描画（ニアレストネイバー）
      const blockSize = Math.max(
        6,
        m.blockSize || m.granularity || 24
      );

      let success = false;
      const ctxCanvas = (ctx as any).canvas;
      if (ctxCanvas) {
        try {
          const sw = Math.max(1, Math.round(rw / blockSize));
          const sh = Math.max(1, Math.round(rh / blockSize));
          const { canvas: sCanvas, ctx: sCtx } = createCanvas2D(sw, sh);
          sCtx.drawImage(ctxCanvas, rx, ry, rw, rh, 0, 0, sw, sh);

          ctx.save();
          ctx.imageSmoothingEnabled = false;
          if ('mozImageSmoothingEnabled' in ctx) (ctx as any).mozImageSmoothingEnabled = false;
          if ('webkitImageSmoothingEnabled' in ctx) (ctx as any).webkitImageSmoothingEnabled = false;
          if ('msImageSmoothingEnabled' in ctx) (ctx as any).msImageSmoothingEnabled = false;

          ctx.drawImage(sCanvas as CanvasImageSource, 0, 0, sw, sh, rx, ry, rw, rh);
          ctx.restore();
          success = true;
        } catch {
          success = false;
        }
      }

      // フォールバック（ctx.canvas が取得できない環境やテスト環境用）
      if (!success) {
        try {
          const imgData = ctx.getImageData(rx, ry, rw, rh);
          const data = imgData.data;

          for (let y = 0; y < rh; y += blockSize) {
            for (let x = 0; x < rw; x += blockSize) {
              const blockW = Math.min(blockSize, rw - x);
              const blockH = Math.min(blockSize, rh - y);

              // ニアレストネイバー（中心ピクセルサンプリング）でシャープなガビガビ感を出す
              const sampleX = Math.min(rw - 1, x + Math.floor(blockW / 2));
              const sampleY = Math.min(rh - 1, y + Math.floor(blockH / 2));
              const sampleIdx = (sampleY * rw + sampleX) * 4;
              const r = data[sampleIdx];
              const g = data[sampleIdx + 1];
              const b = data[sampleIdx + 2];
              const a = data[sampleIdx + 3];

              for (let by = 0; by < blockH; by++) {
                for (let bx = 0; bx < blockW; bx++) {
                  const idx = ((y + by) * rw + (x + bx)) * 4;
                  data[idx] = r;
                  data[idx + 1] = g;
                  data[idx + 2] = b;
                  data[idx + 3] = a;
                }
              }
            }
          }

          ctx.putImageData(imgData, rx, ry);
        } catch (e) {
          console.warn('Block mosaic processing fallback error:', e);
        }
      }
    }
  }
}

/**
 * 色が明るい（明度が高い）かどうかを判定するヘルパー（縁取りやコントラスト決定に使用）
 */
export function isColorLight(hexColor: string): boolean {
  if (!hexColor || hexColor === '#ffffff' || hexColor.toLowerCase() === 'white') return true;
  if (hexColor.startsWith('#')) {
    const c = hexColor.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16) || 0;
    const g = parseInt(c.substring(2, 4), 16) || 0;
    const b = parseInt(c.substring(4, 6), 16) || 0;
    return (r * 299 + g * 587 + b * 114) / 1000 > 128;
  }
  return true;
}

/**
 * Canvasに対して文字入れ（テキストアイテム）を描画する
 */
export function applyTextsToContext(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  stageWidth: number,
  stageHeight: number,
  texts?: ImageTextItem[]
): void {
  if (!texts || texts.length === 0) return;

  for (const item of texts) {
    const text = item.text?.trim();
    if (!text) continue;

    const x = Math.round(item.x * stageWidth);
    const y = Math.round(item.y * stageHeight);
    const scale = Math.max(0.4, Math.min(stageWidth, stageHeight) / 700);
    const fontSize = Math.max(14, Math.round((item.fontSize || 28) * scale));

    ctx.save();
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const paddingX = Math.round(fontSize * 0.45);
    const paddingY = Math.round(fontSize * 0.35);

    if (item.style === 'badge') {
      const boxW = Math.round(textWidth + paddingX * 2);
      const boxH = Math.round(fontSize * 1.35);
      const boxX = Math.round(x - boxW / 2);
      const boxY = Math.round(y - boxH / 2);
      const radius = Math.min(8, Math.round(fontSize * 0.25));

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(boxX, boxY, boxW, boxH, radius);
      } else {
        ctx.rect(boxX, boxY, boxW, boxH);
      }
      ctx.fill();

      ctx.fillStyle = item.color || '#ffffff';
      ctx.fillText(text, x, y);
    } else if (item.style === 'fill-stroke' || !item.style) {
      const isLight = isColorLight(item.color || '#ffffff');
      ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = Math.max(3, Math.round(fontSize / 7));
      ctx.lineJoin = 'round';
      ctx.strokeText(text, x, y);

      ctx.fillStyle = item.color || '#ffffff';
      ctx.fillText(text, x, y);
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = Math.max(3, Math.round(fontSize / 6));
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = item.color || '#ffffff';
      ctx.fillText(text, x, y);
    }

    ctx.restore();
  }
}

/**
 * Canvasに対してフリーハンドペン描画（通常線・マーカー・モザイクペン・消しゴム）を描画する
 */
export function applyDrawingsToContext(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  stageWidth: number,
  stageHeight: number,
  drawings?: DrawingStroke[],
  sourceCanvas?: CanvasImageSource | null
): void {
  if (!drawings || drawings.length === 0) return;

  const hasEraser = drawings.some((d) => d.mode === 'eraser');
  let targetCtx = ctx;
  let layerCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;

  if (hasEraser) {
    try {
      const created = createCanvas2D(stageWidth, stageHeight);
      if (created.ctx && typeof created.ctx.save === 'function') {
        layerCanvas = created.canvas;
        targetCtx = created.ctx;
      }
    } catch (_) {
      // フォールバック: 直接ctxに描画
      targetCtx = ctx;
    }
  }

  const scale = Math.max(0.4, Math.min(stageWidth, stageHeight) / 700);

  // モザイクストローク用のテクスチャキャッシュ（すりガラス / ブロック）
  let blurredTexture: HTMLCanvasElement | OffscreenCanvas | null = null;
  let pixelatedTexture: HTMLCanvasElement | OffscreenCanvas | null = null;

  const effectiveSource = sourceCanvas || ((ctx as unknown as { canvas?: CanvasImageSource }).canvas ?? null);

  const getMosaicTexture = (type: MosaicType, granularity?: number) => {
    if (!effectiveSource) return null;
    if (type === 'pixelate') {
      try {
        const blockSize = Math.max(6, Math.round((granularity || 24) * scale));
        const sw = Math.max(2, Math.round(stageWidth / blockSize));
        const sh = Math.max(2, Math.round(stageHeight / blockSize));
        const { canvas: sCanvas, ctx: sCtx } = createCanvas2D(sw, sh);
        sCtx.drawImage(effectiveSource, 0, 0, sw, sh);
        const { canvas: pCanvas, ctx: pCtx } = createCanvas2D(stageWidth, stageHeight);
        pCtx.imageSmoothingEnabled = false;
        pCtx.drawImage(sCanvas, 0, 0, stageWidth, stageHeight);
        return pCanvas;
      } catch {
        return null;
      }
    } else {
      try {
        const gran = granularity || 16;
        const blurScale = Math.max(4, Math.min(32, Math.round((gran * scale) / 2)));
        const sw = Math.max(2, Math.round(stageWidth / blurScale));
        const sh = Math.max(2, Math.round(stageHeight / blurScale));
        const { canvas: sCanvas, ctx: sCtx } = createCanvas2D(sw, sh);
        sCtx.drawImage(effectiveSource, 0, 0, sw, sh);
        try {
          const imgData = sCtx.getImageData(0, 0, sw, sh);
          const rad = Math.max(2, Math.round((gran * scale) / 4));
          fastBoxBlur(imgData.data, sw, sh, rad, 3);
          sCtx.putImageData(imgData, 0, 0);
        } catch (_) {}
        const { canvas: bCanvas, ctx: bCtx } = createCanvas2D(stageWidth, stageHeight);
        bCtx.imageSmoothingEnabled = true;
        bCtx.drawImage(sCanvas, 0, 0, stageWidth, stageHeight);
        return bCanvas;
      } catch {
        return null;
      }
    }
  };

  targetCtx.save?.();

  for (const stroke of drawings) {
    if (!stroke.points || stroke.points.length === 0) continue;

    const lineWidth = Math.max(1, Math.round((stroke.size || 6) * scale));

    // モザイクペン描画
    if (stroke.mode === 'mosaic') {
      const mosaicType = stroke.mosaicType || 'blur';
      const texture = getMosaicTexture(mosaicType, stroke.granularity);

      if (texture) {
        try {
          const { canvas: maskCanvas, ctx: maskCtx } = createCanvas2D(stageWidth, stageHeight);
          // 1. テクスチャを描画
          maskCtx.drawImage(texture as CanvasImageSource, 0, 0);
          // 2. ストロークの形状でくり抜き (destination-in)
          maskCtx.globalCompositeOperation = 'destination-in';
          maskCtx.save?.();
          maskCtx.lineCap = 'round';
          maskCtx.lineJoin = 'round';
          maskCtx.lineWidth = lineWidth;
          maskCtx.strokeStyle = 'rgba(0, 0, 0, 1)';
          maskCtx.fillStyle = 'rgba(0, 0, 0, 1)';

          if (stroke.points.length === 1) {
            const pt = stroke.points[0];
            maskCtx.beginPath();
            maskCtx.arc(pt.x * stageWidth, pt.y * stageHeight, lineWidth / 2, 0, Math.PI * 2);
            maskCtx.fill();
          } else {
            maskCtx.beginPath();
            const first = stroke.points[0];
            maskCtx.moveTo(first.x * stageWidth, first.y * stageHeight);
            if (stroke.points.length === 2) {
              const p2 = stroke.points[1];
              maskCtx.lineTo(p2.x * stageWidth, p2.y * stageHeight);
            } else {
              for (let i = 1; i < stroke.points.length - 1; i++) {
                const curr = stroke.points[i];
                const next = stroke.points[i + 1];
                const midX = ((curr.x + next.x) / 2) * stageWidth;
                const midY = ((curr.y + next.y) / 2) * stageHeight;
                maskCtx.quadraticCurveTo(
                  curr.x * stageWidth,
                  curr.y * stageHeight,
                  midX,
                  midY
                );
              }
              const last = stroke.points[stroke.points.length - 1];
              maskCtx.lineTo(last.x * stageWidth, last.y * stageHeight);
            }
            maskCtx.stroke();
          }
          maskCtx.restore?.();

          // 3. targetCtx に合成
          targetCtx.save?.();
          targetCtx.globalCompositeOperation = 'source-over';
          targetCtx.drawImage(maskCanvas as CanvasImageSource, 0, 0);
          targetCtx.restore?.();
          continue;
        } catch (_) {
          // フォールバック
        }
      }

      // フォールバック描画
      targetCtx.save?.();
      targetCtx.lineCap = 'round';
      targetCtx.lineJoin = 'round';
      targetCtx.lineWidth = lineWidth;
      targetCtx.strokeStyle = 'rgba(148, 163, 184, 0.75)';
      targetCtx.fillStyle = 'rgba(148, 163, 184, 0.75)';
      if (stroke.points.length === 1) {
        const pt = stroke.points[0];
        targetCtx.beginPath();
        targetCtx.arc(pt.x * stageWidth, pt.y * stageHeight, lineWidth / 2, 0, Math.PI * 2);
        targetCtx.fill();
      } else {
        targetCtx.beginPath();
        targetCtx.moveTo(stroke.points[0].x * stageWidth, stroke.points[0].y * stageHeight);
        for (let i = 1; i < stroke.points.length; i++) {
          targetCtx.lineTo(stroke.points[i].x * stageWidth, stroke.points[i].y * stageHeight);
        }
        targetCtx.stroke();
      }
      targetCtx.restore?.();
      continue;
    }

    targetCtx.save?.();
    targetCtx.lineCap = 'round';
    targetCtx.lineJoin = 'round';
    targetCtx.lineWidth = lineWidth;

    if (stroke.mode === 'eraser') {
      targetCtx.globalCompositeOperation = 'destination-out';
      targetCtx.strokeStyle = 'rgba(0, 0, 0, 1)';
      targetCtx.fillStyle = 'rgba(0, 0, 0, 1)';
    } else {
      targetCtx.globalCompositeOperation = 'source-over';
      const opacity = stroke.opacity ?? (stroke.mode === 'highlighter' ? 0.45 : 1.0);
      targetCtx.globalAlpha = opacity;
      targetCtx.strokeStyle = stroke.color || '#ff3b30';
      targetCtx.fillStyle = stroke.color || '#ff3b30';
    }

    if (stroke.points.length === 1) {
      const pt = stroke.points[0];
      targetCtx.beginPath();
      targetCtx.arc(pt.x * stageWidth, pt.y * stageHeight, lineWidth / 2, 0, Math.PI * 2);
      targetCtx.fill();
    } else {
      targetCtx.beginPath();
      const first = stroke.points[0];
      targetCtx.moveTo(first.x * stageWidth, first.y * stageHeight);

      if (stroke.points.length === 2) {
        const p2 = stroke.points[1];
        targetCtx.lineTo(p2.x * stageWidth, p2.y * stageHeight);
      } else {
        for (let i = 1; i < stroke.points.length - 1; i++) {
          const curr = stroke.points[i];
          const next = stroke.points[i + 1];
          const midX = ((curr.x + next.x) / 2) * stageWidth;
          const midY = ((curr.y + next.y) / 2) * stageHeight;
          targetCtx.quadraticCurveTo(
            curr.x * stageWidth,
            curr.y * stageHeight,
            midX,
            midY
          );
        }
        const last = stroke.points[stroke.points.length - 1];
        targetCtx.lineTo(last.x * stageWidth, last.y * stageHeight);
      }
      targetCtx.stroke();
    }

    targetCtx.restore?.();
  }

  targetCtx.restore?.();

  if (layerCanvas) {
    ctx.drawImage(layerCanvas as CanvasImageSource, 0, 0);
  }
}

/**
 * Canvasに対して署名（クレジット表記のカプセル）を描画する
 */
export function applySignatureToContext(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  signature?: SignatureOptions | null
): void {
  if (!signature || !signature.text || !signature.text.trim()) return;

  const text = signature.text.trim();
  const shortSide = Math.min(width, height);
  const scale = Math.max(0.5, Math.min(2.0, signature.scale ?? 1.0));
  const fontSize = Math.max(12, Math.round(shortSide * 0.038 * scale));
  const paddingH = Math.round(fontSize * 0.55);
  const paddingV = Math.round(fontSize * 0.32);
  const margin = Math.max(8, Math.round(shortSide * 0.025 * scale));

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

  const pos = signature.position ?? 'bottom-right';
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

  const opacity = Math.max(0.1, Math.min(1.0, signature.opacity ?? 0.85));
  ctx.globalAlpha = opacity;

  // 半透明背景カプセル
  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, pillWidth, pillHeight, radius);
  } else {
    ctx.rect(x, y, pillWidth, pillHeight);
  }
  ctx.fill();

  // 枠線
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = Math.max(1, Math.round(fontSize * 0.06));
  ctx.stroke();

  // テキスト
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x + paddingH, y + pillHeight / 2);

  ctx.restore();
}

/**
 * Canvasに対して盗作防止の透かし（ウォーターマークパターン）を描画する
 */
export function applyWatermarkPatternToContext(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  watermark?: WatermarkOptions | null
): void {
  if (!watermark || !watermark.text || !watermark.text.trim()) return;

  const text = watermark.text.trim();
  const shortSide = Math.min(width, height);
  const pattern = watermark.pattern ?? 'diagonal';
  const scale = Math.max(0.5, Math.min(2.0, watermark.scale ?? 1.0));
  const opacity = Math.max(0.04, Math.min(0.8, watermark.opacity ?? 0.22));

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  if (pattern === 'center-huge') {
    // 中央に大きくドンと斜め配置
    const fontSize = Math.max(22, Math.round(shortSide * 0.12 * scale));
    ctx.font = `800 ${fontSize}px "IBM Plex Sans JP", "Inter", system-ui, sans-serif`;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 4;
    ctx.translate(width / 2, height / 2);
    ctx.rotate((-25 * Math.PI) / 180);
    ctx.fillText(text, 0, 0);
  } else if (pattern === 'diagonal') {
    // 全面に斜めリピート（盗作防止ウォーターマーク）
    const fontSize = Math.max(13, Math.round(shortSide * 0.045 * scale));
    ctx.font = `700 ${fontSize}px "IBM Plex Sans JP", "Inter", system-ui, sans-serif`;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 3;

    const metrics = ctx.measureText(text);
    const textLen = Math.max(metrics.width + 60, fontSize * 6);
    const stepY = fontSize * 4.2;
    const stepX = textLen * 1.15;

    ctx.translate(width / 2, height / 2);
    ctx.rotate((-30 * Math.PI) / 180);

    const diag = Math.sqrt(width * width + height * height);
    const halfDiag = diag / 2;

    for (let y = -halfDiag; y <= halfDiag; y += stepY) {
      const offsetX = Math.round(y / stepY) % 2 === 0 ? 0 : stepX / 2;
      for (let x = -halfDiag - stepX; x <= halfDiag + stepX; x += stepX) {
        ctx.fillText(text, x + offsetX, y);
      }
    }
  } else {
    // 'grid' 水平・垂直の格子リピート
    const fontSize = Math.max(12, Math.round(shortSide * 0.04 * scale));
    ctx.font = `700 ${fontSize}px "IBM Plex Sans JP", "Inter", system-ui, sans-serif`;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 3;

    const metrics = ctx.measureText(text);
    const stepX = Math.max(metrics.width + 50, fontSize * 6);
    const stepY = fontSize * 4.5;

    for (let y = stepY / 2; y < height; y += stepY) {
      for (let x = stepX / 2; x < width; x += stepX) {
        ctx.fillText(text, x, y);
      }
    }
  }

  ctx.restore();
}

/**
 * OffscreenCanvas または通常の HTMLCanvasElement とその 2D Context を生成する
 */
export function createCanvas2D(
  width: number,
  height: number
): {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
} {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));

  let canvas: HTMLCanvasElement | OffscreenCanvas;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;

  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(w, h);
    ctx = canvas.getContext('2d');
  } else if (typeof document !== 'undefined') {
    canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    ctx = canvas.getContext('2d');
  } else {
    throw new Error('Canvas is not supported in this environment');
  }

  if (!ctx) {
    throw new Error('Failed to create 2D canvas context');
  }

  return { canvas, ctx };
}

/**
 * Canvas から WebP 形式の Blob をエクスポートする
 */
export async function exportCanvasToWebPBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  quality: number = 0.85
): Promise<Blob> {
  if ('convertToBlob' in canvas && typeof canvas.convertToBlob === 'function') {
    return canvas.convertToBlob({ type: 'image/webp', quality });
  }
  if ('toBlob' in canvas && typeof canvas.toBlob === 'function') {
    return new Promise<Blob>((resolve, reject) => {
      (canvas as HTMLCanvasElement).toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Canvas export failed'));
        },
        'image/webp',
        quality
      );
    });
  }
  throw new Error('Canvas blob export unsupported in this environment');
}

/** 後方互換用 alias (署名または透かしを描画) */
export function applyWatermarkToContext(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  options?: (SignatureOptions & Partial<WatermarkOptions>) | (WatermarkOptions & Partial<SignatureOptions>) | null
): void {
  if (!options) return;
  if ('position' in options && options.position) {
    applySignatureToContext(ctx, width, height, options as SignatureOptions);
  } else if ('pattern' in options && options.pattern) {
    applyWatermarkPatternToContext(ctx, width, height, options as WatermarkOptions);
  } else {
    applySignatureToContext(ctx, width, height, options as SignatureOptions);
  }
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
    texts = [],
    drawings = [],
    signature = null,
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
    const stageHeight = isRotated90or270 ? sourceWidth : sourceHeight;

    const { canvas, ctx } = createCanvas2D(stageWidth, stageHeight);

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

    // ペン描画を適用
    if (drawings && drawings.length > 0) {
      applyDrawingsToContext(ctx, stageWidth, stageHeight, drawings, canvas);
    }

    // 文字入れ（テキスト合成）を適用
    if (texts && texts.length > 0) {
      applyTextsToContext(ctx, stageWidth, stageHeight, texts);
    }

    // 3. クロップ処理
    let finalCanvas: HTMLCanvasElement | OffscreenCanvas = canvas;
    if (crop && crop.width > 0 && crop.height > 0) {
      const cx = Math.max(0, Math.min(stageWidth - 1, Math.round(crop.x)));
      const cy = Math.max(0, Math.min(stageHeight - 1, Math.round(crop.y)));
      const cw = Math.max(1, Math.min(stageWidth - cx, Math.round(crop.width)));
      const ch = Math.max(1, Math.min(stageHeight - cy, Math.round(crop.height)));

      const { canvas: cropCanvas, ctx: cropCtx } = createCanvas2D(cw, ch);
      cropCtx.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
      finalCanvas = cropCanvas;
    }

    // 4. 盗作防止透かしおよび署名を合成
    const finalCtx = finalCanvas.getContext('2d') as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D
      | null;

    if (finalCtx) {
      if (watermark && watermark.text && watermark.text.trim()) {
        applyWatermarkPatternToContext(finalCtx, finalCanvas.width, finalCanvas.height, watermark);
      }
      if (signature && signature.text && signature.text.trim()) {
        applySignatureToContext(finalCtx, finalCanvas.width, finalCanvas.height, signature);
      }
    }

    // 5. WebP Blob にエクスポート
    const blob = await exportCanvasToWebPBlob(finalCanvas, quality);

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
