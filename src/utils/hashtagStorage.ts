import { safeLocalStorage } from './storage';

const RECENT_HASHTAGS_KEY_PREFIX = 'mizuna_recent_hashtags:';
const PINNED_HASHTAGS_KEY_PREFIX = 'mizuna_pinned_hashtags:';
const MAX_RECENT_HASHTAGS = 32;

/**
 * 指定インスタンスの最近使ったハッシュタグ一覧を取得
 */
export function getRecentHashtags(address: string): string[] {
  if (!address) return [];
  const raw = safeLocalStorage.getItem(`${RECENT_HASHTAGS_KEY_PREFIX}${address}`);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * 最近使ったハッシュタグを追加（先頭に追加し重複排除、最大32件）
 */
export function addRecentHashtag(address: string, tag: string): string[] {
  const normalized = tag.replace(/^#+/, '').trim();
  if (!address || !normalized) return [];
  const current = getRecentHashtags(address);
  const next = [normalized, ...current.filter((t) => t !== normalized)].slice(
    0,
    MAX_RECENT_HASHTAGS
  );
  try {
    safeLocalStorage.setItem(`${RECENT_HASHTAGS_KEY_PREFIX}${address}`, JSON.stringify(next));
  } catch {
    // storage error ignored
  }
  return next;
}

/**
 * 指定インスタンスの固定（ピン留め）したハッシュタグ一覧を取得
 */
export function getPinnedHashtags(address: string): string[] {
  if (!address) return [];
  const raw = safeLocalStorage.getItem(`${PINNED_HASHTAGS_KEY_PREFIX}${address}`);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * ハッシュタグの固定（ピン留め）をトグル
 */
export function togglePinnedHashtag(
  address: string,
  tag: string
): { isPinned: boolean; list: string[] } {
  const normalized = tag.replace(/^#+/, '').trim();
  if (!address || !normalized) return { isPinned: false, list: [] };
  const current = getPinnedHashtags(address);
  const exists = current.includes(normalized);
  const next = exists
    ? current.filter((t) => t !== normalized)
    : [normalized, ...current];

  try {
    safeLocalStorage.setItem(`${PINNED_HASHTAGS_KEY_PREFIX}${address}`, JSON.stringify(next));
  } catch {
    // storage error ignored
  }

  return { isPinned: !exists, list: next };
}

/**
 * 最近使ったハッシュタグをクリア
 */
export function clearRecentHashtags(address: string): void {
  if (!address) return;
  try {
    safeLocalStorage.removeItem(`${RECENT_HASHTAGS_KEY_PREFIX}${address}`);
  } catch {
    // storage error ignored
  }
}
