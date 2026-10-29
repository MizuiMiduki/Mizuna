import gsap from 'gsap';
import { createSignal, For, onMount, Show } from 'solid-js';
import { useApp } from '../store/appStore';
import { getDisplayAvatarUrl } from '../utils/image';

export function AccountView() {
  const {
    accounts,
    currentUser,
    settings,
    switchAccount,
    deleteSelectedAccounts,
    reorderAccounts,
    setCurrentView,
    openDialog,
    showToast,
  } = useApp();

  const [isDeleteMode, setIsDeleteMode] = createSignal(false);
  const [isReorderMode, setIsReorderMode] = createSignal(false);
  const [selectedIds, setSelectedIds] = createSignal<number[]>([]);
  const [draggedIndex, setDraggedIndex] = createSignal<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = createSignal<number | null>(null);
  let listRef: HTMLDivElement | undefined;

  onMount(() => {
    if (listRef) {
      const cards = listRef.querySelectorAll('.mizuna-acc-card');
      if (cards.length > 0) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.3, stagger: 0.045, ease: 'power3.out' }
        );
      }
    }
  });

  const toggleDeleteMode = () => {
    setIsDeleteMode((prev) => !prev);
    setIsReorderMode(false);
    setSelectedIds([]);
  };

  const toggleReorderMode = () => {
    setIsReorderMode((prev) => !prev);
    setIsDeleteMode(false);
    setSelectedIds([]);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const moveAccount = async (fromIndex: number, toIndex: number) => {
    const list = [...accounts()];
    if (fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) {
      return;
    }
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);

    const newIds = list.map((a) => a.id).filter((id): id is number => id !== undefined);
    await reorderAccounts(newIds);
  };

  const handleDragStart = (e: DragEvent, index: number) => {
    if (!isReorderMode()) return;
    setDraggedIndex(index);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    }
  };

  const handleDragOver = (e: DragEvent, index: number) => {
    if (!isReorderMode()) return;
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: DragEvent, targetIndex: number) => {
    if (!isReorderMode()) return;
    e.preventDefault();
    const sourceIndex = draggedIndex();
    setDraggedIndex(null);
    setDragOverIndex(null);

    if (sourceIndex !== null && sourceIndex !== targetIndex) {
      await moveAccount(sourceIndex, targetIndex);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const toggleSelectId = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCardClick = async (id: number | undefined) => {
    if (id === undefined) return;
    if (isReorderMode()) {
      return; // 並べ替えモード中はアカウント切り替えを防止
    }
    if (isDeleteMode()) {
      toggleSelectId(id);
      return;
    }
    await switchAccount(id);
  };

  const handleConfirmDelete = () => {
    const ids = selectedIds();
    if (ids.length === 0) {
      showToast('削除するアカウントを選択してください', 'warning');
      return;
    }

    openDialog({
      title: 'アカウントの登録解除',
      icon: 'person_remove',
      tone: 'danger',
      badgeText: `${ids.length} ACCOUNT${ids.length > 1 ? 'S' : ''}`,
      contentText: `選択した ${ids.length} 件のアカウントを Mizuna から登録解除してもよろしいですか？（Misskeyサーバー上のアカウント自体は削除されません）`,
      buttons: [
        {
          label: 'キャンセル',
          variant: 'border',
        },
        {
          label: '登録解除する',
          variant: 'error',
          onClick: async () => {
            await deleteSelectedAccounts(ids);
            setIsDeleteMode(false);
            setSelectedIds([]);
          },
        },
      ],
    });
  };

  return (
    <div class="mizuna-account-view">
      {/* セクションヘッダー */}
      <div class="mizuna-section-header">
        <div>
          <h2 class="mizuna-section-title">アカウント管理</h2>
        </div>

        <div class="mizuna-header-actions">
          <Show when={!isDeleteMode()}>
            <button
              type="button"
              class={`mizuna-btn ${isReorderMode() ? 'mizuna-btn-primary' : 'mizuna-btn-outline'}`}
              onClick={toggleReorderMode}
              disabled={accounts().length <= 1}
              title="アカウントの表示順を並べ替え"
            >
              <i>{isReorderMode() ? 'check' : 'swap_vert'}</i>
              <span>{isReorderMode() ? '完了' : '並べ替え'}</span>
            </button>
          </Show>

          <Show when={!isReorderMode()}>
            <button
              type="button"
              class={`mizuna-btn ${isDeleteMode() ? 'mizuna-btn-tonal' : 'mizuna-btn-outline'}`}
              onClick={toggleDeleteMode}
            >
              <i>{isDeleteMode() ? 'close' : 'delete_outline'}</i>
              <span>{isDeleteMode() ? 'キャンセル' : '選択削除'}</span>
            </button>
          </Show>

          <Show when={!isDeleteMode() && !isReorderMode()}>
            <button
              type="button"
              class="add_account_floating_button mizuna-btn mizuna-btn-primary"
              onClick={() => setCurrentView('add_account')}
            >
              <i>person_add</i>
              <span>アカウント追加</span>
            </button>
          </Show>
        </div>
      </div>

      {/* 並べ替えモード時の案内バー */}
      <Show when={isReorderMode()}>
        <div class="mizuna-reorder-banner">
          <div class="mizuna-reorder-banner-text">
            <i>swap_vert</i>
            <span>矢印ボタンまたはドラッグでアカウントの表示順を変更できます</span>
          </div>
          <button
            type="button"
            class="mizuna-btn mizuna-btn-primary"
            onClick={toggleReorderMode}
          >
            <i>check</i>
            <span>完了</span>
          </button>
        </div>
      </Show>

      {/* 削除モード時のアクションバー */}
      <Show when={isDeleteMode()}>
        <div class="mizuna-delete-banner">
          <span>
            削除するアカウントを選択してください（現在 <b>{selectedIds().length}</b> 件選択中）
          </span>
          <button
            type="button"
            class="mizuna-btn mizuna-btn-danger"
            disabled={selectedIds().length === 0}
            onClick={handleConfirmDelete}
          >
            <i>delete_forever</i>
            <span>削除実行</span>
          </button>
        </div>
      </Show>

      {/* アカウントカードグリッド */}
      <div ref={listRef} class="account_display_area mizuna-acc-grid">
        <For each={accounts()}>
          {(account, index) => {
            const isActive = () => currentUser()?.id === account.id;
            const isChecked = () =>
              account.id !== undefined && selectedIds().includes(account.id);
            const isDragging = () => draggedIndex() === index();
            const isDragOver = () => dragOverIndex() === index();

            return (
              <div
                id="account_card"
                data-id={account.id}
                draggable={isReorderMode()}
                onDragStart={(e) => handleDragStart(e, index())}
                onDragOver={(e) => handleDragOver(e, index())}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index())}
                onDragEnd={handleDragEnd}
                class={`mizuna-acc-card ${isActive() ? 'is-active' : ''} ${
                  isChecked() ? 'is-selected-delete' : ''
                } ${isDragging() ? 'is-dragging' : ''} ${isDragOver() ? 'is-drag-over' : ''} ${
                  isReorderMode() ? 'is-reordering' : ''
                }`}
                onClick={() => handleCardClick(account.id)}
              >
                <Show when={isDeleteMode()}>
                  <div class="mizuna-acc-check" onClick={(e) => e.stopPropagation()}>
                    <label class="checkbox">
                      <input
                        type="checkbox"
                        class="delete_select_checknox"
                        checked={isChecked()}
                        onChange={() => account.id !== undefined && toggleSelectId(account.id)}
                      />
                      <span />
                    </label>
                  </div>
                </Show>

                <div class="mizuna-acc-avatar-wrap">
                  <img
                    class="mizuna-acc-avatar"
                    src={getDisplayAvatarUrl(account.avatarurl, settings().is_visible_icon)}
                    alt={account.name}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/icon.png';
                    }}
                  />
                  <Show when={isActive()}>
                    <span class="mizuna-acc-check-badge" title="現在選択中">
                      <i>check</i>
                    </span>
                  </Show>
                </div>

                <div class="mizuna-acc-body">
                  <div class="mizuna-acc-toprow">
                    <span class="mizuna-acc-name">{account.name}</span>
                    <Show when={isActive()}>
                      <span class="mizuna-active-pill">ACTIVE</span>
                    </Show>
                  </div>
                  <div class="mizuna-acc-handle">
                    @{account.username}
                    <span class="mizuna-acc-host">@{account.address}</span>
                  </div>
                </div>

                <Show when={isReorderMode()}>
                  <div
                    class="mizuna-acc-reorder-controls"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      class="mizuna-reorder-btn"
                      aria-label="上へ移動"
                      title="上へ移動"
                      disabled={index() === 0}
                      onClick={() => moveAccount(index(), index() - 1)}
                    >
                      <i>arrow_upward</i>
                    </button>
                    <button
                      type="button"
                      class="mizuna-reorder-btn"
                      aria-label="下へ移動"
                      title="下へ移動"
                      disabled={index() === accounts().length - 1}
                      onClick={() => moveAccount(index(), index() + 1)}
                    >
                      <i>arrow_downward</i>
                    </button>
                    <span class="mizuna-reorder-drag-handle" title="ドラッグして並べ替え">
                      <i>drag_indicator</i>
                    </span>
                  </div>
                </Show>

                <Show when={!isReorderMode()}>
                  <div class="mizuna-acc-meta">
                    <span class="mizuna-ver-tag" title="追加時のMizunaバージョン">
                      v{account.add_mizuna_versinon}
                    </span>
                  </div>
                </Show>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
}
