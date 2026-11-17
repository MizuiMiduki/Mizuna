import { describe, it, expect, beforeEach } from 'vitest';
import { safeLocalStorage, safeSessionStorage, generateSettingBackupFileName, generateAccountBackupFileName } from '../src/utils/storage';

describe('SafeStorageWrapper', () => {
  beforeEach(() => {
    safeLocalStorage.clear();
    safeSessionStorage.clear();
  });

  it('setItem と getItem が正常に動作すること', () => {
    safeLocalStorage.setItem('test_key', 'hello');
    expect(safeLocalStorage.getItem('test_key')).toBe('hello');
  });

  it('存在しないキーに対しては null を返すこと', () => {
    expect(safeLocalStorage.getItem('non_existent')).toBeNull();
  });

  it('removeItem で削除できること', () => {
    safeLocalStorage.setItem('remove_me', '123');
    expect(safeLocalStorage.getItem('remove_me')).toBe('123');
    safeLocalStorage.removeItem('remove_me');
    expect(safeLocalStorage.getItem('remove_me')).toBeNull();
  });

  it('clear で全削除できること', () => {
    safeSessionStorage.setItem('key1', 'v1');
    safeSessionStorage.setItem('key2', 'v2');
    safeSessionStorage.clear();
    expect(safeSessionStorage.getItem('key1')).toBeNull();
    expect(safeSessionStorage.getItem('key2')).toBeNull();
  });

  describe('generateSettingBackupFileName', () => {
    it('mizuna_setting_yyyymmdd_ランダムな数字.json のフォーマットでファイル名を生成すること', () => {
      const fileName = generateSettingBackupFileName();
      expect(fileName).toMatch(/^mizuna_setting_\d{8}_\d+\.json$/);
    });

    it('指定した日付の yyyymmdd がファイル名に含まれること', () => {
      const testDate = new Date(2026, 10, 1); // 2026-11-01
      const fileName = generateSettingBackupFileName(testDate);
      expect(fileName).toMatch(/^mizuna_setting_20261101_\d+\.json$/);
    });
  });

  describe('generateAccountBackupFileName', () => {
    it('mizuna_account_yyyymmdd_ランダムな数字.json のフォーマットでファイル名を生成すること', () => {
      const fileName = generateAccountBackupFileName();
      expect(fileName).toMatch(/^mizuna_account_\d{8}_\d+\.json$/);
    });

    it('指定した日付の yyyymmdd がファイル名に含まれること', () => {
      const testDate = new Date(2026, 10, 1); // 2026-11-01
      const fileName = generateAccountBackupFileName(testDate);
      expect(fileName).toMatch(/^mizuna_account_20261101_\d+\.json$/);
    });
  });
});
