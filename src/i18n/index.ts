import { ja } from './locales/ja';
import { en } from './locales/en';
import type { I18nKey, LanguageCode, LanguageOption, LocaleDictionary } from './types';

export * from './types';
export { ja } from './locales/ja';
export { en } from './locales/en';

// 対応外の言語の場合は英語で表示する
export const DEFAULT_FALLBACK_LANGUAGE: LanguageCode = 'en_us';
export const DEFAULT_LANGUAGE: LanguageCode = DEFAULT_FALLBACK_LANGUAGE;

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'ja_jp', label: '日本語' },
  { code: 'en_us', label: 'English' },
];

const dictionaries: Record<LanguageCode, LocaleDictionary> = {
  ja_jp: ja,
  en_us: en,
};

/**
 * ブラウザまたはOSの言語設定を判定します。
 * 日本語環境の場合は 'ja_jp' を、それ以外（対応外の言語含む）は英語 'en_us' を返します。
 */
export function detectBrowserLanguage(): LanguageCode {
  if (typeof navigator === 'undefined') {
    return DEFAULT_FALLBACK_LANGUAGE;
  }

  const browserLangs = navigator.languages || [navigator.language || ''];
  for (const lang of browserLangs) {
    if (!lang) continue;
    const lower = lang.toLowerCase();
    if (lower.startsWith('ja')) {
      return 'ja_jp';
    }
  }

  // 対応外の言語はすべて英語にする
  return DEFAULT_FALLBACK_LANGUAGE;
}

/**
 * 超軽量・ゼロ依存の翻訳テキスト取得関数
 * メモリ消費・CPU負荷を最小限に抑え、O(1)レベルの探索とシンプルな文字列置換のみで動作します。
 *
 * @param key ネストキー (例: 'common.back')
 * @param params プレースホルダー置換 (例: { version: '3.11.0' })
 * @param lang 言語コード (未指定時または対応外は英語にフォールバック)
 */
export function translate(
  key: I18nKey,
  params?: Record<string, string | number>,
  lang?: string
): string {
  const targetCode: LanguageCode =
    lang === 'ja_jp' || lang === 'en_us' ? lang : DEFAULT_FALLBACK_LANGUAGE;
  const dict = dictionaries[targetCode] || en;
  const segments = key.split('.');

  let current: any = dict;
  for (let i = 0; i < segments.length; i++) {
    if (current == null) {
      current = undefined;
      break;
    }
    current = current[segments[i]];
  }

  // 指定言語にキーが存在しない場合のフォールバック（英語 en を参照）
  if (typeof current !== 'string' && targetCode !== 'en_us') {
    let fallback: any = en;
    for (let i = 0; i < segments.length; i++) {
      if (fallback == null) {
        fallback = undefined;
        break;
      }
      fallback = fallback[segments[i]];
    }
    current = fallback;
  }

  let text = typeof current === 'string' ? current : key;

  // プレースホルダー置換: {name} を params[name] の値に置換
  if (params && text.includes('{')) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }

  return text;
}
