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

function getCacheKey(accountKey: string | number, tab: HistoryTab): string {
  return `${accountKey}:${tab}`;
}

export function getHistoryCache(accountKey: string | number, tab: HistoryTab): TabCache | undefined {
  return cache.get(getCacheKey(accountKey, tab));
}

export function setHistoryCache(accountKey: string | number, tab: HistoryTab, data: TabCache): void {
  cache.set(getCacheKey(accountKey, tab), data);
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
}
