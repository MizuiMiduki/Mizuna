/**
 * UI アニメーションユーティリティ (Web Animations API / WAAPI ベース)
 *
 * 外部ライブラリ (GSAP等) を完全に廃止し、ブラウザネイティブの
 * Compositor / GPU スレッドで 60fps/120fps の滑らかなアニメーションを実行します。
 * メインスレッドの処理負荷（Solidの描画・IndexedDB・通信等）に干渉されず、
 * パケットサイズ削減とバッテリー消費低減を両立します。
 */

export const EASING = {
  // GSAP power3.out 相当の滑らかな減速
  outCubic: 'cubic-bezier(0.16, 1, 0.3, 1)',
  // GSAP power2.out 相当
  outQuad: 'cubic-bezier(0.25, 1, 0.5, 1)',
  // GSAP power2.in 相当（閉じる時の加速）
  inQuad: 'cubic-bezier(0.5, 0, 0.75, 0)',
  // GSAP back.out(1.5) 相当（心地よい微小オーバーシュート・バウンス）
  outBack: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
  // より弾むバウンス (back.out(2))
  outBackStrong: 'cubic-bezier(0.34, 1.6, 0.64, 1)',
  // 標準のイーズインアウト
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

/**
 * OS/ブラウザの「視覚効果を減らす（prefers-reduced-motion）」設定を判定
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true
  );
}

/**
 * 安全に Element.animate を呼び出すラッパー（未対応ブラウザや jsdom テスト環境向け）
 */
export function safeAnimate(
  element: HTMLElement | undefined | null,
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
  options?: KeyframeAnimationOptions
): Animation | null {
  if (!element || typeof element.animate !== 'function') {
    return null;
  }
  try {
    return element.animate(keyframes, options);
  } catch {
    return null;
  }
}

/**
 * 各画面 (View) の表示開始アニメーション（フェード＆スライドイン）
 */
export function animateViewEnter(element: HTMLElement | undefined | null, distance = 12) {
  if (!element || prefersReducedMotion()) return;
  safeAnimate(
    element,
    [
      { opacity: 0, transform: `translateY(${distance}px)` },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    {
      duration: 280,
      easing: EASING.outCubic,
    }
  );
}

/**
 * モーダル / ダイアログのポップインアニメーション
 */
export function animateModalEnter(
  cardEl: HTMLElement | undefined | null,
  backdropEl?: HTMLElement | undefined | null
) {
  const finalizeBackdrop = () => {
    if (backdropEl) {
      backdropEl.style.opacity = '1';
    }
  };
  const finalizeCard = () => {
    if (cardEl) {
      cardEl.style.opacity = '1';
      cardEl.style.transform = 'none';
    }
  };

  if (prefersReducedMotion()) {
    finalizeBackdrop();
    finalizeCard();
    return;
  }

  if (backdropEl) {
    const anim = safeAnimate(
      backdropEl,
      [{ opacity: 0 }, { opacity: 1 }],
      {
        duration: 220,
        easing: EASING.outQuad,
        fill: 'forwards',
      }
    );
    if (anim) {
      anim.onfinish = finalizeBackdrop;
      setTimeout(finalizeBackdrop, 260);
    } else {
      finalizeBackdrop();
    }
  }

  if (cardEl) {
    const anim = safeAnimate(
      cardEl,
      [
        { opacity: 0, transform: 'scale(0.92) translateY(14px)' },
        { opacity: 1, transform: 'scale(1) translateY(0)' },
      ],
      {
        duration: 280,
        easing: EASING.outBack,
        fill: 'forwards',
      }
    );
    if (anim) {
      anim.onfinish = finalizeCard;
      setTimeout(finalizeCard, 320);
    } else {
      finalizeCard();
    }
  }
}

/**
 * モーダル / ダイアログのフェードアウト（閉じる）アニメーション
 */
export async function animateModalLeave(
  cardEl: HTMLElement | undefined | null,
  backdropEl?: HTMLElement | undefined | null
): Promise<void> {
  if (!cardEl && !backdropEl) return;
  if (prefersReducedMotion()) return;

  const animations: Animation[] = [];

  if (backdropEl) {
    const a = safeAnimate(
      backdropEl,
      [{ opacity: 1 }, { opacity: 0 }],
      {
        duration: 160,
        easing: EASING.inQuad,
        fill: 'forwards',
      }
    );
    if (a) animations.push(a);
  }

  if (cardEl) {
    const a = safeAnimate(
      cardEl,
      [
        { opacity: 1, transform: 'scale(1) translateY(0)' },
        { opacity: 0, transform: 'scale(0.94) translateY(8px)' },
      ],
      {
        duration: 160,
        easing: EASING.inQuad,
        fill: 'forwards',
      }
    );
    if (a) animations.push(a);
  }

  if (animations.length > 0) {
    await Promise.all(animations.map((anim) => anim.finished.catch(() => {})));
  }
}

/**
 * ボタンや選択要素の微小バウンスアニメーション
 */
export function animatePop(element: HTMLElement | undefined | null, scale = 0.92) {
  if (!element || prefersReducedMotion()) return;
  safeAnimate(
    element,
    [
      { transform: `scale(${scale})` },
      { transform: 'scale(1)' },
    ],
    {
      duration: 220,
      easing: EASING.outBackStrong,
    }
  );
}
