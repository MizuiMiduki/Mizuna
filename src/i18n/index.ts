import { ja } from './locales/ja';
import type { I18nKey, LanguageCode, LanguageOption } from './types';

export * from './types';
export { ja } from './locales/ja';

export const DEFAULT_LANGUAGE: LanguageCode = 'ja_jp';

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'ja_jp', label: '日本語' },
];

const dictionaries: Record<string, typeof ja> = {
  ja_jp: ja,
  ja: ja,
};

/**
 * 超軽量・ゼロ依存の翻訳テキスト取得関数
 * メモリ消費・CPU負荷を最小限に抑え、O(1)レベルの探索とシンプルな文字列置換のみで動作します。
 *
 * @param key ネストキー (例: 'common.back')
 * @param params プレースホルダー置換 (例: { version: '3.11.0' })
 * @param lang 言語コード (未指定時は ja_jp)
 */
export function translate(
  key: I18nKey,
  params?: Record<string, string | number>,
  lang: string = DEFAULT_LANGUAGE
): string {
  const dict = dictionaries[lang] || dictionaries[DEFAULT_LANGUAGE] || ja;
  const segments = key.split('.');

  let current: any = dict;
  for (let i = 0; i < segments.length; i++) {
    if (current == null) {
      current = undefined;
      break;
    }
    current = current[segments[i]];
  }

  // 指定言語にキーが存在しない場合のフォールバック（ja を参照）
  if (typeof current !== 'string' && dict !== ja) {
    let fallback: any = ja;
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
