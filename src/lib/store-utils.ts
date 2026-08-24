/**
 * 店舗名を正式名称に名寄せするユーティリティ関数
 * 表記揺れ（「六甲道店」「六甲」等）を統一する
 */
export function getNormalizedStoreName(rawName: string): string {
  if (!rawName) return "不明";
  const name = rawName.trim().replace(/\s+/g, "");

  if (name.includes("六甲")) {
    return "Jasmine Lash 六甲店";
  }
  if (name.includes("神戸")) {
    return "Jasmine Lash 神戸店";
  }
  if (name.includes("元町") || name.includes("BROWGYM")) {
    return "BROW GYM 元町店";
  }
  return rawName;
}
