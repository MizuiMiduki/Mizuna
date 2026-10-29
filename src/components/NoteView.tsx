import { Portal } from 'solid-js/web';
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
import { createMisskeyNote, uploadImagesToDrive } from '../services/misskeyApi';
import {
  useApp,
  type AttachedImageItem,
  type VisibilityType,
} from '../store/appStore';
import { getDisplayAvatarUrl } from '../utils/image';
import { comparisonVersion } from '../utils/version';
import { HoldHoverTip } from './HoldHoverTip';
import { ImageEditorModal } from './ImageEditorModal';

export function NoteView() {
  const {
    accounts,
    currentUser,
    settings,
    switchAccount,
    noteText,
    setNoteText,
    cwText,
    setCwText,
    cwEnabled,
    setCwEnabled,
    visibility,
    setVisibility,
    endMizuna,
    setEndMizuna,
    attachedImages,
    addAttachedFiles,
    removeAttachedImage,
    updateAttachedImage,
    clearNoteForm,
    showToast,
    t,
  } = useApp();

  const [isInputFocused, setIsInputFocused] = createSignal(false);
  const [isSending, setIsSending] = createSignal(false);
  const [sendingStatus, setSendingStatus] = createSignal('');
  const [previewModalImage, setPreviewModalImage] = createSignal<AttachedImageItem | null>(null);
  const [editingImageItem, setEditingImageItem] = createSignal<AttachedImageItem | null>(null);
  const [isDraggingOver, setIsDraggingOver] = createSignal(false);
  const [isAccountPickerOpen, setIsAccountPickerOpen] = createSignal(false);

  let viewContainerRef: HTMLDivElement | undefined;
  let cwSectionRef: HTMLDivElement | undefined;
  let cwInputRef: HTMLTextAreaElement | undefined;
  let noteInputRef: HTMLTextAreaElement | undefined;
  let fileInputRef: HTMLInputElement | undefined;
  let modalContentRef: HTMLImageElement | undefined;
  let pickerCardRef: HTMLDivElement | undefined;
  let pickerBackdropRef: HTMLDivElement | undefined;

  const maxCharCount = createMemo(() => (endMizuna() ? 2986 : 3000));
  const noteLength = createMemo(() => noteText().length);
  const cwLength = createMemo(() => cwText().length);

  const noteProgressPercent = createMemo(() =>
    Math.min(100, (noteLength() / maxCharCount()) * 100)
  );

  const noteZeroPadding = createMemo(() => {
    const digits = noteLength().toString().length;
    const count = Math.max(0, 5 - digits);
    return '0'.repeat(count);
  });

  const cwZeroPadding = createMemo(() => {
    const digits = cwLength().toString().length;
    const count = Math.max(0, 4 - digits);
    return '0'.repeat(count);
  });

  const noteCountStatus = createMemo(() => {
    const len = noteLength();
    const max = maxCharCount();
    if (len > max) return 'is-danger';
    if (len >= max * 0.9) return 'is-warning';
    return '';
  });

  const cwCountStatus = createMemo(() => {
    const len = cwLength();
    if (len >= 100) return 'is-danger';
    if (len >= 90) return 'is-warning';
    return '';
  });

  // CWエリア開閉のGSAPアニメーション
  createEffect(() => {
    const open = cwEnabled();
    if (!cwSectionRef) return;
    if (open) {
      gsap.fromTo(
        cwSectionRef,
        { height: 0, opacity: 0, y: -6 },
        { height: 'auto', opacity: 1, y: 0, duration: 0.28, ease: 'power3.out' }
      );
    }
  });

  // ノート送信処理
  const handleSendNote = async () => {
    if (isSending()) return;
    const user = currentUser();
    if (!user) {
      showToast(t('note.no_account'), 'error');
      return;
    }

    const rawNote = noteText();
    const rawCw = cwText();

    // CWバリデーション
    if (cwEnabled()) {
      const trimmedCw = rawCw.replace(/[\s\u3000]/g, '');
      if (trimmedCw.length === 0) {
        showToast(t('note.empty_desc'), 'warning', t('note.cw_empty'));
        return;
      }
      if (trimmedCw.length > 100) {
        showToast(t('note.cw_limit'), 'warning', t('note.cw_too_long'));
        return;
      }
    }

    // ノート本文バリデーション
    const trimmedNote = rawNote.replace(/[\s\u3000]/g, '');
    if (trimmedNote.length === 0) {
      showToast(t('note.empty_desc'), 'warning', t('note.empty'));
      return;
    }

    if (noteLength() > maxCharCount()) {
      showToast(t('note.too_long'), 'warning');
      return;
    }

    const images = attachedImages();
    if (images.length > 0) {
      if (comparisonVersion('3.5.0', user.add_mizuna_versinon) > 0) {
        showToast(
          'Mizuna 3.5.0以上のバージョンでアカウントを追加してください',
          'warning',
          'このアカウントでは画像付きノートが出来ません'
        );
        return;
      }
    }

    setIsSending(true);
    try {
      let fileIds: string[] | undefined;
      if (images.length > 0) {
        fileIds = await uploadImagesToDrive(
          images.map((item) => item.compressedFile ?? item.file),
          user,
          (status) => setSendingStatus(status)
        );
      }

      setSendingStatus(t('note.submitting'));
      await createMisskeyNote(
        user,
        rawNote,
        cwEnabled() ? rawCw : null,
        visibility(),
        endMizuna(),
        fileIds
      );

      showToast(t('note.sent'), 'success');
      clearNoteForm(false);
      if (fileInputRef) {
        fileInputRef.value = '';
      }
    } catch (err) {
      console.error('Send note error:', err);
      showToast(t('note.send_failed'), 'error');
    } finally {
      setIsSending(false);
      setSendingStatus('');
    }
  };

  // キーボードショートカット (Ctrl + Alt + Key)
  onMount(() => {
    if (viewContainerRef) {
      gsap.fromTo(
        viewContainerRef,
        { opacity: 0, y: 14, scale: 0.99 },
        { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'power3.out', clearProps: 'transform' }
      );
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.altKey) {
        switch (event.key.toLowerCase()) {
          case 'enter':
            event.preventDefault();
            handleSendNote();
            break;
          case 'p':
            event.preventDefault();
            setVisibility('public');
            break;
          case 'h':
            event.preventDefault();
            setVisibility('home');
            break;
          case 'f':
            event.preventDefault();
            setVisibility('followers');
            break;
          case 'w':
            event.preventDefault();
            setCwEnabled((prev) => !prev);
            break;
          case 'm':
            event.preventDefault();
            setEndMizuna((prev) => !prev);
            break;
          case 'v':
            event.preventDefault();
            fileInputRef?.click();
            break;
          case 'c':
            event.preventDefault();
            clearNoteForm(true);
            if (fileInputRef) fileInputRef.value = '';
            break;
          case 'i':
            event.preventDefault();
            noteInputRef?.focus();
            break;
          case 'o':
            event.preventDefault();
            if (!cwEnabled()) setCwEnabled(true);
            setTimeout(() => cwInputRef?.focus(), 50);
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    onCleanup(() => document.removeEventListener('keydown', handleKeyDown));
  });

  const handleOpenPreview = (item: AttachedImageItem) => {
    setPreviewModalImage(item);
    setTimeout(() => {
      if (modalContentRef) {
        gsap.fromTo(
          modalContentRef,
          { scale: 0.88, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.24, ease: 'back.out(1.5)', clearProps: 'transform' }
        );
      }
    }, 10);
  };

  const handleDeletePreviewImage = () => {
    const target = previewModalImage();
    if (!target) return;
    removeAttachedImage(target.id);
    setPreviewModalImage(null);
  };

  const handleSaveEditedImage = (editedFile: File) => {
    const item = editingImageItem();
    if (!item) return;
    updateAttachedImage(item.id, editedFile);
    setEditingImageItem(null);
    if (previewModalImage()?.id === item.id) {
      setPreviewModalImage(null);
    }
    showToast('画像を加工しました', 'success');
  };

  const handlePaste = (e: ClipboardEvent) => {
    const items = e.clipboardData?.files;
    if (items && items.length > 0) {
      addAttachedFiles(items);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      addAttachedFiles(e.dataTransfer.files);
    }
  };

  const selectVisibility = (val: VisibilityType, el: HTMLElement) => {
    gsap.fromTo(el, { scale: 0.92 }, { scale: 1, duration: 0.22, ease: 'back.out(2)' });
    setVisibility(val);
  };

  const openAccountPicker = () => {
    setIsAccountPickerOpen(true);
  };

  const closeAccountPicker = async () => {
    if (pickerCardRef && pickerBackdropRef) {
      await Promise.all([
        gsap.to(pickerCardRef, { opacity: 0, scale: 0.94, y: 8, duration: 0.15, ease: 'power2.in' }),
        gsap.to(pickerBackdropRef, { opacity: 0, duration: 0.15, ease: 'power2.in' }),
      ]);
    }
    setIsAccountPickerOpen(false);
  };

  const handleSelectAccountFromPopup = async (accountId: number | undefined) => {
    if (accountId === undefined) return;
    if (currentUser()?.id !== accountId) {
      await switchAccount(accountId);
    }
    await closeAccountPicker();
  };

  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = createMemo(
    () => circumference - (noteProgressPercent() / 100) * circumference
  );

  return (
    <div
      ref={viewContainerRef}
      class="mizuna-note-view"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
    >
      {/* 統合型コンポーザーカード */}
      <section
        class={`mizuna-studio-composer ${isInputFocused() ? 'is-focused' : ''} ${
          isDraggingOver() ? 'is-dragging' : ''
        }`}
      >
        {/* コンポーザー上部：投稿者情報 ＆ 公開範囲ピルセレクター */}
        <div class="mizuna-composer-header">
          <button
            type="button"
            class="mizuna-author-chip"
            onClick={openAccountPicker}
          >
            <img
              class="mizuna-author-avatar"
              src={getDisplayAvatarUrl(currentUser()?.avatarurl, settings().is_visible_icon)}
              alt="user_icon"
              decoding="async"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/icon.png';
              }}
            />
            <div class="mizuna-author-info">
              <span class="mizuna-author-name">{currentUser()?.name ?? 'User'}</span>
              <span class="mizuna-author-instance">{currentUser()?.address}</span>
            </div>
            <i class="mizuna-author-chevron">unfold_more</i>
          </button>

          {/* モダンなピル型公開範囲セレクター */}
          <div class="mizuna-visibility-pills" role="radiogroup" aria-label={t('settings.default_visibility')}>
            <HoldHoverTip label={t('note.visibility_public')} sublabel="全ユーザーに公開 (Ctrl+Alt+P)" placement="bottom">
              <button
                type="button"
                id="visibility_public"
                class={`mizuna-vis-pill ${visibility() === 'public' ? 'is-active' : ''}`}
                onClick={(e) => selectVisibility('public', e.currentTarget)}
              >
                <i>public</i>
                <span>{t('note.visibility_public')}</span>
              </button>
            </HoldHoverTip>
            <HoldHoverTip label={t('note.visibility_home')} sublabel="ホームTLのみに表示 (Ctrl+Alt+H)" placement="bottom">
              <button
                type="button"
                id="visibility_home"
                class={`mizuna-vis-pill ${visibility() === 'home' ? 'is-active' : ''}`}
                onClick={(e) => selectVisibility('home', e.currentTarget)}
              >
                <i>home</i>
                <span>{t('note.visibility_home')}</span>
              </button>
            </HoldHoverTip>
            <HoldHoverTip label={t('note.visibility_followers')} sublabel="フォロワーのみに表示 (Ctrl+Alt+F)" placement="bottom">
              <button
                type="button"
                id="visibility_followers"
                class={`mizuna-vis-pill ${visibility() === 'followers' ? 'is-active' : ''}`}
                onClick={(e) => selectVisibility('followers', e.currentTarget)}
              >
                <i>lock</i>
                <span>{t('note.visibility_followers')}</span>
              </button>
            </HoldHoverTip>
          </div>
        </div>

        {/* CW（閲覧注意）折りたたみ入力欄 */}
        <Show when={cwEnabled()}>
          <div ref={cwSectionRef} class="mizuna-cw-box">
            <div class="mizuna-cw-inner">
              <i class="mizuna-cw-icon">visibility_off</i>
              <textarea
                ref={cwInputRef}
                class="cw_content mizuna-cw-textarea"
                maxLength={100}
                rows={1}
                placeholder={t('note.cw_placeholder')}
                value={cwText()}
                onInput={(e) => setCwText(e.currentTarget.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
              />
              <div class={`mizuna-cw-counter ${cwCountStatus()}`}>
                <span class="mizuna-zero-pad">{cwZeroPadding()}</span>
                <span id="cw_charCount">{cwLength()}</span>
                <span class="mizuna-counter-slash">/100</span>
              </div>
            </div>
          </div>
        </Show>

        {/* メインテキストエリア */}
        <div class="mizuna-editor-body">
          <textarea
            ref={noteInputRef}
            class="note_content mizuna-main-textarea"
            maxLength={3000}
            rows={6}
            placeholder={t('note.placeholder')}
            value={noteText()}
            onInput={(e) => setNoteText(e.currentTarget.value)}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            onPaste={handlePaste}
          />

          <Show when={endMizuna()}>
            <div class="mizuna-editor-subrow">
              <span class="mizuna-suffix-badge">
                <i>auto_awesome</i>
                {t('note.suffix_notice')}
              </span>
            </div>
          </Show>
        </div>

        {/* 添付画像ギャラリー */}
        <Show when={attachedImages().length > 0}>
          <div class="mizuna-media-gallery">
            <div class="mizuna-media-strip">
              <For each={attachedImages()}>
                {(item) => (
                  <div class="mizuna-media-item" onClick={() => handleOpenPreview(item)}>
                    <Show when={item.thumbUrl}>
                      {(thumb) => (
                        <img
                          class="input_image_preview"
                          src={thumb()}
                          alt={item.name}
                          data-name={item.name}
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                    </Show>
                    <div class="mizuna-media-zoom-hint">
                      <i>zoom_in</i>
                    </div>
                    <button
                      type="button"
                      class="mizuna-media-remove"
                      title={t('note.delete_image')}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAttachedImage(item.id);
                      }}
                    >
                      <i>close</i>
                    </button>
                  </div>
                )}
              </For>
            </div>
            <div class="mizuna-media-footer">
              <span>
                <b>{attachedImages().length}</b> / 16 枚
              </span>
            </div>
          </div>
        </Show>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          id="fileInput"
          name="image"
          accept="image/*"
          style="display: none;"
          onChange={(e) => {
            if (e.currentTarget.files) {
              addAttachedFiles(e.currentTarget.files);
              e.currentTarget.value = '';
            }
          }}
        />

        {/* コンポーザー下部ツールバー */}
        <div class="mizuna-composer-footer">
          <div class="mizuna-tool-group">
            {/* CWトグル */}
            <HoldHoverTip label={t('note.cw_tip')} sublabel={t('note.cw_tip_sub')} placement="top">
              <button
                type="button"
                id="cw"
                class={`mizuna-tool-chip ${cwEnabled() ? 'is-active' : ''}`}
                onClick={() => setCwEnabled((prev) => !prev)}
              >
                <i>visibility_off</i>
                <span>CW</span>
              </button>
            </HoldHoverTip>

            {/* (from Mizuna) トグル */}
            <HoldHoverTip label={t('note.mizuna_tip')} sublabel={t('note.mizuna_tip_sub')} placement="top">
              <button
                type="button"
                id="note_end_mizuna_checkbox"
                class={`mizuna-tool-chip ${endMizuna() ? 'is-active' : ''}`}
                onClick={() => setEndMizuna((prev) => !prev)}
              >
                <i>auto_awesome</i>
                <span>Mizuna</span>
              </button>
            </HoldHoverTip>

            {/* 画像選択ボタン */}
            <HoldHoverTip label={t('note.attach_image_tip')} sublabel={t('note.attach_image_tip_sub')} placement="top">
              <button
                type="button"
                id="select_picture_button"
                class={`mizuna-tool-chip ${attachedImages().length > 0 ? 'has-badge' : ''}`}
                onClick={() => fileInputRef?.click()}
              >
                <i>image</i>
                <span>{t('note.attach_image_label')}</span>
                <Show when={attachedImages().length > 0}>
                  <span class="mizuna-chip-count">{attachedImages().length}</span>
                </Show>
              </button>
            </HoldHoverTip>

            {/* フォームクリアボタン */}
            <HoldHoverTip label={t('note.clear_form_tip')} sublabel={t('note.clear_form_tip_sub')} placement="top">
              <button
                type="button"
                id="form_clear_button"
                class="mizuna-tool-icon-btn"
                onClick={() => {
                  clearNoteForm(true);
                  if (fileInputRef) fileInputRef.value = '';
                }}
                aria-label={t('note.clear_form_tip')}
              >
                <i>delete_sweep</i>
              </button>
            </HoldHoverTip>
          </div>

          {/* 右側：文字数リングゲージ ＆ 送信ボタン */}
          <div class="mizuna-submit-group">
            <div class={`mizuna-char-counter ${noteCountStatus()}`}>
              <svg class="mizuna-progress-ring" width="26" height="26" viewBox="0 0 26 26">
                <circle
                  class="mizuna-progress-ring-bg"
                  cx="13"
                  cy="13"
                  r={radius}
                  fill="transparent"
                  stroke-width="2.5"
                />
                <circle
                  class="mizuna-progress-ring-fg"
                  cx="13"
                  cy="13"
                  r={radius}
                  fill="transparent"
                  stroke-width="2.5"
                  stroke-dasharray={String(circumference)}
                  stroke-dashoffset={String(strokeDashoffset())}
                  stroke-linecap="round"
                />
              </svg>
              <span class="content_char_count">
                <span id="charCountSpace" class="mizuna-zero-pad">
                  {noteZeroPadding()}
                </span>
                <span id="charCount">{noteLength()}</span>
                <span class="mizuna-counter-slash">/</span>
                <span id="max_charCount" class="mizuna-counter-max">
                  {maxCharCount()}
                </span>
              </span>
            </div>

            <button
              type="button"
              class={`note_submit mizuna-send-btn ${isSending() ? 'is-loading' : ''}`}
              disabled={isSending()}
              onClick={handleSendNote}
            >
              <Show
                when={!isSending()}
                fallback={
                  <>
                    <progress class="circle small" />
                    <span>{sendingStatus() || t('note.submitting')}</span>
                  </>
                }
              >
                <span>{t('note.submit')}</span>
                <i>send</i>
              </Show>
            </button>
          </div>
        </div>
      </section>

      {/* アカウント切り替えポップアップ */}
      <Show when={isAccountPickerOpen()}>
        <Portal>
          <div class="mizuna-modal-portal" role="dialog" aria-modal="true">
            <div
              ref={(el) => {
                pickerBackdropRef = el;
                gsap.fromTo(
                  el,
                  { opacity: 0 },
                  { opacity: 1, duration: 0.22, ease: 'power2.out' }
                );
              }}
              class="mizuna-modal-backdrop"
              style={{ opacity: 0 }}
              onClick={closeAccountPicker}
            />

            <div
              ref={(el) => {
                pickerCardRef = el;
                gsap.fromTo(
                  el,
                  { opacity: 0, scale: 0.92, y: 14 },
                  { opacity: 1, scale: 1, y: 0, duration: 0.28, ease: 'back.out(1.5)' }
                );
              }}
              class="mizuna-picker-modal"
              style={{ opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
            <div class="mizuna-picker-header">
              <div class="mizuna-picker-title-wrap">
                <div class="mizuna-picker-icon">
                  <i>switch_account</i>
                </div>
                <div>
                  <h3 class="mizuna-picker-title">投稿アカウントの選択</h3>
                  <p class="mizuna-picker-sub">切り替えるアカウントをタップしてください</p>
                </div>
              </div>
              <button
                type="button"
                class="mizuna-icon-btn-sm"
                onClick={closeAccountPicker}
                aria-label="閉じる"
              >
                <i>close</i>
              </button>
            </div>

            <div class="mizuna-picker-list">
              <For each={accounts()}>
                {(acc) => {
                  const isCurrent = () => currentUser()?.id === acc.id;
                  return (
                    <button
                      type="button"
                      class={`mizuna-picker-item ${isCurrent() ? 'is-active' : ''}`}
                      onClick={() => handleSelectAccountFromPopup(acc.id)}
                    >
                      <img
                        class="mizuna-picker-avatar"
                        src={getDisplayAvatarUrl(acc.avatarurl, settings().is_visible_icon)}
                        alt={acc.name}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/icon.png';
                        }}
                      />
                      <div class="mizuna-picker-user">
                        <span class="mizuna-picker-name">{acc.name}</span>
                        <span class="mizuna-picker-handle">
                          @{acc.username}@{acc.address}
                        </span>
                      </div>
                      <Show when={isCurrent()}>
                        <span class="mizuna-picker-active-badge">
                          <i>check_circle</i>
                        </span>
                      </Show>
                    </button>
                  );
                }}
              </For>
            </div>
          </div>
        </div>
        </Portal>
      </Show>

      {/* 画像拡大プレビューモーダル */}
      <Show when={previewModalImage()}>
        {(imgItem) => (
          <Portal>
            <div
              id="imageModal"
              class="mizuna-lightbox"
              onClick={() => setPreviewModalImage(null)}
            >
              {/* トップバー: ファイル情報・WebP削減率 & 閉じるボタン */}
              <div class="mizuna-lightbox-topbar" onClick={(e) => e.stopPropagation()}>
                <div class="mizuna-lightbox-topbar-inner">
                  <div class="mizuna-lightbox-fileinfo">
                    <span class="mizuna-lightbox-filename" title={imgItem().name}>
                      {imgItem().name}
                    </span>
                    <div class="mizuna-lightbox-meta">
                      <span class="mizuna-lightbox-raw-size">
                        {(imgItem().originalSize / 1024).toFixed(1)} KB
                      </span>
                      <Show
                        when={imgItem().compressedSize}
                        fallback={<span class="mizuna-lightbox-compressing">WebP圧縮中...</span>}
                      >
                        {(compSize) => {
                          const savedPercent = Math.max(
                            0,
                            Math.round(
                              ((imgItem().originalSize - compSize()) / imgItem().originalSize) * 100
                            )
                          );
                          return (
                            <>
                              <i class="mizuna-lightbox-meta-arrow">arrow_forward</i>
                              <span class="mizuna-lightbox-webp-size">
                                {(compSize() / 1024).toFixed(1)} KB (WebP)
                              </span>
                              <span class="mizuna-lightbox-badge">
                                {savedPercent}% 削減
                              </span>
                            </>
                          );
                        }}
                      </Show>
                    </div>
                  </div>

                  <button
                    type="button"
                    class="circle mizuna-lightbox-close-icon-btn"
                    onClick={() => setPreviewModalImage(null)}
                    aria-label="閉じる"
                  >
                    <i>close</i>
                  </button>
                </div>
              </div>

              {/* メイン画像ステージ */}
              <div
                class="mizuna-lightbox-stage"
                onClick={() => setPreviewModalImage(null)}
              >
                <img
                  ref={modalContentRef}
                  id="modalImage"
                  class="mizuna-lightbox-img"
                  src={imgItem().dataUrl}
                  alt={imgItem().name}
                  data-name={imgItem().name}
                  decoding="async"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* ボトムバー: アクションボタン */}
              <div class="mizuna-lightbox-bottombar" onClick={(e) => e.stopPropagation()}>
                <div class="mizuna-lightbox-bottombar-inner">
                  <button
                    type="button"
                    class="mizuna-btn mizuna-btn-tonal mizuna-lightbox-action-btn"
                    onClick={() => {
                      setEditingImageItem(imgItem());
                      setPreviewModalImage(null);
                    }}
                  >
                    <i>tune</i>
                    <span>画像を加工する</span>
                  </button>
                  <button
                    type="button"
                    id="deleteImageButton"
                    class="mizuna-btn mizuna-btn-danger mizuna-lightbox-action-btn"
                    onClick={handleDeletePreviewImage}
                  >
                    <i>delete</i>
                    <span>削除する</span>
                  </button>
                </div>
              </div>
            </div>
          </Portal>
        )}
      </Show>

      {/* 画像加工モーダル */}
      <Show when={editingImageItem()}>
        {(item) => (
          <ImageEditorModal
            file={item().file}
            onClose={() => setEditingImageItem(null)}
            onSave={handleSaveEditedImage}
          />
        )}
      </Show>
    </div>
  );
}
