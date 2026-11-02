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

  const [dragOffset, setDragOffset] = createSignal(0);
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let isSwiping = false;
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

  // メニューバーのスワイプ操作処理（iOS風の横スワイプによる画面遷移）
  const handlePointerDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.button !== undefined) return;
    startX = e.clientX ?? (e as any).pageX ?? 0;
    startY = e.clientY ?? (e as any).pageY ?? 0;
    startTime = Date.now();
    isSwiping = false;
    dragDeltaX = 0;
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (startTime === 0) return;
    const currentX = e.clientX ?? (e as any).pageX ?? startX;
    const currentY = e.clientY ?? (e as any).pageY ?? startY;
    const dx = currentX - startX;
    const dy = currentY - startY;

    if (!isSwiping) {
      if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
        isSwiping = true;
        try {
          dockRef?.setPointerCapture?.(e.pointerId);
        } catch {}
      }
    }

    if (isSwiping) {
      dragDeltaX = dx;
      const currentIndex = DOCK_VIEWS.indexOf(currentView());
      let dampedDx = dx;
      // 両端でのラバーバンド（弾性）抵抗
      if ((currentIndex === 0 && dx > 0) || (currentIndex === DOCK_VIEWS.length - 1 && dx < 0)) {
        dampedDx = dx * 0.25;
      }
      setDragOffset(dampedDx * 0.45);
    }
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (startTime === 0) return;
    try {
      dockRef?.releasePointerCapture?.(e.pointerId);
    } catch {}

    if (isSwiping) {
      const elapsed = Math.max(1, Date.now() - startTime);
      const vx = dragDeltaX / elapsed; // px/ms
      const currentIndex = DOCK_VIEWS.indexOf(currentView());

      const swipeThreshold = 22; // px
      const velocityThreshold = 0.2; // px/ms

      let targetIndex = currentIndex;
      if (dragDeltaX < -swipeThreshold || vx < -velocityThreshold) {
        // 左スワイプ -> 次の画面へ (accounts -> note -> settings)
        if (currentIndex < DOCK_VIEWS.length - 1) {
          targetIndex = currentIndex + 1;
        }
      } else if (dragDeltaX > swipeThreshold || vx > velocityThreshold) {
        // 右スワイプ -> 前の画面へ (settings -> note -> accounts)
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
    isSwiping = false;
    dragDeltaX = 0;
    setDragOffset(0);
    requestAnimationFrame(() => updatePill(true));
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
    const y = targetRect.top - dockRect.top;
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
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* 滑らかにスライド移動する選択ハイライトインジケーター（ピル） */}
        <div
          class={`mizuna-dock-active-pill ${pillStyle().animated && !isSwiping ? 'is-animated' : ''}`}
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
