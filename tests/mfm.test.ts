import { describe, it, expect } from 'vitest';
import { renderMfm, renderInlineEmoji, insertMfmTag, escapeHtml } from '../src/utils/mfm';

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
    const rendered = renderMfm('$[shake こんにちは]');
    expect(rendered).toContain('class="mfm-shake"');
    expect(rendered).toContain('animation: mfm-shake 0.5s ease infinite;');
    expect(rendered).toContain('こんにちは');

    const customSpeed = renderMfm('$[shake.speed=0.2s 激しい揺れ]');
    expect(customSpeed).toContain('animation: mfm-shake 0.2s ease infinite;');
  });

  it('エフェクトタグ $[bounce ...] が正しくパースされること', () => {
    const rendered = renderMfm('$[bounce ぴょんぴょん]');
    expect(rendered).toContain('class="mfm-bounce"');
    expect(rendered).toContain('animation: mfm-bounce 0.75s linear infinite;');
    expect(rendered).toContain('transform-origin: center bottom;');
    expect(rendered).toContain('ぴょんぴょん');

    const customSpeed = renderMfm('$[bounce.speed=1s ゆっくりバウンド]');
    expect(customSpeed).toContain('animation: mfm-bounce 1s linear infinite;');
  });

  it('エフェクトタグ $[rainbow ...] が正しくパースされること', () => {
    const rendered = renderMfm('$[rainbow 七色]');
    expect(rendered).toContain('class="mfm-rainbow"');
    expect(rendered).toContain('animation: mfm-rainbow 1s linear infinite;');
    expect(rendered).toContain('七色');
  });

  it('エフェクトタグ $[spin ...] とオプション付きが正しくパースされること', () => {
    const rendered = renderMfm('$[spin 回転]');
    expect(rendered).toContain('class="mfm-spin"');
    expect(rendered).toContain('animation: mfm-spin 1.5s linear infinite;');

    const left = renderMfm('$[spin.left 逆回転]');
    expect(left).toContain('class="mfm-spin mfm-spin-left"');
    expect(left).toContain('animation-direction: reverse;');
  });

  it('エフェクトタグ $[tada ...] が正しくパースされること', () => {
    const rendered = renderMfm('$[tada おめでとう！]');
    expect(rendered).toContain('class="mfm-tada"');
    expect(rendered).toContain('animation: global-tada 1s linear infinite both;');
    expect(rendered).toContain('font-size: 150%;');
  });

  it('エフェクトタグ $[blur ...] が正しくパースされること', () => {
    const rendered = renderMfm('$[blur ネタバレ注意]');
    expect(rendered).toContain('class="_mfm_blur_ mfm-blur"');
    expect(rendered).toContain('ネタバレ注意');
  });

  it('文字色 $[fg.color=... ...] が正しくパースされること', () => {
    const rendered = renderMfm('$[fg.color=ff0000 赤文字]');
    expect(rendered).toContain('class="mfm-fg"');
    expect(rendered).toContain('color: #ff0000;');
    expect(rendered).toContain('赤文字');
  });

  it('背景色 $[bg.color=... ...] が正しくパースされること', () => {
    const rendered = renderMfm('$[bg.color=00ff00 緑背景]');
    expect(rendered).toContain('class="mfm-bg"');
    expect(rendered).toContain('background-color: #00ff00;');
    expect(rendered).toContain('緑背景');
  });

  it('拡大縮小 $[scale.x=...,y=... ...] が正しくパースされること', () => {
    const rendered = renderMfm('$[scale.x=1.5,y=2 でかい]');
    expect(rendered).toContain('class="mfm-scale"');
    expect(rendered).toContain('transform: scale(1.5, 2);');
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
    expect(rendered).toContain('class="mfm-shake"');
    expect(rendered).toContain('class="mfm-rainbow"');
    expect(rendered).toContain('ネスト');
  });

  it('カスタム絵文字が渡された場合、<img> タグに変換されること', () => {
    const emojis = [
      { name: 'blobcat', url: 'https://example.com/blobcat.webp' },
      { name: 'verified', url: 'https://example.com/verified.png' },
    ];
    const rendered = renderMfm('こんにちは :blobcat: さん :verified:', emojis);
    expect(rendered).toContain('<img class="mfm-custom-emoji"');
    expect(rendered).toContain('src="https://example.com/blobcat.webp"');
    expect(rendered).toContain('src="https://example.com/verified.png"');
    expect(rendered).toContain('alt=":blobcat:"');

    // マップにない絵文字はそのままテキストで返ること
    const notFound = renderMfm('謎の絵文字 :unknown_emoji:', emojis);
    expect(notFound).toContain(':unknown_emoji:');
    expect(notFound).not.toContain('src=');
  });

  it('自サーバーアドレスが指定されている場合、note.emojisにないローカル絵文字もサーバーURLにフォールバックして<img>タグ化されること', () => {
    const rendered = renderMfm('自サーバーの :ai_yoshio: テスト', null, {
      serverAddress: 'misskey.io',
    });
    expect(rendered).toContain('<img class="mfm-custom-emoji"');
    expect(rendered).toContain('src="https://misskey.io/emoji/ai_yoshio.webp"');
    expect(rendered).toContain('alt=":ai_yoshio:"');
  });

  it('serverEmojiMap が指定されている場合、そこからURLが解決されること', () => {
    const serverMap = new Map([['custom_cat', 'https://example.com/custom_cat.png']]);
    const rendered = renderMfm(':custom_cat:', null, { serverEmojiMap: serverMap });
    expect(rendered).toContain('src="https://example.com/custom_cat.png"');
  });

  it('renderInlineEmoji でインラインのカスタム絵文字が <img> タグに変換されること', () => {
    const emojis = {
      blobcat: 'https://example.com/blobcat.webp',
    };
    const rendered = renderInlineEmoji('ユーザー名 :blobcat:', emojis);
    expect(rendered).toContain('<img class="mfm-custom-emoji"');
    expect(rendered).toContain('src="https://example.com/blobcat.webp"');
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
