import { mizuna_options } from '../config/mizunaOptions';
import type { ViewType } from '../store/appStore';

// Google Analytics (GA4) は本番環境 (mode === 'production') かつ ID が存在する場合のみ有効化
export const GA_MEASUREMENT_ID =
  import.meta.env.MODE === 'production'
    ? import.meta.env.VITE_GA_MEASUREMENT_ID
    : undefined;

let isInitialized = false;

/**
 * ビューに応じた仮想パスとタイトルを取得
 */
export function getViewMetadata(view: ViewType): { path: string; title: string } {
  const appName = mizuna_options.app_name;
  switch (view) {
    case 'accounts':
      return { path: '/accounts', title: `アカウント管理 | ${appName}` };
    case 'add_account':
      return { path: '/add_account', title: `アカウント追加 | ${appName}` };
    case 'settings':
      return { path: '/settings', title: `設定 | ${appName}` };
    case 'shortcuts':
      return { path: '/shortcuts', title: `ショートカット | ${appName}` };
    case 'about':
      return { path: '/about', title: `Mizunaについて | ${appName}` };
    case 'announcements':
      return { path: '/announcements', title: `お知らせ | ${appName}` };
    case 'privacy':
      return { path: '/privacy', title: `プライバシーポリシー | ${appName}` };
    case 'note':
    default:
      return { path: '/', title: `${appName} -ノート専用Misskeyクライアント` };
  }
}

/**
 * Google Analytics (GA4) の初期化
 */
export function initAnalytics(customId?: string): void {
  const gaId = customId ?? GA_MEASUREMENT_ID;
  if (isInitialized || typeof window === 'undefined' || !gaId) {
    return;
  }

  isInitialized = true;

  // Google Tag Manager の gtag.js スクリプトを追加
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  document.head.appendChild(script);

  // dataLayer および gtag 関数の定義
  window.dataLayer = window.dataLayer || [];
  function gtag(..._args: unknown[]) {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  }
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', gaId, { send_page_view: false });
}

/**
 * ページビュー（スクリーンビュー）の送信
 */
export function trackPageView(view: ViewType, customId?: string): void {
  const gaId = customId ?? GA_MEASUREMENT_ID;
  if (typeof window === 'undefined' || !gaId) {
    return;
  }

  if (!isInitialized) {
    initAnalytics(gaId);
  }

  if (!window.gtag) {
    return;
  }

  const { path, title } = getViewMetadata(view);
  window.gtag('config', gaId, {
    page_path: path,
    page_title: title,
  });
}

/**
 * テスト用内部状態リセット関数
 */
export function _resetAnalyticsForTesting(): void {
  isInitialized = false;
}
