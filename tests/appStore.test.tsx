import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@solidjs/testing-library';
import {
  AppProvider,
  useApp,
  visibilityNumToString,
} from '../src/store/appStore';
import { db, DEFAULT_USER_SETTINGS } from '../src/db/database';
import { safeLocalStorage } from '../src/utils/storage';

describe('appStore', () => {
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

  describe('visibilityNumToString', () => {
    it('数値から公開範囲文字列へ正しくマッピングすること', () => {
      expect(visibilityNumToString(1)).toBe('public');
      expect(visibilityNumToString(2)).toBe('home');
      expect(visibilityNumToString(3)).toBe('followers');
    });
  });

  describe('AppProvider Context', () => {
    it('ビューの遷移 (setCurrentView) が正常に動作すること', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: (props) => <AppProvider>{props.children}</AppProvider>,
      });

      result.setCurrentView('about');
      expect(result.currentView()).toBe('about');
      result.setCurrentView('shortcuts');
      expect(result.currentView()).toBe('shortcuts');
      result.setCurrentView('announcements');
      expect(result.currentView()).toBe('announcements');
      result.setCurrentView('add_account');
      expect(result.currentView()).toBe('add_account');
    });

    it('ノート本文・CW・公開範囲・from Mizuna のステート変更ができること', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: (props) => <AppProvider>{props.children}</AppProvider>,
      });

      result.setNoteText('テストノート本文');
      expect(result.noteText()).toBe('テストノート本文');

      result.setCwText('注釈');
      expect(result.cwText()).toBe('注釈');

      result.setVisibility('home');
      expect(result.visibility()).toBe('home');

      result.setEndMizuna(true);
      expect(result.endMizuna()).toBe(true);
    });

    it('添付画像の追加と削除が正常に行えること', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: (props) => <AppProvider>{props.children}</AppProvider>,
      });

      const fakeBlob = new Blob(['image'], { type: 'image/png' });
      const fakeFile = new File([fakeBlob], 'test.png', { type: 'image/png' });

      await result.addAttachedFiles([fakeFile]);
      expect(result.attachedImages().length).toBe(1);
      expect(result.attachedImages()[0].name).toBe('test.png');
      expect(result.attachedImages()[0].rawFile).toBe(fakeFile);

      const targetId = result.attachedImages()[0].id;
      result.removeAttachedImage(targetId);
      expect(result.attachedImages().length).toBe(0);
    });

    it('添付画像の並べ替え (moveAttachedImage / reorderAttachedImages) が正常に行えること', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: (props) => <AppProvider>{props.children}</AppProvider>,
      });

      const file1 = new File(['1'], 'img1.png', { type: 'image/png' });
      const file2 = new File(['2'], 'img2.png', { type: 'image/png' });
      const file3 = new File(['3'], 'img3.png', { type: 'image/png' });

      result.addAttachedFiles([file1, file2, file3]);
      expect(result.attachedImages().length).toBe(3);

      const [item1, item2, item3] = result.attachedImages();
      expect(item1.name).toBe('img1.png');
      expect(item2.name).toBe('img2.png');
      expect(item3.name).toBe('img3.png');

      // item1 を右に移動 (index 0 -> index 1)
      result.moveAttachedImage(item1.id, 1);
      expect(result.attachedImages().map((x) => x.name)).toEqual(['img2.png', 'img1.png', 'img3.png']);

      // item3 を左に移動 (index 2 -> index 1)
      result.moveAttachedImage(item3.id, -1);
      expect(result.attachedImages().map((x) => x.name)).toEqual(['img2.png', 'img3.png', 'img1.png']);

      // 任意の順序指定で並べ替え
      result.reorderAttachedImages([item1.id, item2.id, item3.id]);
      expect(result.attachedImages().map((x) => x.name)).toEqual(['img1.png', 'img2.png', 'img3.png']);
    });

    it('添付画像の非破壊編集と元画像へのリセット (updateAttachedImage / revertAttachedImage) ができること', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: (props) => <AppProvider>{props.children}</AppProvider>,
      });

      const originalFile = new File(['orig-bytes'], 'original.png', { type: 'image/png' });
      result.addAttachedFiles([originalFile]);
      expect(result.attachedImages().length).toBe(1);

      const imgItem = result.attachedImages()[0];
      expect(imgItem.rawFile).toBe(originalFile);
      expect(imgItem.file).toBe(originalFile);
      expect(imgItem.editState).toBeUndefined();

      // 画像を編集
      const editedFile = new File(['edited-bytes'], 'original_edited.webp', { type: 'image/webp' });
      const dummyEditState = {
        rotation: 90,
        flipX: true,
        brightness: 110,
        contrast: 100,
        saturation: 100,
        aspectRatio: '1:1' as const,
        cropBox: { x: 0.1, y: 0.1, w: 0.8, h: 0.8 },
        mosaics: [],
        watermarkEnabled: false,
        watermarkText: '',
        watermarkPattern: 'diagonal' as const,
        watermarkOpacity: 22,
        watermarkScale: 100,
        signatureEnabled: false,
        signatureText: '',
        signaturePosition: 'bottom-right' as const,
        signatureOpacity: 85,
        signatureScale: 100,
      };

      result.updateAttachedImage(imgItem.id, editedFile, dummyEditState);

      const updated = result.attachedImages()[0];
      expect(updated.file).toBe(editedFile);
      expect(updated.rawFile).toBe(originalFile); // 元画像が安全に保持されている
      expect(updated.editState).toEqual(dummyEditState); // 編集設定が保持されている

      // 加工をリセットして元画像に戻す
      result.revertAttachedImage(imgItem.id);

      const reverted = result.attachedImages()[0];
      expect(reverted.file).toBe(originalFile); // 元画像に戻る
      expect(reverted.rawFile).toBe(originalFile);
      expect(reverted.editState).toBeUndefined();
    });

    it('トーストの表示と手動クローズができること', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: (props) => <AppProvider>{props.children}</AppProvider>,
      });

      result.showToast('テストメッセージ', 'info', 'タイトル');
      expect(result.toasts().length).toBe(1);
      expect(result.toasts()[0].message).toBe('テストメッセージ');
      expect(result.toasts()[0].type).toBe('info');

      const toastId = result.toasts()[0].id;
      result.dismissToast(toastId);
      expect(result.toasts().length).toBe(0);
    });

    it('モーダルダイアログの表示 (openDialog) とクローズができること', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: (props) => <AppProvider>{props.children}</AppProvider>,
      });

      result.openDialog({
        title: '確認ダイアログ',
        contentText: 'よろしいですか？',
        buttons: [{ label: 'OK' }],
      });

      expect(result.dialogConfig()).not.toBeNull();
      expect(result.dialogConfig()?.title).toBe('確認ダイアログ');

      result.closeDialog();
      expect(result.dialogConfig()).toBeNull();
    });

    it('closeDialog を二重に呼んでも history.back() が1回だけで下層モーダルが閉じないこと', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: (props) => <AppProvider>{props.children}</AppProvider>,
      });

      let modalClosed = false;
      result.pushModalBackHandler(() => {
        modalClosed = true;
      });

      const backSpy = vi.spyOn(window.history, 'back');

      result.openDialog({
        title: '削除確認',
        contentText: '削除しますか？',
        buttons: [{ label: 'キャンセル' }],
      });

      result.closeDialog();
      result.closeDialog();

      expect(backSpy.mock.calls.length).toBeLessThanOrEqual(1);
      expect(modalClosed).toBe(false);
      backSpy.mockRestore();
    });

    it('アカウントの並べ替え (reorderAccounts) が正常に反映され保存されること', async () => {
      const id2 = await db.account.add({
        token: 'tok_test_2',
        name: '第2ユーザー',
        username: 'test_user_2',
        address: 'misskey.io',
        avatarurl: 'https://example.com/avatar2.webp',
        add_mizuna_versinon: '3.11.0',
      });

      const { result } = renderHook(() => useApp(), {
        wrapper: (props) => <AppProvider>{props.children}</AppProvider>,
      });

      await result.reloadAccounts();
      expect(result.accounts().length).toBe(2);

      const [firstId, secondId] = result.accounts().map((a) => a.id!);
      expect(firstId).not.toBe(secondId);

      // 順序を反転
      await result.reorderAccounts([secondId, firstId]);
      expect(result.accounts()[0].id).toBe(secondId);
      expect(result.accounts()[1].id).toBe(firstId);

      // 設定テーブルに並び順が保存されていることを確認
      const setting = await db.setting.get(1);
      expect(setting?.account_order).toEqual([secondId, firstId]);
    });

    it('updateSettings でカスタムCSSを変更したときにステートとDOMに反映されること', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: (props) => <AppProvider>{props.children}</AppProvider>,
      });

      await result.updateSettings({ custom_css: '.custom-test { color: purple; }' });
      expect(result.settings().custom_css).toBe('.custom-test { color: purple; }');

      const styleEl = document.getElementById('mizuna-user-custom-css');
      expect(styleEl?.textContent).toContain('.custom-test { color: purple; }');
    });

    it('updateSettings で ui_mode を変更したときにステートとDBに反映されること', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: (props) => <AppProvider>{props.children}</AppProvider>,
      });

      expect(result.settings().ui_mode).toBe(1);

      await result.updateSettings({ ui_mode: 2 });
      expect(result.settings().ui_mode).toBe(2);

      const saved = await db.setting.get(1);
      expect(saved?.ui_mode).toBe(2);
    });

    it('Androidの戻る操作 (popstate) でサブ画面からnote画面へ戻り、モーダルが開いている時はモーダルを閉じること', async () => {
      // テスト用アカウントを追加
      await db.account.add({
        token: 'tok_back_test',
        name: '戻るテストユーザー',
        username: 'back_user',
        address: 'misskey.test',
        avatarurl: '',
        add_mizuna_versinon: '3.12.0',
      });

      const { result } = renderHook(() => useApp(), {
        wrapper: (props) => <AppProvider>{props.children}</AppProvider>,
      });

      // アカウントの非同期読み込みを待機
      await result.reloadAccounts();
      result.forceSetCurrentView('note');

      // 設定画面へ遷移
      result.setCurrentView('about');
      expect(result.currentView()).toBe('about');

      // Android の戻るボタン（popstate）が押された場合 -> note 画面に戻る
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
      expect(result.currentView()).toBe('note');

      // モーダルハンドラーの登録（画像編集等）
      let modalClosed = false;
      const unregister = result.pushModalBackHandler(() => {
        modalClosed = true;
      });

      // モーダルが開いている時に戻るボタン（popstate）が押された場合 -> モーダルが閉じる
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
      expect(modalClosed).toBe(true);
      expect(result.currentView()).toBe('note');

      // ホーム画面で1回目の戻るが押された場合 -> 二度押し防止トーストが表示される
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
      const exitConfirmMsg = result.t('common.exit_confirm');
      expect(result.toasts().some((t) => t.message === exitConfirmMsg)).toBe(true);

      unregister();

      // UIの閉じるボタンなどでモーダルを閉じた場合、直後の popstate でトーストが出ないこと
      const initialToastCount = result.toasts().length;
      let uiModalClosed = false;
      const unregisterUiModal = result.pushModalBackHandler(() => {
        uiModalClosed = true;
      });
      // UIの×ボタンを押して閉じる操作をシミュレート
      unregisterUiModal();
      // ブラウザが history.back() 起因で発火する popstate をシミュレート
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
      // トーストが増えていないこと
      expect(result.toasts().length).toBe(initialToastCount);
      expect(uiModalClosed).toBe(false);
    });

    it('アップデート適用前（通常起動・バージョン不一致時）にはリリースノートダイアログが開かず、アップデート適用後（mizuna_show_release_notes_after_update フラグ設定時）にのみダイアログが開くこと', async () => {
      // 1. 適用前: 古いバージョン番号が記録されている状態
      await db.setting.update(1, { is_check_releasenote: '3.12.0' });
      safeLocalStorage.removeItem('mizuna_show_release_notes_after_update');

      const { result: resultBefore } = renderHook(() => useApp(), {
        wrapper: (props) => <AppProvider>{props.children}</AppProvider>,
      });

      // DBおよび初期化完了を待機
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(resultBefore.dialogConfig()).toBeNull();

      // 2. 適用後: アップデート適用フラグが保存された状態
      safeLocalStorage.setItem('mizuna_show_release_notes_after_update', 'true');

      const { result: resultAfter } = renderHook(() => useApp(), {
        wrapper: (props) => <AppProvider>{props.children}</AppProvider>,
      });

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(resultAfter.dialogConfig()).not.toBeNull();
      expect(resultAfter.dialogConfig()?.title).toBe('Mizuna がアップデートされました');
      expect(safeLocalStorage.getItem('mizuna_show_release_notes_after_update')).toBeNull();
    });

    it('アカウントのエクスポート (exportAccounts) が実行されトーストが表示されること', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: (props) => <AppProvider>{props.children}</AppProvider>,
      });

      await result.exportAccounts();
      expect(result.toasts().some((t) => t.message.includes('エクスポート'))).toBe(true);
    });

    it('設定のエクスポート (exportSettings) が実行されトーストが表示されること', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: (props) => <AppProvider>{props.children}</AppProvider>,
      });

      await result.exportSettings();
      expect(result.toasts().some((t) => t.message.includes('エクスポート'))).toBe(true);
    });

    it('設定のインポート (importSettingsFromFile) で確認ダイアログが表示され、実行時に設定が復元されること', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: (props) => <AppProvider>{props.children}</AppProvider>,
      });

      const backupData = {
        default_visibility: 2,
        is_note_end_mizuna: true,
        ui_mode: 3,
        is_darkmode: 3,
        watermark_text: 'TEST_WATERMARK',
        watermark_enabled: true,
        watermark_pattern: 'grid',
        signature_text: 'TEST_SIGNATURE',
        signature_position: 'top-right',
      };
      const jsonBlob = new Blob([JSON.stringify(backupData)], { type: 'application/json' });
      const testFile = new File([jsonBlob], 'mizuna_setting_20261101_123456.json', { type: 'application/json' });

      await result.importSettingsFromFile(testFile);

      // 確認ダイアログが開いていること
      expect(result.dialogConfig()).not.toBeNull();
      expect(result.dialogConfig()?.title).toBe('設定データのインポート');

      // 「インポートを実行」ボタンのクリックハンドラを実行
      const importButton = result.dialogConfig()?.buttons.find((b) => b.label === 'インポートを実行');
      expect(importButton).toBeDefined();

      await importButton!.onClick!();

      // 設定が更新されていること
      expect(result.settings().default_visibility).toBe(2);
      expect(result.settings().is_note_end_mizuna).toBe(true);
      expect(result.settings().ui_mode).toBe(3);
      expect(result.settings().is_darkmode).toBe(3);
      expect(result.settings().watermark_text).toBe('TEST_WATERMARK');
      expect(result.settings().watermark_enabled).toBe(true);
      expect(result.settings().watermark_pattern).toBe('grid');
      expect(result.settings().signature_text).toBe('TEST_SIGNATURE');
      expect(result.settings().signature_position).toBe('top-right');

      // トーストが表示されていること
      expect(result.toasts().some((t) => t.message.includes('インポート'))).toBe(true);
    });

    it('アカウントのインポート (importAccountsFromFile) で同一アカウントが存在する場合、古いレコードを上書き更新すること', async () => {
      // 既存の古いアカウント（v3.5.0, 旧トークン）を登録
      await db.account.clear();
      await db.account.add({
        id: 1,
        token: 'old_token_123',
        name: '古い表示名',
        username: 'same_user',
        address: 'misskey.test',
        avatarurl: 'https://example.com/old_avatar.webp',
        add_mizuna_versinon: '3.5.0',
      });

      const { result } = renderHook(() => useApp(), {
        wrapper: (props) => <AppProvider>{props.children}</AppProvider>,
      });

      // 新しいトークンと最新バージョンのバックアップデータ
      const importedData = [
        {
          token: 'new_token_456',
          name: '最新の表示名',
          username: 'same_user',
          address: 'misskey.test',
          avatarurl: 'https://example.com/new_avatar.webp',
          add_mizuna_versinon: '4.0.0',
        },
      ];
      const jsonBlob = new Blob([JSON.stringify(importedData)], { type: 'application/json' });
      const testFile = new File([jsonBlob], 'mizuna_accounts_backup.json', { type: 'application/json' });

      await result.importAccountsFromFile(testFile);

      // ダイアログから「インポートを実行」をクリック
      const importButton = result.dialogConfig()?.buttons.find((b) => b.label === 'インポートを実行');
      expect(importButton).toBeDefined();
      await importButton!.onClick!();

      // アカウント総数は1件のままで、トークンやバージョンが上書きされていること
      const allAccounts = await db.account.toArray();
      expect(allAccounts.length).toBe(1);
      expect(allAccounts[0].id).toBe(1);
      expect(allAccounts[0].token).toBe('new_token_456');
      expect(allAccounts[0].name).toBe('最新の表示名');
      expect(allAccounts[0].avatarurl).toBe('https://example.com/new_avatar.webp');
      expect(allAccounts[0].add_mizuna_versinon).toBe('4.0.0');
    });

    it('MiAuth コールバック時、同一サーバー・同一ユーザー名のアカウントが存在する場合はトークンとバージョンを上書き更新すること', async () => {
      // 既存の古いアカウント（v3.5.0）
      await db.account.clear();
      await db.account.add({
        id: 1,
        token: 'old_token_xyz',
        name: '古いアカウント名',
        username: 'reauth_user',
        address: 'misskey.io',
        avatarurl: 'https://example.com/old_avatar.webp',
        add_mizuna_versinon: '3.5.0',
      });

      // safeLocalStorage に認証中サーバーアドレスを保存
      safeLocalStorage.setItem('add_server_address', 'misskey.io');

      // window.location.search をモック
      const originalLocation = window.location;
      Object.defineProperty(window, 'location', {
        value: {
          ...originalLocation,
          search: '?session=test-miauth-session-id',
          protocol: 'https:',
          host: 'localhost:3000',
          replace: vi.fn(),
          assign: vi.fn(),
        },
        writable: true,
        configurable: true,
      });

      // fetch (checkMiAuthSession: /api/miauth/{sessionId}/check) をモック
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string) => {
          if (url.includes('/api/miauth/test-miauth-session-id/check')) {
            return {
              ok: true,
              json: async () => ({
                ok: true,
                token: 'fresh_reauth_token_999',
                user: {
                  id: 'user_reauth_001',
                  name: '最新のユーザー名',
                  username: 'reauth_user',
                  avatarUrl: 'https://example.com/fresh_avatar.webp',
                },
              }),
            };
          }
          return { ok: false };
        })
      );

      // AppProvider をマウントして初期化させる
      renderHook(() => useApp(), {
        wrapper: (props) => <AppProvider>{props.children}</AppProvider>,
      });

      // 非同期の MiAuth 完了・アカウント読み込みを少し待機
      await new Promise((r) => setTimeout(r, 60));

      // アカウントが重複せず、ID 1 のまま上書き更新されていること
      const accountsInDb = await db.account.toArray();
      expect(accountsInDb.length).toBe(1);
      expect(accountsInDb[0].id).toBe(1);
      expect(accountsInDb[0].token).toBe('fresh_reauth_token_999');
      expect(accountsInDb[0].name).toBe('最新のユーザー名');
      expect(accountsInDb[0].avatarurl).toBe('https://example.com/fresh_avatar.webp');
      expect(accountsInDb[0].add_mizuna_versinon).toBe('4.0.0');

      // window.location を復元
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
        configurable: true,
      });
    });
  });
});
