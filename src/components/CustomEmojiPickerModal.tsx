import {
  createEffect,
  createMemo,
  createSignal,
  For,
  Show,
} from 'solid-js';
import { Portal } from '@solidjs/web';
import {
  fetchServerCustomEmojiList,
  type CustomEmojiItem,
} from '../services/misskeyApi';
import { useApp } from '../store/appStore';
import { animateModalEnter } from '../utils/animation';

interface CustomEmojiPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emojiName: string) => void;
}

export function CustomEmojiPickerModal(props: CustomEmojiPickerModalProps) {
  const { currentUser, pushModalBackHandler, t } = useApp();

  const [emojis, setEmojis] = createSignal<CustomEmojiItem[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [selectedCategory, setSelectedCategory] = createSignal<string>('all');

  let backdropRef: HTMLDivElement | undefined;
  let cardRef: HTMLDivElement | undefined;
  let searchInputRef: HTMLInputElement | undefined;

  const loadEmojis = async (targetAddress?: string) => {
    const address = targetAddress || currentUser()?.address;
    if (!address) {
      setErrorMessage(t('note.custom_emoji_no_account'));
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const list = await fetchServerCustomEmojiList(address);
      setEmojis(list);
    } catch (err) {
      console.error('Failed to load custom emojis:', err);
      setErrorMessage(t('emoji_picker.error'));
    } finally {
      setIsLoading(false);
    }
  };

  createEffect(
    () => [props.isOpen, currentUser()] as const,
    ([isOpen, user]) => {
      if (isOpen) {
        setSearchQuery('');
        setSelectedCategory('all');

        if (user && user.address) {
          loadEmojis(user.address);
        } else {
          setErrorMessage(t('note.custom_emoji_no_account'));
        }

        const cleanupBack = pushModalBackHandler(() => props.onClose());
        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            props.onClose();
          }
        };

        window.addEventListener('keydown', handleKeyDown);

        if (cardRef) {
          animateModalEnter(cardRef);
        }

        setTimeout(() => {
          searchInputRef?.focus();
        }, 100);

        return () => {
          cleanupBack();
          window.removeEventListener('keydown', handleKeyDown);
        };
      }
    }
  );

  // カテゴリー一覧（重複排除＆ソート）
  const categories = createMemo(() => {
    const set = new Set<string>();
    for (const item of emojis()) {
      if (item.category) {
        set.add(item.category);
      }
    }
    const sorted = Array.from(set).sort((a, b) => {
      if (a === 'その他') return 1;
      if (b === 'その他') return -1;
      return a.localeCompare(b);
    });
    return ['all', ...sorted];
  });

  // 検索＆カテゴリーでフィルタリング
  const filteredEmojis = createMemo(() => {
    const q = searchQuery().trim().toLowerCase();
    const cat = selectedCategory();
    const all = emojis();

    return all.filter((item) => {
      // カテゴリ絞り込み
      if (cat !== 'all' && item.category !== cat) {
        return false;
      }
      // 検索クエリ絞り込み
      if (q) {
        const nameMatch = item.name.toLowerCase().includes(q);
        const aliasMatch = item.aliases.some((a) => a.toLowerCase().includes(q));
        if (!nameMatch && !aliasMatch) {
          return false;
        }
      }
      return true;
    });
  });

  const handleSelect = (name: string) => {
    props.onSelectEmoji(name);
    props.onClose();
  };

  return (
    <Show when={props.isOpen}>
      <Portal>
        <div
          ref={backdropRef}
          class="mizuna-modal-backdrop is-visible mizuna-emoji-picker-portal"
          onClick={(e) => {
            if (e.target === backdropRef) {
              props.onClose();
            }
          }}
          role="presentation"
        >
          <div
            ref={cardRef}
            class="mizuna-modal-card mizuna-emoji-picker-modal"
            role="dialog"
            aria-modal="true"
            aria-label={t('emoji_picker.title')}
          >
            {/* モーダルヘッダー */}
            <div class="mizuna-modal-header">
              <div class="mizuna-modal-title">
                <i class="mizuna-dialog-icon">add_reaction</i>
                <span>{t('emoji_picker.title')}</span>
                <Show when={currentUser()}>
                  {(user) => (
                    <span class="mizuna-emoji-picker-instance-badge">
                      @{user().address}
                    </span>
                  )}
                </Show>
              </div>
              <button
                type="button"
                class="mizuna-icon-btn-sm"
                onClick={props.onClose}
                aria-label={t('emoji_picker.close')}
              >
                <i>close</i>
              </button>
            </div>

            {/* 検索バー */}
            <div class="mizuna-emoji-picker-search-wrap">
              <div class="mizuna-emoji-picker-search-bar">
                <i class="mizuna-search-icon">search</i>
                <input
                  ref={searchInputRef}
                  type="text"
                  class="mizuna-emoji-picker-search-input"
                  placeholder={t('emoji_picker.search_placeholder')}
                  value={searchQuery()}
                  onInput={(e) => setSearchQuery(e.currentTarget.value)}
                />
                <Show when={searchQuery().length > 0}>
                  <button
                    type="button"
                    class="mizuna-search-clear-btn"
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef?.focus();
                    }}
                    aria-label="検索クリア"
                  >
                    <i>close</i>
                  </button>
                </Show>
              </div>
            </div>

            {/* カテゴリー一覧タブ */}
            <Show when={!isLoading() && categories().length > 1}>
              <div class="mizuna-emoji-category-strip" role="tablist">
                <For each={categories()}>
                  {(cat) => (
                    <button
                      type="button"
                      role="tab"
                      class={`mizuna-emoji-category-chip ${
                        selectedCategory() === cat ? 'is-active' : ''
                      }`}
                      aria-selected={selectedCategory() === cat ? 'true' : 'false'}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat === 'all' ? t('emoji_picker.category_all') : cat}
                    </button>
                  )}
                </For>
              </div>
            </Show>

            {/* 絵文字グリッドコンテンツ */}
            <div class="mizuna-emoji-picker-body">
              <Show when={isLoading()}>
                <div class="mizuna-emoji-state-box">
                  <div class="mizuna-spinner" />
                  <p>{t('emoji_picker.loading')}</p>
                </div>
              </Show>

              <Show when={!isLoading() && errorMessage()}>
                <div class="mizuna-emoji-state-box is-error">
                  <i class="mizuna-empty-icon">error</i>
                  <p>{errorMessage()}</p>
                  <button
                    type="button"
                    class="mizuna-btn mizuna-btn-outline"
                    onClick={() => loadEmojis()}
                  >
                    <i>refresh</i>
                    <span>{t('emoji_picker.retry')}</span>
                  </button>
                </div>
              </Show>

              <Show when={!isLoading() && !errorMessage()}>
                <Show
                  when={filteredEmojis().length > 0}
                  fallback={
                    <div class="mizuna-emoji-state-box">
                      <i class="mizuna-empty-icon">sentiment_dissatisfied</i>
                      <p>{t('emoji_picker.empty')}</p>
                    </div>
                  }
                >
                  <div class="mizuna-emoji-grid" role="list">
                    <For each={filteredEmojis()}>
                      {(item) => (
                        <button
                          type="button"
                          class="mizuna-emoji-cell"
                          role="listitem"
                          onClick={() => handleSelect(item.name)}
                          title={`:${item.name}:`}
                          aria-label={`:${item.name}:`}
                        >
                          <img
                            class="mizuna-emoji-cell-img"
                            src={item.url}
                            alt={item.name}
                            loading="lazy"
                            decoding="async"
                          />
                          <span class="mizuna-emoji-cell-name">:{item.name}:</span>
                        </button>
                      )}
                    </For>
                  </div>
                </Show>
              </Show>
            </div>
          </div>
        </div>
      </Portal>
    </Show>
  );
}
