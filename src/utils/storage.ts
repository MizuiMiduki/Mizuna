/**
 * 安全なストレージアクセスクラス
 * ブラウザ環境、プライベートブラウジングモード、Node.js/JSDOMテスト環境を問わず、
 * 例外を投げずに透過的にインメモリへフォールバックします。
 */
class SafeStorageWrapper {
  private fallbackMemory = new Map<string, string>();
  private storageType: 'localStorage' | 'sessionStorage';

  constructor(type: 'localStorage' | 'sessionStorage') {
    this.storageType = type;
  }

  private getStorage(): Storage | null {
    if (typeof window === 'undefined') return null;
    try {
      return window[this.storageType] ?? null;
    } catch {
      return null;
    }
  }

  getItem(key: string): string | null {
    if (this.fallbackMemory.has(key)) {
      return this.fallbackMemory.get(key)!;
    }
    try {
      const storage = this.getStorage();
      if (storage) {
        return storage.getItem(key);
      }
    } catch {
      // ignore
    }
    return null;
  }

  setItem(key: string, value: string): void {
    try {
      const storage = this.getStorage();
      if (storage) {
        storage.setItem(key, value);
        this.fallbackMemory.delete(key);
        return;
      }
    } catch {
      // ignore
    }
    this.fallbackMemory.set(key, value);
  }

  removeItem(key: string): void {
    this.fallbackMemory.delete(key);
    try {
      const storage = this.getStorage();
      if (storage) {
        storage.removeItem(key);
      }
    } catch {
      // ignore
    }
  }

  clear(): void {
    try {
      const storage = this.getStorage();
      if (storage) {
        storage.clear();
      }
    } catch {
      // ignore
    }
    this.fallbackMemory.clear();
  }
}

export const safeLocalStorage = new SafeStorageWrapper('localStorage');
export const safeSessionStorage = new SafeStorageWrapper('sessionStorage');

function buildBackupFileName(kind: 'setting' | 'account', date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `mizuna_${kind}_${yyyy}${mm}${dd}_${randomNum}.json`;
}

/**
 * 設定バックアップ用のファイル名を生成
 * 形式: mizuna_setting_yyyymmdd_ランダムな数字.json
 */
export function generateSettingBackupFileName(date: Date = new Date()): string {
  return buildBackupFileName('setting', date);
}

/**
 * アカウントバックアップ用のファイル名を生成
 * 形式: mizuna_account_yyyymmdd_ランダムな数字.json
 */
export function generateAccountBackupFileName(date: Date = new Date()): string {
  return buildBackupFileName('account', date);
}
