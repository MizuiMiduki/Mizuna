import { mizuna_options } from '../config/mizunaOptions';
import { type AccountRecord } from '../db/database';
import { compressAndConvertToWebP } from '../utils/image';

export interface MiAuthCheckResponse {
  ok: boolean;
  token?: string;
  user?: {
    id: string;
    name: string | null;
    username: string;
    avatarUrl: string;
  };
}

export interface MisskeyUserResponse {
  id: string;
  name: string | null;
  username: string;
  avatarUrl: string;
}

export class MisskeyApiError extends Error {
  status?: number;
  code?: string;
  isAuthError: boolean;
  isNetworkError: boolean;

  constructor(
    message: string,
    options?: { status?: number; code?: string; isAuthError?: boolean; isNetworkError?: boolean }
  ) {
    super(message);
    this.name = 'MisskeyApiError';
    this.status = options?.status;
    this.code = options?.code;
    this.isAuthError = options?.isAuthError ?? false;
    this.isNetworkError = options?.isNetworkError ?? false;
  }
}

export interface NoteParam {
  i: string;
  text: string;
  visibility: 'public' | 'home' | 'followers';
  cw?: string;
  fileIds?: string[];
}

/**
 * サーバーサイド(PHP)を使わず、ブラウザから直接Misskeyサーバーの生存確認を行う
 * 1. Misskey API (/api/meta) にPOSTリクエストを送信 (CORS標準対応)
 * 2. 万が一 /api/meta がカスタム制限されているサーバーの場合は no-cors での疎通確認にフォールバック
 */
export async function checkServerExists(rawAddress: string): Promise<boolean> {
  const address = rawAddress.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (!address || address.includes(' ') || !address.includes('.')) {
    return false;
  }

  // 1. Misskey公式API (/api/meta) で確認
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const metaRes = await fetch(`https://${address}/api/meta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ detail: false }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (metaRes.ok) {
      return true;
    }
  } catch {
    // 次の疎通確認へフォールバック
  }

  // 2. HTTPS到達性チェック (mode: 'no-cors' はDNS解決・TLS接続成功時にopaqueレスポンスを返し、存在しないドメインではTypeErrorを投げる)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    await fetch(`https://${address}/`, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
    });
    clearTimeout(timer);
    return true;
  } catch {
    return false;
  }
}

/**
 * MiAuth認証ページへリダイレクトするURLを生成する
 */
export function buildMiAuthUrl(address: string, sessionId: string): string {
  const cleanAddress = address.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const callbackOrigin = `${location.protocol}//${location.host}`;
  return `https://${cleanAddress}/miauth/${sessionId}?name=${encodeURIComponent(
    mizuna_options.app_name
  )}&callback=${encodeURIComponent(callbackOrigin)}&permission=write:notes,read:account,write:drive`;
}

/**
 * MiAuthセッションからアカウント情報を取得する
 */
export async function checkMiAuthSession(
  address: string,
  sessionId: string
): Promise<MiAuthCheckResponse> {
  const cleanAddress = address.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const url = `https://${cleanAddress}/api/miauth/${encodeURIComponent(sessionId)}/check`;
  const res = await fetch(url, {
    method: 'POST',
  });
  if (!res.ok) {
    return { ok: false };
  }
  return (await res.json()) as MiAuthCheckResponse;
}

/**
 * 登録済みアカウントの最新プロフィール情報をサーバーから取得する
 * - 10秒のタイムアウト付き
 * - 認証失効(401/403/AUTHENTICATION_FAILED)やネットワーク断・サーバー停止を詳細に判定
 */
export async function fetchLatestAccountInfo(
  account: AccountRecord,
  timeoutMs = 10000
): Promise<MisskeyUserResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const cleanAddress = account.address.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const url = `https://${cleanAddress}/api/i`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ i: account.token }),
      signal: controller.signal,
    });

    if (!res.ok) {
      let code: string | undefined;
      let errorMsg = `HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson?.error) {
          code = errJson.error.code;
          errorMsg = errJson.error.message || code || errorMsg;
        }
      } catch {
        // レスポンスがJSONでない場合はステータスコードを使用
      }

      const isAuth =
        res.status === 401 ||
        res.status === 403 ||
        code === 'AUTHENTICATION_FAILED' ||
        code === 'INVALID_PARAM';

      throw new MisskeyApiError(errorMsg, {
        status: res.status,
        code,
        isAuthError: isAuth,
      });
    }

    const data = (await res.json()) as MisskeyUserResponse;
    if (!data || typeof data !== 'object' || !data.username) {
      throw new MisskeyApiError('不正なユーザー情報レスポンスを受信しました');
    }
    return data;
  } catch (err: any) {
    if (err instanceof MisskeyApiError) {
      throw err;
    }
    if (err?.name === 'AbortError') {
      throw new MisskeyApiError('通信がタイムアウトしました（サーバー無応答）', {
        isNetworkError: true,
      });
    }
    throw new MisskeyApiError(err?.message || 'サーバーに接続できませんでした', {
      isNetworkError: true,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 画像をWebP圧縮してMisskeyドライブへアップロードする
 */
export async function uploadImagesToDrive(
  files: File[],
  account: AccountRecord,
  onStatusChange?: (statusText: string) => void
): Promise<string[]> {
  onStatusChange?.('画像圧縮中...');
  const compressedFiles = await Promise.all(
    files.map((file) =>
      file.type === 'image/webp' ? Promise.resolve(file) : compressAndConvertToWebP(file, 0.75)
    )
  );

  onStatusChange?.(`画像アップロード中 (0/${compressedFiles.length})...`);
  const fileIds: string[] = new Array(compressedFiles.length);
  let completedCount = 0;

  await Promise.all(
    compressedFiles.map(async (file, index) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('i', account.token);

      const res = await fetch(`https://${account.address}/api/drive/files/create`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`画像のアップロードに失敗しました: ${file.name}`);
      }

      const data = await res.json();
      fileIds[index] = data.id;
      completedCount++;
      onStatusChange?.(`画像アップロード中 (${completedCount}/${compressedFiles.length})...`);
    })
  );

  return fileIds;
}

/**
 * ノートを送信する
 */
export async function createMisskeyNote(
  account: AccountRecord,
  noteContent: string,
  cwContent: string | null,
  visibility: 'public' | 'home' | 'followers',
  appendFromMizuna: boolean,
  fileIds?: string[]
): Promise<void> {
  const suffix = appendFromMizuna ? '\n(from Mizuna)' : '';
  const param: NoteParam = {
    i: account.token,
    text: noteContent + suffix,
    visibility,
  };

  if (cwContent && cwContent.length > 0) {
    param.cw = cwContent;
  }

  if (fileIds && fileIds.length > 0) {
    param.fileIds = fileIds;
  }

  const res = await fetch(`https://${account.address}/api/notes/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(param),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
}

/**
 * 最新のリリースノート記事情報を RSS フィードから取得する
 * 対象 RSS: https://blossomsarchive.com/blog/category/mizuna/feed/
 * (万が一の CORS 制約時は WordPress REST API に自動フォールバック)
 */
export async function fetchLatestReleaseNote(): Promise<{ title: string; link: string } | null> {
  const rssUrl = 'https://blossomsarchive.com/blog/category/mizuna/feed/';

  // 1. RSS フィードからの取得
  try {
    const res = await fetch(rssUrl);
    if (res.ok) {
      const xmlText = await res.text();

      // DOMParser による抽出
      if (typeof DOMParser !== 'undefined') {
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, 'text/xml');
        const item = xml.querySelector('item');
        if (item) {
          const title = item.querySelector('title')?.textContent?.trim();
          const link = item.querySelector('link')?.textContent?.trim();
          if (link) {
            return {
              title: title || `Mizuna v${mizuna_options.mizuna_version}`,
              link,
            };
          }
        }
      }

      // 正規表現による抽出（CDATA対応・フォールバック）
      const itemMatch = xmlText.match(/<item[\s\S]*?<\/item>/i);
      if (itemMatch) {
        const itemContent = itemMatch[0];
        const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/i);
        const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/i);
        if (linkMatch && linkMatch[1]) {
          const cleanLink = linkMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim();
          const cleanTitle = titleMatch && titleMatch[1]
            ? titleMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim()
            : `Mizuna v${mizuna_options.mizuna_version}`;
          return { title: cleanTitle, link: cleanLink };
        }
      }
    }
  } catch (err) {
    console.warn('[ReleaseNote] RSS直接取得失敗、WordPress REST APIへフォールバック:', err);
  }

  // 2. ブラウザ CORS 等による制限時のフォールバック (CORSヘッダー付きの WP REST API)
  try {
    const apiUrl = 'https://blossomsarchive.com/wp-json/wp/v2/posts?categories=162&per_page=1';
    const res = await fetch(apiUrl);
    if (res.ok) {
      const data = await res.json();
      const latestPost = data?.[0];
      if (latestPost && latestPost.link) {
        return {
          title: latestPost.title?.rendered ?? `Mizuna v${mizuna_options.mizuna_version}`,
          link: latestPost.link,
        };
      }
    }
  } catch (apiErr) {
    console.error('[ReleaseNote] REST APIフォールバック失敗:', apiErr);
  }

  // 3. 最終フォールバック (カテゴリ一覧URL)
  return {
    title: `Mizuna v${mizuna_options.mizuna_version} リリースノート`,
    link: 'https://blossomsarchive.com/blog/category/mizuna/',
  };
}
