import gsap from 'gsap';
import { createEffect, createSignal, For, onMount, Show } from 'solid-js';
import { useApp } from '../store/appStore';
import { SUPPORTED_LANGUAGES } from '../i18n';
import { applyCustomCss, sanitizeCustomCss } from '../utils/customCss';

export function SettingsView() {
  const {
    settings,
    updateSettings,
    isSyncingAccounts,
    syncAllAccounts,
    exportAccounts,
    hasPendingUpdate,
    isCheckingUpdate,
    applyPendingUpdate,
    checkForUpdate,
    showToast,
    t,
  } = useApp();
  let panelRef: HTMLDivElement | undefined;

  const [customCssValue, setCustomCssValue] = createSignal(settings().custom_css ?? '');
  const [cssWarnings, setCssWarnings] = createSignal<string[]>([]);
  const [isCssDirty, setIsCssDirty] = createSignal(false);

  createEffect(() => {
    // 外部から設定が更新された場合にシグナルと同期（編集中でない場合）
    if (!isCssDirty()) {
      setCustomCssValue(settings().custom_css ?? '');
    }
  });

  const handleSaveCustomCss = async () => {
    const raw = customCssValue();
    const { sanitizedCss, warnings } = sanitizeCustomCss(raw);
    setCssWarnings(warnings);
    applyCustomCss(sanitizedCss);
    await updateSettings({ custom_css: sanitizedCss });
    setCustomCssValue(sanitizedCss);
    setIsCssDirty(false);

    if (warnings.length > 0) {
      showToast(t('settings.custom_css_warning'), 'warning');
    } else {
      showToast(t('settings.custom_css_saved'), 'success');
    }
  };

  const handleClearCustomCss = async () => {
    setCustomCssValue('');
    setCssWarnings([]);
    setIsCssDirty(false);
    applyCustomCss('');
    await updateSettings({ custom_css: '' });
    showToast(t('settings.custom_css_saved'), 'success');
  };

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
          <h2 class="mizuna-section-title">{t('settings.title')}</h2>
        </div>
      </div>

      <div class="mizuna-settings-panel">
        <div class="cp_tabpanel tab1" id="first_tab">
          {/* 投稿設定グループ */}
          <div class="mizuna-setting-group">
            <div class="mizuna-group-label">{t('settings.group_post')}</div>

            <div class="mizuna-setting-card">
              {/* デフォルト投稿範囲 */}
              <div class="mizuna-setting-row">
                <div class="mizuna-setting-info">
                  <div class="mizuna-setting-title">{t('settings.default_visibility')}</div>
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
                    <span>{t('settings.visibility_public')}</span>
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
                    <span>{t('settings.visibility_home')}</span>
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
                    <span>{t('settings.visibility_followers')}</span>
                  </button>
                </div>
              </div>

              <div class="mizuna-row-divider" />

              {/* (from Mizuna) 付与 */}
              <div class="mizuna-setting-row">
                <div class="mizuna-setting-info">
                  <div class="mizuna-setting-title">{t('settings.append_mizuna')}</div>
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
            <div class="mizuna-group-label">{t('settings.group_appearance')}</div>

            <div class="mizuna-setting-card">
              {/* 表示モード (通常 / シンプル) */}
              <div class="mizuna-setting-row">
                <div class="mizuna-setting-info">
                  <div class="mizuna-setting-title">{t('settings.ui_mode')}</div>
                  <div class="mizuna-setting-desc">{t('settings.ui_mode_desc')}</div>
                </div>
                <div class="mizuna-seg-pills">
                  <button
                    type="button"
                    id="ui_mode_standard"
                    class={`mizuna-seg-pill ${
                      settings().ui_mode !== 2 ? 'is-active' : ''
                    }`}
                    onClick={() => updateSettings({ ui_mode: 1 })}
                  >
                    <i>view_agenda</i>
                    <span>{t('settings.ui_mode_standard')}</span>
                  </button>
                  <button
                    type="button"
                    id="ui_mode_simple"
                    class={`mizuna-seg-pill ${
                      settings().ui_mode === 2 ? 'is-active' : ''
                    }`}
                    onClick={() => updateSettings({ ui_mode: 2 })}
                  >
                    <i>space_dashboard</i>
                    <span>{t('settings.ui_mode_simple')}</span>
                  </button>
                </div>
              </div>

              <div class="mizuna-row-divider" />

              {/* ダークモード */}
              <div class="mizuna-setting-row">
                <div class="mizuna-setting-info">
                  <div class="mizuna-setting-title">{t('settings.color_mode')}</div>
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
                    <span>{t('settings.color_light')}</span>
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
                    <span>{t('settings.color_auto')}</span>
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
                    <span>{t('settings.color_dark')}</span>
                  </button>
                </div>
              </div>

              <div class="mizuna-row-divider" />

              {/* ダイナミックテーマカラー */}
              <div class="mizuna-setting-row">
                <div class="mizuna-setting-info">
                  <div class="mizuna-setting-title">{t('settings.pick_theme_color')}</div>
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
                  <div class="mizuna-setting-title">{t('settings.hide_avatar')}</div>
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

          {/* 言語設定グループ */}
          <div class="mizuna-setting-group">
            <div class="mizuna-group-label">{t('settings.group_language')}</div>

            <div class="mizuna-setting-card">
              <div class="mizuna-setting-row">
                <div class="mizuna-setting-info">
                  <div class="mizuna-setting-title">{t('settings.language')}</div>
                  <div class="mizuna-setting-desc">{t('settings.language_desc')}</div>
                </div>

                <div class="mizuna-select-wrapper">
                  <select
                    id="settings_language"
                    class="mizuna-select"
                    value={settings().language}
                    onChange={(e) => updateSettings({ language: e.currentTarget.value as any })}
                    aria-label={t('settings.language')}
                  >
                    <For each={SUPPORTED_LANGUAGES}>
                      {(lang) => (
                        <option value={lang.code} selected={settings().language === lang.code}>
                          {lang.label}
                        </option>
                      )}
                    </For>
                  </select>
                  <i class="mizuna-select-arrow" aria-hidden="true">
                    expand_more
                  </i>
                </div>
              </div>
            </div>
          </div>

          {/* データ・メンテナンスグループ */}
          <div class="mizuna-setting-group">
            <div class="mizuna-group-label">{t('settings.group_sync_backup')}</div>

            <div class="mizuna-setting-card">
              <Show when={hasPendingUpdate()}>
                <div class="mizuna-setting-row" style="background: color-mix(in srgb, var(--primary) 12%, transparent); border-radius: 14px; padding: 14px 16px; margin-bottom: 12px; border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent);">
                  <div class="mizuna-setting-info">
                    <div class="mizuna-setting-title" style="color: var(--primary); font-weight: 700; display: flex; align-items: center; gap: 6px;">
                      <i style="font-size: 20px;">system_update</i>
                      <span>{t('update.pending_title')}</span>
                    </div>
                    <div class="mizuna-setting-desc">
                      {t('update.pending_desc')}
                    </div>
                  </div>
                  <button
                    type="button"
                    class="mizuna-btn mizuna-btn-primary"
                    onClick={applyPendingUpdate}
                  >
                    <i>restart_alt</i>
                    <span>{t('update.apply_now')}</span>
                  </button>
                </div>
              </Show>

              <div class="mizuna-setting-row">
                <div class="mizuna-setting-info">
                  <div class="mizuna-setting-title">{t('settings.sync_all')}</div>
                  <div class="mizuna-setting-desc">
                    {t('settings.sync_all_desc')}
                  </div>
                </div>
                <button
                  type="button"
                  class="sync_account_data mizuna-btn mizuna-btn-tonal"
                  disabled={isSyncingAccounts()}
                  onClick={syncAllAccounts}
                >
                  <i class={isSyncingAccounts() ? 'is-spinning' : ''}>sync</i>
                  <span>{isSyncingAccounts() ? t('settings.syncing') : t('settings.sync_button')}</span>
                </button>
              </div>

              <div class="mizuna-row-divider" />

              <div class="mizuna-setting-row">
                <div class="mizuna-setting-info">
                  <div class="mizuna-setting-title">{t('settings.export_data')}</div>
                </div>
                <button
                  type="button"
                  class="export_account_data mizuna-btn mizuna-btn-outline"
                  onClick={exportAccounts}
                >
                  <i>download</i>
                  <span>{t('settings.export_button')}</span>
                </button>
              </div>

              <div class="mizuna-row-divider" />

              <div class="mizuna-setting-row">
                <div class="mizuna-setting-info">
                  <div class="mizuna-setting-title">{t('settings.clear_cache')}</div>
                </div>
                <button
                  type="button"
                  class="mizuna_clear_cache mizuna-btn mizuna-btn-outline"
                  onClick={handleClearCache}
                >
                  <i>refresh</i>
                  <span>{t('settings.reload_button')}</span>
                </button>
              </div>

              <div class="mizuna-row-divider" />

              <div class="mizuna-setting-row">
                <div class="mizuna-setting-info">
                  <div class="mizuna-setting-title">{t('settings.check_update')}</div>
                  <div class="mizuna-setting-desc">{t('settings.check_update_desc')}</div>
                </div>
                <button
                  type="button"
                  class="mizuna-btn mizuna-btn-outline"
                  disabled={isCheckingUpdate()}
                  onClick={checkForUpdate}
                >
                  <i class={isCheckingUpdate() ? 'is-spinning' : ''}>sync</i>
                  <span>{isCheckingUpdate() ? t('update.checking') : t('settings.check_button')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* カスタムCSSグループ（サポート対象外・最下部に別枠で配置） */}
          <div class="mizuna-setting-group">
            <div class="mizuna-group-label" style="display: flex; align-items: center; gap: 6px;">
              <span>{t('settings.group_custom_css')}</span>
            </div>

            <div class="mizuna-setting-card">
              <div class="mizuna-setting-col">
                <div class="mizuna-setting-info">
                  <div class="mizuna-setting-title">{t('settings.custom_css')}</div>
                  <div class="mizuna-setting-desc">{t('settings.custom_css_desc')}</div>
                </div>

                <div class="mizuna-custom-css-wrapper">
                  <textarea
                    id="settings_custom_css"
                    class="mizuna-custom-css-textarea"
                    placeholder={t('settings.custom_css_placeholder')}
                    value={customCssValue()}
                    onInput={(e) => {
                      setCustomCssValue(e.currentTarget.value);
                      setIsCssDirty(true);
                    }}
                    rows={6}
                    spellcheck={false}
                    aria-label={t('settings.custom_css')}
                  />

                  <Show when={cssWarnings().length > 0}>
                    <div class="mizuna-custom-css-warnings">
                      <i class="mizuna-warning-icon">warning</i>
                      <div class="mizuna-warning-list">
                        <For each={cssWarnings()}>
                          {(w) => <div class="mizuna-warning-item">{w}</div>}
                        </For>
                      </div>
                    </div>
                  </Show>

                  <div class="mizuna-custom-css-actions">
                    <button
                      type="button"
                      id="save_custom_css"
                      class="mizuna-btn mizuna-btn-primary"
                      onClick={handleSaveCustomCss}
                    >
                      <i>save</i>
                      <span>{t('settings.custom_css_save')}</span>
                    </button>
                    <button
                      type="button"
                      id="clear_custom_css"
                      class="mizuna-btn mizuna-btn-outline"
                      onClick={handleClearCustomCss}
                      disabled={!customCssValue() && !settings().custom_css}
                    >
                      <i>delete</i>
                      <span>{t('settings.custom_css_clear')}</span>
                    </button>
                  </div>

                  <div class="mizuna-custom-css-disclaimer">
                    {t('settings.custom_css_disclaimer')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
