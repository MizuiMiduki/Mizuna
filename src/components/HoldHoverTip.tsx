import gsap from 'gsap';
import { createSignal, onCleanup, onSettled, Show } from 'solid-js';
import type { JSX } from '@solidjs/web';

export interface HoldHoverTipProps {
  /** メインのTIPSテキストまたはJSX */
  label: string;
  /** サブテキスト（アカウントIDやショートカットキーなど） */
  sublabel?: string;
  /** 表示位置 ('top' | 'bottom') */
  placement?: 'top' | 'bottom';
  /** カーソルホバーから表示までの待機ミリ秒 (デフォルト: 800ms) */
  hoverDelayMs?: number;
  /** タッチ長押しから表示までの待機ミリ秒 (デフォルト: 380ms) */
  longPressDelayMs?: number;
  children: JSX.Element;
}

export function HoldHoverTip(props: HoldHoverTipProps) {
  const [visible, setVisible] = createSignal(false);
  const [xOffset, setXOffset] = createSignal(0);
  let hoverTimer: ReturnType<typeof setTimeout> | undefined;
  let touchTimer: ReturnType<typeof setTimeout> | undefined;
  let didLongPress = false;
  let isTouching = false;
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

  const calculateShift = (): number => {
    if (!tipRef || !anchorRef) return 0;
    const anchorRect = anchorRef.getBoundingClientRect();
    const tipWidth = tipRef.offsetWidth;
    const margin = 16; // 画面端から 16px の安全余白
    const vw = document.documentElement.clientWidth || window.innerWidth;

    // 近接するカード・コンテナの境界を取得（PC表示でコンポーザーカード等の枠をはみ出さないように制御）
    const container = anchorRef.closest<HTMLElement>(
      '.mizuna-studio-composer, .mizuna-topbar-inner, .mizuna-main-container'
    );
    let minLeft = margin;
    let maxRight = vw - margin;

    if (container) {
      const containerRect = container.getBoundingClientRect();
      minLeft = Math.max(margin, containerRect.left + 8);
      maxRight = Math.min(vw - margin, containerRect.right - 8);
    }

    const anchorCenter = anchorRect.left + anchorRect.width / 2;
    const defaultLeft = anchorCenter - tipWidth / 2;
    const defaultRight = anchorCenter + tipWidth / 2;

    let shift = 0;
    const availableWidth = maxRight - minLeft;
    if (tipWidth > availableWidth && availableWidth > 0) {
      const targetCenter = (minLeft + maxRight) / 2;
      shift = targetCenter - anchorCenter;
    } else if (defaultLeft < minLeft) {
      shift = minLeft - defaultLeft;
    } else if (defaultRight > maxRight) {
      shift = maxRight - defaultRight;
    }
    return shift;
  };

  const showTip = () => {
    if (visible()) return;
    setVisible(true);
    const dir = props.placement === 'bottom' ? -8 : 8;

    requestAnimationFrame(() => {
      const shift = calculateShift();
      setXOffset(shift);

      if (tipRef) {
        gsap.killTweensOf(tipRef);
        gsap.fromTo(
          tipRef,
          { opacity: 0, y: dir, scale: 0.92, xPercent: -50, x: shift },
          { opacity: 1, y: 0, scale: 1, xPercent: -50, x: shift, duration: 0.2, ease: 'back.out(1.7)' }
        );
      }
    });
  };

  const hideTip = () => {
    clearTimers();
    if (!visible()) return;
    if (tipRef) {
      gsap.killTweensOf(tipRef);
      const dir = props.placement === 'bottom' ? -6 : 6;
      const currentShift = xOffset();
      gsap.to(tipRef, {
        opacity: 0,
        y: dir,
        scale: 0.94,
        xPercent: -50,
        x: currentShift,
        duration: 0.14,
        ease: 'power2.in',
        onComplete: () => {
          setVisible(false);
          setXOffset(0);
        },
      });
    } else {
      setVisible(false);
      setXOffset(0);
    }
  };

  // マウスカーソルを一定時間合わせたとき（タッチ直後の擬似ホバーは除外）
  const handleMouseEnter = () => {
    if (isTouching) return;
    if (window.matchMedia('(hover: none)').matches) return;
    clearTimers();
    hoverTimer = setTimeout(() => {
      showTip();
    }, props.hoverDelayMs ?? 800);
  };

  const handleMouseLeave = () => {
    hideTip();
  };

  // タッチ長押し開始
  const handleTouchStart = () => {
    isTouching = true;
    clearTimers();
    didLongPress = false;
    touchTimer = setTimeout(() => {
      didLongPress = true;
      showTip();
    }, props.longPressDelayMs ?? 380);
  };

  const handleTouchEnd = () => {
    clearTimers();
    hideTip();
    // タッチ終了後、ブラウザが生成する遅延mouse/hoverイベントを無視できるように少しだけ待機
    setTimeout(() => {
      isTouching = false;
    }, 400);
  };

  // クリック時のハンドラ
  const handleClickCapture = (e: MouseEvent) => {
    if (didLongPress) {
      e.preventDefault();
      e.stopPropagation();
      didLongPress = false;
      return;
    }
    hideTip();
  };

  onSettled(() => {
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
