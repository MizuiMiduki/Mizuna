import { describe, it, expect } from 'vitest';
import { renderMfm, insertMfmTag, escapeHtml } from '../src/utils/mfm';

describe('MFM Parser (renderMfm)', () => {
  it('空文字の場合は空文字を返すこと', () => {
    expect(renderMfm('')).toBe('');
  });

  it('通常のテキストはHTMLエスケープされて返ること', () => {
    expect(renderMfm('Hello <world> & "friends"')).toBe(
      'Hello &lt;world&gt; &amp; &quot;friends&quot;'
    );
  });

  it('改行が <br> に変換されること', () => {
    expect(renderMfm('line 1\nline 2')).toBe('line 1<br>line 2');
  });

  it('エフェクトタグ $[shake ...] が正しくパースされること', () => {
    expect(renderMfm('$[shake こんにちは]')).toBe(
      '<span class="mfm-shake">こんにちは</span>'
    );
    expect(renderMfm('$[shake.speed=0.2s 激しい揺れ]')).toBe(
      '<span class="mfm-shake" style="animation-duration: 0.2s;">激しい揺れ</span>'
    );
  });

  it('エフェクトタグ $[bounce ...] が正しくパースされること', () => {
    expect(renderMfm('$[bounce ぴょんぴょん]')).toBe(
      '<span class="mfm-bounce">ぴょんぴょん</span>'
    );
    expect(renderMfm('$[bounce.speed=1s ゆっくりバウンド]')).toBe(
      '<span class="mfm-bounce" style="animation-duration: 1s;">ゆっくりバウンド</span>'
    );
  });

  it('エフェクトタグ $[rainbow ...] が正しくパースされること', () => {
    expect(renderMfm('$[rainbow 七色]')).toBe(
      '<span class="mfm-rainbow">七色</span>'
    );
  });

  it('エフェクトタグ $[spin ...] とオプション付きが正しくパースされること', () => {
    expect(renderMfm('$[spin 回転]')).toBe(
      '<span class="mfm-spin">回転</span>'
    );
    expect(renderMfm('$[spin.left 逆回転]')).toBe(
      '<span class="mfm-spin mfm-spin-left">逆回転</span>'
    );
  });

  it('エフェクトタグ $[tada ...] が正しくパースされること', () => {
    expect(renderMfm('$[tada おめでとう！]')).toBe(
      '<span class="mfm-tada">おめでとう！</span>'
    );
  });

  it('エフェクトタグ $[blur ...] が正しくパースされること', () => {
    const rendered = renderMfm('$[blur ネタバレ注意]');
    expect(rendered).toContain('class="mfm-blur"');
    expect(rendered).toContain('ネタバレ注意');
  });

  it('文字色 $[fg.color=... ...] が正しくパースされること', () => {
    expect(renderMfm('$[fg.color=ff0000 赤文字]')).toBe(
      '<span class="mfm-fg" style="color: #ff0000;">赤文字</span>'
    );
  });

  it('背景色 $[bg.color=... ...] が正しくパースされること', () => {
    expect(renderMfm('$[bg.color=00ff00 緑背景]')).toBe(
      '<span class="mfm-bg" style="background-color: #00ff00;">緑背景</span>'
    );
  });

  it('拡大縮小 $[scale.x=...,y=... ...] が正しくパースされること', () => {
    const rendered = renderMfm('$[scale.x=1.5,y=2 でかい]');
    expect(rendered).toContain('class="mfm-scale"');
    expect(rendered).toContain('transform: scale(1.5, 2)');
  });

  it('複数行コードブロックが保護されて正しくパースされること', () => {
    const rendered = renderMfm('```typescript\nconst a = "<hello>";\n```');
    expect(rendered).toContain('<pre class="mfm-code-block" data-lang="typescript"><code>const a = &quot;&lt;hello&gt;&quot;;</code></pre>');
  });

  it('ルビ記法 $[ruby ...] が正しくパースされること', () => {
    expect(renderMfm('$[ruby 漢字 かんじ]')).toBe(
      '<ruby>漢字<rt>かんじ</rt></ruby>'
    );
  });

  it('太字、打消、インラインコードが正しくパースされること', () => {
    expect(renderMfm('**太字** と ~~取消~~ と `code()`')).toBe(
      '<strong>太字</strong> と <del>取消</del> と <code class="mfm-inline-code">code()</code>'
    );
  });

  it('URLとハッシュタグとメンションがリンク化されること', () => {
    const rendered = renderMfm('https://example.com #mizuna @user@misskey.io');
    expect(rendered).toContain('<a href="https://example.com"');
    expect(rendered).toContain('<span class="mfm-hashtag">#mizuna</span>');
    expect(rendered).toContain('<span class="mfm-mention">@user@misskey.io</span>');
  });

  it('ネストしたタグが正しく解釈されること', () => {
    const rendered = renderMfm('$[shake $[rainbow ネスト]]');
    expect(rendered).toBe(
      '<span class="mfm-shake"><span class="mfm-rainbow">ネスト</span></span>'
    );
  });
});

describe('insertMfmTag helper', () => {
  it('テキスト選択時に選択範囲をタグで囲むこと', () => {
    const text = 'Hello world';
    // "world" を選択 (start: 6, end: 11)
    const result = insertMfmTag(text, 6, 11, '$[shake ', ']');
    expect(result.newText).toBe('Hello $[shake world]');
    expect(result.newCursorStart).toBe(14);
    expect(result.newCursorEnd).toBe(19);
  });

  it('未選択時にプレースホルダを挿入し、カーソルをプレースホルダに合わせること', () => {
    const text = 'Hello ';
    const result = insertMfmTag(text, 6, 6, '$[bounce ', ']', 'text');
    expect(result.newText).toBe('Hello $[bounce text]');
    expect(result.newCursorStart).toBe(15);
    expect(result.newCursorEnd).toBe(19);
  });
});
