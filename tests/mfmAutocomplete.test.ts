import { describe, it, expect } from 'vitest';
import {
  getMfmTriggerInfo,
  filterMfmSuggestions,
  applyMfmSuggestion,
  MFM_SUGGESTIONS,
} from '../src/utils/mfmAutocomplete';

describe('MFM Autocomplete Utils', () => {
  it('MFM関数の全候補が定義されていること', () => {
    expect(MFM_SUGGESTIONS.length).toBeGreaterThanOrEqual(20);
    expect(MFM_SUGGESTIONS.some((s) => s.key === 'shake')).toBe(true);
    expect(MFM_SUGGESTIONS.some((s) => s.key === 'rainbow')).toBe(true);
    expect(MFM_SUGGESTIONS.some((s) => s.key === 'jelly')).toBe(true);
  });

  describe('getMfmTriggerInfo', () => {
    it('$ 単体でトリガーが有効になること', () => {
      const res = getMfmTriggerInfo('Hello $', 7);
      expect(res.active).toBe(true);
      expect(res.query).toBe('');
      expect(res.startPos).toBe(6);
    });

    it('$[ でトリガーが有効になること', () => {
      const res = getMfmTriggerInfo('Hello $[', 8);
      expect(res.active).toBe(true);
      expect(res.query).toBe('');
      expect(res.startPos).toBe(6);
    });

    it('$[sh でクエリが取得できること', () => {
      const res = getMfmTriggerInfo('Hello $[sh', 10);
      expect(res.active).toBe(true);
      expect(res.query).toBe('sh');
      expect(res.startPos).toBe(6);
    });

    it('$なしの通常テキストではトリガーが無効であること', () => {
      const res = getMfmTriggerInfo('Hello world', 11);
      expect(res.active).toBe(false);
      expect(res.startPos).toBe(-1);
    });
  });

  describe('filterMfmSuggestions', () => {
    it('空クエリで全候補を返すこと', () => {
      expect(filterMfmSuggestions('').length).toBe(MFM_SUGGESTIONS.length);
    });

    it('sh で shake 等が絞り込まれること', () => {
      const filtered = filterMfmSuggestions('sh');
      expect(filtered.some((s) => s.key === 'shake')).toBe(true);
      expect(filtered.every((s) => s.key.includes('sh') || s.desc.includes('sh'))).toBe(true);
    });

    it('日本語キーワード（揺らす）でもマッチすること', () => {
      const filtered = filterMfmSuggestions('揺らす');
      expect(filtered.some((s) => s.key === 'shake')).toBe(true);
    });
  });

  describe('applyMfmSuggestion', () => {
    it('$[sh を $[shake テキスト] に正しく置換すること', () => {
      const suggestion = MFM_SUGGESTIONS.find((s) => s.key === 'shake')!;
      const text = 'Hello $[sh World';
      const startPos = 6;
      const cursorPosition = 10;
      const { newText, newCursorPos } = applyMfmSuggestion(text, startPos, cursorPosition, suggestion);
      expect(newText).toBe('Hello $[shake テキスト] World');
      expect(newCursorPos).toBe(6 + '$[shake テキスト'.length);
    });

    it('$ 単体を置換して展開できること', () => {
      const suggestion = MFM_SUGGESTIONS.find((s) => s.key === 'rainbow')!;
      const text = 'Color: $';
      const startPos = 7;
      const cursorPosition = 8;
      const { newText } = applyMfmSuggestion(text, startPos, cursorPosition, suggestion);
      expect(newText).toBe('Color: $[rainbow テキスト]');
    });
  });
});
