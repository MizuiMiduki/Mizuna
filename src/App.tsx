import { createEffect, Match, onMount, Show, Switch } from 'solid-js';
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
import { AppProvider, useApp } from './store/appStore';
import { initAnalytics, trackPageView } from './utils/analytics';

function MainContent() {
  const { isInitializing, currentView, settings } = useApp();

  onMount(() => {
    initAnalytics();
  });

  createEffect(() => {
    trackPageView(currentView());
  });

  createEffect(() => {
    const mode = settings().ui_mode;
    if (typeof document !== 'undefined') {
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

      <main class="main_column mizuna-main-container">
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
