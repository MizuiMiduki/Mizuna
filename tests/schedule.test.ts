import { describe, it, expect } from 'vitest';
// @ts-ignore - CommonJS module import
import scheduleModule from '../scripts/parse-schedule.cjs';

const { parseJstSchedule } = scheduleModule;

describe('parseJstSchedule', () => {
  it('空欄または未指定の場合は即時実行 (waitSeconds = 0) を返すこと', () => {
    expect(parseJstSchedule('')).toEqual({
      waitSeconds: 0,
      info: '予約指定なし（即時実行）',
    });
    expect(parseJstSchedule('   ')).toEqual({
      waitSeconds: 0,
      info: '予約指定なし（即時実行）',
    });
  });

  it('相対時間 (+30m, +1h, +45s) を正しく解釈すること', () => {
    const res30m = parseJstSchedule('+30m');
    expect(res30m.waitSeconds).toBe(1800);
    expect(res30m.info).toContain('1800秒');

    const res1h = parseJstSchedule('+1h');
    expect(res1h.waitSeconds).toBe(3600);

    const res45s = parseJstSchedule('+45s');
    expect(res45s.waitSeconds).toBe(45);
  });

  it('時刻のみ指定した場合に未来の待機秒数を正しく計算すること', () => {
    // 2時間後の時刻を指定
    const now = new Date();
    const jstFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tokyo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = Object.fromEntries(jstFormatter.formatToParts(new Date(now.getTime() + 7200 * 1000)).map(p => [p.type, p.value]));
    const targetTimeStr = `${parts.hour}:${parts.minute}`;

    const res = parseJstSchedule(targetTimeStr);
    expect(res.waitSeconds).toBeGreaterThan(7000);
    expect(res.waitSeconds).toBeLessThanOrEqual(7200);
  });

  it('不正なフォーマットが与えられた場合にエラーを投げること', () => {
    expect(() => parseJstSchedule('invalid-date')).toThrow('日時形式が正しくありません');
  });

  it('6時間を超える日時が指定された場合にエラーを投げること', () => {
    expect(() => parseJstSchedule('+7h')).toThrow('6時間');
  });
});
