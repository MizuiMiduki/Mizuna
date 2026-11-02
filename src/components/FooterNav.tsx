import { createEffect, createSignal, onCleanup, onMount, Show } from 'solid-js';
import { useApp, type ViewType } from '../store/appStore';
import { getDisplayAvatarUrl } from '../utils/image';
import { HoldHoverTip } from './HoldHoverTip';

const DOCK_VIEWS: ViewType[] = ['accounts', 'note', 'settings'];

function FooterNavContent() {
  const { accounts, currentUser, settings, currentView, setCurrentView, t } = useApp();

  let dockRef: HTMLDivElement | undefined;
  let avatarBtnRef: HTMLButtonElement | undefined;
  let noteBtnRef: HTMLButtonElement | undefined;
  let settingsBtnRef: HTMLButtonElement | undefined;

  const [isDragging, setIsDragging] = createSignal(false);
  const [dragOffset, setDragOffset] = createSignal(0);

  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let dragDeltaX = 0;
  let hasSwiped = false;

  const [pillStyle, setPillStyle] = createSignal<{
    x: number;
    y: number;
    width: number;
    height: number;
    opacity: number;
    animated: boolean;
  }>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    opacity: 0,
    animated: false,
  });

  const handleNavClick = (targetView: ViewType) => {
    if (hasSwiped) return;
    setCurrentView(targetView);
  };

  // メニューバーのスワイプ・ドラッグ操作処理（指に1:1でダイレクト追従し、左右の並びに合わせて遷移）
  const handleStart = (clientX: number, clientY: number) => {
    startX = clientX;
    startY = clientY;
    startTime = Date.now();
    dragDeltaX = 0;
    setIsDragging(false);
  };

  const handleMove = (clientX: number, clientY: number): boolean => {
    if (startTime === 0) return false;
    const dx = clientX - startX;
    const dy = clientY - startY;

    if (!isDragging()) {
      // 5px以上動き、かつ水平方向の移動が優位な場合にドラッグ開始
      if (Math.abs(dx) > 5 && Math.abs(dx) > Math.abs(dy)) {
        setIsDragging(true);
      }
    }

    if (isDragging()) {
      dragDeltaX = dx;
      const currentIndex = DOCK_VIEWS.indexOf(currentView());
      let effectiveDx = dx;

      // 両端でのラバーバンド（弾性）抵抗
      // accounts (index 0) より左（dx < 0）
      if (currentIndex === 0 && dx < 0) {
        effectiveDx = dx * 0.28;
      }
      // settings (index 2) より右（dx > 0）
      else if (currentIndex === DOCK_VIEWS.length - 1 && dx > 0) {
        effectiveDx = dx * 0.28;
      }

      // 指に1:1でダイレクト追従
      setDragOffset(effectiveDx);
      return true;
    }
    return false;
  };

  const handleEnd = () => {
    if (startTime === 0) return;

    if (isDragging()) {
      const elapsed = Math.max(1, Date.now() - startTime);
      const vx = dragDeltaX / elapsed; // px/ms
      const currentIndex = DOCK_VIEWS.indexOf(currentView());

      const swipeThreshold = 22; // px
      const velocityThreshold = 0.2; // px/ms

      let targetIndex = currentIndex;
      // 右スワイプ (dx > 0) -> 右の画面へ (accounts -> note -> settings)
      if (dragDeltaX > swipeThreshold || vx > velocityThreshold) {
        if (currentIndex < DOCK_VIEWS.length - 1) {
          targetIndex = currentIndex + 1;
        }
      }
      // 左スワイプ (dx < 0) -> 左の画面へ (settings -> note -> accounts)
      else if (dragDeltaX < -swipeThreshold || vx < -velocityThreshold) {
        if (currentIndex > 0) {
          targetIndex = currentIndex - 1;
        }
      }

      if (Math.abs(dragDeltaX) > 6) {
        hasSwiped = true;
        setTimeout(() => {
          hasSwiped = false;
        }, 80);
      }

      if (targetIndex !== currentIndex && targetIndex >= 0) {
        setCurrentView(DOCK_VIEWS[targetIndex]);
      }
    }

    startTime = 0;
    setIsDragging(false);
    dragDeltaX = 0;
    setDragOffset(0);
    requestAnimationFrame(() => updatePill(true));
  };

  // タッチ操作（iOS / Android）
  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    handleStart(e.touches[0].clientX, e.touches[0].clientY);
  };

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    const handled = handleMove(e.touches[0].clientX, e.touches[0].clientY);
    if (handled && e.cancelable) {
      e.preventDefault();
    }
  };

  const onTouchEnd = () => {
    handleEnd();
  };

  // ポインタ操作（マウス / ペン / テスト環境）
  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.button !== undefined) return;
    const clientX = e.clientX ?? (e as any).pageX ?? 0;
    const clientY = e.clientY ?? (e as any).pageY ?? 0;
    handleStart(clientX, clientY);
    try {
      dockRef?.setPointerCapture?.(e.pointerId);
    } catch {}
  };

  const onPointerMove = (e: PointerEvent) => {
    const clientX = e.clientX ?? (e as any).pageX ?? startX;
    const clientY = e.clientY ?? (e as any).pageY ?? startY;
    handleMove(clientX, clientY);
  };

  const onPointerUp = (e: PointerEvent) => {
    try {
      dockRef?.releasePointerCapture?.(e.pointerId);
    } catch {}
    handleEnd();
  };

  const updatePill = (enableAnimation = true) => {
    if (typeof window === 'undefined') return;
    const view = currentView();
    let targetEl: HTMLElement | undefined;
    if (view === 'accounts') {
      targetEl = avatarBtnRef;
    } else if (view === 'note') {
      targetEl = noteBtnRef;
    } else if (view === 'settings') {
      targetEl = settingsBtnRef;
    }

    if (!targetEl || !dockRef) {
      setPillStyle((prev) => ({ ...prev, opacity: 0 }));
      return;
    }

    const dockRect = dockRef.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();

    if (targetRect.width === 0 || targetRect.height === 0) {
      return;
    }

    const x = targetRect.left - dockRect.left;
    const rawY = targetRect.top - dockRect.top;
    const y = Number.isFinite(rawY) ? Math.max(0, rawY) : 6;
    const width = targetRect.width;
    const height = targetRect.height;

    setPillStyle((prev) => ({
      x,
      y,
      width,
      height,
      opacity: 1,
      animated: enableAnimation && prev.animated,
    }));
  };

  onMount(() => {
    // マウント直後に即時位置合わせを試みる
    updatePill(false);

    // 次フレームでも確実に再計算し、その後にアニメーションを有効化
    requestAnimationFrame(() => {
      updatePill(false);
      requestAnimationFrame(() => {
        setPillStyle((prev) => ({ ...prev, animated: true }));
      });
    });

    if (typeof ResizeObserver !== 'undefined' && dockRef) {
      const ro = new ResizeObserver(() => {
        updatePill(false);
      });
      ro.observe(dockRef);
      if (avatarBtnRef) ro.observe(avatarBtnRef);
      if (noteBtnRef) ro.observe(noteBtnRef);
      if (settingsBtnRef) ro.observe(settingsBtnRef);
      onCleanup(() => ro.disconnect());
    }

    const handleResize = () => updatePill(false);
    window.addEventListener('resize', handleResize);
    onCleanup(() => window.removeEventListener('resize', handleResize));

    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => {
        updatePill(false);
      });
    }
  });

  createEffect(() => {
    currentView();
    // ビュー変更時にピルを滑らかに移動
    requestAnimationFrame(() => {
      updatePill(true);
    });
  });

  createEffect(() => {
    // 表示サイズ切り替え時にもピルサイズと位置を即座に追従
    settings().ui_mode;
    requestAnimationFrame(() => {
      updatePill(false);
    });
  });

  const avatarSrc = () =>
    getDisplayAvatarUrl(currentUser()?.avatarurl, settings().is_visible_icon);

  return (
    <div class="mizuna-dock-wrapper">
      <div
        ref={dockRef}
        class="mizuna-floating-dock"
        role="toolbar"
        aria-label="Main Navigation"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* 滑らかにスライド移動する選択ハイライトインジケーター（ピル） */}
        <div
          class={`mizuna-dock-active-pill ${pillStyle().animated && !isDragging() ? 'is-animated' : ''}`}
          style={{
            transform: `translate3d(${pillStyle().x + dragOffset()}px, ${pillStyle().y}px, 0)`,
            width: `${pillStyle().width}px`,
            height: `${pillStyle().height}px`,
            opacity: pillStyle().opacity,
          }}
          aria-hidden="true"
        />

        {/* 左側：アカウントアイコンのみのボタン（長押し・長時間ホバーでTIPS表示） */}
        <HoldHoverTip
          label={currentUser()?.name ?? t('dock.accounts')}
          sublabel={`@${currentUser()?.username ?? 'id'}@${currentUser()?.address ?? 'address'}`}
          placement="top"
        >
          <button
            ref={avatarBtnRef}
            type="button"
            id="menu_icon_button"
            class={`mizuna-dock-avatar-btn ${
              currentView() === 'accounts' || currentView() === 'add_account' ? 'is-active' : ''
            }`}
            onClick={() => handleNavClick('accounts')}
            aria-label={t('dock.accounts')}
          >
            <img
              id="menu_icon"
              class="mizuna-dock-avatar"
              src={avatarSrc()}
              alt="user avatar"
              decoding="async"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/icon.png';
              }}
            />
          </button>
        </HoldHoverTip>

        <div class="mizuna-dock-divider" />

        {/* 右側：Material 3 Expressive ナビゲーションアイテム（アイコン＋下部テキスト） */}
        <div class="mizuna-dock-nav" role="navigation">
          <HoldHoverTip label={t('dock.note')} sublabel={t('dock.note_sub')} placement="top">
            <button
              ref={noteBtnRef}
              type="button"
              class={`mizuna-m3e-item ${currentView() === 'note' ? 'is-active' : ''}`}
              onClick={() => handleNavClick('note')}
            >
              <span class="mizuna-m3e-indicator">
                <i>edit_square</i>
              </span>
              <span class="mizuna-m3e-label">{t('dock.note')}</span>
            </button>
          </HoldHoverTip>

          <HoldHoverTip label={t('dock.settings')} sublabel={t('dock.settings_sub')} placement="top">
            <button
              ref={settingsBtnRef}
              type="button"
              id="settings_icon"
              class={`mizuna-m3e-item ${currentView() === 'settings' ? 'is-active' : ''}`}
              onClick={() => handleNavClick('settings')}
            >
              <span class="mizuna-m3e-indicator">
                <i>tune</i>
              </span>
              <span class="mizuna-m3e-label">{t('dock.settings')}</span>
            </button>
          </HoldHoverTip>
        </div>
      </div>
    </div>
  );
}

const MENU_BAR_VIEWS: ViewType[] = ['note', 'accounts', 'settings'];

export function FooterNav() {
  const { accounts, currentView } = useApp();

  return (
    <Show when={accounts().length > 0 && MENU_BAR_VIEWS.includes(currentView())}>
      <FooterNavContent />
    </Show>
  );
}
