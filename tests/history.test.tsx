import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { AppProvider, useApp } from '../src/store/appStore';
import { HistoryView } from '../src/components/HistoryView';
import { NoteView } from '../src/components/NoteView';
import { db, DEFAULT_USER_SETTINGS } from '../src/db/database';
import type { MisskeyNote } from '../src/services/misskeyApi';

describe('HistoryView & Reply Features (#129, #130, #131)', () => {
  const mockNote1: MisskeyNote = {
    id: 'note_001',
    createdAt: new Date().toISOString(),
    text: 'テスト投稿1です #mizuna',
    cw: null,
    userId: 'user_001',
    user: {
      id: 'user_001',
      name: 'テストユーザー',
      username: 'test_user',
      avatarUrl: 'https://example.com/avatar.webp',
    },
    visibility: 'public',
    repliesCount: 2,
    files: [],
  };

  const mockNote2WithCw: MisskeyNote = {
    id: 'note_002',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    text: 'CWの中身の本文です',
    cw: '閲覧注意の注釈',
    userId: 'user_001',
    user: {
      id: 'user_001',
      name: 'テストユーザー',
      username: 'test_user',
      avatarUrl: 'https://example.com/avatar.webp',
    },
    visibility: 'home',
    repliesCount: 0,
    files: [],
  };

  const mockReplyNote: MisskeyNote = {
    id: 'reply_001',
    createdAt: new Date().toISOString(),
    text: 'これはテストリプライです！',
    cw: null,
    userId: 'user_002',
    user: {
      id: 'user_002',
      name: '返信相手',
      username: 'replier',
      avatarUrl: 'https://example.com/replier.webp',
    },
    replyId: 'note_001',
    visibility: 'public',
    files: [],
  };

  beforeEach(async () => {
    await db.open();
    await db.account.clear();
    await db.setting.clear();
    await db.draft.clear();

    await db.setting.put({ ...DEFAULT_USER_SETTINGS, id: 1, select_user: 1 });
    await db.account.add({
      id: 1,
      token: 'tok_test',
      name: 'テストユーザー',
      username: 'test_user',
      address: 'misskey.test',
      avatarurl: 'https://example.com/avatar.webp',
      add_mizuna_versinon: '3.15.0',
    });

    // fetch のモック
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        const body = init?.body ? JSON.parse(init.body as string) : {};

        // /api/i (ユーザーID取得)
        if (url.includes('/api/i')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              id: 'user_001',
              username: 'test_user',
              name: 'テストユーザー',
              avatarUrl: 'https://example.com/avatar.webp',
            }),
          };
        }

        // /api/users/notes (自分の投稿一覧 #129)
        if (url.includes('/api/users/notes')) {
          return {
            ok: true,
            status: 200,
            json: async () => [mockNote1, mockNote2WithCw],
          };
        }

        // /api/notes/children (リプライ一覧 #130)
        if (url.includes('/api/notes/children')) {
          return {
            ok: true,
            status: 200,
            json: async () => [mockReplyNote],
          };
        }

        // /api/notes/mentions (メンション一覧 #130)
        if (url.includes('/api/notes/mentions')) {
          return {
            ok: true,
            status: 200,
            json: async () => [mockReplyNote],
          };
        }

        // /api/notes/create (返信・ノート送信 #131)
        if (url.includes('/api/notes/create')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ createdNote: { id: 'created_001' } }),
          };
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({}),
        };
      })
    );
  });

  it('投稿履歴（Issue #129）が直近順に取得・レンダリングされること', async () => {
    render(() => (
      <AppProvider>
        <HistoryView />
      </AppProvider>
    ));

    // タイトルが表示されること (日本語または英語)
    expect(await screen.findByRole('heading', { name: /(投稿履歴|Post History)/ })).toBeInTheDocument();

    // 取得されたノートの本文が表示されること
    expect(await screen.findByText(/テスト投稿1です/)).toBeInTheDocument();
    expect(screen.getByText('閲覧注意の注釈')).toBeInTheDocument();
  });

  it('リプライ確認機能（Issue #130）: リプライ一覧を展開して閲覧できること', async () => {
    render(() => (
      <AppProvider>
        <HistoryView />
      </AppProvider>
    ));

    expect(await screen.findByText(/テスト投稿1です/)).toBeInTheDocument();

    // リプライ確認ボタンをクリック
    const replyButtons = screen.getAllByRole('button', { name: /(2|リプライを表示|Show replies)/ });
    expect(replyButtons.length).toBeGreaterThan(0);
    fireEvent.click(replyButtons[0]);

    // 子リプライが取得されて表示されること
    expect(await screen.findByText('これはテストリプライです！')).toBeInTheDocument();
    expect(screen.getByText(/返信相手/)).toBeInTheDocument();
  });

  it('リプライ送信機能（Issue #131）: 返信ボタンを押すと返信モードが起動しNoteViewに返信先バナーが表示されること', async () => {
    let currentAppView: any;
    let targetNote: any;
    function TestConsumer() {
      const { currentView, replyTargetNote } = useApp();
      currentAppView = currentView;
      targetNote = replyTargetNote;
      return null;
    }

    const { container } = render(() => (
      <AppProvider>
        <HistoryView />
        <NoteView />
        <TestConsumer />
      </AppProvider>
    ));

    expect(await screen.findByText(/テスト投稿1です/)).toBeInTheDocument();

    // 「返信する」ボタンをクリック
    const replyActionBtns = screen.getAllByTitle(/(返信する|Reply)/);
    fireEvent.click(replyActionBtns[0]);

    // ノート投稿画面へ遷移し、返信先ノートがセットされること
    expect(currentAppView()).toBe('note');
    expect(targetNote()?.id).toBe('note_001');

    // NoteView 上に返信先カードが表示されること
    const replyCard = container.querySelector('.mizuna-reply-target-card');
    expect(replyCard).toBeInTheDocument();
    expect(replyCard?.textContent).toContain('テストユーザー');
    expect(replyCard?.textContent).toContain('テスト投稿1です');
  });
});
