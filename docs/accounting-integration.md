# 会計連携 MVP（2026-09-30）

## 入口
- 設定 → 外部サービス連携 → 会計ソフト (`/admin/settings/integrations/accounting`)
- 経費 → 経費の手入力・CSV取込・カテゴリ設定 (`/admin/expenses/entry`)

会計ソフトなしで手入力・カテゴリ編集・標準CSV取込が可能。経費は既存 `expenses` に保存され、既存集計の入力になる。領収書は任意のJPEG/PNG（450KB以内）で、tenant配下のサーバー専用Firestoreに保存。公開Storage URLを生成しない。

## 実装範囲
- Provider登録方式、freee OAuth、MoneyForward OAuth + PKCE S256。
- 認可された事業所・科目の取得、接続先選択、接続状態、解除。
- 科目・税区分をユーザー確認後、売上/経費候補を作り、選択・承認後に1行ずつ送信。
- freeeは税込・未決済取引。MoneyForwardはユーザー指定の未収/未払相手科目を使う仕訳。
- 会計側の決済・入金消込は行わない。混合税率のレコードを単一税率で送らないことを画面表示。税務判断はユーザーが行う。
- 履歴、明確な失敗行の再試行、結果不明行の保留、接続先別の同期対象外。
- 標準CSV、freee取引CSV、MoneyForward仕訳帳CSV、弥生会計オンライン27列CSV。後者3種はカテゴリ単位でユーザーが科目・税区分を入力する。
- CSV出力だけで同期済みにしない。出力履歴がある行は同じproviderへのAPI候補を保留し、未取込の明示確認後に解除する。

## サーバー設定（秘密はブラウザやGitに保存しない）
- `ACCOUNTING_APP_ORIGIN`: 本番の正規HTTPS origin。末尾スラッシュ・パスなし。
- `ACCOUNTING_KEY_VERSION`: 例 `V1`。
- `ACCOUNTING_KEY_V1`: 安全な乱数32byteのbase64。環境別にSecret Manager等で管理。
- `FREEE_CLIENT_ID`, `FREEE_CLIENT_SECRET`
- `MONEYFORWARD_CLIENT_ID`, `MONEYFORWARD_CLIENT_SECRET`

callback:
- `<origin>/api/accounting/freee/callback`
- `<origin>/api/accounting/moneyforward/callback`

MoneyForwardアプリの認証方式は `CLIENT_SECRET_BASIC` に設定する。scopeは公式V3定義に基づき `mfc/accounting/offices.read mfc/accounting/accounts.read mfc/accounting/journal.write`。freeeはアプリ管理画面で事業所・科目の参照と取引登録に必要な権限だけを設定する。

設定不足では接続ボタンは無効。ID・パスワードは保存しない。OAuth stateはセッション・uid・tenant・providerに結び、一回消費、10分期限。AES-256-GCMのAADにtenantとcredential IDを含める。

## DB・リリース
追加indexのみ。`firestore.indexes.json` のexpenses/companyId/dateとsales_master/companyId/dateを適用してREADYを確認してから有効化。既存データの移動・削除・書換は不要。新規経費にsourceを追加し、旧経費はis_importedから互換表示する。

新規コレクションはcompanies/{companyId}配下。Admin SDK専用のため、Rulesに依存せず毎操作で認証コンテキストと役割を照合。companyOwner/adminが操作可能、accountantは読取のみ、代理ログインとunscoped systemOwnerは拒否する。

先にテスト用会計事業所でOAuth・事業所選択・科目取得を確認。その後、承認済み少数データを送信し、金額、科目、税区分、貸借、未決済状態、再操作時の重複防止を実機で確認する。本番データへの自動送信はない。外部実機テスト・アプリ登録・審査は別途必要。

## 失敗時の扱い
- GETのみ上限付きリトライ。POSTの通信切断・5xx・408・409・応答形式異常は結果不明として停止する。
- 401はrefresh後に一度再試行。refreshの並列利用はFirestoreトランザクションで防止。
- refresh処理が中断されてロックだけ残る場合、安全のため期限切れ再実行せず再認証する。
- 外部登録後に結果保存が失敗すると台帳はsendingのまま残る。期限切れだからと再送してはいけない。外部会計で管理番号/メモと金額を照合してから管理者が復旧する。
- 同期済み・除外・結果不明の台帳は再連携で消えない。承認後の元データ変更は送信を止める。
- 連携解除時のAPI失効に失敗したら、サービス側でもアプリ許可を解除する案内を表示。実行済みの外部取引は削除しない。

## 制限・今後
- 弥生APIは公式公開α版が仕様のみのため実装しない。CSV対象は会計オンライン。デスクトップ/Next互換は未検証。
- APIからの経費取り込み、自動同期、複合税率・決済処理、receiptの外部転送、Webhookは未提供。
- 科目マッピングはカテゴリ単位。取引ごとの税区分が異なる場合はカテゴリを分けるか送信対象外にする。
- freee税コード/MoneyForward税IDは設定確認後の明示入力。税マスタの選択UIは今後の改善。
- 既存CSV取込画面も重複候補の明示確認へ変更。旧簡易弥生CSVの出力は従来形式のため、新しい会計連携画面の製品別CSVを利用する。
- 経費管理の新画面はowner/admin向け。既存スタッフ現金精算画面は維持。
- 既存給与・固定費の集計定義は変更していない。入力元の違いで新規レコードを二重保存しない設計だが、既に登録済みの給与等との重複を自動で解決しない。
- CSVの列構造を自動テスト済み。各社アプリでの実取込は未確認。文字コード・税区分・科目制限は実取込前に確認する。

## 公式資料
- freee OAuth: https://developer.freee.co.jp/reference/認可コード
- freee取引スキーマ: https://github.com/freee/freee-mcp/blob/main/openapi/accounting-api-schema.json
- freee審査: https://developer.freee.co.jp/reference/app-review-process
- freee CSV: https://support.freee.co.jp/hc/ja/articles/202847320
- MoneyForward OAuth: https://developers.biz.moneyforward.com/docs/api/auth/authorize/
- MoneyForward token: https://developers.biz.moneyforward.com/docs/api/auth/create-token/
- MoneyForward 会計V3: https://developers.api-accounting.moneyforward.com/v3/openapi.yaml
- MoneyForward CSV: https://biz.moneyforward.com/support/account/guide/import-books/ib01.html
- MoneyForward規約: https://biz.moneyforward.com/agreement/api/
- 弥生α版: https://developers-seamlink.yayoi-kk.co.jp/about-alpha-version/
- 弥生オンラインCSV: https://support.yayoi-kk.co.jp/subcontents.html?page_id=27184

## ローカル検証結果
- `npm test`: 158件成功、失敗0（既存145件＋会計関連13件）。
- `npm run build`: コンパイル、TypeScript、97ページ生成成功。
- 変更対象のESLint: エラー0、警告112（既存ファイルを含む。any型・Hooks等の警告は残る）。
- `git diff --check`: 問題なし。
- 本番Firestore変更、外部会計データ送信、push、デプロイは未実施。
- ブラウザからの実ログイン・OAuth往復、Firestore同時実行、各社CSV実取込は未検証。今回の自動テストは権限判定、暗号化のtenant束縛、送信キー、金額・日付、CSV構造、通信エラー時の再送抑止などを対象にする。
