import { describe, it, expect } from 'vitest';
import packageJson from '../package.json';
import manifestJson from '../public/manifest.json';
import manifestCanaryJson from '../public/manifest-canary.json';
import versionJson from '../public/version.json';
import swContent from '../public/sw.js?raw';

describe('PWA & Service Worker 整合性テスト', () => {
  describe('Service Worker バージョンと設定の整合性', () => {
    it('sw.js が存在し読み込めること', () => {
      expect(swContent).toBeTruthy();
    });

    it('sw.js の SW_VERSION および CACHE_NAME が package.json の version と一致していること', () => {
      const expectedVersion = packageJson.version;

      expect(swContent).toContain(`const SW_VERSION = '${expectedVersion}';`);
      expect(swContent).toContain(`const CACHE_NAME = 'mizuna-cache-v${expectedVersion}';`);
    });

    it('public/version.json の version が package.json の version と一致していること', () => {
      expect(versionJson.version).toBe(packageJson.version);
    });

    it('事前キャッシュ対象の PRECACHE_ASSETS に必要なアセットが定義されていること', () => {
      // PRECACHE_ASSETS 配列の抽出
      const match = swContent.match(/const PRECACHE_ASSETS = \[([\s\S]*?)\];/);
      expect(match).not.toBeNull();

      const assetsBlock = match![1];
      expect(assetsBlock).toContain("'/index.html'");
      expect(assetsBlock).toContain("'/manifest.json'");
      expect(assetsBlock).toContain("'/manifest-canary.json'");
      expect(assetsBlock).toContain("'/icon.png'");
      expect(assetsBlock).toContain("OFFLINE_URL");
    });
  });

  describe('Web App Manifest (PWA) の仕様検証', () => {
    it('manifest.json が PWA の必須プロパティ（name, start_url, display: standalone, icons）を満たしていること', () => {
      expect(manifestJson.name).toContain('Mizuna');
      expect(manifestJson.short_name).toBe('Mizuna');
      expect(manifestJson.start_url).toBeDefined();
      expect(manifestJson.display).toBe('standalone');
      expect(Array.isArray(manifestJson.icons)).toBe(true);
      expect(manifestJson.icons.length).toBeGreaterThan(0);
    });

    it('manifest-canary.json が Canary 版として正しく構成されていること', () => {
      expect(manifestCanaryJson.name).toContain('Canary');
      expect(manifestCanaryJson.start_url).toBeDefined();
      expect(manifestCanaryJson.display).toBe('standalone');
      expect(Array.isArray(manifestCanaryJson.icons)).toBe(true);
    });
  });

  describe('Service Worker のキャッシュ・オフライン保護戦略', () => {
    it('sw.js に外部オリジン通信をキャッシュ汚染させないガードが含まれていること', () => {
      // Misskey API や外部アセットがキャッシュに入り込まないようオリジンチェックがあること
      expect(swContent).toContain('url.origin !== self.location.origin');
      // POST等の変更リクエストがキャッシュされないこと
      expect(swContent).toContain("request.method !== 'GET'");
    });

    it('sw.js にバージョン取得（GET_VERSION）およびアップデート（SKIP_WAITING）のメッセージハンドラが存在すること', () => {
      expect(swContent).toContain("event.data.type === 'GET_VERSION'");
      expect(swContent).toContain("event.data.type === 'SKIP_WAITING'");
      expect(swContent).toContain("event.data.type === 'CLEAR_CACHE'");
    });
  });
});
