import gsap from 'gsap';
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  Show,
} from 'solid-js';
import { Portal } from 'solid-js/web';
import { fetchDriveImages, type MisskeyFile } from '../services/misskeyApi';
import { useApp } from '../store/appStore';

interface DriveImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLocalFilePicker: () => void;
}

export function DriveImagePickerModal(props: DriveImagePickerModalProps) {
  const {
    currentUser,
    attachedImages,
    addAttachedDriveFiles,
    showToast,
    pushModalBackHandler,
    t,
  } = useApp();

  const [driveFiles, setDriveFiles] = createSignal<MisskeyFile[]>([]);
  const [selectedFiles, setSelectedFiles] = createSignal<MisskeyFile[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [isLoadingMore, setIsLoadingMore] = createSignal(false);
  const [hasMore, setHasMore] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);

  let backdropRef: HTMLDivElement | undefined;
  let cardRef: HTMLDivElement | undefined;

  const attachedDriveIds = createMemo(() => {
    const set = new Set<string>();
    for (const img of attachedImages()) {
      if (img.driveFileId) set.add(img.driveFileId);
    }
    return set;
  });

  const selectedIndexMap = createMemo(() => {
    const map = new Map<string, number>();
    selectedFiles().forEach((f, idx) => map.set(f.id, idx + 1));
    return map;
  });

  const loadDriveFiles = async (reset = false) => {
    const user = currentUser();
    if (!user) return;

    if (reset) {
      setIsLoading(true);
      setErrorMessage(null);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const currentList = reset ? [] : driveFiles();
      const untilId =
        currentList.length > 0 ? currentList[currentList.length - 1].id : undefined;
      const fetched = await fetchDriveImages(user, { limit: 24, untilId });

      setHasMore(fetched.length >= 24);
      if (reset) {
        setDriveFiles(fetched);
      } else {
        const existingIds = new Set(currentList.map((f) => f.id));
        const deduped = fetched.filter((f) => !existingIds.has(f.id));
        setDriveFiles([...currentList, ...deduped]);
      }
    } catch (err) {
      console.error('Failed to load Misskey Drive images:', err);
      setErrorMessage(t('note.drive_error'));
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  createEffect(() => {
    if (props.isOpen) {
      setSelectedFiles([]);
      loadDriveFiles(true);

      const cleanupBack = pushModalBackHandler(() => props.onClose());
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          props.onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      onCleanup(() => {
        cleanupBack();
        window.removeEventListener('keydown', handleKeyDown);
      });
    }
  });

  const toggleSelectFile = (file: MisskeyFile) => {
    if (attachedDriveIds().has(file.id)) return;

    const currentSelected = selectedFiles();
    const exists = currentSelected.some((f) => f.id === file.id);
    if (exists) {
      setSelectedFiles(currentSelected.filter((f) => f.id !== file.id));
      return;
    }

    if (attachedImages().length + currentSelected.length >= 16) {
      showToast('画像は16枚までです', 'warning');
      return;
    }

    setSelectedFiles([...currentSelected, file]);
  };

  const handleConfirmSelection = () => {
    const chosen = selectedFiles();
    if (chosen.length === 0) return;
    addAttachedDriveFiles(chosen);
    props.onClose();
  };

  const handleSelectFromDevice = () => {
    props.onClose();
    props.onOpenLocalFilePicker();
  };

  return (
    <Show when={props.isOpen}>
      <Portal>
        <div
          class="mizuna-modal-portal mizuna-drive-picker-portal"
          role="dialog"
          aria-modal="true"
          aria-label={t('note.image_picker_title')}
        >
          <div
            ref={(el) => {
              backdropRef = el;
              gsap.fromTo(
                el,
                { opacity: 0 },
                { opacity: 1, duration: 0.2, ease: 'power2.out' }
              );
            }}
            class="mizuna-modal-backdrop"
            onClick={() => props.onClose()}
          />

          <div
            ref={(el) => {
              cardRef = el;
              gsap.fromTo(
                el,
                { opacity: 0, scale: 0.94, y: 16 },
                { opacity: 1, scale: 1, y: 0, duration: 0.26, ease: 'power3.out' }
              );
            }}
            class="mizuna-picker-modal mizuna-drive-picker-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div class="mizuna-picker-header">
              <div class="mizuna-picker-title-wrap">
                <div class="mizuna-picker-icon">
                  <i>add_photo_alternate</i>
                </div>
                <div>
                  <h3 class="mizuna-picker-title">{t('note.image_picker_title')}</h3>
                  <p class="mizuna-picker-sub">{t('note.image_picker_sub')}</p>
                </div>
              </div>
              <button
                type="button"
                class="mizuna-icon-btn-sm"
                onClick={() => props.onClose()}
                aria-label={t('common.close')}
              >
                <i>close</i>
              </button>
            </div>

            <div class="mizuna-drive-picker-body">
              {/* 端末から新しくファイルを選択するカードボタン */}
              <button
                type="button"
                class="mizuna-drive-upload-card"
                onClick={handleSelectFromDevice}
              >
                <div class="mizuna-drive-upload-icon">
                  <i>upload_file</i>
                </div>
                <div class="mizuna-drive-upload-text">
                  <span class="mizuna-drive-upload-title">{t('note.upload_from_device')}</span>
                  <span class="mizuna-drive-upload-sub">{t('note.upload_from_device_sub')}</span>
                </div>
                <i class="mizuna-drive-upload-arrow">chevron_right</i>
              </button>

              {/* Misskeyドライブ（アップロード済み画像）セクション */}
              <div class="mizuna-drive-section">
                <div class="mizuna-drive-section-head">
                  <div class="mizuna-drive-section-title">
                    <i>cloud_done</i>
                    <span>{t('note.drive_section_title')}</span>
                  </div>
                  <button
                    type="button"
                    class="mizuna-tool-icon-btn"
                    onClick={() => loadDriveFiles(true)}
                    disabled={isLoading()}
                    title={t('common.refresh')}
                    aria-label={t('common.refresh')}
                  >
                    <i>refresh</i>
                  </button>
                </div>

                <Show when={isLoading()}>
                  <div class="mizuna-drive-status">
                    <div class="mizuna-spinner" />
                    <span>{t('note.drive_loading')}</span>
                  </div>
                </Show>

                <Show when={!isLoading() && errorMessage()}>
                  <div class="mizuna-drive-status is-error">
                    <i>error_outline</i>
                    <span>{errorMessage()}</span>
                  </div>
                </Show>

                <Show when={!isLoading() && !errorMessage() && driveFiles().length === 0}>
                  <div class="mizuna-drive-status">
                    <i>perm_media</i>
                    <span>{t('note.drive_empty')}</span>
                  </div>
                </Show>

                <Show when={!isLoading() && driveFiles().length > 0}>
                  <div class="mizuna-drive-grid">
                    <For each={driveFiles()}>
                      {(file) => {
                        const isAlreadyAttached = () => attachedDriveIds().has(file.id);
                        const selectedOrder = () => selectedIndexMap().get(file.id);
                        const isSelected = () => Boolean(selectedOrder());

                        return (
                          <button
                            type="button"
                            class={`mizuna-drive-item ${isSelected() ? 'is-selected' : ''} ${
                              isAlreadyAttached() ? 'is-attached' : ''
                            }`}
                            disabled={isAlreadyAttached()}
                            onClick={() => toggleSelectFile(file)}
                            title={file.name}
                          >
                            <img
                              src={file.thumbnailUrl || file.url}
                              alt={file.name}
                              loading="lazy"
                              decoding="async"
                            />
                            <Show when={isAlreadyAttached()}>
                              <span class="mizuna-drive-attached-badge">
                                {t('note.drive_already_attached')}
                              </span>
                            </Show>
                            <Show when={selectedOrder()}>
                              {(order) => (
                                <span class="mizuna-drive-select-badge">{order()}</span>
                              )}
                            </Show>
                          </button>
                        );
                      }}
                    </For>
                  </div>

                  <Show when={hasMore()}>
                    <div class="mizuna-drive-more-wrap">
                      <button
                        type="button"
                        class="mizuna-btn mizuna-btn-outline mizuna-drive-more-btn"
                        onClick={() => loadDriveFiles(false)}
                        disabled={isLoadingMore()}
                      >
                        <Show
                          when={!isLoadingMore()}
                          fallback={<div class="mizuna-spinner small" />}
                        >
                          <i>expand_more</i>
                        </Show>
                        <span>{t('note.drive_load_more')}</span>
                      </button>
                    </div>
                  </Show>
                </Show>
              </div>
            </div>

            {/* フッター（選択中画像があるときに表示） */}
            <Show when={selectedFiles().length > 0}>
              <div class="mizuna-drive-picker-footer">
                <button
                  type="button"
                  class="mizuna-btn mizuna-btn-primary mizuna-drive-confirm-btn"
                  onClick={handleConfirmSelection}
                >
                  <i>check_circle</i>
                  <span>
                    {t('note.drive_add_selected', { count: selectedFiles().length })}
                  </span>
                </button>
              </div>
            </Show>
          </div>
        </div>
      </Portal>
    </Show>
  );
}
