import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@solidjs/testing-library';
import { AppProvider } from '../src/store/appStore';
import { Header } from '../src/components/Header';
import { FooterNav } from '../src/components/FooterNav';
import { NoteView } from '../src/components/NoteView';
import { db, DEFAULT_USER_SETTINGS } from '../src/db/database';
import { safeSessionStorage, safeLocalStorage } from '../src/utils/storage';

describe('アクセシビリティ (a11y) テスト', () => {
  beforeEach(async () => {
    safeSessionStorage.clear();
    safeLocalStorage.clear();
    sessionStorage.clear();
    await db.open();
    await db.account.clear();
    await db.setting.clear();
    await db.setting.put({
      ...DEFAULT_USER_SETTINGS,
      id: 1,
      language: 'ja_jp',
    });
    await db.account.add({
      token: 'tok_test',
      name: 'テストユーザー',
      username: 'test_user',
      address: 'misskey.io',
      avatarurl: 'https://example.com/avatar.webp',
      add_mizuna_versinon: '4.1.0',
    });
  });

  describe('セマンティックHTML構造とランドマーク', () => {
    it('ヘッダーが <header> 要素として描画され、ナビゲーションがアクセシブルであること', async () => {
      const { container } = render(() => (
        <AppProvider>
          <Header />
        </AppProvider>
      ));

      const header = container.querySelector('header');
      expect(header).toBeInTheDocument();

      // ヘッダー内のボタンがすべてアクセス可能な名前（aria-label またはテキスト）を持つこと
      const buttons = header?.querySelectorAll('button') || [];
      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach((btn) => {
        const hasAriaLabel = btn.hasAttribute('aria-label') && btn.getAttribute('aria-label')!.trim().length > 0;
        const hasText = btn.textContent && btn.textContent.trim().length > 0;
        const hasTitle = btn.hasAttribute('title') && btn.getAttribute('title')!.trim().length > 0;
        expect(hasAriaLabel || hasText || hasTitle).toBe(true);
      });
    });

    it('フッターナビゲーションが非同期読み込み後にアクセシブルなボタン群を持つこと', async () => {
      const { container } = render(() => (
        <AppProvider>
          <FooterNav />
        </AppProvider>
      ));

      // アカウント読み込み後のボタン描画を待機
      await screen.findByRole('button', { name: /(投稿履歴|History)/ });

      const navButtons = container.querySelectorAll('button');
      expect(navButtons.length).toBeGreaterThan(0);

      // 各ナビゲーションボタンがラベルまたはアイコン説明を持つこと
      navButtons.forEach((btn) => {
        const accessibleName = btn.getAttribute('aria-label') || btn.getAttribute('title') || btn.textContent?.trim();
        expect(accessibleName).toBeTruthy();
      });
    });
  });

  describe('NoteView（ノート投稿画面）のアクセシビリティ', () => {
    it('入力エリアとツールバーのボタンがスクリーンリーダーで識別可能であること', async () => {
      const { container } = render(() => (
        <AppProvider>
          <NoteView />
        </AppProvider>
      ));

      // テキストエリア（ノート入力欄）が存在し、プレースホルダーまたはラベルを持つこと
      const textarea = await screen.findByRole('textbox');
      expect(textarea).toBeInTheDocument();
      const hasAccessibleInputName =
        textarea.getAttribute('aria-label') ||
        textarea.getAttribute('placeholder') ||
        textarea.getAttribute('aria-placeholder');
      expect(hasAccessibleInputName).toBeTruthy();

      // 投稿画面内の全操作ボタンが名前を持つこと（アイコンのみのボタンで aria-label 漏れがないかの監査）
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach((btn) => {
        const accessibleName =
          btn.getAttribute('aria-label') ||
          btn.getAttribute('title') ||
          btn.textContent?.trim();
        expect(
          accessibleName,
          `Button with outerHTML "${btn.outerHTML}" lacks an accessible name.`
        ).toBeTruthy();
      });
    });
  });
});
