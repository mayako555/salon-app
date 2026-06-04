# Salon App (bshare.jp) 開発ガイドライン

このドキュメントは、このリポジトリで作業するすべてのAIエージェント（Claude, Cursor, 等）に向けた設計・仕様およびスキル（注意事項）のまとめです。
コードを変更する際は、必ずこの仕様に従ってください。

## 1. 技術スタック (Tech Stack)
- **Framework**: Next.js 14 (App Router, Server Actions)
- **Styling**: Tailwind CSS, shadcn/ui (一部)
- **Database / Auth**: Firebase (Firestore, Firebase Auth, Cloud Storage), Firebase Admin SDK
- **Hosting**: Vercel (bshare.jp)

## 2. 認証・認可アーキテクチャ (Auth & Multi-tenancy)
このシステムは複数のサロンが利用できるSaaS（マルチテナント）アーキテクチャを採用しています。

- **Cookieベース認証**: Firebase Authのクライアントログイン後、`/api/auth/session` を経由してSession Cookieを発行し、サーバーアクション側では Firebase Admin SDK の `verifySessionCookie` で認証を行います。
- **データ分離 (Tenant Isolation)**: 各ユーザーは `companyId` を持ちます。Server Actions では `getCurrentUserContext()` (in `src/lib/auth-server.ts`) を呼び出し、データの出し分けやアクセス権限のチェックを**必ず**行います。
- **ロール (Role)**: `systemOwner` (全データアクセス可能), `companyOwner`, `manager`, `storeManager`, `staff` の権限があります。

## 3. 既知のバグと特殊な仕様 (Skills & Quirks) - ⭐️重要⭐️

AIエージェントがハマりやすい特殊な仕様やトラップがいくつかあります。以下の「スキル」を必ず確認してください。

### Skill 1: Vercelビルド時の Firebase Admin プロキシ回避
Vercelのデプロイ時（ビルドフェーズ）には環境変数が完全に揃っていないことがあり、Firebase Admin SDKの初期化でエラーになります。
これを防ぐため、`src/lib/firebase-admin.ts` にて `isBuild` フラグを判定し、ビルド中はダミーのProxyオブジェクトを返す特殊な処理が入っています。この仕組みを壊さないようにしてください。

### Skill 2: Firebase Private Key の PEMフォーマット修復
Vercelの環境変数に設定された `FIREBASE_PRIVATE_KEY` は、コピペ時のミスで改行が失われたりスペースが混入したりすることが多々あります。
`src/lib/firebase-admin.ts` 内の `getPrivateKey()` にて、Base64文字列から不要な文字（空白やバックスラッシュなど）を除去し、64文字ごとに正規のPEMフォーマットに再構築する強力なバリデーションが入っています。このロジックを変更しないでください。

### Skill 3: Server Actions のシリアライズエラー (Firestore Timestamp)
Firestoreから取得したデータに含まれる `Timestamp` オブジェクトや `Date` オブジェクトをそのまま Server Action の戻り値としてクライアントコンポーネントへ渡すと、Next.jsの **Serialization Error** が発生し画面がフリーズします。
- **対策**: Server Actionからデータを返す前には、必ず全てのTimestampオブジェクトを `.toMillis()` 等を使ってプレーンな数値や文字列にシリアライズしてください。（例：`src/app/sales/actions.ts` の `getMonthlySales` や `getKioskStaffList` で実装されているDeep Serialization処理を参考にしてください）

### Skill 4: 店舗名の正規化 ("店" サフィックス)
設定画面やコンテキスト (`selectedStore`) では「六甲店」のように「店」がつく場合がありますが、シフトデータなどの一部のDBレコードでは「六甲」と保存されているケースがあります。
条件マッチングを行う際は、必ず `.replace(/店$/, "")` を使ってサフィックスを取り除き、正規化してから比較してください。（例：`ReservationTimeline.tsx`）

## 5. 主要な機能とビジネスロジック (Core Features & Business Logic)
これまで開発してきた主な機能とビジネス要件です。新たに機能を修正・追加する際は、これらの既存ロジックとの整合性を意識してください。

1. **予約台帳 (Reservations)**
   - ドラッグ＆ドロップ対応のタイムライン型カレンダー。
   - `selectedStore` (店舗) に応じてスタッフを出し分け。他店へのヘルプ出勤（シフト情報）も加味して表示。
2. **売上・レジ締め (Sales & Checkout)**
   - 予約からのワンクリック会計。現金・クレジット・HotPepperBeautyポイント等の対応。
   - 担当者ごとの「指名料 (Nomination Fee)」の自動加算、値引き処理に対応。
3. **シフト・勤怠管理 (Shifts & Attendance)**
   - 店舗のタブレット等で利用する「タイムカード (Kiosk)」機能。打刻忘れや他店出勤に対応。
   - 打刻時間とシフト予定時間を比較し、残業や遅刻を判定。
4. **給与・報酬計算 (Payroll & Allowances)**
   - 売上データからの歩合給・指名料の自動集計。
   - 交通費の前払い分などの「控除額」入力と、自動相殺処理。
5. **スタッフ評価システム (Staff Evaluation)**
   - 売上、再来率、お直し率などの定量データを元にした自動スコアリングと、マネージャーによる定性評価の統合。
6. **経費・収支管理 (Expenses & Petty Cash)**
   - 各店舗の小口現金（レジ金）の入出金記録。売上と連動した日次収支（日報）の生成。
7. **在庫管理 (Inventory)**
   - 施術時の使用商材の自動引き落としと、発注アラート機能。
8. **顧客管理と同意書 (Customers & Consent Forms)**
   - 姓・名・カナの分離保存（名寄せ処理）。
   - LEDエクステ等の特定メニューに対する、健康状態の事前問診・同意書（Consent）の電子記録。

## 6. UI/UX のデザイン方針
- **Rich Aesthetics**: 洗練されたモダンなデザイン、ガラスモーフィズム、スムーズなマイクロアニメーションを取り入れ、「プレミアムなSaaS」として美しく見えるように構築してください。単純で安っぽいUIは避けてください。
- すべてのインタラクティブ要素は、クリックしやすい十分なパディングとホバーエフェクトを持たせてください。

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
