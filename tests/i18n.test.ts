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

  it('サポート対象の言語として 日本語 (ja_jp)、英語 (en_us)、ロシア語 (ru_ru)、韓国語 (ko_kr)、簡体字中国語 (zh_cn) が定義されていること', () => {
    expect(DEFAULT_FALLBACK_LANGUAGE).toBe('en_us');
    expect(SUPPORTED_LANGUAGES.map((l) => l.code)).toEqual([
      'ja_jp',
      'en_us',
      'ru_ru',
      'ko_kr',
      'zh_cn',
    ]);
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

    it('ロシア語環境 (ru, ru-RU) では ru_ru が判定されること', () => {
      Object.defineProperty(navigator, 'languages', {
        value: ['ru-RU', 'ru'],
        configurable: true,
      });
      expect(detectBrowserLanguage()).toBe('ru_ru');
    });

    it('韓国語環境 (ko, ko-KR) では ko_kr が判定されること', () => {
      Object.defineProperty(navigator, 'languages', {
        value: ['ko-KR', 'ko'],
        configurable: true,
      });
      expect(detectBrowserLanguage()).toBe('ko_kr');
    });

    it('中国語環境 (zh-CN, zh) では zh_cn が判定されること', () => {
      Object.defineProperty(navigator, 'languages', {
        value: ['zh-CN', 'zh'],
        configurable: true,
      });
      expect(detectBrowserLanguage()).toBe('zh_cn');
    });

    it('対応外の言語 (fr-FR, de-DE, es-ES 等) の場合は英語 (en_us) にフォールバックすること', () => {
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
        value: ['es-ES'],
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

    it('ロシア語 (ru_ru) の翻訳テキストを正しく取得できること', () => {
      expect(translate('common.app_name', undefined, 'ru_ru')).toBe('Mizuna');
      expect(translate('common.back', undefined, 'ru_ru')).toBe('Назад');
      expect(translate('header.announcements', undefined, 'ru_ru')).toBe('Объявления');
      expect(translate('dock.note', undefined, 'ru_ru')).toBe('Заметка');
      expect(translate('note.placeholder', undefined, 'ru_ru')).toBe('Что происходит?');
      expect(translate('settings.title', undefined, 'ru_ru')).toBe('Настройки');
      expect(translate('update.available', undefined, 'ru_ru')).toBe('Доступна новая версия');
      expect(translate('offline.title', undefined, 'ru_ru')).toBe('Нет подключения к интернету');
    });

    it('韓国語 (ko_kr) の翻訳テキストを正しく取得できること', () => {
      expect(translate('common.app_name', undefined, 'ko_kr')).toBe('Mizuna');
      expect(translate('common.back', undefined, 'ko_kr')).toBe('뒤로');
      expect(translate('header.announcements', undefined, 'ko_kr')).toBe('공지사항');
      expect(translate('dock.note', undefined, 'ko_kr')).toBe('노트');
      expect(translate('note.placeholder', undefined, 'ko_kr')).toBe('무슨 일이 일어나고 있나요?');
      expect(translate('settings.title', undefined, 'ko_kr')).toBe('설정');
      expect(translate('update.available', undefined, 'ko_kr')).toBe('새 버전이 사용 가능합니다');
      expect(translate('offline.title', undefined, 'ko_kr')).toBe('인터넷에 연결되어 있지 않습니다');
    });

    it('簡体字中国語 (zh_cn) の翻訳テキストを正しく取得できること', () => {
      expect(translate('common.app_name', undefined, 'zh_cn')).toBe('Mizuna');
      expect(translate('common.back', undefined, 'zh_cn')).toBe('返回');
      expect(translate('header.announcements', undefined, 'zh_cn')).toBe('公告');
      expect(translate('dock.note', undefined, 'zh_cn')).toBe('便签');
      expect(translate('note.placeholder', undefined, 'zh_cn')).toBe('在想些什么？');
      expect(translate('settings.title', undefined, 'zh_cn')).toBe('设置');
      expect(translate('update.available', undefined, 'zh_cn')).toBe('有新版本可用');
      expect(translate('offline.title', undefined, 'zh_cn')).toBe('未连接到互联网');
    });

    it('プレースホルダー置換が各言語で正常に動作すること', () => {
      const textJa = translate('update.dialog_content', { version: '3.11.0' }, 'ja_jp');
      expect(textJa).toContain('Mizuna v3.11.0 への更新が完了しました');
      expect(textJa).not.toContain('{version}');

      const textEn = translate('update.dialog_content', { version: '3.11.0' }, 'en_us');
      expect(textEn).toContain('Update to v3.11.0 is complete');
      expect(textEn).not.toContain('{version}');

      const textRu = translate('update.dialog_content', { version: '3.11.0' }, 'ru_ru');
      expect(textRu).toContain('Обновление до v3.11.0 завершено');
      expect(textRu).not.toContain('{version}');

      const textKo = translate('update.dialog_content', { version: '3.11.0' }, 'ko_kr');
      expect(textKo).toContain('Mizuna v3.11.0 업데이트가 완료되었습니다');
      expect(textKo).not.toContain('{version}');

      const textZh = translate('update.dialog_content', { version: '3.11.0' }, 'zh_cn');
      expect(textZh).toContain('Mizuna v3.11.0 更新已完成');
      expect(textZh).not.toContain('{version}');
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
