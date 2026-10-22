import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkServerExists,
  buildMiAuthUrl,
  checkMiAuthSession,
  fetchLatestAccountInfo,
  createMisskeyNote,
  fetchLatestReleaseNote,
  MisskeyApiError,
} from '../services/misskeyApi';
import type { AccountRecord } from '../db/database';

describe('misskeyApi service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkServerExists', () => {
    it('不正な形式のドメインには即座に false を返すこと', async () => {
      expect(await checkServerExists('')).toBe(false);
      expect(await checkServerExists('   ')).toBe(false);
      expect(await checkServerExists('localhost without dot')).toBe(false);
    });

    it('/api/meta が 200 OK の場合に true を返すこと', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{}', { status: 200 }));
      const result = await checkServerExists('misskey.io');
      expect(result).toBe(true);
    });

    it('/api/meta と HEAD リクエストの両方が失敗した場合に false を返すこと', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));
      const result = await checkServerExists('nonexistent.domain.xyz');
      expect(result).toBe(false);
    });
  });

  describe('buildMiAuthUrl', () => {
    it('正しいクエリパラメータと権限を持った MiAuth URL を生成すること', () => {
      const url = buildMiAuthUrl('https://misskey.io/', 'session-uuid-123');
      expect(url).toContain('https://misskey.io/miauth/session-uuid-123');
      expect(url).toContain('permission=write:notes,read:account,write:drive');
      expect(url).toContain('name=');
    });
  });

  describe('checkMiAuthSession', () => {
    it('API が 200 を返したときにレスポンスデータを返すこと', async () => {
      const mockData = {
        ok: true,
        token: 'secret_token',
        user: {
          id: 'u1',
          name: 'Mi User',
          username: 'miuser',
          avatarUrl: 'https://example.com/icon.png',
        },
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockData), { status: 200 })
      );

      const res = await checkMiAuthSession('misskey.io', 'session-123');
      expect(res.ok).toBe(true);
      expect(res.token).toBe('secret_token');
      expect(res.user?.username).toBe('miuser');
    });

    it('API がエラーを返したときに { ok: false } を返すこと', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('Forbidden', { status: 403 }));
      const res = await checkMiAuthSession('misskey.io', 'session-123');
      expect(res.ok).toBe(false);
    });
  });

  describe('fetchLatestAccountInfo', () => {
    const mockAccount: AccountRecord = {
      id: 1,
      token: 'valid_token',
      name: 'Old Name',
      username: 'user1',
      address: 'misskey.io',
      avatarurl: 'https://example.com/old.png',
      add_mizuna_versinon: '3.10.0',
    };

    it('最新のユーザー情報を取得して返すこと', async () => {
      const apiResponse = {
        id: 'u1',
        name: 'New Name',
        username: 'user1',
        avatarUrl: 'https://example.com/new.png',
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(apiResponse), { status: 200 })
      );

      const info = await fetchLatestAccountInfo(mockAccount);
      expect(info.name).toBe('New Name');
      expect(info.avatarUrl).toBe('https://example.com/new.png');
    });

    it('認証エラー (401/403) 時に isAuthError: true を持つ MisskeyApiError をスローすること', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { code: 'AUTHENTICATION_FAILED' } }), { status: 401 })
      );

      await expect(fetchLatestAccountInfo(mockAccount)).rejects.toMatchObject({
        name: 'MisskeyApiError',
        isAuthError: true,
      });
    });
  });

  describe('createMisskeyNote', () => {
    const mockAccount: AccountRecord = {
      id: 1,
      token: 'valid_token',
      name: 'User',
      username: 'user',
      address: 'misskey.io',
      avatarurl: 'https://example.com/avatar.png',
      add_mizuna_versinon: '3.10.0',
    };

    it('appendFromMizuna が true の場合末尾に (from Mizuna) を付与してリクエストすること', async () => {
      let requestBody: any = null;
      vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (_url, init) => {
        requestBody = JSON.parse(init?.body as string);
        return new Response('{}', { status: 200 });
      });

      await createMisskeyNote(mockAccount, 'こんにちは', null, 'public', true);

      expect(requestBody).toBeDefined();
      expect(requestBody.text).toBe('こんにちは\n(from Mizuna)');
      expect(requestBody.visibility).toBe('public');
    });

    it('CW および添付ファイル ID が指定された場合ペイロードに含めること', async () => {
      let requestBody: any = null;
      vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (_url, init) => {
        requestBody = JSON.parse(init?.body as string);
        return new Response('{}', { status: 200 });
      });

      await createMisskeyNote(
        mockAccount,
        'ネタバレ本文',
        '閲覧注意の注釈',
        'home',
        false,
        ['file_id_1', 'file_id_2']
      );

      expect(requestBody.text).toBe('ネタバレ本文');
      expect(requestBody.cw).toBe('閲覧注意の注釈');
      expect(requestBody.visibility).toBe('home');
      expect(requestBody.fileIds).toEqual(['file_id_1', 'file_id_2']);
    });
  });

  describe('fetchLatestReleaseNote', () => {
    it('RSS フィードから最新記事のタイトルとリンクを正しく抽出すること', async () => {
      const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Mizuna Releases</title>
    <item>
      <title>Mizuna 3.10.0 リリースノート</title>
      <link>https://blossomsarchive.com/blog/2026/10/22/mizuna-3-10-0/</link>
    </item>
  </channel>
</rss>`;

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(mockXml, { status: 200, headers: { 'Content-Type': 'application/xml' } })
      );

      const result = await fetchLatestReleaseNote();
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Mizuna 3.10.0 リリースノート');
      expect(result?.link).toBe('https://blossomsarchive.com/blog/2026/10/22/mizuna-3-10-0/');
    });

    it('RSS 直接取得が失敗した場合は WordPress REST API にフォールバックすること', async () => {
      // 1回目の RSS 呼び出しは失敗
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('CORS error'));
      // 2回目の REST API は成功
      const mockWpJson = [
        {
          title: { rendered: 'Mizuna v3.10.0 WP 記事' },
          link: 'https://blossomsarchive.com/blog/wp-post-url/',
        },
      ];
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockWpJson), { status: 200 })
      );

      const result = await fetchLatestReleaseNote();
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Mizuna v3.10.0 WP 記事');
      expect(result?.link).toBe('https://blossomsarchive.com/blog/wp-post-url/');
    });
  });
});
