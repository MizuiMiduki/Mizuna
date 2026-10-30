import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { AppProvider } from '../src/store/appStore';
import { Header } from '../src/components/Header';
import { FooterNav } from '../src/components/FooterNav';
import { AboutView } from '../src/components/AboutView';
import { ShortcutsView } from '../src/components/ShortcutsView';
import { AnnouncementsView } from '../src/components/AnnouncementsView';
import { HoldHoverTip } from '../src/components/HoldHoverTip';
import { AccountView } from '../src/components/AccountView';
import { SettingsView } from '../src/components/SettingsView';
import { NoteView } from '../src/components/NoteView';
import { useApp } from '../src/store/appStore';
import { DialogHost } from '../src/components/DialogHost';
import { SnackbarHost } from '../src/components/SnackbarHost';
import { db, DEFAULT_USER_SETTINGS } from '../src/db/database';

describe('UI Components', () => {
  beforeEach(async () => {
    await db.open();
    await db.account.clear();
    await db.setting.clear();
    await db.setting.put({ ...DEFAULT_USER_SETTINGS, id: 1, language: 'ja_jp' });
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
      expect(screen.getByRole('button', { name: /(お知らせ|Announcements)/ })).toBeInTheDocument();
    });

    it('フッターナビゲーションにアカウント管理ボタンと設定ボタンが存在すること', async () => {
      render(() => (
        <AppProvider>
          <FooterNav />
        </AppProvider>
      ));

      // アカウントが存在するため aria-label="アカウント管理" のボタンが描画される
      const accountBtn = await screen.findByRole('button', { name: /(アカウント管理|Accounts)/ });
      expect(accountBtn).toBeInTheDocument();

      const settingsBtn = await screen.findByRole('button', { name: /(設定|Settings)/ });
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

      expect(screen.getByText(/(お知らせ|Announcements)/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /(もどる|Back)/i })).toBeInTheDocument();
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

  describe('SettingsView', () => {
    it('言語設定がプルダウンメニュー（select）として描画され、言語を切り替えられること', async () => {
      render(() => (
        <AppProvider>
          <SettingsView />
        </AppProvider>
      ));

      const select = (await screen.findByRole('combobox', { name: /(表示言語|Display Language)/ })) as HTMLSelectElement;
      expect(select).toBeInTheDocument();
      expect(select.tagName.toLowerCase()).toBe('select');

      const options = select.querySelectorAll('option');
      expect(options.length).toBeGreaterThanOrEqual(2);

      fireEvent.change(select, { target: { value: 'ja_jp' } });
      expect(select.value).toBe('ja_jp');

      fireEvent.change(select, { target: { value: 'en_us' } });
      expect(select.value).toBe('en_us');
    });

    it('表示サイズ（通常 / 大 / 中 / 小 / シンプル）を切り替えられること', async () => {
      render(() => (
        <AppProvider>
          <SettingsView />
        </AppProvider>
      ));

      const normalBtn = await screen.findByRole('button', { name: /(通常|Normal|標準|Standard)/ });
      const largeBtn = await screen.findByRole('button', { name: /(大|Large)/ });
      const mediumBtn = await screen.findByRole('button', { name: /(中|Medium)/ });
      const smallBtn = await screen.findByRole('button', { name: /(小|Small)/ });
      const simpleBtn = await screen.findByRole('button', { name: /(シンプル|Simple)/ });

      expect(normalBtn).toBeInTheDocument();
      expect(largeBtn).toBeInTheDocument();
      expect(mediumBtn).toBeInTheDocument();
      expect(smallBtn).toBeInTheDocument();
      expect(simpleBtn).toBeInTheDocument();

      // 初期状態は通常モードがアクティブ
      expect(normalBtn.classList.contains('is-active')).toBe(true);
      expect(largeBtn.classList.contains('is-active')).toBe(false);

      // 大サイズに切り替え
      fireEvent.click(largeBtn);
      let updated = await db.setting.get(1);
      expect(updated?.ui_mode).toBe(3);

      // シンプルモードに切り替え
      fireEvent.click(simpleBtn);
      updated = await db.setting.get(1);
      expect(updated?.ui_mode).toBe(2);
    });

    it('カスタムCSSのテキストエリアに入力し、保存・クリアできること', async () => {
      render(() => (
        <AppProvider>
          <SettingsView />
        </AppProvider>
      ));

      const textarea = (await screen.findByRole('textbox', {
        name: /(カスタムCSS|Custom CSS)/,
      })) as HTMLTextAreaElement;
      expect(textarea).toBeInTheDocument();

      // CSS を入力
      fireEvent.input(textarea, { target: { value: 'body { background: #123; }' } });
      expect(textarea.value).toBe('body { background: #123; }');

      // 保存ボタンをクリック
      const saveBtn = screen.getByRole('button', { name: /(適用して保存|Save & Apply)/ });
      expect(saveBtn).toBeInTheDocument();
      fireEvent.click(saveBtn);

      // スタイル要素が DOM に反映されていること
      const styleEl = document.getElementById('mizuna-user-custom-css');
      expect(styleEl).not.toBeNull();
      expect(styleEl?.textContent).toContain('body { background: #123; }');

      // クリアボタンをクリック
      const clearBtn = screen.getByRole('button', { name: /(クリア|Clear)/ });
      fireEvent.click(clearBtn);
      expect(textarea.value).toBe('');
      expect(styleEl?.textContent).toBe('');
    });
  });

  describe('AccountView', () => {
    it('アカウントが2件以上ある場合に並べ替えモードを起動でき、完了ボタンで終了できること', async () => {
      // 2つ目のアカウントを追加
      await db.account.add({
        token: 'tok_test_2',
        name: '第2アカウント',
        username: 'test_user_2',
        address: 'misskey.design',
        avatarurl: 'https://example.com/avatar2.webp',
        add_mizuna_versinon: '3.11.0',
      });

      render(() => (
        <AppProvider>
          <AccountView />
        </AppProvider>
      ));

      // 最初のアカウントカードを確認
      const cardsBefore = await screen.findAllByText(/(テストユーザー|第2アカウント)/);
      expect(cardsBefore.length).toBeGreaterThanOrEqual(2);

      // 並べ替えボタンをクリック
      const reorderBtn = await screen.findByRole('button', { name: /(並べ替え|swap_vert)/ });
      expect(reorderBtn).toBeInTheDocument();
      fireEvent.click(reorderBtn);

      // ドラッグハンドルが表示されること
      const dragHandles = screen.getAllByTitle('ドラッグして並べ替え');
      expect(dragHandles.length).toBeGreaterThanOrEqual(2);

      // 完了ボタンはヘッダーに1つだけ存在すること
      const completeBtns = screen.getAllByRole('button', { name: /(完了|check)/ });
      expect(completeBtns.length).toBe(1);

      // 完了ボタンをクリックして終了
      fireEvent.click(completeBtns[0]);
      expect(screen.queryByTitle('ドラッグして並べ替え')).not.toBeInTheDocument();
    });
  });

  describe('NoteView - 画像プレビューと圧縮表示のリアルタイム更新', () => {
    it('プレビューモーダルを開いた後、WebP圧縮完了時にリアルタイムで表示が更新されること', async () => {
      function TestWrapper() {
        const { addAttachedFiles } = useApp();

        return (
          <>
            <button
              data-testid="add-file-btn"
              onClick={() => {
                const fakeFile = new File(['test-image-content-bytes'], 'test.png', {
                  type: 'image/png',
                });
                addAttachedFiles([fakeFile]);
              }}
            >
              Add
            </button>
            <NoteView />
          </>
        );
      }

      render(() => (
        <AppProvider>
          <TestWrapper />
        </AppProvider>
      ));

      // 画像を追加
      const addBtn = screen.getByTestId('add-file-btn');
      fireEvent.click(addBtn);

      // サムネイルが表示されるのを待つ
      const thumb = await screen.findByAltText('test.png');
      expect(thumb).toBeInTheDocument();

      // サムネイルの親要素（.mizuna-media-item）をクリックしてプレビューを開く
      const mediaItem = thumb.closest('.mizuna-media-item');
      expect(mediaItem).not.toBeNull();
      fireEvent.click(mediaItem!);

      // プレビューモーダル（ライトボックス）が開く
      expect(document.getElementById('imageModal')).toBeInTheDocument();

      // 圧縮完了時に、リアルタイムで "KB (WebP)" と削減率が表示されること
      const webpMeta = await screen.findByText(/KB \(WebP\)/, {}, { timeout: 3000 });
      expect(webpMeta).toBeInTheDocument();
      expect(screen.queryByText('WebP圧縮中...')).not.toBeInTheDocument();
    });
  });
});
