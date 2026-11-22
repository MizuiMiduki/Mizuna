import { For, onSettled } from 'solid-js';
import { useApp, type ToastItem } from '../store/appStore';
import { EASING, safeAnimate } from '../utils/animation';

const TOAST_DURATION_SEC = 1.75;

function ToastCard(props: { item: ToastItem; onDismiss: (id: string) => void }) {
  let cardRef: HTMLDivElement | undefined;
  let progressRef: HTMLDivElement | undefined;
  let progressAnim: Animation | null = null;
  let isClosing = false;

  const handleClose = () => {
    if (isClosing) return;
    isClosing = true;
    progressAnim?.cancel();

    if (cardRef) {
      const closeAnim = safeAnimate(
        cardRef,
        [
          { opacity: 1, transform: 'translateX(0) scale(1)' },
          { opacity: 0, transform: 'translateX(32px) scale(0.92)' },
        ],
        {
          duration: 180,
          easing: EASING.inQuad,
          fill: 'forwards',
        }
      );
      if (closeAnim) {
        closeAnim.onfinish = () => props.onDismiss(props.item.id);
      } else {
        props.onDismiss(props.item.id);
      }
    } else {
      props.onDismiss(props.item.id);
    }
  };

  onSettled(() => {
    if (cardRef) {
      safeAnimate(
        cardRef,
        [
          { opacity: 0, transform: 'translateY(-16px) scale(0.94)' },
          { opacity: 1, transform: 'translateY(0) scale(1)' },
        ],
        {
          duration: 280,
          easing: EASING.outBackStrong,
        }
      );
    }

    if (progressRef) {
      progressAnim = safeAnimate(
        progressRef,
        [
          { transform: 'scaleX(1)' },
          { transform: 'scaleX(0)' },
        ],
        {
          duration: TOAST_DURATION_SEC * 1000,
          easing: 'linear',
          fill: 'forwards',
        }
      );
      if (progressAnim) {
        progressAnim.onfinish = handleClose;
      }
    }

    return () => {
      progressAnim?.cancel();
    };
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
      onMouseEnter={() => progressAnim?.pause()}
      onMouseLeave={() => {
        if (!isClosing) progressAnim?.play();
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
