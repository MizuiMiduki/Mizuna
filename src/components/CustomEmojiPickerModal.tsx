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

const PAGE_SIZE = 120;

export function CustomEmojiPickerModal(props: CustomEmojiPickerModalProps) {
  const { currentUser, pushModalBackHandler, t } = useApp();

  const [emojis, setEmojis] = createSignal<CustomEmojiItem[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [selectedCategory, setSelectedCategory] = createSignal<string>('all');
  const [displayLimit, setDisplayLimit] = createSignal(PAGE_SIZE);

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
    } catch (err: any) {
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
        setDisplayLimit(PAGE_SIZE);

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

        setTimeout(() => {
          searchInputRef?.focus();
        }, 80);

        return () => {
          cleanupBack();
          window.removeEventListener('keydown', handleKeyDown);
        };
      }
    }
  );

  // カテゴリー一覧と件数（重複排除＆ソート）
  const categories = createMemo(() => {
    const map = new Map<string, number>();
    for (const item of emojis()) {
      const cat = item.category || 'その他';
      map.set(cat, (map.get(cat) || 0) + 1);
    }

    const sortedNames = Array.from(map.keys()).sort((a, b) => {
      if (a === 'その他') return 1;
      if (b === 'その他') return -1;
      return a.localeCompare(b);
    });

    return sortedNames.map((name) => ({
      name,
      count: map.get(name) || 0,
    }));
  });

  // 検索＆カテゴリーで絞り込み
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

  // 表示件数分だけスライス（大量描画によるフリーズを完全防止）
  const displayedEmojis = createMemo(() => {
    return filteredEmojis().slice(0, displayLimit());
  });

  const hasMore = createMemo(() => {
    return filteredEmojis().length > displayLimit();
  });

  const remainingCount = createMemo(() => {
    return Math.max(0, filteredEmojis().length - displayLimit());
  });

  const handleLoadMore = () => {
    setDisplayLimit((prev) => prev + PAGE_SIZE);
  };

  const handleScroll = (e: Event) => {
    const el = e.currentTarget as HTMLDivElement;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 240 && hasMore()) {
      handleLoadMore();
    }
  };

  const handleSelect = (name: string) => {
    props.onSelectEmoji(name);
    props.onClose();
  };

  return (
    <Show when={props.isOpen}>
      <Portal>
        <div
          class="mizuna-modal-portal mizuna-emoji-picker-portal"
          role="dialog"
          aria-modal="true"
          aria-label={t('emoji_picker.title')}
        >
          {/* 背景オーバーレイ */}
          <div
            ref={(el) => {
              backdropRef = el;
            }}
            class="mizuna-modal-backdrop"
            onClick={() => props.onClose()}
          />

          {/* モーダルカード */}
          <div
            ref={(el) => {
              cardRef = el;
              if (el) animateModalEnter(cardRef, backdropRef);
            }}
            class="mizuna-picker-modal mizuna-emoji-picker-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div class="mizuna-picker-header">
              <div class="mizuna-picker-title-wrap">
                <i class="mizuna-dialog-icon">add_reaction</i>
                <div class="mizuna-emoji-picker-title-row">
                  <h3 class="mizuna-picker-title">{t('emoji_picker.title')}</h3>
                  <Show when={currentUser()}>
                    {(user) => (
                      <span class="mizuna-emoji-picker-instance-badge">
                        @{user().address}
                      </span>
                    )}
                  </Show>
                </div>
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

            {/* フィルター・検索エリア */}
            <div class="mizuna-emoji-picker-controls">
              {/* 検索バー */}
              <div class="mizuna-emoji-picker-search-bar">
                <i class="mizuna-search-icon">search</i>
                <input
                  ref={searchInputRef}
                  type="text"
                  class="mizuna-emoji-picker-search-input"
                  placeholder={t('emoji_picker.search_placeholder')}
                  value={searchQuery()}
                  onInput={(e) => {
                    setSearchQuery(e.currentTarget.value);
                    setDisplayLimit(PAGE_SIZE);
                  }}
                />
                <Show when={searchQuery().length > 0}>
                  <button
                    type="button"
                    class="mizuna-search-clear-btn"
                    onClick={() => {
                      setSearchQuery('');
                      setDisplayLimit(PAGE_SIZE);
                      searchInputRef?.focus();
                    }}
                    aria-label="検索クリア"
                  >
                    <i>close</i>
                  </button>
                </Show>
              </div>

              {/* カテゴリー選択ドロップダウン（500件以上ある場合も瞬時に選べる） */}
              <Show when={!isLoading() && categories().length > 0}>
                <div class="mizuna-emoji-category-select-wrap">
                  <i class="mizuna-category-icon">folder</i>
                  <select
                    class="mizuna-emoji-category-select"
                    value={selectedCategory()}
                    onChange={(e) => {
                      setSelectedCategory(e.currentTarget.value);
                      setDisplayLimit(PAGE_SIZE);
                    }}
                  >
                    <option value="all">
                      {t('emoji_picker.category_all')} ({emojis().length})
                    </option>
                    <For each={categories()}>
                      {(cat) => (
                        <option value={cat.name}>
                          {cat.name} ({cat.count})
                        </option>
                      )}
                    </For>
                  </select>
                </div>
              </Show>
            </div>

            {/* 絵文字グリッドコンテンツ */}
            <div class="mizuna-emoji-picker-body" onScroll={handleScroll}>
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
                    <For each={displayedEmojis()}>
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
                        </button>
                      )}
                    </For>
                  </div>

                  {/* 「さらに表示」ボタン（自動スクロール読み込みに加えて手動ボタンも配置） */}
                  <Show when={hasMore()}>
                    <div class="mizuna-emoji-more-wrap">
                      <button
                        type="button"
                        class="mizuna-btn mizuna-btn-outline mizuna-emoji-more-btn"
                        onClick={handleLoadMore}
                      >
                        <i>expand_more</i>
                        <span>さらに表示 (残り {remainingCount()} 件)</span>
                      </button>
                    </div>
                  </Show>
                </Show>
              </Show>
            </div>
          </div>
        </div>
      </Portal>
    </Show>
  );
}
