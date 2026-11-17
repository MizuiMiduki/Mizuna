/**
 * 日本時間 (JST) でのデプロイ予約待機時間を計算するスクリプト
 *
 * 入力形式:
 * - 空欄 / 未指定: 即時実行 (waitSeconds = 0, isRelay = false)
 * - 日時指定: "yyyy/mm/dd hh:mm", "yyyy-mm-dd hh:mm" (例: "2026/10/23 15:00")
 * - 時刻のみ (例: "15:00", "02:30"): 次に訪れるその時刻 (本日または明日)
 * - 相対時間 (例: "+30m", "+1h", "+8h", "+90s")
 *
 * 6時間以降の待機について:
 * GitHub Actions のジョブ最大実行時間（6時間）を超える場合、
 * 1回あたり最大5時間（18000秒）待機し、次のワークフローへリレー (isRelay = true) して自動引き継ぎます。
 */
const fs = require('fs');

/**
 * Date オブジェクトを JST の "YYYY/MM/DD HH:mm" 形式にフォーマットする
 */
function formatJst(date) {
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
}

function parseJstSchedule(rawInput) {
  if (!rawInput || !rawInput.trim()) {
    return {
      waitSeconds: 0,
      isRelay: false,
      targetJstStr: '',
      info: '予約指定なし（即時実行）',
    };
  }

  const raw = rawInput.trim();
  const now = new Date();

  let diffSec = 0;
  let targetDate;
  let targetJstStr = '';

  // 1. 相対時間指定 (+30m, +1h, +8h, +45s)
  const relMatch = raw.match(/^\+(\d+)\s*(m|min|minute|minutes|h|hour|hours|s|sec|seconds)?$/i);
  if (relMatch) {
    const val = parseInt(relMatch[1], 10);
    const unit = (relMatch[2] || 'm').toLowerCase();
    let seconds = val * 60;
    if (unit.startsWith('h')) seconds = val * 3600;
    else if (unit.startsWith('s')) seconds = val;

    diffSec = seconds;
    targetDate = new Date(now.getTime() + seconds * 1000);
    targetJstStr = formatJst(targetDate);
  } else {
    // 2. JST 現在日時の取得
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
      // 時刻のみ指定 (例: "15:00")
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
      targetDate = new Date(targetIso);
    } else {
      // 日時指定: yyyy/mm/dd hh:mm, yyyy-mm-dd hh:mm, yyyy-mm-ddThh:mm:ss
      const m = raw.replace(/\//g, '-').match(/^(\d{4})-(\d{1,2})-(\d{1,2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (!m) {
        throw new Error(
          `日時形式が正しくありません: "${raw}"\n指定例: "2026/10/23 15:00" (yyyy/mm/dd hh:mm), "15:00", "+30m"`
        );
      }
      const yyyy = m[1];
      const mm = m[2].padStart(2, '0');
      const dd = m[3].padStart(2, '0');
      const hh = m[4].padStart(2, '0');
      const min = m[5].padStart(2, '0');
      const ss = (m[6] || '00').padStart(2, '0');
      targetIso = `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}+09:00`;
      targetDate = new Date(targetIso);
    }

    targetJstStr = formatJst(targetDate);
    diffSec = Math.floor((targetDate.getTime() - now.getTime()) / 1000);

    if (diffSec < 0) {
      // 3分以内の微小な遅延（リレー起動のラグ等）は即時実行として許容
      if (diffSec >= -180) {
        diffSec = 0;
      } else {
        throw new Error(`指定された予約日時 (${targetJstStr}) は既に過去です。現在より未来の日時を指定してください。`);
      }
    }
  }

  // 1回あたりの最大待機時間（GitHub Actions 最大実行時間6時間に対し、1時間の安全マージンをとって5時間 = 18000秒）
  const RELAY_THRESHOLD_SEC = 18000;
  let waitSeconds = diffSec;
  let isRelay = false;
  let infoStr = '';

  if (diffSec > RELAY_THRESHOLD_SEC) {
    isRelay = true;
    waitSeconds = RELAY_THRESHOLD_SEC;
    const totalHours = (diffSec / 3600).toFixed(1);
    infoStr = `予約日時 (JST): ${targetJstStr} （合計待機時間: 約${totalHours}時間 / 今回は5時間待機後に次回ワークフローへ引き継ぎます）`;
  } else if (diffSec > 0) {
    infoStr = `予約日時 (JST): ${targetJstStr} （待機時間: ${diffSec}秒 / 約${Math.round(diffSec / 60)}分）`;
  } else {
    infoStr = `予約日時 (JST): ${targetJstStr} （待機時間なし / 即時デプロイ）`;
  }

  return {
    waitSeconds,
    isRelay,
    targetJstStr,
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
      fs.appendFileSync(githubOutput, `is_relay=${result.isRelay ? 'true' : 'false'}\n`);
      fs.appendFileSync(githubOutput, `target_jst_str=${result.targetJstStr}\n`);
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
