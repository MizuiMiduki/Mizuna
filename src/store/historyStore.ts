import { createSignal } from 'solid-js';
import type { MisskeyNote } from '../services/misskeyApi';
import { safeSessionStorage } from '../utils/storage';

export type HistoryTab = 'my_notes' | 'mentions';

export interface RepliesState {
  loading: boolean;
  list: MisskeyNote[];
  loaded: boolean;
  isOpen: boolean;
}

export interface TabCache {
  notes: MisskeyNote[];
  hasMore: boolean;
  repliesMap: Record<string, RepliesState>;
  expandedCwMap: Record<string, boolean>;
  isLoaded: boolean;
}

// メモリ内キャッシュ (accountKey:tab -> TabCache)
// ページ遷移（画面切り替え）を行ってもメモリ内にデータを保持し、再訪問時の不要な通信を防ぐ
const cache = new Map<string, TabCache>();
const HISTORY_STORAGE_PREFIX = 'mizuna_hist_cache:';
const MAX_STORED_HISTORY_NOTES = 20;

// キャッシュ更新を購読するためのリアクティブシグナル
const [historyCacheVersion, setHistoryCacheVersion] = createSignal(0);
export { historyCacheVersion };

export function getAccountCacheKey(
  user: { id?: number; address: string; username: string } | null | undefined
): string {
  if (!user) return '';
  return String(user.id || `${user.address}@${user.username}`);
}

function getCacheKey(accountKey: string | number, tab: HistoryTab): string {
  return `${accountKey}:${tab}`;
}

export function getHistoryCache(accountKey: string | number, tab: HistoryTab): TabCache | undefined {
  const key = getCacheKey(accountKey, tab);
  const memoryCached = cache.get(key);
  if (memoryCached) return memoryCached;

  // セッションストレージから復元（Stale-While-Revalidate: SWR）
  const storedJson = safeSessionStorage.getItem(`${HISTORY_STORAGE_PREFIX}${key}`);
  if (storedJson) {
    try {
      const parsed: TabCache = JSON.parse(storedJson);
      if (parsed && Array.isArray(parsed.notes)) {
        cache.set(key, parsed);
        return parsed;
      }
    } catch {
      // ignore parse error
    }
  }

  return undefined;
}

export function setHistoryCache(accountKey: string | number, tab: HistoryTab, data: TabCache): void {
  const key = getCacheKey(accountKey, tab);
  cache.set(key, data);

  // セッションストレージに軽量永続化
  try {
    const lightweightData: TabCache = {
      ...data,
      notes: data.notes.slice(0, MAX_STORED_HISTORY_NOTES),
    };
    safeSessionStorage.setItem(`${HISTORY_STORAGE_PREFIX}${key}`, JSON.stringify(lightweightData));
  } catch {
    // quota exceeded or ignore
  }
}

/**
 * 新規投稿したノートを fetch なしで投稿履歴キャッシュの先頭に即時追加する
 */
export function prependNoteToHistoryCache(
  accountKey: string | number,
  createdNote: MisskeyNote
): void {
  if (!accountKey) return;

  const myNotesKey = getCacheKey(accountKey, 'my_notes');
  const existingMyNotes = cache.get(myNotesKey);

  const updateParentReplyState = (tabCache: TabCache, replyNote: MisskeyNote): TabCache => {
    const parentId = replyNote.replyId;
    if (!parentId) return tabCache;

    const updatedNotes = tabCache.notes.map((n) =>
      n.id === parentId ? { ...n, repliesCount: (n.repliesCount ?? 0) + 1 } : n
    );

    const parentReplies = tabCache.repliesMap[parentId];
    const updatedRepliesMap = { ...tabCache.repliesMap };
    if (parentReplies && parentReplies.loaded) {
      const existsInReplies = parentReplies.list.some((r) => r.id === replyNote.id);
      if (!existsInReplies) {
        updatedRepliesMap[parentId] = {
          ...parentReplies,
          list: [...parentReplies.list, replyNote],
        };
      }
    }

    return {
      ...tabCache,
      notes: updatedNotes,
      repliesMap: updatedRepliesMap,
    };
  };

  if (existingMyNotes && existingMyNotes.isLoaded) {
    const filtered = existingMyNotes.notes.filter((n) => n.id !== createdNote.id);
    let nextCache: TabCache = {
      ...existingMyNotes,
      notes: [createdNote, ...filtered],
    };
    if (createdNote.replyId) {
      nextCache = updateParentReplyState(nextCache, createdNote);
    }
    cache.set(myNotesKey, nextCache);
  } else {
    // まだ履歴を開いていない状態でも、投稿したノートを fetch なしでそのまま表示できるようキャッシュを作成
    cache.set(myNotesKey, {
      notes: [createdNote],
      hasMore: true,
      repliesMap: {},
      expandedCwMap: {},
      isLoaded: true,
    });
  }

  // メンションタブ側の親ノートに対する返信数・スレッド一覧も同期
  if (createdNote.replyId) {
    const mentionsKey = getCacheKey(accountKey, 'mentions');
    const existingMentions = cache.get(mentionsKey);
    if (existingMentions && existingMentions.isLoaded) {
      cache.set(mentionsKey, updateParentReplyState(existingMentions, createdNote));
    }
  }

  setHistoryCacheVersion((v) => v + 1);
}

export function clearHistoryCache(accountKey?: string | number): void {
  if (accountKey !== undefined) {
    for (const key of cache.keys()) {
      if (key.startsWith(`${accountKey}:`)) {
        cache.delete(key);
        safeSessionStorage.removeItem(`${HISTORY_STORAGE_PREFIX}${key}`);
      }
    }
  } else {
    cache.clear();
    // セッションストレージ内の全履歴キャッシュを消去
    if (typeof window !== 'undefined') {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith(HISTORY_STORAGE_PREFIX)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => safeSessionStorage.removeItem(k));
      } catch {
        // ignore
      }
    }
  }
  setHistoryCacheVersion((v) => v + 1);
}
