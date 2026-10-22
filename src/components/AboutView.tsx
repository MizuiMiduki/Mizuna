import gsap from 'gsap';
import { For, onMount } from 'solid-js';
import { mizuna_options, mizuna_share } from '../config/mizunaOptions';
import { useApp } from '../store/appStore';

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
  const { accounts, setCurrentView, showToast } = useApp();
  let containerRef: HTMLDivElement | undefined;

  onMount(() => {
    if (containerRef) {
      gsap.fromTo(
        containerRef,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.28, ease: 'power3.out' }
      );
    }
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
        <button
          type="button"
          class="mizuna-btn mizuna-btn-outline"
          onClick={handleBack}
        >
          <i>arrow_back</i>
          <span>もどる</span>
        </button>
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
        </div>
        <button
          type="button"
          class="mizuna_share mizuna-btn mizuna-btn-primary"
          onClick={handleWebShare}
        >
          <i>share</i>
          <span>Mizunaを共有</span>
        </button>
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
          <span class="mizuna-meta-label">License / Copyright</span>
          <span class="mizuna-meta-val">
            MIT License · (c) <span id="Copyright_year">{currentYear}</span> Mizui Miduki
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
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
