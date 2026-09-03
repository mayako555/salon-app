# Salon Manager

サロン運営に必要な予約、顧客、売上、勤怠、シフト、給与、在庫、分析を管理するマルチテナント型の業務アプリです。

## 必要環境

- Node.js 20.18.1（`.nvmrc`で固定）
- npm
- Firebase／Supabase等の接続情報を設定した`.env.local`

環境変数の実値はリポジトリへコミットしないでください。

## セットアップ

```bash
nvm use
npm ci
npm run dev
```

開発サーバーは <http://localhost:3005> で起動します。

## 品質チェック

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

まとめて型チェック、lint、単体テストを行う場合は`npm run check`を使用します。テストを監視モードで実行する場合は`npm run test:watch`を使用します。

既存コードには段階的に解消するlint警告があります。通常の`lint`は実行時エラーにつながる違反を失敗として扱い、`lint:strict`は警告も含めて失敗させます。変更したファイルでは警告を増やさず、可能な範囲で減らしてください。

## データと権限

- Firebase Admin SDKを使う処理では、認証済みユーザーの`companyId`によるテナント分離が必須です。
- 本番データへ接続する調査・移行スクリプトは、対象プロジェクトと会社IDを確認してから実行してください。
- `.env*`、サービスアカウント、顧客データ、診断ログはコミットしないでください。

## CI

Pull Requestと`main`へのpushで、Node.jsの固定バージョンを使って型チェック、ESLint、プロダクションビルドを実行します。
