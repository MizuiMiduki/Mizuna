import gsap from 'gsap';
import { For, onMount, Show } from 'solid-js';
import { useApp } from '../store/appStore';

interface ShortcutItem {
  label: string;
  keys: string[];
}

const SHORTCUT_LIST: ShortcutItem[] = [
  { label: 'ノートを送信', keys: ['Ctrl', 'Alt', 'Enter'] },
  { label: '公開範囲：パブリック', keys: ['Ctrl', 'Alt', 'P'] },
  { label: '公開範囲：ホーム', keys: ['Ctrl', 'Alt', 'H'] },
  { label: '公開範囲：フォロワー', keys: ['Ctrl', 'Alt', 'F'] },
  { label: 'CW（閲覧注意）の切り替え', keys: ['Ctrl', 'Alt', 'W'] },
  { label: '末尾に『(from Mizuna)』を付与', keys: ['Ctrl', 'Alt', 'M'] },
  { label: '画像ファイルを選択', keys: ['Ctrl', 'Alt', 'V'] },
  { label: '入力フォームをクリア', keys: ['Ctrl', 'Alt', 'C'] },
  { label: 'ノート入力欄にフォーカス', keys: ['Ctrl', 'Alt', 'I'] },
  { label: 'CW入力欄にフォーカス', keys: ['Ctrl', 'Alt', 'O'] },
];

export function ShortcutsView() {
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
    <div ref={containerRef} class="mizuna-shortcuts-view">
      <div class="mizuna-section-header">
        <div>
          <h2 class="mizuna-section-title">ショートカット</h2>
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

      <div class="mizuna-shortcut-bento">
        <For each={SHORTCUT_LIST}>
          {(item) => (
            <div class="mizuna-shortcut-card">
              <span class="settings_key_name mizuna-shortcut-label">{item.label}</span>
              <div class="mizuna-keycap-group">
                <For each={item.keys}>
                  {(key, idx) => (
                    <>
                      <kbd class="mizuna-keycap">{key}</kbd>
                      <Show when={idx() < item.keys.length - 1}>
                        <span class="mizuna-key-plus">+</span>
                      </Show>
                    </>
                  )}
                </For>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
