import gsap from 'gsap';
import { createSignal, For, onMount, Show } from 'solid-js';
import { buildMiAuthUrl, checkServerExists } from '../services/misskeyApi';
import { useApp } from '../store/appStore';
import { safeLocalStorage } from '../utils/storage';

const SUGGESTED_SERVERS = ['misskey.io', 'misskey.systems'];

export function AddAccountView() {
  const { accounts, setCurrentView, importAccountsFromFile, showToast } = useApp();
  const [serverAddress, setServerAddress] = createSignal('');
  const [isCheckingServer, setIsCheckingServer] = createSignal(false);
  const [selectedJsonFile, setSelectedJsonFile] = createSignal<File | null>(null);

  let containerRef: HTMLDivElement | undefined;
  let jsonInputRef: HTMLInputElement | undefined;

  onMount(() => {
    if (containerRef) {
      gsap.fromTo(
        containerRef,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.34, ease: 'power3.out' }
      );
    }
  });

  const handleAddServerSubmit = async (e?: Event) => {
    e?.preventDefault();
    if (isCheckingServer()) return;

    const cleanAddress = serverAddress()
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '');

    if (!cleanAddress) {
      showToast('アドレスを入力してください', 'error');
      return;
    }

    setIsCheckingServer(true);
    try {
      const exists = await checkServerExists(cleanAddress);
      if (!exists) {
        showToast('アドレスのサーバーは見つかりませんでした', 'error');
        return;
      }

      let sessionId: string;
      if (typeof crypto !== 'undefined') {
        if (typeof crypto.randomUUID === 'function') {
          sessionId = crypto.randomUUID();
        } else if (typeof crypto.getRandomValues === 'function') {
          const arr = new Uint8Array(16);
          crypto.getRandomValues(arr);
          sessionId = Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
        } else {
          sessionId = `${Date.now()}-${performance.now().toString(36)}`;
        }
      } else {
        sessionId = `${Date.now()}-${performance.now().toString(36)}`;
      }

      safeLocalStorage.setItem('add_server_address', cleanAddress);
      const miauthUrl = buildMiAuthUrl(cleanAddress, sessionId);
      location.assign(miauthUrl);
    } catch (err) {
      console.error('MiAuth redirect error:', err);
      showToast('サーバーの確認中にエラーが発生しました', 'error');
    } finally {
      setIsCheckingServer(false);
    }
  };

  const handleImportSubmit = async (e?: Event) => {
    e?.preventDefault();
    const file = selectedJsonFile();
    if (!file) {
      showToast('インポートするファイルを選択してください', 'warning');
      return;
    }
    await importAccountsFromFile(file);
  };

  return (
    <div ref={containerRef} class="mizuna-add-account-view">
      {/* 上部ナビゲーションまたはウェルカムヒーロー */}
      <Show
        when={accounts().length > 0}
        fallback={
          <div class="mizuna-onboarding-hero">
            <img src="/icon.png" alt="Mizuna" class="mizuna-hero-icon" />
            <h1 class="mizuna-hero-title">Mizuna へようこそ</h1>
            <p class="mizuna-hero-sub">
              無駄なタイムライン通信を省き、ノート投稿だけに特化した超軽量Misskeyクライアント
            </p>
          </div>
        }
      >
        <div class="mizuna-section-header">
          <div>
            <h2 class="mizuna-section-title">アカウントを追加</h2>
          </div>
          <button
            type="button"
            class="back_inputform_floating_button mizuna-btn mizuna-btn-outline"
            onClick={() => setCurrentView('accounts')}
          >
            <i>arrow_back</i>
            <span>一覧へもどる</span>
          </button>
        </div>
      </Show>

      {/* カード1: サーバーアドレスからMiAuth連携 */}
      <section class="mizuna-glass-card">
        <div class="mizuna-card-head">
          <div class="mizuna-card-icon-badge">
            <i>dns</i>
          </div>
          <div>
            <h3 class="mizuna-card-title">サーバーアドレスから追加</h3>
          </div>
        </div>

        <form onSubmit={handleAddServerSubmit} class="mizuna-add-form">
          <div class="mizuna-input-group">
            <span class="mizuna-input-prefix">https://</span>
            <input
              autocomplete="off"
              class="server_address mizuna-modern-input"
              list="server_address_list"
              placeholder="misskey.io"
              type="text"
              value={serverAddress()}
              onInput={(e) => setServerAddress(e.currentTarget.value)}
            />
            <button
              id="add_account_server_button"
              type="submit"
              class="mizuna-btn mizuna-btn-primary mizuna-input-submit"
              disabled={isCheckingServer()}
            >
              <Show
                when={!isCheckingServer()}
                fallback={
                  <>
                    <progress class="circle small" />
                    <span>接続確認中...</span>
                  </>
                }
              >
                <span>認証へ進む</span>
                <i>arrow_forward</i>
              </Show>
            </button>
          </div>

          <datalist id="server_address_list">
            <For each={SUGGESTED_SERVERS}>{(srv) => <option value={srv} />}</For>
          </datalist>

          <div class="mizuna-quick-servers">
            <span class="mizuna-quick-label">クイック選択:</span>
            <For each={SUGGESTED_SERVERS}>
              {(srv) => (
                <button
                  type="button"
                  class={`mizuna-server-pill ${serverAddress() === srv ? 'is-active' : ''}`}
                  onClick={() => setServerAddress(srv)}
                >
                  <i>public</i>
                  <span>{srv}</span>
                </button>
              )}
            </For>
          </div>
        </form>
      </section>

      {/* カード2: JSONバックアップからインポート */}
      <section class="mizuna-glass-card">
        <div class="mizuna-card-head">
          <div class="mizuna-card-icon-badge is-secondary">
            <i>restore_page</i>
          </div>
          <div>
            <h3 class="mizuna-card-title">エクスポートしたデータから復元</h3>
          </div>
        </div>

        <form onSubmit={handleImportSubmit} class="mizuna-import-row">
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json,application/json"
            id="import_userdata_input"
            style="display: none;"
            onChange={(e) => {
              const f = e.currentTarget.files?.[0] ?? null;
              setSelectedJsonFile(f);
            }}
          />

          <button
            type="button"
            class="mizuna-file-dropzone"
            onClick={() => jsonInputRef?.click()}
          >
            <i>folder_open</i>
            <span class="mizuna-file-name">
              {selectedJsonFile()
                ? selectedJsonFile()!.name
                : 'クリックして JSON ファイルを選択...'}
            </span>
          </button>

          <button
            id="import_userdata_input_button"
            type="submit"
            class="mizuna-btn mizuna-btn-tonal"
          >
            <i>upload</i>
            <span>インポート</span>
          </button>
        </form>
      </section>
    </div>
  );
}
