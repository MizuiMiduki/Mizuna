/**
 * ランダムなファイル名を生成する (.webp固定)
 */
export function generateRandomFileName(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return `${window.crypto.randomUUID()}.webp`;
  }
  return `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.webp`;
}

/**
 * 画像をWebPに変換・圧縮する（ハードウェアデコード & 省メモリ対応）
 * @param file 圧縮元のFileオブジェクト
 * @param quality 圧縮品質 (0.0 ～ 1.0)
 */
export async function compressAndConvertToWebP(file: File, quality = 0.75): Promise<File> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas 2d context');
  }

  try {
    // 1. createImageBitmap が利用可能な環境では Base64 変換を介さずオフスレッドで直接デコード（省電力・省メモリ）
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file);
      try {
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        ctx.drawImage(bitmap, 0, 0);
      } finally {
        bitmap.close();
      }
    } else {
      // 2. フォールバック: FileReader(Base64) ではなく ObjectURL を使用してメモリ消費を抑える
      const objectUrl = URL.createObjectURL(file);
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.decoding = 'async';
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error('Image load error'));
          el.src = objectUrl;
        });
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Canvas to Blob conversion failed'));
        },
        'image/webp',
        quality
      );
    });

    const randomName = generateRandomFileName();
    return new File([blob], randomName, { type: 'image/webp' });
  } finally {
    // GPUテクスチャ・メモリを即座に解放
    canvas.width = 0;
    canvas.height = 0;
  }
}

/**
 * Misskeyの一部のメディアプロキシURL (media.misskeyusercontent.jp/io/ 等) のエンコード補正を行う
 */
export function normalizeMisskeyAvatarUrl(avatarUrl: string): string {
  if (avatarUrl.includes('media.misskeyusercontent.jp/io/')) {
    return avatarUrl.replace(
      'media.misskeyusercontent.jp/io/',
      'media.misskeyusercontent.jp%2Fio%2F'
    );
  }
  return avatarUrl;
}

/**
 * アイコン画像のURLを返す（非表示設定時は /icon.png）
 */
export function getDisplayAvatarUrl(avatarUrl: string | undefined, isVisibleIcon: boolean): string {
  if (!isVisibleIcon || !avatarUrl) {
    return '/icon.png';
  }
  return avatarUrl;
}

/**
 * 添付プレビュー用の縮小サムネイルを生成し、ObjectURLを返す。
 * 原寸の画像を<img>に直接表示するとデコード済みビットマップ(例: 12MPで約48MB)が
 * 保持され続けるため、一覧表示には縮小版を使ってメモリ使用量を抑える。
 * 生成できない環境では null を返す（呼び出し側で原寸にフォールバック）。
 */
export async function createThumbnailUrl(file: File, width = 480): Promise<string | null> {
  if (typeof createImageBitmap !== 'function') return null;
  try {
    const bitmap = await createImageBitmap(file, { resizeWidth: width, resizeQuality: 'medium' });
    const canvas = document.createElement('canvas');
    try {
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(bitmap, 0, 0);
    } finally {
      bitmap.close();
    }
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/webp', 0.8)
    );
    canvas.width = 0;
    canvas.height = 0;
    return blob ? URL.createObjectURL(blob) : null;
  } catch {
    return null;
  }
}
