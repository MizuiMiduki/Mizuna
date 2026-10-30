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
      const storage = window[this.storageType];
      if (!storage) return null;
      // Safari などのプライベートブラウジングやセキュリティ制約で例外が出るかプローブ
      const testKey = '__mizuna_storage_test__';
      storage.setItem(testKey, '1');
      storage.removeItem(testKey);
      return storage;
    } catch {
      return null;
    }
  }

  getItem(key: string): string | null {
    try {
      const storage = this.getStorage();
      if (storage) {
        return storage.getItem(key);
      }
    } catch {
      // ignore
    }
    return this.fallbackMemory.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    try {
      const storage = this.getStorage();
      if (storage) {
        storage.setItem(key, value);
        return;
      }
    } catch {
      // ignore
    }
    this.fallbackMemory.set(key, value);
  }

  removeItem(key: string): void {
    try {
      const storage = this.getStorage();
      if (storage) {
        storage.removeItem(key);
        return;
      }
    } catch {
      // ignore
    }
    this.fallbackMemory.delete(key);
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
