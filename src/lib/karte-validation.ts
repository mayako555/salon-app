import type { KarteRecord } from './karte';
export function cleanKartePatch(data: Partial<KarteRecord>) {
  const allowed = ['staff_id', 'staff_name', 'date', 'service_type', 'visit_type', 'design', 'before_photo_url', 'after_photo_url', 'photos', 'treatment_photos', 'eye_diagram_url', 'past_karte_photos', 'notes', 'drawing_document'] as const;
  const result = Object.fromEntries(allowed.filter(key => data[key] !== undefined).map(key => [key, data[key]]));
  if (result.date && !Number.isFinite(new Date(result.date as string).getTime())) throw new Error('施術日が無効です');
  if (JSON.stringify(result).length > 800000) throw new Error('画像・手書きデータが大きすぎます。画像を減らしてください。');
  return result;
}
