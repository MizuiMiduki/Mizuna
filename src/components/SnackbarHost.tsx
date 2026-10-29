import gsap from 'gsap';
import { For, onCleanup, onSettled } from 'solid-js';
import { useApp, type ToastItem } from '../store/appStore';

const TOAST_DURATION_SEC = 3.5;

function ToastCard(props: { item: ToastItem; onDismiss: (id: string) => void }) {
  let cardRef: HTMLDivElement | undefined;
  let progressRef: HTMLDivElement | undefined;
  let progressTween: gsap.core.Tween | undefined;
  let isClosing = false;

  const handleClose = () => {
    if (isClosing) return;
    isClosing = true;
    progressTween?.kill();

    if (cardRef) {
      gsap.to(cardRef, {
        opacity: 0,
        x: 32,
        scale: 0.92,
        duration: 0.18,
        ease: 'power2.in',
        onComplete: () => props.onDismiss(props.item.id),
      });
    } else {
      props.onDismiss(props.item.id);
    }
  };

  onSettled(() => {
    if (cardRef) {
      gsap.fromTo(
        cardRef,
        { opacity: 0, y: -16, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 0.28, ease: 'back.out(1.6)' }
      );
    }

    if (progressRef) {
      progressTween = gsap.fromTo(
        progressRef,
        { scaleX: 1 },
        {
          scaleX: 0,
          duration: TOAST_DURATION_SEC,
          ease: 'none',
          onComplete: handleClose,
        }
      );
    }
  });

  onCleanup(() => {
    progressTween?.kill();
  });

  const getIconName = () => {
    switch (props.item.type) {
      case 'success':
        return 'check_circle';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  };

  return (
    <div
      ref={cardRef}
      class={`mizuna-toast-card is-${props.item.type}`}
      role="status"
      onMouseEnter={() => progressTween?.pause()}
      onMouseLeave={() => {
        if (!isClosing) progressTween?.resume();
      }}
    >
      <div class={`mizuna-toast-icon is-${props.item.type}`}>
        <i>{getIconName()}</i>
      </div>
      <div class="mizuna-toast-content">
        {props.item.title && <div class="mizuna-toast-title">{props.item.title}</div>}
        <div class="mizuna-toast-msg">{props.item.message}</div>
      </div>
      <button
        type="button"
        class="mizuna-toast-close"
        onClick={handleClose}
        aria-label="閉じる"
      >
        <i>close</i>
      </button>

      {/* 下部カウントダウンバー */}
      <div class="mizuna-toast-progress-track">
        <div
          ref={progressRef}
          class={`mizuna-toast-progress-bar is-${props.item.type}`}
        />
      </div>
    </div>
  );
}

export function SnackbarHost() {
  const { toasts, dismissToast } = useApp();

  return (
    <div class="mizuna-toast-container">
      <For each={toasts()}>{(item) => <ToastCard item={item} onDismiss={dismissToast} />}</For>
    </div>
  );
}
