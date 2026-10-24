import gsap from 'gsap';
import { onMount, Show } from 'solid-js';
import { useApp } from '../store/appStore';

export function SettingsView() {
  const {
    settings,
    updateSettings,
    isSyncingAccounts,
    syncAllAccounts,
    exportAccounts,
    hasPendingUpdate,
    applyPendingUpdate,
    checkForUpdate,
  } = useApp();
  let panelRef: HTMLDivElement | undefined;

  onMount(() => {
    if (panelRef) {
      gsap.fromTo(
        panelRef,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.28, ease: 'power3.out' }
      );
    }
  });

  const handleClearCache = async () => {
    if (typeof caches !== 'undefined') {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch (e) {
        console.error('Cache delete error:', e);
      }
    }
    window.location.reload();
  };

  return (
    <div ref={panelRef} class="mizuna-settings-view">
      <div class="mizuna-section-header">
        <div>
          <h2 class="mizuna-section-title">設定</h2>
        </div>
      </div>

      <div class="mizuna-settings-panel">
        <div class="cp_tabpanel tab1" id="first_tab">
          {/* 投稿設定グループ */}
          <div class="mizuna-setting-group">
            <div class="mizuna-group-label">投稿のデフォルト設定</div>

            <div class="mizuna-setting-card">
              {/* デフォルト投稿範囲 */}
              <div class="mizuna-setting-row">
                <div class="mizuna-setting-info">
                  <div class="mizuna-setting-title">デフォルトの公開範囲</div>
                </div>
                <div class="mizuna-seg-pills">
                  <button
                    type="button"
                    id="visibility_public"
                    class={`mizuna-seg-pill ${
                      settings().default_visibility === 1 ? 'is-active' : ''
                    }`}
                    onClick={() => updateSettings({ default_visibility: 1 })}
                  >
                    <i>public</i>
                    <span>パブリック</span>
                  </button>
                  <button
                    type="button"
                    id="visibility_home"
                    class={`mizuna-seg-pill ${
                      settings().default_visibility === 2 ? 'is-active' : ''
                    }`}
                    onClick={() => updateSettings({ default_visibility: 2 })}
                  >
                    <i>home</i>
                    <span>ホーム</span>
                  </button>
                  <button
                    type="button"
                    id="visibility_followers"
                    class={`mizuna-seg-pill ${
                      settings().default_visibility === 3 ? 'is-active' : ''
                    }`}
                    onClick={() => updateSettings({ default_visibility: 3 })}
                  >
                    <i>lock</i>
                    <span>フォロワー</span>
                  </button>
                </div>
              </div>

              <div class="mizuna-row-divider" />

              {/* (from Mizuna) 付与 */}
              <div class="mizuna-setting-row">
                <div class="mizuna-setting-info">
                  <div class="mizuna-setting-title">末尾に『(from Mizuna)』を付与</div>
                </div>
                <div class="mizuna-seg-pills">
                  <button
                    type="button"
                    id="is_note_end_mizuna_false"
                    class={`mizuna-seg-pill ${
                      !settings().is_note_end_mizuna ? 'is-active' : ''
                    }`}
                    onClick={() => updateSettings({ is_note_end_mizuna: false })}
                  >
                    <span>OFF</span>
                  </button>
                  <button
                    type="button"
                    id="is_note_end_mizuna_true"
                    class={`mizuna-seg-pill ${
                      settings().is_note_end_mizuna ? 'is-active' : ''
                    }`}
                    onClick={() => updateSettings({ is_note_end_mizuna: true })}
                  >
                    <span>ON</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 外観・テーマ設定グループ */}
          <div class="mizuna-setting-group">
            <div class="mizuna-group-label">外観・テーマ設定</div>

            <div class="mizuna-setting-card">
              {/* ダークモード */}
              <div class="mizuna-setting-row">
                <div class="mizuna-setting-info">
                  <div class="mizuna-setting-title">カラーモード</div>
                </div>
                <div class="mizuna-seg-pills">
                  <button
                    type="button"
                    id="darkmode_disable"
                    class={`mizuna-seg-pill ${
                      settings().is_darkmode === 1 ? 'is-active' : ''
                    }`}
                    onClick={() => updateSettings({ is_darkmode: 1 })}
                  >
                    <i>light_mode</i>
                    <span>ライト</span>
                  </button>
                  <button
                    type="button"
                    id="darkmode_auto"
                    class={`mizuna-seg-pill ${
                      settings().is_darkmode === 2 ? 'is-active' : ''
                    }`}
                    onClick={() => updateSettings({ is_darkmode: 2 })}
                  >
                    <i>brightness_auto</i>
                    <span>自動</span>
                  </button>
                  <button
                    type="button"
                    id="darkmode_enable"
                    class={`mizuna-seg-pill ${
                      settings().is_darkmode === 3 ? 'is-active' : ''
                    }`}
                    onClick={() => updateSettings({ is_darkmode: 3 })}
                  >
                    <i>dark_mode</i>
                    <span>ダーク</span>
                  </button>
                </div>
              </div>

              <div class="mizuna-row-divider" />

              {/* ダイナミックテーマカラー */}
              <div class="mizuna-setting-row">
                <div class="mizuna-setting-info">
                  <div class="mizuna-setting-title">アイコンからテーマカラーを抽出</div>
                </div>
                <div class="mizuna-seg-pills">
                  <button
                    type="button"
                    id="is_get_icon_keycolor_false"
                    class={`mizuna-seg-pill ${
                      !settings().is_pick_theme_color ? 'is-active' : ''
                    }`}
                    onClick={() => updateSettings({ is_pick_theme_color: false })}
                  >
                    <span>OFF</span>
                  </button>
                  <button
                    type="button"
                    id="is_get_icon_keycolor_true"
                    class={`mizuna-seg-pill ${
                      settings().is_pick_theme_color ? 'is-active' : ''
                    }`}
                    onClick={() => updateSettings({ is_pick_theme_color: true })}
                  >
                    <span>ON</span>
                  </button>
                </div>
              </div>

              <div class="mizuna-row-divider" />

              {/* アイコン非表示 */}
              <div class="mizuna-setting-row">
                <div class="mizuna-setting-info">
                  <div class="mizuna-setting-title">アイコン画像を非表示にする</div>
                </div>
                <div class="mizuna-seg-pills">
                  <button
                    type="button"
                    id="is_visible_icon_false"
                    class={`mizuna-seg-pill ${
                      settings().is_visible_icon ? 'is-active' : ''
                    }`}
                    onClick={() => updateSettings({ is_visible_icon: true })}
                  >
                    <span>OFF</span>
                  </button>
                  <button
                    type="button"
                    id="is_visible_icon_true"
                    class={`mizuna-seg-pill ${
                      !settings().is_visible_icon ? 'is-active' : ''
                    }`}
                    onClick={() => updateSettings({ is_visible_icon: false })}
                  >
                    <span>ON</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* データ・メンテナンスグループ */}
          <div class="mizuna-setting-group">
            <div class="mizuna-group-label">アカウント同期 ＆ バックアップ</div>

            <div class="mizuna-setting-card">
              <Show when={hasPendingUpdate()}>
                <div class="mizuna-setting-row" style="background: color-mix(in srgb, var(--primary) 12%, transparent); border-radius: 14px; padding: 14px 16px; margin-bottom: 12px; border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent);">
                  <div class="mizuna-setting-info">
                    <div class="mizuna-setting-title" style="color: var(--primary); font-weight: 700; display: flex; align-items: center; gap: 6px;">
                      <i style="font-size: 20px;">system_update</i>
                      <span>新しいアップデートが待機中</span>
                    </div>
                    <div class="mizuna-setting-desc">
                      ダウンロード済みの最新バージョンがあります。「今すぐ適用」を押すと反映されます。
                    </div>
                  </div>
                  <button
                    type="button"
                    class="mizuna-btn mizuna-btn-primary"
                    onClick={applyPendingUpdate}
                  >
                    <i>restart_alt</i>
                    <span>今すぐ適用</span>
                  </button>
                </div>
              </Show>

              <div class="mizuna-setting-row">
                <div class="mizuna-setting-info">
                  <div class="mizuna-setting-title">全アカウント情報の同期</div>
                  <div class="mizuna-setting-desc">
                    登録済み全アカウントの最新プロフィール（名前・アイコン等）を取得します
                  </div>
                </div>
                <button
                  type="button"
                  class="sync_account_data mizuna-btn mizuna-btn-tonal"
                  disabled={isSyncingAccounts()}
                  onClick={syncAllAccounts}
                >
                  <i class={isSyncingAccounts() ? 'is-spinning' : ''}>sync</i>
                  <span>{isSyncingAccounts() ? '同期中...' : '全件同期'}</span>
                </button>
              </div>

              <div class="mizuna-row-divider" />

              <div class="mizuna-setting-row">
                <div class="mizuna-setting-info">
                  <div class="mizuna-setting-title">アカウントデータのエクスポート</div>
                </div>
                <button
                  type="button"
                  class="export_account_data mizuna-btn mizuna-btn-outline"
                  onClick={exportAccounts}
                >
                  <i>download</i>
                  <span>エクスポート</span>
                </button>
              </div>

              <div class="mizuna-row-divider" />

              <div class="mizuna-setting-row">
                <div class="mizuna-setting-info">
                  <div class="mizuna-setting-title">アプリのキャッシュクリア</div>
                </div>
                <button
                  type="button"
                  class="mizuna_clear_cache mizuna-btn mizuna-btn-outline"
                  onClick={handleClearCache}
                >
                  <i>refresh</i>
                  <span>再読み込み</span>
                </button>
              </div>

              <div class="mizuna-row-divider" />

              <div class="mizuna-setting-row">
                <div class="mizuna-setting-info">
                  <div class="mizuna-setting-title">最新バージョンの確認</div>
                  <div class="mizuna-setting-desc">PWA Service Worker のアップデートを確認します</div>
                </div>
                <button
                  type="button"
                  class="mizuna-btn mizuna-btn-outline"
                  onClick={checkForUpdate}
                >
                  <i>sync</i>
                  <span>更新を確認</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
