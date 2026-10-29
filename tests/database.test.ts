import { describe, it, expect, beforeEach } from 'vitest';
import {
  db,
  loadOrCreateSettings,
  updateSettingDb,
  DEFAULT_USER_SETTINGS,
} from '../src/db/database';

describe('database operations', () => {
  beforeEach(async () => {
    await db.open();
    await db.account.clear();
    await db.setting.clear();
  });

  describe('loadOrCreateSettings', () => {
    it('設定が存在しない場合にデフォルト設定を保存して返すこと', async () => {
      const settings = await loadOrCreateSettings();
      expect(settings.id).toBe(1);
      expect(settings.select_user).toBe(DEFAULT_USER_SETTINGS.select_user);
      expect(settings.default_visibility).toBe(DEFAULT_USER_SETTINGS.default_visibility);
      expect(settings.is_visible_icon).toBe(DEFAULT_USER_SETTINGS.is_visible_icon);
      expect(settings.language).toBe(DEFAULT_USER_SETTINGS.language);
      expect(settings.custom_css).toBe('');

      // DB に実際に保存されていることを確認
      const saved = await db.setting.get(1);
      expect(saved).toBeDefined();
      expect(saved?.select_user).toBe(1);
    });

    it('既に設定が存在する場合はその内容を返すこと', async () => {
      await db.setting.put({
        ...DEFAULT_USER_SETTINGS,
        id: 1,
        select_user: 42,
        default_visibility: 3,
      });

      const settings = await loadOrCreateSettings();
      expect(settings.id).toBe(1);
      expect(settings.select_user).toBe(42);
      expect(settings.default_visibility).toBe(3);
    });
  });

  describe('updateSettingDb', () => {
    it('指定したキーのみを更新できること', async () => {
      await loadOrCreateSettings();

      await updateSettingDb({ is_darkmode: 3, is_note_end_mizuna: true, custom_css: 'body { color: blue; }' });

      const updated = await db.setting.get(1);
      expect(updated?.is_darkmode).toBe(3);
      expect(updated?.is_note_end_mizuna).toBe(true);
      expect(updated?.custom_css).toBe('body { color: blue; }');
      // 他のフィールドが維持されていること
      expect(updated?.language).toBe(DEFAULT_USER_SETTINGS.language);
    });
  });

  describe('account table', () => {
    it('アカウントを追加・取得・削除できること', async () => {
      const id = await db.account.add({
        token: 'test_token',
        name: 'テストユーザー',
        username: 'test_user',
        address: 'misskey.io',
        avatarurl: 'https://example.com/avatar.webp',
        add_mizuna_versinon: '3.10.0',
      });

      const acc = await db.account.get(id);
      expect(acc).toBeDefined();
      expect(acc?.username).toBe('test_user');
      expect(acc?.address).toBe('misskey.io');

      await db.account.delete(id);
      const deleted = await db.account.get(id);
      expect(deleted).toBeUndefined();
    });
  });
});
