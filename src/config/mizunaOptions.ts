export interface MizunaOptions {
  mizuna_version: string;
  mizuna_address: string;
  is_canary: boolean;
  app_name: string;
  maintenance: boolean;
  news_banner_title: string;
  news_banner_text: string;
}

export interface MizunaShare {
  title: string;
  text: string;
  url: string;
}

export const MIZUNA_VERSION = '3.13.0';

/**
 * Canary / 本番の手動強制切り替えフラグ
 * - null: 自動判定（`npm run build:canary`、開発環境、またはホスト名に `canary` / `test` を含む場合に Canary 化）
 * - true: 強制的に Canary として動作
 * - false: 強制的に 本番 (Mizuna) として動作
 */
export const FORCE_CANARY: boolean | null = null;

function detectIsCanary(): boolean {
  if (FORCE_CANARY !== null) {
    return FORCE_CANARY;
  }
  if (import.meta.env.MODE === 'canary' || import.meta.env.DEV) {
    return true;
  }
  if (typeof location !== 'undefined') {
    const h = location.hostname.toLowerCase();
    if (h.includes('canary') || h.includes('test')) {
      return true;
    }
  }
  return false;
}

export const IS_CANARY = detectIsCanary();
export const MIZUNA_APP_NAME = IS_CANARY ? 'Mizuna Canary' : 'Mizuna';

export const mizuna_options: MizunaOptions = {
  mizuna_version: MIZUNA_VERSION,
  mizuna_address:
    typeof location !== 'undefined'
      ? `${location.protocol}//${location.host}`
      : 'https://mizuna.blossomsarchive.com',
  is_canary: IS_CANARY,
  app_name: MIZUNA_APP_NAME,
  maintenance: false,
  news_banner_title: '',
  news_banner_text: '',
};

export const mizuna_share: MizunaShare = {
  title: `${MIZUNA_APP_NAME} - ノート専用Misskeyクライアント`,
  text: 'Mizunaは機能をノート送信のみにすることで通信量削減に重点を置いたMisskeyクライアントです',
  url: 'https://mizuna.blossomsarchive.com/',
};
