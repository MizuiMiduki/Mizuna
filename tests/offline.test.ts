import { describe, it, expect } from 'vitest';

// @ts-ignore
import * as fs from 'fs';
// @ts-ignore
import * as path from 'path';

// @ts-ignore
declare const process: any;

describe('PWA Offline Screen, Cache & Update Management', () => {
  const rootDir = process.cwd();
  const offlineHtmlPath = path.resolve(rootDir, 'public/offline.html');
  const swJsPath = path.resolve(rootDir, 'public/sw.js');
  const indexHtmlPath = path.resolve(rootDir, 'index.html');
  const appStorePath = path.resolve(rootDir, 'src/store/appStore.tsx');
  const settingsViewPath = path.resolve(rootDir, 'src/components/SettingsView.tsx');
  const aboutViewPath = path.resolve(rootDir, 'src/components/AboutView.tsx');
  const headerPath = path.resolve(rootDir, 'src/components/Header.tsx');

  it('offline.html が存在し、必要なメタタグおよび要素が含まれていること', () => {
    expect(fs.existsSync(offlineHtmlPath)).toBe(true);
    const content = fs.readFileSync(offlineHtmlPath, 'utf-8');

    // 基本タグ
    expect(content).toContain('<!DOCTYPE html>');
    expect(content).toContain('<meta content="width=device-width, initial-scale=1.0" name="viewport">');
    expect(content).toContain('<title>オフライン | Mizuna</title>');

    // オフライン案内要素
    expect(content).toContain('id="status-pill"');
    expect(content).toContain('OFFLINE');
    expect(content).toContain('インターネットに接続されていません');
    expect(content).toContain('mizuna-hint-box');
    expect(content).toContain('再接続を試す');

    // アイコンおよびスタイル
    expect(content).toContain('src="/icon.png"');
    expect(content).toContain('--offline-color');
    expect(content).toContain('--surface');

    // オンライン復帰・リロードスクリプト
    expect(content).toContain("window.addEventListener('online'");
    expect(content).toContain('location.reload()');
  });

  it('offline.html が Canary 環境のホスト名に対応していること', () => {
    const content = fs.readFileSync(offlineHtmlPath, 'utf-8');
    expect(content).toContain('canary');
    expect(content).toContain('Mizuna Canary');
  });

  it('sw.js が存在し、キャッシュ機能とユーザー制御によるアップデート適用をサポートしていること', () => {
    expect(fs.existsSync(swJsPath)).toBe(true);
    const content = fs.readFileSync(swJsPath, 'utf-8');

    // コアアセットのキャッシュ
    expect(content).toContain('CACHE_NAME');
    expect(content).toContain("'/index.html'");
    expect(content).toContain("'/offline.html'");
    expect(content).toContain("'/icon.png'");

    // キャッシュ名のバージョンが package.json のバージョンと常に同期していること（更新忘れ防止）
    const pkg = JSON.parse(fs.readFileSync(path.resolve(rootDir, 'package.json'), 'utf-8'));
    expect(content).toContain(`const CACHE_NAME = 'mizuna-cache-v${pkg.version}';`);

    // 自動での skipWaiting は呼ばない（ユーザーが選択するまで待機状態を維持）
    const installBlock = content.match(/addEventListener\(\s*['"]install['"][\s\S]*?\n\}\);/)?.[0] || '';
    expect(installBlock).not.toContain('self.skipWaiting()');

    // SKIP_WAITING メッセージを受信した時のみ skipWaiting を呼ぶ
    expect(content).toContain("event.data.type === 'SKIP_WAITING'");
    expect(content).toContain('self.skipWaiting()');

    // GET_VERSION メッセージでバージョンを応答すること
    expect(content).toContain("event.data.type === 'GET_VERSION'");
    expect(content).toContain('SW_VERSION');

    // /version.json は最新バージョン確認用のためキャッシュせずネットワーク直通であること
    expect(content).toContain("url.pathname === '/version.json'");

    // キャッシュ戦略 (request.mode === 'navigate') で Cache First（通信量削減）となっていること
    expect(content).toContain("mode === 'navigate'");
    expect(content).toContain("await cache.match('/index.html')");
    expect(content).toContain('url.origin !== self.location.origin'); // 外部APIはキャッシュしない
  });

  it('public/version.json が存在し、package.json のバージョンと同期していること', () => {
    const versionJsonPath = path.resolve(rootDir, 'public/version.json');
    expect(fs.existsSync(versionJsonPath)).toBe(true);
    const data = JSON.parse(fs.readFileSync(versionJsonPath, 'utf-8'));
    const pkg = JSON.parse(fs.readFileSync(path.resolve(rootDir, 'package.json'), 'utf-8'));
    expect(data.version).toBe(pkg.version);
  });

  it('vite.config.ts に Service Worker のバージョン自動同期プラグインが設定されていること', () => {
    const viteConfigContent = fs.readFileSync(path.resolve(rootDir, 'vite.config.ts'), 'utf-8');
    expect(viteConfigContent).toContain('syncSwVersionPlugin');
    expect(viteConfigContent).toContain('mizuna-sync-sw-version');
    expect(viteConfigContent).toContain('mizuna-cache-v');
  });

  it('Service Worker の登録・管理が appStore で一元化され、勝手な更新ダウンロードが抑止されていること', () => {
    const appStoreContent = fs.readFileSync(appStorePath, 'utf-8');
    expect(appStoreContent).toContain("'serviceWorker' in navigator");
    expect(appStoreContent).toContain('navigator.serviceWorker.getRegistration');
    expect(appStoreContent).toContain("register?.('/sw.js'");
    expect(appStoreContent).toContain("updateViaCache: 'all'");

    // index.html から無条件の自動登録スクリプトが排除されていること
    const indexContent = fs.readFileSync(indexHtmlPath, 'utf-8');
    expect(indexContent).not.toContain("navigator.serviceWorker.register('/sw.js')");
  });

  it('appStore に PWA アップデート制御およびリリースノート自動表示機能が実装されていること', () => {
    expect(fs.existsSync(appStorePath)).toBe(true);
    const content = fs.readFileSync(appStorePath, 'utf-8');

    expect(content).toContain('hasPendingUpdate');
    expect(content).toContain('checkVersionOnServer');
    expect(content).toContain('showUpdateBanner');
    expect(content).toContain('dismissUpdateBanner');
    expect(content).toContain('applyPendingUpdate');
    expect(content).toContain("updateViaCache: 'none'");
    expect(content).toContain('window.caches.delete');
    expect(content).toContain('checkForUpdate');
    expect(content).toContain('mizuna_show_release_notes_after_update');
    expect(content).toContain("type: 'SKIP_WAITING'");
    expect(content).toContain("type: 'GET_VERSION'");
    expect(content).toContain('queryWorkerVersion');
    expect(content).toContain("navigator.serviceWorker.addEventListener?.('controllerchange'");
  });

  it('Header に控えめなアップデートバナーが実装されていること', () => {
    expect(fs.existsSync(headerPath)).toBe(true);
    const content = fs.readFileSync(headerPath, 'utf-8');

    expect(content).toContain('hasPendingUpdate() && showUpdateBanner()');
    expect(content).toContain('mizuna-update-card');
    expect(content).toMatch(/(今すぐ更新|update\.apply_now)/);
  });

  it('AboutView に最新バージョンの確認ボタンが実装されていること', () => {
    expect(fs.existsSync(aboutViewPath)).toBe(true);
    const content = fs.readFileSync(aboutViewPath, 'utf-8');

    expect(content).toContain('checkForUpdate');
    expect(content).toContain('check_update_button');
    expect(content).toContain('applyPendingUpdate');
  });

  it('SettingsView に待機中アップデートの適用UIが実装されていること', () => {
    expect(fs.existsSync(settingsViewPath)).toBe(true);
    const content = fs.readFileSync(settingsViewPath, 'utf-8');

    expect(content).toContain('hasPendingUpdate');
    expect(content).toContain('applyPendingUpdate');
  });
});
