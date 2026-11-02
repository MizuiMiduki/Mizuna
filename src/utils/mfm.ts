/**
 * Mizuna MFM (Misskey Flavored Markdown) Parser & Insertion Utilities
 */

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

/**
 * 16進数カラーコード（3桁または6桁）を安全にパースして '#' 付き文字列にする
 */
function sanitizeColor(raw: string): string | null {
  const clean = raw.replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(clean) || /^[0-9a-fA-F]{6}$/.test(clean)) {
    return `#${clean}`;
  }
  return null;
}

/**
 * MFM構文を含む文字列をHTML文字列に変換する
 */
export function renderMfm(text: string): string {
  if (!text) return '';

  // 1. コードブロック/インラインコードの退避
  const codeBlocks: string[] = [];
  let processed = text.replace(/```(?:([a-zA-Z0-9_-]+)?\n)?([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length;
    const langAttr = lang ? ` data-lang="${escapeHtml(lang)}"` : '';
    codeBlocks.push(
      `<pre class="mfm-code-block"${langAttr}><code>${escapeHtml(code.trim())}</code></pre>`
    );
    return `__MIZUNA_CODE_BLOCK_${idx}__`;
  });

  const inlineCodes: string[] = [];
  processed = processed.replace(/`([^`\n]+)`/g, (_, code) => {
    const idx = inlineCodes.length;
    inlineCodes.push(`<code class="mfm-inline-code">${escapeHtml(code)}</code>`);
    return `__MIZUNA_INLINE_CODE_${idx}__`;
  });

  // 2. HTMLエスケープ（タグインジェクション対策）
  processed = escapeHtml(processed);

  // 3. ルビ記法: $[ruby 漢字 かんじ]
  processed = processed.replace(
    /\$\[ruby\s+([^\s\]]+)\s+([^\s\]]+)\]/g,
    '<ruby>$1<rt>$2</rt></ruby>'
  );

  // 4. MFM エフェクトタグ（ネスト対応のため内側から最大8回置換）
  // $[shake ...], $[bounce ...], $[spin ...], $[rainbow ...], $[tada ...], $[blur ...], $[flip ...], $[fg.color=... ...], $[bg.color=... ...]
  for (let depth = 0; depth < 8; depth++) {
    const beforeLoop = processed;

    // $[shake <content>]
    processed = processed.replace(
      /\$\[shake\s+((?:(?!(\$\[|\])).)+)\]/g,
      '<span class="mfm-shake">$1</span>'
    );

    // $[bounce <content>]
    processed = processed.replace(
      /\$\[bounce\s+((?:(?!(\$\[|\])).)+)\]/g,
      '<span class="mfm-bounce">$1</span>'
    );

    // $[spin <content>] / $[spin.left ...], $[spin.x ...], $[spin.y ...]
    processed = processed.replace(
      /\$\[spin(?:\.([a-zA-Z0-9_-]+))?\s+((?:(?!(\$\[|\])).)+)\]/g,
      (_, opt, content) => {
        const cls = opt ? `mfm-spin mfm-spin-${opt}` : 'mfm-spin';
        return `<span class="${cls}">${content}</span>`;
      }
    );

    // $[rainbow <content>]
    processed = processed.replace(
      /\$\[rainbow\s+((?:(?!(\$\[|\])).)+)\]/g,
      '<span class="mfm-rainbow">$1</span>'
    );

    // $[tada <content>]
    processed = processed.replace(
      /\$\[tada\s+((?:(?!(\$\[|\])).)+)\]/g,
      '<span class="mfm-tada">$1</span>'
    );

    // $[blur <content>]
    processed = processed.replace(
      /\$\[blur\s+((?:(?!(\$\[|\])).)+)\]/g,
      '<span class="mfm-blur" tabindex="0" title="タップまたはホバーで表示">$1</span>'
    );

    // $[flip <content>]
    processed = processed.replace(
      /\$\[flip(?:\.([a-zA-Z0-9_-]+))?\s+((?:(?!(\$\[|\])).)+)\]/g,
      (_, opt, content) => {
        const cls = opt === 'v' ? 'mfm-flip-v' : 'mfm-flip';
        return `<span class="${cls}">${content}</span>`;
      }
    );

    // $[fg.color=<hex> <content>]
    processed = processed.replace(
      /\$\[fg\.color=([a-zA-Z0-9#]+)\s+((?:(?!(\$\[|\])).)+)\]/g,
      (_, colorRaw, content) => {
        const safeColor = sanitizeColor(colorRaw);
        return safeColor
          ? `<span class="mfm-fg" style="color: ${safeColor};">${content}</span>`
          : content;
      }
    );

    // $[bg.color=<hex> <content>]
    processed = processed.replace(
      /\$\[bg\.color=([a-zA-Z0-9#]+)\s+((?:(?!(\$\[|\])).)+)\]/g,
      (_, colorRaw, content) => {
        const safeColor = sanitizeColor(colorRaw);
        return safeColor
          ? `<span class="mfm-bg" style="background-color: ${safeColor};">${content}</span>`
          : content;
      }
    );

    // $[font.serif <content>], $[font.monospace <content>]
    processed = processed.replace(
      /\$\[font\.(serif|monospace)\s+((?:(?!(\$\[|\])).)+)\]/g,
      (_, font, content) => `<span style="font-family: ${font};">${content}</span>`
    );

    // $[scale.x=...,y=... <content>]
    processed = processed.replace(
      /\$\[scale(?:\.x=([0-9.]+))?(?:,y=([0-9.]+))?\s+((?:(?!(\$\[|\])).)+)\]/g,
      (_, sx, sy, content) => {
        const scaleX = sx ? Math.min(5, Math.max(0.1, parseFloat(sx))) : 1;
        const scaleY = sy ? Math.min(5, Math.max(0.1, parseFloat(sy))) : 1;
        return `<span class="mfm-scale" style="display:inline-block; transform: scale(${scaleX}, ${scaleY});">${content}</span>`;
      }
    );

    if (processed === beforeLoop) break;
  }

  // 5. マークダウン構文
  // 太字: **text**
  processed = processed.replace(/\*\*([^\*\n]+?)\*\*/g, '<strong>$1</strong>');

  // 取消線: ~~text~~
  processed = processed.replace(/~~([^~\n]+?)~~/g, '<del>$1</del>');

  // 斜体: *text* (エスケープやタグに配慮)
  processed = processed.replace(/(^|[^\*])\*([^\*\n]+?)\*([^\*]|$)/g, '$1<em>$2</em>$3');

  // 引用: 行頭 > text
  processed = processed.replace(/(?:^|\n)&gt;\s?([^\n]+)/g, '<blockquote class="mfm-quote">$1</blockquote>');

  // 6. URL 自動リンク (http:// / https://)
  processed = processed.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="mfm-link">$1</a>'
  );

  // 7. メンション: @user または @user@instance.example
  processed = processed.replace(
    /(^|\s)(@[a-zA-Z0-9_.-]+(?:@[a-zA-Z0-9_.-]+)?)/g,
    '$1<span class="mfm-mention">$2</span>'
  );

  // 8. ハッシュタグ: #tag (HTMLタグの外側のみを対象にする)
  // HTMLタグで区切ってテキスト部分にのみハッシュタグ置換を適用
  const htmlParts = processed.split(/(<[^>]+>)/g);
  for (let i = 0; i < htmlParts.length; i++) {
    // 奇数インデックスはHTMLタグ (<...>)
    if (!htmlParts[i].startsWith('<')) {
      htmlParts[i] = htmlParts[i].replace(
        /(^|[\s　])(#([^\s#<.,!?:;）)]+))/g,
        '$1<span class="mfm-hashtag">#$3</span>'
      );
    }
  }
  processed = htmlParts.join('');

  // 9. 改行の変換
  processed = processed.replace(/\n/g, '<br>');

  // 10. 退避したコードブロックの復元
  for (let i = 0; i < inlineCodes.length; i++) {
    processed = processed.replace(`__MIZUNA_INLINE_CODE_${i}__`, inlineCodes[i]);
  }
  for (let i = 0; i < codeBlocks.length; i++) {
    processed = processed.replace(`__MIZUNA_CODE_BLOCK_${i}__`, codeBlocks[i]);
  }

  return processed;
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
