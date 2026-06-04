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

## 4. UI/UX のデザイン方針
- **Rich Aesthetics**: 洗練されたモダンなデザイン、ガラスモーフィズム、スムーズなマイクロアニメーションを取り入れ、「プレミアムなSaaS」として美しく見えるように構築してください。単純で安っぽいUIは避けてください。
- すべてのインタラクティブ要素は、クリックしやすい十分なパディングとホバーエフェクトを持たせてください。

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
