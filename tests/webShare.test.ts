import { describe, it, expect, beforeEach } from 'vitest';
import {
  captureWebShareTargetFromUrl,
  getWebShareTargetStorage,
  clearWebShareTargetStorage,
  combineNoteWithShareData,
} from '../src/utils/webShare';
import { safeLocalStorage } from '../src/utils/storage';

describe('webShare utility', () => {
  beforeEach(() => {
    clearWebShareTargetStorage();
    safeLocalStorage.clear();
  });

  it('URLクエリから title, text, url を抽出してストレージに保存すること', () => {
    const testUrl = 'https://example.com/?title=Mizuna&text=Hello%20World&url=https%3A%2F%2Fmisskey.io';
    const result = captureWebShareTargetFromUrl(testUrl);
    expect(result).toBe(true);

    const data = getWebShareTargetStorage();
    expect(data).toEqual({
      title: 'Mizuna',
      text: 'Hello World',
      url: 'https://misskey.io',
    });
  });

  it('クエリに対象パラメータが含まれない場合は false を返し保存しないこと', () => {
    const testUrl = 'https://example.com/?other=param';
    const result = captureWebShareTargetFromUrl(testUrl);
    expect(result).toBe(false);
    expect(getWebShareTargetStorage()).toBeNull();
  });

  it('clearWebShareTargetStorage でストレージから削除されること', () => {
    captureWebShareTargetFromUrl('https://example.com/?text=Test');
    expect(getWebShareTargetStorage()).not.toBeNull();
    clearWebShareTargetStorage();
    expect(getWebShareTargetStorage()).toBeNull();
  });

  it('combineNoteWithShareData が本文を改行区切りで結合すること', () => {
    const combined = combineNoteWithShareData('既存メモ', {
      title: 'タイトル',
      text: '共有テキスト',
      url: 'https://example.com',
    });
    expect(combined).toBe('既存メモ\nタイトル\n共有テキスト\nhttps://example.com');
  });

  it('既存本文が空の場合でも先頭に不要な改行を入れずに結合すること', () => {
    const combined = combineNoteWithShareData('', {
      title: 'タイトル',
      text: null,
      url: 'https://example.com',
    });
    expect(combined).toBe('タイトル\nhttps://example.com');
  });
});
