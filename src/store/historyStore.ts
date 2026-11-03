import { createSignal } from 'solid-js';
import type { MisskeyNote } from '../services/misskeyApi';

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
// ページ遷移（画面切り替え）を行ってもメモリ内にデータを保持し、
// 再訪問時の不要な通信を防ぐ
const cache = new Map<string, TabCache>();

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
  return cache.get(getCacheKey(accountKey, tab));
}

export function setHistoryCache(accountKey: string | number, tab: HistoryTab, data: TabCache): void {
  cache.set(getCacheKey(accountKey, tab), data);
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
      }
    }
  } else {
    cache.clear();
  }
  setHistoryCacheVersion((v) => v + 1);
}
