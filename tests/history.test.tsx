import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { AppProvider, useApp } from '../src/store/appStore';
import { clearHistoryCache } from '../src/store/historyStore';
import { HistoryView } from '../src/components/HistoryView';
import { NoteView } from '../src/components/NoteView';
import { db, DEFAULT_USER_SETTINGS } from '../src/db/database';
import type { MisskeyNote } from '../src/services/misskeyApi';

describe('HistoryView & Reply Features (#129, #130, #131)', () => {
  const mockNote1: MisskeyNote = {
    id: 'note_001',
    createdAt: new Date().toISOString(),
    text: 'テスト投稿1です :blobcat: #mizuna',
    cw: null,
    userId: 'user_001',
    user: {
      id: 'user_001',
      name: 'テストユーザー :verified:',
      username: 'test_user',
      avatarUrl: 'https://example.com/avatar.webp',
      emojis: [
        { name: 'verified', url: 'https://example.com/verified.png' },
      ],
    },
    visibility: 'public',
    repliesCount: 2,
    files: [],
    emojis: [
      { name: 'blobcat', url: 'https://example.com/blobcat.webp' },
    ],
    reactions: {
      '👍': 3,
      ':blobcat:': 5,
      ':local_emoji:': 2,
    },
    reactionEmojis: {
      ':blobcat:': 'https://example.com/blobcat.webp',
    },
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

  const mockNote3Reply: MisskeyNote = {
    id: 'note_003_reply',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    text: 'これはリプライとして送ったノートです',
    cw: null,
    userId: 'user_001',
    user: {
      id: 'user_001',
      name: 'テストユーザー',
      username: 'test_user',
      avatarUrl: 'https://example.com/avatar.webp',
    },
    replyId: 'note_parent_999',
    reply: {
      id: 'note_parent_999',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      text: '親ノートのテキストです',
      cw: null,
      userId: 'user_other',
      user: {
        id: 'user_other',
        name: '相手のユーザー',
        username: 'other_user',
        avatarUrl: 'https://example.com/other.webp',
      },
      visibility: 'public',
    },
    visibility: 'public',
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
    clearHistoryCache();
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
      add_mizuna_versinon: '4.0.0',
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

        // /api/emojis (サーバーカスタム絵文字一覧)
        if (url.includes('/api/emojis')) {
          return {
            ok: true,
            status: 200,
            json: async () => [
              { name: 'server_cat', url: 'https://example.com/server_cat.webp' },
            ],
          };
        }

        // /api/users/notes (自分の投稿一覧 #129)
        if (url.includes('/api/users/notes')) {
          return {
            ok: true,
            status: 200,
            json: async () => [mockNote1, mockNote2WithCw, mockNote3Reply],
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

    // カスタム絵文字 (:blobcat: や :verified:) が <img> として描画されていること
    const emojiImgs = document.querySelectorAll('.mfm-custom-emoji');
    expect(emojiImgs.length).toBeGreaterThanOrEqual(1);

    // リアクション一覧は非表示であること
    const reactions = document.querySelectorAll('.mizuna-reaction-pill');
    expect(reactions.length).toBe(0);
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

  it('リプライとして送信されたノートにはリプライバナーおよび返信先ユーザー情報が表示されること', async () => {
    const { container } = render(() => (
      <AppProvider>
        <HistoryView />
      </AppProvider>
    ));

    expect(await screen.findByText(/これはリプライとして送ったノートです/)).toBeInTheDocument();

    // リプライバナーと返信先ユーザー情報が表示されること
    const replyBanner = container.querySelector('.mizuna-note-reply-banner');
    expect(replyBanner).toBeInTheDocument();
    expect(replyBanner?.textContent).toContain('@other_user');
    expect(replyBanner?.textContent).toContain('親ノートのテキストです');

    // リプライピルバッジが表示されること
    const replyPill = container.querySelector('.mizuna-note-reply-pill');
    expect(replyPill).toBeInTheDocument();
  });

  it('4.0.0未満のアカウントでは権限不足警告画面が表示され、APIリクエストが行われないこと', async () => {
    // 3.15.0のアカウントに更新
    await db.account.clear();
    await db.account.add({
      id: 1,
      token: 'tok_test',
      name: 'テストユーザー',
      username: 'test_user',
      address: 'misskey.test',
      avatarurl: 'https://example.com/avatar.webp',
      add_mizuna_versinon: '3.15.0',
    });

    let currentAppView: any;
    function TestConsumer() {
      const { currentView } = useApp();
      currentAppView = currentView;
      return null;
    }

    render(() => (
      <AppProvider>
        <HistoryView />
        <TestConsumer />
      </AppProvider>
    ));

    // 権限不足の警告画面が表示されること
    expect(
      await screen.findByRole('heading', {
        name: /(投稿履歴の閲覧権限がありません|History permission required|Permission Required to View History)/i,
      })
    ).toBeInTheDocument();
    expect(await screen.findByText(/3\.15\.0/)).toBeInTheDocument();

    // 再認証ボタンが表示され、クリックでアカウント追加画面へ遷移すること
    const reauthBtn = screen.getByRole('button', { name: /(アカウントを再認証する|Re-authenticate Account)/ });
    expect(reauthBtn).toBeInTheDocument();
    fireEvent.click(reauthBtn);
    expect(currentAppView()).toBe('add_account');

    // fetchで /api/users/notes や /api/notes/mentions が呼ばれていないこと
    const fetchMock = vi.mocked(fetch);
    const notesCalls = fetchMock.mock.calls.filter((call) =>
      typeof call[0] === 'string' && (call[0].includes('/api/users/notes') || call[0].includes('/api/notes/mentions'))
    );
    expect(notesCalls.length).toBe(0);
  });

  it('一度フェッチした後は画面遷移で再マウントされてもfetchせず、手動リフレッシュ時にのみfetchすること', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockClear();

    // 1回目のマウント（初回表示）
    const { unmount } = render(() => (
      <AppProvider>
        <HistoryView />
      </AppProvider>
    ));

    expect(await screen.findByText(/テスト投稿1です/)).toBeInTheDocument();

    // 初回フェッチで /api/users/notes が呼ばれたことを確認
    const initialCallCount = fetchMock.mock.calls.filter((call) =>
      typeof call[0] === 'string' && call[0].includes('/api/users/notes')
    ).length;
    expect(initialCallCount).toBeGreaterThan(0);

    // 別の画面へ遷移したと仮定してアンマウント
    unmount();

    // 2回目のマウント（画面に戻ってきたとき）
    render(() => (
      <AppProvider>
        <HistoryView />
      </AppProvider>
    ));

    // キャッシュから瞬時に復元されること
    expect(await screen.findByText(/テスト投稿1です/)).toBeInTheDocument();

    // 2回目以降は /api/users/notes の呼び出し回数が増えていないこと（不要な通信なし）
    const secondCallCount = fetchMock.mock.calls.filter((call) =>
      typeof call[0] === 'string' && call[0].includes('/api/users/notes')
    ).length;
    expect(secondCallCount).toBe(initialCallCount);

    // 「最新に更新」ボタンをクリックして手動リロード
    const refreshBtn = screen.getByRole('button', { name: /(最新に更新|Refresh)/ });
    fireEvent.click(refreshBtn);

    // 手動リロードによりフェッチが実行されること
    await vi.waitFor(() => {
      const thirdCallCount = fetchMock.mock.calls.filter((call) =>
        typeof call[0] === 'string' && call[0].includes('/api/users/notes')
      ).length;
      expect(thirdCallCount).toBeGreaterThan(initialCallCount);
    });
  });
});
