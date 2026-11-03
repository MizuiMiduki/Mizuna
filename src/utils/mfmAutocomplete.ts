export interface MfmSuggestion {
  key: string;
  prefix: string;
  suffix: string;
  placeholder?: string;
  label: string;
  desc: string;
  icon: string;
}

export const MFM_SUGGESTIONS: MfmSuggestion[] = [
  { key: 'shake', prefix: '$[shake ', suffix: ']', placeholder: 'テキスト', label: 'shake', desc: '揺らす', icon: 'vibration' },
  { key: 'bounce', prefix: '$[bounce ', suffix: ']', placeholder: 'テキスト', label: 'bounce', desc: '跳ねる', icon: 'sports_baseball' },
  { key: 'spin', prefix: '$[spin ', suffix: ']', placeholder: 'テキスト', label: 'spin', desc: '回転', icon: 'rotate_right' },
  { key: 'rainbow', prefix: '$[rainbow ', suffix: ']', placeholder: 'テキスト', label: 'rainbow', desc: '虹色', icon: 'palette' },
  { key: 'tada', prefix: '$[tada ', suffix: ']', placeholder: 'テキスト', label: 'tada', desc: '祝砲', icon: 'celebration' },
  { key: 'jelly', prefix: '$[jelly ', suffix: ']', placeholder: 'テキスト', label: 'jelly', desc: 'ゼリーのように揺れる', icon: 'waves' },
  { key: 'twitch', prefix: '$[twitch ', suffix: ']', placeholder: 'テキスト', label: 'twitch', desc: 'ピクピク痙攣', icon: 'bolt' },
  { key: 'jump', prefix: '$[jump ', suffix: ']', placeholder: 'テキスト', label: 'jump', desc: '飛び跳ねる', icon: 'arrow_upward' },
  { key: 'flip', prefix: '$[flip ', suffix: ']', placeholder: 'テキスト', label: 'flip', desc: '反転', icon: 'flip' },
  { key: 'blur', prefix: '$[blur ', suffix: ']', placeholder: 'テキスト', label: 'blur', desc: 'ぼかし', icon: 'blur_on' },
  { key: 'x2', prefix: '$[x2 ', suffix: ']', placeholder: 'テキスト', label: 'x2', desc: '200%拡大', icon: 'format_size' },
  { key: 'x3', prefix: '$[x3 ', suffix: ']', placeholder: 'テキスト', label: 'x3', desc: '300%拡大', icon: 'format_size' },
  { key: 'x4', prefix: '$[x4 ', suffix: ']', placeholder: 'テキスト', label: 'x4', desc: '400%拡大', icon: 'format_size' },
  { key: 'ruby', prefix: '$[ruby ', suffix: ' かんじ]', placeholder: '漢字', label: 'ruby', desc: 'ルビ振り', icon: 'translate' },
  { key: 'fg.color', prefix: '$[fg.color=ff0000 ', suffix: ']', placeholder: 'テキスト', label: 'fg.color', desc: '文字色', icon: 'format_color_text' },
  { key: 'bg.color', prefix: '$[bg.color=ffff00 ', suffix: ']', placeholder: 'テキスト', label: 'bg.color', desc: '背景色', icon: 'format_color_fill' },
  { key: 'border', prefix: '$[border.color=ff0000 ', suffix: ']', placeholder: 'テキスト', label: 'border', desc: '枠線で囲む', icon: 'crop_square' },
  { key: 'rotate', prefix: '$[rotate.deg=90 ', suffix: ']', placeholder: 'テキスト', label: 'rotate', desc: '角度回転', icon: 'refresh' },
  { key: 'position', prefix: '$[position.x=0,y=0 ', suffix: ']', placeholder: 'テキスト', label: 'position', desc: '位置ズレ', icon: 'open_with' },
  { key: 'scale', prefix: '$[scale.x=1,y=1 ', suffix: ']', placeholder: 'テキスト', label: 'scale', desc: '拡大縮小', icon: 'zoom_in' },
  { key: 'font.serif', prefix: '$[font.serif ', suffix: ']', placeholder: 'テキスト', label: 'font.serif', desc: '明朝体フォント', icon: 'font_download' },
  { key: 'font.monospace', prefix: '$[font.monospace ', suffix: ']', placeholder: 'テキスト', label: 'font.monospace', desc: '等幅フォント', icon: 'code' },
  { key: 'font.cursive', prefix: '$[font.cursive ', suffix: ']', placeholder: 'テキスト', label: 'font.cursive', desc: '筆記体フォント', icon: 'draw' },
  { key: 'font.fantasy', prefix: '$[font.fantasy ', suffix: ']', placeholder: 'テキスト', label: 'font.fantasy', desc: '装飾フォント', icon: 'auto_fix_high' },
];

/**
 * カーソル位置直前のテキストからMFMトリガー（$ または $[）とクエリを検出する
 */
export function getMfmTriggerInfo(text: string, cursorPosition: number): {
  active: boolean;
  query: string;
  startPos: number;
} {
  if (cursorPosition < 0 || cursorPosition > text.length) {
    return { active: false, query: '', startPos: -1 };
  }

  const textBefore = text.slice(0, cursorPosition);
  // 直近の $[ または $ の位置を探索
  const match = textBefore.match(/(?:\$\[|\$)([a-zA-Z0-9._-]*)$/);
  if (!match) {
    return { active: false, query: '', startPos: -1 };
  }

  const query = match[1];
  const startPos = cursorPosition - match[0].length;
  return {
    active: true,
    query,
    startPos,
  };
}

/**
 * クエリに基づいて候補リストをフィルタリングする
 */
export function filterMfmSuggestions(query: string): MfmSuggestion[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return MFM_SUGGESTIONS;
  return MFM_SUGGESTIONS.filter(
    (s) =>
      s.key.toLowerCase().includes(clean) ||
      s.label.toLowerCase().includes(clean) ||
      s.desc.toLowerCase().includes(clean)
  );
}

/**
 * 候補を選択して本文に置換挿入する
 */
export function applyMfmSuggestion(
  text: string,
  startPos: number,
  cursorPosition: number,
  suggestion: MfmSuggestion
): {
  newText: string;
  newCursorPos: number;
} {
  const before = text.slice(0, startPos);
  const after = text.slice(cursorPosition);
  const placeholder = suggestion.placeholder ?? '';
  const inserted = `${suggestion.prefix}${placeholder}${suggestion.suffix}`;
  const newText = before + inserted + after;
  const newCursorPos = before.length + suggestion.prefix.length + placeholder.length;
  return {
    newText,
    newCursorPos,
  };
}
