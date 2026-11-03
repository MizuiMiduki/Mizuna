/**
 * バージョン番号を比較する関数
 * version1 < version2 なら負の数、version1 == version2 なら 0、version1 > version2 なら正の数を返す
 * 例: comparisonVersion("3.5.0", "4.0") <= 0  (3.5.0 <= 4.0)
 */
export function comparisonVersion(version1: string, version2: string): number {
  const parseVersion = (version: string): [number, number, number] => {
    const parts = String(version || '0.0.0')
      .split('.')
      .map((n) => parseInt(n, 10) || 0);
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
  };

  const [major1, minor1, patch1] = parseVersion(version1);
  const [major2, minor2, patch2] = parseVersion(version2);

  if (major1 !== major2) return major1 - major2;
  if (minor1 !== minor2) return minor1 - minor2;
  return patch1 - patch2;
}

/** 画像添付（write:drive）権限が必要になったバージョン */
export const DRIVE_PERMISSION_REQUIRED_VERSION = '3.5.0';

/** 投稿履歴閲覧（read:notes）権限が必要になったバージョン */
export const HISTORY_PERMISSION_REQUIRED_VERSION = '4.0.0';

/**
 * 指定されたアカウント追加バージョンが画像添付（write:drive）権限を保持しているか判定
 */
export function hasDrivePermission(addVersion?: string | null): boolean {
  if (!addVersion) return false;
  return comparisonVersion(DRIVE_PERMISSION_REQUIRED_VERSION, addVersion) <= 0;
}

/**
 * 指定されたアカウント追加バージョンが投稿履歴閲覧（read:notes）権限を保持しているか判定
 */
export function hasHistoryPermission(addVersion?: string | null): boolean {
  if (!addVersion) return false;
  return comparisonVersion(HISTORY_PERMISSION_REQUIRED_VERSION, addVersion) <= 0;
}

/**
 * 指定されたアカウント追加バージョンで不足している権限一覧を取得
 */
export function getMissingPermissions(addVersion?: string | null): string[] {
  const missing: string[] = [];
  if (!hasDrivePermission(addVersion)) {
    missing.push('write:drive');
  }
  if (!hasHistoryPermission(addVersion)) {
    missing.push('read:notes');
  }
  return missing;
}
