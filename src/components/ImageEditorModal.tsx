import { createSignal, createEffect, onMount, onCleanup, Show, For } from 'solid-js';
import { Portal } from 'solid-js/web';
import {
  CropRect,
  MosaicRect,
  ImageAdjustments,
  ImageEditOptions,
  WatermarkOptions,
  WatermarkPosition,
  editImageOptimized,
} from '../utils/imageEditor';
import { useApp } from '../store/appStore';

export interface ImageEditorModalProps {
  file: File;
  onSave: (updatedFile: File) => void;
  onClose: () => void;
}

type TabType = 'crop' | 'rotate' | 'adjust' | 'mosaic' | 'watermark';
type AspectRatioType = 'free' | '1:1' | '4:3' | '16:9';

export function ImageEditorModal(props: ImageEditorModalProps) {
  const { currentUser, settings, showToast } = useApp();

  const [activeTab, setActiveTab] = createSignal<TabType>('crop');
  const [isProcessing, setIsProcessing] = createSignal(false);

  // 編集ステート
  const [rotation, setRotation] = createSignal<number>(0); // 0, 90, 180, 270
  const [flipX, setFlipX] = createSignal<boolean>(false);
  const [brightness, setBrightness] = createSignal<number>(100);
  const [contrast, setContrast] = createSignal<number>(100);
  const [saturation, setSaturation] = createSignal<number>(100);
  const [aspectRatio, setAspectRatio] = createSignal<AspectRatioType>('free');

  // 透かしステート (初期値は設定値、未設定なら現在のアカウント情報)
  const getInitialWatermarkText = () => {
    const custom = settings().watermark_text?.trim();
    if (custom) return custom;
    const user = currentUser();
    if (user) return `@${user.username}@${user.address}`;
    return '';
  };

  const getInitialPosition = (): WatermarkPosition => {
    const pos = settings().watermark_position;
    if (pos && pos !== 'none') return pos;
    return 'bottom-right';
  };

  const [watermarkEnabled, setWatermarkEnabled] = createSignal<boolean>(false);
  const [watermarkText, setWatermarkText] = createSignal<string>(getInitialWatermarkText());
  const [watermarkPosition, setWatermarkPosition] = createSignal<WatermarkPosition>(getInitialPosition());
  const [watermarkOpacity, setWatermarkOpacity] = createSignal<number>(75);
  const [watermarkScale, setWatermarkScale] = createSignal<number>(100); // 70% - 150%

  // クロップ座標 (元画像に対する比率 0.0 - 1.0)
  const [cropBox, setCropBox] = createSignal<{ x: number; y: number; w: number; h: number } | null>(null);

  // モザイク矩形配列 (元画像に対する比率 0.0 - 1.0)
  const [mosaics, setMosaics] = createSignal<{ x: number; y: number; w: number; h: number }[]>([]);

  // プレビュー表示用
  const [previewUrl, setPreviewUrl] = createSignal<string>('');
  const [imgNaturalSize, setImgNaturalSize] = createSignal<{ w: number; h: number }>({ w: 0, h: 0 });

  // ドラッグ操作関連
  type DragMode =
    | { type: 'create'; startX: number; startY: number }
    | { type: 'crop-move'; startX: number; startY: number; initBox: { x: number; y: number; w: number; h: number } }
    | { type: 'crop-resize'; handle: 'nw' | 'ne' | 'se' | 'sw'; startX: number; startY: number; initBox: { x: number; y: number; w: number; h: number } }
    | { type: 'mosaic-move'; index: number; startX: number; startY: number; initBox: { x: number; y: number; w: number; h: number } }
    | { type: 'mosaic-resize'; index: number; handle: 'nw' | 'ne' | 'se' | 'sw'; startX: number; startY: number; initBox: { x: number; y: number; w: number; h: number } };

  let stageRef: HTMLDivElement | undefined;
  let canvasRef: HTMLCanvasElement | undefined;
  let sourceImage: HTMLImageElement | null = null;
  let activeDrag: DragMode | null = null;
  const [currentDragRect, setCurrentDragRect] = createSignal<{ x: number; y: number; w: number; h: number } | null>(null);

  // 回転・反転を反映した現在のステージ実寸（幅・高さ）
  const currentStageSize = () => {
    const rot = ((rotation() % 360) + 360) % 360;
    const is90or270 = rot === 90 || rot === 270;
    const { w, h } = imgNaturalSize();
    if (w <= 0 || h <= 0) return { w: 1, h: 1 };
    return is90or270 ? { w: h, h: w } : { w, h };
  };

  // プレビュー用 Canvas の再描画 (GPU オフライン描画)
  const renderPreview = () => {
    if (!canvasRef || !sourceImage) return;

    const rot = ((rotation() % 360) + 360) % 360;
    const is90or270 = rot === 90 || rot === 270;
    const origW = sourceImage.naturalWidth;
    const origH = sourceImage.naturalHeight;
    if (origW <= 0 || origH <= 0) return;

    // プレビュー用キャンバスサイズ（最大1400pxにスケールしてパフォーマンス確保）
    const maxDim = 1400;
    let scale = 1;
    if (origW > maxDim || origH > maxDim) {
      scale = maxDim / Math.max(origW, origH);
    }

    const sW = Math.round(origW * scale);
    const sH = Math.round(origH * scale);
    const targetW = is90or270 ? sH : sW;
    const targetH = is90or270 ? sW : sH;

    canvasRef.width = targetW;
    canvasRef.height = targetH;

    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, targetW, targetH);
    ctx.save();
    ctx.filter = `brightness(${brightness()}%) contrast(${contrast()}%) saturate(${saturation()}%)`;
    ctx.translate(targetW / 2, targetH / 2);
    if (rot !== 0) ctx.rotate((rot * Math.PI) / 180);
    if (flipX()) ctx.scale(-1, 1);
    ctx.drawImage(sourceImage, -sW / 2, -sH / 2, sW, sH);
    ctx.restore();
  };

  onMount(() => {
    const url = URL.createObjectURL(props.file);
    setPreviewUrl(url);

    const img = new Image();
    img.onload = () => {
      sourceImage = img;
      setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      renderPreview();
    };
    img.src = url;

    onCleanup(() => {
      URL.revokeObjectURL(url);
    });
  });

  // 編集パラメータ変更時にプレビューを自動再描画
  createEffect(() => {
    rotation();
    flipX();
    brightness();
    contrast();
    saturation();
    renderPreview();
  });

  // クロップ比率変更時
  const handleSetAspectRatio = (ratio: AspectRatioType) => {
    setAspectRatio(ratio);
    if (ratio === 'free') {
      setCropBox(null);
      return;
    }

    // 現在の回転状態に応じた縦横比で初期クロップを設定
    const { w, h } = currentStageSize();
    if (w <= 0 || h <= 0) return;

    let targetRatio = 1;
    if (ratio === '1:1') targetRatio = 1;
    if (ratio === '4:3') targetRatio = 4 / 3;
    if (ratio === '16:9') targetRatio = 16 / 9;

    const currentImgRatio = w / h;
    let cropW = 0.8;
    let cropH = 0.8;

    if (currentImgRatio > targetRatio) {
      cropH = 0.8;
      cropW = (cropH * h * targetRatio) / w;
    } else {
      cropW = 0.8;
      cropH = (cropW * w) / (h * targetRatio);
    }

    setCropBox({
      x: (1 - cropW) / 2,
      y: (1 - cropH) / 2,
      w: cropW,
      h: cropH,
    });
  };

  // 回転操作 (0°, 90°, 180°, 270° の順に正確に回転)
  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
    setCropBox(null); // 回転時はクロップ枠をリセット
  };
  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
    setCropBox(null); // 回転時はクロップ枠をリセット
  };
  const handleToggleFlip = () => {
    setFlipX((prev) => !prev);
  };

  // 色調リセット
  const handleResetAdjustments = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
  };

  // モザイクの直前1件を取り消し
  const handleUndoMosaic = () => {
    setMosaics((prev) => prev.slice(0, -1));
  };

  // 座標を元画像に対する相対座標 (0.0 - 1.0) に変換
  const getNormalizedCoords = (e: MouseEvent | TouchEvent) => {
    if (!canvasRef) return { x: 0, y: 0 };
    const rect = canvasRef.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  };

  // 矩形のリサイズ計算ヘルパー
  const resizeRect = (
    init: { x: number; y: number; w: number; h: number },
    handle: 'nw' | 'ne' | 'se' | 'sw',
    currentX: number,
    currentY: number,
    minSize = 0.04
  ) => {
    let x = init.x;
    let y = init.y;
    let x2 = init.x + init.w;
    let y2 = init.y + init.h;

    if (handle === 'nw') {
      x = Math.max(0, Math.min(currentX, x2 - minSize));
      y = Math.max(0, Math.min(currentY, y2 - minSize));
    } else if (handle === 'ne') {
      x2 = Math.min(1, Math.max(currentX, x + minSize));
      y = Math.max(0, Math.min(currentY, y2 - minSize));
    } else if (handle === 'se') {
      x2 = Math.min(1, Math.max(currentX, x + minSize));
      y2 = Math.min(1, Math.max(currentY, y + minSize));
    } else if (handle === 'sw') {
      x = Math.max(0, Math.min(currentX, x2 - minSize));
      y2 = Math.min(1, Math.max(currentY, y + minSize));
    }

    return {
      x,
      y,
      w: Math.max(minSize, x2 - x),
      h: Math.max(minSize, y2 - y),
    };
  };

  // クロップ枠のドラッグ移動開始
  const startCropMove = (e: MouseEvent | TouchEvent) => {
    if (activeTab() !== 'crop' || !cropBox()) return;
    e.stopPropagation();
    const coords = getNormalizedCoords(e);
    activeDrag = {
      type: 'crop-move',
      startX: coords.x,
      startY: coords.y,
      initBox: { ...cropBox()! },
    };
  };

  // クロップ枠の角ドラッグリサイズ開始
  const startCropResize = (e: MouseEvent | TouchEvent, handle: 'nw' | 'ne' | 'se' | 'sw') => {
    if (activeTab() !== 'crop' || !cropBox()) return;
    e.stopPropagation();
    const coords = getNormalizedCoords(e);
    activeDrag = {
      type: 'crop-resize',
      handle,
      startX: coords.x,
      startY: coords.y,
      initBox: { ...cropBox()! },
    };
  };

  // モザイク枠のドラッグ移動開始
  const startMosaicMove = (e: MouseEvent | TouchEvent, index: number) => {
    if (activeTab() !== 'mosaic' || !mosaics()[index]) return;
    e.stopPropagation();
    const coords = getNormalizedCoords(e);
    activeDrag = {
      type: 'mosaic-move',
      index,
      startX: coords.x,
      startY: coords.y,
      initBox: { ...mosaics()[index] },
    };
  };

  // モザイク枠の角ドラッグリサイズ開始
  const startMosaicResize = (e: MouseEvent | TouchEvent, index: number, handle: 'nw' | 'ne' | 'se' | 'sw') => {
    if (activeTab() !== 'mosaic' || !mosaics()[index]) return;
    e.stopPropagation();
    const coords = getNormalizedCoords(e);
    activeDrag = {
      type: 'mosaic-resize',
      index,
      handle,
      startX: coords.x,
      startY: coords.y,
      initBox: { ...mosaics()[index] },
    };
  };

  // ステージ上での新規矩形ドラッグ開始
  const handleStagePointerDown = (e: MouseEvent | TouchEvent) => {
    if (activeTab() !== 'mosaic' && activeTab() !== 'crop') return;
    if (!canvasRef) return;

    const rect = canvasRef.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      return;
    }

    const coords = getNormalizedCoords(e);
    activeDrag = {
      type: 'create',
      startX: coords.x,
      startY: coords.y,
    };
    setCurrentDragRect({ x: coords.x, y: coords.y, w: 0, h: 0 });
  };

  const handlePointerMove = (e: MouseEvent | TouchEvent) => {
    if (!activeDrag || !canvasRef) return;

    const coords = getNormalizedCoords(e);

    if (activeDrag.type === 'create') {
      const x = Math.min(activeDrag.startX, coords.x);
      const y = Math.min(activeDrag.startY, coords.y);
      let w = Math.abs(coords.x - activeDrag.startX);
      let h = Math.abs(coords.y - activeDrag.startY);

      if (activeTab() === 'crop' && aspectRatio() !== 'free') {
        let targetRatio = 1;
        if (aspectRatio() === '1:1') targetRatio = 1;
        if (aspectRatio() === '4:3') targetRatio = 4 / 3;
        if (aspectRatio() === '16:9') targetRatio = 16 / 9;

        const imgR = currentStageSize().w / currentStageSize().h;
        h = Math.min(1 - y, (w * imgR) / targetRatio);
      }

      setCurrentDragRect({ x, y, w, h });
    } else if (activeDrag.type === 'crop-move') {
      const dx = coords.x - activeDrag.startX;
      const dy = coords.y - activeDrag.startY;
      const box = activeDrag.initBox;
      const newX = Math.max(0, Math.min(1 - box.w, box.x + dx));
      const newY = Math.max(0, Math.min(1 - box.h, box.y + dy));
      setCropBox({ x: newX, y: newY, w: box.w, h: box.h });
    } else if (activeDrag.type === 'crop-resize') {
      const updated = resizeRect(activeDrag.initBox, activeDrag.handle, coords.x, coords.y);
      if (aspectRatio() !== 'free') {
        let targetRatio = 1;
        if (aspectRatio() === '1:1') targetRatio = 1;
        if (aspectRatio() === '4:3') targetRatio = 4 / 3;
        if (aspectRatio() === '16:9') targetRatio = 16 / 9;
        const imgR = currentStageSize().w / currentStageSize().h;
        updated.h = Math.min(1 - updated.y, (updated.w * imgR) / targetRatio);
      }
      setCropBox(updated);
    } else if (activeDrag.type === 'mosaic-move') {
      const dx = coords.x - activeDrag.startX;
      const dy = coords.y - activeDrag.startY;
      const box = activeDrag.initBox;
      const newX = Math.max(0, Math.min(1 - box.w, box.x + dx));
      const newY = Math.max(0, Math.min(1 - box.h, box.y + dy));
      const idx = activeDrag.index;
      setMosaics((prev) =>
        prev.map((item, i) => (i === idx ? { x: newX, y: newY, w: box.w, h: box.h } : item))
      );
    } else if (activeDrag.type === 'mosaic-resize') {
      const updated = resizeRect(activeDrag.initBox, activeDrag.handle, coords.x, coords.y);
      const idx = activeDrag.index;
      setMosaics((prev) =>
        prev.map((item, i) => (i === idx ? updated : item))
      );
    }
  };

  const handlePointerUp = () => {
    if (!activeDrag) return;
    const current = activeDrag;
    activeDrag = null;

    if (current.type === 'create') {
      const drag = currentDragRect();
      setCurrentDragRect(null);

      if (!drag || drag.w < 0.03 || drag.h < 0.03) return;

      if (activeTab() === 'mosaic') {
        setMosaics((prev) => [...prev, drag]);
      } else if (activeTab() === 'crop') {
        setCropBox(drag);
      }
    }
  };

  // 確定保存処理 (Web Worker + GPU オフスレッド処理)
  const handleApply = async () => {
    if (isProcessing()) return;
    setIsProcessing(true);

    try {
      const { w, h } = currentStageSize();

      let cropPixel: CropRect | null = null;
      const c = cropBox();
      if (c && c.w > 0 && c.h > 0 && w > 0 && h > 0) {
        cropPixel = {
          x: Math.round(c.x * w),
          y: Math.round(c.y * h),
          width: Math.round(c.w * w),
          height: Math.round(c.h * h),
        };
      }

      const mosaicPixels: MosaicRect[] = mosaics().map((m) => ({
        x: Math.round(m.x * w),
        y: Math.round(m.y * h),
        width: Math.round(m.w * w),
        height: Math.round(m.h * h),
        blockSize: Math.max(8, Math.round(Math.min(w, h) / 35)),
      }));

      const watermarkOption: WatermarkOptions | null =
        watermarkEnabled() && watermarkText().trim()
          ? {
              text: watermarkText().trim(),
              position: watermarkPosition(),
              opacity: watermarkOpacity() / 100,
              scale: watermarkScale() / 100,
            }
          : null;

      const options: ImageEditOptions = {
        crop: cropPixel,
        rotate: ((rotation() % 360) + 360) % 360,
        flipHorizontal: flipX(),
        adjustments: {
          brightness: brightness(),
          contrast: contrast(),
          saturation: saturation(),
        },
        mosaics: mosaicPixels,
        watermark: watermarkOption,
        quality: 0.85,
      };

      const updatedFile = await editImageOptimized(props.file, options);
      showToast('画像を加工しました', 'success');
      props.onSave(updatedFile);
      props.onClose();
    } catch (err) {
      console.error('Image edit failed:', err);
      showToast('画像の加工に失敗しました', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Portal>
      <div
        class="mizuna-image-editor-portal"
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        {/* ヘッダーバー */}
        <div class="mizuna-editor-topbar">
          <button
            type="button"
            class="mizuna-btn mizuna-btn-ghost"
            onClick={props.onClose}
            disabled={isProcessing()}
          >
            <i>close</i>
            <span>キャンセル</span>
          </button>
          <div class="mizuna-editor-title">画像を加工</div>
          <button
            type="button"
            class="mizuna-btn mizuna-btn-primary"
            onClick={handleApply}
            disabled={isProcessing()}
          >
            <Show when={isProcessing()} fallback={<i>check</i>}>
              <i class="is-spinning">sync</i>
            </Show>
            <span>{isProcessing() ? '処理中...' : '完了'}</span>
          </button>
        </div>

        {/* 画像ステージ */}
        <div
          ref={stageRef}
          class="mizuna-editor-stage"
          onMouseDown={handleStagePointerDown}
          onTouchStart={handleStagePointerDown}
        >
          <div class="mizuna-editor-canvas-wrap">
            <canvas
              ref={canvasRef}
              class="mizuna-editor-preview-canvas"
            />

            {/* モザイク枠オーバーレイ表示 */}
            <For each={mosaics()}>
              {(m, index) => (
                <div
                  class={`mizuna-mosaic-box ${activeTab() === 'mosaic' ? 'is-editable' : ''}`}
                  style={{
                    left: `${m.x * 100}%`,
                    top: `${m.y * 100}%`,
                    width: `${m.w * 100}%`,
                    height: `${m.h * 100}%`,
                  }}
                  onMouseDown={(e) => startMosaicMove(e, index())}
                  onTouchStart={(e) => startMosaicMove(e, index())}
                >
                  <div class="mizuna-mosaic-grid-pattern" />
                  <Show when={activeTab() === 'mosaic'}>
                    <div
                      class="mizuna-box-handle handle-nw"
                      onMouseDown={(e) => startMosaicResize(e, index(), 'nw')}
                      onTouchStart={(e) => startMosaicResize(e, index(), 'nw')}
                    />
                    <div
                      class="mizuna-box-handle handle-ne"
                      onMouseDown={(e) => startMosaicResize(e, index(), 'ne')}
                      onTouchStart={(e) => startMosaicResize(e, index(), 'ne')}
                    />
                    <div
                      class="mizuna-box-handle handle-se"
                      onMouseDown={(e) => startMosaicResize(e, index(), 'se')}
                      onTouchStart={(e) => startMosaicResize(e, index(), 'se')}
                    />
                    <div
                      class="mizuna-box-handle handle-sw"
                      onMouseDown={(e) => startMosaicResize(e, index(), 'sw')}
                      onTouchStart={(e) => startMosaicResize(e, index(), 'sw')}
                    />
                  </Show>
                </div>
              )}
            </For>

            {/* クロップ枠オーバーレイ */}
            <Show when={cropBox()}>
              {(cb) => (
                <div
                  class="mizuna-crop-box"
                  style={{
                    left: `${cb().x * 100}%`,
                    top: `${cb().y * 100}%`,
                    width: `${cb().w * 100}%`,
                    height: `${cb().h * 100}%`,
                  }}
                  onMouseDown={startCropMove}
                  onTouchStart={startCropMove}
                >
                  <div class="mizuna-crop-grid" />
                  <div
                    class="mizuna-box-handle handle-nw"
                    onMouseDown={(e) => startCropResize(e, 'nw')}
                    onTouchStart={(e) => startCropResize(e, 'nw')}
                  />
                  <div
                    class="mizuna-box-handle handle-ne"
                    onMouseDown={(e) => startCropResize(e, 'ne')}
                    onTouchStart={(e) => startCropResize(e, 'ne')}
                  />
                  <div
                    class="mizuna-box-handle handle-se"
                    onMouseDown={(e) => startCropResize(e, 'se')}
                    onTouchStart={(e) => startCropResize(e, 'se')}
                  />
                  <div
                    class="mizuna-box-handle handle-sw"
                    onMouseDown={(e) => startCropResize(e, 'sw')}
                    onTouchStart={(e) => startCropResize(e, 'sw')}
                  />
                </div>
              )}
            </Show>

            {/* 現在ドラッグ中の矩形 */}
            <Show when={currentDragRect()}>
              {(dr) => (
                <div
                  class={`mizuna-drag-preview-box ${activeTab() === 'crop' ? 'is-crop' : 'is-mosaic'}`}
                  style={{
                    left: `${dr().x * 100}%`,
                    top: `${dr().y * 100}%`,
                    width: `${dr().w * 100}%`,
                    height: `${dr().h * 100}%`,
                  }}
                />
              )}
            </Show>

            {/* 透かしリアルタイムプレビュー */}
            <Show when={watermarkEnabled() && watermarkText().trim()}>
              <div
                class={`mizuna-watermark-preview-pill is-${watermarkPosition()}`}
                style={{
                  opacity: watermarkOpacity() / 100,
                  transform: `scale(${watermarkScale() / 100})`,
                  'transform-origin':
                    watermarkPosition() === 'bottom-right'
                      ? 'bottom right'
                      : watermarkPosition() === 'bottom-left'
                      ? 'bottom left'
                      : watermarkPosition() === 'top-right'
                      ? 'top right'
                      : watermarkPosition() === 'top-left'
                      ? 'top left'
                      : 'center center',
                }}
              >
                <span>{watermarkText()}</span>
              </div>
            </Show>
          </div>

          <Show when={activeTab() === 'mosaic'}>
            <div class="mizuna-editor-stage-hint">
              <i>touch_app</i>
              <span>ドラッグで新規作成・枠をつまんでサイズや位置を変更できます</span>
            </div>
          </Show>
          <Show when={activeTab() === 'crop'}>
            <div class="mizuna-editor-stage-hint">
              <i>crop</i>
              <span>ドラッグで新規指定・四隅のハンドルでサイズ変更できます</span>
            </div>
          </Show>
        </div>

        {/* コントロールパネル */}
        <div class="mizuna-editor-panel">
          {/* タブごとのツールUI */}
          <div class="mizuna-editor-tab-content">
            {/* 1. トリミングタブ */}
            <Show when={activeTab() === 'crop'}>
              <div class="mizuna-editor-crop-tools">
                <span class="mizuna-editor-sublabel">縦横比:</span>
                <div class="mizuna-seg-pills">
                  <button
                    type="button"
                    class={`mizuna-seg-pill ${aspectRatio() === 'free' ? 'is-active' : ''}`}
                    onClick={() => handleSetAspectRatio('free')}
                  >
                    <span>自由</span>
                  </button>
                  <button
                    type="button"
                    class={`mizuna-seg-pill ${aspectRatio() === '1:1' ? 'is-active' : ''}`}
                    onClick={() => handleSetAspectRatio('1:1')}
                  >
                    <span>1:1</span>
                  </button>
                  <button
                    type="button"
                    class={`mizuna-seg-pill ${aspectRatio() === '4:3' ? 'is-active' : ''}`}
                    onClick={() => handleSetAspectRatio('4:3')}
                  >
                    <span>4:3</span>
                  </button>
                  <button
                    type="button"
                    class={`mizuna-seg-pill ${aspectRatio() === '16:9' ? 'is-active' : ''}`}
                    onClick={() => handleSetAspectRatio('16:9')}
                  >
                    <span>16:9</span>
                  </button>
                </div>
                <Show when={cropBox()}>
                  <button
                    type="button"
                    class="mizuna-btn mizuna-btn-ghost mizuna-btn-sm"
                    onClick={() => setCropBox(null)}
                  >
                    <i>restart_alt</i>
                    <span>解除</span>
                  </button>
                </Show>
              </div>
            </Show>

            {/* 2. 回転・反転タブ */}
            <Show when={activeTab() === 'rotate'}>
              <div class="mizuna-editor-rotate-tools">
                <button
                  type="button"
                  class="mizuna-btn mizuna-btn-outline"
                  onClick={handleRotateLeft}
                >
                  <i>rotate_left</i>
                  <span>左90°</span>
                </button>
                <button
                  type="button"
                  class="mizuna-btn mizuna-btn-outline"
                  onClick={handleRotateRight}
                >
                  <i>rotate_right</i>
                  <span>右90°</span>
                </button>
                <button
                  type="button"
                  class={`mizuna-btn ${flipX() ? 'mizuna-btn-primary' : 'mizuna-btn-outline'}`}
                  onClick={handleToggleFlip}
                >
                  <i>flip</i>
                  <span>左右反転</span>
                </button>
              </div>
            </Show>

            {/* 3. 補正タブ */}
            <Show when={activeTab() === 'adjust'}>
              <div class="mizuna-editor-adjust-tools">
                <div class="mizuna-adjust-slider-row">
                  <span class="mizuna-adjust-label">
                    <i>brightness_6</i>
                    <span>明るさ</span>
                  </span>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={brightness()}
                    onInput={(e) => setBrightness(Number(e.currentTarget.value))}
                    class="mizuna-slider"
                  />
                  <span class="mizuna-adjust-value">{brightness()}%</span>
                </div>

                <div class="mizuna-adjust-slider-row">
                  <span class="mizuna-adjust-label">
                    <i>contrast</i>
                    <span>対比</span>
                  </span>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={contrast()}
                    onInput={(e) => setContrast(Number(e.currentTarget.value))}
                    class="mizuna-slider"
                  />
                  <span class="mizuna-adjust-value">{contrast()}%</span>
                </div>

                <div class="mizuna-adjust-slider-row">
                  <span class="mizuna-adjust-label">
                    <i>palette</i>
                    <span>彩度</span>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={saturation()}
                    onInput={(e) => setSaturation(Number(e.currentTarget.value))}
                    class="mizuna-slider"
                  />
                  <span class="mizuna-adjust-value">{saturation()}%</span>
                </div>

                <button
                  type="button"
                  class="mizuna-btn mizuna-btn-ghost mizuna-btn-sm"
                  onClick={handleResetAdjustments}
                >
                  <i>restart_alt</i>
                  <span>標準に戻す</span>
                </button>
              </div>
            </Show>

            {/* 4. モザイクタブ */}
            <Show when={activeTab() === 'mosaic'}>
              <div class="mizuna-editor-mosaic-tools">
                <span>モザイク: {mosaics().length} 箇所</span>
                <button
                  type="button"
                  class="mizuna-btn mizuna-btn-outline mizuna-btn-sm"
                  onClick={handleUndoMosaic}
                  disabled={mosaics().length === 0}
                >
                  <i>undo</i>
                  <span>1つ取り消す</span>
                </button>
                <button
                  type="button"
                  class="mizuna-btn mizuna-btn-ghost mizuna-btn-sm"
                  onClick={() => setMosaics([])}
                  disabled={mosaics().length === 0}
                >
                  <i>delete</i>
                  <span>全消去</span>
                </button>
              </div>
            </Show>

            {/* 5. 透かしタブ */}
            <Show when={activeTab() === 'watermark'}>
              <div class="mizuna-editor-watermark-tools">
                <div class="mizuna-watermark-header">
                  <span class="mizuna-editor-sublabel">透かしを合成:</span>
                  <div class="mizuna-seg-pills">
                    <button
                      type="button"
                      class={`mizuna-seg-pill ${!watermarkEnabled() ? 'is-active' : ''}`}
                      onClick={() => setWatermarkEnabled(false)}
                    >
                      <span>OFF</span>
                    </button>
                    <button
                      type="button"
                      class={`mizuna-seg-pill ${watermarkEnabled() ? 'is-active' : ''}`}
                      onClick={() => setWatermarkEnabled(true)}
                    >
                      <span>ON</span>
                    </button>
                  </div>
                </div>

                <Show when={watermarkEnabled()}>
                  <div class="mizuna-watermark-options">
                    <div class="mizuna-watermark-input-group">
                      <span class="mizuna-editor-sublabel">テキスト:</span>
                      <input
                        type="text"
                        class="mizuna-editor-text-input"
                        value={watermarkText()}
                        placeholder="@username@instance"
                        onInput={(e) => setWatermarkText(e.currentTarget.value)}
                      />
                    </div>

                    <div class="mizuna-watermark-pos-group">
                      <span class="mizuna-editor-sublabel">位置:</span>
                      <div class="mizuna-seg-pills mizuna-seg-pills-wrap">
                        <button
                          type="button"
                          class={`mizuna-seg-pill ${watermarkPosition() === 'bottom-right' ? 'is-active' : ''}`}
                          onClick={() => setWatermarkPosition('bottom-right')}
                        >
                          <span>右下</span>
                        </button>
                        <button
                          type="button"
                          class={`mizuna-seg-pill ${watermarkPosition() === 'bottom-left' ? 'is-active' : ''}`}
                          onClick={() => setWatermarkPosition('bottom-left')}
                        >
                          <span>左下</span>
                        </button>
                        <button
                          type="button"
                          class={`mizuna-seg-pill ${watermarkPosition() === 'top-right' ? 'is-active' : ''}`}
                          onClick={() => setWatermarkPosition('top-right')}
                        >
                          <span>右上</span>
                        </button>
                        <button
                          type="button"
                          class={`mizuna-seg-pill ${watermarkPosition() === 'top-left' ? 'is-active' : ''}`}
                          onClick={() => setWatermarkPosition('top-left')}
                        >
                          <span>左上</span>
                        </button>
                        <button
                          type="button"
                          class={`mizuna-seg-pill ${watermarkPosition() === 'center' ? 'is-active' : ''}`}
                          onClick={() => setWatermarkPosition('center')}
                        >
                          <span>中央</span>
                        </button>
                      </div>
                    </div>

                    <div class="mizuna-adjust-slider-row">
                      <span class="mizuna-editor-sublabel">不透明度:</span>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={watermarkOpacity()}
                        onInput={(e) => setWatermarkOpacity(Number(e.currentTarget.value))}
                        class="mizuna-slider"
                      />
                      <span class="mizuna-adjust-value">{watermarkOpacity()}%</span>
                    </div>

                    <div class="mizuna-adjust-slider-row">
                      <span class="mizuna-editor-sublabel">文字サイズ:</span>
                      <input
                        type="range"
                        min="60"
                        max="160"
                        value={watermarkScale()}
                        onInput={(e) => setWatermarkScale(Number(e.currentTarget.value))}
                        class="mizuna-slider"
                      />
                      <span class="mizuna-adjust-value">{watermarkScale()}%</span>
                    </div>
                  </div>
                </Show>
              </div>
            </Show>
          </div>

          {/* 下部機能切り替えタブバー */}
          <div class="mizuna-editor-tabs">
            <button
              type="button"
              class={`mizuna-editor-tab-btn ${activeTab() === 'crop' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('crop')}
            >
              <i>crop</i>
              <span>切り抜き</span>
            </button>
            <button
              type="button"
              class={`mizuna-editor-tab-btn ${activeTab() === 'rotate' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('rotate')}
            >
              <i>rotate_right</i>
              <span>回転・反転</span>
            </button>
            <button
              type="button"
              class={`mizuna-editor-tab-btn ${activeTab() === 'adjust' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('adjust')}
            >
              <i>tune</i>
              <span>色調補正</span>
            </button>
            <button
              type="button"
              class={`mizuna-editor-tab-btn ${activeTab() === 'mosaic' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('mosaic')}
            >
              <i>blur_on</i>
              <span>モザイク</span>
            </button>
            <button
              type="button"
              class={`mizuna-editor-tab-btn ${activeTab() === 'watermark' ? 'is-active' : ''}`}
              onClick={() => {
                setActiveTab('watermark');
                if (!watermarkEnabled() && watermarkText()) {
                  setWatermarkEnabled(true);
                }
              }}
            >
              <i>branding_watermark</i>
              <span>透かし</span>
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
