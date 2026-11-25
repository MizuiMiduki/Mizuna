#!/usr/bin/env node

/**
 * IndexNow URL Submission Script
 *
 * IndexNow (Bing, Yandex 等) に対して、サイトのルートURLの更新を通知します。
 * 仕様: https://www.indexnow.org/documentation
 */

const fs = require('fs');
const path = require('path');

const HOST = process.env.INDEXNOW_HOST || 'mizuna.blossomsarchive.com';
const DEFAULT_KEY = 'fbd88a4fc2080a1837f34ca9fc61a9d8';

const key = process.env.INDEXNOW_KEY || DEFAULT_KEY;
const keyFilePath = path.join(__dirname, '..', 'public', `${key}.txt`);

if (!fs.existsSync(keyFilePath)) {
  console.warn(`[IndexNow] ⚠️ キー確認ファイルが見つかりません: ${keyFilePath}`);
}

const keyLocation = `https://${HOST}/${key}.txt`;
const urlList = [
  `https://${HOST}/`,
];

async function submitIndexNow() {
  console.log('==========================================================');
  console.log('🚀 IndexNow URL 送信');
  console.log(`Host:        ${HOST}`);
  console.log(`Key:         ${key}`);
  console.log(`KeyLocation: ${keyLocation}`);
  console.log(`URLs:        ${urlList.join(', ')}`);
  console.log('==========================================================');

  const payload = {
    host: HOST,
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
