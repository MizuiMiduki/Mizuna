/**
 * Mizuna MFM (Misskey Flavored Markdown) Parser & Insertion Utilities
 * Misskey公式パーサー `mfm-js` およびMisskey本家のレンダリング仕様に完全準拠
 */

import * as mfm from 'mfm-js';

const HTML_ESCAPE_RE = /[&<>"']/g;
const HTML_ESCAPE_TEST_RE = /[&<>"']/;
const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const TIME_S_RE = /^-?[0-9.]+s$/;
const TIME_MS_RE = /^-?[0-9.]+ms$/;
const TIME_NUM_RE = /^-?[0-9.]+$/;
const HEX_COLOR_RE = /^[0-9a-fA-F]{3,6}$/;
const COLON_TRIM_RE = /^:|:$/g;
const INLINE_EMOJI_RE = /:([a-zA-Z0-9_@.-]+):/g;
const EMPTY_EMOJI_MAP = new Map<string, string>();

/**
 * HTML特殊文字をエスケープして安全にする
 */
export function escapeHtml(str: string): string {
  if (!str || !HTML_ESCAPE_TEST_RE.test(str)) return str;
  return str.replace(HTML_ESCAPE_RE, (ch) => HTML_ESCAPE_MAP[ch]);
}

function safeParseFloat(val: unknown): number | null {
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val !== 'string' || val === '') return null;
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
}

function validTime(t: string | boolean | null | undefined): string | null {
  if (t == null || typeof t === 'boolean') return null;
  return TIME_S_RE.test(t) ? t : TIME_MS_RE.test(t) ? t : TIME_NUM_RE.test(t) ? `${t}s` : null;
}

function validColor(c: unknown): string | null {
  if (typeof c !== 'string') return null;
  const clean = c.charCodeAt(0) === 35 /* '#' */ ? c.slice(1) : c;
  return HEX_COLOR_RE.test(clean) ? clean : null;
}

export type EmojiSource =
  | Array<{ name: string; url: string; host?: string | null }>
  | Record<string, string>
  | Map<string, string>;

export interface RenderMfmOptions {
  serverAddress?: string;
  serverEmojiMap?: Map<string, string>;
}

/**
 * 絵文字リストやマップを正規化して検索用 Map に変換する
 */
export function normalizeEmojiMap(emojis?: EmojiSource | null): Map<string, string> {
  if (!emojis) return EMPTY_EMOJI_MAP;

  if (emojis instanceof Map) {
    if (emojis.size === 0) return EMPTY_EMOJI_MAP;
    const map = new Map<string, string>();
    for (const [key, val] of emojis.entries()) {
      if (typeof val === 'string') {
        const raw = key.replace(COLON_TRIM_RE, '').toLowerCase();
        map.set(raw, val);
        const atIdx = raw.indexOf('@');
        const withoutDomain = atIdx !== -1 ? raw.slice(0, atIdx) : raw;
        if (withoutDomain && !map.has(withoutDomain)) {
          map.set(withoutDomain, val);
          map.set(`${withoutDomain}@.`, val);
        }
      }
    }
    return map;
  }

  if (Array.isArray(emojis)) {
    if (emojis.length === 0) return EMPTY_EMOJI_MAP;
    const map = new Map<string, string>();
    for (let i = 0; i < emojis.length; i++) {
      const item = emojis[i];
      if (item && item.name && item.url) {
        const raw = item.name.replace(COLON_TRIM_RE, '').toLowerCase();
        map.set(raw, item.url);
        if (item.host) {
          map.set(`${raw}@${item.host.toLowerCase()}`, item.url);
        }
        map.set(`${raw}@.`, item.url);
      }
    }
    return map;
  }

  if (typeof emojis === 'object') {
    const entries = Object.entries(emojis);
    if (entries.length === 0) return EMPTY_EMOJI_MAP;
    const map = new Map<string, string>();
    for (let i = 0; i < entries.length; i++) {
      const [key, val] = entries[i];
      if (typeof val === 'string') {
        const raw = key.replace(COLON_TRIM_RE, '').toLowerCase();
        map.set(raw, val);
        const atIdx = raw.indexOf('@');
        const withoutDomain = atIdx !== -1 ? raw.slice(0, atIdx) : raw;
        if (withoutDomain && !map.has(withoutDomain)) {
          map.set(withoutDomain, val);
          map.set(`${withoutDomain}@.`, val);
        }
      }
    }
    return map;
  }

  return EMPTY_EMOJI_MAP;
}

function resolveCustomEmojiImg(
  rawName: string,
  emojiMap: Map<string, string>,
  options?: RenderMfmOptions
): string | null {
  const cleanName = rawName.replace(COLON_TRIM_RE, '').toLowerCase();
  const atIdx = cleanName.indexOf('@');
  const withoutHost = atIdx !== -1 ? cleanName.slice(0, atIdx) : cleanName;
  const localKey = `${withoutHost}@.`;

  let emojiUrl =
    emojiMap.get(cleanName) ||
    emojiMap.get(withoutHost) ||
    emojiMap.get(localKey) ||
    options?.serverEmojiMap?.get(cleanName) ||
    options?.serverEmojiMap?.get(withoutHost) ||
    options?.serverEmojiMap?.get(localKey);

  // 自サーバー絵文字フォールバック (自サーバーの /emoji/name.webp)
  if (!emojiUrl && options?.serverAddress && (atIdx === -1 || cleanName.endsWith('@.'))) {
    emojiUrl = `https://${options.serverAddress}/emoji/${encodeURIComponent(withoutHost)}.webp`;
  }

  if (!emojiUrl) return null;
  const escapedName = escapeHtml(rawName);
  const escapedUrl = escapeHtml(emojiUrl);
  return `<img class="mfm-custom-emoji" src="${escapedUrl}" alt=":${escapedName}:" title=":${escapedName}:" loading="lazy" decoding="async" onerror="this.outerHTML=':${escapedName}:'" />`;
}

/**
 * mfm-js AST ノードを HTML 文字列に再帰レンダリングする
 */
function renderNodes(
  nodes: mfm.MfmNode[],
  emojiMap: Map<string, string>,
  options?: RenderMfmOptions
): string {
  return nodes.map((node) => renderNode(node, emojiMap, options)).join('');
}

function renderNode(
  node: mfm.MfmNode,
  emojiMap: Map<string, string>,
  options?: RenderMfmOptions
): string {
  switch (node.type) {
    case 'text': {
      const text = escapeHtml(node.props.text);
      return text.replace(/\n/g, '<br>');
    }

    case 'bold':
      return `<strong>${renderNodes(node.children, emojiMap, options)}</strong>`;

    case 'strike':
      return `<del>${renderNodes(node.children, emojiMap, options)}</del>`;

    case 'italic':
      return `<i style="font-style: oblique;">${renderNodes(node.children, emojiMap, options)}</i>`;

    case 'small':
      return `<small style="opacity: 0.7;">${renderNodes(node.children, emojiMap, options)}</small>`;

    case 'center':
      return `<div style="text-align: center;">${renderNodes(node.children, emojiMap, options)}</div>`;

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
          return `<span class="mfm-x2" style="display: inline-block;">${renderNodes(node.children, emojiMap, options)}</span>`;

        case 'x3':
          return `<span class="mfm-x3" style="display: inline-block;">${renderNodes(node.children, emojiMap, options)}</span>`;

        case 'x4':
          return `<span class="mfm-x4" style="display: inline-block;">${renderNodes(node.children, emojiMap, options)}</span>`;

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
          return `<span class="_mfm_blur_ mfm-blur" tabindex="0" title="ホバーまたはタップで表示">${renderNodes(node.children, emojiMap, options)}</span>`;

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
            return `<ruby>${renderNodes(node.children, emojiMap, options)}</ruby>`;
          }
        }
      }

      const classAttr = className ? ` class="${className}"` : '';
      if (style !== undefined) {
        return `<span${classAttr} style="display: inline-block; ${style}">${renderNodes(node.children, emojiMap, options)}</span>`;
      }
      if (className) {
        return `<span${classAttr}>${renderNodes(node.children, emojiMap, options)}</span>`;
      }
      return renderNodes(node.children, emojiMap, options);
    }

    case 'quote':
      return `<blockquote class="mfm-quote">${renderNodes(node.children, emojiMap, options)}</blockquote>`;

    case 'url': {
      const url = escapeHtml(node.props.url);
      return `<a href="${url}" target="_blank" rel="nofollow noopener noreferrer" class="mfm-link">${url}</a>`;
    }

    case 'link': {
      const url = escapeHtml(node.props.url);
      return `<a href="${url}" target="_blank" rel="nofollow noopener noreferrer" class="mfm-link">${renderNodes(node.children, emojiMap, options)}</a>`;
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

    case 'emojiCode': {
      const name = node.props.name;
      return resolveCustomEmojiImg(name, emojiMap, options) ?? `:${escapeHtml(name)}:`;
    }

    case 'unicodeEmoji':
      return `<span class="mfm-unicode-emoji">${escapeHtml(node.props.emoji)}</span>`;

    case 'plain':
      return renderNodes(node.children, emojiMap, options);

    default:
      return '';
  }
}

/**
 * MFM構文を含む文字列をHTML文字列に変換する
 * @param text MFM本文
 * @param emojis ノート固有のカスタム絵文字リストまたはマップ
 * @param options サーバーアドレスやインスタンス絵文字マップなどの補完オプション
 */
export function renderMfm(
  text: string,
  emojis?: EmojiSource | null,
  options?: RenderMfmOptions
): string {
  if (!text) return '';

  const emojiMap = normalizeEmojiMap(emojis);

  try {
    const parsed = mfm.parse(text);
    return renderNodes(parsed, emojiMap, options);
  } catch (err) {
    console.error('MFM parse error:', err);
    return renderInlineEmoji(escapeHtml(text).replace(/\n/g, '<br>'), emojis, options);
  }
}

/**
 * プレーンテキスト（ユーザー名やCWなど）内のカスタム絵文字 (:name:) を <img> に置換する
 */
export function renderInlineEmoji(
  text: string,
  emojis?: EmojiSource | null,
  options?: RenderMfmOptions
): string {
  if (!text) return '';
  const escaped = escapeHtml(text);
  if (!escaped.includes(':')) return escaped;

  const emojiMap = normalizeEmojiMap(emojis);

  return escaped.replace(INLINE_EMOJI_RE, (match, rawName) => {
    return resolveCustomEmojiImg(rawName, emojiMap, options) ?? match;
  });
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
