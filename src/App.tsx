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
import { SettingsView } from './components/SettingsView';
import { ShortcutsView } from './components/ShortcutsView';
import { SnackbarHost } from './components/SnackbarHost';
import { AppProvider, useApp } from './store/appStore';
import { initAnalytics, trackPageView } from './utils/analytics';

function MainContent() {
  const { isInitializing, currentView } = useApp();

  onMount(() => {
    initAnalytics();
  });

  createEffect(() => {
    trackPageView(currentView());
  });

  return (
    <div class="mizuna-app-shell">
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
