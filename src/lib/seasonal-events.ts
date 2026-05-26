import holiday_jp from '@holiday-jp/holiday_jp';

/**
 * 日本の国民の祝日かどうかを判定する
 */
export function isNationalHoliday(dateInput: Date | string): boolean {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return holiday_jp.isHoliday(date);
}

/**
 * 美容室（サロン）特有の季節イベント（商戦期）かどうかを判定する
 * クリスマス、年末年始、成人式前、バレンタイン、卒業入学シーズン、夏休みなど
 */
export function isSalonEvent(dateInput: Date | string): boolean {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const m = date.getMonth() + 1; // 1-12
  const d = date.getDate();
  
  // クリスマス商戦 (12/24, 12/25)
  if (m === 12 && (d === 24 || d === 25)) return true;
  
  // 年末年始商戦 (12/28〜12/31, 1/2〜1/5)
  if ((m === 12 && d >= 28) || (m === 1 && d >= 2 && d <= 5)) return true;
  
  // 成人式シーズン (1/7〜1/12付近)
  if (m === 1 && d >= 7 && d <= 12) return true;
  
  // バレンタイン直前 (2/13, 2/14)
  if (m === 2 && (d === 13 || d === 14)) return true;
  
  // ホワイトデー直前 (3/13, 3/14)
  if (m === 3 && (d === 13 || d === 14)) return true;
  
  // 卒業式・入学式シーズン (3/15〜4/5)
  if ((m === 3 && d >= 15) || (m === 4 && d <= 5)) return true;
  
  // 夏休み・お盆前商戦 (7/20〜8/15)
  if ((m === 7 && d >= 20) || (m === 8 && d <= 15)) return true;
  
  // ハロウィン (10/30, 10/31)
  if (m === 10 && (d === 30 || d === 31)) return true;

  return false;
}
