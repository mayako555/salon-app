import type { FormTemplate } from "./industry-forms";
export type ServiceType = 'eyelash_ext' | 'lash_lift' | 'eyebrow' | 'and_healthy' | 'brow_gym_men' | 'led_ext';

export type CounselingResponse = {
  form_snapshot?: FormTemplate;
  submitted_profile?: Record<string, string>;
  respondent?: { name: string; phone: string };
  id: string;
  customer_id: string;
  service_types: ServiceType[]; // 複数選択可
  gender: 'male' | 'female';
  answers: Record<string, any>;
  risk_level: 'red' | 'yellow' | 'none';
  risk_flags: string[];
  
  // 同意署名
  signature_url?: string; // Canvas画像または署名名
  signed_at: any;
  
  created_at: any;
};

// リスクフラグ判定ロジック
export function calculateRiskFlags(answers: Record<string, any>, serviceTypes: ServiceType[]): { riskLevel: 'red' | 'yellow' | 'none', riskFlags: string[] } {
  const redFlags: string[] = [];
  const yellowFlags: string[] = [];

  // 赤アラート条件
  if (answers.allergies_present === 'yes') redFlags.push('アレルギーあり');
  if (answers.drug_allergy === 'yes') redFlags.push('薬品アレルギーあり');
  if (answers.skin_inflammation === 'yes') redFlags.push('目元・周辺の炎症あり');
  if (answers.eye_disease === 'yes') redFlags.push('眼疾患（ものもらい等）あり');
  if (answers.infectious_disease === 'yes') redFlags.push('皮膚感染症あり');
  if (answers.condition_poor === 'yes') redFlags.push('本日体調不良');
  if (answers.patch_test_request === 'yes') redFlags.push('パッチテスト希望');
  if (answers.past_trouble === 'yes') redFlags.push('過去に施術トラブルあり');
  if (answers.uv_allergy === 'yes') redFlags.push('光線過敏症・紫外線アレルギー');

  // 黄アラート条件
  if (answers.pregnancy === 'yes' || answers.pregnancy === 'している') yellowFlags.push('妊娠中');
  if (answers.menstruation === 'yes' || answers.menstruation === '生理中') yellowFlags.push('生理中');
  if (answers.lactation === 'yes') yellowFlags.push('授乳中');
  if (answers.sensitive_skin === 'yes' || answers.skin_type === '敏感肌') yellowFlags.push('敏感肌');
  if (answers.redness_prone === 'yes') yellowFlags.push('赤みが出やすい');
  if (answers.atopy === 'yes') yellowFlags.push('アトピー');
  if (answers.contact_lens === 'yes') yellowFlags.push('コンタクト使用');
  if (answers.lasik_history === 'yes' || answers.surgery_content?.includes('レーシック')) yellowFlags.push('レーシック歴あり');
  if (answers.plastic_surgery === 'yes') yellowFlags.push('美容整形歴あり');
  if (answers.art_make === 'yes' || answers.surgery_content?.includes('アートメイク')) yellowFlags.push('アートメイク歴あり');
  if (answers.important_event === 'yes') yellowFlags.push('ブライダル・イベント前');
  if (answers.post_visit_plans === 'yes') yellowFlags.push('施術後に予定あり');
  if (answers.glaucoma_history === 'yes') yellowFlags.push('白内障・緑内障治療歴あり');
  if (answers.dry_eye_history === 'yes') yellowFlags.push('ドライアイ治療歴あり');

  const riskLevel: 'red' | 'yellow' | 'none' = redFlags.length > 0 ? 'red' : yellowFlags.length > 0 ? 'yellow' : 'none';
  const riskFlags = [...redFlags, ...yellowFlags];

  return { riskLevel, riskFlags };
}

