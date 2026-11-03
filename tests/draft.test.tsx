import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@solidjs/testing-library';
import {
  db,
  DEFAULT_USER_SETTINGS,
  saveDraftDb,
  getAllDraftsDb,
  getDraftDb,
  deleteDraftDb,
  clearAllDraftsDb,
  countDraftsDb,
  type DraftRecord,
} from '../src/db/database';
import { AppProvider, useApp } from '../src/store/appStore';

describe('Drafts feature', () => {
  beforeEach(async () => {
    await db.open();
    await db.account.clear();
    await db.setting.clear();
    await db.draft.clear();

    await db.setting.put({ ...DEFAULT_USER_SETTINGS, id: 1, select_user: 1 });
    await db.account.bulkAdd([
      {
        id: 1,
        token: 'tok_account1',
        name: 'アカウント1',
        username: 'user1',
        address: 'instance1.example',
        avatarurl: 'https://example.com/user1.webp',
        add_mizuna_versinon: '3.15.0',
      },
      {
        id: 2,
        token: 'tok_account2',
        name: 'アカウント2',
        username: 'user2',
        address: 'instance2.example',
        avatarurl: 'https://example.com/user2.webp',
        add_mizuna_versinon: '3.15.0',
      },
    ]);
  });

  describe('Database layer (database.ts)', () => {
    it('アカウント情報とともに下書きを保存できること', async () => {
      const draftData: Omit<DraftRecord, 'id' | 'createdAt' | 'updatedAt'> = {
        accountId: 2,
        accountUsername: 'user2',
        accountAddress: 'instance2.example',
        accountName: 'アカウント2',
        accountAvatarUrl: 'https://example.com/user2.webp',
        text: 'テスト下書き本文',
        cwText: '閲覧注意注釈',
        cwEnabled: true,
        visibility: 'home',
        endMizuna: true,
        images: [],
      };

      const newId = await saveDraftDb(draftData);
      expect(newId).toBeTypeOf('number');

      const saved = await getDraftDb(newId);
      expect(saved).toBeDefined();
      expect(saved?.accountId).toBe(2);
      expect(saved?.accountUsername).toBe('user2');
      expect(saved?.accountAddress).toBe('instance2.example');
      expect(saved?.text).toBe('テスト下書き本文');
      expect(saved?.cwText).toBe('閲覧注意注釈');
      expect(saved?.cwEnabled).toBe(true);
      expect(saved?.visibility).toBe('home');
      expect(saved?.endMizuna).toBe(true);
      expect(saved?.createdAt).toBeTypeOf('number');
      expect(saved?.updatedAt).toBeTypeOf('number');
    });

    it('下書き一覧が更新日時の新しい順に取得できること', async () => {
      const id1 = await saveDraftDb({
        accountId: 1,
        accountUsername: 'user1',
        accountAddress: 'instance1.example',
        text: '下書き1',
        cwEnabled: false,
        visibility: 'public',
        endMizuna: false,
      });

      // 少し待機して2つ目を保存
      await new Promise((r) => setTimeout(r, 10));

      const id2 = await saveDraftDb({
        accountId: 2,
        accountUsername: 'user2',
        accountAddress: 'instance2.example',
        text: '下書き2',
        cwEnabled: false,
        visibility: 'followers',
        endMizuna: false,
      });

      const list = await getAllDraftsDb();
      expect(list.length).toBe(2);
      expect(list[0].id).toBe(id2);
      expect(list[1].id).toBe(id1);

      const count = await countDraftsDb();
      expect(count).toBe(2);
    });

    it('特定の下書きを削除、またはすべて削除できること', async () => {
      const id1 = await saveDraftDb({
        accountId: 1,
        accountUsername: 'user1',
        accountAddress: 'instance1.example',
        text: '削除対象1',
        cwEnabled: false,
        visibility: 'public',
        endMizuna: false,
      });
      const id2 = await saveDraftDb({
        accountId: 1,
        accountUsername: 'user1',
        accountAddress: 'instance1.example',
        text: '削除対象2',
        cwEnabled: false,
        visibility: 'public',
        endMizuna: false,
      });

      await deleteDraftDb(id1);
      const afterDeleteOne = await getAllDraftsDb();
      expect(afterDeleteOne.length).toBe(1);
      expect(afterDeleteOne[0].id).toBe(id2);

      await clearAllDraftsDb();
      const afterClearAll = await getAllDraftsDb();
      expect(afterClearAll.length).toBe(0);
    });
  });

  describe('App Store integration', () => {
    it('入力中の内容が空のときは下書き保存を拒否すること', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: (props) => <AppProvider>{props.children}</AppProvider>,
      });

      // 初期化待機
      await new Promise((r) => setTimeout(r, 60));

      const success = await result.saveCurrentAsDraft();
      expect(success).toBe(false);
      expect(result.drafts().length).toBe(0);
    });

    it('現在の入力内容を現在のアカウント情報と共に保存できること', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: (props) => <AppProvider>{props.children}</AppProvider>,
      });

      await new Promise((r) => setTimeout(r, 60));

      // アカウント1が選択中
      expect(result.currentUser()?.id).toBe(1);

      result.setNoteText('保存する本文');
      result.setCwText('CW注釈');
      result.setCwEnabled(true);
      result.setVisibility('followers');
      result.setEndMizuna(true);

      const success = await result.saveCurrentAsDraft();
      expect(success).toBe(true);

      expect(result.drafts().length).toBe(1);
      const saved = result.drafts()[0];
      expect(saved.accountId).toBe(1);
      expect(saved.accountUsername).toBe('user1');
      expect(saved.accountAddress).toBe('instance1.example');
      expect(saved.text).toBe('保存する本文');
      expect(saved.cwText).toBe('CW注釈');
      expect(saved.cwEnabled).toBe(true);
      expect(saved.visibility).toBe('followers');
      expect(saved.endMizuna).toBe(true);
      expect(result.draftCount()).toBe(1);
    });

    it('下書きを復元したとき、保存されていたアカウントに自動で切り替わること', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: (props) => <AppProvider>{props.children}</AppProvider>,
      });

      await new Promise((r) => setTimeout(r, 60));

      // アカウント2で保存された下書きレコードを用意
      const draftRecord: DraftRecord = {
        id: 99,
        accountId: 2,
        accountUsername: 'user2',
        accountAddress: 'instance2.example',
        accountName: 'アカウント2',
        accountAvatarUrl: 'https://example.com/user2.webp',
        text: 'アカウント2で書いた下書き本文',
        cwText: 'アカウント2のCW',
        cwEnabled: true,
        visibility: 'home',
        endMizuna: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // 現在はアカウント1が選択中
      expect(result.currentUser()?.id).toBe(1);

      // 下書き復元を実行（入力が空の状態）
      const success = await result.restoreDraft(draftRecord);
      expect(success).toBe(true);

      // 保存元のアカウント2に自動で切り替わっていることを確認！
      expect(result.currentUser()?.id).toBe(2);
      expect(result.currentUser()?.username).toBe('user2');

      // 本文やCWなどの状態も復元されていることを確認
      expect(result.noteText()).toBe('アカウント2で書いた下書き本文');
      expect(result.cwText()).toBe('アカウント2のCW');
      expect(result.cwEnabled()).toBe(true);
      expect(result.visibility()).toBe('home');
      expect(result.endMizuna()).toBe(false);

      // トースト通知が過剰に出ず、「復元しました」の1件のみであること
      expect(result.toasts().length).toBe(1);
      expect(result.toasts()[0].message).toMatch(/(復元しました|Draft restored)/);
    });

    it('下書きを削除できること', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: (props) => <AppProvider>{props.children}</AppProvider>,
      });

      await new Promise((r) => setTimeout(r, 60));

      result.setNoteText('削除テスト');
      await result.saveCurrentAsDraft();
      expect(result.drafts().length).toBe(1);

      const draftId = result.drafts()[0].id!;
      await result.deleteDraftById(draftId);

      expect(result.drafts().length).toBe(0);
      expect(result.draftCount()).toBe(0);
    });
  });
});
