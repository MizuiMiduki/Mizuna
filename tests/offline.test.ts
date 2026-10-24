import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('PWA Offline Screen & Service Worker', () => {
  const offlineHtmlPath = path.resolve(__dirname, '../public/offline.html');
  const swJsPath = path.resolve(__dirname, '../public/sw.js');
  const indexHtmlPath = path.resolve(__dirname, '../index.html');

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

  it('sw.js が存在し、オフラインキャッシュとナビゲーションフォールバックが設定されていること', () => {
    expect(fs.existsSync(swJsPath)).toBe(true);
    const content = fs.readFileSync(swJsPath, 'utf-8');

    // キャッシュ名およびキャッシュ対象
    expect(content).toContain("const CACHE_NAME = 'mizuna-offline-v1'");
    expect(content).toContain("'/offline.html'");
    expect(content).toContain("'/icon.png'");

    // Service Worker ライフサイクルイベント
    expect(content).toContain("self.addEventListener('install'");
    expect(content).toContain("self.addEventListener('activate'");
    expect(content).toContain("self.addEventListener('fetch'");

    // ナビゲーションフォールバック処理
    expect(content).toContain("event.request.mode === 'navigate'");
  });

  it('index.html に Service Worker 登録スクリプトが含まれていること', () => {
    const content = fs.readFileSync(indexHtmlPath, 'utf-8');
    expect(content).toContain("'serviceWorker' in navigator");
    expect(content).toContain("navigator.serviceWorker.register('/sw.js')");
  });
});
