import PullToRefresh from 'pulltorefreshjs';
import { createSignal, onSettled, Show } from 'solid-js';
import { mizuna_options } from '../config/mizunaOptions';
import { useApp, type ViewType } from '../store/appStore';
import { HoldHoverTip } from './HoldHoverTip';
import { EASING, safeAnimate } from '../utils/animation';

export function Header() {
  const {
    openDialog,
    currentView,
    setCurrentView,
    accounts,
    hasPendingUpdate,
    showUpdateBanner,
    applyPendingUpdate,
    dismissUpdateBanner,
    t,
  } = useApp();
  const [showNews, setShowNews] = createSignal(Boolean(mizuna_options.news_banner_title));
  let topbarRef: HTMLElement | undefined;
  let newsRef: HTMLDivElement | undefined;

  const toggleTopView = (target: ViewType) => {
    if (currentView() === target) {
      setCurrentView(accounts().length > 0 ? 'note' : 'add_account');
    } else {
      setCurrentView(target);
    }
  };

  onSettled(() => {
    if (newsRef && showNews()) {
      safeAnimate(
        newsRef,
        [
          { opacity: 0, transform: 'translateY(-10px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        {
          duration: 350,
          easing: EASING.outCubic,
        }
      );
    }

    // pulltorefreshjs ライブラリによる Pull-to-Refresh 初期化
    if (topbarRef) {
      PullToRefresh.init({
        mainElement: topbarRef,
        triggerElement: topbarRef,
        distThreshold: 64,
        distMax: 96,
        distReload: 56,
        iconArrow: '<i>arrow_downward</i>',
        iconRefreshing: '<i>sync</i>',
        instructionsPullToRefresh: '下に引っ張って再読み込み',
        instructionsReleaseToRefresh: '指を離して再読み込み',
        instructionsRefreshing: '再読み込み中...',
        shouldPullToRefresh: () => window.scrollY === 0,
        onRefresh: () => {
          window.location.reload();
        },
      });
    }

    return () => {
      PullToRefresh.destroyAll();
    };
  });

  const handleCloseNews = (e: MouseEvent) => {
    e.stopPropagation();
    if (newsRef) {
      const anim = safeAnimate(
        newsRef,
        [
          { opacity: 1, maxHeight: `${newsRef.offsetHeight}px`, overflow: 'hidden' },
          { opacity: 0, maxHeight: '0px', marginTop: '0px', paddingTop: '0px', paddingBottom: '0px', overflow: 'hidden' },
        ],
        {
          duration: 250,
          easing: EASING.inQuad,
          fill: 'forwards',
        }
      );
      if (anim) {
        anim.onfinish = () => setShowNews(false);
      } else {
        setShowNews(false);
      }
    } else {
      setShowNews(false);
    }
  };

  const handleOpenNewsModal = () => {
    openDialog({
      title: mizuna_options.news_banner_title,
      contentHtml: mizuna_options.news_banner_text,
      buttons: [{ label: '閉じる', variant: 'fill' }],
    });
  };

  return (
    <>
      {/* グラスモーフィズム トップバー */}
      <header ref={topbarRef} class="mizuna-topbar">
        <div class="mizuna-topbar-inner">
          <div
            class="mizuna-brand"
            onClick={() => {
              const homeView = accounts().length > 0 ? 'note' : 'add_account';
              if (currentView() !== homeView) {
                setCurrentView(homeView);
              }
            }}
          >
            <span class="mizuna-brand-title">Mizuna</span>
            <Show when={mizuna_options.is_canary}>
              <span class="mizuna-canary-pill">CANARY</span>
            </Show>
          </div>

          <div class="mizuna-topbar-right">
            <HoldHoverTip label={t('header.announcements')} sublabel={t('header.announcements_sub')} placement="bottom">
              <button
                type="button"
                id="announcements_button"
                class={`mizuna-topbar-btn ${currentView() === 'announcements' ? 'is-active' : ''}`}
                onClick={() => toggleTopView('announcements')}
                aria-label={t('header.announcements')}
              >
                <i>notifications</i>
              </button>
            </HoldHoverTip>

            <HoldHoverTip label={t('header.shortcuts')} sublabel={t('header.shortcuts_sub')} placement="bottom">
              <button
                type="button"
                class={`mizuna-topbar-btn ${currentView() === 'shortcuts' ? 'is-active' : ''}`}
                onClick={() => toggleTopView('shortcuts')}
                aria-label={t('header.shortcuts')}
              >
                <i>keyboard</i>
              </button>
            </HoldHoverTip>

            <HoldHoverTip label={t('header.about')} sublabel={t('header.about_sub')} placement="bottom">
              <button
                type="button"
                class={`mizuna-topbar-btn ${currentView() === 'about' ? 'is-active' : ''}`}
                onClick={() => toggleTopView('about')}
                aria-label={t('header.about')}
              >
                <i>info</i>
              </button>
            </HoldHoverTip>

            <HoldHoverTip label={t('settings.title')} sublabel="全般・表示設定 (Ctrl+Alt+,)" placement="bottom">
              <button
                type="button"
                id="topbar_settings_button"
                class={`mizuna-topbar-btn ${currentView() === 'settings' ? 'is-active' : ''}`}
                onClick={() => toggleTopView('settings')}
                aria-label={t('settings.title')}
              >
                <i>tune</i>
              </button>
            </HoldHoverTip>
          </div>
        </div>
      </header>

      {/* PWAアップデート控えめバナー */}
      <Show when={hasPendingUpdate() && showUpdateBanner()}>
        <div class="mizuna-update-wrap">
          <div class="mizuna-update-card">
            <span class="mizuna-update-badge">{t('update.badge')}</span>
            <span class="mizuna-update-title">{t('update.available')}</span>
            <button
              type="button"
              class="mizuna-update-btn-action"
              onClick={applyPendingUpdate}
            >
              <i>refresh</i>
              <span>{t('update.apply_now')}</span>
            </button>
            <button
              type="button"
              class="mizuna-icon-btn-sm"
              onClick={dismissUpdateBanner}
              aria-label={t('update.close_notice')}
            >
              <i>close</i>
            </button>
          </div>
        </div>
      </Show>

      {/* お知らせバナー */}
      <Show when={showNews()}>
        <div class="mizuna-news-wrap">
          <div ref={newsRef} class="mizuna-news-card" onClick={handleOpenNewsModal}>
            <span class="mizuna-news-badge">NEWS</span>
            <span class="mizuna-news-title">{mizuna_options.news_banner_title}</span>
            <button
              type="button"
              class="mizuna-icon-btn-sm"
              onClick={handleCloseNews}
              aria-label="お知らせを閉じる"
            >
              <i>close</i>
            </button>
          </div>
        </div>
      </Show>
    </>
  );
}
