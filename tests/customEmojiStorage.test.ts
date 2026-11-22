import { describe, it, expect, beforeEach } from 'vitest';
import { safeLocalStorage } from '../src/utils/storage';
import {
  getRecentEmojis,
  addRecentEmoji,
  getPinnedEmojis,
  togglePinnedEmoji,
  clearRecentEmojis,
} from '../src/utils/customEmojiStorage';

describe('customEmojiStorage', () => {
  const address = 'test.misskey.io';

  beforeEach(() => {
    safeLocalStorage.clear();
  });

  it('最近使った絵文字の追加・取得・重複排除ができること', () => {
    expect(getRecentEmojis(address)).toEqual([]);

    addRecentEmoji(address, 'emoji_a');
    expect(getRecentEmojis(address)).toEqual(['emoji_a']);

    addRecentEmoji(address, 'emoji_b');
    expect(getRecentEmojis(address)).toEqual(['emoji_b', 'emoji_a']);

    // 同じ絵文字を追加した場合は先頭に移動
    addRecentEmoji(address, 'emoji_a');
    expect(getRecentEmojis(address)).toEqual(['emoji_a', 'emoji_b']);

    clearRecentEmojis(address);
    expect(getRecentEmojis(address)).toEqual([]);
  });

  it('絵文字のピン留め（固定）と解除ができること', () => {
    expect(getPinnedEmojis(address)).toEqual([]);

    const res1 = togglePinnedEmoji(address, 'pin_1');
    expect(res1.isPinned).toBe(true);
    expect(res1.list).toEqual(['pin_1']);
    expect(getPinnedEmojis(address)).toEqual(['pin_1']);

    const res2 = togglePinnedEmoji(address, 'pin_2');
    expect(res2.isPinned).toBe(true);
    expect(res2.list).toEqual(['pin_2', 'pin_1']);

    // 再度 toggle でピン留め解除
    const res3 = togglePinnedEmoji(address, 'pin_1');
    expect(res3.isPinned).toBe(false);
    expect(res3.list).toEqual(['pin_2']);
    expect(getPinnedEmojis(address)).toEqual(['pin_2']);
  });
});
