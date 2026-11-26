import { safeLocalStorage } from './storage';

const RECENT_EMOJIS_KEY_PREFIX = 'mizuna_recent_emojis:';
const PINNED_EMOJIS_KEY_PREFIX = 'mizuna_pinned_emojis:';
const MAX_RECENT_EMOJIS = 32;

/**
 * 指定インスタンスの最近使った絵文字名一覧を取得
 */
export function getRecentEmojis(address: string): string[] {
  if (!address) return [];
  const raw = safeLocalStorage.getItem(`${RECENT_EMOJIS_KEY_PREFIX}${address}`);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * 最近使った絵文字を追加（先頭に追加し重複排除、最大32件）
 */
export function addRecentEmoji(address: string, emojiName: string): string[] {
  if (!address || !emojiName) return [];
  const current = getRecentEmojis(address);
  const next = [emojiName, ...current.filter((name) => name !== emojiName)].slice(0, MAX_RECENT_EMOJIS);
  try {
    safeLocalStorage.setItem(`${RECENT_EMOJIS_KEY_PREFIX}${address}`, JSON.stringify(next));
  } catch {
    // storage error ignored
  }
  return next;
}

/**
 * 指定インスタンスの固定（ピン留め）した絵文字名一覧を取得
 */
export function getPinnedEmojis(address: string): string[] {
  if (!address) return [];
  const raw = safeLocalStorage.getItem(`${PINNED_EMOJIS_KEY_PREFIX}${address}`);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * 絵文字の固定（ピン留め）をトグル
 */
export function togglePinnedEmoji(address: string, emojiName: string): { isPinned: boolean; list: string[] } {
  if (!address || !emojiName) return { isPinned: false, list: [] };
  const current = getPinnedEmojis(address);
  const exists = current.includes(emojiName);
  const next = exists
    ? current.filter((name) => name !== emojiName)
    : [emojiName, ...current];

  try {
    safeLocalStorage.setItem(`${PINNED_EMOJIS_KEY_PREFIX}${address}`, JSON.stringify(next));
  } catch {
    // storage error ignored
  }

  return { isPinned: !exists, list: next };
}

/**
 * 最近使った絵文字をクリア
 */
export function clearRecentEmojis(address: string): void {
  if (!address) return;
  try {
    safeLocalStorage.removeItem(`${RECENT_EMOJIS_KEY_PREFIX}${address}`);
  } catch {
    // storage error ignored
  }
}
