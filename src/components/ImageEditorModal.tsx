import { createSignal, createEffect, onMount, onCleanup, Show, For } from 'solid-js';
import { Portal } from 'solid-js/web';
import {
  CropRect,
  MosaicRect,
  MosaicType,
  ImageTextItem,
  DrawingStroke,
  DrawingMode,
  DrawingPoint,
  ImageAdjustments,
  ImageEditOptions,
  ImageEditState,
  SignatureOptions,
  SignaturePosition,
  WatermarkOptions,
  WatermarkPattern,
  applyDrawingsToContext,
  applySignatureToContext,
  applyWatermarkPatternToContext,
  editImageOptimized,
  isColorLight,
} from '../utils/imageEditor';
import { useApp } from '../store/appStore';

export interface ImageEditorModalProps {
  file: File;
  initialState?: ImageEditState;
  onSave: (updatedFile: File, state: ImageEditState) => void;
  onClose: () => void;
}

type TabType = 'crop' | 'rotate' | 'adjust' | 'mosaic' | 'draw' | 'text' | 'watermark' | 'signature';
type AspectRatioType = 'free' | '1:1' | '4:3' | '16:9';

export function ImageEditorModal(props: ImageEditorModalProps) {
  const { currentUser, settings, showToast } = useApp();

  const [activeTab, setActiveTab] = createSignal<TabType>('crop');
  const [isProcessing, setIsProcessing] = createSignal(false);

  const init = props.initialState;

  // 編集ステート（前回の加工設定があればそのまま復元して継続編集を可能にする）
  const [rotation, setRotation] = createSignal<number>(init?.rotation ?? 0); // 0, 90, 180, 270
  const [flipX, setFlipX] = createSignal<boolean>(init?.flipX ?? false);
  const [brightness, setBrightness] = createSignal<number>(init?.brightness ?? 100);
  const [contrast, setContrast] = createSignal<number>(init?.contrast ?? 100);
  const [saturation, setSaturation] = createSignal<number>(init?.saturation ?? 100);
  const [aspectRatio, setAspectRatio] = createSignal<AspectRatioType>(init?.aspectRatio ?? 'free');

  // 1. 画像透かしステート (画像全面パターン)
  const getInitialWatermarkText = () => {
    if (init?.watermarkText !== undefined) return init.watermarkText;
    const custom = settings().watermark_text?.trim();
    if (custom) return custom;
    const user = currentUser();
    if (user) return `@${user.username}@${user.address}`;
    return '@username@instance';
  };

  const [watermarkEnabled, setWatermarkEnabled] = createSignal<boolean>(
    init?.watermarkEnabled ?? (settings().watermark_enabled ?? false)
  );
  const [watermarkText, setWatermarkText] = createSignal<string>(getInitialWatermarkText());
  const [watermarkPattern, setWatermarkPattern] = createSignal<WatermarkPattern>(
    init?.watermarkPattern ?? (settings().watermark_pattern ?? 'diagonal')
  );
  const [watermarkOpacity, setWatermarkOpacity] = createSignal<number>(init?.watermarkOpacity ?? 22);
  const [watermarkScale, setWatermarkScale] = createSignal<number>(init?.watermarkScale ?? 100);

  // 2. 署名ステート (四隅クレジット表記)
  const getInitialSignatureText = () => {
    if (init?.signatureText !== undefined) return init.signatureText;
    const custom = settings().signature_text?.trim() || settings().watermark_text?.trim();
    if (custom) return custom;
    const user = currentUser();
    if (user) return `@${user.username}@${user.address}`;
    return '';
  };

  const getInitialSignaturePosition = (): SignaturePosition => {
    if (init?.signaturePosition !== undefined) return init.signaturePosition;
    const pos = settings().signature_position ?? settings().watermark_position;
    if (pos && pos !== 'none') return pos;
    return 'bottom-right';
  };

  const [signatureEnabled, setSignatureEnabled] = createSignal<boolean>(
    init?.signatureEnabled ?? (
      (settings().signature_position && settings().signature_position !== 'none') ||
      (settings().watermark_position && settings().watermark_position !== 'none')
        ? true
        : false
    )
  );
  const [signatureText, setSignatureText] = createSignal<string>(getInitialSignatureText());
  const [signaturePosition, setSignaturePosition] = createSignal<SignaturePosition>(getInitialSignaturePosition());
  const [signatureOpacity, setSignatureOpacity] = createSignal<number>(init?.signatureOpacity ?? 85);
  const [signatureScale, setSignatureScale] = createSignal<number>(init?.signatureScale ?? 100);

  // クロップ座標 (元画像に対する比率 0.0 - 1.0)
  const [cropBox, setCropBox] = createSignal<{ x: number; y: number; w: number; h: number } | null>(
    init?.cropBox ? { ...init.cropBox } : null
  );

  // モザイク種類（'blur': すりガラス, 'pixelate': ブロック）
  const [mosaicType, setMosaicType] = createSignal<MosaicType>(init?.mosaicType ?? 'blur');
  // モザイク操作モード（'rect': 矩形選択, 'pen': フリーハンドペン）
  const [mosaicTool, setMosaicTool] = createSignal<'rect' | 'pen'>('rect');
  const [mosaicPenSize, setMosaicPenSize] = createSignal<number>(24);
  // モザイク粒度（ブロックサイズ / ブラー半径）
  const [pixelateGranularity, setPixelateGranularity] = createSignal<number>(
    init?.pixelateGranularity ?? 24
  );
  const [blurGranularity, setBlurGranularity] = createSignal<number>(
    init?.blurGranularity ?? 16
  );

  // モザイク矩形配列 (元画像に対する比率 0.0 - 1.0)
  const [mosaics, setMosaics] = createSignal<{ x: number; y: number; w: number; h: number; type?: MosaicType; granularity?: number }[]>(
    init?.mosaics ? init.mosaics.map((m) => ({ ...m, type: m.type ?? 'blur', granularity: m.granularity })) : []
  );

  // 文字入れ（テキストアイテム）ステート
  const [texts, setTexts] = createSignal<ImageTextItem[]>(
    init?.texts ? init.texts.map((t) => ({ ...t })) : []
  );
  const [selectedTextId, setSelectedTextId] = createSignal<string | null>(
    init?.texts && init.texts.length > 0 ? init.texts[0].id : null
  );
  const selectedTextItem = () => {
    const id = selectedTextId();
    if (!id) return null;
    return texts().find((t) => t.id === id) ?? null;
  };

  // ペン描画ステート
  const [drawings, setDrawings] = createSignal<DrawingStroke[]>(
    init?.drawings
      ? init.drawings.map((d) => ({
          ...d,
          points: d.points.map((p) => ({ ...p })),
        }))
      : []
  );
  const [penMode, setPenMode] = createSignal<DrawingMode>('pen');
  const [penColor, setPenColor] = createSignal<string>('#ff3b30');
  const [penSize, setPenSize] = createSignal<number>(6);

  // プレビュー表示用
  const [previewUrl, setPreviewUrl] = createSignal<string>('');
  const [imgNaturalSize, setImgNaturalSize] = createSignal<{ w: number; h: number }>({ w: 0, h: 0 });

  // ドラッグ操作関連
  type DragMode =
    | { type: 'create'; startX: number; startY: number }
    | { type: 'crop-move'; startX: number; startY: number; initBox: { x: number; y: number; w: number; h: number } }
    | { type: 'crop-resize'; handle: 'nw' | 'ne' | 'se' | 'sw'; startX: number; startY: number; initBox: { x: number; y: number; w: number; h: number } }
    | { type: 'mosaic-move'; index: number; startX: number; startY: number; initBox: { x: number; y: number; w: number; h: number; type?: MosaicType } }
    | { type: 'mosaic-resize'; index: number; handle: 'nw' | 'ne' | 'se' | 'sw'; startX: number; startY: number; initBox: { x: number; y: number; w: number; h: number; type?: MosaicType } }
    | { type: 'text-move'; id: string; startX: number; startY: number; initPos: { x: number; y: number } }
    | { type: 'draw' };

  let stageRef: HTMLDivElement | undefined;
  let canvasRef: HTMLCanvasElement | undefined;
  let drawingCanvasRef: HTMLCanvasElement | undefined;
  let sourceImage: HTMLImageElement | null = null;
  let activeDrag: DragMode | null = null;
  let activeStroke: DrawingStroke | null = null;
  let drawingRafId: number | null = null;
  const [currentDragRect, setCurrentDragRect] = createSignal<{ x: number; y: number; w: number; h: number } | null>(null);

  // ペン描画オーバーレイキャンバスの再描画
  const renderAllDrawingsToCanvas = () => {
    if (!drawingCanvasRef) return;
    const ctx = drawingCanvasRef.getContext('2d');
    if (!ctx) return;
    const w = drawingCanvasRef.width;
    const h = drawingCanvasRef.height;
    if (w <= 0 || h <= 0) return;

    ctx.clearRect(0, 0, w, h);

    const allStrokes = activeStroke
      ? [...drawings(), activeStroke]
      : drawings();

    if (allStrokes.length === 0) return;

    applyDrawingsToContext(ctx, w, h, allStrokes, canvasRef);
  };

  const scheduleDrawingRender = () => {
    if (drawingRafId !== null) return;
    drawingRafId = requestAnimationFrame(() => {
      drawingRafId = null;
      renderAllDrawingsToCanvas();
    });
  };

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

    // プレビューにも盗作防止透かしを実寸比率でそのまま描画
    if (watermarkEnabled() && watermarkText().trim()) {
      applyWatermarkPatternToContext(ctx, targetW, targetH, {
        text: watermarkText().trim(),
        pattern: watermarkPattern(),
        opacity: watermarkOpacity() / 100,
        scale: watermarkScale() / 100,
      });
    }

    // プレビューにも署名を実寸比率でそのまま描画
    if (signatureEnabled() && signatureText().trim()) {
      applySignatureToContext(ctx, targetW, targetH, {
        text: signatureText().trim(),
        position: signaturePosition(),
        opacity: signatureOpacity() / 100,
        scale: signatureScale() / 100,
      });
    }

    // ペン描画オーバーレイキャンバスのサイズも同期
    if (drawingCanvasRef) {
      drawingCanvasRef.width = targetW;
      drawingCanvasRef.height = targetH;
      renderAllDrawingsToCanvas();
    }
  };

  // ブロックモザイク用のリアルタイムピクセルプレビュー描画（ガビガビ描画）
  const renderMosaicPreviewCanvas = (
    el: HTMLCanvasElement | undefined,
    rect: { x: number; y: number; w: number; h: number; granularity?: number; type?: MosaicType }
  ) => {
    if (!el || !canvasRef) return;
    const cW = canvasRef.width;
    const cH = canvasRef.height;
    if (cW <= 0 || cH <= 0) return;

    const rx = Math.max(0, Math.round(rect.x * cW));
    const ry = Math.max(0, Math.round(rect.y * cH));
    const rw = Math.max(1, Math.min(cW - rx, Math.round(rect.w * cW)));
    const rh = Math.max(1, Math.min(cH - ry, Math.round(rect.h * cH)));

    const gran = rect.granularity || pixelateGranularity() || 24;
    const blockSize = Math.max(6, Math.min(80, gran));
    const downW = Math.max(1, Math.round(rw / blockSize));
    const downH = Math.max(1, Math.round(rh / blockSize));

    el.width = downW;
    el.height = downH;

    const ctx = el.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(canvasRef, rx, ry, rw, rh, 0, 0, downW, downH);
  };

  // ペン描画ステート変更時の再描画
  createEffect(() => {
    drawings();
    renderAllDrawingsToCanvas();
  });

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

    // グローバルなポインタ移動・終了イベントを登録（スワイプ時の追従を完全保証）
    const onGlobalMove = (e: PointerEvent) => handlePointerMove(e);
    const onGlobalUp = () => handlePointerUp();

    window.addEventListener('pointermove', onGlobalMove, { passive: false });
    window.addEventListener('pointerup', onGlobalUp, { passive: false });
    window.addEventListener('pointercancel', onGlobalUp, { passive: false });

    onCleanup(() => {
      URL.revokeObjectURL(url);
      window.removeEventListener('pointermove', onGlobalMove);
      window.removeEventListener('pointerup', onGlobalUp);
      window.removeEventListener('pointercancel', onGlobalUp);
    });
  });

  // 編集パラメータ変更時にプレビューを自動再描画
  createEffect(() => {
    rotation();
    flipX();
    brightness();
    contrast();
    saturation();
    watermarkEnabled();
    watermarkText();
    watermarkPattern();
    watermarkOpacity();
    watermarkScale();
    signatureEnabled();
    signatureText();
    signaturePosition();
    signatureOpacity();
    signatureScale();
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

  // 編集全体の全リセット（未加工状態へ戻す）
  const handleResetAll = () => {
    setRotation(0);
    setFlipX(false);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setAspectRatio('free');
    setCropBox(null);
    setMosaicType('blur');
    setPixelateGranularity(24);
    setBlurGranularity(16);
    setMosaics([]);
    setTexts([]);
    setSelectedTextId(null);
    setDrawings([]);
    setWatermarkEnabled(false);
    setSignatureEnabled(false);
    showToast('編集内容をリセットしました', 'info');
  };

  // ペン描画操作ハンドラー
  const handleUndoDrawing = () => {
    setDrawings((prev) => prev.slice(0, -1));
  };

  const handleClearDrawings = () => {
    setDrawings([]);
  };

  const handleSetPenMode = (mode: DrawingMode) => {
    setPenMode(mode);
    if (mode === 'highlighter' && penSize() < 10) {
      setPenSize(18);
    } else if (mode === 'mosaic' && penSize() < 12) {
      setPenSize(24);
    } else if (mode === 'pen' && penSize() > 24) {
      setPenSize(6);
    }
  };

  const handleDrawingPointerDown = (e: PointerEvent) => {
    const isDrawTab = activeTab() === 'draw';
    const isMosaicPen = activeTab() === 'mosaic' && mosaicTool() === 'pen';
    if (!isDrawTab && !isMosaicPen) return;

    e.preventDefault();
    e.stopPropagation();

    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch (_) {}

    const coords = getNormalizedCoords(e);
    const mode: DrawingMode = isMosaicPen ? 'mosaic' : penMode();
    const size = isMosaicPen ? mosaicPenSize() : penSize();

    const stroke: DrawingStroke = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      points: [coords],
      color: isMosaicPen ? '#ffffff' : penColor(),
      size,
      mode,
      mosaicType: mosaicType(),
      granularity: mosaicType() === 'pixelate' ? pixelateGranularity() : blurGranularity(),
      opacity: mode === 'highlighter' ? 0.45 : 1.0,
    };
    activeStroke = stroke;
    activeDrag = { type: 'draw' };

    renderAllDrawingsToCanvas();
  };

  // 文字入れ操作ハンドラー
  const handleAddText = () => {
    const newId = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newItem: ImageTextItem = {
      id: newId,
      text: '',
      x: 0.5,
      y: 0.5,
      fontSize: 28,
      color: '#ffffff',
      style: 'fill-stroke',
    };
    setTexts((prev) => [...prev, newItem]);
    setSelectedTextId(newId);
  };

  const handleDeleteSelectedText = () => {
    const id = selectedTextId();
    if (!id) return;
    setTexts((prev) => prev.filter((t) => t.id !== id));
    setSelectedTextId(null);
  };

  const updateSelectedText = (updates: Partial<ImageTextItem>) => {
    const id = selectedTextId();
    if (!id) return;
    setTexts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  // テキストドラッグ移動の開始
  const startTextMove = (e: PointerEvent, id: string) => {
    if (activeTab() !== 'text') return;
    e.stopPropagation();
    e.preventDefault();
    setSelectedTextId(id);

    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch (_) {}

    const coords = getNormalizedCoords(e);
    const target = texts().find((t) => t.id === id);
    if (!target) return;

    activeDrag = {
      type: 'text-move',
      id,
      startX: coords.x,
      startY: coords.y,
      initPos: { x: target.x, y: target.y },
    };
  };

  // モザイク種類の切り替え（最新のモザイクが存在する場合はその種類・粒度も更新）
  const handleSetMosaicType = (type: MosaicType) => {
    setMosaicType(type);
    setMosaics((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      const lastIdx = updated.length - 1;
      const gran = type === 'pixelate' ? pixelateGranularity() : blurGranularity();
      updated[lastIdx] = { ...updated[lastIdx], type, granularity: gran };
      return updated;
    });
  };

  // モザイク粒度の切り替え（最新のモザイクが存在する場合はリアルタイム反映）
  const handleSetMosaicGranularity = (val: number) => {
    if (mosaicType() === 'pixelate') {
      setPixelateGranularity(val);
    } else {
      setBlurGranularity(val);
    }
    setMosaics((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      const lastIdx = updated.length - 1;
      if ((updated[lastIdx].type || 'blur') === mosaicType()) {
        updated[lastIdx] = { ...updated[lastIdx], granularity: val };
      }
      return updated;
    });
  };

  // モザイクの直前1件を取り消し
  const handleUndoMosaic = () => {
    setMosaics((prev) => prev.slice(0, -1));
  };

  // 座標を元画像に対する相対座標 (0.0 - 1.0) に変換
  const getNormalizedCoords = (e: MouseEvent | TouchEvent | PointerEvent) => {
    if (!canvasRef) return { x: 0, y: 0 };
    const rect = canvasRef.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('changedTouches' in e && e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as MouseEvent | PointerEvent).clientX;
      clientY = (e as MouseEvent | PointerEvent).clientY;
    }

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
  const startCropMove = (e: PointerEvent) => {
    if (activeTab() !== 'crop' || !cropBox()) return;
    e.stopPropagation();
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch (_) {}

    const coords = getNormalizedCoords(e);
    activeDrag = {
      type: 'crop-move',
      startX: coords.x,
      startY: coords.y,
      initBox: { ...cropBox()! },
    };
  };

  // クロップ枠の角ドラッグリサイズ開始
  const startCropResize = (e: PointerEvent, handle: 'nw' | 'ne' | 'se' | 'sw') => {
    if (activeTab() !== 'crop' || !cropBox()) return;
    e.stopPropagation();
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch (_) {}

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
  const startMosaicMove = (e: PointerEvent, index: number) => {
    if (activeTab() !== 'mosaic' || !mosaics()[index]) return;
    const target = mosaics()[index];
    if (target.type) setMosaicType(target.type);
    if (target.granularity) {
      if (target.type === 'pixelate') setPixelateGranularity(target.granularity);
      else setBlurGranularity(target.granularity);
    }
    e.stopPropagation();
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch (_) {}

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
  const startMosaicResize = (e: PointerEvent, index: number, handle: 'nw' | 'ne' | 'se' | 'sw') => {
    if (activeTab() !== 'mosaic' || !mosaics()[index]) return;
    e.stopPropagation();
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch (_) {}

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

  // ステージ上での新規矩形ドラッグ（スワイプ範囲指定）開始
  const handleStagePointerDown = (e: PointerEvent) => {
    if (activeTab() === 'text') {
      setSelectedTextId(null);
      return;
    }
    if (activeTab() === 'mosaic' && mosaicTool() === 'pen') {
      return;
    }
    if (activeTab() !== 'mosaic' && activeTab() !== 'crop') return;
    if (!canvasRef) return;

    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch (_) {}

    const coords = getNormalizedCoords(e);
    activeDrag = {
      type: 'create',
      startX: coords.x,
      startY: coords.y,
    };
    setCurrentDragRect({ x: coords.x, y: coords.y, w: 0, h: 0 });
  };

  const handlePointerMove = (e: PointerEvent | MouseEvent | TouchEvent) => {
    if (!activeDrag || !canvasRef) return;
    if ('cancelable' in e && e.cancelable) {
      e.preventDefault();
    }

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
        prev.map((item, i) => (i === idx ? { ...item, x: newX, y: newY, w: box.w, h: box.h } : item))
      );
    } else if (activeDrag.type === 'mosaic-resize') {
      const updated = resizeRect(activeDrag.initBox, activeDrag.handle, coords.x, coords.y);
      const idx = activeDrag.index;
      setMosaics((prev) =>
        prev.map((item, i) => (i === idx ? { ...item, ...updated } : item))
      );
    } else if (activeDrag.type === 'text-move') {
      const dx = coords.x - activeDrag.startX;
      const dy = coords.y - activeDrag.startY;
      const targetId = activeDrag.id;
      const newX = Math.max(0.05, Math.min(0.95, activeDrag.initPos.x + dx));
      const newY = Math.max(0.05, Math.min(0.95, activeDrag.initPos.y + dy));
      setTexts((prev) =>
        prev.map((t) => (t.id === targetId ? { ...t, x: newX, y: newY } : t))
      );
    } else if (activeDrag.type === 'draw') {
      if (!activeStroke) return;
      const coords = getNormalizedCoords(e);
      const lastPt = activeStroke.points[activeStroke.points.length - 1];
      if (lastPt) {
        const dist = Math.hypot(coords.x - lastPt.x, coords.y - lastPt.y);
        if (dist < 0.001) return;
      }
      activeStroke.points.push(coords);
      scheduleDrawingRender();
    }
  };

  const handlePointerUp = () => {
    if (!activeDrag) return;
    const current = activeDrag;
    activeDrag = null;

    if (current.type === 'draw') {
      if (drawingRafId !== null) {
        cancelAnimationFrame(drawingRafId);
        drawingRafId = null;
      }
      if (activeStroke && activeStroke.points.length > 0) {
        const finished = activeStroke;
        activeStroke = null;
        setDrawings((prev) => [...prev, finished]);
      } else {
        activeStroke = null;
      }
      renderAllDrawingsToCanvas();
      return;
    }

    if (current.type === 'create') {
      const drag = currentDragRect();
      setCurrentDragRect(null);

      if (!drag || drag.w < 0.03 || drag.h < 0.03) return;

      if (activeTab() === 'mosaic') {
        const gran = mosaicType() === 'pixelate' ? pixelateGranularity() : blurGranularity();
        setMosaics((prev) => [...prev, { ...drag, type: mosaicType(), granularity: gran }]);
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

      const previewW = canvasRef ? canvasRef.width : w;
      const scaleRatio = previewW > 0 ? w / previewW : 1;

      const mosaicPixels: MosaicRect[] = mosaics().map((m) => {
        const isPixel = (m.type || 'blur') === 'pixelate';
        const gran = m.granularity || (isPixel ? pixelateGranularity() : blurGranularity());
        const scaledGran = Math.max(4, Math.round(gran * scaleRatio));
        return {
          x: Math.round(m.x * w),
          y: Math.round(m.y * h),
          width: Math.round(m.w * w),
          height: Math.round(m.h * h),
          blockSize: scaledGran,
          granularity: scaledGran,
          type: m.type || 'blur',
        };
      });

      const watermarkOption: WatermarkOptions | null =
        watermarkEnabled() && watermarkText().trim()
          ? {
              text: watermarkText().trim(),
              pattern: watermarkPattern(),
              opacity: watermarkOpacity() / 100,
              scale: watermarkScale() / 100,
            }
          : null;

      const signatureOption: SignatureOptions | null =
        signatureEnabled() && signatureText().trim()
          ? {
              text: signatureText().trim(),
              position: signaturePosition(),
              opacity: signatureOpacity() / 100,
              scale: signatureScale() / 100,
            }
          : null;

      const validTexts = texts().filter((t) => t.text?.trim().length > 0);

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
        texts: validTexts,
        drawings: drawings(),
        watermark: watermarkOption,
        signature: signatureOption,
        quality: 0.85,
      };

      const currentState: ImageEditState = {
        rotation: rotation(),
        flipX: flipX(),
        brightness: brightness(),
        contrast: contrast(),
        saturation: saturation(),
        aspectRatio: aspectRatio(),
        cropBox: cropBox(),
        mosaics: mosaics(),
        mosaicType: mosaicType(),
        pixelateGranularity: pixelateGranularity(),
        blurGranularity: blurGranularity(),
        texts: texts(),
        drawings: drawings().map((d) => ({
          ...d,
          points: d.points.map((p) => ({ ...p })),
        })),
        watermarkEnabled: watermarkEnabled(),
        watermarkText: watermarkText(),
        watermarkPattern: watermarkPattern(),
        watermarkOpacity: watermarkOpacity(),
        watermarkScale: watermarkScale(),
        signatureEnabled: signatureEnabled(),
        signatureText: signatureText(),
        signaturePosition: signaturePosition(),
        signatureOpacity: signatureOpacity(),
        signatureScale: signatureScale(),
      };

      const hasAnyEdit =
        ((rotation() % 360) + 360) % 360 !== 0 ||
        flipX() ||
        brightness() !== 100 ||
        contrast() !== 100 ||
        saturation() !== 100 ||
        cropPixel !== null ||
        mosaicPixels.length > 0 ||
        validTexts.length > 0 ||
        drawings().length > 0 ||
        watermarkOption !== null ||
        signatureOption !== null;

      let updatedFile: File;
      if (!hasAnyEdit) {
        updatedFile = props.file;
      } else {
        updatedFile = await editImageOptimized(props.file, options);
      }

      showToast('画像を加工しました', 'success');
      props.onSave(updatedFile, currentState);
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
        style={{ "touch-action": "none" }}
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
          <div class="mizuna-editor-actions">
            <button
              type="button"
              class="mizuna-btn mizuna-btn-ghost"
              onClick={handleResetAll}
              disabled={isProcessing()}
              title="編集内容を初期状態に戻す"
            >
              <i>restart_alt</i>
              <span>リセット</span>
            </button>
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
        </div>

        {/* 画像ステージ */}
        <div
          ref={stageRef}
          class="mizuna-editor-stage"
          onPointerDown={handleStagePointerDown}
        >
          <div class="mizuna-editor-canvas-wrap">
            <canvas
              ref={canvasRef}
              class="mizuna-editor-preview-canvas"
            />
            <canvas
              ref={drawingCanvasRef}
              class={`mizuna-editor-drawing-canvas ${
                activeTab() === 'draw' || (activeTab() === 'mosaic' && mosaicTool() === 'pen')
                  ? 'is-interactive'
                  : ''
              }`}
              onPointerDown={handleDrawingPointerDown}
            />

            {/* モザイク枠オーバーレイ表示 */}
            <For each={mosaics()}>
              {(m, index) => (
                <div
                  class={`mizuna-mosaic-box ${activeTab() === 'mosaic' ? 'is-editable' : ''} ${
                    (m.type || 'blur') === 'pixelate' ? 'is-pixelate' : 'is-blur'
                  }`}
                  style={{
                    left: `${m.x * 100}%`,
                    top: `${m.y * 100}%`,
                    width: `${m.w * 100}%`,
                    height: `${m.h * 100}%`,
                    'backdrop-filter': (m.type || 'blur') === 'blur' ? `blur(${m.granularity || blurGranularity()}px)` : undefined,
                    '-webkit-backdrop-filter': (m.type || 'blur') === 'blur' ? `blur(${m.granularity || blurGranularity()}px)` : undefined,
                  }}
                  onPointerDown={(e) => startMosaicMove(e, index())}
                >
                  <Show when={(m.type || 'blur') === 'pixelate'}>
                    <canvas
                      ref={(el) => {
                        createEffect(() => {
                          rotation();
                          flipX();
                          brightness();
                          contrast();
                          saturation();
                          renderMosaicPreviewCanvas(el, m);
                        });
                      }}
                      class="mizuna-mosaic-pixel-canvas"
                    />
                  </Show>
                  <Show when={activeTab() === 'mosaic'}>
                    <div
                      class="mizuna-box-handle handle-nw"
                      onPointerDown={(e) => startMosaicResize(e, index(), 'nw')}
                    />
                    <div
                      class="mizuna-box-handle handle-ne"
                      onPointerDown={(e) => startMosaicResize(e, index(), 'ne')}
                    />
                    <div
                      class="mizuna-box-handle handle-se"
                      onPointerDown={(e) => startMosaicResize(e, index(), 'se')}
                    />
                    <div
                      class="mizuna-box-handle handle-sw"
                      onPointerDown={(e) => startMosaicResize(e, index(), 'sw')}
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
                  onPointerDown={startCropMove}
                >
                  <div class="mizuna-crop-grid" />
                  <div
                    class="mizuna-box-handle handle-nw"
                    onPointerDown={(e) => startCropResize(e, 'nw')}
                  />
                  <div
                    class="mizuna-box-handle handle-ne"
                    onPointerDown={(e) => startCropResize(e, 'ne')}
                  />
                  <div
                    class="mizuna-box-handle handle-se"
                    onPointerDown={(e) => startCropResize(e, 'se')}
                  />
                    <div
                    class="mizuna-box-handle handle-sw"
                    onPointerDown={(e) => startCropResize(e, 'sw')}
                  />
                </div>
              )}
            </Show>

            {/* 現在ドラッグ中の矩形 */}
            <Show when={currentDragRect()}>
              {(dr) => (
                <div
                  class={`mizuna-drag-preview-box ${
                    activeTab() === 'crop'
                      ? 'is-crop'
                      : mosaicType() === 'pixelate'
                      ? 'is-pixelate'
                      : 'is-blur'
                  }`}
                  style={{
                    left: `${dr().x * 100}%`,
                    top: `${dr().y * 100}%`,
                    width: `${dr().w * 100}%`,
                    height: `${dr().h * 100}%`,
                    'backdrop-filter': activeTab() === 'mosaic' && mosaicType() === 'blur' ? `blur(${blurGranularity()}px)` : undefined,
                    '-webkit-backdrop-filter': activeTab() === 'mosaic' && mosaicType() === 'blur' ? `blur(${blurGranularity()}px)` : undefined,
                  }}
                >
                  <Show when={activeTab() === 'mosaic' && mosaicType() === 'pixelate'}>
                    <canvas
                      ref={(el) => {
                        createEffect(() => {
                          const rect = currentDragRect();
                          if (rect) renderMosaicPreviewCanvas(el, { ...rect, granularity: pixelateGranularity() });
                        });
                      }}
                      class="mizuna-mosaic-pixel-canvas"
                    />
                  </Show>
                </div>
              )}
            </Show>

            {/* テキストアイテムのオーバーレイ表示 */}
            <For each={texts()}>
              {(t) => {
                const isSelected = () => selectedTextId() === t.id && activeTab() === 'text';
                return (
                  <div
                    class={`mizuna-text-overlay ${isSelected() ? 'is-selected' : ''} ${
                      activeTab() === 'text' ? 'is-interactive' : ''
                    } style-${t.style || 'fill-stroke'}`}
                    style={{
                      left: `${t.x * 100}%`,
                      top: `${t.y * 100}%`,
                      'font-size': `${t.fontSize}px`,
                      color: t.color || '#ffffff',
                    }}
                    onPointerDown={(e) => startTextMove(e, t.id)}
                  >
                    <span class={!t.text ? 'is-placeholder' : ''}>
                      {t.text || (isSelected() ? '文字を入力...' : '')}
                    </span>
                    <Show when={isSelected()}>
                      <button
                        type="button"
                        class="mizuna-text-delete-badge"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          handleDeleteSelectedText();
                        }}
                        title="削除"
                      >
                        <i>close</i>
                      </button>
                    </Show>
                  </div>
                );
              }}
            </For>
          </div>

          <Show when={activeTab() === 'text'}>
            <div class="mizuna-editor-stage-hint">
              <i>touch_app</i>
              <span>文字をタップで選択・ドラッグで位置を移動できます</span>
            </div>
          </Show>

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
                <div class="mizuna-mosaic-top-row">
                  {/* ツール切替 (矩形 / ペン) */}
                  <div class="mizuna-seg-pills">
                    <button
                      type="button"
                      class={`mizuna-seg-pill ${mosaicTool() === 'rect' ? 'is-active' : ''}`}
                      onClick={() => setMosaicTool('rect')}
                      title="四角形でモザイクを指定"
                    >
                      <i>crop_free</i>
                      <span>矩形</span>
                    </button>
                    <button
                      type="button"
                      class={`mizuna-seg-pill ${mosaicTool() === 'pen' ? 'is-active' : ''}`}
                      onClick={() => setMosaicTool('pen')}
                      title="ペンでなぞってモザイク"
                    >
                      <i>draw</i>
                      <span>ペン</span>
                    </button>
                  </div>

                  {/* 種類切替 */}
                  <div class="mizuna-seg-pills">
                    <button
                      type="button"
                      class={`mizuna-seg-pill ${mosaicType() === 'blur' ? 'is-active' : ''}`}
                      onClick={() => handleSetMosaicType('blur')}
                      title="すりガラス（ブラー）"
                    >
                      <i>blur_on</i>
                      <span>すりガラス</span>
                    </button>
                    <button
                      type="button"
                      class={`mizuna-seg-pill ${mosaicType() === 'pixelate' ? 'is-active' : ''}`}
                      onClick={() => handleSetMosaicType('pixelate')}
                      title="ブロック（ピクセル）"
                    >
                      <i>grid_view</i>
                      <span>ブロック</span>
                    </button>
                  </div>

                  {/* 操作ボタン */}
                  <div class="mizuna-mosaic-action-btns">
                    <Show
                      when={mosaicTool() === 'pen'}
                      fallback={
                        <>
                          <button
                            type="button"
                            class="mizuna-btn mizuna-btn-outline mizuna-btn-sm"
                            onClick={handleUndoMosaic}
                            disabled={mosaics().length === 0}
                            title="直前のモザイクを取り消す"
                          >
                            <i>undo</i>
                            <span>1つ取り消す</span>
                          </button>
                          <button
                            type="button"
                            class="mizuna-btn mizuna-btn-ghost mizuna-btn-sm"
                            onClick={() => setMosaics([])}
                            disabled={mosaics().length === 0}
                            title="すべてのモザイクを消去"
                          >
                            <i>delete</i>
                            <span>全消去</span>
                          </button>
                        </>
                      }
                    >
                      <button
                        type="button"
                        class="mizuna-btn mizuna-btn-outline mizuna-btn-sm"
                        onClick={handleUndoDrawing}
                        disabled={drawings().filter((d) => d.mode === 'mosaic').length === 0}
                        title="直前のモザイク描画を取り消す"
                      >
                        <i>undo</i>
                        <span>1画戻す</span>
                      </button>
                      <button
                        type="button"
                        class="mizuna-btn mizuna-btn-ghost mizuna-btn-sm mizuna-btn-danger"
                        onClick={() => setDrawings((prev) => prev.filter((d) => d.mode !== 'mosaic'))}
                        disabled={drawings().filter((d) => d.mode === 'mosaic').length === 0}
                        title="すべてのモザイクペン描画を消去"
                      >
                        <i>delete_sweep</i>
                        <span>全消去</span>
                      </button>
                    </Show>
                  </div>
                </div>

                <div class="mizuna-mosaic-bottom-row">
                  {/* 粒度スライダー（すりガラス・ブロック両対応） */}
                  <div class="mizuna-text-size-wrap">
                    <span class="mizuna-editor-sublabel">粒度:</span>
                    <Show
                      when={mosaicType() === 'pixelate'}
                      fallback={
                        <>
                          <input
                            type="range"
                            min="4"
                            max="40"
                            step="2"
                            value={blurGranularity()}
                            onInput={(e) => handleSetMosaicGranularity(Number(e.currentTarget.value))}
                            class="mizuna-slider"
                          />
                          <span class="mizuna-adjust-value">{blurGranularity()}px</span>
                        </>
                      }
                    >
                      <input
                        type="range"
                        min="10"
                        max="64"
                        step="2"
                        value={pixelateGranularity()}
                        onInput={(e) => handleSetMosaicGranularity(Number(e.currentTarget.value))}
                        class="mizuna-slider"
                      />
                      <span class="mizuna-adjust-value">{pixelateGranularity()}px</span>
                    </Show>
                  </div>

                  {/* ペンモード時の太さスライダー */}
                  <Show when={mosaicTool() === 'pen'}>
                    <div class="mizuna-text-size-wrap">
                      <span class="mizuna-editor-sublabel">太さ:</span>
                      <input
                        type="range"
                        min="8"
                        max="64"
                        step="1"
                        value={mosaicPenSize()}
                        onInput={(e) => setMosaicPenSize(Number(e.currentTarget.value))}
                        class="mizuna-slider"
                      />
                      <span class="mizuna-adjust-value">{mosaicPenSize()}px</span>
                    </div>
                  </Show>
                </div>
              </div>
            </Show>

            {/* 5. ペン描画タブ */}
            <Show when={activeTab() === 'draw'}>
              <div class="mizuna-editor-pen-tools">
                <div class="mizuna-pen-top-row">
                  {/* モード切替 */}
                  <div class="mizuna-seg-pills">
                    <button
                      type="button"
                      class={`mizuna-seg-pill ${penMode() === 'pen' ? 'is-active' : ''}`}
                      onClick={() => handleSetPenMode('pen')}
                      title="ペン"
                    >
                      <i>edit</i>
                      <span>ペン</span>
                    </button>
                    <button
                      type="button"
                      class={`mizuna-seg-pill ${penMode() === 'highlighter' ? 'is-active' : ''}`}
                      onClick={() => handleSetPenMode('highlighter')}
                      title="蛍光ペン"
                    >
                      <i>border_color</i>
                      <span>マーカー</span>
                    </button>
                    <button
                      type="button"
                      class={`mizuna-seg-pill ${penMode() === 'mosaic' ? 'is-active' : ''}`}
                      onClick={() => handleSetPenMode('mosaic')}
                      title="モザイクペン"
                    >
                      <i>blur_on</i>
                      <span>モザイク</span>
                    </button>
                    <button
                      type="button"
                      class={`mizuna-seg-pill ${penMode() === 'eraser' ? 'is-active' : ''}`}
                      onClick={() => handleSetPenMode('eraser')}
                      title="消しゴム"
                    >
                      <i>ink_eraser</i>
                      <span>消しゴム</span>
                    </button>
                  </div>

                  {/* 操作ボタン (1画戻す / 全消去) */}
                  <div class="mizuna-pen-action-buttons">
                    <button
                      type="button"
                      class="mizuna-btn mizuna-btn-ghost mizuna-btn-sm"
                      onClick={handleUndoDrawing}
                      disabled={drawings().length === 0}
                      title="直前の1画を取り消す"
                    >
                      <i>undo</i>
                      <span>1画戻す</span>
                    </button>
                    <button
                      type="button"
                      class="mizuna-btn mizuna-btn-ghost mizuna-btn-sm mizuna-btn-danger"
                      onClick={handleClearDrawings}
                      disabled={drawings().length === 0}
                      title="描画をすべて消去"
                    >
                      <i>delete_sweep</i>
                      <span>全消去</span>
                    </button>
                  </div>
                </div>

                <div class="mizuna-pen-bottom-row">
                  {/* カラーパレット / モザイク種類切替 / 消しゴム案内 */}
                  <Show
                    when={penMode() !== 'eraser'}
                    fallback={
                      <div class="mizuna-eraser-hint">
                        <span>なぞった部分の描画を消去します</span>
                      </div>
                    }
                  >
                    <Show
                      when={penMode() === 'mosaic'}
                      fallback={
                        <div class="mizuna-color-palette">
                          <For each={['#ff3b30', '#ff9500', '#ffd60a', '#34c759', '#007aff', '#af52de', '#ffffff', '#000000']}>
                            {(c) => (
                              <button
                                type="button"
                                class={`mizuna-color-dot ${penColor() === c ? 'is-active' : ''}`}
                                style={{ 'background-color': c }}
                                onClick={() => setPenColor(c)}
                                aria-label={c}
                              />
                            )}
                          </For>
                        </div>
                      }
                    >
                      <div class="mizuna-seg-pills">
                        <button
                          type="button"
                          class={`mizuna-seg-pill ${mosaicType() === 'blur' ? 'is-active' : ''}`}
                          onClick={() => handleSetMosaicType('blur')}
                          title="すりガラス"
                        >
                          <i>blur_on</i>
                          <span>すりガラス</span>
                        </button>
                        <button
                          type="button"
                          class={`mizuna-seg-pill ${mosaicType() === 'pixelate' ? 'is-active' : ''}`}
                          onClick={() => handleSetMosaicType('pixelate')}
                          title="ブロック"
                        >
                          <i>grid_view</i>
                          <span>ブロック</span>
                        </button>
                      </div>
                    </Show>
                  </Show>

                  {/* 太さスライダー */}
                  <div class="mizuna-text-size-wrap">
                    <span class="mizuna-editor-sublabel">太さ:</span>
                    <input
                      type="range"
                      min={penMode() === 'highlighter' || penMode() === 'mosaic' ? '8' : '2'}
                      max={penMode() === 'highlighter' || penMode() === 'mosaic' ? '64' : '36'}
                      step="1"
                      value={penSize()}
                      onInput={(e) => setPenSize(Number(e.currentTarget.value))}
                      class="mizuna-slider"
                    />
                    <span class="mizuna-adjust-value">{penSize()}px</span>
                  </div>
                </div>
              </div>
            </Show>

            {/* 6. 文字入れタブ */}
            <Show when={activeTab() === 'text'}>
              <div class="mizuna-editor-text-tools">
                <Show
                  when={selectedTextItem()}
                  fallback={
                    <div class="mizuna-text-empty-state">
                      <button
                        type="button"
                        class="mizuna-btn mizuna-btn-primary mizuna-btn-sm"
                        onClick={handleAddText}
                      >
                        <i>add</i>
                        <span>文字を追加</span>
                      </button>
                      <span class="mizuna-text-hint">配置済みの文字をタップして選択するか、「文字を追加」を押してください</span>
                    </div>
                  }
                >
                  {(cur) => (
                    <div class="mizuna-text-panel">
                      <div class="mizuna-text-row-main">
                        <input
                          ref={(el) => {
                            if (el && !cur().text) setTimeout(() => el.focus(), 50);
                          }}
                          type="text"
                          class="mizuna-text-input"
                          value={cur().text}
                          onInput={(e) => updateSelectedText({ text: e.currentTarget.value })}
                          placeholder="文字を入力..."
                        />
                        <button
                          type="button"
                          class="mizuna-btn mizuna-btn-ghost mizuna-btn-sm mizuna-icon-only-btn"
                          onClick={handleAddText}
                          title="さらに文字を追加"
                        >
                          <i>add</i>
                        </button>
                        <button
                          type="button"
                          class="mizuna-btn mizuna-btn-danger mizuna-btn-sm mizuna-icon-only-btn"
                          onClick={handleDeleteSelectedText}
                          title="この文字を削除"
                        >
                          <i>delete</i>
                        </button>
                      </div>

                      <div class="mizuna-text-row-controls">
                        {/* カラーパレット */}
                        <div class="mizuna-color-palette">
                          <For each={['#ffffff', '#000000', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ec4899']}>
                            {(c) => (
                              <button
                                type="button"
                                class={`mizuna-color-dot ${cur().color === c ? 'is-active' : ''}`}
                                style={{ 'background-color': c }}
                                onClick={() => updateSelectedText({ color: c })}
                                aria-label={c}
                              />
                            )}
                          </For>
                        </div>

                        {/* スタイル切替 */}
                        <div class="mizuna-seg-pills">
                          <button
                            type="button"
                            class={`mizuna-seg-pill ${(cur().style || 'fill-stroke') === 'fill-stroke' ? 'is-active' : ''}`}
                            onClick={() => updateSelectedText({ style: 'fill-stroke' })}
                            title="縁取り"
                          >
                            <span>縁取り</span>
                          </button>
                          <button
                            type="button"
                            class={`mizuna-seg-pill ${cur().style === 'badge' ? 'is-active' : ''}`}
                            onClick={() => updateSelectedText({ style: 'badge' })}
                            title="背景帯"
                          >
                            <span>背景帯</span>
                          </button>
                          <button
                            type="button"
                            class={`mizuna-seg-pill ${cur().style === 'fill' ? 'is-active' : ''}`}
                            onClick={() => updateSelectedText({ style: 'fill' })}
                            title="単色"
                          >
                            <span>単色</span>
                          </button>
                        </div>

                        {/* フォントサイズ */}
                        <div class="mizuna-text-size-wrap">
                          <span class="mizuna-editor-sublabel">サイズ:</span>
                          <input
                            type="range"
                            min="14"
                            max="64"
                            value={cur().fontSize}
                            onInput={(e) => updateSelectedText({ fontSize: Number(e.currentTarget.value) })}
                            class="mizuna-slider"
                          />
                          <span class="mizuna-adjust-value">{cur().fontSize}px</span>
                        </div>
                      </div>
                    </div>
                  )}
                </Show>
              </div>
            </Show>

            {/* 6. 画像透かしタブ */}
            <Show when={activeTab() === 'watermark'}>
              <div class="mizuna-editor-watermark-tools">
                <div class="mizuna-watermark-header">
                  <span class="mizuna-editor-sublabel">画像透かし:</span>
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
                      <span class="mizuna-editor-sublabel">透かし文字:</span>
                      <input
                        type="text"
                        class="mizuna-editor-text-input"
                        value={watermarkText()}
                        placeholder="@username@instance"
                        onInput={(e) => setWatermarkText(e.currentTarget.value)}
                      />
                    </div>

                    <div class="mizuna-watermark-pos-group">
                      <span class="mizuna-editor-sublabel">パターン:</span>
                      <div class="mizuna-seg-pills mizuna-seg-pills-wrap">
                        <button
                          type="button"
                          class={`mizuna-seg-pill ${watermarkPattern() === 'diagonal' ? 'is-active' : ''}`}
                          onClick={() => setWatermarkPattern('diagonal')}
                        >
                          <i>rotate_right</i>
                          <span>斜めリピート</span>
                        </button>
                        <button
                          type="button"
                          class={`mizuna-seg-pill ${watermarkPattern() === 'grid' ? 'is-active' : ''}`}
                          onClick={() => setWatermarkPattern('grid')}
                        >
                          <i>grid_view</i>
                          <span>格子</span>
                        </button>
                        <button
                          type="button"
                          class={`mizuna-seg-pill ${watermarkPattern() === 'center-huge' ? 'is-active' : ''}`}
                          onClick={() => setWatermarkPattern('center-huge')}
                        >
                          <i>filter_center_focus</i>
                          <span>中央大</span>
                        </button>
                      </div>
                    </div>

                    <div class="mizuna-adjust-slider-row">
                      <span class="mizuna-editor-sublabel">不透明度:</span>
                      <input
                        type="range"
                        min="5"
                        max="60"
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

            {/* 6. 署名タブ (四隅クレジット表記) */}
            <Show when={activeTab() === 'signature'}>
              <div class="mizuna-editor-watermark-tools">
                <div class="mizuna-watermark-header">
                  <span class="mizuna-editor-sublabel">署名（クレジット）:</span>
                  <div class="mizuna-seg-pills">
                    <button
                      type="button"
                      class={`mizuna-seg-pill ${!signatureEnabled() ? 'is-active' : ''}`}
                      onClick={() => setSignatureEnabled(false)}
                    >
                      <span>OFF</span>
                    </button>
                    <button
                      type="button"
                      class={`mizuna-seg-pill ${signatureEnabled() ? 'is-active' : ''}`}
                      onClick={() => setSignatureEnabled(true)}
                    >
                      <span>ON</span>
                    </button>
                  </div>
                </div>

                <Show when={signatureEnabled()}>
                  <div class="mizuna-watermark-options">
                    <div class="mizuna-watermark-input-group">
                      <span class="mizuna-editor-sublabel">署名テキスト:</span>
                      <input
                        type="text"
                        class="mizuna-editor-text-input"
                        value={signatureText()}
                        placeholder="@username@instance"
                        onInput={(e) => setSignatureText(e.currentTarget.value)}
                      />
                    </div>

                    <div class="mizuna-watermark-pos-group">
                      <span class="mizuna-editor-sublabel">配置位置:</span>
                      <div class="mizuna-seg-pills mizuna-seg-pills-wrap">
                        <button
                          type="button"
                          class={`mizuna-seg-pill ${signaturePosition() === 'bottom-right' ? 'is-active' : ''}`}
                          onClick={() => setSignaturePosition('bottom-right')}
                        >
                          <span>右下</span>
                        </button>
                        <button
                          type="button"
                          class={`mizuna-seg-pill ${signaturePosition() === 'bottom-left' ? 'is-active' : ''}`}
                          onClick={() => setSignaturePosition('bottom-left')}
                        >
                          <span>左下</span>
                        </button>
                        <button
                          type="button"
                          class={`mizuna-seg-pill ${signaturePosition() === 'top-right' ? 'is-active' : ''}`}
                          onClick={() => setSignaturePosition('top-right')}
                        >
                          <span>右上</span>
                        </button>
                        <button
                          type="button"
                          class={`mizuna-seg-pill ${signaturePosition() === 'top-left' ? 'is-active' : ''}`}
                          onClick={() => setSignaturePosition('top-left')}
                        >
                          <span>左上</span>
                        </button>
                        <button
                          type="button"
                          class={`mizuna-seg-pill ${signaturePosition() === 'center' ? 'is-active' : ''}`}
                          onClick={() => setSignaturePosition('center')}
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
                        value={signatureOpacity()}
                        onInput={(e) => setSignatureOpacity(Number(e.currentTarget.value))}
                        class="mizuna-slider"
                      />
                      <span class="mizuna-adjust-value">{signatureOpacity()}%</span>
                    </div>

                    <div class="mizuna-adjust-slider-row">
                      <span class="mizuna-editor-sublabel">大きさ:</span>
                      <input
                        type="range"
                        min="60"
                        max="160"
                        value={signatureScale()}
                        onInput={(e) => setSignatureScale(Number(e.currentTarget.value))}
                        class="mizuna-slider"
                      />
                      <span class="mizuna-adjust-value">{signatureScale()}%</span>
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
              class={`mizuna-editor-tab-btn ${activeTab() === 'draw' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('draw')}
            >
              <i>draw</i>
              <span>ペン</span>
            </button>
            <button
              type="button"
              class={`mizuna-editor-tab-btn ${activeTab() === 'text' ? 'is-active' : ''}`}
              onClick={() => {
                setActiveTab('text');
                if (texts().length > 0 && !selectedTextId()) {
                  setSelectedTextId(texts()[0].id);
                }
              }}
            >
              <i>title</i>
              <span>文字入れ</span>
            </button>
            <button
              type="button"
              class={`mizuna-editor-tab-btn ${activeTab() === 'watermark' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('watermark')}
            >
              <i>pattern</i>
              <span>透かし</span>
            </button>
            <button
              type="button"
              class={`mizuna-editor-tab-btn ${activeTab() === 'signature' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('signature')}
            >
              <i>branding_watermark</i>
              <span>署名</span>
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
