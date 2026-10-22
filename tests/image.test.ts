import { describe, it, expect } from 'vitest';
import {
  generateRandomFileName,
  normalizeMisskeyAvatarUrl,
  getDisplayAvatarUrl,
  compressAndConvertToWebP,
} from '../src/utils/image';

describe('image utilities', () => {
  describe('generateRandomFileName', () => {
    it('.webp 拡張子のファイル名を生成すること', () => {
      const name = generateRandomFileName();
      expect(name).toMatch(/\.webp$/);
      expect(name.length).toBeGreaterThan(5);
    });

    it('連続して呼び出した際に重複しないユニークな名前を生成すること', () => {
      const name1 = generateRandomFileName();
      const name2 = generateRandomFileName();
      expect(name1).not.toBe(name2);
    });
  });

  describe('normalizeMisskeyAvatarUrl', () => {
    it('media.misskeyusercontent.jp/io/ のスラッシュを %2F にエンコード置換すること', () => {
      const raw = 'https://media.misskeyusercontent.jp/io/avatar_123.png';
      const normalized = normalizeMisskeyAvatarUrl(raw);
      expect(normalized).toBe('https://media.misskeyusercontent.jp%2Fio%2Favatar_123.png');
    });

    it('通常のURLは変更せずそのまま返すこと', () => {
      const normal = 'https://example.com/files/avatar.jpg';
      expect(normalizeMisskeyAvatarUrl(normal)).toBe(normal);
    });
  });

  describe('getDisplayAvatarUrl', () => {
    it('isVisibleIcon が false の場合は /icon.png を返すこと', () => {
      expect(getDisplayAvatarUrl('https://example.com/my-icon.png', false)).toBe('/icon.png');
    });

    it('avatarUrl が未定義または空文字の場合は /icon.png を返すこと', () => {
      expect(getDisplayAvatarUrl(undefined, true)).toBe('/icon.png');
      expect(getDisplayAvatarUrl('', true)).toBe('/icon.png');
    });

    it('isVisibleIcon が true かつ avatarUrl が存在する場合は元のURLを返すこと', () => {
      const url = 'https://example.com/user_avatar.webp';
      expect(getDisplayAvatarUrl(url, true)).toBe(url);
    });
  });

  describe('compressAndConvertToWebP', () => {
    it('画像をWebP形式のFileオブジェクトに変換すること', async () => {
      const fakeBlob = new Blob(['sample-image-bytes'], { type: 'image/png' });
      const testFile = new File([fakeBlob], 'sample.png', { type: 'image/png' });

      const webpFile = await compressAndConvertToWebP(testFile, 0.8);
      expect(webpFile).toBeInstanceOf(File);
      expect(webpFile.type).toBe('image/webp');
      expect(webpFile.name).toMatch(/\.webp$/);
    });
  });
});
