import { Timestamp } from "firebase-admin/firestore";

export const faqSeedData = [
  // ログイン・アカウント・スマホ利用
  {
    category: "ログイン・アカウント",
    question: "パスコードを忘れてログインできなくなりました。",
    answer: "管理者に連絡して、パスコードの再設定を依頼してください。管理者は「スタッフ管理」から該当スタッフを選び、新しいパスコードを再発行できます。",
    search_terms: ["パスワード", "パスコード", "忘れた", "ログインできない", "入れない"],
    target_roles: ["systemOwner", "companyOwner", "manager", "storeManager", "admin", "staff"],
    related_screen: "/staff"
  },
  {
    category: "スマートフォンでの使用方法",
    question: "スマートフォンからでも自分の売上やシフトは見られますか？",
    answer: "はい、可能です。「スタッフポータル」にスマートフォンからアクセスしてパスコードでログインすることで、ご自身の売上目標の進捗、シフト、打刻用のQRコードなどを確認できます。",
    search_terms: ["スマホ", "スマートフォン", "携帯", "見れる", "確認", "スタッフポータル", "アプリ"],
    target_roles: ["staff", "storeManager", "manager", "companyOwner"],
    related_screen: "/staff-portal"
  },
  
  // スタッフ設定・権限設定
  {
    category: "スタッフ設定",
    question: "新しいスタッフのアカウントを追加する方法を教えてください。",
    answer: "「スタッフ管理」画面を開き、「スタッフ追加」ボタンを押します。氏名、メールアドレス、雇用形態を入力して保存するとスタッフとして登録されます。",
    search_terms: ["スタッフ追加", "新入社員", "アカウント作成", "登録", "増えた"],
    target_roles: ["systemOwner", "companyOwner", "manager", "admin"],
    related_screen: "/staff"
  },
  {
    category: "権限設定",
    question: "店長には売上は見せたいですが、他スタッフの給与は見せたくありません。",
    answer: "スタッフ追加・編集画面で、権限を「店舗管理者（Store Manager）」に設定してください。システム上、給与情報の閲覧は「会社管理者（Company Owner）」以上の権限にのみ制限されています。",
    search_terms: ["権限", "見れないようにする", "給与", "隠す", "店長", "ロール"],
    target_roles: ["systemOwner", "companyOwner"],
    related_screen: "/staff"
  },

  // 売上管理・CSV取込
  {
    category: "CSV取込",
    question: "ホットペッパービューティーの売上データを取り込むにはどうすればいいですか？",
    answer: "左メニューの「売上管理」を開き、「CSV一括取込」または「CSV取込」ボタンを押します。ダウンロードしたCSVファイルを選択して実行してください。※ファイルをExcel等で開いて上書き保存するとエラーになる場合があるため、ダウンロードした状態のまま取り込んでください。",
    search_terms: ["取り込み", "取込", "インポート", "ホットペッパー", "CSV", "売上データ"],
    target_roles: ["systemOwner", "companyOwner", "manager", "storeManager", "admin"],
    related_screen: "/sales"
  },
  {
    category: "データの修正、削除",
    question: "取り込んだ売上データが重複してしまった場合の対処法は？",
    answer: "「売上管理」画面から、重複している日付の売上を選択し、「削除」アイコン（ゴミ箱マーク）で不要なデータを削除してください。",
    search_terms: ["重複", "ダブり", "ダブった", "消す", "削除", "間違えた", "売上"],
    target_roles: ["systemOwner", "companyOwner", "manager", "admin"],
    related_screen: "/sales"
  },

  // 給与計算
  {
    category: "給与計算",
    question: "スタッフに特別な手当（指名手当など）や交通費を追加したいです。",
    answer: "「給与計算」メニューから該当スタッフの給与明細を開きます。「カスタム調整」や「手当・控除の追加」の項目で、手当名と金額を入力して保存してください。最終金額は自動的に再計算されます。",
    search_terms: ["手当", "交通費", "追加", "控除", "カスタム", "給料", "給与"],
    target_roles: ["systemOwner", "companyOwner", "admin"],
    related_screen: "/payroll"
  },
  {
    category: "給与計算",
    question: "社会保険料や源泉徴収税額表はどこから更新できますか？",
    answer: "管理者権限でログインし、「System Master（法定マスタ管理）」から国税庁の源泉徴収税額表CSV等をインポートすることで、計算の基礎となる税率マスタを更新できます。",
    search_terms: ["社会保険料", "税金", "税率", "源泉徴収", "マスタ", "更新", "法定"],
    target_roles: ["systemOwner", "companyOwner"],
    related_screen: "/admin/master/system"
  },

  // 勤怠管理
  {
    category: "勤怠管理",
    question: "出勤・退勤の打刻を忘れた、または間違えた場合はどう修正しますか？",
    answer: "「勤怠管理」メニューから該当する日付を選択し、「編集」アイコンを押します。正しい出退勤時間を入力し、「保存」を押してください。",
    search_terms: ["打刻忘れ", "出勤", "退勤", "時間修正", "直す", "勤怠"],
    target_roles: ["systemOwner", "companyOwner", "manager", "storeManager", "admin"],
    related_screen: "/attendance"
  },
  {
    category: "勤怠管理",
    question: "スタッフが自分のスマホからQRコードで打刻するには？",
    answer: "店舗用のタブレット端末等で「QR打刻（スキャナー）」画面を開いておきます。スタッフは自分のスマホで「スタッフポータル」にログインし、表示されたQRコードをタブレットのカメラにかざすことで打刻が完了します。",
    search_terms: ["QR", "打刻", "スマホ", "スキャナー", "カメラ", "出勤方法"],
    target_roles: ["staff", "storeManager", "manager", "companyOwner", "systemOwner"],
    related_screen: "/attendance/scanner"
  },

  // 有給・タスク管理
  {
    category: "タスク管理",
    question: "店舗ごとのタスク（掃除や発注など）を管理できますか？",
    answer: "「タスク管理」メニューをご利用ください。チェックリスト形式で業務を登録でき、スタッフが完了したかどうかの進捗を一覧で確認できます。",
    search_terms: ["タスク", "掃除", "発注", "業務", "ToDo", "チェックリスト"],
    target_roles: ["systemOwner", "companyOwner", "manager", "storeManager", "staff"],
    related_screen: "/tasks"
  },
  {
    category: "データの修正、削除",
    question: "スタッフが退職した場合、データは削除されますか？",
    answer: "過去の売上や給与データを保持するため、スタッフデータ自体は削除されません。スタッフの編集画面でステータスを「退職（retired）」に変更することで、ログインできなくなり各種一覧から非表示になります。",
    search_terms: ["退職", "辞めた", "アカウント削除", "消す", "退職処理"],
    target_roles: ["systemOwner", "companyOwner", "manager", "admin"],
    related_screen: "/staff"
  }
];
