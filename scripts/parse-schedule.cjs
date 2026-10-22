/**
 * 日本時間 (JST) でのデプロイ予約待機時間を計算するスクリプト
 *
 * 入力形式:
 * - 空欄 / 未指定: 即時実行 (wait_seconds=0)
 * - 時刻のみ (例: "02:00", "2:30", "15:00"): 次に訪れるその時刻 (本日または明日)
 * - 日時指定 (例: "2026-10-23 02:00", "2026/10/23 02:00", "2026-10-23T02:00")
 * - 相対時間 (例: "+30m", "+1h", "+90s")
 */
const fs = require('fs');

function parseJstSchedule(rawInput) {
  if (!rawInput || !rawInput.trim()) {
    return { waitSeconds: 0, info: '予約指定なし（即時実行）' };
  }

  const raw = rawInput.trim();

  let diffSec = 0;
  let infoStr = '';

  // 1. 相対時間指定 (+30m, +1h, +45s)
  const relMatch = raw.match(/^\+(\d+)\s*(m|min|minute|minutes|h|hour|hours|s|sec|seconds)?$/i);
  if (relMatch) {
    const val = parseInt(relMatch[1], 10);
    const unit = (relMatch[2] || 'm').toLowerCase();
    let seconds = val * 60;
    if (unit.startsWith('h')) seconds = val * 3600;
    else if (unit.startsWith('s')) seconds = val;
    diffSec = seconds;
    infoStr = `相対指定: +${val}${unit} （${seconds}秒 / 約${Math.round(seconds / 60)}分 待機後に実行）`;
  } else {
    // 2. JST 現在日時の取得
    const now = new Date();
    const jstFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = Object.fromEntries(jstFormatter.formatToParts(now).map((p) => [p.type, p.value]));
    const todayJst = `${parts.year}-${parts.month}-${parts.day}`;

    let targetIso;
    const timeOnlyMatch = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (timeOnlyMatch) {
      const hh = timeOnlyMatch[1].padStart(2, '0');
      const mm = timeOnlyMatch[2];
      const ss = (timeOnlyMatch[3] || '00').padStart(2, '0');
      targetIso = `${todayJst}T${hh}:${mm}:${ss}+09:00`;

      let targetTime = new Date(targetIso).getTime();
      if (targetTime <= now.getTime()) {
        // 本日のその時刻をすでに過ぎている場合は翌日の同じ時刻に設定
        const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
        const tmParts = Object.fromEntries(jstFormatter.formatToParts(tomorrow).map((p) => [p.type, p.value]));
        targetIso = `${tmParts.year}-${tmParts.month}-${tmParts.day}T${hh}:${mm}:${ss}+09:00`;
      }
    } else {
      // 日時指定: 2026-10-23 02:00 or 2026/10/23 02:00 or 2026-10-23T02:00
      const m = raw.replace(/\//g, '-').match(/^(\d{4})-(\d{1,2})-(\d{1,2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (!m) {
        throw new Error(`日時形式が正しくありません: "${raw}"\n指定例: "02:00", "2026-10-23 02:00", "+30m"`);
      }
      const yyyy = m[1];
      const mm = m[2].padStart(2, '0');
      const dd = m[3].padStart(2, '0');
      const hh = m[4].padStart(2, '0');
      const min = m[5].padStart(2, '0');
      const ss = (m[6] || '00').padStart(2, '0');
      targetIso = `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}+09:00`;
    }

    const targetDate = new Date(targetIso);
    diffSec = Math.floor((targetDate.getTime() - now.getTime()) / 1000);

    if (diffSec < 0) {
      throw new Error(`指定された予約日時 (${targetIso}) は既に過去です。`);
    }

    infoStr = `予約日時 (JST): ${targetIso} （待機時間: ${diffSec}秒 / 約${Math.round(diffSec / 60)}分）`;
  }

  // GitHub Actions の最大実行時間は6時間 (360分 = 21600秒)
  const maxWaitSec = 20400; // 安全マージンをとって5時間40分
  if (diffSec > maxWaitSec) {
    throw new Error(
      `指定された予約待機時間は約 ${Math.round(diffSec / 3600)} 時間です。\n` +
      `GitHub Actions ワークフローの最大実行時間は6時間のため、5時間40分以内の日時を指定してください。`
    );
  }

  return {
    waitSeconds: diffSec,
    info: infoStr,
  };
}

function main() {
  const scheduleInput = process.env.SCHEDULE_TIME || '';
  try {
    const result = parseJstSchedule(scheduleInput);
    console.log(`[Schedule] ${result.info}`);

    const githubOutput = process.env.GITHUB_OUTPUT;
    if (githubOutput) {
      fs.appendFileSync(githubOutput, `wait_seconds=${result.waitSeconds}\n`);
      fs.appendFileSync(githubOutput, `schedule_info=${result.info}\n`);
    }
  } catch (err) {
    console.error(`::error::${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { parseJstSchedule };
