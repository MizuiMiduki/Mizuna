import gsap from 'gsap';
import { Show } from 'solid-js';
import { useApp, type ViewType } from '../store/appStore';
import { getDisplayAvatarUrl } from '../utils/image';
import { HoldHoverTip } from './HoldHoverTip';

export function FooterNav() {
  const { accounts, currentUser, settings, currentView, setCurrentView, t } = useApp();

  const handleNavClick = (targetView: ViewType, el: HTMLElement) => {
    gsap.killTweensOf(el);
    gsap.fromTo(
      el,
      { scale: 0.95 },
      { scale: 1, duration: 0.18, ease: 'power2.out', force3D: true, clearProps: 'transform' }
    );

    if (targetView !== 'note' && currentView() === targetView && accounts().length > 0) {
      setCurrentView('note');
    } else {
      setCurrentView(targetView);
    }
  };

  const avatarSrc = () =>
    getDisplayAvatarUrl(currentUser()?.avatarurl, settings().is_visible_icon);

  return (
    <Show when={accounts().length > 0}>
      <div class="mizuna-dock-wrapper">
        <footer class="mizuna-floating-dock">
          {/* 左側：アカウントアイコンのみのボタン（長押し・長時間ホバーでTIPS表示） */}
          <HoldHoverTip
            label={currentUser()?.name ?? t('dock.accounts')}
            sublabel={`@${currentUser()?.username ?? 'id'}@${currentUser()?.address ?? 'address'}`}
            placement="top"
          >
            <button
              type="button"
              id="menu_icon_button"
              class={`mizuna-dock-avatar-btn ${
                currentView() === 'accounts' || currentView() === 'add_account' ? 'is-active' : ''
              }`}
              onClick={(e) => handleNavClick('accounts', e.currentTarget)}
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
          <nav class="mizuna-dock-nav">
            <HoldHoverTip label={t('dock.note')} sublabel={t('dock.note_sub')} placement="top">
              <button
                type="button"
                class={`mizuna-m3e-item ${currentView() === 'note' ? 'is-active' : ''}`}
                onClick={(e) => handleNavClick('note', e.currentTarget)}
              >
                <span class="mizuna-m3e-indicator">
                  <i>edit_square</i>
                </span>
                <span class="mizuna-m3e-label">{t('dock.note')}</span>
              </button>
            </HoldHoverTip>

            <HoldHoverTip label={t('dock.settings')} sublabel={t('dock.settings_sub')} placement="top">
              <button
                type="button"
                id="settings_icon"
                class={`mizuna-m3e-item ${currentView() === 'settings' ? 'is-active' : ''}`}
                onClick={(e) => handleNavClick('settings', e.currentTarget)}
              >
                <span class="mizuna-m3e-indicator">
                  <i>tune</i>
                </span>
                <span class="mizuna-m3e-label">{t('dock.settings')}</span>
              </button>
            </HoldHoverTip>
          </nav>
        </footer>
      </div>
    </Show>
  );
}
