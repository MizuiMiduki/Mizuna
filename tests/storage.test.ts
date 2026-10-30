import { describe, it, expect, beforeEach } from 'vitest';
import { safeLocalStorage, safeSessionStorage } from '../src/utils/storage';

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
});
