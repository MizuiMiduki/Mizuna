import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@solidjs/testing-library';
import {
  AppProvider,
  useApp,
  visibilityNumToString,
} from '../src/store/appStore';
import { db, DEFAULT_USER_SETTINGS } from '../src/db/database';

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
  });
});
