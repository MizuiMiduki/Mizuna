import gsap from 'gsap';
import { createEffect, For, onCleanup, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { useApp } from '../store/appStore';
import { type DraftRecord } from '../db/database';
import { getDisplayAvatarUrl } from '../utils/image';

export interface DraftsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatDraftDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'たった今';
  if (diffMins < 60) return `${diffMins}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function DraftsModal(props: DraftsModalProps) {
  const {
    settings,
    drafts,
    draftCount,
    saveCurrentAsDraft,
    restoreDraft,
    deleteDraftById,
    deleteAllDrafts,
    openDialog,
    closeDialog,
    pushModalBackHandler,
    t,
  } = useApp();

  let backdropRef: HTMLDivElement | undefined;
  let cardRef: HTMLDivElement | undefined;

  // ESCキー / 戻るボタンのハンドリング
  createEffect(() => {
    if (!props.isOpen) return;

    const removeBack = pushModalBackHandler(() => props.onClose());

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        props.onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    onCleanup(() => {
      removeBack();
      window.removeEventListener('keydown', handleKeyDown);
    });
  });

  const handleRestore = async (draft: DraftRecord) => {
    const success = await restoreDraft(draft);
    if (success) {
      props.onClose();
    }
  };

  const handleDelete = (draft: DraftRecord) => {
    if (typeof draft.id !== 'number') return;
    openDialog({
      title: t('draft.delete_confirm_title'),
      icon: 'delete',
      tone: 'danger',
      contentText: t('draft.delete_confirm_desc'),
      buttons: [
        {
          label: 'キャンセル',
          variant: 'text',
          onClick: () => closeDialog(),
        },
        {
          label: t('draft.delete'),
          variant: 'fill',
          onClick: async () => {
            closeDialog();
            await deleteDraftById(draft.id!);
          },
        },
      ],
    });
  };

  const handleClearAll = () => {
    const count = draftCount();
    if (count === 0) return;
    openDialog({
      title: t('draft.clear_all_confirm_title'),
      icon: 'delete_sweep',
      tone: 'danger',
      contentText: t('draft.clear_all_confirm_desc', { count }),
      buttons: [
        {
          label: 'キャンセル',
          variant: 'text',
          onClick: () => closeDialog(),
        },
        {
          label: t('draft.clear_all'),
          variant: 'fill',
          onClick: async () => {
            closeDialog();
            await deleteAllDrafts();
          },
        },
      ],
    });
  };

  return (
    <Show when={props.isOpen}>
      <Portal>
        <div class="mizuna-modal-portal" role="dialog" aria-modal="true" aria-labelledby="drafts-modal-title">
          <div
            ref={(el) => {
              backdropRef = el;
              gsap.fromTo(
                el,
                { opacity: 0 },
                { opacity: 1, duration: 0.22, ease: 'power2.out' }
              );
            }}
            class="mizuna-modal-backdrop"
            style={{ opacity: 0 }}
            onClick={props.onClose}
          />

          <div
            ref={(el) => {
              cardRef = el;
              gsap.fromTo(
                el,
                { opacity: 0, scale: 0.94, y: 14 },
                { opacity: 1, scale: 1, y: 0, duration: 0.26, ease: 'back.out(1.4)' }
              );
            }}
            class="mizuna-drafts-modal"
            style={{ opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* モーダルヘッダー */}
            <div class="mizuna-picker-header">
              <div class="mizuna-picker-title-wrap">
                <div class="mizuna-picker-icon">
                  <i>drafts</i>
                </div>
                <div>
                  <div class="mizuna-drafts-header-title-row">
                    <h3 id="drafts-modal-title" class="mizuna-picker-title">{t('draft.title')}</h3>
                    <span class="mizuna-drafts-count-badge">{draftCount()}</span>
                  </div>
                  <p class="mizuna-picker-sub">アカウント情報と共に保存され、いつでも復帰できます</p>
                </div>
              </div>
              <button
                type="button"
                class="mizuna-icon-btn-sm"
                onClick={props.onClose}
                aria-label="閉じる"
              >
                <i>close</i>
              </button>
            </div>

            {/* クイック操作ツールバー */}
            <div class="mizuna-drafts-toolbar">
              <button
                type="button"
                class="mizuna-btn mizuna-btn-primary mizuna-drafts-save-btn"
                onClick={async () => {
                  await saveCurrentAsDraft();
                }}
              >
                <i>bookmark_add</i>
                <span>{t('draft.save_current')}</span>
              </button>

              <Show when={draftCount() > 0}>
                <button
                  type="button"
                  class="mizuna-btn mizuna-btn-ghost-danger mizuna-drafts-clear-btn"
                  onClick={handleClearAll}
                >
                  <i>delete_sweep</i>
                  <span>{t('draft.clear_all')}</span>
                </button>
              </Show>
            </div>

            {/* 下書きリスト本体 */}
            <div class="mizuna-drafts-list">
              <Show
                when={drafts().length > 0}
                fallback={
                  <div class="mizuna-drafts-empty">
                    <div class="mizuna-drafts-empty-icon">
                      <i>drafts</i>
                    </div>
                    <p class="mizuna-drafts-empty-title">{t('draft.empty_desc')}</p>
                    <p class="mizuna-drafts-empty-sub">
                      入力したノートは「下書き保存」ボタンでアカウントごと保存できます
                    </p>
                  </div>
                }
              >
                <For each={drafts()}>
                  {(draft) => {
                    const avatarSrc = () => getDisplayAvatarUrl(draft.accountAvatarUrl, settings().is_visible_icon);
                    const accountDisplay = () => draft.accountName || draft.accountUsername;
                    const accountFullHandle = () => `@${draft.accountUsername}@${draft.accountAddress}`;

                    return (
                      <div class="mizuna-draft-card">
                        {/* アカウント・作成日ヘッダー */}
                        <div class="mizuna-draft-card-header">
                          <div class="mizuna-draft-account">
                            <img
                              src={avatarSrc()}
                              alt=""
                              class="mizuna-draft-avatar"
                              loading="lazy"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  'https://dummyimage.com/64x64/333333/ffffff.png&text=?';
                              }}
                            />
                            <div class="mizuna-draft-account-info">
                              <span class="mizuna-draft-name">{accountDisplay()}</span>
                              <span class="mizuna-draft-handle">{accountFullHandle()}</span>
                            </div>
                          </div>

                          <div class="mizuna-draft-meta-right">
                            <span class="mizuna-draft-time" title={new Date(draft.updatedAt).toLocaleString()}>
                              <i>schedule</i>
                              {formatDraftDate(draft.updatedAt)}
                            </span>
                          </div>
                        </div>

                        {/* バッジ行 (CW, 公開範囲, 画像枚数) */}
                        <div class="mizuna-draft-badges">
                          <span class={`mizuna-draft-badge visibility-${draft.visibility}`}>
                            <i>
                              {draft.visibility === 'public'
                                ? 'public'
                                : draft.visibility === 'home'
                                ? 'home'
                                : 'lock'}
                            </i>
                            {draft.visibility === 'public'
                              ? t('note.visibility_public')
                              : draft.visibility === 'home'
                              ? t('note.visibility_home')
                              : t('note.visibility_followers')}
                          </span>

                          <Show when={draft.cwEnabled && draft.cwText}>
                            <span class="mizuna-draft-badge cw">
                              <i>visibility_off</i>
                              CW
                            </span>
                          </Show>

                          <Show when={draft.images && draft.images.length > 0}>
                            <span class="mizuna-draft-badge image">
                              <i>image</i>
                              {t('draft.images_count', { count: draft.images!.length })}
                            </span>
                          </Show>

                          <Show when={draft.endMizuna}>
                            <span class="mizuna-draft-badge mizuna">
                              <i>auto_awesome</i>
                              Mizuna
                            </span>
                          </Show>
                        </div>

                        {/* CWテキスト */}
                        <Show when={draft.cwEnabled && draft.cwText}>
                          <div class="mizuna-draft-cw-box">
                            <span class="mizuna-draft-cw-label">CW:</span>
                            <span class="mizuna-draft-cw-text">{draft.cwText}</span>
                          </div>
                        </Show>

                        {/* 本文プレビュー */}
                        <div class="mizuna-draft-body">
                          {draft.text ? draft.text : <span class="mizuna-draft-empty-text">（本文なし）</span>}
                        </div>

                        {/* カードアクション (復元 / 削除) */}
                        <div class="mizuna-draft-card-actions">
                          <button
                            type="button"
                            class="mizuna-btn mizuna-btn-primary mizuna-draft-action-restore"
                            onClick={() => handleRestore(draft)}
                          >
                            <i>history_edu</i>
                            <span>{t('draft.restore')}</span>
                          </button>

                          <button
                            type="button"
                            class="mizuna-icon-btn-danger"
                            onClick={() => handleDelete(draft)}
                            aria-label={t('draft.delete')}
                            title={t('draft.delete')}
                          >
                            <i>delete_outline</i>
                          </button>
                        </div>
                      </div>
                    );
                  }}
                </For>
              </Show>
            </div>
          </div>
        </div>
      </Portal>
    </Show>
  );
}
