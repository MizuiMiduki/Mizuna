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
  const { isInitializing, currentView, settings } = useApp();
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
        gsap.killTweensOf(mainContainerRef);
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
    <div class={appShellClasses()}>
      <Header />

      <main ref={mainContainerRef} class="main_column mizuna-main-container">
        <Show
          when={!isInitializing()}
          fallback={
            <div class="mizuna-loading-center center-align middle-align">
              <div class="mizuna-spinner large" />
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
