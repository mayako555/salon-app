export const INDUSTRIES = [
  { id: 'eyelash', name: 'まつ毛・眉' }, { id: 'hair', name: '美容室' },
  { id: 'nail', name: 'ネイル' }, { id: 'esthetic', name: 'エステ' },
  { id: 'relaxation', name: 'リラクゼーション' }, { id: 'general', name: 'その他・共通' },
] as const;
export type Industry = typeof INDUSTRIES[number]['id'];
export type FormField = { id: string; label: string; required?: boolean };
export type FormTemplate = { id: string; name: string; industry: Industry; kind: 'karte' | 'counseling'; version: number; fields: FormField[]; legacy?: boolean };
export type IndustryForms = { industry: Industry; karteTemplateId: string; counselingTemplateId: string };
const labels: Record<Industry, { karte: string[]; counseling: string[] }> = {
  eyelash: { karte: [], counseling: [] },
  hair: { karte: ['施術メニュー', '髪・頭皮の状態', 'カット・デザイン', '薬剤・配合・放置時間', '仕上がり・ホームケア'], counseling: ['ご希望のメニュー・スタイル', '髪・頭皮のお悩み', 'カラー・パーマ・縮毛矯正の施術歴', '薬剤などで気になった経験', '普段のお手入れ'] },
  nail: { karte: ['施術メニュー', '爪・皮膚の状態', 'デザイン・カラー', '使用商材・オフ方法', '仕上がり・ホームケア'], counseling: ['ご希望のデザイン・長さ', '爪のお悩み', 'ジェル・スカルプの施術歴', '商材などで気になった経験', '生活・お仕事でのご要望'] },
  esthetic: { karte: ['施術メニュー・部位', '施術前の状態', '使用商材・機器・設定', '施術内容・反応', 'ホームケア・次回の提案'], counseling: ['ご希望のメニュー・部位', 'お肌・お身体のお悩み', 'これまでの施術経験', '化粧品などで気になった経験', 'サロンに伝えておきたいこと'] },
  relaxation: { karte: ['施術メニュー・時間', 'お疲れの部位・状態', '施術部位・強さ', '使用オイル等', '施術後の状態・次回の提案'], counseling: ['ご希望のコース・時間', 'お疲れの部位', 'ご希望の強さ', '触れてほしくない部位・避けたいこと', 'サロンに伝えておきたいこと'] },
  general: { karte: ['施術メニュー', '施術前の状態', '施術内容・使用商材', '施術後の状態', '次回の提案'], counseling: ['ご希望の施術', 'お悩み・ご要望', 'これまでの施術経験', '避けたいこと・気になった経験', 'サロンに伝えておきたいこと'] },
};
export const FORM_TEMPLATES: FormTemplate[] = INDUSTRIES.flatMap(industry => (['karte', 'counseling'] as const).map(kind => ({
  id: `${industry.id}-${kind}-v1`, name: `${industry.name} ${kind === 'karte' ? 'カルテ' : 'カウンセリング'}`,
  industry: industry.id, kind, version: 1, ...(industry.id === 'eyelash' ? { legacy: true } : {}),
  fields: labels[industry.id][kind].map((label, i) => ({ id: `field_${i + 1}`, label })),
})));
export function defaultIndustryForms(industry: Industry = 'eyelash'): IndustryForms {
  return { industry, karteTemplateId: `${industry}-karte-v1`, counselingTemplateId: `${industry}-counseling-v1` };
}
export function templateById(id: string, kind: FormTemplate['kind']): FormTemplate {
  const template = FORM_TEMPLATES.find(t => t.id === id && t.kind === kind);
  if (!template) throw new Error('シートの種類を選び直してください');
  return structuredClone(template);
}
export function validateIndustryForms(value: unknown): IndustryForms {
  if (!value || typeof value !== 'object') throw new Error('業種を選択してください');
  const v = value as IndustryForms;
  if (!INDUSTRIES.some(i => i.id === v.industry)) throw new Error('業種が無効です');
  templateById(v.karteTemplateId, 'karte'); templateById(v.counselingTemplateId, 'counseling');
  return { industry: v.industry, karteTemplateId: v.karteTemplateId, counselingTemplateId: v.counselingTemplateId };
}
export function readIndustryForms(value: unknown): IndustryForms {
  return value == null ? defaultIndustryForms() : validateIndustryForms(value);
}
export function cleanFormAnswers(template: FormTemplate, answers: unknown): Record<string, string> {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) throw new Error('回答内容が無効です');
  const values = answers as Record<string, unknown>;
  return Object.fromEntries(template.fields.map(field => {
    const value = values[field.id] ?? '';
    if (typeof value !== 'string' || value.length > 4000) throw new Error(`${field.label}は4000文字以内で入力してください`);
    if (field.required && !value.trim()) throw new Error(`${field.label}を入力してください`);
    return [field.id, value.trim()];
  }));
}
