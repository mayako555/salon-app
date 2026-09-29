export type LineStoreSettings = {
  channelAccessToken: string;
  lineOaId: string;
  liffId: string;
  hasChannelAccessToken?: boolean;
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
    channelAccessToken: typeof settings?.channelAccessToken === "string" ? settings.channelAccessToken.trim() : "",
    lineOaId: typeof settings?.lineOaId === "string" ? settings.lineOaId.trim() : "",
    liffId: typeof settings?.liffId === "string" ? settings.liffId.trim() : "",
  };
}

export function isLineStoreSettingsComplete(
  settings?: Partial<LineStoreSettings> | null,
): boolean {
  const normalized = normalizeLineStoreSettings(settings);
  return Boolean(
    (normalized.channelAccessToken || settings?.hasChannelAccessToken) && normalized.lineOaId && normalized.liffId,
  );
}

/** Never return the stored credential across a Server Action boundary. */
export function publicLineSettings(settings: Partial<LineStoreSettings>): LineStoreSettings {
  const normalized = normalizeLineStoreSettings(settings);
  return { ...normalized, channelAccessToken: "", hasChannelAccessToken: Boolean(normalized.channelAccessToken) };
}

export function lineSettingsPatch(settings: Partial<LineStoreSettings>) {
  const normalized = normalizeLineStoreSettings(settings);
  return {
    lineOaId: normalized.lineOaId,
    liffId: normalized.liffId,
    ...(normalized.channelAccessToken ? { channelAccessToken: normalized.channelAccessToken } : {}),
  };
}
