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
    isSyncingAccounts,
    syncAllAccounts,
    setCurrentView,
    openDialog,
    showToast,
  } = useApp();

  const [isDeleteMode, setIsDeleteMode] = createSignal(false);
  const [selectedIds, setSelectedIds] = createSignal<number[]>([]);
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
    setSelectedIds([]);
  };

  const toggleSelectId = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCardClick = async (id: number | undefined) => {
    if (id === undefined) return;
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
              class="mizuna-btn mizuna-btn-outline"
              disabled={isSyncingAccounts() || accounts().length === 0}
              onClick={syncAllAccounts}
              title="登録済み全アカウントの最新プロフィールを取得"
            >
              <i class={isSyncingAccounts() ? 'is-spinning' : ''}>sync</i>
              <span>{isSyncingAccounts() ? '同期中...' : '全件同期'}</span>
            </button>
          </Show>

          <button
            type="button"
            class={`mizuna-btn ${isDeleteMode() ? 'mizuna-btn-tonal' : 'mizuna-btn-outline'}`}
            onClick={toggleDeleteMode}
          >
            <i>{isDeleteMode() ? 'close' : 'delete_outline'}</i>
            <span>{isDeleteMode() ? 'キャンセル' : '選択削除'}</span>
          </button>

          <button
            type="button"
            class="add_account_floating_button mizuna-btn mizuna-btn-primary"
            onClick={() => setCurrentView('add_account')}
          >
            <i>person_add</i>
            <span>アカウント追加</span>
          </button>
        </div>
      </div>

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
          {(account) => {
            const isActive = () => currentUser()?.id === account.id;
            const isChecked = () =>
              account.id !== undefined && selectedIds().includes(account.id);

            return (
              <div
                id="account_card"
                data-id={account.id}
                class={`mizuna-acc-card ${isActive() ? 'is-active' : ''} ${
                  isChecked() ? 'is-selected-delete' : ''
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

                <div class="mizuna-acc-meta">
                  <span class="mizuna-ver-tag" title="追加時のMizunaバージョン">
                    v{account.add_mizuna_versinon}
                  </span>
                </div>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
}
