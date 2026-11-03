import gsap from 'gsap';
import { For, onMount, onCleanup, Show } from 'solid-js';
import { mizuna_options, mizuna_share } from '../config/mizunaOptions';
import { useApp } from '../store/appStore';
import { FloatingBackButton } from './FloatingBackButton';

const OSS_LICENSES = [
  {
    name: 'Solid.js',
    license: 'MIT License',
    copyright: 'Copyright (c) 2016-2025 Ryan Carniato',
    url: 'https://www.solidjs.com/',
  },
  {
    name: 'GSAP (GreenSock Animation Platform)',
    license: 'Standard "No Charge" GreenSock License',
    copyright: 'Copyright (c) GreenSock, Inc.',
    url: 'https://gsap.com/',
  },
  {
    name: 'BeerCSS & Material Dynamic Colors',
    license: 'MIT License',
    copyright: 'Copyright (c) 2021 Everton',
    url: 'https://www.beercss.com/',
  },
  {
    name: 'Dexie.js',
    license: 'Apache-2.0 License',
    copyright: '© 2014-2025 Dexie.js',
    url: 'https://dexie.org/',
  },
  {
    name: 'mfm-js',
    license: 'MIT License',
    copyright: 'Copyright (c) Marihachi / misskey-dev',
    url: 'https://github.com/misskey-dev/mfm.js',
    description: 'Misskey公式 MFM (Misskey Flavored Markdown) パーサー',
  },
  {
    name: 'Misskey (MFM Animations & Spec)',
    license: 'AGPL-3.0 (Reference & Compatibility)',
    copyright: 'Copyright (c) syuilo and misskey-project',
    url: 'https://github.com/misskey-dev/misskey',
    description: 'MFM アニメーション仕様およびキーフレーム定義の準拠・参照',
  },
  {
    name: 'pulltorefreshjs',
    license: 'MIT License',
    copyright: 'Copyright (c) 2017 Rafael Soto',
    url: 'https://www.npmjs.com/package/pulltorefreshjs',
  },
  {
    name: 'IBM Plex Sans JP',
    license: 'OFL-1.1 License',
    copyright: 'Copyright © 2017 IBM Corp. with Reserved Font Name "Plex"',
  },
  {
    name: 'Google Fonts / Material Symbols',
    license: 'SIL Open Font License / Apache-2.0 License',
    copyright: 'Google LLC',
  },
];

export function AboutView() {
  const {
    accounts,
    setCurrentView,
    showToast,
    hasPendingUpdate,
    availableUpdateVersion,
    applyPendingUpdate,
    checkForUpdate,
    isCheckingUpdate,
    updateCheckStatus,
    resetUpdateCheckStatus,
    t,
  } = useApp();
  let containerRef: HTMLDivElement | undefined;

  onMount(() => {
    resetUpdateCheckStatus();
    if (containerRef) {
      gsap.fromTo(
        containerRef,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.28, ease: 'power3.out', clearProps: 'transform' }
      );
    }
  });

  onCleanup(() => {
    resetUpdateCheckStatus();
  });

  const handleBack = () => {
    setCurrentView(accounts().length > 0 ? 'note' : 'add_account');
  };

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share(mizuna_share);
      } catch {
        // キャンセル時は無視
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(`${mizuna_share.title} - ${mizuna_share.url}`);
      showToast('共有URLをクリップボードにコピーしました', 'info');
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <div ref={containerRef} class="mizuna-about-view">
      <div class="mizuna-section-header">
        <div>
          <h2 class="mizuna-section-title">Mizunaについて</h2>
        </div>
      </div>

      {/* ヒーロープロフィールカード */}
      <div class="mizuna-about-hero">
        <img src="/icon.png" alt="Mizuna" class="mizuna-about-logo" decoding="async" />
        <div class="mizuna-about-hero-text">
          <div class="mizuna-about-title-row">
            <h3>{mizuna_options.app_name}</h3>
            <span id="mizuna_version_span" class="mizuna-version-pill">
              v{mizuna_options.mizuna_version}
            </span>
          </div>
          <Show when={hasPendingUpdate()}>
            <div style="margin-top: 6px;">
              <button
                type="button"
                class="mizuna-btn mizuna-btn-tonal"
                style="padding: 0 14px; height: 32px; font-size: 0.8rem; gap: 4px;"
                onClick={applyPendingUpdate}
              >
                <i>system_update</i>
                <span>{availableUpdateVersion() ? `v${availableUpdateVersion()} に更新` : t('update.apply_now')}</span>
              </button>
            </div>
          </Show>
        </div>
        <div class="mizuna-about-actions">
          <button
            type="button"
            id="check_update_button"
            class={`mizuna-btn ${
              updateCheckStatus() === 'update_available' || hasPendingUpdate()
                ? 'mizuna-btn-primary is-update-ready'
                : updateCheckStatus() === 'latest'
                ? 'mizuna-btn-outline is-up-to-date'
                : updateCheckStatus() === 'error'
                ? 'mizuna-btn-outline is-error'
                : 'mizuna-btn-outline'
            }`}
            disabled={isCheckingUpdate()}
            onClick={() => {
              if (updateCheckStatus() === 'update_available' || hasPendingUpdate()) {
                applyPendingUpdate();
              } else {
                checkForUpdate();
              }
            }}
          >
            <Show when={isCheckingUpdate()}>
              <i class="is-spinning">sync</i>
              <span>{t('update.checking')}</span>
            </Show>
            <Show when={!isCheckingUpdate() && (updateCheckStatus() === 'update_available' || hasPendingUpdate())}>
              <i class="is-bounce">system_update</i>
              <span>{availableUpdateVersion() ? `v${availableUpdateVersion()} に更新` : t('update.apply_now')}</span>
            </Show>
            <Show when={!isCheckingUpdate() && updateCheckStatus() === 'latest' && !hasPendingUpdate()}>
              <i class="mizuna-check-icon">check_circle</i>
              <span>{t('update.up_to_date')}</span>
            </Show>
            <Show when={!isCheckingUpdate() && updateCheckStatus() === 'error' && !hasPendingUpdate()}>
              <i class="mizuna-error-icon">error_outline</i>
              <span>{t('update.failed')}</span>
            </Show>
            <Show when={!isCheckingUpdate() && updateCheckStatus() === 'idle' && !hasPendingUpdate()}>
              <i>sync</i>
              <span>{t('settings.check_button')}</span>
            </Show>
          </button>
          <button
            type="button"
            class="mizuna_share mizuna-btn mizuna-btn-primary"
            onClick={handleWebShare}
          >
            <i>share</i>
            <span>Mizunaを共有</span>
          </button>
        </div>
      </div>

      {/* 詳細情報カード */}
      <div class="mizuna-setting-card mizuna-about-details-card">
        <div class="mizuna-meta-row">
          <span class="mizuna-meta-label">GitHub Repository</span>
          <a
            href="https://github.com/MizuiMiduki/Mizuna"
            rel="noopener noreferrer"
            target="_blank"
            class="mizuna-ext-link"
          >
            <span>MizuiMiduki/Mizuna</span>
            <i>open_in_new</i>
          </a>
        </div>
        <div class="mizuna-row-divider" />
        <div class="mizuna-meta-row">
          <span class="mizuna-meta-label">Developer</span>
          <a
            href="https://mizuimiduki.site/"
            rel="noopener noreferrer"
            target="_blank"
            class="mizuna-ext-link"
          >
            <span>Mizui Miduki</span>
            <i>open_in_new</i>
          </a>
        </div>
        <div class="mizuna-row-divider" />
        <div class="mizuna-meta-row">
          <span class="mizuna-meta-label">Privacy Policy</span>
          <button
            type="button"
            class="mizuna-link-btn"
            onClick={() => setCurrentView('privacy')}
          >
            <span>プライバシーポリシー</span>
            <i>arrow_forward</i>
          </button>
        </div>
        <div class="mizuna-row-divider" />
        <div class="mizuna-meta-row">
          <span class="mizuna-meta-label">License / Copyright</span>
          <span class="mizuna-meta-val">
            MIT License · ©<span id="Copyright_year">{currentYear}</span> Mizui Miduki
          </span>
        </div>
        <div class="mizuna-row-divider" />
        <div class="mizuna-meta-row is-column">
          <span class="mizuna-meta-label">Donation / 開発支援</span>
          <div class="mizuna-donation-chips">
            <a
              href="https://mizui-miduki.fanbox.cc/"
              rel="noopener noreferrer"
              target="_blank"
              class="mizuna-link-pill"
            >
              PIXIV FANBOX
            </a>
            <a
              href="https://ofuse.me/mizuimiduki"
              rel="noopener noreferrer"
              target="_blank"
              class="mizuna-link-pill"
            >
              OFUSE
            </a>
            <a
              href="https://www.amazon.jp/hz/wishlist/ls/2LHL5U5HV3N5X?ref_=wl_share"
              rel="noopener noreferrer"
              target="_blank"
              class="mizuna-link-pill"
            >
              Amazon 欲しいものリスト
            </a>
            <a
              href="https://giftee.com/u/mizui_miduki"
              rel="noopener noreferrer"
              target="_blank"
              class="mizuna-link-pill"
            >
              giftee
            </a>
            <a
              href="https://amzn.to/3APogAd"
              rel="noopener noreferrer"
              target="_blank"
              class="mizuna-link-pill"
            >
              Amazonアソシエイト
            </a>
          </div>
        </div>
      </div>

      {/* OSS ライセンス一覧 */}
      <div class="mizuna-group-label">Open Source Licenses</div>
      <div class="mizuna-oss-list">
        <For each={OSS_LICENSES}>
          {(oss) => (
            <div class="mizuna-oss-card">
              <div class="mizuna-oss-top">
                <span class="settings_oss_name mizuna-oss-title">
                  {oss.url ? (
                    <a href={oss.url} target="_blank" rel="noopener noreferrer">
                      {oss.name}
                    </a>
                  ) : (
                    oss.name
                  )}
                </span>
                <span class="mizuna-oss-badge">{oss.license}</span>
              </div>
              <div class="mizuna-oss-copy">{oss.copyright}</div>
              <Show when={oss.description}>
                <div class="mizuna-oss-desc" style="font-size: 0.8rem; opacity: 0.75; margin-top: 4px; line-height: 1.4;">
                  {oss.description}
                </div>
              </Show>
            </div>
          )}
        </For>
      </div>

      <FloatingBackButton onClick={handleBack} />
    </div>
  );
}
