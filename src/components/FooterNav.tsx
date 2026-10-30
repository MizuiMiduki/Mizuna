import { createEffect, createSignal, onCleanup, onMount, Show } from 'solid-js';
import { useApp, type ViewType } from '../store/appStore';
import { getDisplayAvatarUrl } from '../utils/image';
import { HoldHoverTip } from './HoldHoverTip';

export function FooterNav() {
  const { accounts, currentUser, settings, currentView, setCurrentView, t } = useApp();

  let dockRef: HTMLDivElement | undefined;
  let avatarBtnRef: HTMLButtonElement | undefined;
  let noteBtnRef: HTMLButtonElement | undefined;
  let settingsBtnRef: HTMLButtonElement | undefined;

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
    if (targetView !== 'note' && currentView() === targetView && accounts().length > 0) {
      setCurrentView('note');
    } else {
      setCurrentView(targetView);
    }
  };

  const updatePill = (enableAnimation = true) => {
    if (typeof window === 'undefined') return;
    const view = currentView();
    let targetEl: HTMLElement | undefined;
    if (view === 'accounts' || view === 'add_account') {
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
    // 初回は transition なしで瞬時に位置を合わせ、次フレームから滑らかなアニメーションを有効化
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
      onCleanup(() => ro.disconnect());
    }

    const handleResize = () => updatePill(false);
    window.addEventListener('resize', handleResize);
    onCleanup(() => window.removeEventListener('resize', handleResize));
  });

  createEffect(() => {
    currentView();
    // ビュー変更時にピルを滑らかに移動
    requestAnimationFrame(() => {
      updatePill(true);
    });
  });

  const avatarSrc = () =>
    getDisplayAvatarUrl(currentUser()?.avatarurl, settings().is_visible_icon);

  return (
    <Show when={accounts().length > 0}>
      <div class="mizuna-dock-wrapper">
        <div ref={dockRef} class="mizuna-floating-dock" role="toolbar" aria-label="Main Navigation">
          {/* 滑らかにスライド移動する選択ハイライトインジケーター（ピル） */}
          <div
            class={`mizuna-dock-active-pill ${pillStyle().animated ? 'is-animated' : ''}`}
            style={{
              transform: `translate3d(${pillStyle().x}px, ${pillStyle().y}px, 0)`,
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
    </Show>
  );
}
