import gsap from 'gsap';
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from 'solid-js';
import {
  fetchNoteChildren,
  fetchUserMentions,
  fetchUserNotes,
  type MisskeyNote,
} from '../services/misskeyApi';
import { useApp } from '../store/appStore';
import { getDisplayAvatarUrl } from '../utils/image';
import { renderMfm, renderInlineEmoji, normalizeEmojiMap } from '../utils/mfm';
import { hasHistoryPermission } from '../utils/version';

function getReactionEmojiUrl(rawReaction: string, note: MisskeyNote): string | undefined {
  const clean = rawReaction.replace(/^:|:$/g, '');
  const withoutHost = clean.split('@')[0];

  if (note.reactionEmojis) {
    if (note.reactionEmojis[rawReaction]) return note.reactionEmojis[rawReaction];
    if (note.reactionEmojis[clean]) return note.reactionEmojis[clean];
    if (note.reactionEmojis[withoutHost]) return note.reactionEmojis[withoutHost];
  }

  const map = normalizeEmojiMap(note.emojis);
  return map.get(clean.toLowerCase()) || map.get(withoutHost.toLowerCase());
}

type HistoryTab = 'my_notes' | 'mentions';

interface RepliesState {
  loading: boolean;
  list: MisskeyNote[];
  loaded: boolean;
  isOpen: boolean;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 45) return 'たった今';
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHour < 24) return `${diffHour}時間前`;
  if (diffDay < 7) return `${diffDay}日前`;
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function HistoryView() {
  const {
    currentUser,
    settings,
    startReply,
    setCurrentView,
    showToast,
    t,
  } = useApp();

  let containerRef: HTMLDivElement | undefined;
  let refreshIconRef: HTMLElement | undefined;
  let spinTween: gsap.core.Tween | null = null;
  let settleTween: gsap.core.Tween | null = null;

  const isHistorySupported = createMemo(() =>
    hasHistoryPermission(currentUser()?.add_mizuna_versinon)
  );

  const [activeTab, setActiveTab] = createSignal<HistoryTab>('my_notes');
  const [notes, setNotes] = createSignal<MisskeyNote[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [isLoadingMore, setIsLoadingMore] = createSignal(false);
  const [hasMore, setHasMore] = createSignal(true);
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);

  // ノートごとのリプライ展開状態 (noteId -> RepliesState)
  const [repliesMap, setRepliesMap] = createSignal<Record<string, RepliesState>>({});

  // CW展開状態 (noteId -> boolean)
  const [expandedCwMap, setExpandedCwMap] = createSignal<Record<string, boolean>>({});

  // 画像プレビューモーダル
  const [previewImage, setPreviewImage] = createSignal<string | null>(null);

  const toggleCw = (noteId: string) => {
    setExpandedCwMap((prev) => ({
      ...prev,
      [noteId]: !prev[noteId],
    }));
  };

  const loadNotes = async (reset = false) => {
    const user = currentUser();
    if (!user || !isHistorySupported()) return;

    if (reset) {
      setIsLoading(true);
      setErrorMessage(null);
      setHasMore(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const currentNotes = reset ? [] : notes();
      const untilId = currentNotes.length > 0 ? currentNotes[currentNotes.length - 1].id : undefined;

      let fetched: MisskeyNote[] = [];
      if (activeTab() === 'my_notes') {
        fetched = await fetchUserNotes(user, { limit: 10, untilId });
      } else {
        fetched = await fetchUserMentions(user, { limit: 10, untilId });
      }

      if (fetched.length < 10) {
        setHasMore(false);
      }

      if (reset) {
        setNotes(fetched);
      } else {
        setNotes((prev) => [...prev, ...fetched]);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
      setErrorMessage(t('history.error_load'));
      showToast(t('history.error_load'), 'error');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // タブまたはアカウント変更時にリロード
  createEffect(() => {
    activeTab();
    currentUser()?.id;
    setRepliesMap({});
    setExpandedCwMap({});
    loadNotes(true);
  });

  onMount(() => {
    if (containerRef) {
      gsap.fromTo(
        containerRef,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.28, ease: 'power3.out', clearProps: 'transform' }
      );
    }

    // リフレッシュアイコンの滑らかな回転・減速着地アニメーション
    createEffect(() => {
      const loading = isLoading();
      if (!refreshIconRef) return;

      if (loading) {
        if (settleTween) {
          settleTween.kill();
          settleTween = null;
        }
        if (spinTween) {
          spinTween.kill();
        }
        const currentRot = Number(gsap.getProperty(refreshIconRef, 'rotation')) || 0;
        const normalizedRot = ((currentRot % 360) + 360) % 360;
        gsap.set(refreshIconRef, { rotation: normalizedRot });

        spinTween = gsap.to(refreshIconRef, {
          rotation: normalizedRot + 360,
          duration: 0.85,
          ease: 'none',
          repeat: -1,
        });
      } else {
        if (spinTween) {
          spinTween.kill();
          spinTween = null;

          const currentRot = Number(gsap.getProperty(refreshIconRef, 'rotation')) || 0;
          const nextTarget = Math.ceil(currentRot / 360) * 360;
          // 残り角度が少なすぎる場合はもう1周回して自然に減速させる
          const finalTarget = (nextTarget - currentRot < 70) ? nextTarget + 360 : nextTarget;

          settleTween = gsap.to(refreshIconRef, {
            rotation: finalTarget,
            duration: 0.45,
            ease: 'power2.out',
            onComplete: () => {
              if (refreshIconRef) {
                gsap.set(refreshIconRef, { rotation: 0 });
              }
              settleTween = null;
            },
          });
        }
      }
    });
  });

  onCleanup(() => {
    spinTween?.kill();
    settleTween?.kill();
  });

  // リプライの開閉と取得 (Issue #130)
  const toggleReplies = async (noteId: string) => {
    const user = currentUser();
    if (!user) return;

    const current = repliesMap()[noteId];
    if (current?.isOpen) {
      // 閉じる
      setRepliesMap((prev) => ({
        ...prev,
        [noteId]: { ...prev[noteId], isOpen: false },
      }));
      return;
    }

    if (current?.loaded) {
      // すでに取得済みなら開くだけ
      setRepliesMap((prev) => ({
        ...prev,
        [noteId]: { ...prev[noteId], isOpen: true },
      }));
      return;
    }

    // 初回取得
    setRepliesMap((prev) => ({
      ...prev,
      [noteId]: { loading: true, list: [], loaded: false, isOpen: true },
    }));

    try {
      const children = await fetchNoteChildren(user, noteId, { limit: 10 });
      setRepliesMap((prev) => ({
        ...prev,
        [noteId]: { loading: false, list: children, loaded: true, isOpen: true },
      }));
    } catch (err) {
      console.error('Failed to fetch replies:', err);
      showToast('リプライの取得に失敗しました', 'error');
      setRepliesMap((prev) => ({
        ...prev,
        [noteId]: { loading: false, list: [], loaded: true, isOpen: true },
      }));
    }
  };

  const handleReplyClick = (note: MisskeyNote) => {
    startReply(note);
  };

  const openNoteInBrowser = (noteId: string) => {
    const user = currentUser();
    if (!user) return;
    window.open(`https://${user.address}/notes/${noteId}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div ref={containerRef} class="mizuna-history-view">
      {/* ヘッダー */}
      <div class="mizuna-section-header mizuna-history-header">
        <div class="mizuna-history-title-wrap">
          <div class="mizuna-history-title-icon">
            <i>history</i>
          </div>
          <div>
            <h2 class="mizuna-section-title">{t('history.title')}</h2>
            <p class="mizuna-section-desc">{t('history.sub')}</p>
          </div>
        </div>

        <div class="mizuna-history-header-actions">
          <button
            type="button"
            class="mizuna-tool-icon-btn"
            onClick={() => loadNotes(true)}
            disabled={isLoading() || !isHistorySupported()}
            title={t('history.refresh')}
            aria-label={t('history.refresh')}
            aria-busy={isLoading()}
          >
            <i ref={refreshIconRef} aria-hidden="true">refresh</i>
          </button>
        </div>
      </div>

      <Show
        when={isHistorySupported()}
        fallback={
          <div class="mizuna-history-perm-warning">
            <div class="mizuna-history-perm-icon">
              <i>lock_person</i>
            </div>
            <h3 class="mizuna-history-perm-title">{t('history.permission_required_title')}</h3>
            <p class="mizuna-history-perm-desc">
              {t('history.permission_required_desc', {
                version: currentUser()?.add_mizuna_versinon || '?',
              })}
            </p>
            <div class="mizuna-history-perm-actions">
              <button
                type="button"
                class="mizuna-btn mizuna-btn-primary"
                onClick={() => setCurrentView('add_account')}
              >
                <i>key</i>
                <span>{t('history.reauth_button')}</span>
              </button>
              <button
                type="button"
                class="mizuna-btn mizuna-btn-outline"
                onClick={() => setCurrentView('accounts')}
              >
                <i>manage_accounts</i>
                <span>アカウント管理</span>
              </button>
            </div>
          </div>
        }
      >
        {/* タブ切り替え */}
        <div class="mizuna-history-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            class={`mizuna-history-tab ${activeTab() === 'my_notes' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('my_notes')}
            aria-selected={activeTab() === 'my_notes'}
          >
            <i>person</i>
            <span>{t('history.tab_my_notes')}</span>
          </button>

          <button
            type="button"
            role="tab"
            class={`mizuna-history-tab ${activeTab() === 'mentions' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('mentions')}
            aria-selected={activeTab() === 'mentions'}
          >
            <i>alternate_email</i>
            <span>{t('history.tab_mentions')}</span>
          </button>
        </div>

        {/* 投稿一覧 */}
        <div class="mizuna-history-content">
          <Show when={isLoading()}>
            <div class="mizuna-history-loading">
              <div class="mizuna-spinner" />
              <span>{t('history.loading')}</span>
            </div>
          </Show>

          <Show when={!isLoading() && errorMessage()}>
            <div class="mizuna-history-error">
              <i>error_outline</i>
              <p>{errorMessage()}</p>
              <button
                type="button"
                class="mizuna-btn mizuna-btn-primary"
                onClick={() => loadNotes(true)}
              >
                {t('history.refresh')}
              </button>
            </div>
          </Show>

          <Show when={!isLoading() && !errorMessage() && notes().length === 0}>
            <div class="mizuna-history-empty">
              <div class="mizuna-history-empty-icon">
                <i>edit_note</i>
              </div>
              <p class="mizuna-history-empty-title">{t('history.empty_title')}</p>
              <p class="mizuna-history-empty-desc">{t('history.empty_desc')}</p>
            </div>
          </Show>

          <Show when={!isLoading() && notes().length > 0}>
            <div class="mizuna-history-list">
              <For each={notes()}>
                {(note) => {
                  const avatarUrl = () =>
                    getDisplayAvatarUrl(note.user.avatarUrl, settings().is_visible_icon);
                  const userName = () => note.user.name || note.user.username;
                  const isCwOpen = () => Boolean(expandedCwMap()[note.id]);
                  const replyState = () => repliesMap()[note.id];
                  const repliesCount = () => note.repliesCount ?? 0;

                  return (
                    <article class="mizuna-note-card">
                      {/* ノートヘッダー */}
                      <div class="mizuna-note-card-header">
                        <div class="mizuna-note-author">
                          <img
                            src={avatarUrl()}
                            alt=""
                            class="mizuna-note-avatar"
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/icon.png';
                            }}
                          />
                          <div class="mizuna-note-author-info">
                            <span class="mizuna-note-author-name" innerHTML={renderInlineEmoji(userName(), note.user.emojis)} />
                            <span class="mizuna-note-author-handle">@{note.user.username}</span>
                          </div>
                        </div>

                        <div class="mizuna-note-meta-right">
                          <span class={`mizuna-note-vis-badge visibility-${note.visibility}`}>
                            <i>
                              {note.visibility === 'public'
                                ? 'public'
                                : note.visibility === 'home'
                                ? 'home'
                                : 'lock'}
                            </i>
                          </span>
                          <time class="mizuna-note-time" datetime={note.createdAt} title={new Date(note.createdAt).toLocaleString()}>
                            {formatRelativeTime(note.createdAt)}
                          </time>
                        </div>
                      </div>

                      {/* CW (閲覧注意) */}
                      <Show when={note.cw}>
                        <div class="mizuna-note-cw-block">
                          <span class="mizuna-note-cw-text" innerHTML={renderMfm(note.cw || '', note.emojis)} />
                          <button
                            type="button"
                            class="mizuna-note-cw-toggle-btn"
                            onClick={() => toggleCw(note.id)}
                          >
                            <i>{isCwOpen() ? 'expand_less' : 'expand_more'}</i>
                            <span>{isCwOpen() ? t('note.preview_cw_hide') : t('note.preview_cw_show')}</span>
                          </button>
                        </div>
                      </Show>

                      {/* ノート本文 */}
                      <Show when={!note.cw || isCwOpen()}>
                        <div
                          class="mizuna-note-body"
                          innerHTML={note.text ? renderMfm(note.text, note.emojis) : ''}
                        />

                        {/* 添付画像 */}
                        <Show when={note.files && note.files.length > 0}>
                          <div class={`mizuna-note-files-grid count-${Math.min(note.files!.length, 4)}`}>
                            <For each={note.files}>
                              {(file) => (
                                <div
                                  class="mizuna-note-file-item"
                                  onClick={() => setPreviewImage(file.url)}
                                >
                                  <img
                                    src={file.thumbnailUrl || file.url}
                                    alt={file.name}
                                    loading="lazy"
                                  />
                                </div>
                              )}
                            </For>
                          </div>
                        </Show>
                      </Show>

                      {/* リアクション一覧 */}
                      <Show when={note.reactions && Object.keys(note.reactions).length > 0}>
                        <div class="mizuna-note-reactions">
                          <For each={Object.entries(note.reactions!)}>
                            {([rawReaction, count]) => {
                              const emojiUrl = getReactionEmojiUrl(rawReaction, note);
                              const cleanName = rawReaction.replace(/^:|:$/g, '');
                              return (
                                <span class="mizuna-reaction-pill" title={`${cleanName}: ${count}`}>
                                  <Show
                                    when={emojiUrl}
                                    fallback={<span>{rawReaction}</span>}
                                  >
                                    <img
                                      src={emojiUrl!}
                                      alt={cleanName}
                                      loading="lazy"
                                      decoding="async"
                                    />
                                  </Show>
                                  <span class="mizuna-reaction-count">{count}</span>
                                </span>
                              );
                            }}
                          </For>
                        </div>
                      </Show>

                      {/* アクションバー (リプライ確認・返信・ブラウザで開く) */}
                      <div class="mizuna-note-card-actions">
                        <div class="mizuna-note-actions-left">
                          {/* リプライ確認ボタン (Issue #130) */}
                          <button
                            type="button"
                            class={`mizuna-note-action-chip ${replyState()?.isOpen ? 'is-active' : ''}`}
                            onClick={() => toggleReplies(note.id)}
                            title={t('history.show_replies')}
                          >
                            <i>chat_bubble_outline</i>
                            <span>
                              {repliesCount() > 0 ? repliesCount() : t('history.show_replies')}
                            </span>
                          </button>

                          {/* 返信ボタン (Issue #131) */}
                          <button
                            type="button"
                            class="mizuna-note-action-chip"
                            onClick={() => handleReplyClick(note)}
                            title={t('history.reply_to')}
                          >
                            <i>reply</i>
                            <span>{t('history.reply_to')}</span>
                          </button>
                        </div>

                        <div class="mizuna-note-actions-right">
                          <button
                            type="button"
                            class="mizuna-note-action-icon-btn"
                            onClick={() => openNoteInBrowser(note.id)}
                            title={t('history.open_in_browser')}
                          >
                            <i>open_in_new</i>
                          </button>
                        </div>
                      </div>

                      {/* リプライ一覧展開エリア (Issue #130) */}
                      <Show when={replyState()?.isOpen}>
                        <div class="mizuna-replies-thread">
                          <Show when={replyState()?.loading}>
                            <div class="mizuna-replies-loading">
                              <div class="mizuna-spinner small" />
                              <span>{t('history.loading_replies')}</span>
                            </div>
                          </Show>

                          <Show when={!replyState()?.loading && replyState()?.list.length === 0}>
                            <div class="mizuna-replies-empty">
                              <span>{t('history.no_replies')}</span>
                            </div>
                          </Show>

                          <Show when={!replyState()?.loading && (replyState()?.list.length ?? 0) > 0}>
                            <div class="mizuna-replies-list">
                              <For each={replyState()?.list}>
                                {(childNote) => {
                                  const childAvatar = () =>
                                    getDisplayAvatarUrl(childNote.user.avatarUrl, settings().is_visible_icon);
                                  const childName = () => childNote.user.name || childNote.user.username;

                                  return (
                                    <div class="mizuna-reply-item">
                                      <div class="mizuna-reply-header">
                                        <img
                                          src={childAvatar()}
                                          alt=""
                                          class="mizuna-reply-avatar"
                                          loading="lazy"
                                        />
                                        <div class="mizuna-reply-author">
                                          <span class="mizuna-reply-name" innerHTML={renderInlineEmoji(childName(), childNote.user.emojis)} />
                                          <span class="mizuna-reply-handle">@{childNote.user.username}</span>
                                        </div>
                                        <time class="mizuna-reply-time">
                                          {formatRelativeTime(childNote.createdAt)}
                                        </time>
                                      </div>

                                      <div
                                        class="mizuna-reply-body"
                                        innerHTML={childNote.text ? renderMfm(childNote.text, childNote.emojis) : ''}
                                      />

                                      {/* リプライのリアクション一覧 */}
                                      <Show when={childNote.reactions && Object.keys(childNote.reactions).length > 0}>
                                        <div class="mizuna-note-reactions is-reply">
                                          <For each={Object.entries(childNote.reactions!)}>
                                            {([rawReaction, count]) => {
                                              const emojiUrl = getReactionEmojiUrl(rawReaction, childNote);
                                              const cleanName = rawReaction.replace(/^:|:$/g, '');
                                              return (
                                                <span class="mizuna-reaction-pill" title={`${cleanName}: ${count}`}>
                                                  <Show
                                                    when={emojiUrl}
                                                    fallback={<span>{rawReaction}</span>}
                                                  >
                                                    <img
                                                      src={emojiUrl!}
                                                      alt={cleanName}
                                                      loading="lazy"
                                                      decoding="async"
                                                    />
                                                  </Show>
                                                  <span class="mizuna-reaction-count">{count}</span>
                                                </span>
                                              );
                                            }}
                                          </For>
                                        </div>
                                      </Show>

                                      <div class="mizuna-reply-actions">
                                        {/* リプライの子リプライへ返信するボタン (Issue #131) */}
                                        <button
                                          type="button"
                                          class="mizuna-reply-action-btn"
                                          onClick={() => handleReplyClick(childNote)}
                                        >
                                          <i>reply</i>
                                          <span>{t('history.reply_to')}</span>
                                        </button>
                                        <button
                                          type="button"
                                          class="mizuna-reply-action-icon-btn"
                                          onClick={() => openNoteInBrowser(childNote.id)}
                                          title={t('history.open_in_browser')}
                                        >
                                          <i>open_in_new</i>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                }}
                              </For>
                            </div>
                          </Show>
                        </div>
                      </Show>
                    </article>
                  );
                }}
              </For>

              {/* ページネーション: さらに読み込む (Issue #129) */}
              <div class="mizuna-history-pagination">
                <Show
                  when={hasMore()}
                  fallback={<div class="mizuna-history-nomore">{t('history.no_more')}</div>}
                >
                  <button
                    type="button"
                    class="mizuna-btn mizuna-btn-secondary mizuna-history-loadmore-btn"
                    onClick={() => loadNotes(false)}
                    disabled={isLoadingMore()}
                  >
                    <Show
                      when={!isLoadingMore()}
                      fallback={
                        <>
                          <div class="mizuna-spinner small" />
                          <span>{t('history.loading_more')}</span>
                        </>
                      }
                    >
                      <i>expand_more</i>
                      <span>{t('history.load_more')}</span>
                    </Show>
                  </button>
                </Show>
              </div>
            </div>
          </Show>
        </div>
      </Show>

      {/* 画像プレビュー用ライトボックス */}
      <Show when={previewImage()}>
        {(src) => (
          <div
            class="mizuna-history-lightbox"
            onClick={() => setPreviewImage(null)}
          >
            <img src={src()} alt="" class="mizuna-history-lightbox-img" />
          </div>
        )}
      </Show>
    </div>
  );
}
