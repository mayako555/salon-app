const LINE_SETUP_TERMS = [
  "line連携",
  "line公式",
  "チャネルアクセストークン",
  "liff",
  "次回予約line",
  "line配信",
  "line設定",
];

export function getSalonAgentBuiltInAnswer(question: string): string | null {
  const normalizedQuestion = question.trim().toLowerCase();
  const isLineSetupQuestion = LINE_SETUP_TERMS.some((term) =>
    normalizedQuestion.includes(term),
  );

  if (!isLineSetupQuestion) return null;

  return [
    "加盟店でLINE連携を始める手順です。",
    "",
    "1. 契約中の機能で「LINE自動配信」が有効か管理者に確認します。",
    "2. 店舗ごとにLINE公式アカウントを用意し、LINE DevelopersでMessaging APIチャネルを作成します。",
    "3. 長期チャネルアクセストークンとLINE公式アカウントのBasic ID（@から始まるID）を取得します。",
    "4. LINE LoginチャネルにLIFFアプリを追加し、エンドポイントURLを「SalonManagerのURL + /link-line」に設定してLIFF IDを取得します。",
    "5. SalonManagerの「システム設定」→「LINE公式連携」で、対象店舗のBasic ID・LIFF ID・アクセストークンを保存します。",
    "6. 顧客詳細の「LINE連携」から、友だち追加QRと顧客連携QRを順番に案内します。",
    "7. テスト送信で対象店舗のお客様だけに届くことを確認してから自動配信を有効にします。",
    "",
    "店舗ごとに別の設定を登録してください。アクセストークンをメールやチャットへ貼り付けたり、別店舗で使い回したりしないでください。",
    "公式案内: https://developers.line.biz/ja/docs/messaging-api/getting-started/",
    "LIFF案内: https://developers.line.biz/ja/docs/liff/getting-started/",
  ].join("\n");
}
