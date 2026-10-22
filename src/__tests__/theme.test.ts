import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyThemeAndMode } from '../utils/theme';
import { DEFAULT_USER_SETTINGS, db, type SettingRecord } from '../db/database';

describe('theme utilities', () => {
  beforeEach(async () => {
    await db.open();
    await db.setting.clear();
    await db.setting.put({ ...DEFAULT_USER_SETTINGS, id: 1 });
  });

  describe('applyThemeAndMode', () => {
    it('is_darkmode が 1 (無効) の場合 light モードが適用されること', async () => {
      const settings: SettingRecord = {
        ...DEFAULT_USER_SETTINGS,
        id: 1,
        is_darkmode: 1,
      };

      await applyThemeAndMode(settings);
      expect(document.body.classList.contains('light')).toBe(true);
      expect(document.body.classList.contains('dark')).toBe(false);
    });

    it('is_darkmode が 3 (有効) の場合 dark モードが適用されること', async () => {
      const settings: SettingRecord = {
        ...DEFAULT_USER_SETTINGS,
        id: 1,
        is_darkmode: 3,
      };

      await applyThemeAndMode(settings);
      expect(document.body.classList.contains('dark')).toBe(true);
      expect(document.body.classList.contains('light')).toBe(false);
    });

    it('アイコン非表示設定またはテーマ抽出無効時はデフォルトのテーマ変数が適用されること', async () => {
      const settings: SettingRecord = {
        ...DEFAULT_USER_SETTINGS,
        id: 1,
        is_darkmode: 1,
        is_visible_icon: false,
        is_pick_theme_color: false,
      };

      await applyThemeAndMode(settings);
      expect(document.documentElement.style.getPropertyValue('--main_color')).toBe('lightblue');
      expect(document.documentElement.style.getPropertyValue('--background_color')).toBe('#f8fafe');
    });
  });
});
