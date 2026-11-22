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
  fetchServerCustomEmojiList,
  clearServerEmojiCache,
} from '../src/services/misskeyApi';

describe('Custom Emoji Feature (v4.2.0)', () => {
  beforeEach(async () => {
    clearServerEmojiCache();
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
      is_check_releasenote: '4.2.0',
      is_enable_custom_emoji: false, // デフォルト無効
    });
    await db.account.add({
      id: 1,
      token: 'tok_test',
      name: 'テストユーザー',
      username: 'test_user',
      address: 'misskey.io',
      avatarurl: 'https://example.com/avatar.webp',
      add_mizuna_versinon: '4.2.0',
    });
  });

  describe('fetchServerCustomEmojiList API Service', () => {
    it('サーバーからカスタム絵文字リストを取得し、キャッシュすること', async () => {
      const mockEmojis = [
        { name: 'mizuna_blob', url: 'https://misskey.io/emojis/blob.webp', category: 'キャラクター', aliases: ['blob'] },
        { name: 'yatta', url: 'https://misskey.io/emojis/yatta.webp', category: null },
      ];

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
        if (String(url).includes('/api/emojis')) {
          return {
            ok: true,
            json: async () => ({ emojis: mockEmojis }),
          } as any;
        }
        return { ok: false } as any;
      });

      const list1 = await fetchServerCustomEmojiList('misskey.io');
      expect(list1.length).toBe(2);
      expect(list1[0].name).toBe('mizuna_blob');
      expect(list1[0].category).toBe('キャラクター');
      expect(list1[1].category).toBe('その他'); // nullの場合フォールバック

      // 2回目はキャッシュから取得するため fetch は呼ばれない
      const list2 = await fetchServerCustomEmojiList('misskey.io');
      expect(list2.length).toBe(2);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      fetchSpy.mockRestore();
    });
  });

  describe('SettingsView: Custom Emoji Setting', () => {
    it('設定画面に「カスタム絵文字の入力」トグルが表示され、切り替えができること', async () => {
      render(() => (
        <AppProvider>
          <SettingsView />
        </AppProvider>
      ));

      await new Promise((resolve) => setTimeout(resolve, 50));
      flush();

      // 設定項目名
      expect(screen.getByText('カスタム絵文字の入力')).toBeInTheDocument();

      const btnOn = document.getElementById('is_enable_custom_emoji_true') as HTMLButtonElement;
      const btnOff = document.getElementById('is_enable_custom_emoji_false') as HTMLButtonElement;
      expect(btnOn).toBeInTheDocument();
      expect(btnOff).toBeInTheDocument();

      // 初期状態はOFF
      expect(btnOff.classList.contains('is-active')).toBe(true);
      expect(btnOn.classList.contains('is-active')).toBe(false);

      // ONに切り替え
      fireEvent.click(btnOn);
      await new Promise((resolve) => setTimeout(resolve, 50));
      flush();

      expect(btnOn.classList.contains('is-active')).toBe(true);

      // DBも更新されていること
      const updatedSetting = await db.setting.get(1);
      expect(updatedSetting?.is_enable_custom_emoji).toBe(true);
    });
  });

  describe('NoteView: Custom Emoji Button & Guidance Dialog', () => {
    it('設定が無効の場合、カスタム絵文字アイコンをクリックすると案内ダイアログが表示されること', async () => {
      let currentAppView: any;
      function TestConsumer() {
        const { currentView } = useApp();
        currentAppView = currentView;
        return null;
      }

      render(() => (
        <AppProvider>
          <TestConsumer />
          <DialogHost />
          <NoteView />
        </AppProvider>
      ));

      await new Promise((resolve) => setTimeout(resolve, 50));
      flush();

      // アイコンボタンは常時表示されていること
      const emojiBtn = document.getElementById('select_custom_emoji_button');
      expect(emojiBtn).toBeInTheDocument();

      // クリックするとダイアログが表示される
      fireEvent.click(emojiBtn!);
      await new Promise((resolve) => setTimeout(resolve, 50));
      flush();

      expect(screen.getByText('カスタム絵文字の入力')).toBeInTheDocument();
      expect(screen.getByText(/設定で無効になっています/)).toBeInTheDocument();

      // 「設定を開く」ボタンを押すと設定画面へ遷移すること
      const goSettingsBtn = screen.getByText('設定を開く');
      fireEvent.click(goSettingsBtn);
      await new Promise((resolve) => setTimeout(resolve, 50));
      flush();

      expect(currentAppView()).toBe('settings');
    });

    it('設定が有効の場合、カスタム絵文字ピッカーが開き、絵文字を選択するとテキスト欄に挿入されること', async () => {
      // 設定を有効にしておく
      await db.setting.update(1, { is_enable_custom_emoji: true });

      const mockEmojis = [
        { name: 'mizuna_cat', url: 'https://misskey.io/emojis/cat.webp', category: '動物', aliases: ['cat'] },
      ];

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
        if (String(url).includes('/api/emojis')) {
          return {
            ok: true,
            json: async () => ({ emojis: mockEmojis }),
          } as any;
        }
        return { ok: false } as any;
      });

      render(() => (
        <AppProvider>
          <NoteView />
        </AppProvider>
      ));

      await new Promise((resolve) => setTimeout(resolve, 50));
      flush();

      const emojiBtn = document.getElementById('select_custom_emoji_button');
      expect(emojiBtn).toBeInTheDocument();

      // クリックするとピッカーモーダルが開く
      fireEvent.click(emojiBtn!);
      await new Promise((resolve) => setTimeout(resolve, 100));
      flush();

      // ピッカータイトルが表示される
      expect(screen.getByText('カスタム絵文字を選択')).toBeInTheDocument();

      // 絵文字セルが表示される
      const emojiCell = await screen.findByTitle(/:mizuna_cat:/);
      expect(emojiCell).toBeInTheDocument();

      // 絵文字をクリック
      fireEvent.click(emojiCell);
      await new Promise((resolve) => setTimeout(resolve, 50));
      flush();

      // テキストエリアに `:mizuna_cat: ` が挿入されていること
      const textarea = document.querySelector('textarea.note_content') as HTMLTextAreaElement;
      expect(textarea.value).toBe(':mizuna_cat: ');

      fetchSpy.mockRestore();
    });

    it('絵文字を選択すると最近使った絵文字に登録され、ピン留め操作ができること', async () => {
      await db.setting.update(1, { is_enable_custom_emoji: true });

      const mockEmojis = [
        { name: 'star_emoji', url: 'https://misskey.io/emojis/star.webp', category: '記号', aliases: [] },
        { name: 'heart_emoji', url: 'https://misskey.io/emojis/heart.webp', category: '記号', aliases: [] },
      ];

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
        if (String(url).includes('/api/emojis')) {
          return {
            ok: true,
            json: async () => ({ emojis: mockEmojis }),
          } as any;
        }
        return { ok: false } as any;
      });

      render(() => (
        <AppProvider>
          <NoteView />
        </AppProvider>
      ));

      await new Promise((resolve) => setTimeout(resolve, 50));
      flush();

      const emojiBtn = document.getElementById('select_custom_emoji_button');
      fireEvent.click(emojiBtn!);
      await new Promise((resolve) => setTimeout(resolve, 100));
      flush();

      // star_emoji を選択
      const starCell = await screen.findByTitle(/:star_emoji:/);
      fireEvent.click(starCell);
      await new Promise((resolve) => setTimeout(resolve, 50));
      flush();

      // 再度ピッカーを開く
      fireEvent.click(emojiBtn!);
      await new Promise((resolve) => setTimeout(resolve, 100));
      flush();

      // 「最近使った絵文字」セクションが表示されていること
      expect(screen.getByText('最近使った絵文字')).toBeInTheDocument();

      // ピン留めボタンをクリック
      const pinBtn = screen.getAllByLabelText('ピン留め')[0];
      fireEvent.click(pinBtn);
      await new Promise((resolve) => setTimeout(resolve, 50));
      flush();

      // 「固定した絵文字」セクションが表示されていること
      expect(screen.getByText('固定した絵文字')).toBeInTheDocument();

      fetchSpy.mockRestore();
    });
  });
});
