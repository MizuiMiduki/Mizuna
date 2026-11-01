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
import { safeSessionStorage, safeLocalStorage } from '../src/utils/storage';

describe('UI Components', () => {
  beforeEach(async () => {
    safeSessionStorage.clear();
    safeLocalStorage.clear();
    sessionStorage.clear();
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
    it('ヘッダーにタイトルとお知らせアイコンが表示されること', async () => {
      render(() => (
        <AppProvider>
          <Header />
        </AppProvider>
      ));

      expect(await screen.findByText('Mizuna')).toBeInTheDocument();
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

    it('フッターナビゲーションのアクティブピルインジケーターが初期描画時に配置されること', async () => {
      const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
      HTMLElement.prototype.getBoundingClientRect = function () {
        return {
          width: 60,
          height: 56,
          top: 100,
          left: 100,
          bottom: 156,
          right: 160,
          x: 100,
          y: 100,
          toJSON: () => {},
        };
      };

      try {
        const { container } = render(() => (
          <AppProvider>
            <FooterNav />
          </AppProvider>
        ));

        await screen.findByRole('button', { name: /(設定|Settings)/ });
        await new Promise((resolve) => setTimeout(resolve, 50));

        const activePill = container.querySelector('.mizuna-dock-active-pill') as HTMLElement;
        expect(activePill).toBeInTheDocument();
        expect(activePill.style.opacity).toBe('1');
        expect(activePill.style.width).toBe('60px');
      } finally {
        HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
      }
    });

    it('メニューバーのボタンを再度押しても投稿画面に戻らず、対象の画面を維持すること', async () => {
      let currentAppView: any;
      function TestConsumer() {
        const { currentView } = useApp();
        currentAppView = currentView;
        return null;
      }

      render(() => (
        <AppProvider>
          <FooterNav />
          <TestConsumer />
        </AppProvider>
      ));

      const settingsBtn = await screen.findByRole('button', { name: /(設定|Settings)/ });

      // 1回目のクリック: 設定画面へ遷移
      fireEvent.click(settingsBtn);
      expect(currentAppView()).toBe('settings');

      // 2回目のクリック: 投稿画面（note）に戻らず settings のまま維持されること
      fireEvent.click(settingsBtn);
      expect(currentAppView()).toBe('settings');

      // アカウントボタンも同様
      const accountBtn = await screen.findByRole('button', { name: /(アカウント管理|Accounts)/ });
      fireEvent.click(accountBtn);
      expect(currentAppView()).toBe('accounts');

      // 2回目のクリックでも accounts のまま維持されること
      fireEvent.click(accountBtn);
      expect(currentAppView()).toBe('accounts');
    });

    it('メニューバーに定義されていない画面（about, shortcuts, announcements等）ではメニューバーが表示されないこと', async () => {
      function TestWrapper() {
        const { forceSetCurrentView } = useApp();
        forceSetCurrentView('about');
        return <FooterNav />;
      }

      const { container } = render(() => (
        <AppProvider>
          <TestWrapper />
        </AppProvider>
      ));

      expect(container.querySelector('.mizuna-floating-dock')).not.toBeInTheDocument();
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

    it('設定の検索ボックスに入力すると項目がリアルタイムに絞り込まれ、該当なし時はクリアボタンが表示されること', async () => {
      render(() => (
        <AppProvider>
          <SettingsView />
        </AppProvider>
      ));

      const searchInput = (await screen.findByRole('textbox', {
        name: /(設定を検索|Search settings)/,
      })) as HTMLInputElement;
      expect(searchInput).toBeInTheDocument();

      // 初期状態では複数のグループが表示されている
      expect(screen.getByText(/(投稿のデフォルト設定|Default Post Settings)/)).toBeInTheDocument();
      expect(screen.getAllByText(/(カスタムCSS|Custom CSS)/).length).toBeGreaterThan(0);

      // 「透かし」で絞り込み
      fireEvent.input(searchInput, { target: { value: '透かし' } });
      expect(screen.getAllByText(/(画像透かし|Watermark)/).length).toBeGreaterThan(0);
      // カスタムCSSグループは非表示になる
      expect(screen.queryAllByText(/(カスタムCSS|Custom CSS)/).length).toBe(0);

      // 一致しないキーワードを入力
      fireEvent.input(searchInput, { target: { value: 'nonexistent_setting_query_12345' } });
      // 空状態メッセージと検索クリアボタンが表示される
      expect(await screen.findByText(/(一致する設定が見つかりません|No matching settings found)/)).toBeInTheDocument();
      const clearButtons = screen.getAllByRole('button', { name: /(検索をクリア|Clear search)/i });
      expect(clearButtons.length).toBeGreaterThan(0);

      // クリアボタンをクリックしてリセット
      fireEvent.click(clearButtons[0]);
      expect(searchInput.value).toBe('');
      expect(screen.getByText(/(投稿のデフォルト設定|Default Post Settings)/)).toBeInTheDocument();
      expect(screen.getAllByText(/(カスタムCSS|Custom CSS)/).length).toBeGreaterThan(0);
    });

    it('設定データのエクスポートおよびインポートUIが表示されること', async () => {
      render(() => (
        <AppProvider>
          <SettingsView />
        </AppProvider>
      ));

      expect(screen.getByText(/(設定データのエクスポート|Export Settings Data)/)).toBeInTheDocument();
      expect(screen.getByText(/(設定データのインポート|Import Settings Data)/)).toBeInTheDocument();

      const exportButtons = screen.getAllByRole('button', {
        name: /(エクスポート|Export)/i,
      });
      expect(exportButtons.length).toBeGreaterThanOrEqual(2);
      expect(document.querySelector('.export_settings_data')).toBeInTheDocument();
      expect(document.querySelector('.import_settings_data')).toBeInTheDocument();
    });

    it('最新バージョンの確認とキャッシュクリアが独立した「その他」グループに表示されること', async () => {
      render(() => (
        <AppProvider>
          <SettingsView />
        </AppProvider>
      ));

      expect(screen.getByText(/(その他|Other)/)).toBeInTheDocument();
      expect(screen.getByText(/(最新バージョンの確認|Check for Updates)/)).toBeInTheDocument();
      expect(screen.getByText(/(アプリのキャッシュクリア|Clear App Cache)/)).toBeInTheDocument();
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

    it('3.5.0未満のアカウントに「画像非対応」バッジが表示され、タップ時に不足権限ダイアログが表示されること', async () => {
      // 3.5.0未満の古いアカウントを追加
      await db.account.add({
        token: 'tok_old_user',
        name: '旧バージョンユーザー',
        username: 'old_user',
        address: 'misskey.io',
        avatarurl: 'https://example.com/avatar_old.webp',
        add_mizuna_versinon: '3.4.0',
      });

      render(() => (
        <AppProvider>
          <AccountView />
          <DialogHost />
        </AppProvider>
      ));

      // 画像非対応バッジが存在すること
      const warningBadge = await screen.findByRole('button', { name: /(画像非対応|warning)/i });
      expect(warningBadge).toBeInTheDocument();

      // バッジをクリック
      fireEvent.click(warningBadge);

      // モーダルダイアログが開き、不足権限として write:drive が表示されること
      expect(await screen.findByText('アカウント権限の確認')).toBeInTheDocument();
      expect(screen.getByText(/write:drive/)).toBeInTheDocument();
      expect(screen.getByText(/(ドライブへの画像アップロード権限)/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '再認証する' })).toBeInTheDocument();
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
      const modalImg = await screen.findByDisplayValue ? document.getElementById('modalImage') : document.getElementById('modalImage');
      expect(document.getElementById('imageModal')).toBeInTheDocument();

      // 圧縮完了時に、リアルタイムで "KB (WebP)" と削減率が表示されること
      const webpMeta = await screen.findByText(/KB \(WebP\)/, {}, { timeout: 3000 });
      expect(webpMeta).toBeInTheDocument();
      expect(screen.queryByText('WebP圧縮中...')).not.toBeInTheDocument();
    });

    it('加工済み画像の場合、プレビューモーダルに「加工をリセット」が表示され元画像に戻せること', async () => {
      let appHook: ReturnType<typeof useApp> | null = null;
      function TestWrapper() {
        appHook = useApp();
        return (
          <>
            <button
              data-testid="add-file-btn"
              onClick={() => {
                const fakeFile = new File(['test-bytes'], 'edit_test.png', {
                  type: 'image/png',
                });
                appHook?.addAttachedFiles([fakeFile]);
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
      fireEvent.click(screen.getByTestId('add-file-btn'));
      const thumb = await screen.findByAltText('edit_test.png');
      expect(thumb).toBeInTheDocument();

      // 手動で editState と加工済みファイルを設定
      const imgItem = appHook!.attachedImages()[0];
      const editedFile = new File(['edited-bytes'], 'edited.webp', { type: 'image/webp' });
      appHook!.updateAttachedImage(imgItem.id, editedFile, {
        rotation: 90,
        flipX: false,
        brightness: 100,
        contrast: 100,
        saturation: 100,
        aspectRatio: 'free',
        cropBox: null,
        mosaics: [],
        watermarkEnabled: false,
        watermarkText: '',
        watermarkPattern: 'diagonal',
        watermarkOpacity: 22,
        watermarkScale: 100,
        signatureEnabled: false,
        signatureText: '',
        signaturePosition: 'bottom-right',
        signatureOpacity: 85,
        signatureScale: 100,
      });

      // 最新のサムネイル要素を再取得してクリック
      const updatedThumb = await screen.findByAltText('edited.webp');
      const mediaItem = updatedThumb.closest('.mizuna-media-item');
      expect(mediaItem).not.toBeNull();
      fireEvent.click(mediaItem!);

      // 「加工をリセット」ボタンが表示されていること
      const resetBtn = await screen.findByRole('button', { name: /(加工をリセット|元画像に戻す)/ });
      expect(resetBtn).toBeInTheDocument();

      // リセットをクリック
      fireEvent.click(resetBtn);

      // リセット後は editState が消え、「加工をリセット」ボタンも消えること
      expect(screen.queryByRole('button', { name: /(加工をリセット|元画像に戻す)/ })).not.toBeInTheDocument();
      expect(appHook!.attachedImages()[0].editState).toBeUndefined();
    });

    it('3.5.0未満の古いアカウントがアクティブな場合、画像選択ボタンが無効化 (disabled) されること', async () => {
      // 既存アカウント（3.10.0）をクリアして、3.4.0のアカウントを設定
      await db.account.clear();
      await db.account.add({
        id: 1,
        token: 'tok_old',
        name: '旧アカウント',
        username: 'old',
        address: 'misskey.io',
        avatarurl: '',
        add_mizuna_versinon: '3.4.0',
      });

      render(() => (
        <AppProvider>
          <NoteView />
        </AppProvider>
      ));

      const selectPicBtn = await screen.findByRole('button', { name: /(画像添付非対応|写真|画像)/i });
      expect(selectPicBtn).toBeDisabled();
      expect(selectPicBtn).toHaveClass('is-disabled');
    });
  });
});
