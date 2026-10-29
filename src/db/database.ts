import Dexie, { type Table } from 'dexie';
import { detectBrowserLanguage } from '../i18n';

/**
 * アカウント情報レコード
 * ※過去バージョンとの互換性のため `add_mizuna_versinon` のスペルを維持しています
 */
export interface AccountRecord {
  id?: number;
  token: string;
  name: string;
  username: string;
  address: string;
  avatarurl: string;
  add_mizuna_versinon: string;
}

/**
 * ユーザー設定レコード
 * id: 1 のレコードが使用されます
 */
export interface SettingRecord {
  id?: number;
  /** 表示するユーザーのID (初期値: 1) */
  select_user: number;
  /** デフォルトの投稿範囲 (1: public, 2: home, 3: followers) */
  default_visibility: 1 | 2 | 3;
  /** ノートの最後に "from Mizuna" をデフォルトで付けるか */
  is_note_end_mizuna: boolean;
  /** 自分のアイコンを表示するか */
  is_visible_icon: boolean;
  /** UIモード (1: 通常, 2: シンプル, 3: 大, 4: 中, 5: 小) */
  ui_mode: 1 | 2 | 3 | 4 | 5;
  /** ダークモード (1: 無効, 2: 端末設定, 3: 有効) */
  is_darkmode: 1 | 2 | 3;
  /** アイコンカラーを元にUIカラーを変更するか */
  is_pick_theme_color: boolean;
  /** 最後に使用したテーマカラー [main_color, text_color, button_text_color] */
  latest_theme_color: [string | null, string | null, string | null];
  /** バージョンアップのチェック済みバージョン */
  is_check_releasenote: string | null;
  /** 言語設定 */
  language: string;
  /** アカウントの並び順 (アカウントID配列) */
  account_order?: number[];
  /** ユーザー定義のカスタムCSS */
  custom_css?: string;
}

export const DEFAULT_USER_SETTINGS: Omit<SettingRecord, 'id'> = {
  select_user: 1,
  default_visibility: 1,
  is_note_end_mizuna: false,
  is_visible_icon: true,
  ui_mode: 1,
  is_darkmode: 1,
  is_pick_theme_color: false,
  latest_theme_color: [null, null, null],
  is_check_releasenote: null,
  get language() {
    return detectBrowserLanguage();
  },
  account_order: [],
  custom_css: '',
};

export class MizunaDatabase extends Dexie {
  account!: Table<AccountRecord, number>;
  setting!: Table<SettingRecord, number>;

  constructor() {
    super('MizunaDatabase');

    // v1 (旧バージョン互換)
    this.version(1).stores({
      account: '++id, token, name, username, address, avatarurl, add_mizuna_versinon',
      setting:
        '++id, select_user, default_visibility, is_note_end_mizuna, is_visible_icon, ui_mode, is_darkmode, is_pick_theme_color',
    });

    // v2 (旧バージョン互換)
    this.version(2).stores({
      setting:
        '++id, select_user, default_visibility, is_note_end_mizuna, is_visible_icon, ui_mode, is_darkmode, is_pick_theme_color, latest_theme_color, is_check_releasenote',
    });

    // v3 (旧バージョン互換)
    this.version(3).stores({
      setting:
        '++id, select_user, default_visibility, is_note_end_mizuna, is_visible_icon, ui_mode, is_darkmode, is_pick_theme_color, latest_theme_color, is_check_releasenote, language',
    });
  }
}

export const db = new MizunaDatabase();

/**
 * ユーザー設定をDBから取得（存在しない場合は初期値で作成）
 */
export async function loadOrCreateSettings(): Promise<SettingRecord> {
  await db.open();
  const res = await db.setting.bulkGet([1]);
  const settingData = res[0] ?? null;

  if (settingData) {
    return {
      id: 1,
      select_user: settingData.select_user ?? DEFAULT_USER_SETTINGS.select_user,
      default_visibility: (settingData.default_visibility as 1 | 2 | 3) ?? DEFAULT_USER_SETTINGS.default_visibility,
      is_note_end_mizuna: settingData.is_note_end_mizuna ?? DEFAULT_USER_SETTINGS.is_note_end_mizuna,
      is_visible_icon: settingData.is_visible_icon ?? DEFAULT_USER_SETTINGS.is_visible_icon,
      ui_mode: (settingData.ui_mode as 1 | 2 | 3 | 4 | 5) ?? DEFAULT_USER_SETTINGS.ui_mode,
      is_darkmode: (settingData.is_darkmode as 1 | 2 | 3) ?? DEFAULT_USER_SETTINGS.is_darkmode,
      is_pick_theme_color: settingData.is_pick_theme_color ?? DEFAULT_USER_SETTINGS.is_pick_theme_color,
      latest_theme_color: settingData.latest_theme_color ?? DEFAULT_USER_SETTINGS.latest_theme_color,
      is_check_releasenote: settingData.is_check_releasenote ?? DEFAULT_USER_SETTINGS.is_check_releasenote,
      language: settingData.language ?? detectBrowserLanguage(),
      account_order: Array.isArray(settingData.account_order) ? settingData.account_order : [],
      custom_css: typeof settingData.custom_css === 'string' ? settingData.custom_css : DEFAULT_USER_SETTINGS.custom_css,
    };
  }

  // id: 1 として初期設定を作成（OS/ブラウザ言語から自動判定）
  const initialLanguage = detectBrowserLanguage();
  const initialSettings = {
    ...DEFAULT_USER_SETTINGS,
    language: initialLanguage,
  };

  await db.setting.put({
    id: 1,
    ...initialSettings,
  });

  return {
    id: 1,
    ...initialSettings,
  };
}

/**
 * ユーザー設定を更新する
 */
export async function updateSettingDb(changes: Partial<SettingRecord>): Promise<void> {
  await db.setting.bulkUpdate([
    {
      key: 1,
      changes,
    },
  ]);
}

/**
 * アカウント数をチェック (0: 未登録, 1: 登録済み)
 */
export async function checkAccountDbStatus(): Promise<0 | 1> {
  await db.open();
  const count = await db.account.count();
  return count === 0 ? 0 : 1;
}
