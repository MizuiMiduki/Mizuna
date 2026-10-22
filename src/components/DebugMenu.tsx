import gsap from 'gsap';
import { createSignal, For, Show } from 'solid-js';
import { MIZUNA_VERSION, mizuna_options } from '../config/mizunaOptions';
import { db, DEFAULT_USER_SETTINGS, updateSettingDb } from '../db/database';
import { useApp, type ViewType } from '../store/appStore';

const PRESET_COLORS = [
  { label: 'Sky', hex: '#2b8cbe' },
  { label: 'Violet', hex: '#8b5cf6' },
  { label: 'Emerald', hex: '#10b981' },
  { label: 'Rose', hex: '#f43f5e' },
  { label: 'Amber', hex: '#f59e0b' },
];

export function DebugMenu() {
  const {
    settings,
    accounts,
    currentUser,
    currentView,
    forceSetCurrentView,
    setNoteText,
    setCwEnabled,
    setCwText,
    reloadAccounts,
    updateSettings,
    showToast,
    openDialog,
  } = useApp();

  const [isOpen, setIsOpen] = createSignal(false);
  const [showDbJson, setShowDbJson] = createSignal(false);
  let panelRef: HTMLDivElement | undefined;

  const toggleMenu = () => {
    if (!isOpen()) {
      setIsOpen(true);
      setTimeout(() => {
        if (panelRef) {
          gsap.fromTo(
            panelRef,
            { opacity: 0, y: 18, scale: 0.94 },
            { opacity: 1, y: 0, scale: 1, duration: 0.26, ease: 'back.out(1.5)' }
          );
        }
      }, 10);
    } else {
      if (panelRef) {
        gsap.to(panelRef, {
          opacity: 0,
          y: 12,
          scale: 0.95,
          duration: 0.16,
          ease: 'power2.in',
          onComplete: () => setIsOpen(false),
        });
      } else {
        setIsOpen(false);
      }
    }
  };

  // ダミーアカウント追加
  const addMockAccount = async (ver: string, suffix: string, isLongName = false) => {
    const rand = Math.floor(100 + Math.random() * 900);
    const id = await db.account.put({
      token: `mock_token_${rand}`,
      name: isLongName
        ? `超長文テストユーザー名_寿限無寿限無五劫のすりきれ海砂利水魚の水行末雲来末風来末_${rand}`
        : `テストユーザー${rand} (${suffix})`,
      username: isLongName
        ? `very_long_username_account_test_example_${rand}`
        : `mizuna_dev_${rand}`,
      address: isLongName ? 'very-long-instance-domain-example.misskey.io' : 'misskey.io',
      avatarurl: '/icon.png',
      add_mizuna_versinon: ver,
    });

    if (typeof id === 'number') {
      await updateSettingDb({ select_user: id });
    }
    await reloadAccounts();
    forceSetCurrentView('note');
    showToast(
      isLongName ? '超長文ダミーアカウントを追加しました' : `ダミーアカウント (v${ver}) を追加しました`,
      'success',
      'Debug'
    );
  };

  // Web Share Target シミュレート
  const simulateWebShareTarget = () => {
    const title = `Mizuna ${MIZUNA_VERSION} リリース記事`;
    const text = 'Solid.js + GSAP + BeerCSS でモダンに生まれ変わりました！';
    const url = 'https://mizuna.blossomsarchive.com/';
    localStorage.setItem('wst_title', title);
    localStorage.setItem('wst_text', text);
    localStorage.setItem('wst_url', url);
    setNoteText(`${title}\n${text}\n${url}`);
    setCwEnabled(true);
    setCwText('Web Share Target テスト');
    forceSetCurrentView('note');
    showToast('共有ターゲット受信をシミュレートしました', 'info', 'Debug');
  };

  // アップデート通知モーダルのテスト表示
  const testReleaseNoteModal = () => {
    openDialog({
      title: 'Mizuna がアップデートされました',
      icon: 'celebration',
      tone: 'primary',
      badgeText: `VERSION ${mizuna_options.mizuna_version}`,
      contentText: `いつもご利用ありがとうございます。Mizuna v${mizuna_options.mizuna_version} への更新が完了しました。新機能や改善点についてはリリースノートをご覧ください。`,
      linkCard: {
        label: 'RELEASE NOTE',
        title: `Mizuna ${mizuna_options.mizuna_version} リリースノート (テスト表示)`,
        url: 'https://blossomsarchive.com/blog/category/mizuna/',
      },
      buttons: [
        {
          label: '確認してはじめる',
          variant: 'fill',
        },
      ],
    });
  };

  // テーマカラー直接適用
  const applyPresetColor = async (hex: string) => {
    if (window.ui) {
      await window.ui('theme', hex);
    }
    showToast(`テーマカラーを ${hex} に変更しました`, 'info', 'Debug');
  };

  // IndexedDB 全初期化
  const resetDatabase = async () => {
    await db.account.clear();
    await db.setting.clear();
    await db.setting.put({
      id: 1,
      ...DEFAULT_USER_SETTINGS,
    });
    await updateSettings(DEFAULT_USER_SETTINGS);
    await reloadAccounts();
    forceSetCurrentView('add_account');
    showToast('IndexedDB を初期状態にリセットしました', 'warning', 'Debug');
  };

  return (
    <div class="mizuna-debug-root">
      {/* フローティング DEV トグルボタン */}
      <button
        type="button"
        class={`mizuna-debug-trigger ${isOpen() ? 'is-open' : ''}`}
        onClick={toggleMenu}
        title="開発者デバッグメニュー (DEV環境限定)"
      >
        <i>bug_report</i>
        <span>DEV</span>
      </button>

      {/* デバッグドロワーパネル */}
      <Show when={isOpen()}>
        <div ref={panelRef} class="mizuna-debug-panel">
          <div class="mizuna-debug-header">
            <div class="mizuna-debug-title">
              <i>terminal</i>
              <span>Mizuna DevTools</span>
              <span class="mizuna-debug-env-tag">DEV ONLY</span>
            </div>
            <button type="button" class="mizuna-icon-btn-sm" onClick={toggleMenu}>
              <i>close</i>
            </button>
          </div>

          <div class="mizuna-debug-body">
            {/* 1. 画面強制切り替え */}
            <div class="mizuna-debug-section">
              <div class="mizuna-debug-label">画面強制切り替え (現在: {currentView()})</div>
              <div class="mizuna-debug-grid-4">
                {(
                  [
                    { id: 'note', label: 'ノート' },
                    { id: 'accounts', label: 'アカウント' },
                    { id: 'add_account', label: '追加/初回' },
                    { id: 'settings', label: '設定' },
                    { id: 'shortcuts', label: 'キー一覧' },
                    { id: 'about', label: 'About' },
                  ] as { id: ViewType; label: string }[]
                ).map((v) => (
                  <button
                    type="button"
                    class={`mizuna-debug-chip ${currentView() === v.id ? 'is-active' : ''}`}
                    onClick={() => forceSetCurrentView(v.id)}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. ダミーアカウント生成 */}
            <div class="mizuna-debug-section">
              <div class="mizuna-debug-label">
                ダミーアカウント投入 (登録数: {accounts().length}件)
              </div>
              <div class="mizuna-debug-row">
                <button
                  type="button"
                  class="mizuna-debug-btn"
                  onClick={() => addMockAccount(MIZUNA_VERSION, `v${MIZUNA_VERSION}標準`)}
                >
                  <i>person_add</i>
                  <span>+ ダミー追加 (v{MIZUNA_VERSION})</span>
                </button>
                <button
                  type="button"
                  class="mizuna-debug-btn"
                  onClick={() => addMockAccount('3.4.0', '旧v3.4画像制限')}
                >
                  <i>history</i>
                  <span>+ 旧版追加 (v3.4.0)</span>
                </button>
              </div>
              <div class="mizuna-debug-row top-gap">
                <button
                  type="button"
                  class="mizuna-debug-btn"
                  onClick={() => addMockAccount(MIZUNA_VERSION, '長文テスト', true)}
                >
                  <i>text_fields</i>
                  <span>+ 超長文ユーザー名テスト追加</span>
                </button>
              </div>
            </div>

            {/* 3. トースト＆ダイアログ＆機能テスト */}
            <div class="mizuna-debug-section">
              <div class="mizuna-debug-label">UI・通知・イベントテスト</div>
              <div class="mizuna-debug-grid-4">
                <button
                  type="button"
                  class="mizuna-debug-chip"
                  onClick={() => showToast('成功トーストのテストです', 'success', 'Success')}
                >
                  Success
                </button>
                <button
                  type="button"
                  class="mizuna-debug-chip"
                  onClick={() => showToast('情報トーストのテストです', 'info', 'Info')}
                >
                  Info
                </button>
                <button
                  type="button"
                  class="mizuna-debug-chip"
                  onClick={() => showToast('警告トーストのテストです', 'warning', 'Warning')}
                >
                  Warning
                </button>
                <button
                  type="button"
                  class="mizuna-debug-chip"
                  onClick={() => showToast('エラートーストのテストです', 'error', 'Error')}
                >
                  Error
                </button>
              </div>

              <div class="mizuna-debug-row top-gap">
                <button type="button" class="mizuna-debug-btn" onClick={testReleaseNoteModal}>
                  <i>celebration</i>
                  <span>更新通知ダイアログ</span>
                </button>
                <button type="button" class="mizuna-debug-btn" onClick={simulateWebShareTarget}>
                  <i>share</i>
                  <span>WebShare受信テスト</span>
                </button>
              </div>
            </div>

            {/* 4. テーマカラー即時プレビュー */}
            <div class="mizuna-debug-section">
              <div class="mizuna-debug-label">Material 3 動的テーマプレビュー</div>
              <div class="mizuna-debug-color-row">
                <For each={PRESET_COLORS}>
                  {(c) => (
                    <button
                      type="button"
                      class="mizuna-color-swatch"
                      style={{ 'background-color': c.hex }}
                      onClick={() => applyPresetColor(c.hex)}
                      title={`${c.label} (${c.hex})`}
                    />
                  )}
                </For>
                <button
                  type="button"
                  class="mizuna-debug-chip"
                  onClick={() =>
                    updateSettings({
                      is_darkmode: settings().is_darkmode === 3 ? 1 : 3,
                    })
                  }
                >
                  <i>dark_mode</i>
                  <span>明暗切替</span>
                </button>
              </div>
            </div>

            {/* 5. IndexedDB インスペクター ＆ 初期化 */}
            <div class="mizuna-debug-section">
              <div class="mizuna-debug-label">IndexedDB (MizunaDatabase) 操作</div>
              <div class="mizuna-debug-row">
                <button
                  type="button"
                  class="mizuna-debug-btn"
                  onClick={() => setShowDbJson((prev) => !prev)}
                >
                  <i>data_object</i>
                  <span>{showDbJson() ? 'DB状態を隠す' : 'DB状態を表示'}</span>
                </button>
                <button
                  type="button"
                  class="mizuna-debug-btn is-danger"
                  onClick={resetDatabase}
                >
                  <i>delete_forever</i>
                  <span>DB全初期化</span>
                </button>
              </div>

              <Show when={showDbJson()}>
                <pre class="mizuna-debug-json">
                  {JSON.stringify(
                    {
                      currentUser: currentUser(),
                      settings: settings(),
                      accountsCount: accounts().length,
                    },
                    null,
                    2
                  )}
                </pre>
              </Show>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
