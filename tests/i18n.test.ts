import { describe, it, expect } from 'vitest';
import { translate, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../src/i18n';

describe('i18n (Internationalization) Foundation', () => {
  it('デフォルト言語として ja_jp が設定されていること', () => {
    expect(DEFAULT_LANGUAGE).toBe('ja_jp');
    expect(SUPPORTED_LANGUAGES.some((lang) => lang.code === 'ja_jp')).toBe(true);
  });

  it('日本語キーの翻訳テキストを正しく取得できること', () => {
    expect(translate('common.app_name')).toBe('Mizuna');
    expect(translate('common.back')).toBe('もどる');
    expect(translate('header.announcements')).toBe('お知らせ');
    expect(translate('note.placeholder')).toBe('今なにしてる？');
    expect(translate('settings.title')).toBe('設定');
    expect(translate('update.available')).toBe('新しいバージョンが利用可能です');
    expect(translate('offline.title')).toBe('インターネットに接続されていません');
  });

  it('プレースホルダー置換が正常に動作すること', () => {
    const text = translate('update.dialog_content', { version: '3.11.0' });
    expect(text).toContain('Mizuna v3.11.0 への更新が完了しました');
    expect(text).not.toContain('{version}');
  });

  it('未知の言語コードが渡された場合、デフォルト言語 (ja_jp) にフォールバックすること', () => {
    // @ts-ignore
    const text = translate('common.back', undefined, 'unknown_lang');
    expect(text).toBe('もどる');
  });

  it('存在しないキーが渡された場合、キー文字列そのものが安全に返ること', () => {
    // @ts-ignore
    expect(translate('non.existent.key')).toBe('non.existent.key');
  });
});
