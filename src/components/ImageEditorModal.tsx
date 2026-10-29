import { createSignal, createEffect, onMount, onCleanup, Show, For } from 'solid-js';
import { Portal } from 'solid-js/web';
import {
  CropRect,
  MosaicRect,
  ImageAdjustments,
  ImageEditOptions,
  editImageOptimized,
} from '../utils/imageEditor';
import { useApp } from '../store/appStore';

export interface ImageEditorModalProps {
  file: File;
  onSave: (updatedFile: File) => void;
  onClose: () => void;
}

type TabType = 'crop' | 'rotate' | 'adjust' | 'mosaic';
type AspectRatioType = 'free' | '1:1' | '4:3' | '16:9';

export function ImageEditorModal(props: ImageEditorModalProps) {
  const { showToast } = useApp();

  const [activeTab, setActiveTab] = createSignal<TabType>('crop');
  const [isProcessing, setIsProcessing] = createSignal(false);

  // 編集ステート
  const [rotation, setRotation] = createSignal<number>(0); // 0, 90, 180, 270
  const [flipX, setFlipX] = createSignal<boolean>(false);
  const [brightness, setBrightness] = createSignal<number>(100);
  const [contrast, setContrast] = createSignal<number>(100);
  const [saturation, setSaturation] = createSignal<number>(100);
  const [aspectRatio, setAspectRatio] = createSignal<AspectRatioType>('free');

  // クロップ座標 (元画像に対する比率 0.0 - 1.0)
  const [cropBox, setCropBox] = createSignal<{ x: number; y: number; w: number; h: number } | null>(null);

  // モザイク矩形配列 (元画像に対する比率 0.0 - 1.0)
  const [mosaics, setMosaics] = createSignal<{ x: number; y: number; w: number; h: number }[]>([]);

  // プレビュー表示用
  const [previewUrl, setPreviewUrl] = createSignal<string>('');
  const [imgNaturalSize, setImgNaturalSize] = createSignal<{ w: number; h: number }>({ w: 0, h: 0 });

  // ドラッグ操作関連
  let stageRef: HTMLDivElement | undefined;
  let imageRef: HTMLImageElement | undefined;
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  const [currentDragRect, setCurrentDragRect] = createSignal<{ x: number; y: number; w: number; h: number } | null>(null);

  onMount(() => {
    const url = URL.createObjectURL(props.file);
    setPreviewUrl(url);

    const img = new Image();
    img.onload = () => {
      setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = url;

    onCleanup(() => {
      URL.revokeObjectURL(url);
    });
  });

  // クロップ比率変更時
  const handleSetAspectRatio = (ratio: AspectRatioType) => {
    setAspectRatio(ratio);
    if (ratio === 'free') {
      setCropBox(null);
      return;
    }

    // 画像のアスペクト比に合わせて初期中央クロップを設定
    const { w, h } = imgNaturalSize();
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

  // 回転操作
  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };
  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
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

  // ポインター/タッチでのモザイクおよびクロップ矩形ドラッグ描画
  const handlePointerDown = (e: MouseEvent | TouchEvent) => {
    if (activeTab() !== 'mosaic' && activeTab() !== 'crop') return;
    if (!imageRef) return;

    const rect = imageRef.getBoundingClientRect();
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

    isDragging = true;
    dragStart = {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
    setCurrentDragRect({ x: dragStart.x, y: dragStart.y, w: 0, h: 0 });
  };

  const handlePointerMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging || !imageRef) return;

    const rect = imageRef.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

    const currentX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const currentY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    const x = Math.min(dragStart.x, currentX);
    const y = Math.min(dragStart.y, currentY);
    let w = Math.abs(currentX - dragStart.x);
    let h = Math.abs(currentY - dragStart.y);

    if (activeTab() === 'crop' && aspectRatio() !== 'free') {
      let targetRatio = 1;
      if (aspectRatio() === '1:1') targetRatio = 1;
      if (aspectRatio() === '4:3') targetRatio = 4 / 3;
      if (aspectRatio() === '16:9') targetRatio = 16 / 9;

      const imgR = imgNaturalSize().w / imgNaturalSize().h;
      h = (w * imgR) / targetRatio;
    }

    setCurrentDragRect({ x, y, w, h });
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    isDragging = false;
    const drag = currentDragRect();
    setCurrentDragRect(null);

    if (!drag || drag.w < 0.03 || drag.h < 0.03) return;

    if (activeTab() === 'mosaic') {
      setMosaics((prev) => [...prev, drag]);
    } else if (activeTab() === 'crop') {
      setCropBox(drag);
    }
  };

  // 確定保存処理 (Web Worker + GPU オフスレッド処理)
  const handleApply = async () => {
    if (isProcessing()) return;
    setIsProcessing(true);

    try {
      const { w, h } = imgNaturalSize();

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

      const options: ImageEditOptions = {
        crop: cropPixel,
        rotate: rotation(),
        flipHorizontal: flipX(),
        adjustments: {
          brightness: brightness(),
          contrast: contrast(),
          saturation: saturation(),
        },
        mosaics: mosaicPixels,
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

  // プレビューのCSSスタイル (GPU 60fps リアルタイム表示)
  const previewImageStyle = () => {
    const filters = `brightness(${brightness()}%) contrast(${contrast()}%) saturate(${saturation()}%)`;
    const transform = `rotate(${rotation()}deg) scaleX(${flipX() ? -1 : 1})`;
    return {
      filter: filters,
      transform: transform,
      'transform-origin': 'center center',
      transition: isDragging ? 'none' : 'transform 0.2s ease',
    };
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
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
        >
          <div class="mizuna-editor-canvas-wrap">
            <Show when={previewUrl()}>
              <img
                ref={imageRef}
                src={previewUrl()}
                alt="編集プレビュー"
                class="mizuna-editor-preview-img"
                style={previewImageStyle()}
                draggable={false}
              />
            </Show>

            {/* モザイク枠オーバーレイ表示 */}
            <For each={mosaics()}>
              {(m) => (
                <div
                  class="mizuna-mosaic-box"
                  style={{
                    left: `${m.x * 100}%`,
                    top: `${m.y * 100}%`,
                    width: `${m.w * 100}%`,
                    height: `${m.h * 100}%`,
                  }}
                >
                  <div class="mizuna-mosaic-grid-pattern" />
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
                >
                  <div class="mizuna-crop-grid" />
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
          </div>

          <Show when={activeTab() === 'mosaic'}>
            <div class="mizuna-editor-stage-hint">
              <i>touch_app</i>
              <span>隠したい場所をドラッグしてモザイクをかけます</span>
            </div>
          </Show>
          <Show when={activeTab() === 'crop' && aspectRatio() === 'free'}>
            <div class="mizuna-editor-stage-hint">
              <i>crop</i>
              <span>切り抜きたい範囲をドラッグで指定できます</span>
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
          </div>
        </div>
      </div>
    </Portal>
  );
}
