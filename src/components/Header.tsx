import gsap from 'gsap';
import PullToRefresh from 'pulltorefreshjs';
import { createSignal, onCleanup, onMount, Show } from 'solid-js';
import { mizuna_options } from '../config/mizunaOptions';
import { useApp, type ViewType } from '../store/appStore';
import { HoldHoverTip } from './HoldHoverTip';

export function Header() {
  const { openDialog, currentView, setCurrentView, accounts } = useApp();
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

  onMount(() => {
    if (newsRef && showNews()) {
      gsap.fromTo(
        newsRef,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out' }
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

    onCleanup(() => {
      PullToRefresh.destroyAll();
    });
  });

  const handleCloseNews = (e: MouseEvent) => {
    e.stopPropagation();
    if (newsRef) {
      gsap.to(newsRef, {
        opacity: 0,
        height: 0,
        marginTop: 0,
        paddingTop: 0,
        paddingBottom: 0,
        duration: 0.25,
        ease: 'power2.in',
        onComplete: () => setShowNews(false),
      });
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
            <HoldHoverTip label="お知らせ" sublabel="更新情報・リリースノート" placement="bottom">
              <button
                type="button"
                id="announcements_button"
                class={`mizuna-topbar-btn ${currentView() === 'announcements' ? 'is-active' : ''}`}
                onClick={() => toggleTopView('announcements')}
                aria-label="お知らせ"
              >
                <i>notifications</i>
              </button>
            </HoldHoverTip>

            <HoldHoverTip label="ショートカット一覧" sublabel="キーボードショートカット" placement="bottom">
              <button
                type="button"
                class={`mizuna-topbar-btn ${currentView() === 'shortcuts' ? 'is-active' : ''}`}
                onClick={() => toggleTopView('shortcuts')}
                aria-label="ショートカット一覧"
              >
                <i>keyboard</i>
              </button>
            </HoldHoverTip>

            <HoldHoverTip label="Mizunaについて" sublabel="アプリ情報・支援・ライセンス" placement="bottom">
              <button
                type="button"
                class={`mizuna-topbar-btn ${currentView() === 'about' ? 'is-active' : ''}`}
                onClick={() => toggleTopView('about')}
                aria-label="Mizunaについて"
              >
                <i>info</i>
              </button>
            </HoldHoverTip>
          </div>
        </div>
      </header>

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
