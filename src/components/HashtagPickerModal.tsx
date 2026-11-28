import {
  createEffect,
  createMemo,
  createSignal,
  For,
  Show,
} from 'solid-js';
import { Portal } from '@solidjs/web';
import {
  fetchServerHashtagList,
  type HashtagItem,
} from '../services/misskeyApi';
import {
  getRecentHashtags,
  addRecentHashtag,
  getPinnedHashtags,
  togglePinnedHashtag,
} from '../utils/hashtagStorage';
import { useApp } from '../store/appStore';
import { animateModalEnter } from '../utils/animation';

interface HashtagPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectHashtag: (tag: string) => void;
}

export function HashtagPickerModal(props: HashtagPickerModalProps) {
  const { currentUser, pushModalBackHandler, t } = useApp();

  const [hashtags, setHashtags] = createSignal<HashtagItem[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);
  const [searchQuery, setSearchQuery] = createSignal('');

  const [pinnedTags, setPinnedTags] = createSignal<string[]>([]);
  const [recentTags, setRecentTags] = createSignal<string[]>([]);

  let backdropRef: HTMLDivElement | undefined;
  let cardRef: HTMLDivElement | undefined;
  let searchInputRef: HTMLInputElement | undefined;

  const currentAddress = () => currentUser()?.address || '';

  const loadHashtags = async (targetAddress?: string) => {
    const address = targetAddress || currentAddress();
    if (!address) {
      setErrorMessage(t('note.hashtag_no_account'));
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const list = await fetchServerHashtagList(address);
      setHashtags(list);
    } catch (err) {
      console.error('Failed to load hashtags:', err);
      setErrorMessage(t('hashtag_picker.error'));
    } finally {
      setIsLoading(false);
    }
  };

  createEffect(
    () => [props.isOpen, currentUser()] as const,
    ([isOpen, user]) => {
      if (isOpen) {
        setSearchQuery('');

        const addr = user?.address || '';
        if (addr) {
          setPinnedTags(getPinnedHashtags(addr));
          setRecentTags(getRecentHashtags(addr));
          loadHashtags(addr);
        } else {
          setErrorMessage(t('note.hashtag_no_account'));
        }

        const cleanupBack = pushModalBackHandler(() => props.onClose());
        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            props.onClose();
          }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
          cleanupBack();
          window.removeEventListener('keydown', handleKeyDown);
        };
      }
    }
  );

  const normalizedQuery = createMemo(() =>
    searchQuery().replace(/^#+/, '').trim()
  );

  const filteredHashtags = createMemo(() => {
    const q = normalizedQuery().toLowerCase();
    const all = hashtags();
    if (!q) return all;
    return all.filter((item) => item.tag.toLowerCase().includes(q));
  });

  const pinnedSet = createMemo(() => new Set(pinnedTags().map((t) => t.toLowerCase())));

  const recentTagList = createMemo(() => {
    const pSet = pinnedSet();
    return recentTags().filter((tag) => !pSet.has(tag.toLowerCase()));
  });

  const exactMatchExists = createMemo(() => {
    const q = normalizedQuery().toLowerCase();
    if (!q) return true;
    return (
      hashtags().some((h) => h.tag.toLowerCase() === q) ||
      pinnedTags().some((t) => t.toLowerCase() === q) ||
      recentTags().some((t) => t.toLowerCase() === q)
    );
  });

  const handleSelectTag = (tag: string) => {
    const clean = tag.replace(/^#+/, '').trim();
    if (!clean) return;
    const addr = currentAddress();
    if (addr) {
      setRecentTags(addRecentHashtag(addr, clean));
    }
    props.onSelectHashtag(clean);
    props.onClose();
  };

  const handleTogglePin = (tag: string) => {
    const addr = currentAddress();
    if (!addr) return;
    const { list } = togglePinnedHashtag(addr, tag);
    setPinnedTags(list);
  };

  const renderTagChip = (tag: string, usersCount?: number) => {
    const pinned = () => pinnedSet().has(tag.toLowerCase());
    return (
      <div class="mizuna-hashtag-chip-wrap" role="listitem">
        <button
          type="button"
          class="mizuna-hashtag-chip-btn"
          onClick={() => handleSelectTag(tag)}
          title={`#${tag}`}
        >
          <span class="mizuna-hashtag-hash">#</span>
          <span class="mizuna-hashtag-name">{tag}</span>
          <Show when={typeof usersCount === 'number' && usersCount > 0}>
            <span class="mizuna-hashtag-count">{usersCount}</span>
          </Show>
        </button>
        <button
          type="button"
          class={`mizuna-hashtag-pin-btn ${pinned() ? 'is-pinned' : ''}`}
          title={pinned() ? t('hashtag_picker.unpin_tooltip') : t('hashtag_picker.pin_tooltip')}
          aria-label={pinned() ? t('hashtag_picker.unpin_tooltip') : t('hashtag_picker.pin_tooltip')}
          onClick={(e) => {
            e.stopPropagation();
            handleTogglePin(tag);
          }}
        >
          <i>push_pin</i>
        </button>
      </div>
    );
  };

  return (
    <Show when={props.isOpen}>
      <Portal>
        <div
          class="mizuna-modal-portal mizuna-emoji-picker-portal"
          role="dialog"
          aria-modal="true"
          aria-label={t('hashtag_picker.title')}
        >
          <div
            ref={(el) => {
              backdropRef = el;
            }}
            class="mizuna-modal-backdrop"
            onClick={() => props.onClose()}
          />

          <div
            ref={(el) => {
              cardRef = el;
              if (el) {
                requestAnimationFrame(() => {
                  animateModalEnter(cardRef, backdropRef);
                });
              }
            }}
            class="mizuna-picker-modal mizuna-emoji-picker-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div class="mizuna-picker-header">
              <div class="mizuna-picker-title-wrap">
                <i class="mizuna-dialog-icon">tag</i>
                <div class="mizuna-emoji-picker-title-row">
                  <h3 class="mizuna-picker-title">{t('hashtag_picker.title')}</h3>
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
                aria-label={t('hashtag_picker.close')}
              >
                <i>close</i>
              </button>
            </div>

            {/* 検索バー */}
            <div class="mizuna-emoji-picker-controls">
              <div class="mizuna-emoji-picker-search-bar">
                <i class="mizuna-search-icon">search</i>
                <input
                  ref={searchInputRef}
                  type="text"
                  class="mizuna-emoji-picker-search-input"
                  placeholder={t('hashtag_picker.search_placeholder')}
                  value={searchQuery()}
                  onInput={(e) => setSearchQuery(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && normalizedQuery().length > 0) {
                      e.preventDefault();
                      handleSelectTag(normalizedQuery());
                    }
                  }}
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

            {/* ハッシュタグ一覧コンテンツ */}
            <div class="mizuna-emoji-picker-body">
              <Show when={normalizedQuery().length > 0 && !exactMatchExists()}>
                <div class="mizuna-hashtag-custom-insert">
                  <button
                    type="button"
                    class="mizuna-hashtag-custom-btn"
                    onClick={() => handleSelectTag(normalizedQuery())}
                  >
                    <i>add</i>
                    <span>{t('hashtag_picker.insert_custom', { tag: normalizedQuery() })}</span>
                  </button>
                </div>
              </Show>

              <Show when={isLoading()}>
                <div class="mizuna-emoji-state-box">
                  <div class="mizuna-spinner" />
                  <p>{t('hashtag_picker.loading')}</p>
                </div>
              </Show>

              <Show when={!isLoading() && errorMessage()}>
                <div class="mizuna-emoji-state-box is-error">
                  <i class="mizuna-empty-icon">error</i>
                  <p>{errorMessage()}</p>
                  <button
                    type="button"
                    class="mizuna-btn mizuna-btn-outline"
                    onClick={() => loadHashtags()}
                  >
                    <i>refresh</i>
                    <span>{t('hashtag_picker.retry')}</span>
                  </button>
                </div>
              </Show>

              <Show when={!isLoading() && !errorMessage()}>
                <Show when={normalizedQuery() === ''}>
                  {/* 固定したハッシュタグ */}
                  <Show when={pinnedTags().length > 0}>
                    <div class="mizuna-emoji-section">
                      <div class="mizuna-emoji-section-header">
                        <i class="mizuna-section-icon is-pinned">push_pin</i>
                        <span>{t('hashtag_picker.section_pinned')}</span>
                        <span class="mizuna-section-count">({pinnedTags().length})</span>
                      </div>
                      <div class="mizuna-hashtag-list" role="list">
                        <For each={pinnedTags()}>{(tag) => renderTagChip(tag)}</For>
                      </div>
                    </div>
                  </Show>

                  {/* 最近使ったハッシュタグ */}
                  <Show when={recentTagList().length > 0}>
                    <div class="mizuna-emoji-section">
                      <div class="mizuna-emoji-section-header">
                        <i class="mizuna-section-icon">history</i>
                        <span>{t('hashtag_picker.section_recent')}</span>
                        <span class="mizuna-section-count">({recentTagList().length})</span>
                      </div>
                      <div class="mizuna-hashtag-list" role="list">
                        <For each={recentTagList()}>{(tag) => renderTagChip(tag)}</For>
                      </div>
                    </div>
                  </Show>

                  <div class="mizuna-emoji-section-header mizuna-emoji-section-divider">
                    <i class="mizuna-section-icon">trending_up</i>
                    <span>{t('hashtag_picker.section_trending')}</span>
                    <span class="mizuna-section-count">({hashtags().length})</span>
                  </div>
                </Show>

                <Show
                  when={filteredHashtags().length > 0}
                  fallback={
                    <Show when={normalizedQuery() === ''}>
                      <div class="mizuna-emoji-state-box">
                        <i class="mizuna-empty-icon">tag</i>
                        <p>{t('hashtag_picker.empty')}</p>
                      </div>
                    </Show>
                  }
                >
                  <div class="mizuna-hashtag-list" role="list">
                    <For each={filteredHashtags()}>
                      {(item) => renderTagChip(item.tag, item.usersCount)}
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
