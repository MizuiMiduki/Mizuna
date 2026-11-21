import { createEffect, For, Show } from 'solid-js';
import { Portal } from '@solidjs/web';
import { useApp, type DialogButton } from '../store/appStore';
import { animateModalEnter, animateModalLeave } from '../utils/animation';

export function DialogHost() {
  const { dialogConfig, closeDialog, setCurrentView } = useApp();
  let modalRef: HTMLDivElement | undefined;
  let backdropRef: HTMLDivElement | undefined;

  createEffect(
    () => dialogConfig(),
    (cfg) => {
      if (cfg && modalRef && backdropRef) {
        animateModalEnter(modalRef, backdropRef);
      }
    }
  );

  const handleAction = async (btn: DialogButton) => {
    if (modalRef && backdropRef) {
      await animateModalLeave(modalRef, backdropRef);
    }
    closeDialog();
    await btn.onClick?.();
  };

  const getDefaultIcon = (tone?: string) => {
    switch (tone) {
      case 'warning':
        return 'warning';
      case 'danger':
        return 'delete_forever';
      case 'info':
        return 'info';
      default:
        return 'auto_awesome';
    }
  };

  return (
    <Show when={dialogConfig()} keyed>
      {(cfg) => {
        const tone = cfg.tone ?? 'primary';
        const iconName = cfg.icon ?? getDefaultIcon(cfg.tone);

        return (
          <Portal>
            <div class="mizuna-modal-portal mizuna-dialog-portal" role="dialog" aria-modal="true">
            <div
              ref={backdropRef}
              class="mizuna-modal-backdrop"
              onClick={() => closeDialog()}
            />

            <div
              ref={modalRef}
              class={`mizuna-modal-card is-${tone}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 上部アイコン＆バッジ */}
              <div class="mizuna-modal-top">
                <div class={`mizuna-modal-icon is-${tone}`}>
                  <i>{iconName}</i>
                </div>
                <Show when={cfg.badgeText}>
                  <span class={`mizuna-modal-badge is-${tone}`}>{cfg.badgeText}</span>
                </Show>
                <h3 class="mizuna-modal-title">{cfg.title}</h3>
              </div>

              {/* 本文エリア */}
              <div class="mizuna-modal-body">
                <Show
                  when={cfg.contentHtml}
                  fallback={<p class="mizuna-modal-text">{cfg.contentText}</p>}
                >
                  <div class="mizuna-modal-html" innerHTML={cfg.contentHtml} />
                </Show>

                {/* リンクカード（リリースノート等） */}
                <Show when={cfg.linkCard} keyed>
                  {(link) => (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="mizuna-modal-linkcard"
                    >
                      <div class="mizuna-modal-linkcard-icon">
                        <i>article</i>
                      </div>
                      <div class="mizuna-modal-linkcard-meta">
                        <span class="mizuna-modal-linkcard-label">{link.label}</span>
                        <span class="mizuna-modal-linkcard-title">{link.title}</span>
                      </div>
                      <i class="mizuna-modal-linkcard-arrow">open_in_new</i>
                    </a>
                  )}
                </Show>

                {/* プライバシーポリシーリンク */}
                <Show when={cfg.showPrivacyPolicy}>
                  <button
                    type="button"
                    class="mizuna-modal-linkcard mizuna-modal-privacy-card"
                    onClick={() => {
                      closeDialog();
                      setCurrentView('privacy');
                    }}
                  >
                    <div class="mizuna-modal-linkcard-icon">
                      <i>policy</i>
                    </div>
                    <div class="mizuna-modal-linkcard-meta">
                      <span class="mizuna-modal-linkcard-label">PRIVACY POLICY</span>
                      <span class="mizuna-modal-linkcard-title">プライバシーポリシー</span>
                    </div>
                    <i class="mizuna-modal-linkcard-arrow">arrow_forward</i>
                  </button>
                </Show>
              </div>

              {/* アクションボタン行 */}
              <div
                class={`mizuna-modal-actions ${
                  cfg.buttons.length === 1 ? 'is-single' : 'is-split'
                }`}
              >
                <For each={cfg.buttons}>
                  {(btn) => (
                    <button
                      type="button"
                      class={`mizuna-modal-btn ${
                        btn.variant === 'border'
                          ? 'is-secondary'
                          : btn.variant === 'text'
                            ? 'is-ghost'
                            : btn.variant === 'error'
                              ? 'is-danger'
                              : 'is-primary'
                      }`}
                      onClick={() => handleAction(btn)}
                    >
                      {btn.label}
                    </button>
                  )}
                </For>
              </div>
            </div>
          </div>
        </Portal>
      );
      }}
    </Show>
  );
}
