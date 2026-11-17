import { describe, it, expect } from 'vitest';
// @ts-ignore - CommonJS module import
import scheduleModule from '../scripts/parse-schedule.cjs';

const { parseJstSchedule } = scheduleModule;

describe('parseJstSchedule', () => {
  it('空欄または未指定の場合は即時実行 (waitSeconds = 0, isRelay = false) を返すこと', () => {
    expect(parseJstSchedule('')).toEqual({
      waitSeconds: 0,
      isRelay: false,
      targetJstStr: '',
      info: '予約指定なし（即時実行）',
    });
    expect(parseJstSchedule('   ')).toEqual({
      waitSeconds: 0,
      isRelay: false,
      targetJstStr: '',
      info: '予約指定なし（即時実行）',
    });
  });

  it('相対時間 (+30m, +1h, +45s) を正しく解釈すること', () => {
    const res30m = parseJstSchedule('+30m');
    expect(res30m.waitSeconds).toBe(1800);
    expect(res30m.isRelay).toBe(false);
    expect(res30m.info).toContain('1800秒');

    const res1h = parseJstSchedule('+1h');
    expect(res1h.waitSeconds).toBe(3600);
    expect(res1h.isRelay).toBe(false);

    const res45s = parseJstSchedule('+45s');
    expect(res45s.waitSeconds).toBe(45);
    expect(res45s.isRelay).toBe(false);
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
    const parts = Object.fromEntries(
      jstFormatter.formatToParts(new Date(now.getTime() + 7200 * 1000)).map((p) => [p.type, p.value])
    );
    const targetTimeStr = `${parts.hour}:${parts.minute}`;

    const res = parseJstSchedule(targetTimeStr);
    expect(res.isRelay).toBe(false);
    expect(res.waitSeconds).toBeGreaterThan(7000);
    expect(res.waitSeconds).toBeLessThanOrEqual(7200);
  });

  it('yyyy/mm/dd hh:mm 形式の日時指定を正しくパースすること', () => {
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    const jstFormatter = new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = Object.fromEntries(jstFormatter.formatToParts(tomorrow).map((p) => [p.type, p.value]));
    const formatted = `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;

    const res = parseJstSchedule(formatted);
    expect(res.targetJstStr).toBe(formatted);
    expect(res.isRelay).toBe(true); // 24時間後なので5時間を超えリレー対象
    expect(res.waitSeconds).toBe(18000); // 最大5時間待機
  });

  it('5時間 (18000秒) を超える予約（例: +8h）の場合はリレーフラグ (isRelay = true) と5時間 (18000秒) の待機秒数を返すこと', () => {
    const res = parseJstSchedule('+8h');
    expect(res.isRelay).toBe(true);
    expect(res.waitSeconds).toBe(18000);
    expect(res.info).toContain('次回ワークフローへ引き継ぎます');
  });

  it('不正なフォーマットが与えられた場合にエラーを投げること', () => {
    expect(() => parseJstSchedule('invalid-date')).toThrow('日時形式が正しくありません');
  });

  it('過去の日時が指定された場合にエラーを投げること', () => {
    expect(() => parseJstSchedule('2020/01/01 00:00')).toThrow('既に過去です');
  });
});
