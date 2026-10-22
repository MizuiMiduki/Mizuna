import gsap from 'gsap';
import { createEffect, For, Show } from 'solid-js';
import { useApp, type DialogButton } from '../store/appStore';

export function DialogHost() {
  const { dialogConfig, closeDialog } = useApp();
  let modalRef: HTMLDivElement | undefined;
  let backdropRef: HTMLDivElement | undefined;

  createEffect(() => {
    const cfg = dialogConfig();
    if (cfg && modalRef && backdropRef) {
      gsap.fromTo(
        backdropRef,
        { opacity: 0 },
        { opacity: 1, duration: 0.22, ease: 'power2.out' }
      );
      gsap.fromTo(
        modalRef,
        { opacity: 0, scale: 0.9, y: 18 },
        { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: 'back.out(1.5)' }
      );
    }
  });

  const handleAction = async (btn: DialogButton) => {
    if (modalRef && backdropRef) {
      await Promise.all([
        gsap.to(modalRef, { opacity: 0, scale: 0.94, y: 10, duration: 0.16 }),
        gsap.to(backdropRef, { opacity: 0, duration: 0.16 }),
      ]);
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
    <Show when={dialogConfig()}>
      {(cfg) => {
        const tone = () => cfg().tone ?? 'primary';
        const iconName = () => cfg().icon ?? getDefaultIcon(cfg().tone);

        return (
          <div class="mizuna-modal-portal" role="dialog" aria-modal="true">
            <div
              ref={backdropRef}
              class="mizuna-modal-backdrop"
              onClick={() => closeDialog()}
            />

            <div
              ref={modalRef}
              class={`mizuna-modal-card is-${tone()}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 上部アイコン＆バッジ */}
              <div class="mizuna-modal-top">
                <div class={`mizuna-modal-icon is-${tone()}`}>
                  <i>{iconName()}</i>
                </div>
                <Show when={cfg().badgeText}>
                  <span class={`mizuna-modal-badge is-${tone()}`}>{cfg().badgeText}</span>
                </Show>
                <h3 class="mizuna-modal-title">{cfg().title}</h3>
              </div>

              {/* 本文エリア */}
              <div class="mizuna-modal-body">
                <Show
                  when={cfg().contentHtml}
                  fallback={<p class="mizuna-modal-text">{cfg().contentText}</p>}
                >
                  <div class="mizuna-modal-html" innerHTML={cfg().contentHtml} />
                </Show>

                {/* リンクカード（リリースノート等） */}
                <Show when={cfg().linkCard}>
                  {(link) => (
                    <a
                      href={link().url}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="mizuna-modal-linkcard"
                    >
                      <div class="mizuna-modal-linkcard-icon">
                        <i>article</i>
                      </div>
                      <div class="mizuna-modal-linkcard-meta">
                        <span class="mizuna-modal-linkcard-label">{link().label}</span>
                        <span class="mizuna-modal-linkcard-title">{link().title}</span>
                      </div>
                      <i class="mizuna-modal-linkcard-arrow">open_in_new</i>
                    </a>
                  )}
                </Show>
              </div>

              {/* アクションボタン行 */}
              <div
                class={`mizuna-modal-actions ${
                  cfg().buttons.length === 1 ? 'is-single' : 'is-split'
                }`}
              >
                <For each={cfg().buttons}>
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
        );
      }}
    </Show>
  );
}
