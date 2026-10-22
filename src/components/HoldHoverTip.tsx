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

  const adjustPositionWithinViewport = () => {
    if (!tipRef || !anchorRef) return;
    const anchorRect = anchorRef.getBoundingClientRect();
    const tipWidth = tipRef.offsetWidth;
    const margin = 12; // 画面端からの安全マージン
    const vw = document.documentElement.clientWidth || window.innerWidth;

    // 通常の中央揃え時のTIPSの左右端座標
    const defaultLeft = anchorRect.left + anchorRect.width / 2 - tipWidth / 2;
    const defaultRight = defaultLeft + tipWidth;

    let shift = 0;
    if (defaultLeft < margin) {
      // 左端からはみ出す場合は右へ押し戻す
      shift = margin - defaultLeft;
    } else if (defaultRight > vw - margin) {
      // 右端からはみ出す場合は左へ押し戻す
      shift = vw - margin - defaultRight;
    }

    setXOffset(shift);
  };

  const showTip = () => {
    if (visible()) return;
    setXOffset(0);
    setVisible(true);
    const dir = props.placement === 'bottom' ? -8 : 8;

    requestAnimationFrame(() => {
      adjustPositionWithinViewport();
      if (tipRef) {
        gsap.killTweensOf(tipRef);
        gsap.fromTo(
          tipRef,
          { opacity: 0, y: dir, scale: 0.92 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'back.out(1.7)', force3D: true }
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
      gsap.to(tipRef, {
        opacity: 0,
        y: dir,
        scale: 0.94,
        duration: 0.14,
        ease: 'power2.in',
        force3D: true,
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
    }, props.hoverDelayMs ?? 480);
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
          style={{
            transform: `translateX(calc(-50% + ${xOffset()}px))`,
          }}
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
