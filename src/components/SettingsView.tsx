import gsap from 'gsap';
import { createEffect, createSignal, For, onMount, Show } from 'solid-js';
import { useApp } from '../store/appStore';
import { SUPPORTED_LANGUAGES } from '../i18n';
import { applyCustomCss, sanitizeCustomCss } from '../utils/customCss';
import { safeSessionStorage } from '../utils/storage';

export function SettingsView() {
  const {
    currentUser,
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
  const [signatureValue, setSignatureValue] = createSignal(settings().signature_text ?? '');
  const [isSignatureDirty, setIsSignatureDirty] = createSignal(false);
  const [watermarkValue, setWatermarkValue] = createSignal(settings().watermark_text ?? '');
  const [isWatermarkDirty, setIsWatermarkDirty] = createSignal(false);

  createEffect(() => {
    if (!isSignatureDirty()) {
      setSignatureValue(settings().signature_text ?? '');
    }
  });

  createEffect(() => {
    if (!isWatermarkDirty()) {
      setWatermarkValue(settings().watermark_text ?? '');
    }
  });

  const defaultSignaturePlaceholder = () => {
    const user = currentUser();
    if (!user) return '@username@instance';
    return `@${user.username}@${user.address}`;
  };

  const defaultWatermarkPlaceholder = () => {
    const user = currentUser();
    if (!user) return 'DO NOT REPOST';
    return `DO NOT REPOST / @${user.username}`;
  };

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
        { opacity: 1, y: 0, duration: 0.28, ease: 'power3.out', clearProps: 'transform' }
      );
    }
  });

  const [isClearingCache, setIsClearingCache] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal('');

  const matches = (...keywords: (string | undefined | null)[]) => {
    const q = searchQuery().trim().toLowerCase();
    if (!q) return true;
    return keywords.some((k) => k && k.toLowerCase().includes(q));
  };

  // 1. 投稿設定
  const showPostVisibility = () => matches(t('settings.group_post'), t('settings.default_visibility'), t('settings.visibility_public'), t('settings.visibility_home'), t('settings.visibility_followers'), '公開範囲', 'visibility');
  const showAppendMizuna = () => matches(t('settings.group_post'), t('settings.append_mizuna'), 'from mizuna', 'ミズナ');
  const showGroupPost = () => showPostVisibility() || showAppendMizuna();

  // 2. 画像署名設定
  const showSignaturePos = () => matches(t('settings.group_signature'), t('settings.signature_auto_position'), t('settings.signature_auto_position_desc'), t('settings.signature_pos_none'), t('settings.signature_pos_bottom_right'), t('settings.signature_pos_bottom_left'), t('settings.signature_pos_top_right'), t('settings.signature_pos_top_left'), '署名', 'クレジット', 'signature', 'credit');
  const showSignatureText = () => matches(t('settings.group_signature'), t('settings.signature_setting'), t('settings.signature_setting_desc'), '署名文字', 'クレジット文字');
  const showGroupSignature = () => showSignaturePos() || showSignatureText();

  // 3. 盗作防止透かし設定
  const showWatermarkEnabled = () => matches(t('settings.group_watermark'), t('settings.watermark_auto_enabled'), t('settings.watermark_auto_enabled_desc'), '透かし', '盗作防止', 'ウォーターマーク', 'watermark');
  const showWatermarkPattern = () => matches(t('settings.group_watermark'), t('settings.watermark_pattern_setting'), t('settings.watermark_pattern_diagonal'), t('settings.watermark_pattern_grid'), t('settings.watermark_pattern_center_huge'), 'パターン', 'pattern');
  const showWatermarkText = () => matches(t('settings.group_watermark'), t('settings.watermark_setting'), t('settings.watermark_setting_desc'), '透かし文字');
  const showGroupWatermark = () => showWatermarkEnabled() || showWatermarkPattern() || showWatermarkText();

  // 4. 外観・テーマ設定
  const showUiMode = () => matches(t('settings.group_appearance'), t('settings.ui_mode'), t('settings.ui_mode_desc'), t('settings.ui_mode_normal'), t('settings.ui_mode_large'), t('settings.ui_mode_medium'), t('settings.ui_mode_small'), t('settings.ui_mode_simple'), '表示サイズ', 'サイズ', 'scale', 'ui mode');
  const showColorMode = () => matches(t('settings.group_appearance'), t('settings.color_mode'), t('settings.color_light'), t('settings.color_auto'), t('settings.color_dark'), 'ダークモード', 'dark mode', 'ライト', 'ダーク', 'テーマ', 'theme');
  const showPickTheme = () => matches(t('settings.group_appearance'), t('settings.pick_theme_color'), 'テーマカラー', 'theme color', '抽出');
  const showHideAvatar = () => matches(t('settings.group_appearance'), t('settings.hide_avatar'), 'アイコン', 'アバター', 'avatar');
  const showGroupAppearance = () => showUiMode() || showColorMode() || showPickTheme() || showHideAvatar();

  // 5. 言語設定
  const showLanguage = () => matches(t('settings.group_language'), t('settings.language'), t('settings.language_desc'), '言語', 'language', '日本語', 'English');
  const showGroupLanguage = () => showLanguage();

  // 6. データ・同期設定
  const showPendingUpdate = () => hasPendingUpdate() && matches(t('settings.group_sync_backup'), t('update.pending_title'), t('update.pending_desc'), 'アップデート', '更新', 'update');
  const showSyncAll = () => matches(t('settings.group_sync_backup'), t('settings.sync_all'), t('settings.sync_all_desc'), t('settings.sync_button'), '同期', 'sync');
  const showExport = () => matches(t('settings.group_sync_backup'), t('settings.export_data'), t('settings.export_button'), 'エクスポート', 'export', 'バックアップ', 'backup');
  const showClearCache = () => matches(t('settings.group_sync_backup'), t('settings.clear_cache'), t('settings.clear_cache_desc'), t('settings.reload_button'), 'キャッシュ', 'cache', 'クリア', 'clear');
  const showCheckUpdate = () => matches(t('settings.group_sync_backup'), t('settings.check_update'), t('settings.check_update_desc'), t('settings.check_button'), 'アップデート', '更新', 'update');
  const showGroupSyncBackup = () => showPendingUpdate() || showSyncAll() || showExport() || showClearCache() || showCheckUpdate();

  // 7. カスタムCSS
  const showCustomCss = () => matches(t('settings.group_custom_css'), t('settings.custom_css'), t('settings.custom_css_desc'), 'カスタムcss', 'custom css', 'スタイル', 'style');
  const showGroupCustomCss = () => showCustomCss();

  const hasAnyMatch = () =>
    showGroupPost() ||
    showGroupSignature() ||
    showGroupWatermark() ||
    showGroupAppearance() ||
    showGroupLanguage() ||
    showGroupSyncBackup() ||
    showGroupCustomCss();

  const handleClearCache = async () => {
    if (isClearingCache()) return;
    setIsClearingCache(true);

    try {
      // 1. Service Worker の登録をすべて解除 (Android 等のバックグラウンドプロセスを完全にリセット)
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((reg) => reg.unregister()));
        } catch (swErr) {
          console.warn('Service Worker unregister failed:', swErr);
        }
      }

      // 2. CacheStorage 内の全キャッシュを完全消去
      if (typeof caches !== 'undefined') {
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        } catch (cacheErr) {
          console.warn('CacheStorage delete failed:', cacheErr);
        }
      }

      // 3. 一時セッションデータを消去 (※ アカウント情報等の IndexedDB は保持)
      safeSessionStorage.clear();

      // 4. ブラウザの HTTP キャッシュをバイパスして最新状態をサーバーからダイレクト再取得
      const url = new URL(window.location.href);
      url.searchParams.set('reload', Date.now().toString());
      window.location.replace(url.toString());
    } catch (e) {
      console.error('Clear cache failed:', e);
      window.location.reload();
    }
  };

  return (
    <div ref={panelRef} class="mizuna-settings-view">
      <div class="mizuna-section-header">
        <div>
          <h2 class="mizuna-section-title">{t('settings.title')}</h2>
        </div>
      </div>

      <div class="mizuna-settings-search-wrap">
        <div class="mizuna-settings-search-bar">
          <i class="mizuna-search-icon">search</i>
          <input
            type="text"
            id="settings_search_input"
            class="mizuna-settings-search-input"
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            placeholder={t('settings.search_placeholder') || '設定を検索...'}
            aria-label={t('settings.search_placeholder') || '設定を検索'}
          />
          <Show when={searchQuery().trim().length > 0}>
            <button
              type="button"
              class="mizuna-search-clear-btn"
              onClick={() => setSearchQuery('')}
              title={t('settings.search_clear') || 'クリア'}
              aria-label={t('settings.search_clear') || 'クリア'}
            >
              <i>close</i>
            </button>
          </Show>
        </div>
      </div>

      <div class="mizuna-settings-panel">
        <div class="cp_tabpanel tab1" id="first_tab">
          {/* 該当なし空状態 */}
          <Show when={!hasAnyMatch()}>
            <div class="mizuna-settings-empty">
              <i class="mizuna-empty-icon">search_off</i>
              <div class="mizuna-empty-title">{t('settings.search_no_results') || '一致する設定が見つかりません'}</div>
              <button
                type="button"
                class="mizuna-btn mizuna-btn-outline"
                onClick={() => setSearchQuery('')}
              >
                <i>refresh</i>
                <span>{t('settings.search_clear') || '検索をクリア'}</span>
              </button>
            </div>
          </Show>

          {/* 投稿設定グループ */}
          <Show when={showGroupPost()}>
            <div class="mizuna-setting-group">
              <div class="mizuna-group-label">{t('settings.group_post')}</div>

              <div class="mizuna-setting-card">
                {/* デフォルト投稿範囲 */}
                <Show when={showPostVisibility()}>
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
                </Show>

                {/* (from Mizuna) 付与 */}
                <Show when={showAppendMizuna()}>
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
                </Show>
              </div>
            </div>
          </Show>

          {/* 画像署名（クレジット）設定グループ */}
          <Show when={showGroupSignature()}>
            <div class="mizuna-setting-group">
              <div class="mizuna-group-label">{t('settings.group_signature')}</div>

              <div class="mizuna-setting-card">
                {/* 画像への署名（クレジット）付与 */}
                <Show when={showSignaturePos()}>
                  <div class="mizuna-setting-row">
                    <div class="mizuna-setting-info">
                      <div class="mizuna-setting-title">{t('settings.signature_auto_position')}</div>
                      <div class="mizuna-setting-desc">{t('settings.signature_auto_position_desc')}</div>
                    </div>
                    <div class="mizuna-seg-pills mizuna-seg-pills-wrap">
                      <button
                        type="button"
                        class={`mizuna-seg-pill ${(settings().signature_position ?? 'none') === 'none' ? 'is-active' : ''}`}
                        onClick={() => updateSettings({ signature_position: 'none' })}
                      >
                        <span>{t('settings.signature_pos_none')}</span>
                      </button>
                      <button
                        type="button"
                        class={`mizuna-seg-pill ${settings().signature_position === 'bottom-right' ? 'is-active' : ''}`}
                        onClick={() => updateSettings({ signature_position: 'bottom-right' })}
                      >
                        <span>{t('settings.signature_pos_bottom_right')}</span>
                      </button>
                      <button
                        type="button"
                        class={`mizuna-seg-pill ${settings().signature_position === 'bottom-left' ? 'is-active' : ''}`}
                        onClick={() => updateSettings({ signature_position: 'bottom-left' })}
                      >
                        <span>{t('settings.signature_pos_bottom_left')}</span>
                      </button>
                      <button
                        type="button"
                        class={`mizuna-seg-pill ${settings().signature_position === 'top-right' ? 'is-active' : ''}`}
                        onClick={() => updateSettings({ signature_position: 'top-right' })}
                      >
                        <span>{t('settings.signature_pos_top_right')}</span>
                      </button>
                      <button
                        type="button"
                        class={`mizuna-seg-pill ${settings().signature_position === 'top-left' ? 'is-active' : ''}`}
                        onClick={() => updateSettings({ signature_position: 'top-left' })}
                      >
                        <span>{t('settings.signature_pos_top_left')}</span>
                      </button>
                    </div>
                  </div>
                </Show>

                {/* 画像の署名文字 */}
                <Show when={showSignatureText()}>
                  <div class="mizuna-setting-col" style={{ "margin-top": "12px" }}>
                    <div class="mizuna-setting-info">
                      <div class="mizuna-setting-title">{t('settings.signature_setting')}</div>
                      <div class="mizuna-setting-desc">{t('settings.signature_setting_desc')}</div>
                    </div>
                    <div class="mizuna-watermark-input-wrap">
                      <input
                        type="text"
                        id="settings_signature_text"
                        class="mizuna-watermark-input"
                        value={signatureValue()}
                        placeholder={defaultSignaturePlaceholder()}
                        onInput={(e) => {
                          setIsSignatureDirty(true);
                          setSignatureValue(e.currentTarget.value);
                        }}
                        onBlur={async () => {
                          setIsSignatureDirty(false);
                          await updateSettings({ signature_text: signatureValue().trim() });
                        }}
                      />
                      <Show when={signatureValue()}>
                        <button
                          type="button"
                          class="mizuna-btn mizuna-btn-tonal mizuna-watermark-clear-btn"
                          title="リセット (デフォルトに戻す)"
                          onClick={async () => {
                            setSignatureValue('');
                            setIsSignatureDirty(false);
                            await updateSettings({ signature_text: '' });
                          }}
                        >
                          <i>clear</i>
                          <span>リセット</span>
                        </button>
                      </Show>
                    </div>
                  </div>
                </Show>
              </div>
            </div>
          </Show>

          {/* 盗作防止透かし設定グループ */}
          <Show when={showGroupWatermark()}>
            <div class="mizuna-setting-group">
              <div class="mizuna-group-label">{t('settings.group_watermark')}</div>

              <div class="mizuna-setting-card">
                {/* 盗作防止透かしの自動付与 (ON/OFF) */}
                <Show when={showWatermarkEnabled()}>
                  <div class="mizuna-setting-row">
                    <div class="mizuna-setting-info">
                      <div class="mizuna-setting-title">{t('settings.watermark_auto_enabled')}</div>
                      <div class="mizuna-setting-desc">{t('settings.watermark_auto_enabled_desc')}</div>
                    </div>
                    <div class="mizuna-seg-pills">
                      <button
                        type="button"
                        class={`mizuna-seg-pill ${!settings().watermark_enabled ? 'is-active' : ''}`}
                        onClick={() => updateSettings({ watermark_enabled: false })}
                      >
                        <span>OFF</span>
                      </button>
                      <button
                        type="button"
                        class={`mizuna-seg-pill ${settings().watermark_enabled ? 'is-active' : ''}`}
                        onClick={() => updateSettings({ watermark_enabled: true })}
                      >
                        <span>ON</span>
                      </button>
                    </div>
                  </div>
                </Show>

                {/* 盗作防止透かしパターン */}
                <Show when={showWatermarkPattern()}>
                  <div class="mizuna-setting-row" style={{ "margin-top": "12px" }}>
                    <div class="mizuna-setting-info">
                      <div class="mizuna-setting-title">{t('settings.watermark_pattern_setting')}</div>
                    </div>
                    <div class="mizuna-seg-pills">
                      <button
                        type="button"
                        class={`mizuna-seg-pill ${(settings().watermark_pattern ?? 'diagonal') === 'diagonal' ? 'is-active' : ''}`}
                        onClick={() => updateSettings({ watermark_pattern: 'diagonal' })}
                      >
                        <span>{t('settings.watermark_pattern_diagonal')}</span>
                      </button>
                      <button
                        type="button"
                        class={`mizuna-seg-pill ${settings().watermark_pattern === 'grid' ? 'is-active' : ''}`}
                        onClick={() => updateSettings({ watermark_pattern: 'grid' })}
                      >
                        <span>{t('settings.watermark_pattern_grid')}</span>
                      </button>
                      <button
                        type="button"
                        class={`mizuna-seg-pill ${settings().watermark_pattern === 'center-huge' ? 'is-active' : ''}`}
                        onClick={() => updateSettings({ watermark_pattern: 'center-huge' })}
                      >
                        <span>{t('settings.watermark_pattern_center_huge')}</span>
                      </button>
                    </div>
                  </div>
                </Show>

                {/* 盗作防止透かし文字 */}
                <Show when={showWatermarkText()}>
                  <div class="mizuna-setting-col" style={{ "margin-top": "12px" }}>
                    <div class="mizuna-setting-info">
                      <div class="mizuna-setting-title">{t('settings.watermark_setting')}</div>
                      <div class="mizuna-setting-desc">{t('settings.watermark_setting_desc')}</div>
                    </div>
                    <div class="mizuna-watermark-input-wrap">
                      <input
                        type="text"
                        id="settings_watermark_text"
                        class="mizuna-watermark-input"
                        value={watermarkValue()}
                        placeholder={defaultWatermarkPlaceholder()}
                        onInput={(e) => {
                          setIsWatermarkDirty(true);
                          setWatermarkValue(e.currentTarget.value);
                        }}
                        onBlur={async () => {
                          setIsWatermarkDirty(false);
                          await updateSettings({ watermark_text: watermarkValue().trim() });
                        }}
                      />
                      <Show when={watermarkValue()}>
                        <button
                          type="button"
                          class="mizuna-btn mizuna-btn-tonal mizuna-watermark-clear-btn"
                          title="リセット (デフォルトに戻す)"
                          onClick={async () => {
                            setWatermarkValue('');
                            setIsWatermarkDirty(false);
                            await updateSettings({ watermark_text: '' });
                          }}
                        >
                          <i>clear</i>
                          <span>リセット</span>
                        </button>
                      </Show>
                    </div>
                  </div>
                </Show>
              </div>
            </div>
          </Show>

          {/* 外観・テーマ設定グループ */}
          <Show when={showGroupAppearance()}>
            <div class="mizuna-setting-group">
              <div class="mizuna-group-label">{t('settings.group_appearance')}</div>

              <div class="mizuna-setting-card">
                {/* 表示サイズ (通常 / 大 / 中 / 小 / シンプル) */}
                <Show when={showUiMode()}>
                  <div class="mizuna-setting-row">
                    <div class="mizuna-setting-info">
                      <div class="mizuna-setting-title">{t('settings.ui_mode')}</div>
                      <div class="mizuna-setting-desc">{t('settings.ui_mode_desc')}</div>
                    </div>
                    <div class="mizuna-seg-pills mizuna-seg-pills-wrap">
                      <button
                        type="button"
                        id="ui_mode_normal"
                        class={`mizuna-seg-pill ${
                          (settings().ui_mode ?? 1) === 1 ? 'is-active' : ''
                        }`}
                        onClick={() => updateSettings({ ui_mode: 1 })}
                      >
                        <i>aspect_ratio</i>
                        <span>{t('settings.ui_mode_normal')}</span>
                      </button>
                      <button
                        type="button"
                        id="ui_mode_large"
                        class={`mizuna-seg-pill ${
                          settings().ui_mode === 3 ? 'is-active' : ''
                        }`}
                        onClick={() => updateSettings({ ui_mode: 3 })}
                      >
                        <i>zoom_in</i>
                        <span>{t('settings.ui_mode_large')}</span>
                      </button>
                      <button
                        type="button"
                        id="ui_mode_medium"
                        class={`mizuna-seg-pill ${
                          settings().ui_mode === 4 ? 'is-active' : ''
                        }`}
                        onClick={() => updateSettings({ ui_mode: 4 })}
                      >
                        <i>text_fields</i>
                        <span>{t('settings.ui_mode_medium')}</span>
                      </button>
                      <button
                        type="button"
                        id="ui_mode_small"
                        class={`mizuna-seg-pill ${
                          settings().ui_mode === 5 ? 'is-active' : ''
                        }`}
                        onClick={() => updateSettings({ ui_mode: 5 })}
                      >
                        <i>zoom_out</i>
                        <span>{t('settings.ui_mode_small')}</span>
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
                </Show>

                {/* ダークモード */}
                <Show when={showColorMode()}>
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
                </Show>

                {/* ダイナミックテーマカラー */}
                <Show when={showPickTheme()}>
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
                </Show>

                {/* アイコン非表示 */}
                <Show when={showHideAvatar()}>
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
                </Show>
              </div>
            </div>
          </Show>

          {/* 言語設定グループ */}
          <Show when={showGroupLanguage()}>
            <div class="mizuna-setting-group">
              <div class="mizuna-group-label">{t('settings.group_language')}</div>

              <div class="mizuna-setting-card">
                <Show when={showLanguage()}>
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
                </Show>
              </div>
            </div>
          </Show>

          {/* データ・メンテナンスグループ */}
          <Show when={showGroupSyncBackup()}>
            <div class="mizuna-setting-group">
              <div class="mizuna-group-label">{t('settings.group_sync_backup')}</div>

              <div class="mizuna-setting-card">
                <Show when={showPendingUpdate()}>
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

                <Show when={showSyncAll()}>
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
                </Show>

                <Show when={showExport()}>
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
                </Show>

                <Show when={showClearCache()}>
                  <div class="mizuna-setting-row">
                    <div class="mizuna-setting-info">
                      <div class="mizuna-setting-title">{t('settings.clear_cache')}</div>
                      <div class="mizuna-setting-desc">{t('settings.clear_cache_desc')}</div>
                    </div>
                    <button
                      type="button"
                      class="mizuna_clear_cache mizuna-btn mizuna-btn-outline"
                      onClick={handleClearCache}
                      disabled={isClearingCache()}
                    >
                      <i class={isClearingCache() ? 'is-spinning' : ''}>refresh</i>
                      <span>{isClearingCache() ? (t('settings.syncing') || 'クリア中...') : t('settings.reload_button')}</span>
                    </button>
                  </div>
                </Show>

                <Show when={showCheckUpdate()}>
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
                </Show>
              </div>
            </div>
          </Show>

          {/* カスタムCSSグループ（最下部に別枠で配置・警戒枠表示） */}
          <Show when={showGroupCustomCss()}>
            <div class="mizuna-setting-group">
              <div class="mizuna-group-label">{t('settings.group_custom_css')}</div>

              <div class="mizuna-setting-card mizuna-setting-card-warning">
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
          </Show>
        </div>
      </div>
    </div>
  );
}
