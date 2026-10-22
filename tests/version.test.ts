import { describe, it, expect } from 'vitest';
import { comparisonVersion } from '../src/utils/version';

describe('comparisonVersion', () => {
  it('同一バージョンで 0 を返すこと', () => {
    expect(comparisonVersion('3.10.0', '3.10.0')).toBe(0);
    expect(comparisonVersion('1.0.0', '1.0.0')).toBe(0);
  });

  it('メジャーバージョンの高低を判定できること', () => {
    expect(comparisonVersion('3.5.0', '4.0.0')).toBeLessThan(0);
    expect(comparisonVersion('4.0.0', '3.5.0')).toBeGreaterThan(0);
  });

  it('マイナーバージョンの高低を判定できること', () => {
    expect(comparisonVersion('3.9.0', '3.10.0')).toBeLessThan(0);
    expect(comparisonVersion('3.10.0', '3.9.0')).toBeGreaterThan(0);
  });

  it('パッチバージョンの高低を判定できること', () => {
    expect(comparisonVersion('3.10.0', '3.10.1')).toBeLessThan(0);
    expect(comparisonVersion('3.10.1', '3.10.0')).toBeGreaterThan(0);
  });

  it('欠損したバージョン文字列 (例: "4.0", "3") でも 0 で補完して正しく比較できること', () => {
    expect(comparisonVersion('4.0', '4.0.0')).toBe(0);
    expect(comparisonVersion('3', '3.0.0')).toBe(0);
    expect(comparisonVersion('3.1', '3.0.5')).toBeGreaterThan(0);
    expect(comparisonVersion('', '0.0.0')).toBe(0);
  });
});
