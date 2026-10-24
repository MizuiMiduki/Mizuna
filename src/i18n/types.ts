import type { ja } from './locales/ja';

export type LanguageCode = 'ja_jp' | 'en_us';

type Join<K, P> = K extends string | number
  ? P extends string | number
    ? `${K}${'' extends P ? '' : '.'}${P}`
    : never
  : never;

type Prev = [never, 0, 1, 2, 3, 4, 5];

type Leaves<T, D extends number = 4> = [D] extends [never]
  ? never
  : T extends object
  ? { [K in keyof T]-?: Join<K, Leaves<T[K], Prev[D]>> }[keyof T]
  : '';

export type I18nKey = Leaves<typeof ja>;

export type LocaleDictionary = {
  [K in keyof typeof ja]: {
    [P in keyof (typeof ja)[K]]: string;
  };
};

export interface LanguageOption {
  code: LanguageCode;
  label: string;
}
