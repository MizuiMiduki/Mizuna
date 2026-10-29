import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  translate,
  detectBrowserLanguage,
  SUPPORTED_LANGUAGES,
  DEFAULT_FALLBACK_LANGUAGE,
} from '../src/i18n';

describe('i18n (Internationalization) Foundation & Multi-language Support', () => {
  const originalLanguage = navigator.language;
  const originalLanguages = navigator.languages;

  afterEach(() => {
    Object.defineProperty(navigator, 'language', {
      value: originalLanguage,
      configurable: true,
    });
    Object.defineProperty(navigator, 'languages', {
      value: originalLanguages,
      configurable: true,
    });
  });

  it('サポート対象の言語として 日本語 (ja_jp) と 英語 (en_us) が定義されていること', () => {
    expect(DEFAULT_FALLBACK_LANGUAGE).toBe('en_us');
    expect(SUPPORTED_LANGUAGES.map((l) => l.code)).toEqual(['ja_jp', 'en_us']);
  });

  describe('ブラウザ/OS言語の自動判定 (detectBrowserLanguage)', () => {
    it('日本語環境 (ja, ja-JP) では ja_jp が判定されること', () => {
      Object.defineProperty(navigator, 'languages', {
        value: ['ja-JP', 'ja'],
        configurable: true,
      });
      expect(detectBrowserLanguage()).toBe('ja_jp');

      Object.defineProperty(navigator, 'languages', {
        value: ['ja'],
        configurable: true,
      });
      expect(detectBrowserLanguage()).toBe('ja_jp');
    });

    it('英語環境 (en-US, en-GB) では en_us が判定されること', () => {
      Object.defineProperty(navigator, 'languages', {
        value: ['en-US', 'en'],
        configurable: true,
      });
      expect(detectBrowserLanguage()).toBe('en_us');
    });

    it('対応外の言語 (fr-FR, de-DE, zh-CN 等) の場合は英語 (en_us) にフォールバックすること', () => {
      Object.defineProperty(navigator, 'languages', {
        value: ['fr-FR', 'fr'],
        configurable: true,
      });
      expect(detectBrowserLanguage()).toBe('en_us');

      Object.defineProperty(navigator, 'languages', {
        value: ['de-DE'],
        configurable: true,
      });
      expect(detectBrowserLanguage()).toBe('en_us');

      Object.defineProperty(navigator, 'languages', {
        value: ['zh-CN'],
        configurable: true,
      });
      expect(detectBrowserLanguage()).toBe('en_us');
    });
  });

  describe('翻訳テキストの取得 (translate)', () => {
    it('日本語 (ja_jp) の翻訳テキストを正しく取得できること', () => {
      expect(translate('common.app_name', undefined, 'ja_jp')).toBe('Mizuna');
      expect(translate('common.back', undefined, 'ja_jp')).toBe('もどる');
      expect(translate('header.announcements', undefined, 'ja_jp')).toBe('お知らせ');
      expect(translate('dock.note', undefined, 'ja_jp')).toBe('ノート');
      expect(translate('note.placeholder', undefined, 'ja_jp')).toBe('いまどうしてる？');
      expect(translate('settings.title', undefined, 'ja_jp')).toBe('設定');
      expect(translate('update.available', undefined, 'ja_jp')).toBe('新しいバージョンが利用可能です');
      expect(translate('offline.title', undefined, 'ja_jp')).toBe('インターネットに接続されていません');
    });

    it('英語 (en_us) の翻訳テキストを正しく取得できること', () => {
      expect(translate('common.app_name', undefined, 'en_us')).toBe('Mizuna');
      expect(translate('common.back', undefined, 'en_us')).toBe('Back');
      expect(translate('header.announcements', undefined, 'en_us')).toBe('Announcements');
      expect(translate('dock.note', undefined, 'en_us')).toBe('Note');
      expect(translate('note.placeholder', undefined, 'en_us')).toBe("What's happening?");
      expect(translate('settings.title', undefined, 'en_us')).toBe('Settings');
      expect(translate('update.available', undefined, 'en_us')).toBe('A new version is available');
      expect(translate('offline.title', undefined, 'en_us')).toBe('No Internet Connection');
    });

    it('プレースホルダー置換が日・英両方で正常に動作すること', () => {
      const textJa = translate('update.dialog_content', { version: '3.11.0' }, 'ja_jp');
      expect(textJa).toContain('Mizuna v3.11.0 への更新が完了しました');
      expect(textJa).not.toContain('{version}');

      const textEn = translate('update.dialog_content', { version: '3.11.0' }, 'en_us');
      expect(textEn).toContain('Update to v3.11.0 is complete');
      expect(textEn).not.toContain('{version}');
    });

    it('未知または未対応の言語コードが渡された場合、英語 (en_us) にフォールバックすること', () => {
      // @ts-ignore
      const text = translate('common.back', undefined, 'unknown_lang');
      expect(text).toBe('Back');

      // @ts-ignore
      const textFr = translate('common.close', undefined, 'fr_fr');
      expect(textFr).toBe('Close');
    });

    it('存在しないキーが渡された場合、キー文字列そのものが安全に返ること', () => {
      // @ts-ignore
      expect(translate('non.existent.key')).toBe('non.existent.key');
    });
  });
});
