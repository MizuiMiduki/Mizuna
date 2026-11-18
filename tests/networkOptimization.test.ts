import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMisskeyNote } from '../src/services/misskeyApi';
import {
  db,
  DEFAULT_USER_SETTINGS,
  saveDraftDb,
  getAllDraftsDb,
  deleteDraftDb,
  type AccountRecord,
} from '../src/db/database';
import {
  prependNoteToHistoryCache,
  getHistoryCache,
  clearHistoryCache,
  getAccountCacheKey,
} from '../src/store/historyStore';
import type { MisskeyNote } from '../src/services/misskeyApi';

describe('通信量削減・ペイロード最適化テスト (Network Optimization & Zero Waste)', () => {
  const dummyAccount: AccountRecord = {
    id: 1,
    name: 'Test User',
    username: 'tester',
    address: 'misskey.test',
    token: 'dummy-token',
    avatarurl: 'https://misskey.test/avatar.png',
    add_mizuna_versinon: '4.1.0',
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await db.open();
    await db.account.clear();
    await db.setting.clear();
    await db.draft.clear();
    clearHistoryCache();

    await db.setting.put({ ...DEFAULT_USER_SETTINGS, id: 1, select_user: 1 });
    await db.account.put(dummyAccount);
  });

  describe('ノート投稿時の通信最小化', () => {
    it('ノート作成時に余計なAPI呼び出しを一切行わず、/api/notes/create の1リクエストのみで完了すること', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          createdNote: { id: 'note-123' },
        }),
      });
      globalThis.fetch = fetchMock;

      await createMisskeyNote(
        dummyAccount,
        '最小通信でのテスト投稿',
        null,
        'public',
        false
      );

      // fetch は 1 回だけ呼ばれていること（余計なユーザー情報取得やメタデータ取得が発生しない）
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://misskey.test/api/notes/create');
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');

      // ペイロードが不要なプロパティを含まず最小化されていること
      const payload = JSON.parse(options.body);
      expect(payload).toEqual({
        i: 'dummy-token',
        text: '最小通信でのテスト投稿',
        visibility: 'public',
      });
      // 未指定のオプション（cw, fileIds, replyId等）がペイロードに含まれて通信量を浪費していないこと
      expect(payload.cw).toBeUndefined();
      expect(payload.fileIds).toBeUndefined();
      expect(payload.replyId).toBeUndefined();
    });

    it('CWや添付画像がある場合のみ必要最小限のフィールドが追加されること', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ createdNote: { id: 'note-456' } }),
      });
      globalThis.fetch = fetchMock;

      await createMisskeyNote(
        dummyAccount,
        '本文',
        '閲覧注意',
        'home',
        false,
        ['file-id-1', 'file-id-2'],
        'reply-id-789'
      );

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(payload).toEqual({
        i: 'dummy-token',
        text: '本文',
        visibility: 'home',
        cw: '閲覧注意',
        fileIds: ['file-id-1', 'file-id-2'],
        replyId: 'reply-id-789',
      });
    });
  });

  describe('完全ローカル動作保証 (ゼロ通信)', () => {
    it('下書き（Draft）の保存・取得・削除時に外部ネットワーク通信が一切発生しないこと', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      // 下書きの保存
      const draftId = await saveDraftDb({
        accountId: dummyAccount.id!,
        accountUsername: dummyAccount.username,
        accountAddress: dummyAccount.address,
        text: 'オフライン下書きテキスト',
        cwText: '',
        cwEnabled: false,
        visibility: 'public',
        endMizuna: false,
        images: [],
      });
      expect(fetchSpy).not.toHaveBeenCalled();

      // 下書きの取得
      const drafts = await getAllDraftsDb();
      expect(drafts.length).toBe(1);
      expect(fetchSpy).not.toHaveBeenCalled();

      // 下書きの削除
      await deleteDraftDb(draftId);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('新規投稿完了時、再取得のfetchを行わずにメモリ内キャッシュへ即時反映し通信量をゼロに抑えること', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const accountKey = getAccountCacheKey(dummyAccount);

      const dummyCreatedNote: MisskeyNote = {
        id: 'new-note-1',
        createdAt: new Date().toISOString(),
        text: '通信を抑えて投稿したノート',
        cw: null,
        userId: 'tester',
        user: {
          id: 'tester',
          name: dummyAccount.name,
          username: dummyAccount.username,
          avatarUrl: dummyAccount.avatarurl,
        },
        visibility: 'public',
      };

      // 投稿後にprependNoteToHistoryCacheを実行
      prependNoteToHistoryCache(accountKey, dummyCreatedNote);

      // キャッシュに即座に反映され、fetchは一切呼ばれていないこと
      expect(fetchSpy).not.toHaveBeenCalled();

      const cached = getHistoryCache(accountKey, 'my_notes');
      expect(cached).toBeDefined();
      expect(cached?.notes.length).toBe(1);
      expect(cached?.notes[0].id).toBe('new-note-1');
      expect(cached?.notes[0].text).toBe('通信を抑えて投稿したノート');
    });
  });
});
