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
  replyId?: string;
}

export interface MisskeyCustomEmoji {
  name: string;
  url: string;
  host?: string | null;
  aliases?: string[];
}

export interface MisskeyNoteUser {
  id: string;
  name: string | null;
  username: string;
  avatarUrl: string;
  emojis?: MisskeyCustomEmoji[] | Record<string, string>;
  instance?: {
    name?: string;
    faviconUrl?: string;
  };
}

export interface MisskeyFile {
  id: string;
  url: string;
  thumbnailUrl?: string;
  name: string;
  type: string;
  size?: number;
  createdAt?: string;
  isSensitive?: boolean;
}

export interface MisskeyNote {
  id: string;
  createdAt: string;
  text: string | null;
  cw: string | null;
  userId: string;
  user: MisskeyNoteUser;
  replyId?: string | null;
  reply?: MisskeyNote | null;
  renoteId?: string | null;
  renote?: MisskeyNote | null;
  visibility: 'public' | 'home' | 'followers' | 'specified';
  files?: MisskeyFile[];
  repliesCount?: number;
  renoteCount?: number;
  reactions?: Record<string, number>;
  reactionEmojis?: Record<string, string>;
  emojis?: MisskeyCustomEmoji[] | Record<string, string>;
}

// ユーザーIDのインメモリキャッシュ (token -> userId)
const userIdCache = new Map<string, string>();

// サーバーカスタム絵文字のインメモリキャッシュ (address -> Map<emojiName, emojiUrl>)
const serverEmojiCache = new Map<string, Map<string, string>>();

/**
 * インスタンスのカスタム絵文字一覧 (/api/emojis) を取得し、絵文字名からURLへのマップを返す
 */
export async function fetchServerEmojis(rawAddress: string): Promise<Map<string, string>> {
  const address = rawAddress.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (!address || address.includes(' ') || !address.includes('.')) {
    return new Map();
  }

  const cached = serverEmojiCache.get(address);
  if (cached) {
    return cached;
  }

  try {
    const res = await fetch(`https://${address}/api/emojis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    let data: any;
    if (res.ok) {
      data = await res.json();
    } else {
      const getRes = await fetch(`https://${address}/api/emojis`);
      if (getRes.ok) {
        data = await getRes.json();
      }
    }

    if (data) {
      const map = new Map<string, string>();
      const list: MisskeyCustomEmoji[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.emojis)
        ? data.emojis
        : [];

      for (const item of list) {
        if (item && item.name && item.url) {
          const lower = item.name.toLowerCase();
          map.set(lower, item.url);
          map.set(`${lower}@.`, item.url);
          if (item.aliases && Array.isArray(item.aliases)) {
            for (const alias of item.aliases) {
              if (alias) {
                const lowerAlias = alias.toLowerCase();
                map.set(lowerAlias, item.url);
                map.set(`${lowerAlias}@.`, item.url);
              }
            }
          }
        }
      }

      serverEmojiCache.set(address, map);
      return map;
    }
  } catch (err) {
    console.warn(`Failed to fetch custom emojis from ${address}:`, err);
  }

  return new Map();
}

export function clearServerEmojiCache(): void {
  serverEmojiCache.clear();
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
  const appNameWithVersion = `${mizuna_options.app_name} v${mizuna_options.mizuna_version}`;
  return `https://${cleanAddress}/miauth/${sessionId}?name=${encodeURIComponent(
    appNameWithVersion
  )}&callback=${encodeURIComponent(callbackOrigin)}&permission=write:notes,read:account,write:drive,read:drive,read:notes,read:notifications`;
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
 * ノートを送信する (リプライ対応・作成されたノートオブジェクトを返す)
 */
export async function createMisskeyNote(
  account: AccountRecord,
  noteContent: string,
  cwContent: string | null,
  visibility: 'public' | 'home' | 'followers',
  appendFromMizuna: boolean,
  fileIds?: string[],
  replyId?: string,
  extra?: {
    replyNote?: MisskeyNote | null;
    files?: MisskeyFile[];
  }
): Promise<MisskeyNote> {
  const suffix = appendFromMizuna ? '\n(from Mizuna)' : '';
  const finalText = noteContent + suffix;
  const param: NoteParam = {
    i: account.token,
    text: finalText,
    visibility,
  };

  if (cwContent && cwContent.length > 0) {
    param.cw = cwContent;
  }

  if (fileIds && fileIds.length > 0) {
    param.fileIds = fileIds;
  }

  if (replyId && replyId.length > 0) {
    param.replyId = replyId;
  }

  const res = await fetch(`https://${account.address}/api/notes/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(param),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // JSON でない場合はフォールバック
  }

  const rawCreated = data?.createdNote ?? data ?? {};
  const createdNote: MisskeyNote = {
    id: rawCreated.id || `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: rawCreated.createdAt || new Date().toISOString(),
    text: rawCreated.text !== undefined ? rawCreated.text : finalText,
    cw:
      rawCreated.cw !== undefined
        ? rawCreated.cw
        : cwContent && cwContent.length > 0
        ? cwContent
        : null,
    userId: rawCreated.userId || String(account.id ?? account.username),
    user: rawCreated.user?.username
      ? rawCreated.user
      : {
          id: String(account.id ?? account.username),
          name: account.name || account.username,
          username: account.username,
          avatarUrl: account.avatarurl,
        },
    visibility: rawCreated.visibility || visibility,
    replyId: rawCreated.replyId !== undefined ? rawCreated.replyId : replyId || null,
    reply: rawCreated.reply !== undefined ? rawCreated.reply : extra?.replyNote ?? null,
    files:
      Array.isArray(rawCreated.files) && rawCreated.files.length > 0
        ? rawCreated.files
        : extra?.files ?? [],
    repliesCount: rawCreated.repliesCount ?? 0,
    emojis: rawCreated.emojis,
  };

  return createdNote;
}

/**
 * 自身のMisskeyアカウントIDを取得（キャッシュ対応）
 */
export async function fetchMyUserId(account: AccountRecord): Promise<string> {
  const cacheKey = `${account.address}:${account.token}`;
  const cached = userIdCache.get(cacheKey);
  if (cached) return cached;

  const res = await fetch(`https://${account.address}/api/i`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ i: account.token }),
  });

  if (!res.ok) {
    throw new MisskeyApiError(`ユーザー情報の取得に失敗しました (HTTP ${res.status})`, {
      status: res.status,
      isAuthError: res.status === 401 || res.status === 403,
    });
  }

  const data = await res.json();
  if (!data?.id) {
    throw new Error('ユーザーIDが見つかりませんでした');
  }

  userIdCache.set(cacheKey, data.id);
  return data.id;
}

/**
 * 自分の投稿履歴を取得する (Issue #129)
 * 直近10件ずつ取得しページネーション可能
 */
export async function fetchUserNotes(
  account: AccountRecord,
  options?: { untilId?: string; sinceId?: string; limit?: number }
): Promise<MisskeyNote[]> {
  const userId = await fetchMyUserId(account);
  const limit = options?.limit ?? 10;

  const payload: Record<string, unknown> = {
    i: account.token,
    userId,
    limit,
    includeReplies: true,
    includeMyRenotes: false,
  };

  if (options?.untilId) payload.untilId = options.untilId;
  if (options?.sinceId) payload.sinceId = options.sinceId;

  const res = await fetch(`https://${account.address}/api/users/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new MisskeyApiError(`投稿履歴の取得に失敗しました (HTTP ${res.status})`, {
      status: res.status,
    });
  }

  const notes: MisskeyNote[] = await res.json();
  return Array.isArray(notes) ? notes : [];
}

/**
 * 特定のノートに付いたリプライ一覧を取得する (Issue #130)
 */
export async function fetchNoteChildren(
  account: AccountRecord,
  noteId: string,
  options?: { untilId?: string; limit?: number }
): Promise<MisskeyNote[]> {
  const payload: Record<string, unknown> = {
    i: account.token,
    noteId,
    limit: options?.limit ?? 10,
  };
  if (options?.untilId) payload.untilId = options.untilId;

  const res = await fetch(`https://${account.address}/api/notes/children`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new MisskeyApiError(`リプライ一覧の取得に失敗しました (HTTP ${res.status})`, {
      status: res.status,
    });
  }

  const children: MisskeyNote[] = await res.json();
  return Array.isArray(children) ? children : [];
}

/**
 * 自分宛てのリプライ/メンション一覧を取得する (Issue #130)
 */
export async function fetchUserMentions(
  account: AccountRecord,
  options?: { untilId?: string; limit?: number }
): Promise<MisskeyNote[]> {
  const payload: Record<string, unknown> = {
    i: account.token,
    limit: options?.limit ?? 10,
  };
  if (options?.untilId) payload.untilId = options.untilId;

  const res = await fetch(`https://${account.address}/api/notes/mentions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new MisskeyApiError(`メンション一覧の取得に失敗しました (HTTP ${res.status})`, {
      status: res.status,
    });
  }

  const mentions: MisskeyNote[] = await res.json();
  return Array.isArray(mentions) ? mentions : [];
}

/**
 * 自分の投稿（ノート）を削除する
 */
export async function deleteMisskeyNote(
  account: AccountRecord,
  noteId: string
): Promise<void> {
  const res = await fetch(`https://${account.address}/api/notes/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      i: account.token,
      noteId,
    }),
  });

  if (!res.ok) {
    throw new MisskeyApiError(`投稿の削除に失敗しました (HTTP ${res.status})`, {
      status: res.status,
      isAuthError: res.status === 401 || res.status === 403,
    });
  }
}

/**
 * Misskeyドライブにアップロード済みの画像一覧を取得する
 * - 第一優先: `/api/drive/files` (read:drive 権限がある場合)
 * - フォールバック: `read:drive` 未付与の既存アカウントでも利用できるよう `/api/users/notes` (withFiles: true) から添付済み画像を抽出
 */
export async function fetchDriveImages(
  account: AccountRecord,
  options?: { untilId?: string; limit?: number }
): Promise<MisskeyFile[]> {
  const limit = options?.limit ?? 24;
  const payload: Record<string, unknown> = {
    i: account.token,
    limit,
    type: 'image/*',
  };
  if (options?.untilId) {
    payload.untilId = options.untilId;
  }

  try {
    const res = await fetch(`https://${account.address}/api/drive/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const files: MisskeyFile[] = await res.json();
      if (Array.isArray(files)) {
        return files.filter((f) => f && f.id && f.url && (!f.type || f.type.startsWith('image/')));
      }
    }
  } catch {
    // フォールバックへ進む
  }

  // フォールバック: 自分の画像付き投稿からアップロード済みファイル一覧を抽出
  const userId = await fetchMyUserId(account);
  const notesPayload: Record<string, unknown> = {
    i: account.token,
    userId,
    limit: 30,
    withFiles: true,
    includeMyRenotes: false,
  };
  if (options?.untilId) {
    notesPayload.untilId = options.untilId;
  }

  const notesRes = await fetch(`https://${account.address}/api/users/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notesPayload),
  });

  if (!notesRes.ok) {
    throw new MisskeyApiError(`アップロード済み画像の取得に失敗しました (HTTP ${notesRes.status})`, {
      status: notesRes.status,
    });
  }

  const notes: MisskeyNote[] = await notesRes.json();
  if (!Array.isArray(notes)) return [];

  const seenIds = new Set<string>();
  const collected: MisskeyFile[] = [];
  for (const note of notes) {
    if (Array.isArray(note.files)) {
      for (const file of note.files) {
        if (file && file.id && file.url && (!file.type || file.type.startsWith('image/')) && !seenIds.has(file.id)) {
          seenIds.add(file.id);
          collected.push(file);
        }
      }
    }
  }
  return collected;
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

export interface AnnouncementItem {
  id: string | number;
  title: string;
  link: string;
  date: string;
  snippet?: string;
}

export interface AnnouncementsResult {
  items: AnnouncementItem[];
  totalPages: number;
  totalItems: number;
  currentPage: number;
}

export function formatAnnouncementDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${y}年${m}月${day}日`;
  } catch {
    return dateStr;
  }
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8216;/g, '‘')
    .replace(/&#8217;/g, '’')
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”')
    .replace(/&#8230;|&hellip;/g, '…')
    .replace(/&#160;|&nbsp;/g, ' ')
    .replace(/&amp;/g, '&'); // &amp; は二重展開を防ぐため最後にデコード
}

function stripHtmlTags(input: string): string {
  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(input, 'text/html');
      return doc.body.textContent || '';
    } catch {
      // フォールバック
    }
  }
  let sanitized = input;
  let prev = '';
  do {
    prev = sanitized;
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  } while (sanitized !== prev);
  return sanitized;
}

export async function fetchAnnouncements(page = 1, perPage = 10): Promise<AnnouncementsResult> {
  // 1. まず CORS サポートがある WordPress REST API を優先試行
  try {
    const apiUrl = `https://blossomsarchive.com/wp-json/wp/v2/posts?categories=162&per_page=${perPage}&page=${page}`;
    const res = await fetch(apiUrl);
    if (res.ok) {
      const totalPages = parseInt(res.headers.get('x-wp-totalpages') || '1', 10);
      const totalItems = parseInt(res.headers.get('x-wp-total') || '0', 10);
      const data = await res.json();
      const items: AnnouncementItem[] = data.map((post: any) => ({
        id: post.id,
        title: post.title?.rendered ? decodeHtmlEntities(post.title.rendered) : '無題',
        link: post.link,
        date: post.date,
        snippet: post.excerpt?.rendered
          ? decodeHtmlEntities(stripHtmlTags(post.excerpt.rendered)).trim()
          : undefined,
      }));
      return {
        items,
        totalPages: Math.max(1, totalPages),
        totalItems,
        currentPage: page,
      };
    }
  } catch (err) {
    console.warn('[Announcements] WordPress REST API 取得失敗、RSS フィードへフォールバック:', err);
  }

  // 2. RSS フィードからの取得（フォールバック）
  try {
    const rssUrl =
      page === 1
        ? 'https://blossomsarchive.com/blog/category/mizuna/feed/'
        : `https://blossomsarchive.com/blog/category/mizuna/feed/?paged=${page}`;
    const res = await fetch(rssUrl);
    if (res.ok) {
      const xmlText = await res.text();
      const itemMatches = xmlText.match(/<item[\s\S]*?<\/item>/gi) || [];
      const clean = (s: string) => decodeHtmlEntities(s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim());

      const items: AnnouncementItem[] = itemMatches.map((itemXml, idx) => {
        const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
        const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i);
        const dateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
        const descMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/i);
        return {
          id: `rss_${page}_${idx}`,
          title: clean(titleMatch ? titleMatch[1] : `お知らせ (${idx + 1})`),
          link: clean(linkMatch ? linkMatch[1] : 'https://blossomsarchive.com/blog/category/mizuna/'),
          date: clean(dateMatch ? dateMatch[1] : ''),
          snippet: descMatch ? clean(stripHtmlTags(descMatch[1])) : undefined,
        };
      });

      return {
        items,
        totalPages: items.length >= perPage ? page + 1 : page,
        totalItems: items.length,
        currentPage: page,
      };
    }
  } catch (rssErr) {
    console.error('[Announcements] RSS フィード取得失敗:', rssErr);
  }

  return {
    items: [],
    totalPages: 1,
    totalItems: 0,
    currentPage: page,
  };
}
