/**
 * Mizuna MFM (Misskey Flavored Markdown) Parser & Insertion Utilities
 * Misskey公式パーサー `mfm-js` およびMisskey本家のレンダリング仕様に完全準拠
 */

import * as mfm from 'mfm-js';

/**
 * HTML特殊文字をエスケープして安全にする
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeParseFloat(val: unknown): number | null {
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val !== 'string' || val === '') return null;
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
}

function validTime(t: string | boolean | null | undefined): string | null {
  if (t == null || typeof t === 'boolean') return null;
  return /^-?[0-9.]+s$/.test(t) ? t : /^-?[0-9.]+ms$/.test(t) ? t : /^-?[0-9.]+$/.test(t) ? `${t}s` : null;
}

function validColor(c: unknown): string | null {
  if (typeof c !== 'string') return null;
  const clean = c.replace(/^#/, '');
  return /^[0-9a-fA-F]{3,6}$/.test(clean) ? clean : null;
}

/**
 * mfm-js AST ノードを HTML 文字列に再帰レンダリングする
 */
function renderNodes(nodes: mfm.MfmNode[]): string {
  return nodes.map(renderNode).join('');
}

function renderNode(node: mfm.MfmNode): string {
  switch (node.type) {
    case 'text': {
      const text = escapeHtml(node.props.text);
      return text.replace(/\n/g, '<br>');
    }

    case 'bold':
      return `<strong>${renderNodes(node.children)}</strong>`;

    case 'strike':
      return `<del>${renderNodes(node.children)}</del>`;

    case 'italic':
      return `<i style="font-style: oblique;">${renderNodes(node.children)}</i>`;

    case 'small':
      return `<small style="opacity: 0.7;">${renderNodes(node.children)}</small>`;

    case 'center':
      return `<div style="text-align: center;">${renderNodes(node.children)}</div>`;

    case 'fn': {
      const args = node.props.args || {};
      let style: string | undefined;
      let className = '';

      switch (node.props.name) {
        case 'tada': {
          const speed = validTime(args.speed as string) ?? '1s';
          const delay = validTime(args.delay as string) ?? '0s';
          style = `font-size: 150%; animation: global-tada ${speed} linear infinite both; animation-delay: ${delay};`;
          className = 'mfm-tada';
          break;
        }

        case 'jelly': {
          const speed = validTime(args.speed as string) ?? '1s';
          const delay = validTime(args.delay as string) ?? '0s';
          style = `animation: mfm-rubberBand ${speed} linear infinite both; animation-delay: ${delay};`;
          className = 'mfm-jelly';
          break;
        }

        case 'twitch': {
          const speed = validTime(args.speed as string) ?? '0.5s';
          const delay = validTime(args.delay as string) ?? '0s';
          style = `animation: mfm-twitch ${speed} ease infinite; animation-delay: ${delay};`;
          className = 'mfm-twitch';
          break;
        }

        case 'shake': {
          const speed = validTime(args.speed as string) ?? '0.5s';
          const delay = validTime(args.delay as string) ?? '0s';
          style = `animation: mfm-shake ${speed} ease infinite; animation-delay: ${delay};`;
          className = 'mfm-shake';
          break;
        }

        case 'spin': {
          const direction = args.left ? 'reverse' : args.alternate ? 'alternate' : 'normal';
          const anime = args.x ? 'mfm-spinX' : args.y ? 'mfm-spinY' : 'mfm-spin';
          const speed = validTime(args.speed as string) ?? '1.5s';
          const delay = validTime(args.delay as string) ?? '0s';
          style = `animation: ${anime} ${speed} linear infinite; animation-direction: ${direction}; animation-delay: ${delay};`;
          const subCls = args.left ? ' mfm-spin-left' : args.x ? ' mfm-spin-x' : args.y ? ' mfm-spin-y' : args.alternate ? ' mfm-spin-alternate' : '';
          className = `mfm-spin${subCls}`;
          break;
        }

        case 'jump': {
          const speed = validTime(args.speed as string) ?? '0.75s';
          const delay = validTime(args.delay as string) ?? '0s';
          style = `animation: mfm-jump ${speed} linear infinite; animation-delay: ${delay};`;
          className = 'mfm-jump';
          break;
        }

        case 'bounce': {
          const speed = validTime(args.speed as string) ?? '0.75s';
          const delay = validTime(args.delay as string) ?? '0s';
          style = `animation: mfm-bounce ${speed} linear infinite; transform-origin: center bottom; animation-delay: ${delay};`;
          className = 'mfm-bounce';
          break;
        }

        case 'flip': {
          const transform =
            args.h && args.v ? 'scale(-1, -1)' :
            args.v ? 'scaleY(-1)' :
            'scaleX(-1)';
          style = `transform: ${transform};`;
          className = args.v ? 'mfm-flip-v' : 'mfm-flip';
          break;
        }

        case 'x2':
          return `<span class="mfm-x2" style="display: inline-block;">${renderNodes(node.children)}</span>`;

        case 'x3':
          return `<span class="mfm-x3" style="display: inline-block;">${renderNodes(node.children)}</span>`;

        case 'x4':
          return `<span class="mfm-x4" style="display: inline-block;">${renderNodes(node.children)}</span>`;

        case 'font': {
          const family =
            args.serif ? 'serif' :
            args.monospace ? 'monospace' :
            args.cursive ? 'cursive' :
            args.fantasy ? 'fantasy' :
            args.emoji ? 'emoji' :
            args.math ? 'math' : null;
          if (family) style = `font-family: ${family};`;
          break;
        }

        case 'blur':
          return `<span class="_mfm_blur_ mfm-blur" tabindex="0" title="ホバーまたはタップで表示">${renderNodes(node.children)}</span>`;

        case 'rainbow': {
          const speed = validTime(args.speed as string) ?? '1s';
          const delay = validTime(args.delay as string) ?? '0s';
          style = `animation: mfm-rainbow ${speed} linear infinite; animation-delay: ${delay};`;
          className = 'mfm-rainbow';
          break;
        }

        case 'rotate': {
          const degrees = safeParseFloat(args.deg) ?? 90;
          style = `transform: rotate(${degrees}deg); transform-origin: center center;`;
          break;
        }

        case 'position': {
          const x = safeParseFloat(args.x) ?? 0;
          const y = safeParseFloat(args.y) ?? 0;
          style = `transform: translateX(${x}em) translateY(${y}em);`;
          break;
        }

        case 'scale': {
          const x = Math.min(safeParseFloat(args.x) ?? 1, 5);
          const y = Math.min(safeParseFloat(args.y) ?? 1, 5);
          style = `transform: scale(${x}, ${y});`;
          className = 'mfm-scale';
          break;
        }

        case 'fg': {
          const color = validColor(args.color) ?? 'f00';
          style = `color: #${color}; overflow-wrap: anywhere;`;
          className = 'mfm-fg';
          break;
        }

        case 'bg': {
          const color = validColor(args.color) ?? 'f00';
          style = `background-color: #${color}; overflow-wrap: anywhere;`;
          className = 'mfm-bg';
          break;
        }

        case 'border': {
          const color = validColor(args.color) ? `#${validColor(args.color)}` : 'var(--pico-primary, #e06c75)';
          let bStyle = args.style;
          if (
            typeof bStyle !== 'string' ||
            !['hidden', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset'].includes(bStyle)
          ) {
            bStyle = 'solid';
          }
          const width = safeParseFloat(args.width) ?? 1;
          const radius = safeParseFloat(args.radius) ?? 0;
          style = `border: ${width}px ${bStyle} ${color}; border-radius: ${radius}px;${args.noclip ? '' : ' overflow: clip;'}`;
          break;
        }

        case 'ruby': {
          if (node.children.length === 1 && node.children[0].type === 'text') {
            const parts = node.children[0].props.text.trim().split(/\s+/);
            const parent = escapeHtml(parts[0] || '');
            const rt = escapeHtml(parts[1] || '');
            return `<ruby>${parent}<rt>${rt}</rt></ruby>`;
          } else {
            return `<ruby>${renderNodes(node.children)}</ruby>`;
          }
        }
      }

      const classAttr = className ? ` class="${className}"` : '';
      if (style !== undefined) {
        return `<span${classAttr} style="display: inline-block; ${style}">${renderNodes(node.children)}</span>`;
      }
      if (className) {
        return `<span${classAttr}>${renderNodes(node.children)}</span>`;
      }
      return renderNodes(node.children);
    }

    case 'quote':
      return `<blockquote class="mfm-quote">${renderNodes(node.children)}</blockquote>`;

    case 'url': {
      const url = escapeHtml(node.props.url);
      return `<a href="${url}" target="_blank" rel="nofollow noopener noreferrer" class="mfm-link">${url}</a>`;
    }

    case 'link': {
      const url = escapeHtml(node.props.url);
      return `<a href="${url}" target="_blank" rel="nofollow noopener noreferrer" class="mfm-link">${renderNodes(node.children)}</a>`;
    }

    case 'mention': {
      const host = node.props.host ? `@${node.props.host}` : '';
      const mention = `@${node.props.username}${host}`;
      return `<span class="mfm-mention">${escapeHtml(mention)}</span>`;
    }

    case 'hashtag':
      return `<span class="mfm-hashtag">#${escapeHtml(node.props.hashtag)}</span>`;

    case 'blockCode': {
      const lang = node.props.lang ? ` data-lang="${escapeHtml(node.props.lang)}"` : '';
      return `<pre class="mfm-code-block"${lang}><code>${escapeHtml(node.props.code)}</code></pre>`;
    }

    case 'inlineCode':
      return `<code class="mfm-inline-code">${escapeHtml(node.props.code)}</code>`;

    case 'mathInline':
      return `<code class="mfm-math-inline">${escapeHtml(node.props.formula)}</code>`;

    case 'mathBlock':
      return `<pre class="mfm-code-block"><code>${escapeHtml(node.props.formula)}</code></pre>`;

    case 'search': {
      const query = escapeHtml(node.props.query);
      return `<div class="mfm-search"><span>${query}</span> <button type="button" class="mfm-search-button">検索</button></div>`;
    }

    case 'emojiCode':
      return `:${escapeHtml(node.props.name)}:`;

    case 'unicodeEmoji':
      return escapeHtml(node.props.emoji);

    case 'plain':
      return renderNodes(node.children);

    default:
      return '';
  }
}

/**
 * MFM構文を含む文字列をHTML文字列に変換する
 */
export function renderMfm(text: string): string {
  if (!text) return '';

  try {
    const parsed = mfm.parse(text);
    return renderNodes(parsed);
  } catch (err) {
    console.error('MFM parse error:', err);
    return escapeHtml(text).replace(/\n/g, '<br>');
  }
}

/**
 * テキストエリアの現在選択位置（またはカーソル位置）にMFMタグを挿入・ラップする
 */
export function insertMfmTag(
  currentText: string,
  selectionStart: number,
  selectionEnd: number,
  tagPrefix: string,
  tagSuffix: string,
  defaultPlaceholder = ''
): { newText: string; newCursorStart: number; newCursorEnd: number } {
  const before = currentText.slice(0, selectionStart);
  const selected = currentText.slice(selectionStart, selectionEnd);
  const after = currentText.slice(selectionEnd);

  if (selected.length > 0) {
    // 選択テキストがある場合はタグで囲む
    const newText = before + tagPrefix + selected + tagSuffix + after;
    const newCursorStart = selectionStart + tagPrefix.length;
    const newCursorEnd = newCursorStart + selected.length;
    return { newText, newCursorStart, newCursorEnd };
  } else {
    // 選択テキストがない場合はプレースホルダを挿入し、その位置にカーソルを合わせる
    const content = defaultPlaceholder;
    const newText = before + tagPrefix + content + tagSuffix + after;
    const newCursorStart = selectionStart + tagPrefix.length;
    const newCursorEnd = newCursorStart + content.length;
    return { newText, newCursorStart, newCursorEnd };
  }
}
