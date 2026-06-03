export type OJTDaySchedule = {
  subject_name: string;
  curriculum_content: string;
  content: string;
  duration_hours: number;
  instructor_name: string;
};

export const OJT_SCHEDULE: Record<string, OJTDaySchedule> = {
  // 4月の例（画像の一部を抜粋・推測）
  "2024-04-01": {
    subject_name: "ラッシュリフト基礎知識",
    curriculum_content: "①本科目の目的と目標 ②まつ毛パーマの歴史 ③ラッシュリフトとは等",
    content: "【ラッシュリフト基礎知識】\n①本科目の目的と目標\n②まつ毛パーマの歴史\n③ラッシュリフトとは\n等の座学研修を実施。",
    duration_hours: 6,
    instructor_name: "岡田",
  },
  "2024-04-02": {
    subject_name: "ラッシュリフト基礎知識",
    curriculum_content: "①ラッシュリフト商材グループ ②（ソフト側）/（ハード側） ③使用期限等",
    content: "【ラッシュリフト基礎知識】\n商材の知識、使用期限、ロッドの種類とサイズ選定についての座学および実技見学を実施。",
    duration_hours: 6,
    instructor_name: "岡田",
  },
  "2024-04-04": {
    subject_name: "ラッシュリフト基礎知識",
    curriculum_content: "①目元に合わせたロッド選定 ②ロッドの合わせ方・貼り方等 ③目の形状に合わせたロッド選定等",
    content: "【ラッシュリフト基礎知識】\n目元の形状に合わせたロッドの選定方法、およびロッドの合わせ方・貼り方のデモンストレーションを実施。",
    duration_hours: 6,
    instructor_name: "岡田",
  },
  "2024-04-05": {
    subject_name: "ラッシュリフト基礎知識",
    curriculum_content: "①まつ毛を巻き上げる方向 ②グルーの種類・成分・使用期限等 ③処理剤の種類・成分・役割等",
    content: "【ラッシュリフト基礎知識】\nまつ毛を巻き上げる方向の理論と、グルー・処理剤の種類・成分・役割についての座学を実施。",
    duration_hours: 6,
    instructor_name: "岡田",
  },
  "2024-04-07": {
    subject_name: "ラッシュリフト基礎知識",
    curriculum_content: "①毛髪学（毛の構造） ②毛髪学とラッシュリフトのメカニズム等 ③毛髪のpHとアルカリ剤等",
    content: "【ラッシュリフト基礎知識】\n毛髪学の基礎構造と、ラッシュリフトのメカニズム、薬剤のpHに関する知識を指導。",
    duration_hours: 6,
    instructor_name: "岡田",
  },
  "2024-04-08": {
    subject_name: "ラッシュリフト基礎知識",
    curriculum_content: "①ロッドの使用方法・選定方法 ②毛質と放置時間の関係 ③ラップの使用等",
    content: "【ラッシュリフト基礎知識】\nロッドの使用方法・選定方法、毛質と放置時間の関係性についてのデモンストレーション・実習。",
    duration_hours: 6,
    instructor_name: "岡田",
  },
  "2024-04-09": {
    subject_name: "ラッシュリフト基礎知識",
    curriculum_content: "①軟化チェック・見極め方 ②軟化不良の主な原因 ③過軟化の主な原因等",
    content: "【ラッシュリフト基礎知識】\n軟化チェックの見極め方、軟化不良や過軟化の主な原因についての指導。",
    duration_hours: 6,
    instructor_name: "岡田",
  },
  "2024-04-11": {
    subject_name: "ラッシュリフト基礎技術",
    curriculum_content: "1液塗布〜中間処理〜2液塗布〜ロッドアウト実習",
    content: "【ラッシュリフト基礎技術】\n1液塗布から中間処理、2液塗布、ロッドアウトまでの一連の流れの実習を実施。",
    duration_hours: 6,
    instructor_name: "岡田",
  },
  "2024-04-12": {
    subject_name: "ラッシュリフト基礎技術",
    curriculum_content: "上ラッシュリフト 巻き上げ",
    content: "【ラッシュリフト基礎技術】\n上ラッシュリフトの巻き上げ技術について、集中トレーニングを実施。",
    duration_hours: 6,
    instructor_name: "岡田",
  },
  "2024-04-14": {
    subject_name: "ラッシュリフト基礎技術",
    curriculum_content: "上ラッシュリフト 巻き上げ",
    content: "【ラッシュリフト基礎技術】\n上ラッシュリフトの巻き上げ技術について、タイムトライアルおよび精度向上のトレーニングを実施。",
    duration_hours: 6,
    instructor_name: "岡田",
  },
  // 5月の例（アイブロウ）
  "2024-05-01": {
    subject_name: "アイブロウ基礎知識",
    curriculum_content: "アイブロウの基本理論とデザイン",
    content: "【アイブロウ基礎知識】\nアイブロウの基本理論、骨格に合わせたデザインについての座学を実施。",
    duration_hours: 6,
    instructor_name: "岡田",
  },
};
