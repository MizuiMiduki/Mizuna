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

  it('サポート対象の言語として 10 言語 (ja_jp, en_us, ru_ru, ko_kr, zh_cn, zh_tw, de_de, fr_fr, es_es, pt_br) が定義されていること', () => {
    expect(DEFAULT_FALLBACK_LANGUAGE).toBe('en_us');
    expect(SUPPORTED_LANGUAGES.map((l) => l.code)).toEqual([
      'ja_jp',
      'en_us',
      'ru_ru',
      'ko_kr',
      'zh_cn',
      'zh_tw',
      'de_de',
      'fr_fr',
      'es_es',
      'pt_br',
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

    it('簡体字中国語環境 (zh-CN, zh) では zh_cn が判定されること', () => {
      Object.defineProperty(navigator, 'languages', {
        value: ['zh-CN', 'zh'],
        configurable: true,
      });
      expect(detectBrowserLanguage()).toBe('zh_cn');
    });

    it('繁体字中国語環境 (zh-TW, zh-HK, zh-MO, zh-Hant) では zh_tw が判定されること', () => {
      Object.defineProperty(navigator, 'languages', {
        value: ['zh-TW', 'zh'],
        configurable: true,
      });
      expect(detectBrowserLanguage()).toBe('zh_tw');

      Object.defineProperty(navigator, 'languages', {
        value: ['zh-HK'],
        configurable: true,
      });
      expect(detectBrowserLanguage()).toBe('zh_tw');

      Object.defineProperty(navigator, 'languages', {
        value: ['zh-MO'],
        configurable: true,
      });
      expect(detectBrowserLanguage()).toBe('zh_tw');

      Object.defineProperty(navigator, 'languages', {
        value: ['zh-Hant'],
        configurable: true,
      });
      expect(detectBrowserLanguage()).toBe('zh_tw');
    });

    it('ドイツ語環境 (de, de-DE) では de_de が判定されること', () => {
      Object.defineProperty(navigator, 'languages', {
        value: ['de-DE', 'de'],
        configurable: true,
      });
      expect(detectBrowserLanguage()).toBe('de_de');
    });

    it('フランス語環境 (fr, fr-FR) では fr_fr が判定されること', () => {
      Object.defineProperty(navigator, 'languages', {
        value: ['fr-FR', 'fr'],
        configurable: true,
      });
      expect(detectBrowserLanguage()).toBe('fr_fr');
    });

    it('スペイン語環境 (es, es-ES) では es_es が判定されること', () => {
      Object.defineProperty(navigator, 'languages', {
        value: ['es-ES', 'es'],
        configurable: true,
      });
      expect(detectBrowserLanguage()).toBe('es_es');
    });

    it('ポルトガル語環境 (pt-BR, pt) では pt_br が判定されること', () => {
      Object.defineProperty(navigator, 'languages', {
        value: ['pt-BR', 'pt'],
        configurable: true,
      });
      expect(detectBrowserLanguage()).toBe('pt_br');
    });

    it('対応外の言語 (it-IT, pl-PL, th-TH 等) の場合は英語 (en_us) にフォールバックすること', () => {
      Object.defineProperty(navigator, 'languages', {
        value: ['it-IT', 'it'],
        configurable: true,
      });
      expect(detectBrowserLanguage()).toBe('en_us');

      Object.defineProperty(navigator, 'languages', {
        value: ['pl-PL'],
        configurable: true,
      });
      expect(detectBrowserLanguage()).toBe('en_us');

      Object.defineProperty(navigator, 'languages', {
        value: ['th-TH'],
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

    it('繁体字中国語 (zh_tw) の翻訳テキストを正しく取得できること', () => {
      expect(translate('common.app_name', undefined, 'zh_tw')).toBe('Mizuna');
      expect(translate('common.back', undefined, 'zh_tw')).toBe('返回');
      expect(translate('header.announcements', undefined, 'zh_tw')).toBe('公告');
      expect(translate('dock.note', undefined, 'zh_tw')).toBe('貼文');
      expect(translate('note.placeholder', undefined, 'zh_tw')).toBe('在想些什麼？');
      expect(translate('settings.title', undefined, 'zh_tw')).toBe('設定');
      expect(translate('update.available', undefined, 'zh_tw')).toBe('有新版本可用');
      expect(translate('offline.title', undefined, 'zh_tw')).toBe('未連線至網際網路');
    });

    it('ドイツ語 (de_de) の翻訳テキストを正しく取得できること', () => {
      expect(translate('common.app_name', undefined, 'de_de')).toBe('Mizuna');
      expect(translate('common.back', undefined, 'de_de')).toBe('Zurück');
      expect(translate('header.announcements', undefined, 'de_de')).toBe('Ankündigungen');
      expect(translate('dock.note', undefined, 'de_de')).toBe('Notiz');
      expect(translate('note.placeholder', undefined, 'de_de')).toBe('Was gibt es Neues?');
      expect(translate('settings.title', undefined, 'de_de')).toBe('Einstellungen');
      expect(translate('update.available', undefined, 'de_de')).toBe('Eine neue Version ist verfügbar');
      expect(translate('offline.title', undefined, 'de_de')).toBe('Keine Internetverbindung');
    });

    it('フランス語 (fr_fr) の翻訳テキストを正しく取得できること', () => {
      expect(translate('common.app_name', undefined, 'fr_fr')).toBe('Mizuna');
      expect(translate('common.back', undefined, 'fr_fr')).toBe('Retour');
      expect(translate('header.announcements', undefined, 'fr_fr')).toBe('Annonces');
      expect(translate('dock.note', undefined, 'fr_fr')).toBe('Note');
      expect(translate('note.placeholder', undefined, 'fr_fr')).toBe('Quoi de neuf ?');
      expect(translate('settings.title', undefined, 'fr_fr')).toBe('Paramètres');
      expect(translate('update.available', undefined, 'fr_fr')).toBe('Une nouvelle version est disponible');
      expect(translate('offline.title', undefined, 'fr_fr')).toBe('Aucune connexion Internet');
    });

    it('スペイン語 (es_es) の翻訳テキストを正しく取得できること', () => {
      expect(translate('common.app_name', undefined, 'es_es')).toBe('Mizuna');
      expect(translate('common.back', undefined, 'es_es')).toBe('Volver');
      expect(translate('header.announcements', undefined, 'es_es')).toBe('Anuncios');
      expect(translate('dock.note', undefined, 'es_es')).toBe('Nota');
      expect(translate('note.placeholder', undefined, 'es_es')).toBe('¿Qué está pasando?');
      expect(translate('settings.title', undefined, 'es_es')).toBe('Ajustes');
      expect(translate('update.available', undefined, 'es_es')).toBe('Hay una nueva versión disponible');
      expect(translate('offline.title', undefined, 'es_es')).toBe('Sin conexión a Internet');
    });

    it('ポルトガル語（ブラジル）(pt_br) の翻訳テキストを正しく取得できること', () => {
      expect(translate('common.app_name', undefined, 'pt_br')).toBe('Mizuna');
      expect(translate('common.back', undefined, 'pt_br')).toBe('Voltar');
      expect(translate('header.announcements', undefined, 'pt_br')).toBe('Anúncios');
      expect(translate('dock.note', undefined, 'pt_br')).toBe('Nota');
      expect(translate('note.placeholder', undefined, 'pt_br')).toBe('O que está acontecendo?');
      expect(translate('settings.title', undefined, 'pt_br')).toBe('Configurações');
      expect(translate('update.available', undefined, 'pt_br')).toBe('Uma nova versão está disponível');
      expect(translate('offline.title', undefined, 'pt_br')).toBe('Sem conexão com a internet');
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

      const textZhTw = translate('update.dialog_content', { version: '3.11.0' }, 'zh_tw');
      expect(textZhTw).toContain('Mizuna v3.11.0 更新已完成');
      expect(textZhTw).not.toContain('{version}');

      const textDe = translate('update.dialog_content', { version: '3.11.0' }, 'de_de');
      expect(textDe).toContain('Update auf v3.11.0 ist abgeschlossen');
      expect(textDe).not.toContain('{version}');

      const textFr = translate('update.dialog_content', { version: '3.11.0' }, 'fr_fr');
      expect(textFr).toContain('mise à jour vers la v3.11.0 est terminée');
      expect(textFr).not.toContain('{version}');

      const textEs = translate('update.dialog_content', { version: '3.11.0' }, 'es_es');
      expect(textEs).toContain('actualización a v3.11.0 se ha completado');
      expect(textEs).not.toContain('{version}');

      const textPtBr = translate('update.dialog_content', { version: '3.11.0' }, 'pt_br');
      expect(textPtBr).toContain('atualização para v3.11.0 foi concluída');
      expect(textPtBr).not.toContain('{version}');
    });

    it('未知または未対応の言語コードが渡された場合、英語 (en_us) にフォールバックすること', () => {
      // @ts-ignore
      const text = translate('common.back', undefined, 'unknown_lang');
      expect(text).toBe('Back');

      // @ts-ignore
      const textIt = translate('common.close', undefined, 'it_it');
      expect(textIt).toBe('Close');
    });

    it('存在しないキーが渡された場合、キー文字列そのものが安全に返ること', () => {
      // @ts-ignore
      expect(translate('non.existent.key')).toBe('non.existent.key');
    });
  });
});
