import { cleanFormAnswers, type FormTemplate } from './industry-forms';
import type { ServiceType } from './counseling-model';
export const INTAKE_TTL = 24 * 60 * 60 * 1000;
export function validIntakeSession(session: { companyId?: string; customerId?: string; expiresAt?: number } | undefined, now: number) {
  return !!session?.companyId && !!session.customerId && typeof session.expiresAt === 'number' && session.expiresAt > now;
}
const services: ServiceType[] = ['eyelash_ext', 'lash_lift', 'eyebrow', 'and_healthy', 'brow_gym_men', 'led_ext'];
export function validateIntakeSubmission(template: FormTemplate, data: { name: string; phone: string; answers: unknown; services?: ServiceType[]; signature?: string; consent: boolean; profile?: Record<string, unknown> }) {
  if (typeof data.name !== 'string' || !data.name.trim() || data.name.length > 100 || typeof data.phone !== 'string' || !/^[0-9+()\s-]{6,30}$/.test(data.phone) || data.consent !== true) throw new Error('お名前・電話番号・同意を確認してください');
  if (JSON.stringify(data.answers).length > 50000) throw new Error('回答が長すぎます');
  let answers: Record<string, any>;
  if (template.legacy) {
    if (!data.answers || typeof data.answers !== 'object' || Array.isArray(data.answers)) throw new Error('回答が無効です');
    answers = Object.fromEntries(Object.entries(data.answers).map(([key, value]) => {
      if (!/^[a-z][a-z0-9_]{0,80}$/.test(key) || !(typeof value === 'string' || typeof value === 'boolean' || (Array.isArray(value) && value.every(v => typeof v === 'string')))) throw new Error('回答が無効です');
      return [key, value];
    }));
  } else answers = cleanFormAnswers(template, data.answers);
  if (template.legacy && (!data.services?.length || data.services.some(s => !services.includes(s)))) throw new Error('施術を選択してください');
  if (data.signature && (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(data.signature) || data.signature.length > 250000)) throw new Error('署名が無効です');
  if (template.legacy && !data.signature) throw new Error('署名を入力してください');
  const profileLabels = ['name_kana', 'postal_code', 'address', 'email', 'birthday', 'blood_type', 'occupation', 'referral_name', 'referral_source', 'photo_permission', 'sns_permission', 'sns_permission_scope', 'email_marketing_allowed', 'dm_allowed', 'is_minimo'];
  const profile = Object.fromEntries(profileLabels.filter(key => data.profile?.[key] !== undefined).map(key => {
    const raw = data.profile![key];
    const value = typeof raw === 'boolean' ? (raw ? 'yes' : 'no') : Array.isArray(raw) && raw.every(v => typeof v === 'string') ? raw.join('、') : raw;
    if (typeof value !== 'string' || value.length > 2000) throw new Error('基本情報が無効か長すぎます');
    return [key, value];
  }));
  return { submitted_profile: profile, respondent: { name: data.name.trim(), phone: data.phone.trim() }, answers, service_types: template.legacy ? data.services! : [], signature_url: data.signature || '' };
}
