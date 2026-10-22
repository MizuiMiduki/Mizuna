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
    clearNoteForm,
    showToast,
  } = useApp();

  const [isInputFocused, setIsInputFocused] = createSignal(false);
  const [isSending, setIsSending] = createSignal(false);
  const [sendingStatus, setSendingStatus] = createSignal('');
  const [previewModalImage, setPreviewModalImage] = createSignal<AttachedImageItem | null>(null);
  const [isDraggingOver, setIsDraggingOver] = createSignal(false);
  const [isAccountPickerOpen, setIsAccountPickerOpen] = createSignal(false);

  let viewContainerRef: HTMLDivElement | undefined;
  let cwSectionRef: HTMLDivElement | undefined;
  let cwInputRef: HTMLTextAreaElement | undefined;
  let noteInputRef: HTMLTextAreaElement | undefined;
  let fileInputRef: HTMLInputElement | undefined;
  let modalContentRef: HTMLDivElement | undefined;
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
      showToast('アカウントが選択されていません', 'error');
      return;
    }

    const rawNote = noteText();
    const rawCw = cwText();

    // CWバリデーション
    if (cwEnabled()) {
      const trimmedCw = rawCw.replace(/[\s\u3000]/g, '');
      if (trimmedCw.length === 0) {
        showToast('なにか入力してください', 'warning', 'CWが空です');
        return;
      }
      if (trimmedCw.length > 100) {
        showToast('100文字以内で入力してください', 'warning', 'CWが長すぎます');
        return;
      }
    }

    // ノート本文バリデーション
    const trimmedNote = rawNote.replace(/[\s\u3000]/g, '');
    if (trimmedNote.length === 0) {
      showToast('なにか入力してください', 'warning', 'ノートが空です');
      return;
    }

    if (noteLength() > maxCharCount()) {
      showToast('文字数が多すぎます', 'warning');
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
          images.map((item) => item.file),
          user,
          (status) => setSendingStatus(status)
        );
      }

      setSendingStatus('送信中...');
      await createMisskeyNote(
        user,
        rawNote,
        cwEnabled() ? rawCw : null,
        visibility(),
        endMizuna(),
        fileIds
      );

      showToast('ノートを送信しました！', 'success');
      clearNoteForm(false);
      if (fileInputRef) {
        fileInputRef.value = '';
      }
    } catch (err) {
      console.error('Send note error:', err);
      showToast('ノートできませんでした', 'error');
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
        { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'power3.out' }
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
          { scale: 1, opacity: 1, duration: 0.24, ease: 'back.out(1.5)' }
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
    setTimeout(() => {
      if (pickerBackdropRef) {
        gsap.fromTo(pickerBackdropRef, { opacity: 0 }, { opacity: 1, duration: 0.2 });
      }
      if (pickerCardRef) {
        gsap.fromTo(
          pickerCardRef,
          { opacity: 0, scale: 0.9, y: 14 },
          { opacity: 1, scale: 1, y: 0, duration: 0.28, ease: 'back.out(1.5)' }
        );
      }
    }, 10);
  };

  const closeAccountPicker = async () => {
    if (pickerCardRef && pickerBackdropRef) {
      await Promise.all([
        gsap.to(pickerCardRef, { opacity: 0, scale: 0.94, y: 8, duration: 0.15 }),
        gsap.to(pickerBackdropRef, { opacity: 0, duration: 0.15 }),
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
          <div class="mizuna-visibility-pills" role="radiogroup" aria-label="公開範囲">
            <HoldHoverTip label="パブリック公開" sublabel="全ユーザーに公開 (Ctrl+Alt+P)" placement="bottom">
              <button
                type="button"
                id="visibility_public"
                class={`mizuna-vis-pill ${visibility() === 'public' ? 'is-active' : ''}`}
                onClick={(e) => selectVisibility('public', e.currentTarget)}
              >
                <i>public</i>
                <span>パブリック</span>
              </button>
            </HoldHoverTip>
            <HoldHoverTip label="ホーム公開" sublabel="ホームTLのみに表示 (Ctrl+Alt+H)" placement="bottom">
              <button
                type="button"
                id="visibility_home"
                class={`mizuna-vis-pill ${visibility() === 'home' ? 'is-active' : ''}`}
                onClick={(e) => selectVisibility('home', e.currentTarget)}
              >
                <i>home</i>
                <span>ホーム</span>
              </button>
            </HoldHoverTip>
            <HoldHoverTip label="フォロワー限定" sublabel="フォロワーのみに表示 (Ctrl+Alt+F)" placement="bottom">
              <button
                type="button"
                id="visibility_followers"
                class={`mizuna-vis-pill ${visibility() === 'followers' ? 'is-active' : ''}`}
                onClick={(e) => selectVisibility('followers', e.currentTarget)}
              >
                <i>lock</i>
                <span>フォロワー</span>
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
                placeholder="閲覧注意の注釈 (CW) を入力..."
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
            placeholder="いまどうしてる？"
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
                末尾に <b>(from Mizuna)</b> が自動付与されます
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
                    <img
                      class="input_image_preview"
                      src={item.dataUrl}
                      alt={item.name}
                      data-name={item.name}
                      loading="lazy"
                      decoding="async"
                    />
                    <div class="mizuna-media-zoom-hint">
                      <i>zoom_in</i>
                    </div>
                    <button
                      type="button"
                      class="mizuna-media-remove"
                      title="画像を削除"
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
            <HoldHoverTip label="コンテンツワーニング (CW)" sublabel="閲覧注意の注釈を追加 (Ctrl+Alt+W)" placement="top">
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
            <HoldHoverTip label="Mizuna クレジット付与" sublabel="末尾に (from Mizuna) を追加 (Ctrl+Alt+M)" placement="top">
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
            <HoldHoverTip label="画像を添付 (最大16枚)" sublabel="自動でWebPへ圧縮されます (Ctrl+Alt+V)" placement="top">
              <button
                type="button"
                id="select_picture_button"
                class={`mizuna-tool-chip ${attachedImages().length > 0 ? 'has-badge' : ''}`}
                onClick={() => fileInputRef?.click()}
              >
                <i>image</i>
                <span>画像</span>
                <Show when={attachedImages().length > 0}>
                  <span class="mizuna-chip-count">{attachedImages().length}</span>
                </Show>
              </button>
            </HoldHoverTip>

            {/* フォームクリアボタン */}
            <HoldHoverTip label="フォームをクリア" sublabel="入力内容と添付画像をリセット (Ctrl+Alt+C)" placement="top">
              <button
                type="button"
                id="form_clear_button"
                class="mizuna-tool-icon-btn"
                onClick={() => {
                  clearNoteForm(true);
                  if (fileInputRef) fileInputRef.value = '';
                }}
                aria-label="フォームをクリア"
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
                    <span>{sendingStatus() || '送信中...'}</span>
                  </>
                }
              >
                <span>ノートする</span>
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
            ref={pickerBackdropRef}
            class="mizuna-modal-backdrop"
            onClick={closeAccountPicker}
          />

          <div
            ref={pickerCardRef}
            class="mizuna-picker-modal"
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
          <div
            id="imageModal"
            class="mizuna-lightbox"
            onClick={() => setPreviewModalImage(null)}
          >
            <div
              ref={modalContentRef}
              class="mizuna-lightbox-content"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                id="modalImage"
                class="modal-content"
                src={imgItem().dataUrl}
                alt={imgItem().name}
                data-name={imgItem().name}
                decoding="async"
              />
              <div class="mizuna-lightbox-bar">
                <span class="mizuna-lightbox-name">{imgItem().name}</span>
                <div class="mizuna-lightbox-actions">
                  <button
                    type="button"
                    id="deleteImageButton"
                    class="mizuna-btn mizuna-btn-danger"
                    onClick={handleDeletePreviewImage}
                  >
                    <i>delete</i>
                    <span>削除する</span>
                  </button>
                  <button
                    type="button"
                    class="mizuna-btn mizuna-btn-tonal"
                    onClick={() => setPreviewModalImage(null)}
                  >
                    <i>close</i>
                    <span>閉じる</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}
