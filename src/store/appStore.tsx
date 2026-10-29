import { compressAndConvertToWebP } from '../utils/image';
import gsap from 'gsap';
import {
  createContext,
  createSignal,
  onSettled,
  useContext,
  type Accessor,
  type Setter,
} from 'solid-js';
import type { JSX } from '@solidjs/web';
import { MIZUNA_VERSION, mizuna_options } from '../config/mizunaOptions';
import {
  db,
  DEFAULT_USER_SETTINGS,
  loadOrCreateSettings,
  updateSettingDb,
  type AccountRecord,
  type SettingRecord,
} from '../db/database';
import {
  checkMiAuthSession,
  fetchLatestAccountInfo,
  fetchLatestReleaseNote,
  MisskeyApiError,
} from '../services/misskeyApi';
import { applyThemeAndMode } from '../utils/theme';

export type ViewType =
  | 'note'
  | 'accounts'
  | 'add_account'
  | 'settings'
  | 'shortcuts'
  | 'about'
  | 'announcements';
export type VisibilityType = 'public' | 'home' | 'followers';
export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

export interface DialogButton {
  label: string;
  variant?: 'fill' | 'border' | 'text' | 'error';
  onClick?: () => void | Promise<void>;
}

export interface DialogConfig {
  title: string;
  icon?: string;
  tone?: 'primary' | 'warning' | 'danger' | 'info';
  badgeText?: string;
  contentHtml?: string;
  contentText?: string;
  linkCard?: {
    label: string;
    title: string;
    url: string;
  };
  buttons: DialogButton[];
}

export interface AttachedImageItem {
  id: string;
  name: string;
  file: File;
  dataUrl: string;
  compressedFile?: File;
  originalSize: number;
  compressedSize?: number;
}

export function visibilityNumToString(num: 1 | 2 | 3): VisibilityType {
  switch (num) {
    case 1:
      return 'public';
    case 2:
      return 'home';
    case 3:
      return 'followers';
    default:
      return 'public';
  }
}

interface AppContextValue {
  isInitializing: Accessor<boolean>;
  settings: Accessor<SettingRecord>;
  accounts: Accessor<AccountRecord[]>;
  currentUser: Accessor<AccountRecord | null>;
  currentView: Accessor<ViewType>;
  setCurrentView: (view: ViewType) => void;
  forceSetCurrentView: (view: ViewType) => void;

  // ノート下書き状態（画面切り替え時も保持）
  noteText: Accessor<string>;
  setNoteText: Setter<string>;
  cwText: Accessor<string>;
  setCwText: Setter<string>;
  cwEnabled: Accessor<boolean>;
  setCwEnabled: Setter<boolean>;
  visibility: Accessor<VisibilityType>;
  setVisibility: Setter<VisibilityType>;
  endMizuna: Accessor<boolean>;
  setEndMizuna: Setter<boolean>;
  attachedImages: Accessor<AttachedImageItem[]>;
  addAttachedFiles: (fileList: FileList | File[]) => void;
  removeAttachedImage: (id: string) => void;
  clearNoteForm: (showNotification?: boolean) => void;

  // アカウント・設定操作
  switchAccount: (accountId: number) => Promise<void>;
  deleteSelectedAccounts: (accountIds: number[]) => Promise<void>;
  updateSettings: (changes: Partial<SettingRecord>) => Promise<void>;
  isSyncingAccounts: Accessor<boolean>;
  syncAllAccounts: () => Promise<void>;
  syncCurrentAccount: () => Promise<void>;
  exportAccounts: () => Promise<void>;
  importAccountsFromFile: (file: File) => Promise<void>;
  reloadAccounts: () => Promise<void>;

  // UI通知・ダイアログ
  toasts: Accessor<ToastItem[]>;
  showToast: (message: string, type?: ToastType, title?: string) => void;
  dismissToast: (id: string) => void;
  dialogConfig: Accessor<DialogConfig | null>;
  openDialog: (config: DialogConfig) => void;
  closeDialog: () => void;
}

const AppContext = createContext<AppContextValue>();

const VIEW_STORAGE_KEY = 'mizuna_current_view';
const VALID_VIEWS: ViewType[] = [
  'note',
  'accounts',
  'add_account',
  'settings',
  'shortcuts',
  'about',
  'announcements',
];

function getSavedView(): ViewType | null {
  try {
    const saved = sessionStorage.getItem(VIEW_STORAGE_KEY) as ViewType | null;
    if (saved && VALID_VIEWS.includes(saved)) {
      return saved;
    }
  } catch {
    // sessionStorage 無効時は無視
  }
  return null;
}

function saveViewToSession(view: ViewType): void {
  try {
    sessionStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    // sessionStorage 無効時は無視
  }
}

export function AppProvider(props: { children: JSX.Element }) {
  const [isInitializing, setIsInitializing] = createSignal(true);
  const [settings, setSettings] = createSignal<SettingRecord>({
    id: 1,
    ...DEFAULT_USER_SETTINGS,
  });
  const [accounts, setAccounts] = createSignal<AccountRecord[]>([]);
  const [currentUser, setCurrentUser] = createSignal<AccountRecord | null>(null);
  const [currentView, setCurrentViewSignal] = createSignal<ViewType>(getSavedView() ?? 'note');

  const setCurrentViewInternal = (view: ViewType) => {
    setCurrentViewSignal(view);
    saveViewToSession(view);
  };

  // ノート入力状態
  const [noteText, setNoteText] = createSignal('');
  const [cwText, setCwText] = createSignal('');
  const [cwEnabled, setCwEnabled] = createSignal(false);
  const [visibility, setVisibility] = createSignal<VisibilityType>('public');
  const [endMizuna, setEndMizuna] = createSignal(false);
  const [attachedImages, setAttachedImages] = createSignal<AttachedImageItem[]>([]);

  // トースト・ダイアログ状態
  const [toasts, setToasts] = createSignal<ToastItem[]>([]);
  const [dialogConfig, setDialogConfig] = createSignal<DialogConfig | null>(null);
  const [isSyncingAccounts, setIsSyncingAccounts] = createSignal(false);

  const showToast = (message: string, type: ToastType = 'info', title?: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  };

  const openDialog = (config: DialogConfig) => {
    setDialogConfig(config);
  };

  const closeDialog = () => {
    setDialogConfig(null);
  };

  const setCurrentView = (view: ViewType) => {
    if (
      accounts().length === 0 &&
      view !== 'add_account' &&
      view !== 'shortcuts' &&
      view !== 'about' &&
      view !== 'announcements'
    ) {
      setCurrentViewInternal('add_account');
      return;
    }
    setCurrentViewInternal(view);
  };

  /**
   * Web Share Target パラメータをURLおよびlocalStorageから読み込む
   */
  const captureWebShareTargetFromUrl = (): boolean => {
    const params = new URL(document.location.href).searchParams;
    const wstTitle = params.get('title');
    const wstText = params.get('text');
    const wstUrl = params.get('url');

    if (wstTitle || wstText || wstUrl) {
      localStorage.removeItem('wst_title');
      localStorage.removeItem('wst_text');
      localStorage.removeItem('wst_url');

      if (wstTitle) localStorage.setItem('wst_title', wstTitle);
      if (wstText) localStorage.setItem('wst_text', wstText);
      if (wstUrl) localStorage.setItem('wst_url', wstUrl);
      return true;
    }
    return false;
  };

  const applyWebShareTargetToForm = () => {
    const title = localStorage.getItem('wst_title');
    const text = localStorage.getItem('wst_text');
    const url = localStorage.getItem('wst_url');

    if (title !== null || text !== null || url !== null) {
      let combined = noteText() || '';
      if (title) combined += (combined ? '\n' : '') + title;
      if (text) combined += (combined ? '\n' : '') + text;
      if (url) combined += (combined ? '\n' : '') + url;
      setNoteText(combined);
    }
  };

  /**
   * アカウント一覧と選択中ユーザーをDBから再読み込み
   */
  const reloadAccounts = async () => {
    const allAccounts = await db.account.orderBy('id').toArray();
    setAccounts(allAccounts);

    if (allAccounts.length === 0) {
      setCurrentUser(null);
      await applyThemeAndMode(settings(), undefined);
      return;
    }

    const selectedId = settings().select_user;
    const matched = allAccounts.find((a) => a.id === selectedId);
    if (matched) {
      setCurrentUser(matched);
      await applyThemeAndMode(settings(), matched.avatarurl, matched.address);
    } else {
      const firstAccount = allAccounts[0];
      if (firstAccount && firstAccount.id !== undefined) {
        await updateSettingDb({ select_user: firstAccount.id });
        setSettings((prev) => ({ ...prev, select_user: firstAccount.id! }));
        setCurrentUser(firstAccount);
        await applyThemeAndMode(
          { ...settings(), select_user: firstAccount.id },
          firstAccount.avatarurl,
          firstAccount.address
        );
      }
    }
  };

  /**
   * MiAuthコールバック (?session=...) の処理
   */
  const handleMiAuthCallbackIfPresent = async (): Promise<boolean> => {
    const search = location.search;
    if (!search || !search.includes('session=')) {
      return false;
    }

    const sessionId = new URLSearchParams(search).get('session');
    const address = localStorage.getItem('add_server_address');

    if (!sessionId || !address) {
      window.history.replaceState({}, document.title, '/');
      return false;
    }

    try {
      const data = await checkMiAuthSession(address, sessionId);
      if (!data.ok || !data.token || !data.user) {
        showToast('アカウント認証に失敗しました', 'error');
        window.history.replaceState({}, document.title, '/');
        return false;
      }

      const cleanAddress = address.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
      const newId = await db.account.put({
        token: data.token,
        name: data.user.name || data.user.username,
        username: data.user.username,
        address: cleanAddress,
        avatarurl: data.user.avatarUrl,
        add_mizuna_versinon: MIZUNA_VERSION,
      });

      // 追加したアカウントをアクティブにする
      if (typeof newId === 'number') {
        await updateSettingDb({ select_user: newId });
        setSettings((prev) => ({ ...prev, select_user: newId }));
      }

      localStorage.removeItem('add_server_address');
      window.history.replaceState({}, document.title, '/');
      showToast('アカウントを追加しました！', 'success');
      return true;
    } catch (err) {
      console.error('MiAuth check error:', err);
      showToast('アカウント情報の取得に失敗しました', 'error');
      window.history.replaceState({}, document.title, '/');
      return false;
    }
  };

  /**
   * リリースノートの更新チェック
   */
  const checkNewReleaseNote = async (currentSettings: SettingRecord) => {
    if (currentSettings.is_check_releasenote === null) {
      await updateSettingDb({ is_check_releasenote: mizuna_options.mizuna_version });
      setSettings((prev) => ({ ...prev, is_check_releasenote: mizuna_options.mizuna_version }));
      return;
    }

    if (mizuna_options.mizuna_version !== currentSettings.is_check_releasenote) {
      try {
        const latestPost = await fetchLatestReleaseNote();
        if (latestPost) {
          openDialog({
            title: 'Mizuna がアップデートされました',
            icon: 'celebration',
            tone: 'primary',
            badgeText: `VERSION ${mizuna_options.mizuna_version}`,
            contentText: `いつもご利用ありがとうございます。Mizuna v${mizuna_options.mizuna_version} への更新が完了しました。新機能や改善点についてはリリースノートをご覧ください。`,
            linkCard: {
              label: 'RELEASE NOTE',
              title: latestPost.title,
              url: latestPost.link,
            },
            buttons: [
              {
                label: '確認してはじめる',
                variant: 'fill',
                onClick: async () => {
                  await updateSettingDb({ is_check_releasenote: mizuna_options.mizuna_version });
                  setSettings((prev) => ({
                    ...prev,
                    is_check_releasenote: mizuna_options.mizuna_version,
                  }));
                },
              },
            ],
          });
        } else {
          await updateSettingDb({ is_check_releasenote: mizuna_options.mizuna_version });
        }
      } catch (err) {
        console.error('リリースノートの取得に失敗しました:', err);
      }
    }
  };

  // 初回マウント時の初期化フロー
  onSettled(() => {
    // 省電力設定: GSAPティッカーの自動スリープを早め、バックグラウンド時は完全停止させる
    gsap.config({ autoSleep: 60, nullTargetWarn: false });
    const handleVisibilityChange = () => {
      if (document.hidden) {
        gsap.globalTimeline.pause();
      } else {
        gsap.globalTimeline.resume();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // OSのカラースキーム変更を監視（端末設定モード時）
    const mediaQuery =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null;
    const handleSchemeChange = () => {
      if (settings().is_darkmode === 2) {
        applyThemeAndMode(settings(), currentUser()?.avatarurl, currentUser()?.address);
      }
    };
    mediaQuery?.addEventListener?.('change', handleSchemeChange);

    void (async () => {
      // Canary / 本番のタイトル・PWAマニフェスト同期
      document.title = `${mizuna_options.app_name} -ノート専用Misskeyクライアント`;
      const appleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
      if (appleMeta) {
        appleMeta.setAttribute('content', mizuna_options.app_name);
      }
      const manifestLink = document.getElementById('mizuna-manifest-link');
      if (manifestLink) {
        manifestLink.setAttribute(
          'href',
          mizuna_options.is_canary ? '/manifest-canary.json' : '/manifest.json'
        );
      }

      if (mizuna_options.maintenance) {
        window.location.href = `${mizuna_options.mizuna_address}/maintenance.html`;
        return;
      }

      const hasShareParams = captureWebShareTargetFromUrl();
      const savedView = getSavedView();

      try {
        const loadedSettings = await loadOrCreateSettings();
        setSettings(loadedSettings);
        setVisibility(visibilityNumToString(loadedSettings.default_visibility));
        setEndMizuna(loadedSettings.is_note_end_mizuna);

        // MiAuthのコールバックがあれば処理
        const addedViaMiAuth = await handleMiAuthCallbackIfPresent();

        // アカウント読み込み
        await reloadAccounts();

        if (accounts().length > 0) {
          applyWebShareTargetToForm();
          if (addedViaMiAuth || hasShareParams) {
            setCurrentViewInternal('note');
          } else if (savedView) {
            setCurrentViewInternal(savedView);
          } else {
            setCurrentViewInternal('note');
          }
        } else {
          if (savedView === 'shortcuts' || savedView === 'about') {
            setCurrentViewInternal(savedView);
          } else {
            setCurrentViewInternal('add_account');
          }
        }

        // リリースノート確認
        await checkNewReleaseNote(loadedSettings);
      } catch (err) {
        console.error('Initialization failed:', err);
        showToast('データベースの読み込みに失敗しました', 'error');
      } finally {
        setIsInitializing(false);
      }
    })();

    return () => {
      try {
        mediaQuery?.removeEventListener?.('change', handleSchemeChange);
      } catch {
        // テスト環境等のティアダウン時は無視
      }
      if (typeof document !== 'undefined') {
        try {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        } catch {
          // 無視
        }
      }
    };
  });

  // 添付画像の追加（Base64変換ではなくゼロコピーの ObjectURL を使用してCPU・メモリ・バッテリー消費を削減）
  const addAttachedFiles = (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (incoming.length === 0) return;

    const current = attachedImages();
    if (current.length + incoming.length > 16) {
      showToast('画像は16枚までです', 'error', '画像選択エラー');
      return;
    }

    const newItems: AttachedImageItem[] = incoming.map((file) => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      file,
      dataUrl: URL.createObjectURL(file),
      originalSize: file.size,
    }));

    // バックグラウンドでWebPへ事前圧縮し、削減率と圧縮後サイズを記録
    newItems.forEach((item) => {
      compressAndConvertToWebP(item.file, 0.75)
        .then((compressed) => {
          setAttachedImages((prev) =>
            prev.map((img) =>
              img.id === item.id
                ? { ...img, compressedFile: compressed, compressedSize: compressed.size }
                : img
            )
          );
        })
        .catch((err) => console.warn('Pre-compression failed:', err));
    });

    setAttachedImages((prev) => {
      const combined = [...prev, ...newItems];
      if (combined.length > 16) {
        combined.slice(16).forEach((extra) => URL.revokeObjectURL(extra.dataUrl));
        return combined.slice(0, 16);
      }
      return combined;
    });
  };

  const removeAttachedImage = (id: string) => {
    setAttachedImages((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target && target.dataUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.dataUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const clearNoteForm = (showNotification = true) => {
    localStorage.removeItem('wst_title');
    localStorage.removeItem('wst_text');
    localStorage.removeItem('wst_url');
    setCwText('');
    setNoteText('');
    setAttachedImages((prev) => {
      prev.forEach((item) => {
        if (item.dataUrl.startsWith('blob:')) {
          URL.revokeObjectURL(item.dataUrl);
        }
      });
      return [];
    });
    if (showNotification) {
      showToast('フォームクリア！', 'info');
    }
  };

  const switchAccount = async (accountId: number) => {
    await updateSettingDb({ select_user: accountId });
    const nextSettings = { ...settings(), select_user: accountId };
    setSettings(nextSettings);

    const target = accounts().find((a) => a.id === accountId) ?? null;
    setCurrentUser(target);
    await applyThemeAndMode(nextSettings, target?.avatarurl, target?.address);
    showToast('アカウントを切り替えました', 'success');
  };

  const deleteSelectedAccounts = async (accountIds: number[]) => {
    if (accountIds.length === 0) return;
    await db.account.bulkDelete(accountIds);
    await reloadAccounts();

    if (accounts().length === 0) {
      setCurrentViewInternal('add_account');
      showToast('すべてのアカウントを削除しました', 'info');
    } else {
      showToast(`${accountIds.length}件のアカウントを削除しました`, 'success');
    }
  };

  const updateSettings = async (changes: Partial<SettingRecord>) => {
    await updateSettingDb(changes);
    const updated: SettingRecord = { ...settings(), ...changes };
    setSettings(updated);

    // デフォルト投稿範囲や (from Mizuna) が変更された場合、現在のフォームにも反映
    if (changes.default_visibility !== undefined) {
      setVisibility(visibilityNumToString(changes.default_visibility));
    }
    if (changes.is_note_end_mizuna !== undefined) {
      setEndMizuna(changes.is_note_end_mizuna);
    }

    // テーマやアイコン表示に関する変更があれば再適用
    if (
      changes.is_darkmode !== undefined ||
      changes.is_pick_theme_color !== undefined ||
      changes.is_visible_icon !== undefined
    ) {
      const latestColors = await applyThemeAndMode(
        updated,
        currentUser()?.avatarurl,
        currentUser()?.address
      );
      setSettings((prev) => ({ ...prev, latest_theme_color: latestColors }));
    }
  };

  const syncAllAccounts = async () => {
    if (isSyncingAccounts()) return;

    const list = accounts();
    if (list.length === 0) return;

    setIsSyncingAccounts(true);

    try {
      const results = await Promise.all(
        list.map(async (acc) => {
          try {
            const data = await fetchLatestAccountInfo(acc);
            return {
              account: acc,
              success: true,
              changes: {
                name: data.name || data.username,
                username: data.username,
                avatarurl: data.avatarUrl || '/icon.png',
              },
            };
          } catch (err: any) {
            return {
              account: acc,
              success: false,
              error: err,
            };
          }
        })
      );

      const successful = results.filter((r) => r.success && r.account.id !== undefined && r.changes);
      const failed = results.filter((r) => !r.success);

      if (successful.length > 0) {
        await db.account.bulkUpdate(
          successful.map((r) => ({
            key: r.account.id!,
            changes: r.changes!,
          }))
        );
        await reloadAccounts();

        // 選択中のアカウントが同期対象に含まれる場合は状態とテーマを即座に最新化
        const current = currentUser();
        if (current && current.id !== undefined) {
          const fresh = accounts().find((a) => a.id === current.id);
          if (fresh) {
            setCurrentUser(fresh);
            if (settings().is_pick_theme_color) {
              await applyThemeAndMode(settings(), fresh.avatarurl, fresh.address);
            }
          }
        }

        // 成功した件数のみトースト通知（エラートーストは不要のため表示しない）
        showToast(
          list.length === successful.length
            ? `全 ${successful.length} 件のアカウント情報を同期しました`
            : `${successful.length} 件のアカウント情報を同期しました`,
          'success',
          'アカウント同期完了'
        );
      }

      if (failed.length > 0) {
        console.warn('[AccountSync] アカウント同期失敗ログ (エラートースト非表示):', failed);
      }
    } catch (unexpectedErr) {
      console.error('[AccountSync] 予期しない同期エラー (エラートースト非表示):', unexpectedErr);
    } finally {
      setIsSyncingAccounts(false);
    }
  };

  const syncCurrentAccount = async () => {
    // 既存の互換性のため残しつつ、全アカウント同期を実行
    await syncAllAccounts();
  };

  const exportAccounts = async () => {
    const all = await db.account.toArray();
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mizuna_accounts.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    showToast('アカウント情報をエクスポートしました', 'success');
  };

  const importAccountsFromFile = async (file: File) => {
    openDialog({
      title: 'アカウントデータのインポート',
      icon: 'gpp_maybe',
      tone: 'warning',
      badgeText: 'SECURITY WARNING',
      contentHtml:
        'Mizunaからエクスポートした正規のバックアップファイル以外を読み込まないでください。<div class="mizuna-modal-AlertBox">悪意のあるファイルをインポートすると、アクセストークン等の情報が第三者に漏洩する危険性があります。</div>',
      buttons: [
        {
          label: 'キャンセル',
          variant: 'border',
        },
        {
          label: 'インポートを実行',
          variant: 'fill',
          onClick: async () => {
            try {
              const text = await file.text();
              const parsed = JSON.parse(text);
              if (!Array.isArray(parsed)) {
                throw new Error('Invalid JSON format');
              }

              const sanitized: AccountRecord[] = parsed.map((item: Record<string, unknown>) => ({
                token: String(item.token ?? ''),
                name: String(item.name ?? item.username ?? ''),
                username: String(item.username ?? ''),
                address: String(item.address ?? ''),
                avatarurl: String(item.avatarurl ?? '/icon.png'),
                add_mizuna_versinon: String(item.add_mizuna_versinon ?? MIZUNA_VERSION),
              }));

              const recordsToInsert: AccountRecord[] = [];
              for (const record of sanitized) {
                if (!record.token || !record.username || !record.address) continue;
                const exists = await db.account
                  .where({
                    username: record.username,
                    address: record.address,
                  })
                  .count();
                if (exists === 0) {
                  recordsToInsert.push(record);
                }
              }

              if (recordsToInsert.length > 0) {
                await db.account.bulkPut(recordsToInsert);
              }

              await reloadAccounts();
              if (accounts().length > 0) {
                setCurrentViewInternal('note');
              }
              showToast('アカウント情報をインポートしました', 'success');
            } catch (err) {
              console.error('Import failed:', err);
              showToast('インポートに失敗しました', 'error');
            }
          },
        },
      ],
    });
  };

  const contextValue: AppContextValue = {
    isInitializing,
    settings,
    accounts,
    currentUser,
    currentView,
    setCurrentView,
    forceSetCurrentView: setCurrentViewInternal,
    noteText,
    setNoteText,
    cwText,
    setCwText,
    cwEnabled,
    setCwEnabled,
    visibility,
    setVisibility,
    endMizuna,
    setEndMizuna,
    attachedImages,
    addAttachedFiles,
    removeAttachedImage,
    clearNoteForm,
    switchAccount,
    deleteSelectedAccounts,
    updateSettings,
    isSyncingAccounts,
    syncAllAccounts,
    syncCurrentAccount,
    exportAccounts,
    importAccountsFromFile,
    reloadAccounts,
    toasts,
    showToast,
    dismissToast,
    dialogConfig,
    openDialog,
    closeDialog,
  };

  return <AppContext value={contextValue}>{props.children}</AppContext>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
}
