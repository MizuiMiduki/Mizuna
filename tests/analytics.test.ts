import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mizuna_options } from '../src/config/mizunaOptions';
import {
  _resetAnalyticsForTesting,
  getViewMetadata,
  initAnalytics,
  trackPageView,
} from '../src/utils/analytics';
import type { ViewType } from '../src/store/appStore';

describe('analytics utility', () => {
  const TEST_GA_ID = 'G-TEST123456';
  const appName = mizuna_options.app_name;

  beforeEach(() => {
    _resetAnalyticsForTesting();
    document.head.innerHTML = '';
    delete (window as unknown as { dataLayer?: unknown[] }).dataLayer;
    delete (window as unknown as { gtag?: unknown }).gtag;
  });

  afterEach(() => {
    _resetAnalyticsForTesting();
    document.head.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('getViewMetadata', () => {
    it('各ViewTypeに対応する仮想パスとタイトルを正しく返すこと', () => {
      const views: ViewType[] = [
        'note',
        'accounts',
        'add_account',
        'settings',
        'shortcuts',
        'about',
        'announcements',
        'privacy',
      ];

      for (const view of views) {
        const metadata = getViewMetadata(view);
        expect(metadata.path).toBeDefined();
        expect(metadata.title).toBeDefined();
        if (view === 'note') {
          expect(metadata.path).toBe('/');
        } else {
          expect(metadata.path).toBe(`/${view}`);
        }
      }
    });
  });

  describe('initAnalytics', () => {
    it('GA_IDが指定されていない場合はスクリプトタグを追加しないこと', () => {
      initAnalytics('');
      expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
      expect(window.gtag).toBeUndefined();
    });

    it('GA_IDが指定された場合、gtagスクリプトタグをheadに挿入し初期化すること', () => {
      initAnalytics(TEST_GA_ID);

      const script = document.querySelector('script[src*="googletagmanager"]') as HTMLScriptElement;
      expect(script).not.toBeNull();
      expect(script.src).toContain(`id=${TEST_GA_ID}`);
      expect(script.async).toBe(true);

      expect(window.dataLayer).toBeDefined();
      expect(Array.isArray(window.dataLayer)).toBe(true);
      expect(typeof window.gtag).toBe('function');

      // dataLayerに 'js' と 'config' (send_page_view: false) が送信されたことを検証
      const calls = window.dataLayer as unknown[][];
      expect(calls.length).toBeGreaterThanOrEqual(2);

      // argumentsオブジェクトとして格納されているためArray.from等で検証
      const firstCallArgs = Array.from(calls[0] as unknown as IArguments);
      expect(firstCallArgs[0]).toBe('js');
      expect(firstCallArgs[1]).toBeInstanceOf(Date);

      const secondCallArgs = Array.from(calls[1] as unknown as IArguments);
      expect(secondCallArgs[0]).toBe('config');
      expect(secondCallArgs[1]).toBe(TEST_GA_ID);
      expect(secondCallArgs[2]).toEqual({ send_page_view: false });
    });

    it('複数回initAnalyticsを呼び出してもスクリプトタグが重複挿入されないこと', () => {
      initAnalytics(TEST_GA_ID);
      initAnalytics(TEST_GA_ID);

      const scripts = document.querySelectorAll('script[src*="googletagmanager"]');
      expect(scripts.length).toBe(1);
    });
  });

  describe('trackPageView', () => {
    it('GA_ID未設定時は何もしないこと', () => {
      trackPageView('note', '');
      expect(window.gtag).toBeUndefined();
    });

    it('trackPageView呼び出し時に未初期化なら自動初期化し、ページビューconfigを送信すること', () => {
      trackPageView('settings', TEST_GA_ID);

      expect(window.gtag).toBeDefined();
      const calls = window.dataLayer as unknown[][];

      // 初期化の2回(js, config) + ページビュー送信(config)の計3回
      expect(calls.length).toBe(3);

      const pageViewArgs = Array.from(calls[2] as unknown as IArguments);
      expect(pageViewArgs[0]).toBe('config');
      expect(pageViewArgs[1]).toBe(TEST_GA_ID);
      expect(pageViewArgs[2]).toEqual({
        page_path: '/settings',
        page_title: `設定 | ${appName}`,
      });
    });

    it('ビューを変更するたびに正しいpage_pathとpage_titleでconfigが送信されること', () => {
      trackPageView('note', TEST_GA_ID);
      trackPageView('about', TEST_GA_ID);

      const calls = window.dataLayer as unknown[][];
      // 初期化(2) + note(1) + about(1) = 4
      expect(calls.length).toBe(4);

      const noteCall = Array.from(calls[2] as unknown as IArguments);
      expect(noteCall[2]).toEqual({
        page_path: '/',
        page_title: `${appName} -ノート専用Misskeyクライアント`,
      });

      const aboutCall = Array.from(calls[3] as unknown as IArguments);
      expect(aboutCall[2]).toEqual({
        page_path: '/about',
        page_title: `Mizunaについて | ${appName}`,
      });
    });
  });
});
