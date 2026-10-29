import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@solidjs/testing-library';
import { flush } from 'solid-js';
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
      flush();
      expect(result.currentView()).toBe('about');
      result.setCurrentView('shortcuts');
      flush();
      expect(result.currentView()).toBe('shortcuts');
      result.setCurrentView('announcements');
      flush();
      expect(result.currentView()).toBe('announcements');
      result.setCurrentView('add_account');
      flush();
      expect(result.currentView()).toBe('add_account');
    });

    it('ノート本文・CW・公開範囲・from Mizuna のステート変更ができること', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: (props) => <AppProvider>{props.children}</AppProvider>,
      });

      result.setNoteText('テストノート本文');
      flush();
      expect(result.noteText()).toBe('テストノート本文');

      result.setCwText('注釈');
      flush();
      expect(result.cwText()).toBe('注釈');

      result.setVisibility('home');
      flush();
      expect(result.visibility()).toBe('home');

      result.setEndMizuna(true);
      flush();
      expect(result.endMizuna()).toBe(true);
    });

    it('添付画像の追加と削除が正常に行えること', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: (props) => <AppProvider>{props.children}</AppProvider>,
      });

      const fakeBlob = new Blob(['image'], { type: 'image/png' });
      const fakeFile = new File([fakeBlob], 'test.png', { type: 'image/png' });

      await result.addAttachedFiles([fakeFile]);
      flush();
      expect(result.attachedImages().length).toBe(1);
      expect(result.attachedImages()[0].name).toBe('test.png');

      const targetId = result.attachedImages()[0].id;
      result.removeAttachedImage(targetId);
      flush();
      expect(result.attachedImages().length).toBe(0);
    });

    it('トーストの表示と手動クローズができること', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: (props) => <AppProvider>{props.children}</AppProvider>,
      });

      result.showToast('テストメッセージ', 'info', 'タイトル');
      flush();
      expect(result.toasts().length).toBe(1);
      expect(result.toasts()[0].message).toBe('テストメッセージ');
      expect(result.toasts()[0].type).toBe('info');

      const toastId = result.toasts()[0].id;
      result.dismissToast(toastId);
      flush();
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
      flush();

      expect(result.dialogConfig()).not.toBeNull();
      expect(result.dialogConfig()?.title).toBe('確認ダイアログ');

      result.closeDialog();
      flush();
      expect(result.dialogConfig()).toBeNull();
    });
  });
});
