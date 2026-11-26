#!/usr/bin/env node

/**
 * IndexNow URL Submission Script
 *
 * 本番環境リリース時のみ、IndexNow (Bing, Yandex 等) に対してルートURLの更新を通知します。
 * Canary環境・テスト環境・ローカル開発環境での誤送信を完全に防止するガードを備えています。
 * 仕様: https://www.indexnow.org/documentation
 */

const fs = require('fs');
const path = require('path');

const deployTarget = process.env.DEPLOY_TARGET;
const nodeEnv = process.env.NODE_ENV;
const isForce = process.argv.includes('--force') || process.env.INDEXNOW_FORCE === 'true';

// 本番環境リリース (DEPLOY_TARGET === 'release' かつ NODE_ENV === 'production') または明示的な強制フラグ時のみ許可
const isProduction = (deployTarget === 'release' && nodeEnv === 'production') || isForce;

const host = (process.env.INDEXNOW_HOST || 'mizuna.blossomsarchive.com').trim().toLowerCase();
const isNonProdHost =
  host.includes('canary') ||
  host.includes('test') ||
  host.includes('dev') ||
  host.includes('localhost') ||
  host.includes('127.0.0.1');

if (!isProduction || isNonProdHost) {
  console.log('==========================================================');
  console.log('ℹ️ [IndexNow] 本番環境（Production Release）ではないため、IndexNow への送信をスキップしました。');
  console.log(`- deploy_target: ${deployTarget || '(not set)'}`);
  console.log(`- NODE_ENV:      ${nodeEnv || '(not set)'}`);
  console.log(`- host:          ${host}`);
  console.log('※ 本番環境へのデプロイ時（release）のみ自動送信されます。');
  console.log('  手動で送信を強制する場合は --force オプションを付与してください。');
  console.log('==========================================================');
  process.exit(0);
}

const DEFAULT_KEY = 'fbd88a4fc2080a1837f34ca9fc61a9d8';
const key = process.env.INDEXNOW_KEY || DEFAULT_KEY;
const keyFilePath = path.join(__dirname, '..', 'public', `${key}.txt`);

if (!fs.existsSync(keyFilePath)) {
  console.warn(`[IndexNow] ⚠️ キー確認ファイルが見つかりません: ${keyFilePath}`);
}

const keyLocation = `https://${host}/${key}.txt`;
const urlList = [
  `https://${host}/`,
];

async function submitIndexNow() {
  console.log('==========================================================');
  console.log('🚀 IndexNow URL 送信（本番環境）');
  console.log(`Host:        ${host}`);
  console.log(`Key:         ${key}`);
  console.log(`KeyLocation: ${keyLocation}`);
  console.log(`URLs:        ${urlList.join(', ')}`);
  console.log('==========================================================');

  const payload = {
    host: host,
    key: key,
    keyLocation: keyLocation,
    urlList: urlList,
  };

  const endpoint = 'https://api.indexnow.org/indexnow';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'Mizuna-IndexNow/1.0',
      },
      body: JSON.stringify(payload),
    });

    const status = response.status;
    const text = await response.text();

    if (status === 200 || status === 202) {
      console.log(`✅ IndexNow 送信成功 (HTTP ${status})`);
      if (text) console.log(`Response: ${text}`);
    } else {
      console.warn(`⚠️ IndexNow 送信ステータス: HTTP ${status}`);
      if (text) console.warn(`Response: ${text}`);
      if (status === 403) {
        console.warn('ℹ️ キー確認ファイルがまだ公開サーバー上に反映されていないか検証中です。');
      }
    }
  } catch (err) {
    console.error('❌ IndexNow 送信中にエラーが発生しました:', err.message || err);
  }
}

submitIndexNow();
