import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { AppProvider } from '../src/store/appStore';
import { Header } from '../src/components/Header';
import { FooterNav } from '../src/components/FooterNav';
import { AboutView } from '../src/components/AboutView';
import { ShortcutsView } from '../src/components/ShortcutsView';
import { AnnouncementsView } from '../src/components/AnnouncementsView';
import { HoldHoverTip } from '../src/components/HoldHoverTip';
import { DialogHost } from '../src/components/DialogHost';
import { SnackbarHost } from '../src/components/SnackbarHost';
import { db, DEFAULT_USER_SETTINGS } from '../src/db/database';

describe('UI Components', () => {
  beforeEach(async () => {
    await db.open();
    await db.account.clear();
    await db.setting.clear();
    await db.setting.put({ ...DEFAULT_USER_SETTINGS, id: 1 });
    await db.account.add({
      token: 'tok_test',
      name: 'テストユーザー',
      username: 'test_user',
      address: 'misskey.io',
      avatarurl: 'https://example.com/avatar.webp',
      add_mizuna_versinon: '3.10.0',
    });
  });

  describe('Header & FooterNav', () => {
    it('ヘッダーにタイトルとお知らせアイコンが表示されること', () => {
      render(() => (
        <AppProvider>
          <Header />
        </AppProvider>
      ));

      expect(screen.getByText('Mizuna')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'お知らせ' })).toBeInTheDocument();
    });

    it('フッターナビゲーションにアカウント管理ボタンと設定ボタンが存在すること', async () => {
      render(() => (
        <AppProvider>
          <FooterNav />
        </AppProvider>
      ));

      // アカウントが存在するため aria-label="アカウント管理" のボタンが描画される
      const accountBtn = await screen.findByRole('button', { name: 'アカウント管理' });
      expect(accountBtn).toBeInTheDocument();

      const settingsBtn = await screen.findByRole('button', { name: /設定/ });
      expect(settingsBtn).toBeInTheDocument();
    });
  });

  describe('AnnouncementsView', () => {
    it('お知らせ一覧のヘッダーと戻るボタンが表示されること', () => {
      render(() => (
        <AppProvider>
          <AnnouncementsView />
        </AppProvider>
      ));

      expect(screen.getByText('お知らせ')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /もどる/i })).toBeInTheDocument();
    });
  });

  describe('AboutView', () => {
    it('AboutView にバージョン番号とクレジットが表示されること', () => {
      render(() => (
        <AppProvider>
          <AboutView />
        </AppProvider>
      ));

      expect(screen.getByText('Mizunaについて')).toBeInTheDocument();
      expect(screen.getByText('Open Source Licenses')).toBeInTheDocument();
    });
  });

  describe('ShortcutsView', () => {
    it('ショートカット一覧が表示されること', () => {
      render(() => (
        <AppProvider>
          <ShortcutsView />
        </AppProvider>
      ));

      expect(screen.getByText('ショートカット')).toBeInTheDocument();
      expect(screen.getByText('ノートを送信')).toBeInTheDocument();
    });
  });

  describe('HoldHoverTip', () => {
    it('子要素を正しくレンダリングし、ホバーでツールチップを描画すること', async () => {
      const { container } = render(() => (
        <HoldHoverTip label="テストチップ" sublabel="サブラベル" hoverDelayMs={0}>
          <button type="button">ホバー対象</button>
        </HoldHoverTip>
      ));

      const btn = screen.getByRole('button', { name: 'ホバー対象' });
      expect(btn).toBeInTheDocument();

      fireEvent.mouseEnter(container.firstElementChild!);
      expect(await screen.findByText('テストチップ')).toBeInTheDocument();
      expect(await screen.findByText('サブラベル')).toBeInTheDocument();
    });
  });

  describe('DialogHost & SnackbarHost', () => {
    it('クラッシュせずにマウントされること', () => {
      const { container } = render(() => (
        <AppProvider>
          <DialogHost />
          <SnackbarHost />
        </AppProvider>
      ));

      expect(container).toBeDefined();
    });
  });
});
