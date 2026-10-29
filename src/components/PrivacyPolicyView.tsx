import gsap from 'gsap';
import { onMount } from 'solid-js';
import { mizuna_options } from '../config/mizunaOptions';
import { useApp } from '../store/appStore';

export function PrivacyPolicyView() {
  const { accounts, setCurrentView } = useApp();
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

  return (
    <div ref={containerRef} class="mizuna-privacy-view">
      <div class="mizuna-section-header">
        <div>
          <h2 class="mizuna-section-title">プライバシーポリシー</h2>
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

      <div class="mizuna-privacy-content">
        <section class="mizuna-setting-card mizuna-privacy-card">
          <h3 class="mizuna-privacy-section-title">1. 運営について</h3>
          <p class="mizuna-privacy-text">
            「{mizuna_options.app_name}」（以下「当アプリ」といいます）は、BlossomsArchive（以下「当運営」といいます）が提供するウェブアプリケーションです。
          </p>
        </section>

        <section class="mizuna-setting-card mizuna-privacy-card">
          <h3 class="mizuna-privacy-section-title">2. データの取り扱いについて</h3>
          <p class="mizuna-privacy-text">
            当アプリは、ユーザーのアカウント認証情報（アクセストークン等）、入力したノート本文、設定値等の個人情報を、当運営が管理する外部サーバーへ送信・保存することはありません。
          </p>
          <p class="mizuna-privacy-text">
            すべてのデータ処理およびアカウント情報の保存（ブラウザのIndexedDB）は、ユーザーの端末（クライアントサイド）内でのみ完結します。当運営がユーザーのデータを収集・解析・蓄積することはありません。
          </p>
          <p class="mizuna-privacy-text">
            ノートの送信やユーザー情報の取得は、ユーザーが指定した各MisskeyインスタンスのAPIサーバーとのみ直接通信します。
          </p>
        </section>

        <section class="mizuna-setting-card mizuna-privacy-card">
          <h3 class="mizuna-privacy-section-title">3. アクセス解析ツールについて</h3>
          <p class="mizuna-privacy-text">
            当アプリでは、サービス改善や利便性向上を目的として、Googleが提供するアクセス解析ツール「Google アナリティクス」を利用しています。
          </p>
          <p class="mizuna-privacy-text">
            Google アナリティクスはデータの収集のためにCookie（クッキー）を使用しています。このデータは匿名で収集されており、個人を特定するものではありません。
          </p>
          <p class="mizuna-privacy-text">
            Google アナリティクスによるデータの収集および利用方法の詳細については、Googleの
            <a
              href="https://policies.google.com/technologies/partner-sites"
              target="_blank"
              rel="noopener noreferrer"
              class="mizuna-privacy-link"
            >
              ポリシーと規約
              <i>open_in_new</i>
            </a>
            をご覧ください。
          </p>
        </section>

        <section class="mizuna-setting-card mizuna-privacy-card">
          <h3 class="mizuna-privacy-section-title">4. 免責事項</h3>
          <p class="mizuna-privacy-text">
            当アプリの利用によりユーザーに生じた損害（データの消失、Misskeyアカウントや投稿に関するトラブル、外部サーバーとの通信障害を含む）について、当運営は一切の責任を負いません。ご利用の際はご自身の責任において行ってください。
          </p>
        </section>

        <section class="mizuna-setting-card mizuna-privacy-card">
          <h3 class="mizuna-privacy-section-title">5. お問い合わせ</h3>
          <p class="mizuna-privacy-text">
            本ポリシーに関するお問い合わせは、BlossomsArchive 公式ウェブサイトよりご連絡ください。
          </p>
          <div class="mizuna-meta-row" style="margin-top: 10px;">
            <span class="mizuna-meta-label">Web Site</span>
            <a
              href="https://blossomsarchive.com"
              target="_blank"
              rel="noopener noreferrer"
              class="mizuna-ext-link"
            >
              <span>https://blossomsarchive.com</span>
              <i>open_in_new</i>
            </a>
          </div>
        </section>

        <div class="mizuna-privacy-footer-actions">
          <button
            type="button"
            class="mizuna-btn mizuna-btn-primary"
            onClick={handleBack}
          >
            <i>arrow_back</i>
            <span>もどる</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPolicyView;
