import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMisskeyNote,
  fetchLatestAccountInfo,
  buildMiAuthUrl,
  MisskeyApiError,
  type MisskeyNote,
} from '../src/services/misskeyApi';
import { type AccountRecord } from '../src/db/database';

describe('Misskey API 互換性・フォーク耐性・契約テスト (API Contract & Compatibility)', () => {
  const dummyAccount: AccountRecord = {
    id: 1,
    name: '契約テストユーザー',
    username: 'tester',
    address: 'misskey.test',
    token: 'test-token',
    avatarurl: 'https://misskey.test/avatar.png',
    add_mizuna_versinon: '4.1.0',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Misskey レスポンス構造のフォーク差異吸収テスト', () => {
    it('Misskey本家の { createdNote: { ... } } ラップ形式を正しく展開できること', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          createdNote: {
            id: 'note-v13-standard',
            createdAt: '2026-11-18T10:00:00.000Z',
            text: '本家形式',
            cw: null,
            userId: 'user-001',
            user: {
              id: 'user-001',
              name: 'Custom Name',
              username: 'custom_user',
              avatarUrl: 'https://example.com/custom.png',
            },
            visibility: 'public',
          },
        }),
      });

      const note = await createMisskeyNote(
        dummyAccount,
        '本家形式',
        null,
        'public',
        false
      );

      expect(note.id).toBe('note-v13-standard');
      expect(note.text).toBe('本家形式');
      expect(note.user.username).toBe('custom_user');
    });

    it('一部フォークサーバーのラップなし直下形式でも正常にパースできること', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'note-fork-unwrapped',
          createdAt: '2026-11-18T10:00:00.000Z',
          text: 'フォーク形式',
          visibility: 'home',
        }),
      });

      const note = await createMisskeyNote(
        dummyAccount,
        'フォーク形式',
        null,
        'home',
        false
      );

      expect(note.id).toBe('note-fork-unwrapped');
      expect(note.visibility).toBe('home');
      // ユーザー情報が欠落していてもアカウント情報から自動補完されること
      expect(note.user.username).toBe('tester');
    });

    it('サーバーが最小限の空JSON {} のみを返した場合でも、クラッシュせずローカルデータで安全に補完されること', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      const note = await createMisskeyNote(
        dummyAccount,
        'フォールバック検証',
        'CWテキスト',
        'followers',
        false
      );

      expect(note.id).toMatch(/^local_/);
      expect(note.text).toBe('フォールバック検証');
      expect(note.cw).toBe('CWテキスト');
      expect(note.visibility).toBe('followers');
      expect(note.user.username).toBe('tester');
    });
  });

  describe('APIエラーレスポンス・ステータスコード判定テスト', () => {
    it('認証失効 (401 / 403) 時に isAuthError: true の MisskeyApiError がスローされること', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            message: 'Authentication failed.',
            code: 'AUTHENTICATION_FAILED',
          },
        }),
      });

      await expect(fetchLatestAccountInfo(dummyAccount)).rejects.toSatisfy(
        (err: unknown) => {
          return err instanceof MisskeyApiError && err.isAuthError === true;
        }
      );
    });

    it('ネットワーク切断や接続拒否時に isNetworkError: true の MisskeyApiError がスローされること', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(fetchLatestAccountInfo(dummyAccount)).rejects.toSatisfy(
        (err: unknown) => {
          return err instanceof MisskeyApiError && err.isNetworkError === true;
        }
      );
    });

    it('ノート投稿時にサーバーエラー (500) が返った場合、例外がスローされ投稿失敗が検知できること', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Internal Server Error' } }),
      });

      await expect(
        createMisskeyNote(dummyAccount, '投稿内容', null, 'public', false)
      ).rejects.toThrow('HTTP 500');
    });
  });

  describe('MiAuth 認証プロトコル契約テスト', () => {
    it('MiAuth URLに必要なパーミッション（投稿・下書き・ドライブ等）とコールバックURLが含まれていること', () => {
      const urlString = buildMiAuthUrl('misskey.io', 'test-session-1234');
      const url = new URL(urlString);

      expect(url.origin).toBe('https://misskey.io');
      expect(url.pathname).toBe('/miauth/test-session-1234');
      expect(url.searchParams.get('permission')).toContain('write:notes');
      expect(url.searchParams.get('permission')).toContain('read:account');
      expect(url.searchParams.get('permission')).toContain('write:drive');
      expect(url.searchParams.get('callback')).toBeTruthy();
      expect(url.searchParams.get('name')).toContain('Mizuna');
    });
  });
});
