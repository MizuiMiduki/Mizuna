import gsap from 'gsap';
import { createSignal, onCleanup, onMount, Show, type JSX } from 'solid-js';

export interface HoldHoverTipProps {
  /** メインのTIPSテキストまたはJSX */
  label: string;
  /** サブテキスト（アカウントIDやショートカットキーなど） */
  sublabel?: string;
  /** 表示位置 ('top' | 'bottom') */
  placement?: 'top' | 'bottom';
  /** カーソルホバーから表示までの待機ミリ秒 (デフォルト: 480ms) */
  hoverDelayMs?: number;
  /** タッチ長押しから表示までの待機ミリ秒 (デフォルト: 380ms) */
  longPressDelayMs?: number;
  children: JSX.Element;
}

export function HoldHoverTip(props: HoldHoverTipProps) {
  const [visible, setVisible] = createSignal(false);
  let hoverTimer: ReturnType<typeof setTimeout> | undefined;
  let touchTimer: ReturnType<typeof setTimeout> | undefined;
  let didLongPress = false;
  let anchorRef: HTMLDivElement | undefined;
  let tipRef: HTMLDivElement | undefined;

  const clearTimers = () => {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = undefined;
    }
    if (touchTimer) {
      clearTimeout(touchTimer);
      touchTimer = undefined;
    }
  };

  const showTip = () => {
    if (visible()) return;
    setVisible(true);
    const dir = props.placement === 'bottom' ? -8 : 8;
    requestAnimationFrame(() => {
      if (tipRef) {
        gsap.fromTo(
          tipRef,
          { opacity: 0, y: dir, scale: 0.92 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'back.out(1.7)' }
        );
      }
    });
  };

  const hideTip = () => {
    clearTimers();
    if (!visible()) return;
    if (tipRef) {
      const dir = props.placement === 'bottom' ? -6 : 6;
      gsap.to(tipRef, {
        opacity: 0,
        y: dir,
        scale: 0.94,
        duration: 0.14,
        ease: 'power2.in',
        onComplete: () => setVisible(false),
      });
    } else {
      setVisible(false);
    }
  };

  // マウスカーソルを一定時間合わせたとき
  const handleMouseEnter = () => {
    clearTimers();
    hoverTimer = setTimeout(() => {
      showTip();
    }, props.hoverDelayMs ?? 480);
  };

  const handleMouseLeave = () => {
    hideTip();
  };

  // タッチ長押し開始
  const handleTouchStart = () => {
    clearTimers();
    didLongPress = false;
    touchTimer = setTimeout(() => {
      didLongPress = true;
      showTip();
    }, props.longPressDelayMs ?? 380);
  };

  const handleTouchEnd = () => {
    hideTip();
  };

  // 長押しでTIPSを表示した場合は直後のクリックイベントをキャンセルする
  const handleClickCapture = (e: MouseEvent) => {
    if (didLongPress) {
      e.preventDefault();
      e.stopPropagation();
      didLongPress = false;
      return;
    }
    hideTip();
  };

  onMount(() => {
    anchorRef?.addEventListener('click', handleClickCapture, true);
  });

  onCleanup(() => {
    anchorRef?.removeEventListener('click', handleClickCapture, true);
    clearTimers();
  });

  return (
    <div
      ref={anchorRef}
      class="mizuna-tip-anchor"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onContextMenu={(e) => {
        if (didLongPress || visible()) {
          e.preventDefault();
        }
      }}
    >
      {props.children}

      <Show when={visible()}>
        <div
          ref={tipRef}
          class={`mizuna-tip-bubble is-${props.placement ?? 'top'}`}
          role="tooltip"
        >
          <span class="mizuna-tip-title">{props.label}</span>
          <Show when={props.sublabel}>
            <span class="mizuna-tip-sub">{props.sublabel}</span>
          </Show>
        </div>
      </Show>
    </div>
  );
}
