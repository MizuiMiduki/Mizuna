import { createEffect, Match, onMount, Show, Switch } from 'solid-js';
import gsap from 'gsap';
import { AboutView } from './components/AboutView';
import { AccountView } from './components/AccountView';
import { AddAccountView } from './components/AddAccountView';
import { AnnouncementsView } from './components/AnnouncementsView';
import { DebugMenu } from './components/DebugMenu';
import { DialogHost } from './components/DialogHost';
import { FooterNav } from './components/FooterNav';
import { Header } from './components/Header';
import { NoteView } from './components/NoteView';
import { PrivacyPolicyView } from './components/PrivacyPolicyView';
import { SettingsView } from './components/SettingsView';
import { ShortcutsView } from './components/ShortcutsView';
import { SnackbarHost } from './components/SnackbarHost';
import { AppProvider, useApp, type ViewType } from './store/appStore';
import { initAnalytics, trackPageView } from './utils/analytics';

const DOCK_VIEWS: ViewType[] = ['accounts', 'note', 'settings'];

function MainContent() {
  const { isInitializing, currentView, setCurrentView, settings } = useApp();
  let mainContainerRef: HTMLElement | undefined;
  let prevView: ViewType = currentView();

  onMount(() => {
    initAnalytics();
  });

  createEffect(() => {
    trackPageView(currentView());
  });

  // ページ遷移（currentView の切り替え）時にスクロール量を最上部 (0) にリセット
  createEffect(() => {
    currentView();
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;

      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        if (document.documentElement) document.documentElement.scrollTop = 0;
        if (document.body) document.body.scrollTop = 0;
      });
    }
  });

  // メニューバー画面間（アカウント・投稿・設定）の遷移時にiOS風の方向連動スライド演出
  createEffect(() => {
    const nextView = currentView();
    const prev = prevView;
    prevView = nextView;

    const prevIdx = DOCK_VIEWS.indexOf(prev);
    const nextIdx = DOCK_VIEWS.indexOf(nextView);

    if (prevIdx !== -1 && nextIdx !== -1 && prevIdx !== nextIdx && mainContainerRef) {
      const direction = nextIdx > prevIdx ? 1 : -1;
      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

      if (!prefersReduced) {
        gsap.fromTo(
          mainContainerRef,
          { opacity: 0.65, x: direction * 24 },
          {
            opacity: 1,
            x: 0,
            duration: 0.22,
            ease: 'power2.out',
            clearProps: 'transform',
          }
        );
      }
    }
  });

  // 画面全体の横スワイプによる画面遷移（入力欄・スライダー等の誤作動防止フィルター付き）
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    const view = currentView();
    if (!DOCK_VIEWS.includes(view)) return;

    const target = e.target as HTMLElement | null;
    if (!target) return;

    if (
      target.closest(
        'input, textarea, select, button, .mizuna-slider, [draggable="true"], .mizuna-lightbox, .modal, dialog, [role="dialog"], .mizuna-dock-wrapper, .mizuna-floating-dock'
      )
    ) {
      return;
    }

    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (touchStartTime === 0) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    const elapsed = Math.max(1, Date.now() - touchStartTime);
    touchStartTime = 0;

    if (Math.abs(dx) > 38 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      const vx = dx / elapsed;
      const view = currentView();
      const currentIndex = DOCK_VIEWS.indexOf(view);
      if (currentIndex === -1) return;

      if (dx < 0 || vx < -0.28) {
        // 左スワイプ -> 次の画面へ (accounts -> note -> settings)
        if (currentIndex < DOCK_VIEWS.length - 1) {
          setCurrentView(DOCK_VIEWS[currentIndex + 1]);
        }
      } else if (dx > 0 || vx > 0.28) {
        // 右スワイプ -> 前の画面へ (settings -> note -> accounts)
        if (currentIndex > 0) {
          setCurrentView(DOCK_VIEWS[currentIndex - 1]);
        }
      }
    }
  };

  createEffect(() => {
    const mode = settings().ui_mode;
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.classList.toggle('is-simple-mode', mode === 2);
      root.classList.toggle('ui-size-large', mode === 3);
      root.classList.toggle('ui-size-medium', mode === 4);
      root.classList.toggle('ui-size-small', mode === 5);

      document.body.classList.toggle('is-simple-mode', mode === 2);
      document.body.classList.toggle('ui-size-large', mode === 3);
      document.body.classList.toggle('ui-size-medium', mode === 4);
      document.body.classList.toggle('ui-size-small', mode === 5);
    }
  });

  const appShellClasses = () => {
    const mode = settings().ui_mode;
    const classes = ['mizuna-app-shell'];
    if (mode === 2) classes.push('is-simple-mode');
    if (mode === 3) classes.push('ui-size-large');
    if (mode === 4) classes.push('ui-size-medium');
    if (mode === 5) classes.push('ui-size-small');
    return classes.join(' ');
  };

  return (
    <div
      class={appShellClasses()}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Header />

      <main ref={mainContainerRef} class="main_column mizuna-main-container">
        <Show
          when={!isInitializing()}
          fallback={
            <div class="mizuna-loading-center center-align middle-align">
              <progress class="circle large" />
            </div>
          }
        >
          <Switch fallback={<NoteView />}>
            <Match when={currentView() === 'note'}>
              <NoteView />
            </Match>
            <Match when={currentView() === 'accounts'}>
              <AccountView />
            </Match>
            <Match when={currentView() === 'add_account'}>
              <AddAccountView />
            </Match>
            <Match when={currentView() === 'settings'}>
              <SettingsView />
            </Match>
            <Match when={currentView() === 'shortcuts'}>
              <ShortcutsView />
            </Match>
            <Match when={currentView() === 'about'}>
              <AboutView />
            </Match>
            <Match when={currentView() === 'announcements'}>
              <AnnouncementsView />
            </Match>
            <Match when={currentView() === 'privacy'}>
              <PrivacyPolicyView />
            </Match>
          </Switch>
        </Show>
      </main>

      <FooterNav />
      <SnackbarHost />
      <DialogHost />
      <Show when={import.meta.env.DEV}>
        <DebugMenu />
      </Show>
    </div>
  );
}

export function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}

export default App;
