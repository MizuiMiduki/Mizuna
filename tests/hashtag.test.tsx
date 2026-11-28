import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { flush } from 'solid-js';
import { AppProvider, useApp } from '../src/store/appStore';
import { NoteView } from '../src/components/NoteView';
import { SettingsView } from '../src/components/SettingsView';
import { DialogHost } from '../src/components/DialogHost';
import { db, DEFAULT_USER_SETTINGS } from '../src/db/database';
import { safeSessionStorage, safeLocalStorage } from '../src/utils/storage';
import {
  fetchServerHashtagList,
  clearServerHashtagCache,
} from '../src/services/misskeyApi';

describe('Hashtag Input Feature (v4.3.0)', () => {
  beforeEach(async () => {
    clearServerHashtagCache();
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
      is_check_releasenote: '4.3.0',
      is_enable_hashtag: false,
    });
    await db.account.add({
      id: 1,
      token: 'tok_test',
      name: 'テストユーザー',
      username: 'test_user',
      address: 'misskey.io',
      avatarurl: 'https://example.com/avatar.webp',
      add_mizuna_versinon: '4.3.0',
    });
  });

  describe('fetchServerHashtagList API Service', () => {
    it('サーバーからハッシュタグ一覧を取得し、キャッシュすること', async () => {
      const mockTrends = [
        { tag: 'Misskey', usersCount: 42 },
        { tag: '#Mizuna', usersCount: 15 },
      ];

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
        if (String(url).includes('/api/hashtags/trend')) {
          return {
            ok: true,
            status: 200,
            json: async () => mockTrends,
          } as any;
        }
        return { ok: false, status: 404 } as any;
      });

      const list1 = await fetchServerHashtagList('misskey.io');
      expect(list1.length).toBe(2);
      expect(list1[0]).toEqual({ tag: 'Misskey', usersCount: 42 });
      expect(list1[1]).toEqual({ tag: 'Mizuna', usersCount: 15 });

      const list2 = await fetchServerHashtagList('misskey.io');
      expect(list2.length).toBe(2);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      fetchSpy.mockRestore();
    });
  });

  describe('SettingsView: Hashtag Setting', () => {
    it('設定画面に「ハッシュタグの入力」トグルが表示され、切り替えができること', async () => {
      render(() => (
        <AppProvider>
          <SettingsView />
        </AppProvider>
      ));

      await new Promise((resolve) => setTimeout(resolve, 50));
      flush();

      expect(screen.getByText('ハッシュタグの入力')).toBeInTheDocument();

      const btnOn = document.getElementById('is_enable_hashtag_true') as HTMLButtonElement;
      const btnOff = document.getElementById('is_enable_hashtag_false') as HTMLButtonElement;
      expect(btnOn).toBeInTheDocument();
      expect(btnOff).toBeInTheDocument();

      expect(btnOff.classList.contains('is-active')).toBe(true);
      expect(btnOn.classList.contains('is-active')).toBe(false);

      fireEvent.click(btnOn);
      await new Promise((resolve) => setTimeout(resolve, 50));
      flush();

      expect(btnOn.classList.contains('is-active')).toBe(true);

      const updatedSetting = await db.setting.get(1);
      expect(updatedSetting?.is_enable_hashtag).toBe(true);
    });
  });

  describe('NoteView: Hashtag Button, Guidance Dialog & Picker Modal', () => {
    it('設定が無効の場合、ハッシュタグボタンをクリックすると案内ダイアログが表示され設定画面へ誘導できること', async () => {
      let currentAppView: any;
      function TestConsumer() {
        const { currentView } = useApp();
        currentAppView = currentView;
        return null;
      }

      render(() => (
        <AppProvider>
          <TestConsumer />
          <NoteView />
          <DialogHost />
        </AppProvider>
      ));

      await new Promise((resolve) => setTimeout(resolve, 50));
      flush();

      const hashtagBtn = document.getElementById('select_hashtag_button') as HTMLButtonElement;
      expect(hashtagBtn).toBeInTheDocument();

      fireEvent.click(hashtagBtn);
      flush();

      expect(await screen.findByText('ハッシュタグの入力')).toBeInTheDocument();
      const goSettingsBtn = await screen.findByRole('button', { name: '設定を開く' });
      fireEvent.click(goSettingsBtn);
      await vi.waitFor(() => {
        expect(currentAppView()).toBe('settings');
      });
    });

    it('設定が有効の場合、ハッシュタグピッカーからタグを選択または自由入力してノートへ挿入できること', async () => {
      await db.setting.update(1, { is_enable_hashtag: true });

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
        if (String(url).includes('/api/hashtags/trend')) {
          return {
            ok: true,
            status: 200,
            json: async () => [{ tag: 'Misskey', usersCount: 100 }],
          } as any;
        }
        return { ok: false, status: 404 } as any;
      });

      render(() => (
        <AppProvider>
          <NoteView />
        </AppProvider>
      ));

      await new Promise((resolve) => setTimeout(resolve, 50));
      flush();

      const hashtagBtn = document.getElementById('select_hashtag_button') as HTMLButtonElement;
      fireEvent.click(hashtagBtn);
      flush();

      expect(await screen.findByText('ハッシュタグを選択')).toBeInTheDocument();
      const tagBtn = await screen.findByRole('button', { name: /#.*Misskey/i });
      fireEvent.click(tagBtn);
      flush();

      const textarea = screen.getByPlaceholderText(/いまどうしてる？/i) as HTMLTextAreaElement;
      expect(textarea.value).toBe('#Misskey ');

      fetchSpy.mockRestore();
    });
  });
});
