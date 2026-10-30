/**
 * Mizuna ユーザーカスタムCSS サニタイザー & 適用ユーティリティ
 * 
 * セキュリティ対策 (CSS Injection / Exfiltration / XSS 防止):
 * 1. `<style>` 脱出 (Context Escape):
 *    - DOM への適用時は `textContent` を用い、HTML パースを行わない。
 *    - `</style>` や `<script` 等の HTML タグ構文を無害化。
 * 2. CSS Exfiltration (外部へのデータ・トークン漏洩防止):
 *    - `@import` ルールを完全にブロック・除去。
 *    - `url(...)` 内の外部通信 (http:, https:, //, ftp:) を完全にブロック。
 *    - 安全なラスター画像 (data:image/(png|jpeg|webp|gif);base64,...) のみ許可 (SVG 等のスクリプト埋め込み可能形式は除外)。
 * 3. スクリプト実行プロパティの無力化:
 *    - `expression(...)`, `javascript:`, `vbscript:`, `-moz-binding`, `behavior` などをブロック。
 * 4. コメントや Unicode エスケープによる難読化・検閲回避への対策:
 *    - コメント除去・Unicode エスケープ解除による正規化チェックを実施。
 * 5. DoS (巨大入力) 防止:
 *    - 最大文字数制限 (64KB)
 */

export const MAX_CUSTOM_CSS_LENGTH = 65536;
export const CUSTOM_CSS_STYLE_ID = 'mizuna-user-custom-css';

export interface SanitizeResult {
  sanitizedCss: string;
  warnings: string[];
}

/**
 * CSS 文字列内の Unicode エスケープ (例: `\6a avascript` -> `javascript`) を解決した文字列を返す
 */
function decodeCssEscapes(css: string): string {
  return css.replace(/\\([0-9a-fA-F]{1,6})\s?|\\(.)/g, (_, hex, char) => {
    if (hex) {
      try {
        const codePoint = parseInt(hex, 16);
        return String.fromCodePoint(codePoint);
      } catch {
        return '';
      }
    }
    return char || '';
  });
}

/**
 * CSS コメントを除去した文字列を返す
 */
function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * 許可された安全な data: URI かどうかを判定する
 * ラスター画像 (png, jpeg, webp, gif) の base64 のみ許可
 */
function isSafeDataUri(url: string): boolean {
  const clean = url.trim().replace(/^['"]|['"]$/g, '');
  return /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(clean);
}

/**
 * ユーザー入力のカスタムCSSをサニタイズし、危険な構文を無害化する
 */
export function sanitizeCustomCss(rawCss: string | null | undefined): SanitizeResult {
  const warnings: string[] = [];

  if (!rawCss || typeof rawCss !== 'string') {
    return { sanitizedCss: '', warnings: [] };
  }

  let css = rawCss;

  // 1. 最大文字数制限 (DoS / ブラウザフリーズ防止)
  if (css.length > MAX_CUSTOM_CSS_LENGTH) {
    css = css.slice(0, MAX_CUSTOM_CSS_LENGTH);
    warnings.push(`カスタムCSSが最大許容量 (${MAX_CUSTOM_CSS_LENGTH}文字) を超えたため切り詰められました。`);
  }

  // 2. HTML タグ閉じ・脱出シーケンスの無害化 (Context Escape 防止)
  // `</style>` や `<script>`, `<!--` など
  if (/<\s*\/?\s*(?:style|script|html|body|iframe|svg)[\s\S]*?>/i.test(css) || /<\s*[\/!a-zA-Z]/i.test(css)) {
    const original = css;
    css = css.replace(/<\s*\/?\s*style[^>]*>/gi, '/* [blocked </style>] */');
    css = css.replace(/<\s*\/?\s*script[^>]*>/gi, '/* [blocked <script>] */');
    css = css.replace(/<!--[\s\S]*?-->/g, '/* [blocked comment] */');
    // その他のタグ風の `<` もエスケープ
    css = css.replace(/<(?=[a-zA-Z\/!])/g, '\\3C ');
    if (original !== css) {
      warnings.push('HTMLタグおよびタグ脱出シーケンスが無害化されました。');
    }
  }

  // 3. @import の完全ブロック (外部CSS読み込みによる回避・漏洩防止)
  // コメントやエスケープ混入 `@/*foo*/import` や `@\69 mport` にも対応
  const importRegex = /@(?:\\0*69|i)[\s\S]*?(?:\\0*74|t)[^;{}]*(?:;|\})/gi;
  const simpleImportRegex = /@import\b[^;{}]*(?:;|\})/gi;
  if (importRegex.test(css) || simpleImportRegex.test(css)) {
    css = css.replace(importRegex, '/* [blocked external import] */');
    css = css.replace(simpleImportRegex, '/* [blocked external import] */');
    warnings.push('セキュリティ保護のため、@import による外部CSSの読み込みは禁止されています。');
  }

  // 4. スクリプト実行・危険なレガシープロパティの無力化
  // expression(...), javascript:, vbscript:, -moz-binding, behavior
  const dangerousPatterns: Array<{ regex: RegExp; name: string; replacement: string }> = [
    { regex: /expression\s*\([^)]*\)/gi, name: 'CSS expression', replacement: '/* [blocked dynamic expression] */' },
    { regex: /javascript\s*:/gi, name: 'javascript: スキーム', replacement: '/* [blocked script scheme] */' },
    { regex: /vbscript\s*:/gi, name: 'vbscript: スキーム', replacement: '/* [blocked script scheme] */' },
    { regex: /-moz-binding\s*:[^;}]*/gi, name: '-moz-binding', replacement: '/* [blocked xml binding] */' },
    { regex: /behavior\s*:[^;}]*/gi, name: 'behavior', replacement: '/* [blocked ie behavior] */' },
  ];

  for (const { regex, name, replacement } of dangerousPatterns) {
    if (regex.test(css)) {
      css = css.replace(regex, replacement);
      warnings.push(`危険な構文 (${name}) が検出され、無効化されました。`);
    }
  }

  // 5. url(...) の検査と外部URL遮断 (CSS Exfiltration / データ漏洩防止)
  // url("http://..."), url('//evil.com'), url(https://...) 等
  const urlRegex = /url\s*\(\s*(['"]?)([\s\S]*?)\1\s*\)/gi;
  css = css.replace(urlRegex, (match, _quote, rawUrl) => {
    const trimmedUrl = String(rawUrl || '').trim();
    if (!trimmedUrl) {
      return match;
    }

    // デコードとコメント除去して検査
    const normalizedUrl = decodeCssEscapes(stripCssComments(trimmedUrl));

    // 安全な data:image base64 のラスター画像なら許可
    if (isSafeDataUri(normalizedUrl)) {
      return match;
    }

    // 外部URL (http:, https:, //, ftp:) や未知のスキームはすべてブロック
    warnings.push(`外部URLへの参照 (${normalizedUrl.slice(0, 32)}...) はデータ漏洩防止のため無効化されました。`);
    return '/* [blocked url] */';
  });

  // 6. image-set() 等の代替関数も同様に外部URLを遮断
  const imageSetRegex = /(?:-webkit-)?image-set\s*\([^)]*\)/gi;
  css = css.replace(imageSetRegex, (match) => {
    const normalized = decodeCssEscapes(stripCssComments(match));
    if (/https?:|\/\/|ftp:|data:/i.test(normalized)) {
      if (!isSafeDataUri(normalized)) {
        warnings.push('image-set 内の外部リソース参照が無効化されました。');
        return '/* [blocked image-set] */';
      }
    }
    return match;
  });

  // 7. セカンドパス正規化検証 (難読化・エスケープをすり抜けた攻撃の検出)
  const normalizedForCheck = decodeCssEscapes(stripCssComments(css));
  if (
    /@import\b/i.test(normalizedForCheck) ||
    /expression\s*\(/i.test(normalizedForCheck) ||
    /javascript\s*:/i.test(normalizedForCheck) ||
    /<\s*\/?\s*style/i.test(normalizedForCheck) ||
    /url\s*\(\s*['"]?\s*(?:https?:|\/\/|ftp:)/i.test(normalizedForCheck)
  ) {
    // 難読化によって残存した危険構文がある場合は全体を無力化
    warnings.push('難読化された危険な構文が検出されたため、追加の無効化処理が行われました。');
    css = css
      .replace(/@\S+/gi, '/* [blocked] */')
      .replace(/url\([^)]*\)/gi, '/* [blocked url] */')
      .replace(/expression\([^)]*\)/gi, '/* [blocked expression] */');
  }

  return {
    sanitizedCss: css,
    warnings: Array.from(new Set(warnings)),
  };
}

/**
 * サニタイズしたカスタムCSSをDOM (head内のstyle要素) に安全に適用する
 */
export function applyCustomCss(rawCss: string | null | undefined): SanitizeResult {
  const result = sanitizeCustomCss(rawCss);

  if (typeof document === 'undefined') {
    return result;
  }

  try {
    let styleEl = document.getElementById(CUSTOM_CSS_STYLE_ID) as HTMLStyleElement | null;

    if (!result.sanitizedCss.trim()) {
      if (styleEl) {
        styleEl.textContent = '';
      }
      return result;
    }

    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = CUSTOM_CSS_STYLE_ID;
      styleEl.setAttribute('type', 'text/css');
      styleEl.setAttribute('data-source', 'mizuna-user-custom-css');
      document.head.appendChild(styleEl);
    }

    // 必ず textContent を使用し、HTMLパーサーを一切介さずにスタイルを設定
    styleEl.textContent = result.sanitizedCss;
  } catch (e) {
    console.error('カスタムCSSの適用に失敗しました:', e);
  }

  return result;
}

/**
 * 適用済みのカスタムCSSをクリアする
 */
export function clearCustomCss(): void {
  if (typeof document === 'undefined') return;
  const styleEl = document.getElementById(CUSTOM_CSS_STYLE_ID);
  if (styleEl) {
    styleEl.textContent = '';
  }
}
