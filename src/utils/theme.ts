import 'beercss';
import 'material-dynamic-colors';
import { type SettingRecord, updateSettingDb } from '../db/database';
import { normalizeMisskeyAvatarUrl } from './image';

const DEFAULT_MIZUNA_HEX = '#2b8cbe';
const PALETTE_CACHE_STORAGE_KEY = 'mizuna_avatar_palette_cache_v1';

interface ExtractedPalette {
  hex: string;
  lightRgb: string;
  darkRgb: string;
}

// アバターURLごとの抽出済みカラーパレットキャッシュ（通信・Canvas演算の節約）
const memoryPaletteCache = new Map<string, ExtractedPalette>();
let lastAppliedBeerMode: 'light' | 'dark' | null = null;
let lastAppliedThemeHex: string | null = null;

function getCachedPalette(avatarUrl: string): ExtractedPalette | null {
  const inMem = memoryPaletteCache.get(avatarUrl);
  if (inMem) return inMem;

  try {
    const raw = localStorage.getItem(PALETTE_CACHE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, ExtractedPalette>;
    const hit = parsed[avatarUrl];
    if (hit && hit.hex && hit.lightRgb && hit.darkRgb) {
      memoryPaletteCache.set(avatarUrl, hit);
      return hit;
    }
  } catch {
    // ストレージ読み込み失敗時は無視
  }
  return null;
}

function setCachedPalette(avatarUrl: string, palette: ExtractedPalette): void {
  memoryPaletteCache.set(avatarUrl, palette);
  try {
    const raw = localStorage.getItem(PALETTE_CACHE_STORAGE_KEY);
    const parsed: Record<string, ExtractedPalette> = raw ? JSON.parse(raw) : {};
    // 最大30件まで保持して肥大化を防止
    const keys = Object.keys(parsed);
    if (keys.length >= 30) {
      delete parsed[keys[0]];
    }
    parsed[avatarUrl] = palette;
    localStorage.setItem(PALETTE_CACHE_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ストレージ書き込み失敗時は無視
  }
}

declare global {
  interface Window {
    ui?: (command?: string | Element, value?: unknown) => unknown;
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

function hexToRgbTuple(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  if (clean.length === 6) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }
  return null;
}

function buildPaletteFromRgb(
  r: number,
  g: number,
  b: number
): { hex: string; lightRgb: string; darkRgb: string } {
  const hex = rgbToHex(r, g, b);
  const lightR = Math.min(255, Math.round(r + (255 - r) * 0.45));
  const lightG = Math.min(255, Math.round(g + (255 - g) * 0.45));
  const lightB = Math.min(255, Math.round(b + (255 - b) * 0.45));

  const darkR = Math.max(0, Math.round(r * 0.45));
  const darkG = Math.max(0, Math.round(g * 0.45));
  const darkB = Math.max(0, Math.round(b * 0.45));

  return {
    hex,
    lightRgb: `rgb(${lightR}, ${lightG}, ${lightB})`,
    darkRgb: `rgb(${darkR}, ${darkG}, ${darkB})`,
  };
}

function parseColorToHex(color: string | null | undefined): string {
  if (!color || color === 'lightblue' || color === 'darkblue') {
    return DEFAULT_MIZUNA_HEX;
  }
  if (color.startsWith('#')) {
    return color;
  }
  const match = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (match) {
    return rgbToHex(Number(match[1]), Number(match[2]), Number(match[3]));
  }
  return DEFAULT_MIZUNA_HEX;
}

/**
 * <img> または Blob から Canvas を使って鮮やかな色を抽出する（CPU読み取り最適化・即時解放）
 */
function extractVibrantFromDrawable(drawable: CanvasImageSource): ExtractedPalette {
  const canvas = document.createElement('canvas');
  const size = 48;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('No 2d context');
  }
  ctx.drawImage(drawable, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;
  canvas.width = 0;
  canvas.height = 0;

  let bestScore = -1;
  let bestR = 43;
  let bestG = 140;
  let bestB = 190;

  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 128) continue;

    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const l = (max + min) / 2;
    const d = max - min;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));

    const lightnessPenalty = 1 - Math.abs(l - 0.55) * 1.4;
    const score = s * 2.0 + Math.max(0, lightnessPenalty);

    if (score > bestScore && l > 0.12 && l < 0.92) {
      bestScore = score;
      bestR = r;
      bestG = g;
      bestB = b;
    }
  }

  return buildPaletteFromRgb(bestR, bestG, bestB);
}

/**
 * PHPプロキシを使わず、ブラウザのみでアイコン画像からキーカラーを抽出する
 * 0. 抽出済みキャッシュがあれば通信・Canvas処理を一切行わず即座に返却（省バッテリー）
 * 1. fetch(mode: 'cors') でBlob取得 -> Canvas解析
 * 2. URLエンコード補正版やサーバー内蔵プロキシURLを試行
 * 3. メディアサーバーがCORSヘッダーを返さない設定の場合はサーバーの /api/meta の themeColor にフォールバック
 */
async function extractPaletteClientOnly(
  avatarUrl: string,
  serverAddress?: string
): Promise<ExtractedPalette | null> {
  const cached = getCachedPalette(avatarUrl);
  if (cached) {
    return cached;
  }

  const normalizedUrl = normalizeMisskeyAvatarUrl(avatarUrl);
  const candidateUrls: string[] = [avatarUrl];

  if (normalizedUrl !== avatarUrl) {
    candidateUrls.push(normalizedUrl);
  }
  if (serverAddress) {
    candidateUrls.push(
      `https://${serverAddress}/proxy/avatar.webp?url=${encodeURIComponent(avatarUrl)}&avatar=1`
    );
  }

  // 1. fetch + createImageBitmap でピクセル取得（標準キャッシュを優先し、失敗時のみreloadを試行）
  for (const candidate of candidateUrls) {
    for (const cacheMode of ['default', 'reload'] as RequestCache[]) {
      try {
        const res = await fetch(candidate, {
          mode: 'cors',
          credentials: 'omit',
          cache: cacheMode,
        });
        if (!res.ok) continue;
        const blob = await res.blob();
        let palette: ExtractedPalette;
        if (typeof createImageBitmap === 'function') {
          const bitmap = await createImageBitmap(blob);
          try {
            palette = extractVibrantFromDrawable(bitmap);
          } finally {
            bitmap.close();
          }
        } else {
          const objectUrl = URL.createObjectURL(blob);
          try {
            palette = await new Promise<ExtractedPalette>((resolve, reject) => {
              const img = new Image();
              img.decoding = 'async';
              img.onload = () => {
                try {
                  resolve(extractVibrantFromDrawable(img));
                } catch (e) {
                  reject(e);
                }
              };
              img.onerror = reject;
              img.src = objectUrl;
            });
          } finally {
            URL.revokeObjectURL(objectUrl);
          }
        }
        setCachedPalette(avatarUrl, palette);
        return palette;
      } catch {
        // 次のキャッシュモードまたは次の候補URLを試行
      }
    }
  }

  // 2. フォールバック: Misskeyサーバー自身の /api/meta から themeColor を取得
  if (serverAddress) {
    try {
      const metaRes = await fetch(`https://${serverAddress}/api/meta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ detail: false }),
      });
      if (metaRes.ok) {
        const meta = await metaRes.json();
        if (typeof meta?.themeColor === 'string') {
          const rgb = hexToRgbTuple(meta.themeColor);
          if (rgb) {
            const palette = buildPaletteFromRgb(rgb[0], rgb[1], rgb[2]);
            setCachedPalette(avatarUrl, palette);
            return palette;
          }
        }
      }
    } catch {
      // 無視してnullを返す
    }
  }

  return null;
}

/**
 * 設定と現在のアカウントアイコンに基づいてBeerCSSのモード・テーマカラーおよびCSS変数を適用する
 */
export async function applyThemeAndMode(
  settings: SettingRecord,
  avatarUrl?: string,
  serverAddress?: string
): Promise<[string | null, string | null, string | null]> {
  // 1. ダークモード判定 (1: 無効(light), 2: 端末設定(auto), 3: 有効(dark))
  const prefersDark =
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

  const isDark =
    settings.is_darkmode === 3 || (settings.is_darkmode === 2 && prefersDark);

  const beerMode = isDark ? 'dark' : 'light';

  if (lastAppliedBeerMode !== beerMode) {
    if (typeof window !== 'undefined' && window.ui) {
      await window.ui('mode', beerMode);
    } else if (typeof document !== 'undefined') {
      document.body.classList.remove('light', 'dark');
      document.body.classList.add(beerMode);
    }
    lastAppliedBeerMode = beerMode;
  }

  // 2. テーマカラーの適用
  let themeHex = DEFAULT_MIZUNA_HEX;
  let updatedLatestColors: [string | null, string | null, string | null] =
    settings.latest_theme_color ?? ['lightblue', 'black', 'black'];

  if (!settings.is_visible_icon || !settings.is_pick_theme_color) {
    themeHex = DEFAULT_MIZUNA_HEX;
    document.documentElement.style.setProperty('--main_color', isDark ? 'darkblue' : 'lightblue');
    document.documentElement.style.setProperty('--background_color', isDark ? '#101418' : '#f8fafe');
    document.documentElement.style.setProperty('--text_color', isDark ? '#e0e3e8' : '#181c20');
    document.documentElement.style.setProperty('--button_text_color', isDark ? '#ffffff' : '#181c20');

    if (!settings.is_visible_icon) {
      updatedLatestColors = ['lightblue', 'black', 'black'];
      await updateSettingDb({ latest_theme_color: updatedLatestColors });
    }
  } else {
    // キャッシュ済みの色をまず即座に適用
    if (settings.latest_theme_color?.[0]) {
      themeHex = parseColorToHex(settings.latest_theme_color[0]);
      document.documentElement.style.setProperty('--main_color', settings.latest_theme_color[0]);
      document.documentElement.style.setProperty('--text_color', settings.latest_theme_color[1] ?? 'black');
      document.documentElement.style.setProperty(
        '--button_text_color',
        isDark ? 'white' : (settings.latest_theme_color[2] ?? 'black')
      );
    }

    // アイコン画像からカラー抽出（キャッシュヒット時は通信・Canvas処理ゼロ）
    if (avatarUrl && !avatarUrl.endsWith('/icon.png')) {
      const extracted = await extractPaletteClientOnly(avatarUrl, serverAddress);
      if (extracted) {
        themeHex = extracted.hex;
        const nextColors: [string, string, string] = [
          extracted.lightRgb,
          extracted.darkRgb,
          extracted.darkRgb,
        ];
        document.documentElement.style.setProperty('--main_color', extracted.lightRgb);
        document.documentElement.style.setProperty('--text_color', extracted.darkRgb);
        document.documentElement.style.setProperty(
          '--button_text_color',
          isDark ? 'white' : extracted.darkRgb
        );
        if (
          settings.latest_theme_color?.[0] !== nextColors[0] ||
          settings.latest_theme_color?.[1] !== nextColors[1]
        ) {
          updatedLatestColors = nextColors;
          await updateSettingDb({ latest_theme_color: updatedLatestColors });
        } else {
          updatedLatestColors = nextColors;
        }
      }
    }
  }

  // テーマカラーが変化したときのみ Material Dynamic Colors の再計算を実行（CPU/DOM負荷の軽減）
  if (typeof window !== 'undefined' && window.ui && lastAppliedThemeHex !== themeHex) {
    try {
      await window.ui('theme', themeHex);
      lastAppliedThemeHex = themeHex;
    } catch (e) {
      console.warn('BeerCSS theme update skipped:', e);
    }
  }

  return updatedLatestColors;
}
