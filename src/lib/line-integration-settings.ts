export type LineStoreSettings = {
  channelAccessToken: string;
  lineOaId: string;
  liffId: string;
};

export const EMPTY_LINE_STORE_SETTINGS: LineStoreSettings = {
  channelAccessToken: "",
  lineOaId: "",
  liffId: "",
};

export function normalizeLineStoreSettings(
  settings?: Partial<LineStoreSettings> | null,
): LineStoreSettings {
  return {
    channelAccessToken: settings?.channelAccessToken?.trim() || "",
    lineOaId: settings?.lineOaId?.trim() || "",
    liffId: settings?.liffId?.trim() || "",
  };
}

export function isLineStoreSettingsComplete(
  settings?: Partial<LineStoreSettings> | null,
): boolean {
  const normalized = normalizeLineStoreSettings(settings);
  return Boolean(
    normalized.channelAccessToken && normalized.lineOaId && normalized.liffId,
  );
}
