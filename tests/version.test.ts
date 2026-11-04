import { describe, it, expect } from 'vitest';
import {
  comparisonVersion,
  hasDrivePermission,
  hasHistoryPermission,
  getMissingPermissions,
} from '../src/utils/version';

describe('comparisonVersion', () => {
  it('同一バージョンで 0 を返すこと', () => {
    expect(comparisonVersion('3.10.0', '3.10.0')).toBe(0);
    expect(comparisonVersion('1.0.0', '1.0.0')).toBe(0);
  });

  it('メジャーバージョンの高低を判定できること', () => {
    expect(comparisonVersion('3.5.0', '4.0.0')).toBeLessThan(0);
    expect(comparisonVersion('4.0.0', '3.5.0')).toBeGreaterThan(0);
  });

  it('マイナーバージョンの高低を判定できること', () => {
    expect(comparisonVersion('3.9.0', '3.10.0')).toBeLessThan(0);
    expect(comparisonVersion('3.10.0', '3.9.0')).toBeGreaterThan(0);
  });

  it('パッチバージョンの高低を判定できること', () => {
    expect(comparisonVersion('3.10.0', '3.10.1')).toBeLessThan(0);
    expect(comparisonVersion('3.10.1', '3.10.0')).toBeGreaterThan(0);
  });

  it('欠損したバージョン文字列 (例: "4.0", "3") でも 0 で補完して正しく比較できること', () => {
    expect(comparisonVersion('4.0', '4.0.0')).toBe(0);
    expect(comparisonVersion('3', '3.0.0')).toBe(0);
    expect(comparisonVersion('3.1', '3.0.5')).toBeGreaterThan(0);
    expect(comparisonVersion('', '0.0.0')).toBe(0);
  });

  describe('hasDrivePermission', () => {
    it('3.5.0 未満のアカウントでは false を返すこと', () => {
      expect(hasDrivePermission('3.4.0')).toBe(false);
      expect(hasDrivePermission('3.0.0')).toBe(false);
      expect(hasDrivePermission('2.0.0')).toBe(false);
      expect(hasDrivePermission(null)).toBe(false);
    });

    it('3.5.0 以上のバージョンでは true を返すこと', () => {
      expect(hasDrivePermission('3.5.0')).toBe(true);
      expect(hasDrivePermission('3.5.1')).toBe(true);
      expect(hasDrivePermission('3.13.0')).toBe(true);
      expect(hasDrivePermission('3.13.1')).toBe(true);
      expect(hasDrivePermission('3.14.0')).toBe(true);
      expect(hasDrivePermission('3.15.0')).toBe(true);
      expect(hasDrivePermission('4.0.0')).toBe(true);
    });
  });

  describe('hasHistoryPermission', () => {
    it('4.0.0 未満のアカウントでは false を返すこと', () => {
      expect(hasHistoryPermission('3.15.0')).toBe(false);
      expect(hasHistoryPermission('3.5.0')).toBe(false);
      expect(hasHistoryPermission('3.0.0')).toBe(false);
      expect(hasHistoryPermission(null)).toBe(false);
    });

    it('4.0.0 以上のバージョンでは true を返すこと', () => {
      expect(hasHistoryPermission('4.0.0')).toBe(true);
      expect(hasHistoryPermission('4.0.1')).toBe(true);
      expect(hasHistoryPermission('4.1.0')).toBe(true);
      expect(hasHistoryPermission('5.0.0')).toBe(true);
    });
  });

  describe('getMissingPermissions', () => {
    it('3.5.0 未満のアカウントでは write:drive, read:notes, read:notifications を含むこと', () => {
      expect(getMissingPermissions('3.4.0')).toEqual(['write:drive', 'read:notes', 'read:notifications']);
      expect(getMissingPermissions('1.0.0')).toEqual(['write:drive', 'read:notes', 'read:notifications']);
      expect(getMissingPermissions(null)).toEqual(['write:drive', 'read:notes', 'read:notifications']);
    });

    it('3.5.0 以上 4.0.0 未満のバージョンでは read:notes と read:notifications が不足すること', () => {
      expect(getMissingPermissions('3.5.0')).toEqual(['read:notes', 'read:notifications']);
      expect(getMissingPermissions('3.13.0')).toEqual(['read:notes', 'read:notifications']);
      expect(getMissingPermissions('3.14.0')).toEqual(['read:notes', 'read:notifications']);
      expect(getMissingPermissions('3.15.0')).toEqual(['read:notes', 'read:notifications']);
    });

    it('4.0.0 以上のバージョンでは空配列を返すこと', () => {
      expect(getMissingPermissions('4.0.0')).toEqual([]);
      expect(getMissingPermissions('4.0.1')).toEqual([]);
      expect(getMissingPermissions('4.1.0')).toEqual([]);
    });
  });
});
