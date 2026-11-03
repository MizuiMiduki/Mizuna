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
import { type ImageEditState } from '../utils/imageEditor';
import { comparisonVersion, hasDrivePermission } from '../utils/version';
import { renderMfm, insertMfmTag } from '../utils/mfm';
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
    revertAttachedImage,
    clearNoteForm,
    showToast,
    pushModalBackHandler,
    t,
  } = useApp();

  const [isInputFocused, setIsInputFocused] = createSignal(false);
  const [isSending, setIsSending] = createSignal(false);
  const [sendingStatus, setSendingStatus] = createSignal('');
  const [previewModalImageId, setPreviewModalImageId] = createSignal<string | null>(null);
  const previewModalImage = createMemo(() => {
    const id = previewModalImageId();
    if (!id) return null;
    return attachedImages().find((img) => img.id === id) ?? null;
  });
  const [editingImageItem, setEditingImageItem] = createSignal<AttachedImageItem | null>(null);
  const [isDraggingOver, setIsDraggingOver] = createSignal(false);
  const [isAccountPickerOpen, setIsAccountPickerOpen] = createSignal(false);
  const [showPreview, setShowPreview] = createSignal(false);
  const [previewCwRevealed, setPreviewCwRevealed] = createSignal(false);
  const [lastFocusedField, setLastFocusedField] = createSignal<'note' | 'cw'>('note');

  // Androidの戻るボタン対応：画像加工モーダル・プレビュー・アカウントピッカーを戻る操作で安全に閉じる
  createEffect(() => {
    if (editingImageItem()) {
      const unregister = pushModalBackHandler(() => {
        setEditingImageItem(null);
      });
      onCleanup(unregister);
    }
  });

  createEffect(() => {
    if (previewModalImageId()) {
      const unregister = pushModalBackHandler(() => {
        setPreviewModalImageId(null);
      });
      onCleanup(unregister);
    }
  });

  createEffect(() => {
    if (isAccountPickerOpen()) {
      const unregister = pushModalBackHandler(() => {
        setIsAccountPickerOpen(false);
      });
      onCleanup(unregister);
    }
  });

  let viewContainerRef: HTMLDivElement | undefined;
  let cwSectionRef: HTMLDivElement | undefined;
  let cwInputRef: HTMLTextAreaElement | undefined;
  let noteInputRef: HTMLTextAreaElement | undefined;
  let fileInputRef: HTMLInputElement | undefined;
  let modalContentRef: HTMLImageElement | undefined;
  let pickerCardRef: HTMLDivElement | undefined;
  let pickerBackdropRef: HTMLDivElement | undefined;

  const maxCharCount = createMemo(() => (endMizuna() ? 2986 : 3000));
  const isImageSupported = createMemo(() => hasDrivePermission(currentUser()?.add_mizuna_versinon));
  const noteLength = createMemo(() => noteText().length);
  const cwLength = createMemo(() => cwText().length);

  const renderedNoteHtml = createMemo(() => renderMfm(noteText()));
  const renderedCwHtml = createMemo(() => renderMfm(cwText()));

  const handleInsertMfm = (prefix: string, suffix: string, placeholder = '') => {
    const isCw = lastFocusedField() === 'cw' && cwEnabled();
    const targetRef = isCw ? cwInputRef : noteInputRef;
    const currentText = isCw ? cwText() : noteText();
    const setText = isCw ? setCwText : setNoteText;

    if (!targetRef) return;
    const start = targetRef.selectionStart ?? currentText.length;
    const end = targetRef.selectionEnd ?? currentText.length;

    const { newText, newCursorStart, newCursorEnd } = insertMfmTag(
      currentText,
      start,
      end,
      prefix,
      suffix,
      placeholder
    );

    setText(newText);
    setTimeout(() => {
      targetRef.focus();
      targetRef.setSelectionRange(newCursorStart, newCursorEnd);
    }, 0);
  };

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
      if (!isImageSupported()) {
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
      setShowPreview(false);
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
          case 'k':
            event.preventDefault();
            setShowPreview((prev) => !prev);
            break;
          case 'm':
            event.preventDefault();
            setEndMizuna((prev) => !prev);
            break;
          case 'v':
            event.preventDefault();
            if (isImageSupported()) {
              fileInputRef?.click();
            } else {
              showToast(
                'Mizuna 3.5.0以上のバージョンでアカウントを追加してください',
                'warning',
                'このアカウントでは画像付きノートが出来ません'
              );
            }
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
    setPreviewModalImageId(item.id);
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

  const handleSaveEditedImage = (id: string, editedFile: File, editState: ImageEditState) => {
    updateAttachedImage(id, editedFile, editState);
    setEditingImageItem(null);
    if (previewModalImageId() === id) {
      setPreviewModalImageId(null);
    }
  };

  const handleResetImage = (id: string) => {
    revertAttachedImage(id);
    showToast('加工をリセットして元画像に戻しました', 'info');
  };

  const handlePaste = (e: ClipboardEvent) => {
    const items = e.clipboardData?.files;
    if (items && items.length > 0) {
      if (!isImageSupported()) {
        showToast(
          'Mizuna 3.5.0以上のバージョンでアカウントを追加してください',
          'warning',
          'このアカウントでは画像付きノートが出来ません'
        );
        return;
      }
      addAttachedFiles(items);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      if (!isImageSupported()) {
        showToast(
          'Mizuna 3.5.0以上のバージョンでアカウントを追加してください',
          'warning',
          'このアカウントでは画像付きノートが出来ません'
        );
        return;
      }
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

        {/* MFM ツールバー */}
        <div class="mizuna-composer-subbar">
          <div class="mizuna-mfm-toolbar" role="toolbar" aria-label="MFM Insertion Toolbar">
            <button
              type="button"
              class="mizuna-mfm-chip"
              onClick={() => handleInsertMfm('$[shake ', ']', 'text')}
              title="揺らす ($[shake ...])"
            >
              <i>vibration</i>
              <span>{t('note.mfm_tag_shake')}</span>
            </button>
            <button
              type="button"
              class="mizuna-mfm-chip"
              onClick={() => handleInsertMfm('$[bounce ', ']', 'text')}
              title="跳ねる ($[bounce ...])"
            >
              <i>sports_baseball</i>
              <span>{t('note.mfm_tag_bounce')}</span>
            </button>
            <button
              type="button"
              class="mizuna-mfm-chip"
              onClick={() => handleInsertMfm('$[spin ', ']', 'text')}
              title="回転 ($[spin ...])"
            >
              <i>rotate_right</i>
              <span>{t('note.mfm_tag_spin')}</span>
            </button>
            <button
              type="button"
              class="mizuna-mfm-chip"
              onClick={() => handleInsertMfm('$[rainbow ', ']', 'text')}
              title="虹色 ($[rainbow ...])"
            >
              <i>palette</i>
              <span>{t('note.mfm_tag_rainbow')}</span>
            </button>
            <button
              type="button"
              class="mizuna-mfm-chip"
              onClick={() => handleInsertMfm('$[tada ', ']', 'text')}
              title="祝砲 ($[tada ...])"
            >
              <i>celebration</i>
              <span>{t('note.mfm_tag_tada')}</span>
            </button>
            <button
              type="button"
              class="mizuna-mfm-chip"
              onClick={() => handleInsertMfm('$[blur ', ']', 'text')}
              title="ぼかし ($[blur ...])"
            >
              <i>blur_on</i>
              <span>{t('note.mfm_tag_blur')}</span>
            </button>
            <button
              type="button"
              class="mizuna-mfm-chip"
              onClick={() => handleInsertMfm('**', '**', 'bold')}
              title="太字 (**...**)"
            >
              <i>format_bold</i>
              <span>{t('note.mfm_tag_bold')}</span>
            </button>
            <button
              type="button"
              class="mizuna-mfm-chip"
              onClick={() => handleInsertMfm('~~', '~~', 'strike')}
              title="打消 (~~...~~)"
            >
              <i>format_strikethrough</i>
              <span>{t('note.mfm_tag_strike')}</span>
            </button>
            <button
              type="button"
              class="mizuna-mfm-chip"
              onClick={() => handleInsertMfm('$[fg.color=ff0000 ', ']', 'text')}
              title="文字色 ($[fg.color=ff0000 ...])"
            >
              <i>format_color_text</i>
              <span>{t('note.mfm_tag_color')}</span>
            </button>
            <button
              type="button"
              class="mizuna-mfm-chip"
              onClick={() => handleInsertMfm('$[ruby ', ' かんじ]', '漢字')}
              title="ルビ ($[ruby 漢字 かんじ])"
            >
              <i>translate</i>
              <span>{t('note.mfm_tag_ruby')}</span>
            </button>
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
                onFocus={() => {
                  setIsInputFocused(true);
                  setLastFocusedField('cw');
                }}
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
            onFocus={() => {
              setIsInputFocused(true);
              setLastFocusedField('note');
            }}
            onBlur={() => setIsInputFocused(false)}
            onPaste={handlePaste}
          />
        </div>

        {/* リアルタイムMFMプレビュー枠（トグル表示） */}
        <Show when={showPreview()}>
          <div class="mizuna-preview-area">
            <div class="mizuna-preview-header">
              <span class="mizuna-preview-badge">
                <i>visibility</i>
                {t('note.preview_tab_preview')}
              </span>
              <button
                type="button"
                class="mizuna-preview-close-btn"
                onClick={() => setShowPreview(false)}
                title="プレビューを閉じる"
              >
                <i>close</i>
              </button>
            </div>

            {/* CW注釈エリア */}
            <Show when={cwEnabled()}>
              <div class="mizuna-preview-cw-card">
                <div class="mizuna-preview-cw-text">
                  <i>visibility_off</i>
                  <span innerHTML={renderedCwHtml() || t('note.cw_empty')} />
                </div>
                <button
                  type="button"
                  class="mizuna-preview-cw-toggle-btn"
                  onClick={() => setPreviewCwRevealed((prev) => !prev)}
                >
                  <i>{previewCwRevealed() ? 'visibility_off' : 'visibility'}</i>
                  <span>{previewCwRevealed() ? t('note.preview_cw_hide') : t('note.preview_cw_show')}</span>
                </button>
              </div>
            </Show>

            {/* 本文プレビュー */}
            <Show
              when={!cwEnabled() || previewCwRevealed()}
              fallback={
                <div class="mizuna-preview-empty">
                  <span>CWにより本文は隠されています。「見る」を押すと展開されます。</span>
                </div>
              }
            >
              <Show
                when={noteText().length > 0}
                fallback={<div class="mizuna-preview-empty">{t('note.preview_empty')}</div>}
              >
                <div class="mizuna-preview-content" innerHTML={renderedNoteHtml()} />
              </Show>

              <Show when={endMizuna()}>
                <div class="mizuna-preview-footer-note">
                  <i>auto_awesome</i>
                  <span>(from Mizuna)</span>
                </div>
              </Show>
            </Show>
          </div>
        </Show>

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
                      class={`mizuna-media-edit ${item.editState ? 'is-edited' : ''}`}
                      title={t('note.edit_image')}
                      aria-label={t('note.edit_image')}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingImageItem(item);
                      }}
                    >
                      <i>edit</i>
                    </button>
                    <button
                      type="button"
                      class="mizuna-media-remove"
                      title={t('note.delete_image')}
                      aria-label={t('note.delete_image')}
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
          disabled={!isImageSupported()}
          onChange={(e) => {
            if (e.currentTarget.files) {
              if (!isImageSupported()) {
                showToast(
                  'Mizuna 3.5.0以上のバージョンでアカウントを追加してください',
                  'warning',
                  'このアカウントでは画像付きノートが出来ません'
                );
                e.currentTarget.value = '';
                return;
              }
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

            {/* プレビュー切り替え */}
            <HoldHoverTip label={t('note.preview_tab_preview')} sublabel={t('note.preview_toggle_tip')} placement="top">
              <button
                type="button"
                id="preview_toggle_button"
                class={`mizuna-tool-chip ${showPreview() ? 'is-active' : ''}`}
                onClick={() => setShowPreview((prev) => !prev)}
                aria-pressed={showPreview()}
              >
                <i>{showPreview() ? 'visibility_off' : 'preview'}</i>
                <span>{t('note.preview_tab_preview')}</span>
              </button>
            </HoldHoverTip>

            {/* 画像選択ボタン */}
            <HoldHoverTip
              label={isImageSupported() ? t('note.attach_image_tip') : '画像添付非対応'}
              sublabel={
                isImageSupported()
                  ? t('note.attach_image_tip_sub')
                  : 'v3.5.0未満で追加されたため画像添付権限がありません。アカウント管理から再認証してください。'
              }
              placement="top"
            >
              <button
                type="button"
                id="select_picture_button"
                class={`mizuna-tool-chip ${attachedImages().length > 0 ? 'has-badge' : ''} ${!isImageSupported() ? 'is-disabled' : ''}`}
                disabled={!isImageSupported()}
                onClick={() => {
                  if (!isImageSupported()) {
                    showToast(
                      'Mizuna 3.5.0以上のバージョンでアカウントを追加してください',
                      'warning',
                      'このアカウントでは画像付きノートが出来ません'
                    );
                    return;
                  }
                  fileInputRef?.click();
                }}
                aria-label={isImageSupported() ? t('note.attach_image_label') : '画像添付非対応'}
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
              onClick={() => setPreviewModalImageId(null)}
            >
              {/* メイン画像ステージ */}
              <div
                class="mizuna-lightbox-stage"
                onClick={() => setPreviewModalImageId(null)}
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

              {/* ボトムバー: ファイル情報・WebP削減率 & リセットボタン & 閉じるボタン */}
              <div class="mizuna-lightbox-bottombar">
                <div class="mizuna-lightbox-bottombar-inner" onClick={(e) => e.stopPropagation()}>
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
                        fallback={
                          <div class="mizuna-lightbox-compressing-wrap">
                            <span class="mizuna-lightbox-compressing">
                              <span class="mizuna-lightbox-compressing-spinner" />
                              WebP圧縮中...
                            </span>
                            <div class="mizuna-lightbox-mini-bar" role="progressbar" aria-label="WebP圧縮中">
                              <div class="mizuna-lightbox-mini-bar-fill" />
                            </div>
                          </div>
                        }
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

                  <div class="mizuna-lightbox-actions">
                    <Show when={imgItem().editState}>
                      <button
                        type="button"
                        class="mizuna-btn mizuna-btn-ghost mizuna-lightbox-action-btn"
                        onClick={() => handleResetImage(imgItem().id)}
                      >
                        <i>restart_alt</i>
                        <span>加工をリセット</span>
                      </button>
                    </Show>

                    <button
                      type="button"
                      class="circle mizuna-lightbox-close-icon-btn"
                      onClick={() => setPreviewModalImageId(null)}
                      aria-label="閉じる"
                    >
                      <i>close</i>
                    </button>
                  </div>
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
            file={item().rawFile || item().file}
            initialState={item().editState}
            onClose={() => setEditingImageItem(null)}
            onSave={(updatedFile, editState) =>
              handleSaveEditedImage(item().id, updatedFile, editState)
            }
          />
        )}
      </Show>
    </div>
  );
}
