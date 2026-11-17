import { safeLocalStorage } from './storage';

export const WST_TITLE_KEY = 'wst_title';
export const WST_TEXT_KEY = 'wst_text';
export const WST_URL_KEY = 'wst_url';

export interface WebShareData {
  title?: string | null;
  text?: string | null;
  url?: string | null;
}

/**
 * URLクエリパラメータから Web Share Target パラメータを取得し、ストレージに一時保存する
 */
export function captureWebShareTargetFromUrl(urlStr?: string): boolean {
  if (typeof document === 'undefined' && !urlStr) return false;

  try {
    const currentUrl = urlStr || (typeof document !== 'undefined' ? document.location.href : '');
    if (!currentUrl) return false;

    const params = new URL(currentUrl, 'http://localhost').searchParams;
    const wstTitle = params.get('title');
    const wstText = params.get('text');
    const wstUrl = params.get('url');

    if (wstTitle || wstText || wstUrl) {
      clearWebShareTargetStorage();
      if (wstTitle) safeLocalStorage.setItem(WST_TITLE_KEY, wstTitle);
      if (wstText) safeLocalStorage.setItem(WST_TEXT_KEY, wstText);
      if (wstUrl) safeLocalStorage.setItem(WST_URL_KEY, wstUrl);
      return true;
    }
  } catch {
    // URL解析失敗時は安全に無視
  }

  return false;
}

/**
 * ストレージに保存されている Web Share Target データを取得する
 */
export function getWebShareTargetStorage(): WebShareData | null {
  const title = safeLocalStorage.getItem(WST_TITLE_KEY);
  const text = safeLocalStorage.getItem(WST_TEXT_KEY);
  const url = safeLocalStorage.getItem(WST_URL_KEY);

  if (title !== null || text !== null || url !== null) {
    return { title, text, url };
  }
  return null;
}

/**
 * ストレージの Web Share Target データを消去する
 */
export function clearWebShareTargetStorage(): void {
  safeLocalStorage.removeItem(WST_TITLE_KEY);
  safeLocalStorage.removeItem(WST_TEXT_KEY);
  safeLocalStorage.removeItem(WST_URL_KEY);
}

/**
 * 既存のノート本文と Web Share Target の各項目を適切に結合する
 */
export function combineNoteWithShareData(currentNote: string, data: WebShareData): string {
  let combined = currentNote || '';
  if (data.title) combined += (combined ? '\n' : '') + data.title;
  if (data.text) combined += (combined ? '\n' : '') + data.text;
  if (data.url) combined += (combined ? '\n' : '') + data.url;
  return combined;
}
