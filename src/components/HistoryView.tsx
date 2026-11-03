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
import { Portal } from 'solid-js/web';
import {
  deleteMisskeyNote,
  fetchNoteChildren,
  fetchServerEmojis,
  fetchUserMentions,
  fetchUserNotes,
  type MisskeyFile,
  type MisskeyNote,
} from '../services/misskeyApi';
import { useApp } from '../store/appStore';
import {
  type HistoryTab,
  type RepliesState,
  getAccountCacheKey,
  getHistoryCache,
  historyCacheVersion,
  setHistoryCache,
} from '../store/historyStore';
import { getDisplayAvatarUrl } from '../utils/image';
import {
  renderMfm,
  renderInlineEmoji,
  type RenderMfmOptions,
} from '../utils/mfm';
import { hasHistoryPermission } from '../utils/version';

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
    replyTargetNote,
    cancelReply,
    setCurrentView,
    showToast,
    openDialog,
    closeDialog,
    pushModalBackHandler,
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
  const [deletingNoteId, setDeletingNoteId] = createSignal<string | null>(null);

  // ノートごとのリプライ展開状態 (noteId -> RepliesState)
  const [repliesMap, setRepliesMap] = createSignal<Record<string, RepliesState>>({});

  // CW展開状態 (noteId -> boolean)
  const [expandedCwMap, setExpandedCwMap] = createSignal<Record<string, boolean>>({});

  // 画像プレビューモーダル（投稿単位のカルーセル・スワイプ対応）
  const [previewFiles, setPreviewFiles] = createSignal<MisskeyFile[]>([]);
  const [previewIndex, setPreviewIndex] = createSignal<number>(-1);
  const [lightboxDragX, setLightboxDragX] = createSignal(0);
  const [isLightboxDragging, setIsLightboxDragging] = createSignal(false);

  const isPreviewOpen = createMemo(() => previewIndex() >= 0 && previewFiles().length > 0);
  const currentPreviewFile = createMemo(() => {
    const idx = previewIndex();
    const files = previewFiles();
    if (idx < 0 || idx >= files.length) return null;
    return files[idx] ?? null;
  });

  const openPreview = (files: MisskeyFile[], index: number) => {
    if (!files || files.length === 0) return;
    setIsLightboxDragging(false);
    setLightboxDragX(0);
    setPreviewFiles(files);
    setPreviewIndex(Math.max(0, Math.min(index, files.length - 1)));
  };

  const closePreview = () => {
    setIsLightboxDragging(false);
    setLightboxDragX(0);
    setPreviewIndex(-1);
    setPreviewFiles([]);
  };

  const handlePrevPreviewImage = () => {
    const files = previewFiles();
    if (files.length <= 1) return;
    const idx = previewIndex();
    const nextIdx = idx > 0 ? idx - 1 : files.length - 1;
    setIsLightboxDragging(false);
    setLightboxDragX(0);
    setPreviewIndex(nextIdx);
  };

  const handleNextPreviewImage = () => {
    const files = previewFiles();
    if (files.length <= 1) return;
    const idx = previewIndex();
    const nextIdx = idx < files.length - 1 ? idx + 1 : 0;
    setIsLightboxDragging(false);
    setLightboxDragX(0);
    setPreviewIndex(nextIdx);
  };

  // ライトボックスのスワイプ操作（指のダイレクト追従と物理スナップ）
  let lightboxTouchStartX = 0;
  let lightboxTouchStartY = 0;
  let lightboxTouchLastX = 0;
  let lightboxTouchLastTime = 0;
  let lightboxTouchVelocityX = 0;
  let isLightboxHorizontalSwipe = false;
  let hasLightboxSwiped = false;
  let lightboxSwipeResetTimer: ReturnType<typeof setTimeout> | undefined;

  const handleLightboxTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    lightboxTouchStartX = touch.clientX;
    lightboxTouchStartY = touch.clientY;
    lightboxTouchLastX = touch.clientX;
    lightboxTouchLastTime = Date.now();
    lightboxTouchVelocityX = 0;
    isLightboxHorizontalSwipe = false;
    setIsLightboxDragging(true);
    setLightboxDragX(0);
  };

  const handleLightboxTouchMove = (e: TouchEvent) => {
    if (!isLightboxDragging() || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - lightboxTouchStartX;
    const dy = touch.clientY - lightboxTouchStartY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (!isLightboxHorizontalSwipe && (absX > 6 || absY > 6)) {
      if (absX >= absY) {
        isLightboxHorizontalSwipe = true;
      } else {
        setIsLightboxDragging(false);
        setLightboxDragX(0);
        return;
      }
    }

    if (isLightboxHorizontalSwipe) {
      if (e.cancelable) {
        e.preventDefault();
      }

      const now = Date.now();
      const dt = now - lightboxTouchLastTime;
      if (dt > 10) {
        lightboxTouchVelocityX = (touch.clientX - lightboxTouchLastX) / dt;
        lightboxTouchLastX = touch.clientX;
        lightboxTouchLastTime = now;
      }

      if (absX > 10) {
        hasLightboxSwiped = true;
      }

      const files = previewFiles();
      const idx = previewIndex();

      let effectiveDx = dx;
      if (files.length <= 1) {
        effectiveDx = dx * 0.25;
      } else if (idx === 0 && dx > 0) {
        effectiveDx = dx * 0.3;
      } else if (idx === files.length - 1 && dx < 0) {
        effectiveDx = dx * 0.3;
      }

      setLightboxDragX(effectiveDx);
    }
  };

  const handleLightboxTouchEnd = () => {
    if (!isLightboxDragging()) return;
    setIsLightboxDragging(false);

    const dx = lightboxDragX();
    const files = previewFiles();
    const idx = previewIndex();

    if (!isLightboxHorizontalSwipe || files.length <= 1) {
      setLightboxDragX(0);
      isLightboxHorizontalSwipe = false;
      clearTimeout(lightboxSwipeResetTimer);
      lightboxSwipeResetTimer = setTimeout(() => {
        hasLightboxSwiped = false;
      }, 120);
      return;
    }

    const flick = Math.abs(lightboxTouchVelocityX) > 0.25 ? lightboxTouchVelocityX * 120 : 0;
    const projectedX = dx + flick;
    const threshold = 40;

    if (projectedX < -threshold && idx < files.length - 1) {
      setPreviewIndex(idx + 1);
    } else if (projectedX > threshold && idx > 0) {
      setPreviewIndex(idx - 1);
    }

    setLightboxDragX(0);
    isLightboxHorizontalSwipe = false;
    clearTimeout(lightboxSwipeResetTimer);
    lightboxSwipeResetTimer = setTimeout(() => {
      hasLightboxSwiped = false;
    }, 120);
  };

  createEffect(() => {
    if (isPreviewOpen()) {
      const cleanupBack = pushModalBackHandler(() => closePreview());
      const handleLightboxKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handlePrevPreviewImage();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleNextPreviewImage();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          closePreview();
        }
      };
      window.addEventListener('keydown', handleLightboxKeyDown);
      onCleanup(() => {
        cleanupBack();
        window.removeEventListener('keydown', handleLightboxKeyDown);
      });
    }
  });

  // サーバーカスタム絵文字マップ (/api/emojis キャッシュ)
  const [serverEmojiMap, setServerEmojiMap] = createSignal<Map<string, string>>(new Map());

  createEffect(async () => {
    const address = currentUser()?.address;
    if (address) {
      const map = await fetchServerEmojis(address);
      setServerEmojiMap(map);
    }
  });

  const mfmOptions = createMemo<RenderMfmOptions>(() => ({
    serverAddress: currentUser()?.address,
    serverEmojiMap: serverEmojiMap(),
  }));

  const getAccountKey = () => getAccountCacheKey(currentUser());

  const syncCache = (updated?: {
    notes?: MisskeyNote[];
    hasMore?: boolean;
    repliesMap?: Record<string, RepliesState>;
    expandedCwMap?: Record<string, boolean>;
  }) => {
    const key = getAccountKey();
    if (!key) return;
    setHistoryCache(key, activeTab(), {
      notes: updated?.notes ?? notes(),
      hasMore: updated?.hasMore ?? hasMore(),
      repliesMap: updated?.repliesMap ?? repliesMap(),
      expandedCwMap: updated?.expandedCwMap ?? expandedCwMap(),
      isLoaded: true,
    });
  };

  const toggleCw = (noteId: string) => {
    setExpandedCwMap((prev) => {
      const next = {
        ...prev,
        [noteId]: !prev[noteId],
      };
      syncCache({ expandedCwMap: next });
      return next;
    });
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

      const nextHasMore = fetched.length >= 10;
      if (!nextHasMore) {
        setHasMore(false);
      }

      let newNotes: MisskeyNote[];
      if (reset) {
        newNotes = fetched;
        setNotes(fetched);
      } else {
        newNotes = [...currentNotes, ...fetched];
        setNotes(newNotes);
      }

      // キャッシュを更新（ページ遷移しても再取得不要にする）
      syncCache({
        notes: newNotes,
        hasMore: nextHasMore,
      });
    } catch (err) {
      console.error('Failed to fetch history:', err);
      setErrorMessage(t('history.error_load'));
      showToast(t('history.error_load'), 'error');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // タブ・アカウント切り替え、またはノート投稿によるキャッシュ更新時に確認。キャッシュがあれば復元し、なければ初回フェッチ
  createEffect(() => {
    historyCacheVersion();
    const tab = activeTab();
    const user = currentUser();
    if (!user || !isHistorySupported()) return;

    const key = getAccountKey();
    const cached = getHistoryCache(key, tab);

    if (cached && cached.isLoaded) {
      // キャッシュが存在する場合は復元し、API 通信はスキップ
      setNotes(cached.notes);
      setHasMore(cached.hasMore);
      setRepliesMap(cached.repliesMap);
      setExpandedCwMap(cached.expandedCwMap);
      setErrorMessage(null);
    } else {
      // キャッシュがない場合のみ初回フェッチ
      setNotes([]);
      setRepliesMap({});
      setExpandedCwMap({});
      loadNotes(true);
    }
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
      setRepliesMap((prev) => {
        const next = { ...prev, [noteId]: { ...prev[noteId], isOpen: false } };
        syncCache({ repliesMap: next });
        return next;
      });
      return;
    }

    if (current?.loaded) {
      // すでに取得済みなら開くだけ
      setRepliesMap((prev) => {
        const next = { ...prev, [noteId]: { ...prev[noteId], isOpen: true } };
        syncCache({ repliesMap: next });
        return next;
      });
      return;
    }

    // 初回取得
    setRepliesMap((prev) => ({
      ...prev,
      [noteId]: { loading: true, list: [], loaded: false, isOpen: true },
    }));

    try {
      const children = await fetchNoteChildren(user, noteId, { limit: 10 });
      setRepliesMap((prev) => {
        const next = {
          ...prev,
          [noteId]: { loading: false, list: children, loaded: true, isOpen: true },
        };
        syncCache({ repliesMap: next });
        return next;
      });
    } catch (err) {
      console.error('Failed to fetch replies:', err);
      showToast('リプライの取得に失敗しました', 'error');
      setRepliesMap((prev) => {
        const next = {
          ...prev,
          [noteId]: { loading: false, list: [], loaded: true, isOpen: true },
        };
        syncCache({ repliesMap: next });
        return next;
      });
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

  const isOwnNote = (target: MisskeyNote) => {
    const user = currentUser();
    if (!user) return false;
    return activeTab() === 'my_notes' || target.user.username === user.username;
  };

  const executeDeleteNote = async (noteId: string) => {
    const user = currentUser();
    if (!user || deletingNoteId()) return;

    setDeletingNoteId(noteId);
    try {
      await deleteMisskeyNote(user, noteId);

      const nextNotes = notes().filter((n) => n.id !== noteId);
      setNotes(nextNotes);

      const prevReplies = repliesMap();
      const nextReplies: Record<string, RepliesState> = {};
      for (const [parentId, state] of Object.entries(prevReplies)) {
        if (parentId === noteId) continue;
        nextReplies[parentId] = {
          ...state,
          list: state.list.filter((child) => child.id !== noteId),
        };
      }
      setRepliesMap(nextReplies);

      syncCache({
        notes: nextNotes,
        repliesMap: nextReplies,
      });

      if (replyTargetNote()?.id === noteId) {
        cancelReply();
      }

      showToast(t('history.deleted'), 'info');
    } catch (err) {
      console.error('Failed to delete note:', err);
      showToast(t('history.error_delete'), 'error');
    } finally {
      setDeletingNoteId(null);
    }
  };

  const handleDeleteNoteClick = (note: MisskeyNote) => {
    openDialog({
      title: t('history.delete_confirm_title'),
      icon: 'delete_forever',
      tone: 'danger',
      contentText: t('history.delete_confirm_desc'),
      buttons: [
        {
          label: t('common.cancel'),
          variant: 'text',
          onClick: () => closeDialog(),
        },
        {
          label: t('history.delete_button'),
          variant: 'error',
          onClick: async () => {
            closeDialog();
            await executeDeleteNote(note.id);
          },
        },
      ],
    });
  };

  return (
    <div ref={containerRef} class="mizuna-history-view">
      {/* ヘッダー */}
      <div class="mizuna-section-header mizuna-history-header">
        <h2 class="mizuna-section-title">{t('history.title')}</h2>

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
                    <article class={`mizuna-note-card ${note.replyId || note.reply ? 'is-reply' : ''}`}>
                      {/* リプライ先バナー（リプライで送られたノートの場合） */}
                      <Show when={note.replyId || note.reply}>
                        <div class="mizuna-note-reply-banner">
                          <div class="mizuna-note-reply-banner-head">
                            <i class="mizuna-note-reply-icon">reply</i>
                            <Show
                              when={note.reply?.user}
                              fallback={<span>{t('history.reply_badge')}</span>}
                            >
                              {(replyUser) => (
                                <span class="mizuna-note-reply-banner-user">
                                  {t('history.reply_to_user', { user: replyUser().username })}
                                </span>
                              )}
                            </Show>
                          </div>
                          <Show when={note.reply && (note.reply.text || note.reply.cw)}>
                            <div class="mizuna-note-reply-parent-snippet">
                              <Show when={note.reply!.cw}>
                                <span class="mizuna-cw-badge">CW</span>
                                <span innerHTML={renderInlineEmoji(note.reply!.cw || '', note.reply!.emojis, mfmOptions())} />
                              </Show>
                              <Show when={!note.reply!.cw && note.reply!.text}>
                                <span innerHTML={renderInlineEmoji(
                                  note.reply!.text!.length > 60
                                    ? `${note.reply!.text!.slice(0, 60)}…`
                                    : note.reply!.text!,
                                  note.reply!.emojis,
                                  mfmOptions()
                                )} />
                              </Show>
                            </div>
                          </Show>
                        </div>
                      </Show>

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
                            <span class="mizuna-note-author-name" innerHTML={renderInlineEmoji(userName(), note.user.emojis, mfmOptions())} />
                            <span class="mizuna-note-author-handle">@{note.user.username}</span>
                          </div>
                        </div>

                        <div class="mizuna-note-meta-right">
                          <Show when={note.replyId || note.reply}>
                            <span class="mizuna-note-reply-pill" title={t('history.reply_badge')}>
                              <i>reply</i>
                              <span>{t('history.reply_badge')}</span>
                            </span>
                          </Show>
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
                          <span class="mizuna-note-cw-text" innerHTML={renderMfm(note.cw || '', note.emojis, mfmOptions())} />
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
                        <Show when={note.text}>
                          <div
                            class="mizuna-note-body"
                            innerHTML={renderMfm(note.text!, note.emojis, mfmOptions())}
                          />
                        </Show>

                        {/* リノート元の抜粋（本文のみ・一部抜粋） */}
                        <Show when={note.renote}>
                          {(rn) => {
                            const excerpt = () => {
                              const src = rn().cw || rn().text || '';
                              return src.length > 80 ? `${src.slice(0, 80)}…` : src;
                            };
                            return (
                              <div class="mizuna-note-renote-block">
                                <div class="mizuna-note-renote-head">
                                  <i>repeat</i>
                                  <span>{t('history.renote_badge')}</span>
                                  <span
                                    class="mizuna-note-renote-user"
                                    innerHTML={renderInlineEmoji(
                                      rn().user.name || rn().user.username,
                                      rn().user.emojis,
                                      mfmOptions()
                                    )}
                                  />
                                </div>
                                <Show when={excerpt()}>
                                  <div
                                    class="mizuna-note-renote-excerpt"
                                    innerHTML={renderInlineEmoji(excerpt(), rn().emojis, mfmOptions())}
                                  />
                                </Show>
                              </div>
                            );
                          }}
                        </Show>

                        {/* 添付画像 */}
                        <Show when={note.files && note.files.length > 0}>
                          <div class={`mizuna-note-files-grid count-${Math.min(note.files!.length, 4)}`}>
                            <For each={note.files}>
                              {(file, fileIdx) => (
                                <div
                                  class="mizuna-note-file-item"
                                  onClick={() => openPreview(note.files!, fileIdx())}
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
                          <Show when={isOwnNote(note)}>
                            <button
                              type="button"
                              class="mizuna-note-action-icon-btn is-danger"
                              onClick={() => handleDeleteNoteClick(note)}
                              disabled={deletingNoteId() === note.id}
                              title={t('history.delete_note')}
                              aria-label={t('history.delete_note')}
                            >
                              <i>delete_outline</i>
                            </button>
                          </Show>
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
                                          <span class="mizuna-reply-name" innerHTML={renderInlineEmoji(childName(), childNote.user.emojis, mfmOptions())} />
                                          <span class="mizuna-reply-handle">@{childNote.user.username}</span>
                                        </div>
                                        <time class="mizuna-reply-time">
                                          {formatRelativeTime(childNote.createdAt)}
                                        </time>
                                      </div>

                                      <div
                                        class="mizuna-reply-body"
                                        innerHTML={childNote.text ? renderMfm(childNote.text, childNote.emojis, mfmOptions()) : ''}
                                      />

                                      <Show when={childNote.files && childNote.files.length > 0}>
                                        <div class={`mizuna-note-files-grid count-${Math.min(childNote.files!.length, 4)}`}>
                                          <For each={childNote.files}>
                                            {(file, fileIdx) => (
                                              <div
                                                class="mizuna-note-file-item"
                                                onClick={() => openPreview(childNote.files!, fileIdx())}
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
                                        <Show when={childNote.user.username === currentUser()?.username}>
                                          <button
                                            type="button"
                                            class="mizuna-reply-action-icon-btn is-danger"
                                            onClick={() => handleDeleteNoteClick(childNote)}
                                            disabled={deletingNoteId() === childNote.id}
                                            title={t('history.delete_note')}
                                            aria-label={t('history.delete_note')}
                                          >
                                            <i>delete_outline</i>
                                          </button>
                                        </Show>
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

      {/* 画像拡大プレビューモーダル（投稿単位のカルーセル・スワイプ対応） */}
      <Show when={isPreviewOpen()}>
        <Portal>
          <div
            class="mizuna-lightbox"
            onClick={() => {
              if (hasLightboxSwiped) {
                hasLightboxSwiped = false;
                return;
              }
              closePreview();
            }}
            onTouchStart={handleLightboxTouchStart}
            onTouchMove={handleLightboxTouchMove}
            onTouchEnd={handleLightboxTouchEnd}
            onTouchCancel={handleLightboxTouchEnd}
          >
            {/* メイン画像ステージ */}
            <div
              class="mizuna-lightbox-stage"
              onClick={() => {
                if (hasLightboxSwiped) {
                  hasLightboxSwiped = false;
                  return;
                }
                closePreview();
              }}
            >
              {/* 複数画像プレビュー時の左右ナビゲーションボタン */}
              <Show when={previewFiles().length > 1}>
                <button
                  type="button"
                  class="mizuna-lightbox-nav-btn is-prev"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevPreviewImage();
                  }}
                  aria-label="前の画像"
                  title="前の画像 (←)"
                >
                  <i>chevron_left</i>
                </button>
                <button
                  type="button"
                  class="mizuna-lightbox-nav-btn is-next"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextPreviewImage();
                  }}
                  aria-label="次の画像"
                  title="次の画像 (→)"
                >
                  <i>chevron_right</i>
                </button>
              </Show>

              {/* カルーセルトラック */}
              <div
                class="mizuna-lightbox-track"
                style={{
                  transform: `translateX(calc(${-Math.max(0, previewIndex()) * 100}% + ${lightboxDragX()}px))`,
                  transition: isLightboxDragging() ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <For each={previewFiles()}>
                  {(file) => (
                    <div
                      class="mizuna-lightbox-slide"
                      onClick={() => {
                        if (hasLightboxSwiped) {
                          hasLightboxSwiped = false;
                          return;
                        }
                        closePreview();
                      }}
                    >
                      <img
                        class="mizuna-lightbox-img"
                        src={file.url}
                        alt={file.name || ''}
                        decoding="async"
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                </For>
              </div>
            </div>

            {/* ボトムバー: 枚数インジケーター・ファイル名 & 閉じるボタン */}
            <div class="mizuna-lightbox-bottombar">
              <div class="mizuna-lightbox-bottombar-inner" onClick={(e) => e.stopPropagation()}>
                <div class="mizuna-lightbox-fileinfo">
                  <div class="mizuna-lightbox-filename-row">
                    <Show when={previewFiles().length > 1}>
                      <span class="mizuna-lightbox-order-badge">
                        {previewIndex() + 1} / {previewFiles().length}
                      </span>
                    </Show>
                    <span class="mizuna-lightbox-filename" title={currentPreviewFile()?.name}>
                      {currentPreviewFile()?.name || ''}
                    </span>
                  </div>
                </div>

                <div class="mizuna-lightbox-actions">
                  <button
                    type="button"
                    class="circle mizuna-lightbox-close-icon-btn"
                    onClick={() => closePreview()}
                    aria-label="閉じる"
                  >
                    <i>close</i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      </Show>
    </div>
  );
}
