import gsap from 'gsap';
import { onMount } from 'solid-js';
import { useApp } from '../store/appStore';

export function SettingsView() {
  const { settings, updateSettings, syncCurrentAccount, exportAccounts } = useApp();
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

  const handleClearCache = () => {
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
                      settings().default_visibility === 1 ? 'active is-active' : ''
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
                      settings().default_visibility === 2 ? 'active is-active' : ''
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
                      settings().default_visibility === 3 ? 'active is-active' : ''
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
                      !settings().is_note_end_mizuna ? 'active is-active' : ''
                    }`}
                    onClick={() => updateSettings({ is_note_end_mizuna: false })}
                  >
                    <span>OFF</span>
                  </button>
                  <button
                    type="button"
                    id="is_note_end_mizuna_true"
                    class={`mizuna-seg-pill ${
                      settings().is_note_end_mizuna ? 'active is-active' : ''
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
                      settings().is_darkmode === 1 ? 'active is-active' : ''
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
                      settings().is_darkmode === 2 ? 'active is-active' : ''
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
                      settings().is_darkmode === 3 ? 'active is-active' : ''
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
                      !settings().is_pick_theme_color ? 'active is-active' : ''
                    }`}
                    onClick={() => updateSettings({ is_pick_theme_color: false })}
                  >
                    <span>OFF</span>
                  </button>
                  <button
                    type="button"
                    id="is_get_icon_keycolor_true"
                    class={`mizuna-seg-pill ${
                      settings().is_pick_theme_color ? 'active is-active' : ''
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
                      settings().is_visible_icon ? 'active is-active' : ''
                    }`}
                    onClick={() => updateSettings({ is_visible_icon: true })}
                  >
                    <span>OFF</span>
                  </button>
                  <button
                    type="button"
                    id="is_visible_icon_true"
                    class={`mizuna-seg-pill ${
                      !settings().is_visible_icon ? 'active is-active' : ''
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
              <div class="mizuna-setting-row">
                <div class="mizuna-setting-info">
                  <div class="mizuna-setting-title">アカウント情報の同期</div>
                </div>
                <button
                  type="button"
                  class="sync_account_data mizuna-btn mizuna-btn-tonal"
                  onClick={syncCurrentAccount}
                >
                  <i>sync</i>
                  <span>同期する</span>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
