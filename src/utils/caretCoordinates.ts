/**
 * Caret coordinates calculation for HTMLTextAreaElement and HTMLInputElement.
 * Mirrors the element's styling in a temporary off-screen div to measure
 * the exact pixel coordinates of any character index.
 */

export interface CaretCoordinates {
  top: number;
  left: number;
  height: number;
}

const PROPERTIES = [
  'direction',
  'boxSizing',
  'width',
  'height',
  'overflowX',
  'overflowY',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderStyle',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
  'MozTabSize',
] as const;

export function getCaretCoordinates(
  element: HTMLTextAreaElement | HTMLInputElement,
  position: number
): CaretCoordinates {
  if (typeof document === 'undefined' || !element) {
    return { top: 0, left: 0, height: 24 };
  }

  try {
    const isFirefox = typeof window !== 'undefined' && 'mozInnerScreenX' in window;
    const computed = window.getComputedStyle(element);

    const div = document.createElement('div');
    div.id = 'input-textarea-caret-position-mirror-div';
    const style = div.style;

    style.whiteSpace = 'pre-wrap';
    style.wordBreak = 'break-word';
    style.position = 'absolute';
    style.visibility = 'hidden';
    style.pointerEvents = 'none';
    style.top = '-9999px';
    style.left = '-9999px';

    PROPERTIES.forEach((prop) => {
      (style as any)[prop] = (computed as any)[prop];
    });

    if (isFirefox) {
      if (element.scrollHeight > parseInt(computed.height, 10)) {
        style.overflowY = 'scroll';
      }
    } else {
      style.overflow = 'hidden';
    }

    const value = element.value || '';
    div.textContent = value.substring(0, position);

    const span = document.createElement('span');
    span.textContent = value.substring(position, position + 1) || ' ';
    div.appendChild(span);

    document.body.appendChild(div);

    const spanTop = span.offsetTop;
    const spanLeft = span.offsetLeft;
    const borderTop = parseInt(computed.borderTopWidth || '0', 10) || 0;
    const borderLeft = parseInt(computed.borderLeftWidth || '0', 10) || 0;
    const lineHeightVal = parseFloat(computed.lineHeight);
    const fontSizeVal = parseFloat(computed.fontSize) || 16;
    const height = !isNaN(lineHeightVal) && lineHeightVal > 0 ? lineHeightVal : fontSizeVal * 1.5;

    document.body.removeChild(div);

    return {
      top: spanTop + borderTop,
      left: spanLeft + borderLeft,
      height,
    };
  } catch {
    return { top: 0, left: 0, height: 24 };
  }
}
