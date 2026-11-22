# Mizuna テスト & コード品質保証ガイド

このドキュメントは、Mizunaの品質・安定性・通信量削減ポリシーを継続的に維持・向上させるためのガイドラインです。

---

## 1. 総合検証コマンド（PR作成・リリース前の必須実行）

コード変更後は、以下のコマンドで **型検査・全単体/結合テスト・プロダクションビルド** を一括検証してください。

```bash
pnpm run check
```

* `pnpm run type-check`: TypeScriptの型不整合や未定義変数を静的検査
* `pnpm test`: 全テストスイートの実行
* `pnpm run test:watch`: 変更検知によるテスト自動再実行（開発時推奨）
* `pnpm run build`: Vite/Rollupバンドルが正常に完結するか検証

---

## 2. Mizuna固有の品質・テスト設計ポリシー

Mizunaは **「ノート時に無駄な通信を行わず通信量を削減したい方向けのクライアント」** です。新機能開発時は以下の観点を必ず満たすようにテストを実装してください。

### ① 通信量削減・ペイロード最小化（最重要）
* **余計な通信の発生禁止**:
  * ノート投稿時に不要なエンドポイント（タイムライン、通知など）を連動呼び出ししない。
  * リクエストボディには未指定のオプショナル項目（空文字や未設定のフィールド）を含めず、最小限のペイロードを送信する。
* **ローカル操作のゼロ通信保証**:
  * 下書き（Draft）、履歴（History）、設定、テーマ切り替えなどの操作中は外部ネットワーク通信（`fetch`）が一切発生しないこと。
  * 新規投稿したノートは再取得のfetchを行わず、メモリ内キャッシュ（`historyStore`）へ即時反映すること。
* **対応テスト**: `tests/networkOptimization.test.ts`

### ② PWA & Service Worker の整合性
* **バージョン同期**:
  * `package.json` のバージョン変更時、`public/sw.js`（`SW_VERSION` / `CACHE_NAME`）および `public/version.json` が完全に一致すること。
  * Viteプラグイン（`syncSwVersionPlugin`）による自動同期が機能していること。
* **キャッシュ汚染防止**:
  * 外部オリジン（Misskey APIサーバーや外部ホスト画像）がService Workerキャッシュに入り込まないよう、オリジン検証ロジックを維持すること。
* **対応テスト**: `tests/serviceWorker.test.ts`

### ③ Misskey API 互換性・フォーク耐性
* **フォークサーバー対応**:
  * 本家Misskeyだけでなく、SharkeyやFirefish等のフォーク、および新旧バージョンでのレスポンス構造（`createdNote` ラップの有無、フィールド欠落など）に対応できること。
* **グレースフル・デグラデーション**:
  * サーバー側が空JSONや未定義フィールドを返した場合でも、アプリがクラッシュせずローカルデータ（入力内容）で安全にフォールバックすること。
* **対応テスト**: `tests/misskeyContract.test.ts`, `tests/misskeyApi.test.ts`

### ④ アクセシビリティ (a11y)
* **アクセシブルなボタン・入力欄**:
  * アイコンのみのボタンには必ず `aria-label` または `title` を付与する。
  * モーダルやダイアログはセマンティックなマークアップまたは適切なARIA属性を持たせる。
* **対応テスト**: `tests/accessibility.test.tsx`

---

## 3. CI/CD パイプライン連携

GitHub Actions（`.github/workflows/test.yml`）により、以下のチェックがプルリクエストおよびmainブランチへのプッシュ時に自動実行されます。

1. `pnpm run type-check` (型検査)
2. `pnpm test` (全自動テスト)
3. `pnpm run build` (プロダクションビルド検証)

CIがすべてグリーンになることを確認してからマージしてください。
